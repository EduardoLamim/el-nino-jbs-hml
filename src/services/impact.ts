import { createClient } from '@supabase/supabase-js';
import { cacheImpactoSchema, comandoImpactoSchema, impactoPublicoSchema, type ComandoImpacto, type EstadoImpacto } from '../domain/impact';

export const RECONCILIACAO_MS = 60000;
export interface ImpactBackend {
  consultar(): Promise<unknown>;
  executar(comando: ComandoImpacto): Promise<unknown>;
  assinar(mudanca: () => void, conexao: (ok: boolean) => void): () => void;
}
export interface CacheImpacto { ler(): string | null; gravar(value: string): void }
// Observação e responsável não são armazenados em cache; PIN só existe no comando transitório.
export class ImpactoStore {
  estado: EstadoImpacto = { dado: null, qualidade: 'desconhecido', confirmado_em: null, realtime: 'reconectando' };
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setInterval>;
  private unsubscribe?: () => void;
  private lendo?: Promise<void>;
  private repetir = false;
  private parado = true;
  constructor(private backend: ImpactBackend, private cache?: CacheImpacto) {
    try {
      const text = cache?.ler(); if (!text) return;
      const c = cacheImpactoSchema.parse(JSON.parse(text));
      if (Date.parse(c.confirmado_em) > Date.now()) return;
      this.estado = { ...this.estado, dado: c.dado, qualidade: 'degradado', confirmado_em: c.confirmado_em };
    } catch { /* Cache inválido não significa inativo. */ }
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.estado;
  private emitir(estado: EstadoImpacto) { this.estado = estado; this.listeners.forEach(l => l()); }
  private confirmar(dados: unknown) {
    const dado = impactoPublicoSchema.parse(dados);
    if (this.estado.dado && dado.revisao < this.estado.dado.revisao) return;
    const confirmado_em = new Date().toISOString();
    this.emitir({ ...this.estado, dado, qualidade: 'confirmado', confirmado_em });
    try { this.cache?.gravar(JSON.stringify(cacheImpactoSchema.parse({ versao: 1, dado, confirmado_em }))); } catch { /* Falha de cache não invalida resposta do servidor. */ }
  }
  private falha() { this.emitir({ ...this.estado, qualidade: this.estado.dado ? 'degradado' : 'desconhecido' }); }
  reconciliar = (): Promise<void> => {
    if (this.lendo) { this.repetir = true; return this.lendo; }
    this.lendo = (async () => {
      do { this.repetir = false;
        try { this.confirmar(await this.backend.consultar()); } catch { this.falha(); }
      } while (this.repetir && !this.parado);
    })().finally(() => { this.lendo = undefined; });
    return this.lendo;
  };
  iniciar() {
    if (!this.parado) return;
    this.parado = false;
    // Assinar antes da primeira leitura e reler em SUBSCRIBED evita janela sem observação.
    this.unsubscribe = this.backend.assinar(() => { void this.reconciliar(); }, ok => {
      this.emitir({ ...this.estado, realtime: ok ? 'conectado' : 'reconectando' });
      if (!ok) this.falha(); else void this.reconciliar();
    });
    void this.reconciliar();
    this.timer = setInterval(() => { void this.reconciliar(); }, RECONCILIACAO_MS);
  }
  parar() { this.parado = true; clearInterval(this.timer); this.unsubscribe?.(); }
  async executar(entrada: ComandoImpacto) {
    const comando = comandoImpactoSchema.parse(entrada);
    try { this.confirmar(await this.backend.executar(comando)); }
    catch (e) { this.falha(); throw e; }
    // Sem estado otimista. O PIN nunca entra em this.estado nem em cache.
  }
}
export function criarImpactoStore(): ImpactoStore {
  const url: unknown = import.meta.env.VITE_SUPABASE_URL;
  const key: unknown = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const expectedUrl = 'https://ufeahglxwygvlugfsopi.supabase.co';
  const cacheKey = `jbs-impacto-v1:${expectedUrl}`;
  const cache: CacheImpacto = { ler: () => localStorage.getItem(cacheKey), gravar: v => localStorage.setItem(cacheKey, v) };
  const indisponivel: ImpactBackend = { consultar: async () => { throw new Error('Supabase não configurado'); },
    executar: async () => { throw new Error('Supabase não configurado'); }, assinar: () => () => {} };
  if (typeof url !== 'string' || typeof key !== 'string' || !key.startsWith('sb_publishable_')
    || url !== expectedUrl) return new ImpactoStore(indisponivel, cache);
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15000) }) } });
  const backend: ImpactBackend = {
    consultar: async () => {
      const { data, error } = await client.from('impacto_jbs_publico')
        .select('id,revisao,ativo,impacto_id,tipo,acionado_em,atualizado_em').eq('id', 1).single();
      if (error || !data) throw new Error('Estado operacional indisponível');
      return data;
    },
    executar: async comando => {
      const response = await fetch(`${url}/functions/v1/impacto-jbs`, { method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(comando), signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        const mensagens: Record<number, string> = { 400: 'Dados inválidos. Verifique os campos.', 403: 'PIN inválido ou origem não autorizada.',
          409: 'O estado mudou ou já existe impacto ativo. Aguarde a reconciliação.', 429: 'Limite de tentativas. Aguarde um minuto.' };
        throw new Error(mensagens[response.status] ?? 'Operação sem confirmação. Verifique o estado antes de tentar novamente.');
      }
      return response.json();
    },
    assinar: (mudanca, conexao) => {
      const channel = client.channel('impacto-jbs-estado').on('postgres_changes',
        { event: '*', schema: 'public', table: 'impacto_jbs_publico', filter: 'id=eq.1' }, mudanca)
        .subscribe(status => conexao(status === 'SUBSCRIBED'));
      return () => { void client.removeChannel(channel); };
    },
  };
  return new ImpactoStore(backend, cache);
}
