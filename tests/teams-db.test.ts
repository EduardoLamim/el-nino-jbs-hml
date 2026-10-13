import { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { drainOne, type Claim, type Rpc } from '../supabase/functions/teams-notifications/handler';
let db: PGlite;
const tokens = { admin: randomBytes(48).toString('hex'), ingest: randomBytes(48).toString('hex'), worker: randomBytes(48).toString('hex') };
const rpc: Rpc = async (scope, action, payload = {}) => (await db.query<{ v: unknown }>('select public.jbs_teams_rpc($1,$2,$3::jsonb) v', [tokens[scope], action, JSON.stringify(payload)])).rows[0]!.v;
const admin = (action: string, payload = {}) => rpc('admin', action, payload);
const snap = (level: string | null, hour: number) => ({ collected_at: `2026-10-13T${String(hour).padStart(2,'0')}:00:00Z`, level, since: null, reasons: [] });
const seed = () => admin('bootstrap', { commit: 'a'.repeat(40), snapshot: snap('normalidade', 10) });
const synthetic = (key = 'test-one') => admin('synthetic', { key, kind: 'level', body: { before: 'normalidade', after: 'alerta', occurred_at: '2026-10-13T14:00:00Z' } });
const rows = async (table: string) => (await db.query<Record<string, unknown>>(`select * from jbs_notifications.${table}`)).rows;
beforeAll(async () => {
  db = new PGlite(); await db.exec('create role anon; create role authenticated;');
  await db.exec(readFileSync('supabase/migrations/202610020001_impactos_jbs.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/202610130001_teams_notifications.sql','utf8'));
  for (const [scope, token] of Object.entries(tokens)) await db.query('insert into jbs_notifications.credentials values($1,$2)', [scope, createHash('sha256').update(token).digest('hex')]);
}, 30000);
beforeEach(async () => {
  await db.exec("reset role; truncate jbs_notifications.attempts,jbs_notifications.outbox,jbs_notifications.events,jbs_notifications.cursor,jbs_notifications.processed_snapshots,jbs_notifications.impact_baseline_events,jbs_notifications.audit; update jbs_notifications.settings set mode='disabled',live_until=null,impact_baseline=null; truncate jbs_private.impactos_jbs;");
});
afterAll(async () => { await db.close(); });
describe('Teams — transações e isolamento PostgreSQL', () => {
  it('não dá acesso público às tabelas ou ações administrativas', async () => {
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      await expect(db.exec('select * from jbs_notifications.events')).rejects.toThrow();
      await expect(db.exec("select jbs_notifications.execute('report')")).rejects.toThrow();
      await expect(db.query('select public.jbs_teams_rpc($1,$2)', ['invalido','report'])).rejects.toThrow();
      await expect(rpc('ingest','configure', { mode: 'mock' })).rejects.toThrow();
      await db.exec('reset role');
    }
  });
  it('baseline silenciosa; replay, nível igual e nova transição com identidade distinta', async () => {
    await seed(); expect(await rows('events')).toHaveLength(0);
    let previous = 'a'.repeat(40);
    for (const [i, level] of ['atencao','atencao','normalidade','atencao'].entries()) {
      const commit = String(i + 1).repeat(40);
      const payload = { commit, previous_commit: previous, snapshot: snap(level, 11+i) };
      await rpc('ingest','snapshot',payload); expect(await rpc('ingest','snapshot',payload)).toEqual({ duplicate: true }); previous = commit;
    }
    expect(await rows('events')).toHaveLength(3);
    expect(await rows('outbox')).toHaveLength(3);
    await admin('configure',{mode:'mock'});
    expect(await rpc('worker','claim')).toBeNull(); // Operational events never sent, even in mock mode.
  });
  it('lacuna/CAS e horário inválido não avançam cursor; null não inventa transição', async () => {
    await seed();
    await expect(rpc('ingest','snapshot',{commit:'b'.repeat(40),previous_commit:'f'.repeat(40),snapshot:snap('alerta',11)})).rejects.toThrow();
    expect(await rpc('ingest','checkpoint')).toEqual({commit:'a'.repeat(40)});
    await rpc('ingest','snapshot',{commit:'b'.repeat(40),previous_commit:'a'.repeat(40),snapshot:snap(null,11)});
    await rpc('ingest','snapshot',{commit:'c'.repeat(40),previous_commit:'b'.repeat(40),snapshot:snap('emergencia',12)});
    expect(await rows('events')).toHaveLength(0);
  });
  it('reconcilia ativação e encerramento entre ciclos sem dados pessoais ou duplicação', async () => {
    await seed();
    await db.exec("insert into jbs_private.impactos_jbs(tipo,responsavel_acionamento,acionado_em,encerrado_em,responsavel_encerramento) values('alagamento_terminal','NAO EXPORTAR',clock_timestamp(),clock_timestamp(),'PRIVADO');");
    expect(await rpc('ingest','impacts')).toEqual({reconciled:2});
    expect(await rpc('ingest','impacts')).toEqual({reconciled:0});
    const events = await rows('events'); expect(events).toHaveLength(2);
    expect(JSON.stringify(events)).not.toContain('NAO EXPORTAR'); expect(JSON.stringify(events)).not.toContain('PRIVADO');
  });
  it('encerramento posterior de impacto iniciado antes da baseline é preservado', async () => {
    await db.exec("insert into jbs_private.impactos_jbs(tipo,responsavel_acionamento,acionado_em) values('alagamento_terminal','Privado',clock_timestamp()-interval '1 day');");
    await seed(); await rpc('ingest','impacts'); expect(await rows('events')).toHaveLength(0);
    await db.exec("update jbs_private.impactos_jbs set encerrado_em=clock_timestamp(),responsavel_encerramento='Privado';");
    await rpc('ingest','impacts'); expect((await rows('events'))[0]!.kind).toBe('impact_close');
  });
  it('descobre commit tardio de Impacto com horário anterior ao bootstrap', async () => {
    await seed();
    await db.exec("insert into jbs_private.impactos_jbs(tipo,responsavel_acionamento,acionado_em) values('alagamento_terminal','Privado',clock_timestamp()-interval '1 minute');");
    expect(await rpc('ingest','impacts')).toEqual({reconciled:1});
    expect(await rpc('ingest','impacts')).toEqual({reconciled:0});
  });
  it('mock usa fila real e dedup sem alterar estado operacional', async () => {
    const projection = (await db.query('select * from public.impacto_jbs_publico')).rows;
    await synthetic(); await synthetic(); expect(await rows('events')).toHaveLength(1);
    expect(await drainOne(rpc,{liveEnabled:false})).toEqual({status:'idle'});
    await admin('configure',{mode:'mock'});
    expect(await drainOne(rpc,{liveEnabled:false})).toEqual({status:'mock_delivered'});
    expect(await drainOne(rpc,{liveEnabled:false})).toEqual({status:'idle'});
    expect((await db.query('select * from public.impacto_jbs_publico')).rows).toEqual(projection);
    expect((await db.query('select * from jbs_private.impactos_jbs')).rows).toHaveLength(0);
  });
  it('claims concorrentes não obtêm a mesma entrega e lease antiga é rejeitada', async () => {
    await synthetic(); await admin('configure',{mode:'mock'});
    const claims = await Promise.all([rpc('worker','claim'),rpc('worker','claim')]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    await expect(rpc('worker','finish',{id:(claims.find(Boolean) as Claim).id,lease:'00000000-0000-0000-0000-000000000000',outcome:'accepted'})).rejects.toThrow();
  });
  it('mudança de modo invalida envio reivindicado; janela real limitada a uma hora', async () => {
    await expect(admin('configure',{mode:'synthetic_live',live_until:new Date(Date.now()+7200_000).toISOString()})).rejects.toThrow();
    await synthetic(); await admin('configure',{mode:'mock'});
    const claim = await rpc('worker','claim') as Claim;
    await admin('configure',{mode:'disabled'});
    await expect(rpc('worker','sending',{id:claim.id,lease:claim.lease,mode:'mock'})).rejects.toThrow();
  });
  it('payload fica congelado e entrega incerta bloqueia ultrapassagem até revisão auditada', async () => {
    await synthetic('test-first'); await synthetic('test-second'); await admin('configure',{mode:'mock'});
    const c = await rpc('worker','claim') as Claim;
    const original = {type:'message',attachments:[]};
    expect(await rpc('worker','freeze',{id:c.id,lease:c.lease,payload:original})).toEqual(original);
    expect(await rpc('worker','freeze',{id:c.id,lease:c.lease,payload:{changed:true}})).toEqual(original);
    await rpc('worker','finish',{id:c.id,lease:c.lease,outcome:'uncertain'});
    expect(await rpc('worker','claim')).toBeNull();
    await admin('resolve',{id:c.id,status:'dismissed',reason:'Teste descartado após inspeção administrativa'});
    expect((await rpc('worker','claim') as Claim).event.event_key).toBe('hml:test:test-second');
    expect((await rows('outbox'))[0]!.payload_sha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it('crash após início de POST vira incerto; replay exige auditoria', async () => {
    await synthetic(); await admin('configure',{mode:'mock'}); const c = await rpc('worker','claim') as Claim;
    await rpc('worker','sending',{id:c.id,lease:c.lease,mode:'mock'});
    await db.exec("update jbs_notifications.outbox set lease_until=clock_timestamp()-interval '1 second';");
    expect(await rpc('worker','claim')).toBeNull(); expect((await rows('outbox'))[0]!.status).toBe('uncertain');
    await expect(admin('replay',{id:c.id,reason:'x'})).rejects.toThrow();
    await admin('resolve',{id:c.id,status:'confirmed',reason:'Confirmado visualmente no canal de teste'});
    expect((await rows('outbox'))[0]!.status).toBe('confirmed'); expect(await rows('audit')).toHaveLength(2);
  });
  it('retentativas respeitam Retry-After e terminam na quinta tentativa', async () => {
    await synthetic(); await admin('configure',{mode:'mock'});
    for (let i=1;i<=5;i++) {
      const c = await rpc('worker','claim') as Claim; expect(c.attempt).toBe(i);
      const retry = new Date(Date.now()+24*3600_000).toISOString();
      await rpc('worker','finish',{id:c.id,lease:c.lease,outcome:'retry',retry_at:retry,http_status:429});
      expect(new Date((await rows('outbox'))[0]!.next_at as string).getTime()).toBeGreaterThanOrEqual(Date.parse(retry));
      await db.exec("update jbs_notifications.outbox set next_at=clock_timestamp()-interval '1 second';");
    }
    expect(await rpc('worker','claim')).toBeNull(); expect((await rows('outbox'))[0]!.status).toBe('dead');
    await expect(admin('replay',{id:(await rows('outbox'))[0]!.id,reason:'Revisão administrativa após esgotamento'})).rejects.toThrow();
  });
  it('retenção remove detalhes antigos sem apagar idempotência ou contagem', async () => {
    await synthetic(); await admin('configure',{mode:'mock'}); await drainOne(rpc,{liveEnabled:false});
    await db.exec("update jbs_notifications.attempts set finished_at=clock_timestamp()-interval '31 days';");
    await admin('prune'); expect(await rows('attempts')).toHaveLength(0);
    expect(await rows('events')).toHaveLength(1); expect((await rows('outbox'))[0]!.attempts).toBe(1);
    await synthetic(); expect(await rows('events')).toHaveLength(1);
  });
});
