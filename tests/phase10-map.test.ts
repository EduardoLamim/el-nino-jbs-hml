// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import MultiPolygon from 'ol/geom/MultiPolygon';
import type Point from 'ol/geom/Point';
import type VectorLayer from 'ol/layer/Vector';
import { criarMapa, type MotorMapa } from '../src/map/engine';
import { pontoDoNome, estiloNome } from '../src/map/neighborhood-labels';
import { parseStatus, parseTerritorio } from '../src/domain/contracts';
import { bairrosGeojsonSchema } from '../src/domain/territory';
const status = parseStatus(JSON.parse(readFileSync('tests/fixtures/status-operacional.json', 'utf8')));
const territorio = parseTerritorio(JSON.parse(readFileSync('public/data/territorio.json', 'utf8')));
const geo = bairrosGeojsonSchema.parse(JSON.parse(readFileSync('public/data/bairros.geojson', 'utf8')));
let engine: MotorMapa;
const select = vi.fn();
const layers = () => engine.map.getLayers().getArray();
const labels = () => layers().find(l => l.get('id') === 'nomes-bairros') as VectorLayer;
const update = (nomes: boolean) => engine.update(status, territorio, geo, { bairros: true, exposicao: true, estacoes: true, nomes }, { tipo: 'estacao', id: 'DC01' });
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('cancelAnimationFrame', () => {}); select.mockClear();
  engine = criarMapa(document.createElement('div'), select, vi.fn()); engine.map.setSize([800, 500]); update(false);
});
afterEach(() => { engine.dispose(); vi.unstubAllGlobals(); });

it('posiciona exatamente 35 nomes em pontos internos dos polígonos oficiais', () => {
  const shapes = (layers()[1] as VectorLayer).getSource()!;
  expect(labels().getSource()!.getFeatures()).toHaveLength(35);
  for (const f of labels().getSource()!.getFeatures()) {
    const polygon = shapes.getFeatureById(f.getId()!)!.getGeometry()!;
    expect(polygon.intersectsCoordinate((f.getGeometry() as Point).getCoordinates())).toBe(true);
    expect(f.get('nome')).toBe(geo.features.find(g => g.id === f.getId())!.properties.nome);
  }
});
it('usa ponto interno da maior parte de um multipolígono, sem coordenada manual', () => {
  const small = new Polygon([[[0,0],[1,0],[1,1],[0,1],[0,0]]]);
  const large = new Polygon([[[3,3],[9,3],[9,9],[3,9],[3,3]]]);
  const f = new Feature(new MultiPolygon([small.getCoordinates(), large.getCoordinates()]));
  expect(large.intersectsCoordinate(pontoDoNome(f)!.getCoordinates())).toBe(true);
});
it('liga e desliga apenas nomes sem alterar seleção, risco, exposição ou dados', () => {
  const original = JSON.stringify({ status, territorio, geo });
  const station = () => (layers()[4] as VectorLayer).getSource()!.getFeatureById('DC01')!;
  update(true); expect(labels().getVisible()).toBe(true);
  expect(station().get('selecao')).toEqual({ tipo: 'estacao', id: 'DC01' });
  update(false); expect(labels().getVisible()).toBe(false);
  expect((layers()[1] as VectorLayer).getSource()!.getFeatures()).toHaveLength(35);
  expect(select).not.toHaveBeenCalled(); expect(JSON.stringify({ status, territorio, geo })).toBe(original);
});
it('mantém nomes independentes da visibilidade de limites e exposição', () => {
  engine.update(status, territorio, geo, { bairros: false, exposicao: false, estacoes: true, nomes: true }, null);
  expect(layers()[1]!.getVisible()).toBe(false); expect(labels().getVisible()).toBe(true);
  expect((layers()[4] as VectorLayer).getSource()!.getFeatures()).toHaveLength(11);
});
it('compartilha colisões com DC prioritários que nunca são ocultados pelos nomes', () => {
  const stations = layers()[4] as VectorLayer;
  expect(labels().getDeclutter()).toBe(stations.getDeclutter());
  expect(labels().getZIndex()).toBeLessThan(stations.getZIndex()!);
  const style = stations.getSource()!.getFeatureById('DC01')!.getStyle();
  expect(style).toHaveProperty('getText');
  expect(estiloNome('São Vicente', 11).getText()!.getDeclutterMode()).toBe('declutter');
  expect(estiloNome('São Vicente', 14).getText()!.getFont()).toContain('13px');
  expect(estiloNome('São Vicente', 11).getText()!.getStroke()!.getColor()).toBe('#ffffff');
});
it('troca de base, falha cartográfica e camadas históricas não reiniciam os nomes', async () => {
  update(true); const source = labels().getSource(); const view = engine.map.getView().getCenter()!.slice();
  await engine.base('aerea'); expect(labels().getVisible()).toBe(true);
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('mock indisponível')));
  await engine.base('cartografica'); expect(labels().getVisible()).toBe(true);
  await engine.base('simplificada'); engine.history('historico', null); engine.history('vias', null);
  expect(labels().getSource()).toBe(source); expect(engine.map.getView().getCenter()).toEqual(view);
});
it('ausência de geometria remove nomes sem inventar posições', () => {
  engine.update(status, territorio, null, { bairros: true, exposicao: true, estacoes: true, nomes: true }, null);
  expect(labels().getSource()!.getFeatures()).toHaveLength(0);
});
