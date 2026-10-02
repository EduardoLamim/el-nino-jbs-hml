export const tipos = ['alagamento_terminal', 'acesso_operacional_terminal_comprometido',
  'infraestrutura_critica_terminal_afetada', 'area_operacional_afetada', 'outro_impacto_fisico_terminal'] as const;
export interface Backend {
  tentar(): Promise<boolean>;
  escrever(p: { action: string; tipo: string | null; responsavel: string; observacao: string | null; impacto_id: string | null }): Promise<unknown>;
}
export interface Config { pin: string; origin: string; apikey: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function igual(a: string, b: string) {
  const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let diff = 0; for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}
export function criarHandler(config: Config, backend: Backend) {
  return async (req: Request): Promise<Response> => {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': config.origin, 'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
    const resposta = (status: number, code: string) => new Response(JSON.stringify({ erro: code }), { status, headers });
    if (!config.pin || !config.apikey || !config.origin) return resposta(503, 'configuracao_indisponivel');
    if (req.headers.get('origin') && req.headers.get('origin') !== config.origin) return resposta(403, 'origem_negada');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return resposta(405, 'metodo_invalido');
    if (req.headers.get('apikey') !== config.apikey) return resposta(401, 'acesso_invalido');
    try {
      if (!req.headers.get('content-type')?.includes('application/json')) return resposta(400, 'payload_invalido');
      // Limita o corpo durante a leitura, inclusive sem Content-Length.
      const reader = req.body?.getReader(); if (!reader) return resposta(400, 'payload_invalido');
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break;
        size += value.length; if (size > 12000) { await reader.cancel(); return resposta(413, 'payload_excessivo'); } chunks.push(value); }
      const bytes = new Uint8Array(size); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
      const p: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (!p || typeof p !== 'object' || Array.isArray(p)) return resposta(400, 'payload_invalido');
      const v = p as Record<string, unknown>;
      if (Object.keys(v).some(k => !['action','pin','tipo','responsavel','observacao','impacto_id'].includes(k))
        || !['ativar','encerrar'].includes(String(v.action)) || typeof v.pin !== 'string' || v.pin.length > 128
        || typeof v.responsavel !== 'string' || !v.responsavel.trim() || v.responsavel.trim().length > 120
        || (v.observacao !== undefined && (typeof v.observacao !== 'string' || v.observacao.length > 2000))
        || (v.action === 'ativar' && (!tipos.includes(v.tipo as typeof tipos[number]) || v.impacto_id !== undefined))
        || (v.action === 'encerrar' && (typeof v.impacto_id !== 'string' || !uuid.test(v.impacto_id) || v.tipo !== undefined)))
        return resposta(400, 'payload_invalido');
      if (!await backend.tentar()) return resposta(429, 'limite_tentativas');
      if (!await igual(v.pin, config.pin)) return resposta(403, 'pin_invalido');
      // Evita também cópia acidental do secret nos campos livres do histórico.
      if (v.responsavel.includes(config.pin) || (typeof v.observacao === 'string' && v.observacao.includes(config.pin)))
        return resposta(400, 'entrada_invalida');
      // O PIN termina aqui: nunca entra no payload da RPC, retorno, cache ou log.
      const r = await backend.escrever({ action: String(v.action), tipo: v.action === 'ativar' ? String(v.tipo) : null,
        responsavel: v.responsavel.trim(), observacao: typeof v.observacao === 'string' ? v.observacao.trim() || null : null,
        impacto_id: v.action === 'encerrar' ? String(v.impacto_id) : null });
      const a = r as Record<string, unknown>;
      // Allowlist inclusive em caso de mudança futura da RPC.
      const sanitized = Object.fromEntries(['id','revisao','ativo','impacto_id','tipo','acionado_em','atualizado_em'].map(k => [k,a[k]]));
      return new Response(JSON.stringify(sanitized), { status: 200, headers });
    } catch (e) {
      if (e instanceof SyntaxError) return resposta(400, 'payload_invalido');
      const code = (e as { code?: string })?.code;
      if (code === '23505' || code === '40001') return resposta(409, 'conflito_estado');
      if (code === '22023' || code === '23514') return resposta(400, 'entrada_invalida');
      return resposta(503, 'operacao_indisponivel');
    }
  };
}
