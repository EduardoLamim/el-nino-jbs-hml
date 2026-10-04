import { GIS } from '../domain/map-layers';
export type BaseMapa = 'aerea' | 'cartografica' | 'simplificada';
export const aereaUrl = `${GIS}/Hosted/Ortoimagem_restitui%C3%A7%C3%A3o_2020/MapServer/tile/{z}/{y}/{x}`;
export const vetorUrl = `${GIS}/Hosted/basemap_itajai_urb/VectorTileServer`;
export const estiloUrl = `${vetorUrl}/resources/styles/root.json`;

export function adaptarEstilo(valor: unknown) {
  if (!valor || typeof valor !== 'object') throw new Error('Estilo inválido');
  const estilo = structuredClone(valor) as { version: number; sprite?: string; glyphs?: string; sources: Record<string, unknown>; layers: { layout?: Record<string, unknown> }[] };
  if (estilo.version !== 8 || !estilo.sources?.esri || !Array.isArray(estilo.layers)) throw new Error('Estilo municipal incompatível');
  if (estilo.sprite) estilo.sprite = new URL(estilo.sprite, estiloUrl).href;
  if (estilo.glyphs) estilo.glyphs = new URL(estilo.glyphs, estiloUrl).href;
  // O catálogo ArcGIS não é TileJSON padrão. Conserva-se o estilo, explicitando a grade publicada.
  estilo.sources.esri = { type: 'vector', tiles: [`${vetorUrl}/tile/{z}/{y}/{x}.pbf`], minzoom: 0, maxzoom: 19, scheme: 'xyz' };
  // Canvas usa fontes CSS, não glifos PBF. Arial é fallback local portátil para Tahoma.
  for (const layer of estilo.layers) {
    const fonts = layer.layout?.['text-font'];
    if (Array.isArray(fonts)) layer.layout!['text-font'] = fonts.map(font => typeof font === 'string' && font.startsWith('Tahoma') ? font.replace('Tahoma', 'Arial') : font);
  }
  return estilo;
}
export class SaudeBase {
  erros = 0;
  sucessos = 0;
  private recentes: boolean[] = [];
  falha() { this.erros++; this.registrar(false); const falhas = this.recentes.filter(v => !v).length; return falhas >= 3 && falhas / this.recentes.length >= .6; }
  sucesso() { this.sucessos++; this.registrar(true); }
  private registrar(ok: boolean) { this.recentes.push(ok); if (this.recentes.length > 8) this.recentes.shift(); }
}
