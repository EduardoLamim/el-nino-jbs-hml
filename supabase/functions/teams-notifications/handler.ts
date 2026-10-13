/** Notification-only backend. No operational writes and no real-event delivery mode. */
export type Rpc = (scope: 'ingest' | 'worker' | 'admin', action: string, payload?: Record<string, unknown>) => Promise<unknown>;
export type Event = { event_key: string; kind: 'level' | 'impact_open' | 'impact_close'; is_test: boolean; body: Record<string, unknown> };
export type Claim = { id: string; lease: string; attempt: number; mode: 'mock' | 'synthetic_live'; event: Event; payload?: ReturnType<typeof adaptiveCard> | null };
const levels = ['normalidade', 'atencao', 'alerta', 'emergencia'];
const labels = ['Normalidade', 'Atenção', 'Alerta', 'Emergência'];
const panel = 'https://eduardolamim.github.io/el-nino-jbs-hml/';
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace(', ', ' às ') : 'Não informado';

export function adaptiveCard(event: Event) {
  const b = event.body;
  let title: string, detail: string, color: string;
  if (event.kind === 'level') {
    const before = levels.indexOf(String(b.before)), after = levels.indexOf(String(b.after));
    if (before < 0 || after < 0 || before === after) throw new Error('Invalid transition');
    title = after === 0 ? 'Normalização' : after < before ? 'Redução de nível' : labels[after]!;
    detail = `${labels[before]} → ${labels[after]}`;
    // Teams owns the palette; Warning is its native yellow/amber, not a custom orange.
    color = after === 0 ? 'Good' : after < before ? 'Accent' : after === 3 ? 'Attention' : 'Warning';
  } else if (event.kind === 'impact_open') {
    title = 'Impacto JBS confirmado'; color = 'Attention'; detail = 'Confirmação manual autorizada de impacto físico no Terminal.';
  } else if (event.kind === 'impact_close') {
    title = 'Impacto JBS encerrado'; color = 'Good'; detail = 'Encerramento manual autorizado do Impacto JBS.';
  }
  else throw new Error('Invalid event');
  const text = (value: string) => ({ type: 'TextBlock', text: value, wrap: true });
  return { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', contentUrl: null, content: {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.2',
    body: [
      { ...text('Monitoramento El Niño — JBS Terminais'), weight: 'Bolder', size: 'Medium' },
      { ...text('[HML — TESTE]'), weight: 'Bolder', spacing: 'Small' },
      ...(event.is_test ? [text('SIMULAÇÃO — não representa ocorrência real.')] : []),
      { type: 'Container', style: 'emphasis', spacing: 'Medium', items: [
        { ...text(title), weight: 'Bolder', size: 'Large', color },
        { ...text(detail), weight: 'Bolder', spacing: 'Small' },
      ] },
      { ...text('Data e hora'), weight: 'Bolder', spacing: 'Medium' },
      { ...text(date(b.occurred_at)), spacing: 'Small' },
      ...(date(b.occurred_at) === 'Não informado' && b.detected_at ? [text(`Detectado em ${date(b.detected_at)} (transição sem horário determinado).`)] : []),
      ...(event.kind === 'level' && !event.is_test && Array.isArray(b.reasons)
        ? b.reasons.filter((r): r is string => typeof r === 'string').slice(0, 12).map(r => text(r.slice(0, 600))) : []),
      { ...text(event.is_test ? 'O painel apresenta os dados reais.' : 'Registro histórico. Publicação correspondente no painel não confirmada.'), isSubtle: true, spacing: 'Medium' },
      ...(event.kind === 'level' && levels.indexOf(String(b.after)) < levels.indexOf(String(b.before)) ? [text('A redução do nível ambiental não encerra Impacto JBS.')] : []),
    ], actions: [{ type: 'Action.OpenUrl', title: 'Abrir painel', url: panel }],
  } }] };
}

/** Capability URL never returned, logged, or accepted from a request payload. */
export function validWebhook(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.hash && (!u.port || u.port === '443')
      && (u.hostname.endsWith('.logic.azure.com') || u.hostname.endsWith('.environment.api.powerplatform.com'));
  } catch { return false; }
}

