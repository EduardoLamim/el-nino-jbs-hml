import { expect, it } from 'vitest';
import { existsSync,readFileSync } from 'node:fs';
import { validatePlanActions,areaPlans } from '../src/content/area-plans';
import { adaptiveCard } from '../supabase/functions/teams-notifications/handler';
it('mantém planos completos e aceita categoria legada sem expor a marca',()=>{
 const action={...areaPlans.TI!.acoes[0]!, 'Nível':'Impacto JBS'};
 const [normalized]=validatePlanActions([action]);
 expect(normalized!['Nível']).toBe('Impacto Operacional');
 expect(normalized!['Como faz']).toBe(action['Como faz']);
 expect(JSON.stringify(areaPlans)).not.toMatch(/\bJBS\b/);
});
it('remove logo e nome institucional dos recursos ativos de identificação',()=>{
 expect(existsSync('src/assets/jbs-terminais-branco.png')).toBe(false);
 expect(readFileSync('src/App.tsx','utf8')).not.toContain('brand-logo');
 expect(readFileSync('index.html','utf8')).toContain('<title>Monitoramento El Niño</title>');
});
it('neutraliza somente texto dos cartões; mantém tipo de evento e dados originais',()=>{
 const body={before:'atencao',after:'alerta',occurred_at:'2026-11-06T17:00:00Z',reasons:['Nível de Alerta JBS: Alerta. Impacto JBS independente.']};
 const before=JSON.stringify(body);
 for(const kind of ['level','impact_open','impact_close'] as const){
  const event={event_key:'unchanged',kind,is_test:false,body};
  const card=adaptiveCard(event);
  const text=JSON.stringify(card).replaceAll('el-nino-jbs-hml','technical-panel-url');
  expect(text).not.toMatch(/\bJBS\b/i);
  expect(JSON.stringify(body)).toBe(before);
  expect(event.event_key).toBe('unchanged');
 }
});