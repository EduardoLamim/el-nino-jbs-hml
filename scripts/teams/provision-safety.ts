export type Query = (sql:string, parameters?:unknown[]) => Promise<unknown>;
export type Api = (path:string, body?:unknown) => Promise<unknown>;
export function saveCredentialHashes(query:Query, hashes:{scope:string;token_sha256:string}[], reason:string) {
  return query("with changed as (insert into jbs_notifications.credentials(scope,token_sha256) select scope,token_sha256 from jsonb_to_recordset($1::jsonb) as c(scope text,token_sha256 text) on conflict(scope) do update set token_sha256=excluded.token_sha256 returning scope) insert into jbs_notifications.audit(action,reason) select 'provision_credentials',$2 from changed having count(*)=3",[JSON.stringify(hashes),reason]);
}
export function migrationBatch(sql:string) {
  const literal="'"+sql.replaceAll("'","''")+"'";
  return `begin; set local lock_timeout='2s'; set local statement_timeout='25s';
    select pg_advisory_xact_lock(20261013,1);
    ${sql}
    insert into supabase_migrations.schema_migrations(version,name,statements)
    values ('202610130001','teams_notifications',array[${literal}]); commit;`;
}
export function checkRecovery(state:{installed:boolean; exact:boolean; busy:boolean; live:boolean}, recover:boolean, synthetic:boolean) {
  if(recover && synthetic) throw new Error('Recovery never sends synthetic messages');
  if(state.installed && !recover) throw new Error('Inspect partial setup before explicit recovery');
  if(recover && (!state.installed || !state.exact || state.busy || state.live)) throw new Error('Unsafe recovery; disable and inspect first');
}
/** Independent administrative shutdown, usable even when the Edge/JWT/credentials are broken. */
export async function disableTeams(query:Query, api:Api) {
  const attempts=await Promise.allSettled([
    (async()=>{
      const state=await query("select to_regnamespace('jbs_notifications') is not null as installed") as {installed:boolean}[];
      if(!state[0] || typeof state[0].installed!=='boolean') throw new Error('Unknown database state');
      if(!state[0].installed) return true;
      await query("select jbs_notifications.execute('configure','{\"mode\":\"disabled\"}'::jsonb)");
      const check=await query('select mode,live_until from jbs_notifications.settings where id=true') as {mode:string;live_until:string|null}[];
      if(check[0]?.mode!=='disabled' || check[0]?.live_until!==null) throw new Error('Disable not confirmed');
      return true;
    })(),
    api('/secrets',[{name:'TEAMS_SYNTHETIC_LIVE_HML',value:'false'}]),
  ]);
  return {database_disabled:attempts[0]!.status==='fulfilled', secret_disable_acknowledged:attempts[1]!.status==='fulfilled'};
}
export async function withShutdown<T>(work:()=>Promise<T>, cleanup:()=>Promise<void>) {
  try {return await work();} finally {await cleanup();}
}