export async function drainOne(rpc: Rpc, options: { webhook?: string; liveEnabled: boolean; fetcher?: typeof fetch; now?: () => number }) {
  const claim = await rpc('worker', 'claim') as Claim | null;
  if (!claim) return { status: 'idle' };
  const ref = { id: claim.id, lease: claim.lease };
  const finish = (outcome: string, extra = {}) => rpc('worker', 'finish', { ...ref, outcome, ...extra });
  if (!claim.event.is_test || !['mock', 'synthetic_live'].includes(claim.mode)) {
    await finish('blocked'); return { status: 'blocked' };
  }
  let payload: ReturnType<typeof adaptiveCard>;
  try { payload = claim.payload ?? adaptiveCard(claim.event); } catch { await finish('blocked'); return { status: 'blocked' }; }
  payload = await rpc('worker','freeze',{...ref,payload}) as ReturnType<typeof adaptiveCard>;
  if (claim.mode === 'mock') {
    await rpc('worker', 'sending', { ...ref, mode: claim.mode });
    await finish('mock_delivered'); return { status: 'mock_delivered' };
  }
  if (!options.liveEnabled || !options.webhook || !validWebhook(options.webhook)) {
    await finish('blocked'); return { status: 'blocked' };
  }
  await rpc('worker', 'sending', { ...ref, mode: claim.mode });
  // A failure after this point is ambiguous: never blindly repeat a POST.
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(options.webhook, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000), redirect: 'error',
    });
  } catch { await finish('uncertain'); return { status: 'uncertain' }; }
  const status = response.status;
  const outcome = status >= 200 && status < 300 ? 'accepted' : status === 429 ? 'retry' : status >= 500 ? 'uncertain' : 'blocked';
  const now = (options.now ?? Date.now)();
  const retry = response.headers.get('Retry-After'); // Only this non-sensitive header is inspected.
  const retryAt = retry && /^\d+$/.test(retry) ? now + Number(retry) * 1000 : retry ? Date.parse(retry) : now;
  await response.body?.cancel(); // Never record an arbitrary remote response body.
  const finalized = await finish(outcome, { http_status: status, ...(outcome === 'retry' && Number.isFinite(retryAt) && Math.abs(retryAt) < 8.64e15 ? { retry_at: new Date(Math.max(now, retryAt)).toISOString() } : {}) }) as {status?: string};
  return { status: finalized.status ?? outcome, http_status: status };
}

async function equalSecret(a: string, b: string) {
  const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  return x.reduce((different, byte, i) => different | (byte ^ y[i]!), 0) === 0;
}

export function createHandler(deps: { rpc: Rpc; wakeToken: string; adminToken: string; webhook?: string; liveEnabled: boolean }) {
  return async (request: Request) => {
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    const supplied = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
    const admin = deps.adminToken.length >= 64 && await equalSecret(supplied, deps.adminToken);
    const wake = deps.wakeToken.length >= 64 && await equalSecret(supplied, deps.wakeToken);
    if (!admin && !wake) return reply({ error: 'Unauthorized' }, 401);
    try {
      // Bounded stream; do not let authenticated oversized requests allocate without limit.
      const reader = request.body?.getReader(); let raw = ''; let size = 0; const decoder = new TextDecoder();
      if (reader) for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length;
        if (size > 131072) { await reader.cancel(); return reply({ error: 'Payload too large' }, 413); } raw += decoder.decode(part.value, { stream: true }); }
      raw += decoder.decode();
      const input = JSON.parse(raw) as { action?: string; payload?: Record<string, unknown> };
      const action = input.action ?? '';
      if (action === 'health' && admin) {
        const [, worker, report] = await Promise.all([
          deps.rpc('ingest','checkpoint'), deps.rpc('worker','probe_worker'), deps.rpc('admin','report'),
        ]);
        if (!(worker as {ready?:boolean})?.ready) throw new Error('Worker credential unavailable');
        return reply({ready:true, live_enabled:deps.liveEnabled, webhook_valid:validWebhook(deps.webhook ?? ''),
          mode:(report as {mode:string}).mode});
      }
      if (action === 'drain') return reply(await drainOne(deps.rpc, deps));
      if (['checkpoint', 'snapshot', 'impacts'].includes(action)) return reply(await deps.rpc('ingest', action, input.payload));
      if (admin && ['bootstrap','configure','synthetic','replay','resolve','prune','report'].includes(action)) return reply(await deps.rpc('admin', action, input.payload));
      return reply({ error: 'Forbidden action' }, 403);
    } catch { return reply({ error: 'Notification operation failed; no operational state changed' }, 503); }
  };
}
