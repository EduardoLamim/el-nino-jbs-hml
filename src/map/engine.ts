import Map from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import GeoJSON from 'ol/format/GeoJSON';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import LayerGroup from 'ol/layer/Group';
import { fromLonLat, transformExtent } from 'ol/proj';
import { Style, Fill, Stroke, Circle, Text } from 'ol/style';
import { defaults as controls } from 'ol/control/defaults';
import type Source from 'ol/source/Source';
import { codigoHidrologicoSchema, type Status } from '../domain/contracts';
import type { BairrosGeojson, Territorio } from '../domain/territory';
import type { ColecaoHistorica } from '../domain/map-layers';
import { aereaUrl, estiloUrl, adaptarEstilo, SaudeBase, type BaseMapa } from './basemaps';
import 'ol/ol.css';

export type Selecao = { tipo: 'bairro' | 'localidade'; id: string } | { tipo: 'estacao'; id: typeof codigoHidrologicoSchema.options[number] } | null;
export type Camadas = { bairros: boolean; exposicao: boolean; estacoes: boolean };
export const cores = { normalidade: '#257c52', atencao: '#e5ba24', alerta: '#c96615', emergencia: '#b33338', desconhecido: '#7e8992' };
const format = new GeoJSON();
const ler = (geo: unknown) => format.readFeatures(geo, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
export function criarMapa(target: HTMLElement, selecionar: (s: Selecao) => void, indisponivel: (b: BaseMapa) => void) {
  const base = new LayerGroup({ layers: [] });
  const bairros = new VectorLayer({ source: new VectorSource() });
  const historico = new VectorLayer({ source: new VectorSource(), style: new Style({ fill: new Fill({ color: 'rgba(115,78,158,.24)' }), stroke: new Stroke({ color: '#74519c', width: 1.8, lineDash: [7, 4] }) }) });
  const vias = new VectorLayer({ source: new VectorSource(), style: new Style({ stroke: new Stroke({ color: '#397cac', width: 3, lineDash: [5, 5] }) }) });
  const estacoes = new VectorLayer({ source: new VectorSource(), declutter: false });
  const map = new Map({ target, layers: [base, bairros, historico, vias, estacoes], controls: controls({ zoom: false, rotate: false, attribution: false }),
    view: new View({ projection: 'EPSG:3857', center: fromLonLat([-48.74, -26.94]), zoom: 11, minZoom: 9, maxZoom: 20, enableRotation: false }) });
  map.on('singleclick', event => {
    const hit = map.forEachFeatureAtPixel(event.pixel, f => f.get('selecao') as Selecao, { hitTolerance: 8, layerFilter: l => l === bairros || l === estacoes });
    if (hit) selecionar(hit);
  });
  let anterior: BairrosGeojson | null = null;
  let fitted = false;
  let currentBase: BaseMapa = 'simplificada';
  let generation = 0;
  let abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let alive = true;
  const fit = () => { const extent = bairros.getSource()!.getExtent(); if (extent && Number.isFinite(extent[0])) map.getView().fit(extent, { padding: [35, 35, 35, 35], maxZoom: 13 }); };
  const fail = (b: BaseMapa, token: number) => {
    if (!alive || token !== generation || b !== currentBase) return;
    generation++; clearTimeout(timer); abort.abort(); base.getLayers().clear(); currentBase = 'simplificada'; indisponivel(b);
  };
  function observar(source: Source, health: SaudeBase, b: BaseMapa, token: number) {
    source.addEventListener('tileloaderror', () => { if (health.falha()) fail(b, token); });
    source.addEventListener('tileloadend', () => health.sucesso());
  }
  return {
    map,
    update(status: Status, territorio: Territorio, geo: BairrosGeojson | null, camadas: Camadas, selection: Selecao) {
      if (anterior !== geo) {
        anterior = geo; bairros.getSource()!.clear();
        if (geo) { const fs = ler(geo); fs.forEach(f => f.set('selecao', { tipo: 'bairro', id: f.getId() })); bairros.getSource()!.addFeatures(fs); if (!fitted) { fit(); fitted = true; } }
      }
      const max = Math.max(1, ...territorio.bairros.map(b => b.colaboradores_jbs));
      const counts = new globalThis.Map(territorio.bairros.map(b => [b.id, b.colaboradores_jbs]));
      bairros.setVisible(camadas.bairros || camadas.exposicao);
      bairros.setStyle(f => new Style({ fill: new Fill({ color: camadas.exposicao ? `rgba(83,110,129,${.08 + .62 * (counts.get(String(f.getId())) ?? 0) / max})` : 'rgba(255,255,255,.02)' }),
        stroke: camadas.bairros || selection?.id === f.getId() ? new Stroke({ color: selection?.id === f.getId() ? '#273f60' : '#81919f', width: selection?.id === f.getId() ? 3 : 1 }) : undefined }));
      estacoes.setVisible(camadas.estacoes); estacoes.getSource()!.clear();
      for (const codigo of codigoHidrologicoSchema.options) {
        const e = status.rios[codigo], estado = status.motor?.rios[codigo];
        if (e?.latitude == null || e.longitude == null) continue;
        const f = new Feature({ geometry: new Point(fromLonLat([e.longitude, e.latitude])), selecao: { tipo: 'estacao', id: codigo } });
        f.setId(codigo);
        const stale = estado?.stale || e.qualidade === 'atrasado' || e.qualidade === 'indisponivel';
        f.setStyle(new Style({ image: new Circle({ radius: selection?.id === codigo ? 11 : 8, fill: new Fill({ color: cores[estado?.nivel ?? 'desconhecido'] }), stroke: new Stroke({ color: '#fff', width: 3, lineDash: stale ? [3, 2] : undefined }) }),
          text: new Text({ text: codigo, offsetX: 30, font: 'bold 12px Arial', fill: new Fill({ color: '#263b4a' }), stroke: new Stroke({ color: '#fff', width: 3 }) }) }));
        estacoes.getSource()!.addFeature(f);
      }
    },
    history(tipo: 'historico' | 'vias', geo: ColecaoHistorica | null) { const source = (tipo === 'historico' ? historico : vias).getSource()!; source.clear(); if (geo) source.addFeatures(ler(geo)); },
    async base(b: BaseMapa) {
      const token = ++generation; currentBase = b; clearTimeout(timer); abort.abort(); abort = new AbortController(); base.getLayers().clear();
      if (b === 'simplificada') return;
      const health = new SaudeBase();
      timer = setTimeout(() => { if (!health.sucessos) fail(b, token); }, 20000);
      if (b === 'aerea') {
        const source = new XYZ({ url: aereaUrl, projection: 'EPSG:3857', minZoom: 10, maxZoom: 20, crossOrigin: 'anonymous', transition: 0 });
        observar(source, health, b, token);
        base.getLayers().push(new TileLayer({ source, extent: transformExtent([-48.86776216448445, -27.052961229702078, -48.620857378493376, -26.838024153660772], 'EPSG:4326', 'EPSG:3857') }));
      } else {
        try {
          const response = await fetch(estiloUrl, { signal: abort.signal });
          if (!response.ok) throw new Error('Estilo indisponível');
          const style = adaptarEstilo(await response.json());
          const { apply } = await import('ol-mapbox-style');
          if (token !== generation) return;
          const group = new LayerGroup();
          await apply(group, style, { styleUrl: estiloUrl });
          if (token !== generation || !alive) { group.dispose(); return; }
          for (const layer of group.getLayers().getArray()) {
            if ('getSource' in layer && typeof layer.getSource === 'function') { const source = layer.getSource() as Source | null; if (source) observar(source, health, b, token); }
          }
          base.getLayers().push(group);
        } catch { fail(b, token); }
      }
    },
    zoom(delta: number) { map.getView().setZoom((map.getView().getZoom() ?? 11) + delta); },
    move(x: number, y: number) { const v = map.getView(), c = v.getCenter()!; const step = (v.getResolution() ?? 1) * 100; v.setCenter([c[0]! + x * step, c[1]! + y * step]); },
    fit,
    dispose() { alive = false; generation++; clearTimeout(timer); abort.abort(); map.setTarget(undefined); map.dispose(); },
  };
}
export type MotorMapa = ReturnType<typeof criarMapa>;
