import { z } from 'zod';
export const tipoImpactoSchema = z.enum(['alagamento_terminal', 'acesso_operacional_terminal_comprometido',
  'infraestrutura_critica_terminal_afetada', 'area_operacional_afetada', 'outro_impacto_fisico_terminal']);
export type TipoImpacto = z.infer<typeof tipoImpactoSchema>;
export const labelsImpacto: Record<TipoImpacto, string> = {
  alagamento_terminal: 'Alagamento no Terminal',
  acesso_operacional_terminal_comprometido: 'Acesso operacional ao Terminal comprometido',
  infraestrutura_critica_terminal_afetada: 'Infraestrutura crítica do Terminal afetada',
  area_operacional_afetada: 'Área operacional afetada', outro_impacto_fisico_terminal: 'Outro impacto físico no Terminal',
};
const data = z.string().datetime({ offset: true });
const campos = { id: z.literal(1), revisao: z.number().int().nonnegative(), atualizado_em: data };
export const impactoPublicoSchema = z.discriminatedUnion('ativo', [
  z.object({ ...campos, ativo: z.literal(true), impacto_id: z.string().uuid(), tipo: tipoImpactoSchema, acionado_em: data }).strict(),
  z.object({ ...campos, ativo: z.literal(false), impacto_id: z.null(), tipo: z.null(), acionado_em: z.null() }).strict(),
]);
export type ImpactoPublico = z.infer<typeof impactoPublicoSchema>;
export const responsavelSchema = z.string().trim().min(1).max(120);
export const observacaoSchema = z.string().trim().max(2000);
export const comandoImpactoSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ativar'), pin: z.string().min(1).max(128), tipo: tipoImpactoSchema,
    responsavel: responsavelSchema, observacao: observacaoSchema.optional() }).strict(),
  z.object({ action: z.literal('encerrar'), pin: z.string().min(1).max(128), impacto_id: z.string().uuid(),
    responsavel: responsavelSchema, observacao: observacaoSchema.optional() }).strict(),
]);
export type ComandoImpacto = z.infer<typeof comandoImpactoSchema>;
// Histórico restrito; não é usado por SELECT público nem pelo cache do navegador.
export const registroImpactoSchema = z.object({
  id: z.string().uuid(), tipo: tipoImpactoSchema, responsavel_acionamento: responsavelSchema,
  observacao_acionamento: observacaoSchema.nullable(), acionado_em: data, created_at: data,
  responsavel_encerramento: responsavelSchema.nullable(), observacao_encerramento: observacaoSchema.nullable(), encerrado_em: data.nullable(),
}).strict().refine(r => r.encerrado_em === null
  ? r.responsavel_encerramento === null && r.observacao_encerramento === null
  : r.responsavel_encerramento !== null && Date.parse(r.encerrado_em) >= Date.parse(r.acionado_em), 'Encerramento inconsistente.');
export const cacheImpactoSchema = z.object({ versao: z.literal(1), confirmado_em: data, dado: impactoPublicoSchema }).strict();
export interface EstadoImpacto {
  dado: ImpactoPublico | null;
  qualidade: 'confirmado' | 'degradado' | 'desconhecido';
  confirmado_em: string | null;
  realtime: 'conectado' | 'reconectando';
}
