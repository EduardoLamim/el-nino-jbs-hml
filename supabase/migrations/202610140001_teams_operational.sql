-- Notification-only upgrade; no operational tables, triggers, schedules or credentials changed.
-- Atomic and deliberately fail-closed. Apply once; inspect schema after uncertain execution.
begin;
set local lock_timeout='2s';
set local statement_timeout='25s';
lock table jbs_notifications.settings in exclusive mode;
do $$ begin
  if exists(select 1 from jbs_notifications.settings where mode<>'disabled')
    or exists(select 1 from jbs_notifications.outbox where status in ('leased','sending')) then
    raise exception 'Disable notifications and resolve in-flight work before upgrade';
  end if;
end $$;
alter table jbs_notifications.settings drop constraint settings_mode_check;
alter table jbs_notifications.settings add constraint settings_mode_check check(mode in ('disabled','mock','synthetic_live','operational'));
alter table jbs_notifications.settings add column operational_since timestamptz;
alter table jbs_notifications.settings add column operational_floor bigint;
-- Conservative admission: both sequence and actual transition time must follow activation.
-- A historical event reconciled late is retained for audit, never automatically delivered.
create function jbs_notifications.eligible(e jbs_notifications.events, seq bigint, s jbs_notifications.settings)
returns boolean language plpgsql stable set search_path='' as $$
declare at timestamptz; detected timestamptz;
begin
  if s.mode in ('mock','synthetic_live') then return e.is_test; end if;
  if s.mode<>'operational' or e.is_test or s.operational_since is null or s.operational_floor is null
    or seq<=s.operational_floor then return false; end if;
  at:=(e.body->>'occurred_at')::timestamptz;
  detected:=(e.body->>'detected_at')::timestamptz;
  if at is null or detected is null or at<=s.operational_since or at>detected or detected>statement_timestamp() then return false; end if;
  if e.kind='level' then
    return e.event_key='hml:level:'||(e.body->>'commit')
      and exists(select 1 from jbs_notifications.processed_snapshots where commit_sha=e.body->>'commit');
  end if;
  return e.body->>'manual'='true' and exists(select 1 from jbs_private.impactos_jbs h
    where h.id::text=e.body->>'impact_id' and e.event_key='hml:'||e.kind||':'||h.id::text
      and at=case e.kind when 'impact_open' then h.acionado_em when 'impact_close' then h.encerrado_em end);
exception when others then return false;
end $$;
revoke all on function jbs_notifications.eligible(jbs_notifications.events,bigint,jbs_notifications.settings) from public,anon,authenticated;
create or replace function jbs_notifications.execute(p_action text, p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  s jbs_notifications.settings; c jbs_notifications.cursor;
  o jbs_notifications.outbox; e jbs_notifications.events; r record;
  b jsonb; k text; sha text; result jsonb; target text; n integer; reason text;
begin
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>131072 then raise exception 'Invalid payload'; end if;
  select * into s from jbs_notifications.settings where id=true for update;

  if p_action='activate_operational' then
    reason:=p_payload->>'reason';
    if s.mode<>'disabled' or p_payload->>'confirm' is distinct from 'ATIVAR TEAMS HML'
      or reason is null or length(btrim(reason))<10 or length(reason)>500 then raise exception 'Explicit activation required'; end if;
    select * into c from jbs_notifications.cursor where id=true;
    if not found or p_payload->>'expected_commit' is distinct from c.commit_sha
      or s.impact_baseline is null then raise exception 'Reconciled baseline required'; end if;
    if exists(select 1 from jbs_notifications.outbox where status in ('leased','sending','uncertain')) then
      raise exception 'Review active or uncertain deliveries first'; end if;
    update jbs_notifications.settings set mode='operational',live_until=null,
      operational_since=clock_timestamp(),operational_floor=(select coalesce(max(sequence),0) from jbs_notifications.outbox)
      where id=true returning * into s;
    insert into jbs_notifications.audit(action,reference,reason) values('activate_operational',c.commit_sha,
      reason||'; cutoff='||s.operational_since::text||'; floor='||s.operational_floor::text);
    return jsonb_build_object('mode',s.mode,'operational_since',s.operational_since,'operational_floor',s.operational_floor);
  elsif p_action='probe_worker' then
    return '{"scope":"worker","ready":true}';
  elsif p_action='checkpoint' then
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
      where jbs_notifications.eligible(ev,q.sequence,s) and q.status in ('pending','retry') and q.attempts<5 and q.next_at<=clock_timestamp()
      and not exists (select 1 from jbs_notifications.outbox earlier
        join jbs_notifications.events earlier_event on earlier_event.event_key=earlier.event_key
        where jbs_notifications.eligible(earlier_event,earlier.sequence,s) and earlier.sequence<q.sequence
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
      select * into e from jbs_notifications.events where event_key=o.event_key;
      if not coalesce(jbs_notifications.eligible(e,o.sequence,s),false) or o.status<>'leased' or s.mode='disabled' or o.lease_mode is distinct from s.mode
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
    return jsonb_build_object('mode',s.mode,'live_until',s.live_until,'operational_since',s.operational_since,'operational_floor',s.operational_floor,
      'checkpoint',(select commit_sha from jbs_notifications.cursor where id=true),
      'queue_summary',(select jsonb_build_object(
        'pending',count(*) filter(where q.status in ('pending','retry')),
        'in_flight',count(*) filter(where q.status in ('leased','sending')),
        'uncertain',count(*) filter(where q.status='uncertain'),
        'eligible_pending',count(*) filter(where q.status in ('pending','retry') and jbs_notifications.eligible(ev,q.sequence,s)))
        from jbs_notifications.outbox q join jbs_notifications.events ev using(event_key)),
      'deliveries',result,
      'attempts',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from
        (select id,delivery_id,number,started_at,finished_at,outcome,http_status from jbs_notifications.attempts order by started_at desc limit 100) a));
  end if;
  raise exception 'Unknown notification action';
end $$;

commit;
