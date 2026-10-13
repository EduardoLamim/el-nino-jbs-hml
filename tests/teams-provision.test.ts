import { describe,it,expect,vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { checkRecovery,disableTeams,migrationBatch,saveCredentialHashes,withShutdown } from '../scripts/teams/provision-safety';

describe('Provisionamento Teams — falhas parciais sem chamadas externas',()=>{
  const stages=['migration','credentials','secrets','github-secret','deploy','jwt-gate','health','baseline','mock','live'];
  it.each(stages)('falha em %s tenta ambas as barreiras de desligamento',async failing=>{
    const api=vi.fn().mockResolvedValue({});
    const query=vi.fn(async(sql:string)=>sql.includes('to_regnamespace')?[{installed:true}]:sql.startsWith('select mode')?[{mode:'disabled',live_until:null}]:[]);
    let shutdown:unknown;
    await expect(withShutdown(async()=>{
      for(const stage of stages) if(stage===failing) throw new Error('simulated interruption');
    },async()=>{shutdown=await disableTeams(query,api);})).rejects.toThrow('simulated interruption');
    expect(shutdown).toEqual({database_disabled:true,secret_disable_acknowledged:true});
    expect(api).toHaveBeenCalledWith('/secrets',[{name:'TEAMS_SYNTHETIC_LIVE_HML',value:'false'}]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("execute('configure'"));
  });
  it('falha da Management API no banco não impede tentativa do secret; nunca afirma desligamento total',async()=>{
    const api=vi.fn().mockResolvedValue({});
    expect(await disableTeams(vi.fn().mockRejectedValue(new Error('offline')),api)).toEqual({database_disabled:false,secret_disable_acknowledged:true});
    expect(api).toHaveBeenCalledOnce();
  });
  it('resposta perdida do secret não invalida evidência de desligamento no banco',async()=>{
    const query=vi.fn(async(sql:string)=>sql.includes('to_regnamespace')?[{installed:true}]:sql.startsWith('select mode')?[{mode:'disabled',live_until:null}]:[]);
    expect(await disableTeams(query,vi.fn().mockRejectedValue(new Error('timeout')))).toEqual({database_disabled:true,secret_disable_acknowledged:false});
  });
  it('schema ausente após rollback e confirmação divergente são distinguidos',async()=>{
    expect((await disableTeams(vi.fn().mockResolvedValue([{installed:false}]),vi.fn())).database_disabled).toBe(true);
    const query=vi.fn(async(sql:string)=>sql.includes('to_regnamespace')?[{installed:true}]:[{mode:'synthetic_live',live_until:'future'}]);
    expect((await disableTeams(query,vi.fn())).database_disabled).toBe(false);
  });
  it('recuperação exige opt-in, migration idêntica, ausência de lease/envio e nunca testes reais',()=>{
    const state={installed:true,exact:true,busy:false,live:false};
    expect(()=>checkRecovery(state,false,false)).toThrow();
    expect(()=>checkRecovery(state,true,true)).toThrow();
    for(const change of [{installed:false},{exact:false},{busy:true},{live:true}]) expect(()=>checkRecovery({...state,...change},true,false)).toThrow();
    expect(()=>checkRecovery(state,true,false)).not.toThrow();
    expect(()=>checkRecovery({...state,installed:false},false,true)).not.toThrow();
  });
  it('DDL e histórico são atômicos: falha no registro desfaz schema inteiro; segunda aplicação é recusada',async()=>{
    const db=new PGlite();
    try {
      await db.exec('create role anon; create role authenticated;');
      await db.exec(readFileSync('supabase/migrations/202610020001_impactos_jbs.sql','utf8'));
      await db.exec("create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key, name text, statements text[], constraint fail_registration check(version<>'202610130001'));");
      const sql=migrationBatch(readFileSync('supabase/migrations/202610130001_teams_notifications.sql','utf8'));
      await expect(db.exec(sql)).rejects.toThrow(); await db.exec('rollback');
      expect((await db.query("select to_regnamespace('jbs_notifications') as schema")).rows).toEqual([{schema:null}]);
      await db.exec('alter table supabase_migrations.schema_migrations drop constraint fail_registration');
      await db.exec(sql);
      expect((await db.query('select version from supabase_migrations.schema_migrations')).rows).toEqual([{version:'202610130001'}]);
      await expect(db.exec(sql)).rejects.toThrow(); await db.exec('rollback');
      expect((await db.query('select * from jbs_private.impactos_jbs')).rows).toHaveLength(0);
      const query=(sql:string,params?:unknown[])=>db.query(sql,params);
      const hashes=['ingest','worker','admin'].map(scope=>({scope,token_sha256:'0'.repeat(64)}));
      await expect(saveCredentialHashes(query,[hashes[0]!,{scope:'invalid',token_sha256:'0'.repeat(64)}],'Test partial failure')).rejects.toThrow();
      expect((await db.query('select * from jbs_notifications.credentials')).rows).toHaveLength(0);
      await saveCredentialHashes(query,hashes,'Test atomic provisioning');
      expect((await db.query('select * from jbs_notifications.credentials')).rows).toHaveLength(3);
      expect((await db.query("select * from jbs_notifications.audit where action='provision_credentials'")).rows).toHaveLength(1);
    } finally {await db.close();}
  },30000);
});
