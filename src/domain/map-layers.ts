import { z } from 'zod';

export const GIS = 'https://arcgis.itajai.sc.gov.br/server/rest/services';
export const referenciasHistoricas = ['1983', '1984', '2001', '2008', '2011 — referência anual', '2011 — setembro', '2013 — julho', '2013 — setembro', '2014 — junho', '2015 — outubro'] as const;
export const fontesGeometricas = [
  ...referenciasHistoricas.map((referencia, layer) => ({ id: `historico-${layer}`, referencia, layer, fonte: `${GIS}/historico_inundacoes/FeatureServer/${layer}`, filtro: '1=1', tipo: 'historico' as const, sr: 4326 })),
  { id: 'vias-historicas', referencia: 'Vias com histórico de inundação', layer: 1, fonte: `${GIS}/Hosted/View__vias_alagamentos/FeatureServer/1`, filtro: "trecho_alagado = '1'", tipo: 'vias' as const, sr: 31982 },
];
const posicao = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const linha = z.array(posicao).min(2);
const anel = linha.min(4).refine(a => a[0]![0] === a.at(-1)![0] && a[0]![1] === a.at(-1)![1], 'Anel aberto');
const poligono = z.array(anel).min(1);
export const geometriaHistoricaSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: poligono }),
  z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(poligono).min(1) }),
  z.object({ type: z.literal('LineString'), coordinates: linha }),
  z.object({ type: z.literal('MultiLineString'), coordinates: z.array(linha).min(1) }),
]);
export const colecaoHistoricaSchema = z.object({ type: z.literal('FeatureCollection'), features: z.array(z.object({
  type: z.literal('Feature'), id: z.number().int().nonnegative(),
  properties: z.object({ nome: z.string().nullable() }).strict(), geometry: geometriaHistoricaSchema,
})).min(1) }).strict().refine(g => new Set(g.features.map(f => f.id)).size === g.features.length, 'IDs duplicados');
export type ColecaoHistorica = z.infer<typeof colecaoHistoricaSchema>;
export const arquivoHistoricoSchema = z.object({
  id: z.string(), tipo: z.enum(['historico', 'vias']), referencia: z.string(), layer: z.number().int(), fonte: z.string().url(), filtro: z.string(),
  coletado_em: z.string().datetime(), sr_origem: z.number(), sr_arquivo: z.literal(4326), contagem: z.number().int().positive(),
  vertices: z.number().int().positive(), bytes: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  arquivo: z.string().regex(/^(historico-\d|vias-historicas)-[a-f0-9]{64}\.geojson$/),
}).strict();
export const manifestoHistoricoSchema = z.object({ versao: z.literal(1), coletado_em: z.string().datetime(), arquivos: z.array(arquivoHistoricoSchema).length(11) }).strict().superRefine((m, ctx) => {
  for (const fonte of fontesGeometricas) {
    const arquivos = m.arquivos.filter(a => a.id === fonte.id);
    const a = arquivos[0];
    if (arquivos.length !== 1 || !a || a.fonte !== fonte.fonte || a.layer !== fonte.layer || a.tipo !== fonte.tipo || a.filtro !== fonte.filtro || a.referencia !== fonte.referencia || a.sr_origem !== fonte.sr || a.arquivo !== `${a.id}-${a.sha256}.geojson`)
      ctx.addIssue({ code: 'custom', message: 'Manifesto incompatível com as fontes aprovadas' });
  }
});
export type ManifestoHistorico = z.infer<typeof manifestoHistoricoSchema>;
export type ArquivoHistorico = z.infer<typeof arquivoHistoricoSchema>;
export function validarColecao(valor: unknown, tipo: ArquivoHistorico['tipo'], contagem: number) {
  const g = colecaoHistoricaSchema.parse(valor);
  if (g.features.length !== contagem || g.features.some(f => tipo === 'historico' ? !['Polygon', 'MultiPolygon'].includes(f.geometry.type) : !['LineString', 'MultiLineString'].includes(f.geometry.type))) throw new Error('Geometria ou contagem incompatível');
  return g;
}
export function contarVertices(coordenadas: unknown): number {
  if (!Array.isArray(coordenadas)) return 0;
  return typeof coordenadas[0] === 'number' ? 1 : coordenadas.reduce((s: number, c: unknown) => s + contarVertices(c), 0);
}
