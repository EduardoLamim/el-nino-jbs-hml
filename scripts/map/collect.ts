import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { fontesGeometricas, validarColecao, manifestoHistoricoSchema, contarVertices, type ColecaoHistorica, type ArquivoHistorico } from '../../src/domain/map-layers';

type Consulta = (url: string, params: Record<string, string>) => Promise<unknown>;
export const consultar: Consulta = async (url, params) => {
  let erro: unknown;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const response = await fetch(`${url}?${new URLSearchParams({ f: 'json', ...params })}`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object' || 'error' in body) throw new Error('Erro ArcGIS ou resposta inválida');
      return body;
    } catch (e) { erro = e; }
  }
  throw erro;
};
const metaSchema = z.object({ geometryType: z.enum(['esriGeometryPolygon', 'esriGeometryPolyline']), objectIdField: z.string().min(1),
  maxRecordCount: z.number().int().positive(), extent: z.object({ spatialReference: z.object({ wkid: z.number() }) }), advancedQueryCapabilities: z.object({ supportsPagination: z.literal(true), supportsOrderBy: z.literal(true) }) });
const countSchema = z.object({ count: z.number().int().positive() });
const pageSchema = z.object({ type: z.literal('FeatureCollection'), features: z.array(z.object({ properties: z.record(z.unknown()), geometry: z.unknown() })) });

export async function coletarGeometrias(destino = 'public/data/historico', query: Consulta = consultar, agora = new Date().toISOString()) {
  // Coleta e valida todas as fontes antes de tornar qualquer versão visível.
  const preparados: { arquivo: ArquivoHistorico; texto: string }[] = [];
  for (const fonte of fontesGeometricas) {
    const meta = metaSchema.parse(await query(fonte.fonte, {}));
    if (meta.geometryType !== (fonte.tipo === 'historico' ? 'esriGeometryPolygon' : 'esriGeometryPolyline') || meta.extent.spatialReference.wkid !== fonte.sr) throw new Error(`Fonte alterada: ${fonte.id}`);
    const params = { where: fonte.filtro, returnCountOnly: 'true' };
    const total = countSchema.parse(await query(`${fonte.fonte}/query`, params)).count;
    const features: ColecaoHistorica['features'] = [];
    const pageSize = Math.min(meta.maxRecordCount, 1000);
    for (let offset = 0; offset < total; offset += pageSize) {
      const page = pageSchema.parse(await query(`${fonte.fonte}/query`, { f: 'geojson', where: fonte.filtro, outFields: fonte.tipo === 'vias' ? `${meta.objectIdField},nome` : meta.objectIdField,
        outSR: '4326', returnGeometry: 'true', orderByFields: meta.objectIdField, resultOffset: String(offset), resultRecordCount: String(pageSize) }));
      if (page.features.length !== Math.min(pageSize, total - offset)) throw new Error(`Página incompleta: ${fonte.id}`);
      features.push(...page.features.map(f => ({ type: 'Feature' as const, id: z.number().int().nonnegative().parse(f.properties[meta.objectIdField]),
        properties: { nome: fonte.tipo === 'vias' ? z.string().nullable().parse(f.properties.nome) : null }, geometry: f.geometry as ColecaoHistorica['features'][number]['geometry'] })));
    }
    const geo = validarColecao({ type: 'FeatureCollection', features: features.sort((a, b) => a.id - b.id) }, fonte.tipo, total);
    if (countSchema.parse(await query(`${fonte.fonte}/query`, params)).count !== total) throw new Error(`Fonte mudou durante coleta: ${fonte.id}`);
    const texto = JSON.stringify(geo) + '\n';
    const sha256 = createHash('sha256').update(texto).digest('hex');
    preparados.push({ texto, arquivo: { id: fonte.id, tipo: fonte.tipo, referencia: fonte.referencia, fonte: fonte.fonte, filtro: fonte.filtro, layer: fonte.layer,
      coletado_em: agora, sr_origem: fonte.sr, sr_arquivo: 4326, contagem: total, vertices: features.reduce((s, f) => s + contarVertices(f.geometry.coordinates), 0),
      bytes: Buffer.byteLength(texto), sha256, arquivo: `${fonte.id}-${sha256}.geojson` } });
  }
  const manifesto = manifestoHistoricoSchema.parse({ versao: 1, coletado_em: agora, arquivos: preparados.map(p => p.arquivo) });
  await mkdir(destino, { recursive: true });
  // Arquivos imutáveis por hash; o manifesto é o único ponto de publicação.
  for (const p of preparados) {
    const arquivo = join(destino, p.arquivo.arquivo);
    try { if (await readFile(arquivo, 'utf8') === p.texto) continue; }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    const staging = join(destino, `geometria-${randomUUID()}.tmp`);
    try { await writeFile(staging, p.texto, 'utf8'); await rename(staging, arquivo); }
    finally { await rm(staging, { force: true }); }
  }
  const temporario = join(destino, `manifesto-${randomUUID()}.tmp`);
  try { await writeFile(temporario, JSON.stringify(manifesto, null, 2) + '\n'); await rename(temporario, join(destino, 'manifesto.json')); }
  finally { await rm(temporario, { force: true }); }
  return manifesto;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  coletarGeometrias().then(m => console.log(JSON.stringify(m.arquivos.map(a => ({ id: a.id, feicoes: a.contagem, vertices: a.vertices, bytes: a.bytes })), null, 2)))
    .catch(e => { console.error('Coleta não publicada; última versão preservada.', e); process.exitCode = 1; });
}
