-- Independent notification storage. No trigger, Cron or modification of Impacto RPCs.
create schema jbs_notifications;
revoke all on schema jbs_notifications from public, anon, authenticated;
create table jbs_notifications.credentials (
  scope text primary key check(scope in ('ingest','worker','admin')),
  token_sha256 text not null check(token_sha256 ~ '^[0-9a-f]{64}$')
);
create table jbs_notifications.settings (
  id boolean primary key default true check(id),
  environment text not null default 'hml' check(environment='hml'),
  mode text not null default 'disabled' check(mode in ('disabled','mock','synthetic_live')),
  live_until timestamptz,
  impact_baseline timestamptz
);
insert into jbs_notifications.settings(id) values(true);
create table jbs_notifications.cursor (
  id boolean primary key default true check(id), commit_sha text not null,
  snapshot jsonb not null, updated_at timestamptz not null default clock_timestamp()
);
create table jbs_notifications.processed_snapshots (
  commit_sha text primary key, processed_at timestamptz not null default clock_timestamp()
);
create table jbs_notifications.impact_baseline_events (
  event_key text primary key
);
create table jbs_notifications.events (
  event_key text primary key, environment text not null default 'hml' check(environment='hml'),
  kind text not null check(kind in ('level','impact_open','impact_close')),
  is_test boolean not null default false, body jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
create table jbs_notifications.outbox (
  id uuid primary key default gen_random_uuid(), event_key text not null unique references jbs_notifications.events,
  sequence bigint generated always as identity unique,
  status text not null default 'pending' check(status in ('pending','retry','leased','sending','accepted','mock_delivered','uncertain','blocked','dead','confirmed','dismissed')),
  attempts integer not null default 0, next_at timestamptz not null default clock_timestamp(),
  lease uuid, lease_until timestamptz, lease_mode text, payload jsonb, payload_sha256 text, accepted_at timestamptz,
  updated_at timestamptz not null default clock_timestamp()
);
create index teams_outbox_due on jbs_notifications.outbox(next_at) where status in ('pending','retry');
create table jbs_notifications.attempts (
  id uuid primary key, delivery_id uuid not null references jbs_notifications.outbox,
  number integer not null, started_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz, outcome text not null default 'leased', http_status integer,
  unique(delivery_id,number)
);
create table jbs_notifications.audit (
  id bigint generated always as identity primary key, action text not null,
  reference text, reason text not null, created_at timestamptz not null default clock_timestamp()
);
create function jbs_notifications.add_event(k text, kind text, body jsonb, test boolean default false)
returns void language plpgsql set search_path='' as $$
begin
  insert into jbs_notifications.events(event_key,kind,body,is_test) values(k,kind,body,test) on conflict do nothing;
  insert into jbs_notifications.outbox(event_key) values(k) on conflict do nothing;
end $$;

-- Private dispatcher can also be invoked by the administrative database connection.
-- Public callers must pass the scoped credential wrapper declared below.
create function jbs_notifications.execute(p_action text, p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  s jbs_notifications.settings; c jbs_notifications.cursor;
  o jbs_notifications.outbox; e jbs_notifications.events; r record;
  b jsonb; k text; sha text; result jsonb; target text; n integer; reason text;
begin
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>131072 then raise exception 'Invalid payload'; end if;
  select * into s from jbs_notifications.settings where id=true;

  if p_action='checkpoint' then
    select * into c from jbs_notifications.cursor where id=true;
    return jsonb_build_object('commit',c.commit_sha);
  elsif p_action='bootstrap' then
    sha:=p_payload->>'commit'; b:=p_payload->'snapshot';
    if sha !~ '^[0-9a-f]{40}$' or sha is null or b->>'collected_at' is null
      or (b->>'collected_at')::timestamptz>clock_timestamp()
      or (b->>'level' is not null and b->>'level' not in ('normalidade','atencao','alerta','emergencia')) then raise exception 'Invalid baseline'; end if;
    perform 1 from jbs_notifications.settings where id=true for update;
    if exists(select 1 from jbs_notifications.cursor) then raise exception 'Already initialized'; end if;
    insert into jbs_notifications.cursor(id,commit_sha,snapshot) values(true,sha,b);
    insert into jbs_notifications.processed_snapshots values(sha,clock_timestamp());
    -- Capture visible history identities, not a wall-clock cutoff. A transaction
    -- committing later remains discoverable even when its timestamp precedes bootstrap.
    insert into jbs_notifications.impact_baseline_events
      select 'hml:'||v.kind||':'||h.id::text from jbs_private.impactos_jbs h
      cross join lateral (values ('impact_open',h.acionado_em),('impact_close',h.encerrado_em)) v(kind,at)
      where v.at is not null;
    update jbs_notifications.settings set impact_baseline=clock_timestamp() where id=true;
    insert into jbs_notifications.audit(action,reference,reason) values('bootstrap',sha,'Explicit baseline; no historical notifications');
    return '{"initialized":true}';
  elsif p_action='snapshot' then
    sha:=p_payload->>'commit'; b:=p_payload->'snapshot';
    select * into c from jbs_notifications.cursor where id=true for update;
    if not found then raise exception 'Baseline required'; end if;
    if exists(select 1 from jbs_notifications.processed_snapshots where commit_sha=sha) then return '{"duplicate":true}'; end if;
    if sha is null or sha !~ '^[0-9a-f]{40}$' or (p_payload->>'previous_commit') is distinct from c.commit_sha
      or b->>'collected_at' is null or (b->>'collected_at')::timestamptz>clock_timestamp()
      or (b->>'collected_at')::timestamptz <= (c.snapshot->>'collected_at')::timestamptz then raise exception 'Invalid sequence'; end if;
    if b->>'level' is not null and b->>'level' not in ('normalidade','atencao','alerta','emergencia') then raise exception 'Invalid level'; end if;
    if c.snapshot->>'level' is not null and b->>'level' is not null
      and c.snapshot->>'level' <> b->>'level' then
      k:='hml:level:'||sha;
      perform jbs_notifications.add_event(k,'level',jsonb_build_object(
        'before',c.snapshot->>'level','after',b->>'level','occurred_at',b->>'since',
        'detected_at',b->>'collected_at','reasons',coalesce(b->'reasons','[]'::jsonb),
        'commit',sha,'pages_confirmed',coalesce((p_payload->>'pages_confirmed')::boolean,false)));
    end if;
    insert into jbs_notifications.processed_snapshots values(sha,clock_timestamp());
    update jbs_notifications.cursor set commit_sha=sha,snapshot=b,updated_at=clock_timestamp() where id=true;
    return '{"processed":true}';
  elsif p_action='impacts' then
    if s.impact_baseline is null then raise exception 'Baseline required'; end if;
    n:=0;
    -- Anti-join rather than a timestamp cursor: late commits and closure of old impacts remain discoverable.
    for r in select h.id,h.tipo,v.kind,v.at from jbs_private.impactos_jbs h
      cross join lateral (values ('impact_open',h.acionado_em),('impact_close',h.encerrado_em)) v(kind,at)
      where v.at is not null and not exists(select 1 from jbs_notifications.impact_baseline_events baseline
        where baseline.event_key='hml:'||v.kind||':'||h.id::text)
      and not exists(select 1 from jbs_notifications.events ev
        where ev.event_key='hml:'||v.kind||':'||h.id::text)
      order by v.at,h.id,case v.kind when 'impact_open' then 0 else 1 end limit 100
    loop
      perform jbs_notifications.add_event('hml:'||r.kind||':'||r.id::text,r.kind,
        jsonb_build_object('impact_id',r.id,'impact_type',r.tipo,'occurred_at',r.at,
          'detected_at',clock_timestamp(),'manual',true)); n:=n+1;
    end loop;
    return jsonb_build_object('reconciled',n);
  elsif p_action='configure' then
    target:=p_payload->>'mode';
    if target is null or target not in ('disabled','mock','synthetic_live') then raise exception 'Invalid mode'; end if;
    if target='synthetic_live' and ((p_payload->>'live_until')::timestamptz<=clock_timestamp()
      or (p_payload->>'live_until')::timestamptz>clock_timestamp()+interval '1 hour' or p_payload->>'live_until' is null) then raise exception 'Bounded test window required'; end if;
    update jbs_notifications.settings set mode=target,
      live_until=case when target='synthetic_live' then (p_payload->>'live_until')::timestamptz end where id=true;
    insert into jbs_notifications.audit(action,reason) values('configure',target);
    return jsonb_build_object('mode',target);
  elsif p_action='synthetic' then
    k:=p_payload->>'key'; target:=p_payload->>'kind'; b:=p_payload->'body';
    if k is null or k !~ '^test-[a-zA-Z0-9_-]{1,80}$' or target is null
      or target not in ('level','impact_open','impact_close') or jsonb_typeof(b)<>'object' or b is null then raise exception 'Invalid synthetic event'; end if;
    if target='level' and (coalesce(b->>'before','') not in ('normalidade','atencao','alerta','emergencia')
      or coalesce(b->>'after','') not in ('normalidade','atencao','alerta','emergencia') or b->>'before'=b->>'after') then raise exception 'Invalid synthetic transition'; end if;
    perform jbs_notifications.add_event('hml:test:'||k,target,b,true);
    return jsonb_build_object('key','hml:test:'||k);
  elsif p_action='claim' then
    delete from jbs_notifications.attempts where finished_at<clock_timestamp()-interval '30 days';
    -- Crash after POST is ambiguous. Never blindly recover sending as pending.
    update jbs_notifications.attempts a set outcome=case when expired.status='sending' then 'uncertain' else 'lease_expired' end,finished_at=clock_timestamp()
      from jbs_notifications.outbox expired where expired.lease=a.id and expired.status in ('leased','sending') and expired.lease_until<clock_timestamp();
    update jbs_notifications.outbox set status=case when status='sending' then 'uncertain' when attempts>=5 then 'dead' else 'retry' end,
      lease=null,lease_until=null,updated_at=clock_timestamp() where status in ('leased','sending') and lease_until<clock_timestamp();
    if s.mode='disabled' or (s.mode='synthetic_live' and (s.live_until is null or s.live_until<=clock_timestamp())) then return 'null'::jsonb; end if;
    select q.* into o from jbs_notifications.outbox q join jbs_notifications.events ev using(event_key)
      where ev.is_test=true and q.status in ('pending','retry') and q.attempts<5 and q.next_at<=clock_timestamp()
      and not exists (select 1 from jbs_notifications.outbox earlier
        join jbs_notifications.events earlier_event on earlier_event.event_key=earlier.event_key
        where earlier_event.is_test=true and earlier.sequence<q.sequence
          and earlier.status in ('pending','retry','leased','sending','uncertain','blocked','dead'))
      order by q.next_at,q.id for update of q skip locked limit 1;
    if not found then return 'null'::jsonb; end if;
    update jbs_notifications.outbox set status='leased',attempts=attempts+1,lease=gen_random_uuid(),
      lease_until=clock_timestamp()+interval '60 seconds',lease_mode=s.mode,updated_at=clock_timestamp() where id=o.id returning * into o;
    insert into jbs_notifications.attempts(id,delivery_id,number) values(o.lease,o.id,o.attempts);
    select * into e from jbs_notifications.events where event_key=o.event_key;
    return jsonb_build_object('id',o.id,'lease',o.lease,'attempt',o.attempts,'mode',s.mode,
      'event',to_jsonb(e),'payload',o.payload);
  elsif p_action in ('freeze','sending','finish') then
    select * into o from jbs_notifications.outbox where id=(p_payload->>'id')::uuid for update;
    if not found or o.lease is distinct from (p_payload->>'lease')::uuid or o.lease_until<=clock_timestamp() then raise exception 'Stale lease'; end if;
    if p_action='freeze' then
      if o.status<>'leased' or jsonb_typeof(p_payload->'payload') is distinct from 'object' then raise exception 'Invalid frozen payload'; end if;
      if o.payload is null then
        update jbs_notifications.outbox set payload=p_payload->'payload',
          payload_sha256=encode(sha256(convert_to((p_payload->'payload')::text,'UTF8')),'hex') where id=o.id;
      end if;
      return (select payload from jbs_notifications.outbox where id=o.id);
    elsif p_action='sending' then
      if o.status<>'leased' or s.mode='disabled' or o.lease_mode is distinct from s.mode
        or p_payload->>'mode' is distinct from s.mode
        or (s.mode='synthetic_live' and (s.live_until is null or s.live_until<=clock_timestamp())) then raise exception 'Sending not authorized'; end if;
      update jbs_notifications.outbox set status='sending',updated_at=clock_timestamp() where id=o.id;
      update jbs_notifications.attempts set outcome='sending' where id=o.lease;
      return '{"ok":true}';
    end if;
    target:=p_payload->>'outcome';
    if o.status not in ('leased','sending') or target is null or target not in ('accepted','mock_delivered','retry','uncertain','blocked') then raise exception 'Invalid outcome'; end if;
    if target='retry' and o.attempts>=5 then target:='dead'; end if;
    update jbs_notifications.attempts set finished_at=clock_timestamp(),outcome=target,http_status=(p_payload->>'http_status')::integer where id=o.lease;
    update jbs_notifications.outbox set status=target,lease=null,lease_until=null,
      next_at=greatest(clock_timestamp()+make_interval(mins=>10*power(2,greatest(o.attempts-1,0))::integer),
        coalesce((p_payload->>'retry_at')::timestamptz,clock_timestamp())),
      accepted_at=case when target='accepted' then clock_timestamp() else accepted_at end,
      updated_at=clock_timestamp() where id=o.id;
    return jsonb_build_object('status',target);
  elsif p_action in ('replay','resolve') then
    reason:=p_payload->>'reason';
    if reason is null or length(btrim(reason))<10 or length(reason)>500 then raise exception 'Audit reason required'; end if;
    select * into o from jbs_notifications.outbox where id=(p_payload->>'id')::uuid for update;
    if not found or o.status not in ('uncertain','blocked','dead','accepted') then raise exception 'Reviewable delivery required'; end if;
    if p_action='replay' then
      if o.attempts>=5 then raise exception 'Five-attempt limit reached'; end if;
      target:='retry';
    else
      target:=p_payload->>'status';
      if target is null or target not in ('confirmed','blocked','dismissed') then raise exception 'Invalid resolution'; end if;
    end if;
    update jbs_notifications.outbox set status=target,next_at=clock_timestamp(),updated_at=clock_timestamp() where id=o.id;
    insert into jbs_notifications.audit(action,reference,reason) values(p_action,o.id::text,reason);
    return jsonb_build_object('status',target);
  elsif p_action='prune' then
    delete from jbs_notifications.attempts where finished_at<clock_timestamp()-interval '30 days';
    get diagnostics n=row_count;
    insert into jbs_notifications.audit(action,reason) values('prune','Attempt details only; identities and outcomes retained');
    return jsonb_build_object('deleted_attempts',n);
  elsif p_action='report' then
    select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'key',q.event_key,'status',q.status,'attempts',q.attempts,'updated_at',q.updated_at) order by q.updated_at desc),'[]'::jsonb)
      into result from (select * from jbs_notifications.outbox order by updated_at desc limit 100) q;
    return jsonb_build_object('mode',s.mode,'live_until',s.live_until,'deliveries',result,
      'attempts',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from
        (select id,delivery_id,number,started_at,finished_at,outcome,http_status from jbs_notifications.attempts order by started_at desc limit 100) a));
  end if;
  raise exception 'Unknown notification action';
end $$;
-- Tokens are provisioned as hashes administratively; no broad service-role key is required.
create function public.jbs_teams_rpc(p_token text, p_action text, p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare needed text;
begin
  needed := case when p_action in ('checkpoint','snapshot','impacts') then 'ingest'
    when p_action in ('claim','freeze','sending','finish') then 'worker' else 'admin' end;
  if p_token is null or length(p_token)<64 or not exists (
    select 1 from jbs_notifications.credentials where scope=needed
    and token_sha256=encode(sha256(convert_to(p_token,'UTF8')),'hex')) then
    raise exception 'Unauthorized notification scope' using errcode='42501';
  end if;
  return jbs_notifications.execute(p_action,p_payload);
end $$;
revoke all on all tables in schema jbs_notifications from public,anon,authenticated;
revoke all on all functions in schema jbs_notifications from public,anon,authenticated;
revoke all on function public.jbs_teams_rpc(text,text,jsonb) from public;
grant execute on function public.jbs_teams_rpc(text,text,jsonb) to anon,authenticated;
-- RPC execute alone gives no access: dedicated scoped 256-bit tokens are checked first.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='jbs_notifications' loop
    execute format('alter table jbs_notifications.%I enable row level security',t.tablename);
  end loop;
end $$;
