import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { bairrosGeojsonSchema, parseTerritorio, semanticaTerritorial, type Territorio } from '../../src/domain/territory';
import { agregados, zonas, zonaExata, fonteBairros, fonteHistorico, fonteVias, fonteHand, periodos } from './config';
import { anéisEsri } from './geometry';

const coletado = new Date().toISOString();
const auditoria: { url: string; parametros: Record<string, string>; consultado_em: string; resposta_sha256: string; contagem?: number }[] = [];
async function consultar(url: string, parametros: Record<string, string>): Promise<unknown> {
  let ultimo: unknown;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const resposta = await fetch(url, { method: 'POST', body: new URLSearchParams({ f: 'json', ...parametros }), signal: AbortSignal.timeout(45000) });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}: ${url}`);
      const bruto = await resposta.text();
      const valor = JSON.parse(bruto) as { error?: unknown; exceededTransferLimit?: boolean; count?: number };
      if (valor.error || valor.exceededTransferLimit) throw new Error(`Resposta incompleta/erro: ${JSON.stringify(valor.error)}`);
      auditoria.push({ url, parametros, consultado_em: new Date().toISOString(), resposta_sha256: createHash('sha256').update(bruto).digest('hex'), ...(valor.count === undefined ? {} : { contagem: valor.count }) });
      return valor;
    } catch (e) { ultimo = e; }
  }
  throw ultimo;
}
const contagemSchema = z.object({ count: z.number().int().nonnegative() });
async function contar(url: string, parametros: Record<string, string>) {
  return contagemSchema.parse(await consultar(`${url}/query`, { ...parametros, returnCountOnly: 'true' })).count;
}
const raw = z.object({ type: z.literal('FeatureCollection'), features: z.array(z.object({
  properties: z.object({ objectid: z.number().int(), nome_1: z.string().min(1) }), geometry: z.unknown(),
})) }).parse(await consultar(`${fonteBairros}/query`, { f: 'geojson', where: '1=1', outFields: 'objectid,nome_1', returnGeometry: 'true', outSR: '4326' }));
const total = await contar(fonteBairros, { where: '1=1' });
if (total !== raw.features.length || total !== 35) throw new Error('Base alterada/incompleta: refazer validação de cobertura antes de gerar.');
const geo = bairrosGeojsonSchema.parse({ type: 'FeatureCollection', features: raw.features.map(f => {
  const id = `itajai-${f.properties.objectid}`;
  return { type: 'Feature', id, properties: { id, identificador_fonte: f.properties.objectid,
    nome_bruto: f.properties.nome_1, nome: f.properties.nome_1.normalize('NFC').trim(), fonte_id: 'bairros', fonte_url: fonteBairros }, geometry: f.geometry };
}) });
// Atestado geométrico gerado pelo validador Shapely antes da publicação; muda com qualquer coordenada/nome.
const fingerprint = createHash('sha256').update(JSON.stringify(geo)).digest('hex');
if (process.argv.includes('--prepare')) {
  await mkdir('.codex_work/territory', { recursive: true });
  await writeFile('.codex_work/territory/bairros.geojson', JSON.stringify(geo));
  console.log('Geometria em staging; executar validate_geometry.py antes da publicação.');
  process.exit(0);
}
const atestadoPath = 'docs/fase-04-validacao-geometrica.json';
const atestado = JSON.parse(await readFile(atestadoPath, 'utf8')) as { geojson_sha256: string; valido: boolean };
if (!atestado.valido || atestado.geojson_sha256 !== fingerprint) throw new Error('Geometria sem atestado vigente: executar validate_geometry.py para esta fonte.');
const layers = z.object({ layers: z.array(z.object({ id: z.number().int(), name: z.string() })) }).parse(await consultar(`${fonteHistorico}/layers`, {})).layers;
if (layers.length !== 10 || layers.some(l => periodos[l.id] === undefined)) throw new Error('Catálogo histórico alterado: revisão necessária.');
const fonte = (id: string, nome: string, tipo: Territorio['fontes'][number]['tipo'], url: string | null, observacao: string) => ({ id, nome, tipo, url, consultado_em: coletado, observacao });
const fontes = [
  fonte('bairros', 'Bairros municipais — bairros_Itajai', 'territorial', fonteBairros, '35 unidades; geometrias preservadas; referência horizontal original EPSG:31982, saída WGS84 longitude/latitude.'),
  fonte('historico', 'Histórico municipal de inundações', 'historico', fonteHistorico, 'Referências por período; não são contagem de enchentes nem condição atual.'),
  fonte('vias', 'Trechos com histórico de alagamento', 'historico', fonteVias, "Somente trecho_alagado = '1'; não representa mobilidade atual."),
  fonte('hand', 'Vias classificadas em cenários', 'modelagem', fonteHand, 'Interseção com catálogo 10–400 cm; sem cenário ativado, previsão ou equivalência com telemetria.'),
  fonte('v17', 'Plano de Contingência V17 — 22/12/2025', 'administrativo', 'https://defesacivil.itajai.sc.gov.br/documentos/Plano-de-Contingencia-de-Inundacao-ALTERADO-EM-22-12-25.pdf', 'Zonas administrativas/operacionais; não são unidades hidrológicas.'),
  fonte('jbs', 'Agregados JBS validados pelo solicitante', 'agregado_validado', null, 'Transcrição exclusiva dos agregados autorizados para a Fase 04; sem dados individuais.'),
];
const bairros: Territorio['bairros'] = [];
const bairroPorGeometria = new Map<string, string>();
for (const f of geo.features) {
  const geometry = JSON.stringify({ rings: anéisEsri(f.geometry), spatialReference: { wkid: 4326 } });
  bairroPorGeometria.set(createHash('sha256').update(geometry).digest('hex'), f.id);
  const espacial = { geometry, geometryType: 'esriGeometryPolygon', inSR: '4326', spatialRel: 'esriSpatialRelIntersects' };
  // Orientação Esri explícita; nenhuma simplificação, buffer ou reparação geométrica.
  const resultados = await Promise.all(layers.map(async l => ({ l, count: await contar(`${fonteHistorico}/${l.id}`, { ...espacial, where: '1=1' }) })));
  const grupos = new Map<string, Territorio['bairros'][number]['historico_inundacao']['referencias'][number]>();
  for (const { l, count } of resultados) if (count > 0) {
    const periodo = periodos[l.id]!;
    const grupo = grupos.get(periodo) ?? { periodo, camadas: [] };
    grupo.camadas.push({ fonte_id: 'historico', camada_id: l.id, camada_nome: l.name, quantidade_feicoes_intersectadas: count });
    grupos.set(periodo, grupo);
  }
  const [vias, hand] = await Promise.all([
    contar(fonteVias, { ...espacial, where: "trecho_alagado = '1'" }),
    contar(fonteHand, { ...espacial, where: 'nivel_cm >= 10 AND nivel_cm <= 400' }),
  ]);
  bairros.push({ id: f.id, identificador_fonte: f.properties.identificador_fonte, nome_bruto: f.properties.nome_bruto,
    nome: f.properties.nome, fonte_id: 'bairros', zona_defesa_civil: zonaExata(f.properties.nome), colaboradores_jbs: agregados[f.properties.nome] ?? 0,
    historico_inundacao: { natureza: 'historico', possui_registro: grupos.size > 0, referencias: [...grupos.values()] },
    vias_historicas_alagamento: { natureza: 'historico', possui_registro: vias > 0, fonte_id: 'vias', filtro: "trecho_alagado = '1'" },
    susceptibilidade_hand: { natureza: 'susceptibilidade_modelada', possui_intersecao: hand > 0, fonte_id: 'hand', filtro: 'nivel_cm >= 10 AND nivel_cm <= 400', ativacao: 'nenhuma' } });
  process.stdout.write(`${bairros.length}/${geo.features.length} ${f.properties.nome}\n`);
}
const localidades: Territorio['localidades'] = Object.entries(agregados).filter(([nome]) => !bairros.some(b => b.nome === nome)).map(([nome, colaboradores]) => {
  const referencia = nome === 'Portal 2' ? bairros.find(b => b.nome === 'Espinheiros') : undefined;
  return { id: nome === 'Portal 2' ? 'localidade-portal-2' : 'localidade-brilhante-i', nome_exibicao: nome,
    colaboradores_jbs: colaboradores, zona_defesa_civil: zonaExata(nome), bairro_referencia: referencia?.nome ?? null,
    bairro_referencia_id: referencia?.id ?? null, correspondencia: referencia ? 'referencia_informada' : 'sem_correspondencia',
    fundamento: referencia ? 'Referência Portal 2 → Espinheiros autorizada pelo solicitante; agregado separado, sem herdar contexto espacial.' : 'Nome sem correspondência exata na base; não equiparado a Brilhante.',
    historico_inundacao: null, vias_historicas_alagamento: null, susceptibilidade_hand: null };
});
if (localidades.some(l => !['Portal 2', 'Brilhante I'].includes(l.nome_exibicao))) throw new Error('Nova ausência territorial exige revisão explícita.');
const territorio = parseTerritorio({ versao: 2, gerado_em: coletado, semantica: semanticaTerritorial, fontes,
  resumo_jbs: { colaboradores_total: 380, colaboradores_itajai: 292, colaboradores_outros_municipios: 88, fonte_id: 'jbs' },
  zonas: zonas.map((localidades, i) => ({ numero: i + 1, natureza: 'administrativa_operacional', localidades, fonte_id: 'v17' })),
  metodologia: { relacao_espacial: 'esriSpatialRelIntersects', crs_consulta: 4326,
    limite_da_intersecao: 'Inclui toque de borda; não implica bairro inteiro atingido. Ausência significa ausência de interseção nas camadas consultadas.',
    agregacao_historica: 'Camadas agrupadas por referência temporal; 2011 anual/setembro reunidos. Não se contabilizam enchentes.' }, bairros, localidades });
await mkdir('public/data', { recursive: true });
// Publicação somente após todas as consultas, completude e contratos passarem.
await writeFile('public/data/bairros.geojson', JSON.stringify(geo));
await writeFile('public/data/territorio.json', JSON.stringify(territorio, null, 2) + '\n');
// Evitar replicar coordenadas em cada requisição no registro de auditoria.
await writeFile('docs/fase-04-consultas.json', JSON.stringify({ coletado_em: coletado, geojson_sha256: fingerprint, consultas: auditoria.map(a => {
  const { geometry, ...parametros } = a.parametros;
  const hash = geometry ? createHash('sha256').update(geometry).digest('hex') : undefined;
  return { ...a, parametros, ...(hash ? { bairro_id: bairroPorGeometria.get(hash), geometria_consulta_sha256: hash } : {}) };
}) }, null, 2) + '\n');
