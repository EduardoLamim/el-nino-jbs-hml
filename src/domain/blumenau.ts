import { z } from 'zod';
export const blumenauUrl = 'https://defesacivil.blumenau.sc.gov.br/d/nivel-do-rio';
export const blumenauSchema = z.object({
  nivel_m: z.number().finite().nullable(), medido_em: z.string().datetime({ offset: true }).nullable(),
  coletado_em: z.string().datetime({ offset: true }),
  classificacao_original: z.string().nullable(),
  nivel: z.enum(['normalidade', 'atencao', 'alerta', 'emergencia']).nullable(),
  tendencia: z.enum(['subindo', 'descendo', 'estavel']).nullable(),
  qualidade: z.enum(['atualizado', 'atrasado', 'indisponivel']),
  fonte: z.literal(blumenauUrl), motivo: z.string().nullable(),
}).strict().superRefine((value, ctx) => {
  const missing = value.nivel_m === null || value.medido_em === null || value.nivel === null;
  if (value.qualidade !== 'indisponivel' && (missing || value.nivel !== nivelBlumenau(value.nivel_m!))) ctx.addIssue({ code: 'custom', message: 'Leitura/classificação informativa inconsistente.' });
  if (value.qualidade === 'indisponivel' && (value.nivel_m !== null || value.nivel !== null || value.medido_em !== null)) ctx.addIssue({ code: 'custom', message: 'Indisponibilidade não pode representar leitura atual.' });
});
export type Blumenau = z.infer<typeof blumenauSchema>;
export function nivelBlumenau(value: number) {
  return value >= 8 ? 'emergencia' : value >= 6 ? 'alerta' : value >= 3 ? 'atencao' : 'normalidade';
}
