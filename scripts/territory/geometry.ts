import type { BairrosGeojson } from '../../src/domain/territory';

// Esri JSON: exterior horário, buracos anti-horários (inverso da convenção GeoJSON).
export function anéisEsri(geometry: BairrosGeojson['features'][number]['geometry']) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap(polygon => polygon.map((ring, index) => {
    const areaDupla = ring.slice(0, -1).reduce((a, p, i) => a + p[0] * ring[i + 1]![1] - ring[i + 1]![0] * p[1], 0);
    const horario = areaDupla < 0;
    return horario === (index === 0) ? ring : [...ring].reverse();
  }));
}
