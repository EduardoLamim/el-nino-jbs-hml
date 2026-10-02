import { z } from 'zod';

// Condição atual ≠ vulnerabilidade territorial; histórico ≠ condição atual.
// Cenário HAND ≠ previsão atual; residentes expostos ≠ colaboradores afetados.
export const semanticaTerritorial = 'contexto_estatico_sem_condicao_atual' as const;
const texto = z.string().min(1);
const contagem = z.number().int().nonnegative();
const instante = z.string().datetime({ offset: true });
const zona = z.number().int().min(1).max(10).nullable();
const fonteSchema = z.object({
  id: texto, nome: texto, tipo: z.enum(['territorial', 'historico', 'modelagem', 'administrativo', 'agregado_validado']),
  url: z.string().url().nullable(), consultado_em: instante, observacao: texto,
}).strict();
const referenciaSchema = z.object({
  fonte_id: texto, camada_id: contagem, camada_nome: texto, quantidade_feicoes_intersectadas: contagem.positive(),
}).strict();
const historicoSchema = z.object({
  natureza: z.literal('historico'), possui_registro: z.boolean(),
  referencias: z.array(z.object({ periodo: texto, camadas: z.array(referenciaSchema).min(1) }).strict()),
}).strict().superRefine((h, ctx) => {
  if (h.possui_registro !== (h.referencias.length > 0) || new Set(h.referencias.map(r => r.periodo)).size !== h.referencias.length)
    ctx.addIssue({ code: 'custom', message: 'Histórico inconsistente ou período duplicado.' });
});
const viasSchema = z.object({ natureza: z.literal('historico'), possui_registro: z.boolean(),
  fonte_id: texto, filtro: z.literal("trecho_alagado = '1'") }).strict();
const handSchema = z.object({ natureza: z.literal('susceptibilidade_modelada'), possui_intersecao: z.boolean(),
  fonte_id: texto, filtro: z.literal('nivel_cm >= 10 AND nivel_cm <= 400'),
  ativacao: z.literal('nenhuma') }).strict();
export const bairroSchema = z.object({
  id: texto, identificador_fonte: contagem, nome_bruto: texto, nome: texto,
  fonte_id: texto, zona_defesa_civil: zona, colaboradores_jbs: contagem,
  historico_inundacao: historicoSchema, vias_historicas_alagamento: viasSchema, susceptibilidade_hand: handSchema,
}).strict();
export const localidadeSchema = z.object({
  id: texto, nome_exibicao: texto, colaboradores_jbs: contagem, zona_defesa_civil: zona,
  bairro_referencia: texto.nullable(), bairro_referencia_id: texto.nullable(),
  correspondencia: z.enum(['referencia_informada', 'sem_correspondencia']), fundamento: texto,
  historico_inundacao: z.null(), vias_historicas_alagamento: z.null(), susceptibilidade_hand: z.null(),
}).strict();
export const territorioSchema = z.object({
  versao: z.literal(2), gerado_em: instante, semantica: z.literal(semanticaTerritorial), fontes: z.array(fonteSchema).min(5),
  resumo_jbs: z.object({ colaboradores_total: z.literal(380), colaboradores_itajai: z.literal(292),
    colaboradores_outros_municipios: z.literal(88), fonte_id: texto }).strict(),
  zonas: z.array(z.object({ numero: z.number().int().min(1).max(10), natureza: z.literal('administrativa_operacional'),
    localidades: z.array(texto).min(1), fonte_id: texto }).strict()).length(10),
  metodologia: z.object({ relacao_espacial: z.literal('esriSpatialRelIntersects'), crs_consulta: z.literal(4326),
    limite_da_intersecao: texto, agregacao_historica: texto }).strict(),
  bairros: z.array(bairroSchema).min(1), localidades: z.array(localidadeSchema),
}).strict().superRefine((t, ctx) => {
  const erro = (message: string) => ctx.addIssue({ code: 'custom', message });
  const fontes = new Set(t.fontes.map(f => f.id));
  if (fontes.size !== t.fontes.length) erro('Fonte duplicada.');
  const verificarFonte = (id: string) => { if (!fontes.has(id)) erro(`Fonte ausente: ${id}`); };
  verificarFonte(t.resumo_jbs.fonte_id);
  const entidades = [...t.bairros, ...t.localidades];
  if (entidades.reduce((s, a) => s + a.colaboradores_jbs, 0) !== 292) erro('Agregados de Itajaí devem somar 292.');
  if (new Set(entidades.map(a => a.id)).size !== entidades.length) erro('Identificador territorial duplicado.');
  if (new Set(t.bairros.map(b => b.nome)).size !== t.bairros.length) erro('Bairro duplicado.');
  if (new Set(t.zonas.map(z => z.numero)).size !== 10) erro('Zonas duplicadas.');
  t.zonas.forEach(z => verificarFonte(z.fonte_id));
  for (const b of t.bairros) {
    verificarFonte(b.fonte_id); verificarFonte(b.vias_historicas_alagamento.fonte_id); verificarFonte(b.susceptibilidade_hand.fonte_id);
    b.historico_inundacao.referencias.forEach(r => r.camadas.forEach(c => verificarFonte(c.fonte_id)));
  }
  for (const l of t.localidades) {
    if (l.correspondencia === 'sem_correspondencia' && (l.bairro_referencia !== null || l.bairro_referencia_id !== null)) erro('Localidade sem correspondência não pode ter bairro atribuído.');
    if (l.correspondencia === 'referencia_informada' && !t.bairros.some(b => b.id === l.bairro_referencia_id && b.nome === l.bairro_referencia)) erro('Referência territorial inexistente.');
  }
});
export type Territorio = z.infer<typeof territorioSchema>;
export const parseTerritorio = (dados: unknown): Territorio => territorioSchema.parse(dados);

const posicao = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const anel = z.array(posicao).min(4).refine(r => r[0]![0] === r.at(-1)![0] && r[0]![1] === r.at(-1)![1], 'Anel aberto.');
const poligono = z.array(anel).min(1);
export const bairrosGeojsonSchema = z.object({ type: z.literal('FeatureCollection'), features: z.array(z.object({
  type: z.literal('Feature'), id: texto,
  properties: z.object({ id: texto, identificador_fonte: contagem, nome_bruto: texto, nome: texto,
    fonte_id: texto, fonte_url: z.string().url() }).strict(),
  geometry: z.discriminatedUnion('type', [z.object({ type: z.literal('Polygon'), coordinates: poligono }).strict(),
    z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(poligono).min(1) }).strict()]),
}).strict()).min(1) }).strict().superRefine((g, ctx) => {
  if (new Set(g.features.map(f => f.id)).size !== g.features.length || g.features.some(f => f.id !== f.properties.id))
    ctx.addIssue({ code: 'custom', message: 'Identificadores GeoJSON inconsistentes.' });
});
export type BairrosGeojson = z.infer<typeof bairrosGeojsonSchema>;
