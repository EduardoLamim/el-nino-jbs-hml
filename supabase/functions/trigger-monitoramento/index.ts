import { criarDispatchHandler } from './handler.ts';
Deno.serve(criarDispatchHandler({
  secret: Deno.env.get('MONITORAMENTO_CRON_SECRET') ?? '',
  token: Deno.env.get('GITHUB_DISPATCH_TOKEN') ?? '',
}, { fetch, log: event => console.log(JSON.stringify(event)) }));
