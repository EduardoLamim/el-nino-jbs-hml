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
