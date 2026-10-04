import type Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import MultiPolygon from 'ol/geom/MultiPolygon';
import { Fill, Stroke, Style, Text } from 'ol/style';

/** Um nome por bairro; a maior parte de um multipolígono recebe o ponto interno. */
export function pontoDoNome(feature: Feature) {
  const geometry = feature.getGeometry();
  const polygon = geometry instanceof Polygon ? geometry : geometry instanceof MultiPolygon
    ? geometry.getPolygons().reduce<Polygon | null>((largest, part) => !largest || part.getArea() > largest.getArea() ? part : largest, null) : null;
  return polygon?.getInteriorPoint() ?? null;
}

export function estiloNome(nome: string, zoom: number) {
  return new Style({ text: new Text({ text: nome, font: `600 ${zoom >= 14 ? 13 : 11}px "Segoe UI", sans-serif`,
    fill: new Fill({ color: '#18384c' }), stroke: new Stroke({ color: '#ffffff', width: 4 }),
    padding: [4, 6, 4, 6], overflow: true, declutterMode: 'declutter' }) });
}
