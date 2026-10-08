import { z } from 'zod';
import { blumenauSchema } from './blumenau';

// Sem coerção: null é ausência de informação, nunca zero ou normalidade.
const instante = z.string().datetime({ offset: true });
const numero = z.number().finite();
const contagem = numero.int().nonnegative();
// null: a fonte não informou qualidade; sucesso HTTP não comprova atualidade.
const qualidade = z.enum(['atualizado', 'atrasado', 'indisponivel']).nullable();
const qualidadeFonte = z.record(z.object({
  estado: z.string(), medido_em: instante.nullable(),
}).strict());
const latitude = numero.min(-90).max(90).nullable();
const longitude = numero.min(-180).max(180).nullable();
const intervalo = numero.int().positive().nullable();
export const nivelSchema = z.enum(['normalidade', 'atencao', 'alerta', 'emergencia']);
export type NivelJbs = z.infer<typeof nivelSchema>;
export const severidade: Readonly<Record<NivelJbs, number>> = {
  normalidade: 0, atencao: 1, alerta: 2, emergencia: 3,
};
export const coresNivel: Readonly<Record<NivelJbs, string>> = {
  normalidade: 'verde', atencao: 'amarelo', alerta: 'laranja', emergencia: 'vermelho',
};
export const flagOficialSchema = z.enum(['Normalidade', 'Atenção', 'Alerta', 'Emergência']);
export const nivelPorFlag: Readonly<Record<z.infer<typeof flagOficialSchema>, NivelJbs>> = {
  Normalidade: 'normalidade', Atenção: 'atencao', Alerta: 'alerta', Emergência: 'emergencia',
};
export const codigoHidrologicoSchema = z.enum([
  'DC01', 'DC02', 'DC03', 'DC04', 'DC05', 'DC06', 'DC07', 'DC08', 'DC09', 'DC10', 'DC11',
]);
export const limitesSchema = z.object({
  atencao_m: numero.nullable(), alerta_m: numero.nullable(), emergencia_m: numero.nullable(),
}).strict();
export const estacaoHidrologicaSchema = z.object({
  codigo: codigoHidrologicoSchema, nome: z.string(), latitude, longitude,
  nivel_m: numero.nullable(),
  tendencia: z.enum(['subindo', 'estavel', 'descendo', 'desconhecida']),
  limites: limitesSchema, qualidade, medido_em: instante.nullable(),
  atualizacao_esperada_segundos: intervalo,
  serie_12h: z.array(z.object({
    medido_em: instante.nullable(), nivel_m: numero.nullable(), qualidade: qualidade.optional(),
  }).strict()),
  qualidade_fonte: qualidadeFonte.optional(),
  situacao_fonte: z.string().nullable().optional(),
}).strict();
export type EstacaoHidrologica = z.infer<typeof estacaoHidrologicaSchema>;
export const situacaoOficialSchema = z.object({
  flag: flagOficialSchema.nullable(), conteudo: z.string().nullable(),
  atualizado_em: instante.nullable(), qualidade,
}).strict();
export type SituacaoOficial = z.infer<typeof situacaoOficialSchema>;
const gatilhoSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('situacao_oficial'), origem: z.string(),
    severidade: nivelSchema, descricao: z.string(), atualizado_em: instante.nullable(),
    stale: z.boolean().optional(), motivo: z.string().nullable().optional() }).strict(),
  z.object({ tipo: z.literal('estacao_hidrologica'), origem: codigoHidrologicoSchema,
    severidade: nivelSchema, descricao: z.string(), atualizado_em: instante.nullable(),
    stale: z.boolean().optional(), motivo: z.string().nullable().optional(),
    nome: z.string().optional(), nivel_observado_m: numero.nullable().optional(),
    limite_responsavel_m: numero.nullable().optional(),
    tendencia: estacaoHidrologicaSchema.shape.tendencia.optional(),
    normalizacao: z.object({ leituras_abaixo: contagem.max(2), necessarias: z.literal(3) }).strict().optional(),
  }).strict(),
]);
export type Gatilho = z.infer<typeof gatilhoSchema>;
export const estacaoPluviometricaSchema = z.object({
  codigo: z.string(), nome: z.string(), latitude, longitude,
  chuva_10_min_mm: numero.nonnegative().nullable(), chuva_mm_h: numero.nonnegative().nullable(),
  chuva_1_h_mm: numero.nonnegative().nullable(), chuva_6_h_mm: numero.nonnegative().nullable(),
  chuva_12_h_mm: numero.nonnegative().nullable(), chuva_24_h_mm: numero.nonnegative().nullable(),
  chuva_48_h_mm: numero.nonnegative().nullable(), qualidade, medido_em: instante.nullable(),
  atualizacao_esperada_segundos: intervalo.optional(),
  qualidade_fonte: qualidadeFonte.optional(),
  serie_12h: z.array(z.object({
    medido_em: instante, chuva_mm: numero.nonnegative().nullable(), qualidade,
  }).strict()).optional(),
}).strict();
export type EstacaoPluviometrica = z.infer<typeof estacaoPluviometricaSchema>;
const medidasBarragem = {
  ocupacao_percentual: numero.nonnegative().nullable(), montante_m: numero.nullable(),
  ultima_variacao_m: numero.nullable(), comportas_abertas: contagem.nullable(),
  comportas_fechadas: contagem.nullable(), extravasor_m: numero.nullable(),
};
export const barragemSchema = z.object({
  nome: z.string(), fonte: z.string(), ...medidasBarragem,
  qualidade, medido_em: instante.nullable(), atualizacao_esperada_segundos: intervalo,
  serie: z.array(z.object({ ...medidasBarragem, medido_em: instante, qualidade }).strict()),
}).strict();
export type Barragem = z.infer<typeof barragemSchema>;
export const previsaoSchema = z.object({
  fonte: z.string(), modelo: z.string().nullable(),
  abrangencia: z.enum(['municipal', 'regional']).nullable(),
  municipio: z.string().nullable(), codigo_municipio: z.string().nullable(),
  uf: z.string().length(2).nullable(), regiao: z.string().nullable(),
  atualizado_em: z.union([instante, z.string().date()]).nullable(), coletado_em: instante.nullable(),
  disponibilidade: z.enum(['disponivel', 'indisponivel']),
  dias: z.array(z.object({
    data: z.string().date(), periodo: z.string().nullable(), condicao: z.string().nullable(), descricao: z.string().nullable(),
    temperatura_min_c: numero.nullable(), temperatura_max_c: numero.nullable(),
    probabilidade_precipitacao_percentual: numero.min(0).max(100).nullable(), precipitacao_mm: numero.nonnegative().nullable(),
    vento: z.object({ direcao: z.string().nullable(), velocidade_media_kmh: numero.nonnegative().nullable(),
      rajada_kmh: numero.nonnegative().nullable() }).strict().nullable(),
    umidade: z.object({ relativa_percentual: numero.min(0).max(100).nullable(),
      minima_percentual: numero.min(0).max(100).nullable(), maxima_percentual: numero.min(0).max(100).nullable() }).strict().nullable(),
    fenomenos: z.array(z.object({ codigo: z.union([z.string(), numero]).nullable(), descricao: z.string() }).strict()).optional(),
  }).strict()),
}).strict().superRefine((p, ctx) => {
  const erro = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  if (p.abrangencia === 'municipal' && (!p.municipio || p.regiao !== null)) erro('Previsão municipal exige município e não pode representar região.');
  if (p.abrangencia === 'regional' && (!p.regiao || p.municipio !== null || p.codigo_municipio !== null)) erro('Previsão regional exige região e não pode ser rotulada como municipal.');
  if (p.disponibilidade === 'disponivel' && (p.abrangencia === null || p.dias.length === 0)) erro('Previsão disponível exige abrangência e períodos.');
  if (p.disponibilidade === 'indisponivel' && p.dias.length !== 0) erro('Previsão indisponível não contém períodos presumidos.');
});
export type Previsao = z.infer<typeof previsaoSchema>;
export const estadoRioSchema = z.object({
  codigo: codigoHidrologicoSchema, nome: z.string(), nivel: nivelSchema.nullable(),
  desde: instante.nullable(), stale: z.boolean(), motivo: z.string().nullable(),
  ultima_valida: z.object({ nivel_m: numero, medido_em: instante, limites: limitesSchema,
    tendencia: estacaoHidrologicaSchema.shape.tendencia }).strict().nullable(),
  ultima_amostra_em: instante.nullable(),
  normalizacao: z.object({ leituras_abaixo: contagem.max(2), necessarias: z.literal(3),
    limite_m: numero.nullable(), ultima_leitura_em: instante.nullable() }).strict(),
}).strict();
export type EstadoRio = z.infer<typeof estadoRioSchema>;
export const estadoOficialSchema = z.object({
  nivel: nivelSchema.nullable(), desde: instante.nullable(), stale: z.boolean(), motivo: z.string().nullable(),
  ultima_valida: situacaoOficialSchema.nullable(),
}).strict();
export type EstadoOficial = z.infer<typeof estadoOficialSchema>;
export const estadoMotorSchema = z.object({
  versao: z.literal(1), avaliado_em: instante,
  situacao_oficial: estadoOficialSchema, rios: z.record(codigoHidrologicoSchema, estadoRioSchema),
}).strict().superRefine((m, ctx) => {
  const erro = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  const validarData = (data: string | null) => {
    if (data !== null && Date.parse(data) > Date.parse(m.avaliado_em)) erro('Memória contém timestamp futuro.');
  };
  const oficial = m.situacao_oficial;
  if ((oficial.nivel === null) !== (oficial.ultima_valida === null)
      || (oficial.nivel !== null && (!oficial.ultima_valida?.flag
        || nivelPorFlag[oficial.ultima_valida.flag] !== oficial.nivel
        || oficial.ultima_valida.atualizado_em === null
        || oficial.ultima_valida.qualidade === 'indisponivel' || oficial.ultima_valida.qualidade === 'atrasado')))
    erro('Memória oficial inconsistente.');
  validarData(oficial.desde); validarData(oficial.ultima_valida?.atualizado_em ?? null);
  for (const codigo of codigoHidrologicoSchema.options) {
    const r = m.rios[codigo];
    if (!r || r.codigo !== codigo) { erro('Memória exige DC01–DC11 com códigos consistentes.'); continue; }
    validarData(r.desde); validarData(r.ultima_amostra_em); validarData(r.ultima_valida?.medido_em ?? null);
    validarData(r.normalizacao.ultima_leitura_em);
    if ((r.nivel === null) !== (r.ultima_valida === null)) erro('Estado hidrológico sem última condição válida.');
    const l = r.ultima_valida?.limites;
    if (l && (l.atencao_m === null || l.alerta_m === null || l.emergencia_m === null
        || !(l.atencao_m < l.alerta_m && l.alerta_m < l.emergencia_m))) erro('Limites inconsistentes na memória.');
    const limite = r.nivel === 'emergencia' ? l?.emergencia_m : r.nivel === 'alerta' ? l?.alerta_m : r.nivel === 'atencao' ? l?.atencao_m : null;
    if (r.normalizacao.limite_m !== (limite ?? null)) erro('Limite de normalização inconsistente.');
    if (r.ultima_valida && r.ultima_amostra_em !== r.ultima_valida.medido_em) erro('Última amostra inconsistente.');
    if ((r.normalizacao.leituras_abaixo === 0) !== (r.normalizacao.ultima_leitura_em === null)
        || (r.normalizacao.leituras_abaixo > 0 && (r.stale || limite === null
          || r.normalizacao.ultima_leitura_em !== r.ultima_amostra_em))) erro('Contagem de normalização inconsistente.');
  }
});
export type EstadoMotor = z.infer<typeof estadoMotorSchema>;
export const statusSchema = z.object({
  versao: z.literal(1), atualizado_em: instante.nullable(),
  nivel_jbs: z.object({ nivel: nivelSchema.nullable(), desde: instante.nullable(),
    gatilhos: z.array(gatilhoSchema) }).strict(),
  motor: estadoMotorSchema.optional(),
  situacao_oficial: situacaoOficialSchema.nullable(),
  alertas_oficiais: z.array(z.object({
    id: z.string(), fonte: z.string(), conteudo: z.string(), atualizado_em: instante.nullable(),
  }).strict()).nullable(),
  rios: z.record(codigoHidrologicoSchema, estacaoHidrologicaSchema).superRefine((rios, ctx) => {
    for (const [codigo, estacao] of Object.entries(rios)) {
      if (estacao && codigo !== estacao.codigo) ctx.addIssue({
        code: z.ZodIssueCode.custom, path: [codigo, 'codigo'], message: 'Código diferente da chave da estação.',
      });
    }
  }),
  chuvas: z.record(estacaoPluviometricaSchema), barragens: z.record(barragemSchema),
  previsao: previsaoSchema,
  blumenau: blumenauSchema.optional(),
  qualidade_monitoramento: z.object({
    estado: z.enum(['atualizado', 'parcialmente_degradado', 'degradado']),
    problemas: z.array(z.string()),
  }).strict(),
  fontes: z.record(z.object({
    nome: z.string(), url: z.string().url().nullable(), qualidade,
    atualizado_em: z.union([instante, z.string().date()]).nullable(), atualizacao_esperada_segundos: intervalo,
    coletado_em: instante.optional(),
    resultado: z.enum(['sucesso', 'falha']).optional(),
    motivo: z.string().nullable().optional(),
    avisos: z.array(z.string()).optional(),
    payload_nao_normalizado_json: z.string().optional(),
    requisicoes: z.array(z.object({
      url: z.string().url(), coletado_em: instante, http_status: z.number().int().nullable(),
      erro: z.string().nullable(), resposta_erro: z.string().nullable(),
    }).strict()).optional(),
  }).strict()),
}).strict();
export type Status = z.infer<typeof statusSchema>;

export interface EntradaMotorAutomatico {
  situacao_oficial: SituacaoOficial | null;
  rios: Partial<Record<z.infer<typeof codigoHidrologicoSchema>, EstacaoHidrologica>>;
  avaliado_em: string;
  memoria?: EstadoMotor;
}
export type TipoImpactoJbs =
  | 'alagamento_terminal'
  | 'acesso_operacional_terminal_comprometido'
  | 'infraestrutura_critica_terminal_afetada'
  | 'area_operacional_afetada'
  | 'outro_impacto_fisico_terminal';
export interface ImpactoJbs {
  id: string;
  tipo: TipoImpactoJbs;
  responsavel_acionamento: string;
  observacao_acionamento: string | null;
  acionado_em: string;
  responsavel_encerramento: string | null;
  observacao_encerramento: string | null;
  encerrado_em: string | null;
}

export const parseStatus = (dados: unknown): Status => statusSchema.parse(dados);
export { territorioSchema, parseTerritorio, type Territorio } from './territory';

