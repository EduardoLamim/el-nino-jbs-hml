-- Somente orquestração HML. Nenhum dado ambiental ou segredo literal.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create schema if not exists monitoramento_hml;
revoke all on schema monitoramento_hml from public, anon, authenticated;

create table if not exists monitoramento_hml.dispatch_requests (
  request_id bigint primary key,
  expected_at timestamptz not null,
  requested_at timestamptz not null default clock_timestamp()
);
revoke all on monitoramento_hml.dispatch_requests from public, anon, authenticated;
alter table monitoramento_hml.dispatch_requests enable row level security;

create or replace function monitoramento_hml.trigger_dispatch()
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  credential text;
  request_id bigint;
  expected_at timestamptz := to_timestamp(floor((extract(epoch from statement_timestamp()) - 120) / 600) * 600 + 120);
begin
  select decrypted_secret into strict credential from vault.decrypted_secrets
    where name = 'MONITORAMENTO_CRON_SECRET';
  if length(credential) < 32 then raise exception 'Credencial do agendador indisponível'; end if;
  select net.http_post(
    url := 'https://ufeahglxwygvlugfsopi.supabase.co/functions/v1/trigger-monitoramento',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || credential),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  ) into request_id;
  insert into monitoramento_hml.dispatch_requests(request_id, expected_at) values (request_id, expected_at);
  return request_id;
end;
$$;
revoke all on function monitoramento_hml.trigger_dispatch() from public, anon, authenticated;
-- Ativação deliberadamente separada: somente após provisionamento e teste real da Edge.
