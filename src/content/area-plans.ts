import actions from './plans/ti.json';
import { z } from 'zod';

export const planLevels = ['Emergência', 'Impacto JBS'] as const;
export type PlanLevel = typeof planLevels[number];
export interface AreaAction {
  'Nível': string; 'Ordem': string; 'Quem faz': string; 'Quem faz - Secundário': string;
  'Quando faz': string; 'Onde faz': string; 'Como faz': string;
}
export interface AreaPlan { area: string; responsavel: string; versao: number; atualizado: string; acoes: AreaAction[] }
export const areas = ['Operações', 'Comercial', 'QSSMS', 'Atendimento', 'Documentação', 'TI', 'RH', 'Financeiro', 'Faturamento', 'Suprimentos', 'Manutenção', 'Almoxarifado'] as const;
export const areaPlans: Partial<Record<typeof areas[number], AreaPlan>> = {
  TI: { area: 'TI', responsavel: 'Eduardo da Silva Lamim', versao: 1, atualizado: '08/10/2026', acoes: actions },
};
const actionSchema = z.object({ 'Nível': z.enum(planLevels), Ordem: z.string().regex(/^[1-9]\d*$/), 'Quem faz': z.string(), 'Quem faz - Secundário': z.string(), 'Quando faz': z.string(), 'Onde faz': z.string(), 'Como faz': z.string() }).strict();
export function validatePlanActions(value: unknown) {
  const result = z.array(actionSchema).min(1).parse(value);
  const orders = new Set<string>();
  for (const a of result) { const key = `${a['Nível']}/${Number(a.Ordem)}`; if (orders.has(key)) throw new Error('Ordem duplicada no nível.'); orders.add(key); }
  return result;
}
for (const plan of Object.values(areaPlans)) validatePlanActions(plan.acoes);
export const areaSlug = (area: string) => area.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
export const findAreaPlan = (slug: string) => Object.values(areaPlans).find(plan => areaSlug(plan.area) === slug);
