import { criarHandler } from './handler.ts';
const url = Deno.env.get('SUPABASE_URL') ?? '';
const apikey = Deno.env.get('JBS_SUPABASE_PUBLISHABLE_KEY') ?? '';
const token = Deno.env.get('JBS_IMPACT_BACKEND_TOKEN') ?? '';
async function rpc(name: string, body: Record<string, unknown>) {
  if (!url || !apikey || !token) throw new Error('Configuração indisponível');
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST',
    headers: { apikey, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_backend_token: token, ...body }),
    signal: AbortSignal.timeout(12000) });
  const data = await response.json();
  if (!response.ok) throw { code: data?.code }; // Nunca propagar corpo, query ou credenciais.
  return data;
}
Deno.serve(criarHandler({ pin: Deno.env.get('JBS_IMPACT_PIN') ?? '', origin: Deno.env.get('JBS_ALLOWED_ORIGIN') ?? '', apikey }, {
  tentar: async () => (await rpc('jbs_impacto_tentativa', {})) === true,
  escrever: p => rpc('jbs_impacto_escrever', { p_action: p.action, p_tipo: p.tipo,
    p_responsavel: p.responsavel, p_observacao: p.observacao, p_impacto_id: p.impacto_id }),
}));
