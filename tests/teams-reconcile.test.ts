import { describe,expect,it,vi } from 'vitest';
import { reconcile, trustedSnapshotCommit } from '../scripts/teams/reconcile';
describe('Teams — reconciliação independente', () => {
  it('processa todos os snapshots persistidos em sequência',async()=>{
    const a='a'.repeat(40), b='b'.repeat(40), c='c'.repeat(40);
    const call=vi.fn(async(action:string)=>action==='checkpoint'?{commit:a}:action==='impacts'?{reconciled:0}:action==='drain'?{status:'idle'}:{});
    const result=await reconcile({call,commits:()=>[b,c],snapshot:async()=>({collected_at:'2026-10-13T10:00:00Z',level:'atencao',since:null,reasons:[]})});
    expect(result).toEqual({snapshots:'ok',impacts:'ok',worker:'ok'});
    expect(call).toHaveBeenCalledWith('snapshot',expect.objectContaining({commit:c,previous_commit:b,pages_confirmed:false}));
  });
  it('lacuna bloqueia somente stream Git; sem baseline não inicializa automaticamente',async()=>{
    for(const cursor of [null,'a'.repeat(40)]) {
      const call=vi.fn(async(action:string)=>action==='checkpoint'?{commit:cursor}:action==='impacts'?{reconciled:0}:{status:'idle'});
      const result=await reconcile({call,commits:()=>{throw new Error('rewritten');},snapshot:vi.fn()});
      expect(result).toEqual({snapshots:'blocked',impacts:'ok',worker:'ok'}); expect(call).not.toHaveBeenCalledWith('bootstrap');
    }
  });
  it('identidade do bot sozinha não aceita alteração manual ou outros arquivos',()=>{
    const bot='41898282+github-actions[bot]@users.noreply.github.com';
    expect(trustedSnapshotCommit(bot,'Atualizar snapshot operacional validado',['public/data/status.json'])).toBe(true);
    expect(trustedSnapshotCommit(bot,'manual',['public/data/status.json'])).toBe(false);
    expect(trustedSnapshotCommit(bot,'Atualizar snapshot operacional validado',['public/data/status.json','src/motor.ts'])).toBe(false);
  });
});

it('retoma lote a partir do checkpoint confirmado, sem saltar snapshots nem criar baseline',async()=>{
 const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40);
 let cursor=a;
 const call=vi.fn(async(action:string,payload?:Record<string,unknown>)=>{
   if(action==='checkpoint')return {commit:cursor};
   if(action==='snapshot'){expect(payload?.previous_commit).toBe(cursor);cursor=payload!.commit as string;return {};}
   return action==='impacts'?{reconciled:0}:{status:'idle'};
 });
 const deps={call,commits:(sha:string)=>sha===a?[b,c]:[c],snapshot:async()=>({collected_at:'2026-10-26T16:08:30Z',level:'atencao',since:null,reasons:[]}),maxSnapshots:1};
 expect((await reconcile(deps)).snapshots).toBe('partial');expect(cursor).toBe(b);
 expect((await reconcile(deps)).snapshots).toBe('ok');expect(cursor).toBe(c);
 expect(call.mock.calls.filter(([action])=>action==='snapshot')).toHaveLength(2);
 expect(call.mock.calls.every(([action])=>['checkpoint','snapshot','impacts','drain'].includes(action))).toBe(true);
});
it('falha de prova nao avanca checkpoint nem persiste o snapshot',async()=>{
 const call=vi.fn(async(action:string)=>action==='checkpoint'?{commit:'a'.repeat(40)}:action==='impacts'?{reconciled:0}:{status:'idle'});
 const diagnostic=vi.fn();
 const result=await reconcile({call,commits:()=>['b'.repeat(40)],snapshot:async()=>{throw new Error('private');},diagnostic});
 expect(result.snapshots).toBe('blocked');expect(call.mock.calls.some(([action])=>action==='snapshot')).toBe(false);
 expect(diagnostic).toHaveBeenCalledWith('snapshot_or_checkpoint_rejected');
});
