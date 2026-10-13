/** One-time, explicit HML provisioning. Run through the hidden-input PowerShell wrapper. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { projectSnapshot, trustedSnapshotCommit } from './reconcile';
import { checkRecovery, disableTeams, migrationBatch, saveCredentialHashes, withShutdown } from './provision-safety';

const project = 'ufeahglxwygvlugfsopi', repo = 'EduardoLamim/el-nino-jbs-hml';
const endpoint = `https://${project}.supabase.co/functions/v1/teams-notifications`;
const token = process.env.SUPABASE_ACCESS_TOKEN;
let stage = 'preflight';
const evidence: Record<string, unknown> = { project, external_messages: 0, visual_confirmation: 'pending' };
async function api(path: string, body?: unknown) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${project}${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' },
    ...(body === undefined ? {} : {body:JSON.stringify(body)}), signal:AbortSignal.timeout(60_000), redirect:'error',
  });
  if (!r.ok) { await r.body?.cancel(); throw new Error(`Management HTTP ${r.status}`); }
  const text = await r.text(); return text ? JSON.parse(text) : null;
}
const query = (sql: string, parameters: unknown[] = []) => api('/database/query', {query:sql,...(parameters.length ? {parameters} : {})});
const run = (command: string, args: string[], input?: string) => execFileSync(command,args,{encoding:'utf8',stdio:['pipe','pipe','pipe'],input,timeout:120_000}).trim();

async function main() {
  if (!token || readFileSync('supabase/.temp/project-ref','utf8').trim() !== project) throw new Error('HML administrative authentication required');
  // All local tools and GitHub authentication checked before any remote mutation.
  run('gh',['auth','status']);
  if (process.platform === 'win32') run('cmd.exe',['/d','/s','/c','supabase --version']); else run('supabase',['--version']);
  const remote = run('git',['remote','get-url','origin']);
  if (!remote.toLowerCase().endsWith(`${repo.toLowerCase()}.git`) && !remote.toLowerCase().endsWith(repo.toLowerCase())) throw new Error('Wrong repository');
  const enabled = run('gh',['variable','list','--repo',repo,'--json','name,value']);
  if ((JSON.parse(enabled) as {name:string;value:string}[]).some(v=>v.name==='TEAMS_HML_ENABLED'&&v.value==='true')) throw new Error('Already enabled; use audited administration, not reprovisioning');
  const synthetic = process.argv.includes('--synthetic-tests'), recover = process.argv.includes('--recover-setup');
  if(recover && synthetic) throw new Error('Recovery cannot send messages');
  const migration=readFileSync('supabase/migrations/202610130001_teams_notifications.sql','utf8').replaceAll('\r\n','\n');
  const history=await query("select count(*)::int as n from information_schema.columns where table_schema='supabase_migrations' and table_name='schema_migrations' and column_name in ('version','name','statements')") as {n:number}[];
  if(history[0]?.n!==3) throw new Error('Migration history prerequisite missing; inspect administratively');
  const state = await query("select to_regnamespace('jbs_notifications') is not null as installed") as {installed:boolean}[];
  if(typeof state[0]?.installed!=='boolean') throw new Error('Unknown installation state');
  let recoveryState={installed:state[0].installed,exact:false,busy:false,live:false};
  if(state[0].installed){
    const recorded=await query("select encode(sha256(convert_to(replace(array_to_string(statements,E'\\n'),E'\\r\\n',E'\\n'),'UTF8')),'hex') as hash from supabase_migrations.schema_migrations where version='202610130001'") as {hash:string}[];
    if(recorded[0]?.hash!==createHash('sha256').update(migration).digest('hex')) throw new Error('Installed migration differs; no automatic repair');
    const activity=await query("select exists(select 1 from jbs_notifications.outbox where status in ('leased','sending')) as busy, mode='synthetic_live' as live from jbs_notifications.settings where id=true") as {busy:boolean;live:boolean}[];
    if(!activity[0]) throw new Error('Incomplete schema; administrative inspection required');
    recoveryState={...recoveryState,exact:true,...activity[0]};
  }
  checkRecovery(recoveryState,recover,synthetic);
  const secrets = await api('/secrets') as {name:string}[];
  if(!secrets.some(s=>s.name==='JBS_SUPABASE_PUBLISHABLE_KEY')) throw new Error('Public project key prerequisite missing');
  if(synthetic && !secrets.some(s=>s.name==='TEAMS_WORKFLOW_URL_HML')) throw new Error('Set webhook only in backend secrets first');
  run('git',['fetch','origin','main']);
  const commit=run('git',['log','-1','--format=%H','origin/main','--','public/data/status.json']);
  const [author,subject]=run('git',['show','-s','--format=%ae%n%s',commit]).split('\n');
  if(!trustedSnapshotCommit(author!,subject!,run('git',['diff-tree','--no-commit-id','--name-only','-r',commit]).split('\n'))) throw new Error('Untrusted baseline');
  const snapshot=projectSnapshot(JSON.parse(run('git',['show',`${commit}:public/data/status.json`])));
  const credentials = Object.fromEntries(['ingest','worker','admin','wake','edgeAdmin'].map(k=>[k,randomBytes(48).toString('hex')]));
  // Cleanup encompasses every mutating stage, including unknown migration outcomes.
  await withShutdown(async()=>{
  stage='migration';
  if(!recover) await query(migrationBatch(migration));
  const initialOff=await disableTeams(query,api);
  if(!initialOff.database_disabled || !initialOff.secret_disable_acknowledged) throw new Error('Initial shutdown not confirmed');
  stage='dedicated credentials';
  // All three DB hashes change in one statement. Recovery rotates only Teams credentials,
  // explicitly and while quiescent; it never resets cursor, events or attempts.
  const hashes=['ingest','worker','admin'].map(scope=>({scope,token_sha256:createHash('sha256').update(credentials[scope]!).digest('hex')}));
  await saveCredentialHashes(query,hashes,recover?'Explicit recovery; notification credentials rotated; event identities preserved':'Initial notification credentials');
  stage='backend notification secrets';
  await api('/secrets',[
    ...['ingest','worker','admin'].map(scope=>({name:`TEAMS_DB_${scope.toUpperCase()}_TOKEN_HML`,value:credentials[scope]})),
    {name:'TEAMS_WAKE_TOKEN_HML',value:credentials.wake},{name:'TEAMS_ADMIN_TOKEN_HML',value:credentials.edgeAdmin},
    {name:'TEAMS_SYNTHETIC_LIVE_HML',value:'false'},
  ]);
  stage='GitHub wake secret';
  run('gh',['secret','set','TEAMS_WAKE_TOKEN_HML','--repo',repo],credentials.wake);
  stage='deploy teams-notifications only';
  const args=['functions','deploy','teams-notifications','--project-ref',project,'--use-api','--no-verify-jwt'];
  if(process.platform==='win32') run('cmd.exe',['/d','/s','/c',`supabase ${args.join(' ')}`]); else run('supabase',args);
  stage='effective JWT and deployment status';
  const deployed=await api('/functions/teams-notifications') as {verify_jwt:boolean;status:string};
  if(deployed.verify_jwt!==false || deployed.status!=='ACTIVE') throw new Error('Function JWT/status gate failed');
  const call = async (action:string,payload:Record<string,unknown>={})=>{
    const r=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${credentials.edgeAdmin}`,'Content-Type':'application/json'},body:JSON.stringify({action,payload}),signal:AbortSignal.timeout(40_000),redirect:'error'});
    if(!r.ok){await r.body?.cancel();throw new Error(`Edge HTTP ${r.status}`);} return r.json();
  };
  stage='runtime health and scoped RPCs';
  const health=await call('health');
  if(health.ready!==true || health.mode!=='disabled' || health.live_enabled!==false || (synthetic && !health.webhook_valid)) throw new Error('Runtime health gate failed');
  // Probe the exact GitHub invocation credential too, without claiming or sending.
  stage='wake credential readiness';
  const wake=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${credentials.wake}`,'Content-Type':'application/json'},body:JSON.stringify({action:'checkpoint'}),signal:AbortSignal.timeout(15_000),redirect:'error'});
  if(!wake.ok){await wake.body?.cancel();throw new Error('Wake credential gate failed');} await wake.body?.cancel();
  stage='explicit silent baseline';
  const checkpoint=await call('checkpoint');
  if(checkpoint.commit===null) await call('bootstrap',{commit,snapshot});
  else if(!recover) throw new Error('Unexpected existing baseline');
  evidence.baseline=checkpoint.commit ?? commit;
  if(recover){ evidence.recovery='Credentials repaired; baseline/events preserved; no tests or sends'; return; }
  const suffix=randomBytes(5).toString('hex');
  const cases=[
    {name:'elevation',kind:'level',body:{before:'normalidade',after:'emergencia'}},
    {name:'reduction',kind:'level',body:{before:'emergencia',after:'alerta'}},
    {name:'normalization',kind:'level',body:{before:'alerta',after:'normalidade'}},
    {name:'impact-open',kind:'impact_open',body:{}},
    {name:'impact-close',kind:'impact_close',body:{}},
  ];
    stage='remote mock'; await call('configure',{mode:'mock'});
    for(const scenario of cases){
      const payload={key:`test-mock-${suffix}-${scenario.name}`,kind:scenario.kind,body:{...scenario.body,occurred_at:new Date().toISOString()}};
      await call('synthetic',payload); await call('synthetic',payload);
      if((await call('drain')).status!=='mock_delivered') throw new Error('Mock delivery failed');
    }
    if((await call('drain')).status!=='idle') throw new Error('Deduplication failed');
    evidence.mock='5 scenarios + duplicate ingestion passed';
    if(synthetic){
      stage='five controlled synthetic sends';
      await api('/secrets',[{name:'TEAMS_SYNTHETIC_LIVE_HML',value:'true'}]);
      const liveHealth=await call('health');
      if(liveHealth.live_enabled!==true || !liveHealth.webhook_valid || liveHealth.mode!=='mock') throw new Error('Live runtime configuration not confirmed');
      // Base the deadline on database time, not a potentially skewed operator clock.
      const clock=await query('select clock_timestamp() as now') as {now:string}[];
      const serverTime=Date.parse(clock[0]?.now ?? '');
      if(!Number.isFinite(serverTime)) throw new Error('Server clock unavailable');
      await call('configure',{mode:'synthetic_live',live_until:new Date(serverTime+15*60_000).toISOString()});
      for(const scenario of cases){
        const payload={key:`test-live-${suffix}-${scenario.name}`,kind:scenario.kind,body:{...scenario.body,occurred_at:new Date().toISOString()}};
        await call('synthetic',payload); await call('synthetic',payload);
        const result=await call('drain');
        if(result.status!=='accepted') throw new Error('Delivery requires inspection; no automatic replay');
        evidence.external_messages=Number(evidence.external_messages)+1;
      }
      if((await call('drain')).status!=='idle') throw new Error('Unexpected pending delivery');
    }
  },async()=>{
    const cleanup=await disableTeams(query,api);
    evidence.cleanup=cleanup;
    evidence.disabled=cleanup.database_disabled && cleanup.secret_disable_acknowledged;
    try {evidence.report=await query("select jbs_notifications.execute('report') as result");} catch {evidence.report_unavailable=true;}
    if(!evidence.disabled) console.error('Desligamento incompleto: intervenção administrativa necessária. Não repita testes nem habilite reconciliação.');
  });
  stage='enable reconciliation only';
  if(evidence.disabled!==true) throw new Error('Disable status must be inspected');
  if(recover){console.log('Recuperação concluída com envio desabilitado; reconciliação não habilitada automaticamente.');return;}
  run('gh',['variable','set','TEAMS_HML_ENABLED','--repo',repo,'--body','true']);
  evidence.reconciliation_enabled=true;
  console.log('HML provisionado; envio desabilitado. Consulte a evidência sanitizada e confirme visualmente os cards antes de marcar como entregues.');
}
main().catch(()=>{evidence.failed_stage=stage;process.exitCode=1;console.error(`Interrompido na etapa: ${stage}. Sem retry automático; examine o estado antes de repetir.`);}).finally(()=>{
  mkdirSync('.codex_work',{recursive:true});
  const evidencePath=`.codex_work/teams-hml-provision-${new Date().toISOString().replaceAll(':','-')}-${randomBytes(3).toString('hex')}.json`;
  writeFileSync(evidencePath,JSON.stringify(evidence,null,2));console.log(`Evidência sanitizada: ${evidencePath}`);
});
