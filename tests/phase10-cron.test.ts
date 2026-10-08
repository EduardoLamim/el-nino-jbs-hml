import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { criarDispatchHandler } from '../supabase/functions/trigger-monitoramento/handler';

const config = () => ({ secret: crypto.randomUUID(), token: crypto.randomUUID() });
it.each(['', 'Bearer invalid', 'Bearer sb_publishable_invalid'])('rejeita autorização inválida sem chamar GitHub: %s', async authorization => {
  const fetch = vi.fn(), log = vi.fn();
  const response = await criarDispatchHandler(config(), { fetch, log })(new Request('https://edge.invalid', { method: 'POST', headers: { authorization } }));
  expect(response.status).toBe(401); expect(fetch).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
});
it('falha fechada sem configuração e rejeita GET', async () => {
  const fetch = vi.fn(), handler = criarDispatchHandler({ secret: '', token: '' }, { fetch, log: vi.fn() });
  expect((await handler(new Request('https://edge.invalid', { method: 'POST' }))).status).toBe(503);
  expect((await handler(new Request('https://edge.invalid'))).status).toBe(405); expect(fetch).not.toHaveBeenCalled();
});
it.each([200, 204])('aceita autorização server-side e fixa repo/branch/workflow, HTTP %s', async status => {
  const c = config(), log = vi.fn(), fetch = vi.fn().mockResolvedValue(new Response(status === 200 ? JSON.stringify({ workflow_run_id: 123 }) : null, { status }));
  const response = await criarDispatchHandler(c, { fetch, log })(new Request('https://edge.invalid', { method: 'POST', headers: { authorization: `Bearer ${c.secret}` }, body: JSON.stringify({ ref: 'other', repo: 'evil' }) }));
  expect(response.status).toBe(202);
  expect(fetch.mock.calls[0]![0]).toBe('https://api.github.com/repos/EduardoLamim/el-nino-jbs-hml/actions/workflows/deploy-pages.yml/dispatches');
  const options = fetch.mock.calls[0]![1]; expect(JSON.parse(options.body)).toEqual({ ref: 'main', inputs: { publish: true } });
  expect(options.redirect).toBe('error');
  const exposed = (await response.text()) + JSON.stringify(log.mock.calls); expect(exposed).not.toContain(c.secret); expect(exposed).not.toContain(c.token);
});
it.each([401,403,422,429,500])('trata erro GitHub %s sem propagar corpo ou repetir dispatch', async status => {
  const c = config(), log = vi.fn(), fetch = vi.fn().mockResolvedValue(new Response(c.token, { status }));
  const response = await criarDispatchHandler(c, { fetch, log })(new Request('https://edge.invalid', { method: 'POST', headers: { authorization: `Bearer ${c.secret}` } }));
  expect(response.status).toBe(502); expect(fetch).toHaveBeenCalledTimes(1);
  expect(await response.text()).not.toContain(c.token); expect(JSON.stringify(log.mock.calls)).not.toContain(c.token);
});
it('timeout é não confirmado, sem retry que possa duplicar execução', async () => {
  const c = config(), fetch = vi.fn().mockRejectedValue(new Error(c.token)), log = vi.fn();
  const response = await criarDispatchHandler(c, { fetch, log })(new Request('https://edge.invalid', { method: 'POST', headers: { authorization: `Bearer ${c.secret}` } }));
  expect(await response.json()).toMatchObject({ result: 'dispatch_unconfirmed' }); expect(fetch).toHaveBeenCalledTimes(1); expect(JSON.stringify(log.mock.calls)).not.toContain(c.token);
});
it('orquestração mantém pipeline e isolamento; SQL não ativa Cron antes do provisionamento', () => {
  const w = readFileSync('.github/workflows/deploy-pages.yml','utf8');
  for (const part of ['workflow_dispatch:', 'group: operational-pages', 'cancel-in-progress: false', 'npm run automation:update', 'npm run data:validate', 'npm run pages:validate', 'npx tsx scripts/automation/push-snapshot.ts']) expect(w).toContain(part);
  expect(w).not.toMatch(/^\s+schedule:/m);
  const sql = readFileSync('supabase/migrations/202610050001_monitoramento_cron.sql','utf8');
  expect(sql).toContain('vault.decrypted_secrets'); expect(sql).toContain('revoke all on function'); expect(sql).not.toContain('cron.schedule(');
  const edge = readFileSync('supabase/functions/trigger-monitoramento/handler.ts','utf8'); expect(edge).not.toMatch(/collectors|hydrology|status\.json|impacto-jbs/);
});
