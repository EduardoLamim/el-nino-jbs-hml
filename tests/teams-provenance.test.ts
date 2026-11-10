import { expect, it, vi } from 'vitest';
import { createProvenanceVerifier } from '../scripts/teams/snapshot-provenance';
const at=Date.parse('2026-11-01T08:03:09Z');
const run=(id=1)=>({id,event:'workflow_dispatch',head_branch:'main',run_started_at:'2026-11-01T09:02:02Z',head_repository:{id:1401997354,full_name:'EduardoLamim/el-nino-jbs-hml'}});
const job={name:'prepare',steps:[{name:'Persistir somente o snapshot validado para o próximo ciclo',conclusion:'success',started_at:'2026-11-01T08:03:09Z',completed_at:'2026-11-01T08:03:11Z'}]};
it('aceita divergência legítima de quase uma hora sem afrouxar a prova da persistência',async()=>{
 const api=vi.fn(async(p:string)=>p.includes('/jobs?')?{jobs:[job]}:{workflow_runs:[run()]});
 const verify=createProvenanceVerifier(api); await verify(at); await verify(at); expect(api).toHaveBeenCalledTimes(2);
});
it('encontra execução e etapa depois da primeira página de 100 resultados',async()=>{
 const api=vi.fn(async(p:string)=>p.includes('/jobs?')?{jobs:p.endsWith('page=1')?Array.from({length:100},()=>({name:'other'})):[job]}:{workflow_runs:p.endsWith('page=1')?Array.from({length:100},(_,i)=>({...run(i+2),head_branch:'other'})):[run()]});
 await createProvenanceVerifier(api)(at); expect(api).toHaveBeenCalledTimes(4);
});
it.each(['repository','branch','event','step','conclusion','time'])('recusa proveniência inválida: %s',async kind=>{
 const r=run(), j=structuredClone(job);
 if(kind==='repository')r.head_repository.full_name='EduardoLamim/el-nino-jbs';
 if(kind==='branch')r.head_branch='other'; if(kind==='event')r.event='push';
 if(kind==='step')j.steps[0]!.name='Build'; if(kind==='conclusion')j.steps[0]!.conclusion='failure';
 if(kind==='time')j.steps[0]!.started_at='2026-11-01T08:03:10Z';
 const api=async(p:string)=>p.includes('/jobs?')?{jobs:[j]}:{workflow_runs:[r]};
 await expect(createProvenanceVerifier(api)(at)).rejects.toThrow(kind==='time'?'persistence_time_mismatch':'provenance_missing');
});
it('sanitiza falha API e distingue limite de paginação',async()=>{
 await expect(createProvenanceVerifier(async()=>{throw new Error('private-body');})(at)).rejects.toThrow('github_api_failure');
 await expect(createProvenanceVerifier(async()=>({workflow_runs:Array.from({length:100},()=>run())}))(at)).rejects.toThrow('github_pagination_limit');
});
it.each(['EduardoLamim/el-nino-jbs-hml','EduardoLamim/monitoramento-el-nino-hml'])('valida ccace410 com ID HML e nome compativel: %s',async name=>{
 const r={...run(),id:40353525135,run_started_at:'2026-10-26T15:52:02Z',head_repository:{id:1401997354,full_name:name}};
 const j={name:'prepare',steps:[{name:job.steps[0]!.name,conclusion:'success',started_at:'2026-10-26T16:08:29Z',completed_at:'2026-10-26T16:08:32Z'}]};
 await expect(createProvenanceVerifier(async p=>p.includes('/jobs?')?{jobs:[j]}:{workflow_runs:[r]})(Date.parse('2026-10-26T16:08:30Z'))).resolves.toBeUndefined();
});
it.each([1421144571,0,undefined])('rejeita nome HML sem ID imutavel correto: %s',async id=>{
 const r={...run(),head_repository:{full_name:'EduardoLamim/el-nino-jbs-hml',id}};
 await expect(createProvenanceVerifier(async p=>p.includes('/jobs?')?{jobs:[job]}:{workflow_runs:[r]})(at)).rejects.toThrow('provenance_missing');
});
