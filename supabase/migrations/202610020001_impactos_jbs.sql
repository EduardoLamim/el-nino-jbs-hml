-- Histórico privado; publicação sanitizada em uma linha persistente para Realtime.
create schema if not exists jbs_private;
revoke all on schema jbs_private from public, anon, authenticated;
create table jbs_private.backend_credential (
  singleton boolean primary key default true check (singleton),
  token_sha256 text not null check (token_sha256 ~ '^[0-9a-f]{64}$')
);
alter table jbs_private.backend_credential enable row level security;
-- Provisionar apenas o HASH de uma credencial aleatória específica do backend, nunca o PIN.
create table jbs_private.impactos_jbs (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('alagamento_terminal','acesso_operacional_terminal_comprometido',
    'infraestrutura_critica_terminal_afetada','area_operacional_afetada','outro_impacto_fisico_terminal')),
  responsavel_acionamento text not null check (length(btrim(responsavel_acionamento)) between 1 and 120),
  observacao_acionamento text check (length(observacao_acionamento) <= 2000),
  acionado_em timestamptz not null default clock_timestamp(),
  responsavel_encerramento text check (length(btrim(responsavel_encerramento)) between 1 and 120),
  observacao_encerramento text check (length(observacao_encerramento) <= 2000),
  encerrado_em timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  check ((encerrado_em is null and responsavel_encerramento is null and observacao_encerramento is null)
    or (encerrado_em is not null and responsavel_encerramento is not null and encerrado_em >= acionado_em))
);
create unique index impactos_jbs_um_ativo on jbs_private.impactos_jbs ((true)) where encerrado_em is null;
alter table jbs_private.impactos_jbs enable row level security;
revoke all on jbs_private.impactos_jbs from public, anon, authenticated;
create table public.impacto_jbs_publico (
  id integer primary key check (id = 1),
  revisao bigint not null default 0,
  ativo boolean not null,
  impacto_id uuid,
  tipo text,
  acionado_em timestamptz,
  atualizado_em timestamptz not null default clock_timestamp(),
  check ((ativo and impacto_id is not null and tipo is not null and acionado_em is not null)
    or (not ativo and impacto_id is null and tipo is null and acionado_em is null))
);
insert into public.impacto_jbs_publico(id, ativo) values (1, false);
alter table public.impacto_jbs_publico enable row level security;
revoke all on public.impacto_jbs_publico from public, anon, authenticated;
grant select on public.impacto_jbs_publico to anon, authenticated;
create policy impacto_publico_leitura on public.impacto_jbs_publico for select to anon, authenticated using (true);

create function jbs_private.autorizar(p_token text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or length(p_token) < 64 or not exists (
    select 1 from jbs_private.backend_credential where token_sha256 = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  ) then raise exception 'Backend não autorizado' using errcode = '42501'; end if;
end $$;
revoke all on function jbs_private.autorizar(text) from public, anon, authenticated;

create table jbs_private.limite_tentativas (id integer primary key check(id=1), inicio timestamptz not null, quantidade integer not null);
alter table jbs_private.limite_tentativas enable row level security;
create function public.jbs_impacto_tentativa(p_backend_token text) returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  perform jbs_private.autorizar(p_backend_token);
  -- Limite global compartilhado: 20 tentativas/minuto. Sem IP, PIN ou payload em tabelas/logs.
  insert into jbs_private.limite_tentativas values(1, clock_timestamp(), 1)
  on conflict(id) do update set
    quantidade = case when jbs_private.limite_tentativas.inicio < clock_timestamp() - interval '1 minute' then 1 else jbs_private.limite_tentativas.quantidade + 1 end,
    inicio = case when jbs_private.limite_tentativas.inicio < clock_timestamp() - interval '1 minute' then clock_timestamp() else jbs_private.limite_tentativas.inicio end
  returning quantidade into n;
  return n <= 20;
end $$;

create function public.jbs_impacto_escrever(p_backend_token text, p_action text, p_tipo text, p_responsavel text,
  p_observacao text, p_impacto_id uuid default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jbs_private.impactos_jbs; atual public.impacto_jbs_publico;
begin
  perform jbs_private.autorizar(p_backend_token);
  if p_action not in ('ativar','encerrar') or p_action is null or p_responsavel is null
    or length(btrim(p_responsavel)) not between 1 and 120 or length(p_observacao) > 2000 then
    raise exception 'Entrada inválida' using errcode='22023';
  end if;
  -- Serializa as operações; o índice parcial continua protegendo a tabela independentemente da RPC.
  select * into atual from public.impacto_jbs_publico where id=1 for update;
  if p_action = 'ativar' then
    if atual.ativo then raise exception 'Já existe impacto ativo' using errcode='23505'; end if;
    insert into jbs_private.impactos_jbs(tipo, responsavel_acionamento, observacao_acionamento)
      values(p_tipo, btrim(p_responsavel), nullif(btrim(p_observacao),'')) returning * into r;
    update public.impacto_jbs_publico set ativo=true, impacto_id=r.id, tipo=r.tipo, acionado_em=r.acionado_em,
      atualizado_em=clock_timestamp(), revisao=revisao+1 where id=1;
  else
    if p_impacto_id is null then raise exception 'ID obrigatório' using errcode='22023'; end if;
    -- Nunca encerrar um impacto novo em resposta a um formulário antigo.
    if atual.ativo and atual.impacto_id <> p_impacto_id then raise exception 'Impacto alterado' using errcode='40001'; end if;
    if not atual.ativo then
      if not exists(select 1 from jbs_private.impactos_jbs where id=p_impacto_id and encerrado_em is not null) then
        raise exception 'Impacto não encontrado' using errcode='22023';
      end if;
    else
      update jbs_private.impactos_jbs set responsavel_encerramento=btrim(p_responsavel),
        observacao_encerramento=nullif(btrim(p_observacao),''), encerrado_em=clock_timestamp()
        where id=p_impacto_id and encerrado_em is null;
      update public.impacto_jbs_publico set ativo=false, impacto_id=null, tipo=null, acionado_em=null,
        atualizado_em=clock_timestamp(), revisao=revisao+1 where id=1;
    end if;
  end if;
  select * into atual from public.impacto_jbs_publico where id=1;
  return to_jsonb(atual);
end $$;
revoke all on function public.jbs_impacto_escrever(text,text,text,text,text,uuid) from public;
revoke all on function public.jbs_impacto_tentativa(text) from public;
grant execute on function public.jbs_impacto_escrever(text,text,text,text,text,uuid) to anon, authenticated;
grant execute on function public.jbs_impacto_tentativa(text) to anon, authenticated;
-- EXECUTE não confere escrita sem a credencial exclusiva do backend.
revoke all on all tables in schema jbs_private from public, anon, authenticated;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.impacto_jbs_publico;
  end if;
end $$;
