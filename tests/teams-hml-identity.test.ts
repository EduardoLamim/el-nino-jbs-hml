import { expect,it } from 'vitest';
import { requireHmlRepository,HML_REPOSITORIES } from '../scripts/automation/hml-repository';
it.each(HML_REPOSITORIES)('exige nome permitido e ID HML: %s',name=>{
 expect(requireHmlRepository({GITHUB_REPOSITORY:name,GITHUB_REPOSITORY_ID:'1401997354'})).toBe(name);
 for(const id of [undefined,'1421144571'])expect(()=>requireHmlRepository({GITHUB_REPOSITORY:name,GITHUB_REPOSITORY_ID:id})).toThrow();
});
it('rejeita repositório desconhecido mesmo com ID HML',()=>{
 expect(()=>requireHmlRepository({GITHUB_REPOSITORY:'EduardoLamim/el-nino-jbs',GITHUB_REPOSITORY_ID:'1401997354'})).toThrow();
});
