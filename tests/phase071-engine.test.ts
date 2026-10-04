// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { toLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import type LayerGroup from 'ol/layer/Group';
import Point from 'ol/geom/Point';
import { criarMapa, type MotorMapa } from '../src/map/engine';
import { aereaUrl, vetorUrl, adaptarEstilo, SaudeBase } from '../src/map/basemaps';
import { parseStatus, parseTerritorio } from '../src/domain/contracts';
import { bairrosGeojsonSchema } from '../src/domain/territory';
import { apply } from 'ol-mapbox-style';
vi.mock('ol-mapbox-style',()=>({apply:vi.fn(async(g:LayerGroup)=>{g.getLayers().push(new TileLayer({source:new XYZ({url:'https://example.test/{z}/{x}/{y}'})}));return g;})}));
const status=parseStatus(JSON.parse(readFileSync('tests/fixtures/status-operacional.json','utf8')));
const territorio=parseTerritorio(JSON.parse(readFileSync('public/data/territorio.json','utf8')));
const geo=bairrosGeojsonSchema.parse(JSON.parse(readFileSync('public/data/bairros.geojson','utf8')));
const style={version:8,sources:{esri:{url:'../../'}},sprite:'../sprites/sprite',glyphs:'../fonts/{fontstack}/{range}.pbf',layers:[{layout:{'text-font':['Tahoma Bold']}}]};
let engine:MotorMapa;let fail = vi.fn<(b: string) => void>();
beforeEach(()=>{
  vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});vi.stubGlobal('requestAnimationFrame',()=>0);vi.stubGlobal('cancelAnimationFrame',()=>{});
  const el=document.createElement('div');document.body.append(el);fail=vi.fn();engine=criarMapa(el,vi.fn(),fail);engine.map.setSize([800,500]);engine.update(status,territorio,geo,{bairros:true,exposicao:true,estacoes:true},null);
});
afterEach(()=>{engine.dispose();document.body.innerHTML='';vi.unstubAllGlobals();vi.useRealTimers();});
const layers=()=>engine.map.getLayers().getArray();
describe('Fase 07.1 — OpenLayers real',()=>{
  it('inicializa somente um motor em 3857, com 35 bairros e onze pontos reprojetados',()=>{
    expect(engine.map.getView().getProjection().getCode()).toBe('EPSG:3857');
    expect((layers()[1] as VectorLayer).getSource()!.getFeatures()).toHaveLength(35);
    const stations=(layers()[4] as VectorLayer).getSource()!.getFeatures();expect(stations).toHaveLength(11);
    const f=stations.find(f=>f.getId()==='DC01')!;const coord=toLonLat((f.getGeometry() as Point).getCoordinates());expect(coord[0]).toBeCloseTo(status.rios.DC01!.longitude!,6);expect(coord[1]).toBeCloseTo(status.rios.DC01!.latitude!,6);
  });
  it('não desenha estação sem coordenada e usa apenas estados calculados',()=>{
    const s=structuredClone(status);s.rios.DC01!.latitude=null;engine.update(s,territorio,geo,{bairros:true,exposicao:true,estacoes:true},null);expect((layers()[4] as VectorLayer).getSource()!.getFeatureById('DC01')).toBeNull();expect(s.motor).toEqual(status.motor);
  });
  it('troca todas as bases preservando centro, zoom, seleção e sobreposições',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>style}));engine.zoom(2);engine.move(1,1);const center=engine.map.getView().getCenter()!.slice(),zoom=engine.map.getView().getZoom();const bairros=layers()[1];
    for(const b of ['aerea','cartografica','simplificada'] as const){await engine.base(b);expect(engine.map.getView().getCenter()).toEqual(center);expect(engine.map.getView().getZoom()).toBe(zoom);expect(layers()[1]).toBe(bairros);}
    expect((layers()[0] as LayerGroup).getLayers().getLength()).toBe(0);
  });
  it('aérea usa URL municipal, CORS, grade nativa e limite de cobertura',async()=>{
    await engine.base('aerea');const tile=(layers()[0] as LayerGroup).getLayers().item(0) as TileLayer<XYZ>;
    expect(tile.getSource()!.getUrls()).toEqual([aereaUrl]);expect(tile.getSource()!.getTileGrid()!.getMaxZoom()).toBe(20);expect(tile.getExtent()).toHaveLength(4);
  });
  it('adapta o estilo municipal sem recriar suas camadas, resolve sprites e fontes locais',async()=>{
    const copy=structuredClone(style),s=adaptarEstilo(style);expect(style).toEqual(copy);expect(s.sprite).toContain('/resources/sprites/sprite');expect(s.sources.esri).toMatchObject({tiles:[`${vetorUrl}/tile/{z}/{y}/{x}.pbf`],maxzoom:19});expect(s.layers[0]?.layout?.['text-font']).toEqual(['Arial Bold']);
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>style}));await engine.base('cartografica');expect(apply).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({version:8}),expect.anything());
  });
  it('Simplificada não consulta tiles ou serviços',async()=>{vi.stubGlobal('fetch',vi.fn());await engine.base('simplificada');expect(fetch).not.toHaveBeenCalled();});
  it('um tile isolado não troca base; falha persistente preserva sobreposições',async()=>{
    await engine.base('aerea');const source=((layers()[0] as LayerGroup).getLayers().item(0) as TileLayer<XYZ>).getSource()!;source.dispatchEvent('tileloaderror');expect(fail).not.toHaveBeenCalled();source.dispatchEvent('tileloaderror');source.dispatchEvent('tileloaderror');expect(fail).toHaveBeenCalledTimes(1);expect((layers()[0] as LayerGroup).getLayers().getLength()).toBe(0);expect((layers()[4] as VectorLayer).getSource()!.getFeatures()).toHaveLength(11);
  });
  it('falha do estilo Cartográfica e timeout acionam fallback',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));await engine.base('cartografica');expect(fail).toHaveBeenCalledWith('cartografica');vi.useFakeTimers();await engine.base('aerea');vi.advanceTimersByTime(20000);expect(fail).toHaveBeenCalledWith('aerea');
  });
  it('erro atrasado da base anterior não derruba nova base',async()=>{
    await engine.base('aerea');const source=((layers()[0] as LayerGroup).getLayers().item(0) as TileLayer<XYZ>).getSource()!;await engine.base('simplificada');for(let i=0;i<5;i++)source.dispatchEvent('tileloaderror');expect(fail).not.toHaveBeenCalled();
  });
  it('monitora janela recente após muitos tiles saudáveis',()=>{const h=new SaudeBase();for(let i=0;i<100;i++)h.sucesso();expect(h.falha()).toBe(false);for(let i=0;i<4;i++)h.falha();expect(h.falha()).toBe(true);});
});
