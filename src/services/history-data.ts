import { manifestoHistoricoSchema, validarColecao, contarVertices, type ArquivoHistorico } from '../domain/map-layers';

const raiz = `${import.meta.env.BASE_URL}data/historico/`;
export async function carregarManifesto(signal: AbortSignal) {
  const r = await fetch(`${raiz}manifesto.json`, { signal });
  if (!r.ok) throw new Error('Manifesto histórico indisponível');
  return manifestoHistoricoSchema.parse(await r.json());
}
export async function carregarHistorico(arquivo: ArquivoHistorico, signal: AbortSignal) {
  const r = await fetch(`${raiz}${arquivo.arquivo}`, { signal });
  if (!r.ok) throw new Error('Geometria histórica indisponível');
  const bytes = await r.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, '0')).join('');
  if (hash !== arquivo.sha256 || bytes.byteLength !== arquivo.bytes) throw new Error('Integridade histórica inválida');
  const geo = validarColecao(JSON.parse(new TextDecoder().decode(bytes)), arquivo.tipo, arquivo.contagem);
  if (geo.features.reduce((s, f) => s + contarVertices(f.geometry.coordinates), 0) !== arquivo.vertices) throw new Error('Vértices incompatíveis');
  return geo;
}
