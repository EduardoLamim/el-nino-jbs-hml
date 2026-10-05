const endpoint = 'https://api.github.com/repos/EduardoLamim/el-nino-jbs-hml/actions/workflows/deploy-pages.yml/dispatches';
type Config = { secret: string; token: string };
type Dependencies = { fetch: typeof fetch; log: (event: Record<string, unknown>) => void };

async function igual(a: string, b: string) {
  const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

// Exclusivamente autorização e dispatch. Nunca coleta ou avalia dados ambientais.
export function criarDispatchHandler(config: Config, deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const respond = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
    if (request.method !== 'POST') return respond(405, { error: 'method_not_allowed' });
    if (!config.secret || !config.token) return respond(503, { error: 'configuration_unavailable' });
    const authorization = request.headers.get('authorization') ?? '';
    if (authorization.length > 1024 || !await igual(authorization, `Bearer ${config.secret}`)) return respond(401, { error: 'unauthorized' });
    const receivedAt = new Date().toISOString();
    const correlationId = crypto.randomUUID();
    try {
      const response = await deps.fetch(endpoint, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2026-03-10' },
        body: JSON.stringify({ ref: 'main', inputs: { publish: true } }),
      });
      // Não registrar headers, corpo da requisição ou mensagens remotas arbitrárias.
      const event: Record<string, unknown> = { correlation_id: correlationId, received_at: receivedAt, dispatch_at: new Date().toISOString(), github_status: response.status };
      if (response.status !== 200 && response.status !== 204) {
        deps.log({ ...event, result: 'github_error' });
        return respond(502, { ...event, result: 'github_error' });
      }
      if (response.status === 200) {
        const data = await response.json() as { workflow_run_id?: unknown };
        if (typeof data.workflow_run_id === 'number' && Number.isSafeInteger(data.workflow_run_id)) event.workflow_run_id = data.workflow_run_id;
      }
      deps.log({ ...event, result: 'accepted' });
      return respond(202, { ...event, result: 'accepted' });
    } catch {
      // Timeout/resposta ilegível pode ocorrer após aceitação. Não repetir automaticamente.
      const event = { correlation_id: correlationId, received_at: receivedAt, finished_at: new Date().toISOString(), result: 'dispatch_unconfirmed' };
      deps.log(event);
      return respond(502, event);
    }
  };
}
