import { describe, expect, it, vi, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { cacheImpactoSchema, comandoImpactoSchema, impactoPublicoSchema, registroImpactoSchema, tipoImpactoSchema } from '../src/domain/impact';
import { criarImpactoStore, ImpactoStore, RECONCILIACAO_MS, type ImpactBackend } from '../src/services/impact';
import { nivelSchema } from '../src/domain/contracts';
const id = randomUUID();
const stamp = '2026-10-02T11:00:00Z';
const inativo = { id: 1, revisao: 0, ativo: false, impacto_id: null, tipo: null, acionado_em: null, atualizado_em: stamp };
const ativo = { id: 1, revisao: 1, ativo: true, impacto_id: id, tipo: 'alagamento_terminal', acionado_em: stamp, atualizado_em: stamp };
const pin = randomUUID(); // Dado efêmero de teste, nunca o secret operacional.
const ativar = { action: 'ativar' as const, pin, tipo: 'alagamento_terminal' as const, responsavel: 'Operador de teste' };
const encerrar = { action: 'encerrar' as const, pin, impacto_id: id, responsavel: 'Operador de teste' };
const backend = (): ImpactBackend => ({ consultar: vi.fn().mockResolvedValue(inativo), executar: vi.fn().mockResolvedValue(ativo), assinar: vi.fn(() => () => {}) });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('Impacto JBS independente', () => {
  it('aceita somente os cinco tipos e responsável preenchido', () => {
    expect(tipoImpactoSchema.options).toHaveLength(5);
    expect(comandoImpactoSchema.safeParse(ativar).success).toBe(true);
    for (const tipo of ['bairro_alagado', 'chuva_forte', 'colaborador_ilhado', 'emergencia'])
      expect(comandoImpactoSchema.safeParse({ ...ativar, tipo }).success).toBe(false);
    expect(comandoImpactoSchema.safeParse({ ...ativar, responsavel: '  ' }).success).toBe(false);
    expect(comandoImpactoSchema.safeParse({ ...ativar, acionado_em: stamp }).success).toBe(false);
    expect(comandoImpactoSchema.safeParse({ ...encerrar, impacto_id: undefined }).success).toBe(false);
  });
  it('valida estado sanitizado e histórico sem PIN', () => {
    expect(impactoPublicoSchema.parse(inativo).ativo).toBe(false);
    expect(impactoPublicoSchema.parse(ativo).ativo).toBe(true);
    expect(impactoPublicoSchema.safeParse({ ...ativo, pin }).success).toBe(false);
    expect(impactoPublicoSchema.safeParse({ ...inativo, tipo: 'alagamento_terminal' }).success).toBe(false);
    const r = { id, tipo: 'alagamento_terminal', responsavel_acionamento: 'Teste', observacao_acionamento: null,
      acionado_em: stamp, created_at: stamp, responsavel_encerramento: null, observacao_encerramento: null, encerrado_em: null };
    expect(registroImpactoSchema.safeParse(r).success).toBe(true);
    expect(registroImpactoSchema.safeParse({ ...r, encerrado_em: stamp }).success).toBe(false);
    expect(nivelSchema.options).toEqual(['normalidade','atencao','alerta','emergencia']);
    expect(nivelSchema.safeParse('impacto_jbs').success).toBe(false);
  });
  it('cliente novo com falha fica desconhecido, não inativo', async () => {
    const b = backend(); vi.mocked(b.consultar).mockRejectedValue(new Error('offline'));
    const s = new ImpactoStore(b); await s.reconciliar();
    expect(s.estado.dado).toBeNull(); expect(s.estado.qualidade).toBe('desconhecido');
  });
  it('sucesso vazio explícito é inativo; resposta ausente é falha', async () => {
    const b = backend(); const s = new ImpactoStore(b); await s.reconciliar();
    expect(s.estado.dado?.ativo).toBe(false); expect(s.estado.qualidade).toBe('confirmado');
    vi.mocked(b.consultar).mockResolvedValue(null); await s.reconciliar();
    expect(s.estado.qualidade).toBe('degradado');
  });
  it('ativação aguarda servidor e cache nunca contém comando/PIN', async () => {
    let resolver!: (x: unknown) => void; const b = backend();
    vi.mocked(b.executar).mockImplementation(() => new Promise(r => { resolver = r; }));
    const gravar = vi.fn(); const s = new ImpactoStore(b, { ler: () => null, gravar }); await s.reconciliar();
    const p = s.executar(ativar); expect(s.estado.dado?.ativo).toBe(false);
    resolver(ativo); await p; expect(s.estado.dado?.ativo).toBe(true);
    for (const [text] of gravar.mock.calls) { expect(text).not.toContain(pin); expect(text).not.toContain('responsavel'); expect(cacheImpactoSchema.safeParse(JSON.parse(text)).success).toBe(true); }
  });
  it('falha de ativação não cria estado local', async () => {
    const b = backend(); vi.mocked(b.executar).mockRejectedValue(new Error('PIN inválido'));
    const s = new ImpactoStore(b); await s.reconciliar(); await expect(s.executar(ativar)).rejects.toThrow();
    expect(s.estado.dado?.ativo).toBe(false); expect(s.estado.qualidade).toBe('degradado');
  });
  it('falha de encerramento e consulta preservam impacto ativo', async () => {
    const b = backend(); vi.mocked(b.consultar).mockResolvedValue(ativo); const s = new ImpactoStore(b); await s.reconciliar();
    vi.mocked(b.executar).mockRejectedValue(new Error('timeout')); await expect(s.executar(encerrar)).rejects.toThrow();
    vi.mocked(b.consultar).mockRejectedValue(new Error('offline')); await s.reconciliar();
    expect(s.estado.dado?.ativo).toBe(true); expect(s.estado.qualidade).toBe('degradado');
  });
  it('encerra somente na confirmação; resposta antiga não desfaz estado novo', async () => {
    const b = backend(); vi.mocked(b.consultar).mockResolvedValue(ativo); const s = new ImpactoStore(b); await s.reconciliar();
    vi.mocked(b.executar).mockResolvedValue({ ...inativo, revisao: 2 }); await s.executar(encerrar);
    expect(s.estado.dado?.ativo).toBe(false);
    await s.reconciliar(); expect(s.estado.dado?.revisao).toBe(2);
  });
  it('cache ativo é degradado no reload; inválido/futuro/PIN é rejeitado', async () => {
    const b = backend(); vi.mocked(b.consultar).mockRejectedValue(new Error('offline'));
    const c = { versao: 1, confirmado_em: stamp, dado: ativo };
    const s = new ImpactoStore(b, { ler: () => JSON.stringify(c), gravar: () => {} }); await s.reconciliar();
    expect(s.estado.dado?.ativo).toBe(true); expect(s.estado.qualidade).toBe('degradado');
    for (const cache of ['broken', JSON.stringify({ ...c, pin }), JSON.stringify({ ...c, confirmado_em: '2999-01-01T00:00:00Z' })])
      expect(new ImpactoStore(b, { ler: () => cache, gravar: () => {} }).estado.dado).toBeNull();
  });
  it('configuração ausente também preserva cache ativo do projeto esperado', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', ''); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ versao: 1, confirmado_em: stamp, dado: ativo }), setItem: vi.fn() });
    const s = criarImpactoStore(); await s.reconciliar();
    expect(s.estado.dado?.ativo).toBe(true); expect(s.estado.qualidade).toBe('degradado');
  });
  it('Realtime dispara releitura e reconciliação recupera evento perdido; cleanup', async () => {
    vi.useFakeTimers(); const b = backend(); let evento!: () => void; const parar = vi.fn();
    vi.mocked(b.assinar).mockImplementation(fn => { evento = fn; return parar; });
    const s = new ImpactoStore(b); s.iniciar(); await vi.advanceTimersByTimeAsync(0);
    vi.mocked(b.consultar).mockResolvedValue(ativo); evento(); await vi.advanceTimersByTimeAsync(0);
    expect(s.estado.dado?.ativo).toBe(true);
    vi.mocked(b.consultar).mockResolvedValue({ ...inativo, revisao: 2 }); await vi.advanceTimersByTimeAsync(RECONCILIACAO_MS);
    expect(s.estado.dado?.ativo).toBe(false); s.parar(); expect(parar).toHaveBeenCalledOnce();
    const chamadas = vi.mocked(b.consultar).mock.calls.length; await vi.advanceTimersByTimeAsync(RECONCILIACAO_MS * 2);
    expect(b.consultar).toHaveBeenCalledTimes(chamadas);
  });
});
