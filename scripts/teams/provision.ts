/** One-time, explicit HML provisioning. Run through the hidden-input PowerShell wrapper. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { projectSnapshot, trustedSnapshotCommit } from './reconcile';

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
const query = (sql: string, parameters: unknown[] = []) => api('/database/query', {query:sql,parameters});
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
  const state = await query("select to_regnamespace('jbs_notifications') is not null as installed") as {installed:boolean}[];
  if (state[0]?.installed) throw new Error('Already installed; inspect before recovery, do not rotate credentials blindly');
  const synthetic = process.argv.includes('--synthetic-tests');
  if (synthetic) {
    const secrets = await api('/secrets') as {name:string}[];
    if (!secrets.some(s=>s.name==='TEAMS_WORKFLOW_URL_HML')) throw new Error('Set webhook only in backend secrets first');
  }
  run('git',['fetch','origin','main']);
  const commit=run('git',['log','-1','--format=%H','origin/main','--','public/data/status.json']);
  const [author,subject]=run('git',['show','-s','--format=%ae%n%s',commit]).split('\n');
  if(!trustedSnapshotCommit(author!,subject!,run('git',['diff-tree','--no-commit-id','--name-only','-r',commit]).split('\n'))) throw new Error('Untrusted baseline');
  const snapshot=projectSnapshot(JSON.parse(run('git',['show',`${commit}:public/data/status.json`])));
  const credentials = Object.fromEntries(['ingest','worker','admin','wake','edgeAdmin'].map(k=>[k,randomBytes(48).toString('hex')]));
  stage='migration';
  const migration=readFileSync('supabase/migrations/202610130001_teams_notifications.sql','utf8');
  // This migration alone; never db push unrelated pending migrations.
  const quote=(s:string)=>"'"+s.replaceAll("'","''")+"'";
  await query(`begin; ${migration}\n insert into supabase_migrations.schema_migrations(version,name,statements) values ('202610130001','teams_notifications',array[${quote(migration)}]); commit;`);
  stage='dedicated credentials';
  for(const scope of ['ingest','worker','admin']) await query('insert into jbs_notifications.credentials(scope,token_sha256) values($1,$2)',[scope,createHash('sha256').update(credentials[scope]!).digest('hex')]);
  await api('/secrets',[
    ...['ingest','worker','admin'].map(scope=>({name:`TEAMS_DB_${scope.toUpperCase()}_TOKEN_HML`,value:credentials[scope]})),
    {name:'TEAMS_WAKE_TOKEN_HML',value:credentials.wake},{name:'TEAMS_ADMIN_TOKEN_HML',value:credentials.edgeAdmin},
    {name:'TEAMS_SYNTHETIC_LIVE_HML',value:'false'},
  ]);
  run('gh',['secret','set','TEAMS_WAKE_TOKEN_HML','--repo',repo],credentials.wake);
  stage='deploy teams-notifications only';
  const args=['functions','deploy','teams-notifications','--project-ref',project,'--use-api'];
  if(process.platform==='win32') run('cmd.exe',['/d','/s','/c',`supabase ${args.join(' ')}`]); else run('supabase',args);
  const call = async (action:string,payload:Record<string,unknown>={})=>{
    const r=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${credentials.edgeAdmin}`,'Content-Type':'application/json'},body:JSON.stringify({action,payload}),signal:AbortSignal.timeout(40_000),redirect:'error'});
    if(!r.ok){await r.body?.cancel();throw new Error(`Edge HTTP ${r.status}`);} return r.json();
  };
  stage='explicit silent baseline'; await call('bootstrap',{commit,snapshot}); evidence.baseline=commit;
  const suffix=randomBytes(5).toString('hex');
  const cases=[
    {name:'elevation',kind:'level',body:{before:'normalidade',after:'emergencia'}},
    {name:'reduction',kind:'level',body:{before:'emergencia',after:'alerta'}},
    {name:'normalization',kind:'level',body:{before:'alerta',after:'normalidade'}},
    {name:'impact-open',kind:'impact_open',body:{}},
    {name:'impact-close',kind:'impact_close',body:{}},
  ];
  try {
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
      await call('configure',{mode:'synthetic_live',live_until:new Date(Date.now()+15*60_000).toISOString()});
      for(const scenario of cases){
        const payload={key:`test-live-${suffix}-${scenario.name}`,kind:scenario.kind,body:{...scenario.body,occurred_at:new Date().toISOString()}};
        await call('synthetic',payload); await call('synthetic',payload);
        const result=await call('drain');
        if(result.status!=='accepted') throw new Error('Delivery requires inspection; no automatic replay');
        evidence.external_messages=Number(evidence.external_messages)+1;
      }
      if((await call('drain')).status!=='idle') throw new Error('Unexpected pending delivery');
    }
  } finally {
    // Independent cleanup requests; a failed one must not prevent the other.
    const cleanup=await Promise.allSettled([call('configure',{mode:'disabled'}),api('/secrets',[{name:'TEAMS_SYNTHETIC_LIVE_HML',value:'false'}])]);
    evidence.disabled=cleanup.every(r=>r.status==='fulfilled');
    evidence.report=await call('report');
  }
  stage='enable reconciliation only';
  if(evidence.disabled!==true) throw new Error('Disable status must be inspected');
  run('gh',['variable','set','TEAMS_HML_ENABLED','--repo',repo,'--body','true']);
  evidence.reconciliation_enabled=true;
  console.log('HML provisionado; envio desabilitado. Consulte a evidência sanitizada e confirme visualmente os cards antes de marcar como entregues.');
}
main().catch(()=>{evidence.failed_stage=stage;process.exitCode=1;console.error(`Interrompido na etapa: ${stage}. Sem retry automático; examine o estado antes de repetir.`);}).finally(()=>{
  mkdirSync('.codex_work',{recursive:true});writeFileSync('.codex_work/teams-hml-provision-result.json',JSON.stringify(evidence,null,2));
});
