import { bairrosGeojsonSchema, type Territorio } from '../domain/territory';

export async function carregarBairros(territorio: Territorio, signal: AbortSignal) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/bairros.geojson`, { signal });
  if (!response.ok) throw new Error('Geometria indisponível');
  const geo = bairrosGeojsonSchema.parse(await response.json());
  const ids = new Map(territorio.bairros.map(b => [b.id, b.nome]));
  if (geo.features.length !== ids.size || geo.features.some(f => ids.get(f.id) !== f.properties.nome)) throw new Error('Bases territoriais incompatíveis');
  return geo;
}
