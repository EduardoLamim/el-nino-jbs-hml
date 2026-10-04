import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { coletarGeometrias, consultar } from '../scripts/map/collect';
import { fontesGeometricas, manifestoHistoricoSchema, validarColecao } from '../src/domain/map-layers';
import { carregarHistorico } from '../src/services/history-data';

const polygon = { type: 'Polygon', coordinates: [[[-48,-27],[-48.1,-27],[-48.1,-27.1],[-48,-27]]] };
const line = { type: 'LineString', coordinates: [[-48,-27],[-48.1,-27]] };
const query = vi.fn(async (url: string, params: Record<string,string>) => {
  const f = fontesGeometricas.find(f => url.startsWith(f.fonte))!;
  if (!url.endsWith('/query')) return { geometryType:f.tipo==='historico'?'esriGeometryPolygon':'esriGeometryPolyline',objectIdField:'fid',maxRecordCount:1,extent:{spatialReference:{wkid:f.sr}},advancedQueryCapabilities:{supportsPagination:true,supportsOrderBy:true} };
  if(params.returnCountOnly) return {count:2};
  return { type:'FeatureCollection', features:[{properties:{fid:Number(params.resultOffset)+1,nome:'Rua teste'},geometry:f.tipo==='historico'?polygon:line}] };
});
const dirs: string[]=[];
async function dir() {const d=await mkdtemp(join(tmpdir(),'jbs-map-test-'));dirs.push(d);return d;}
afterEach(async()=>{vi.unstubAllGlobals();query.mockClear();for(const d of dirs.splice(0)) await rm(d,{recursive:true,force:true});});

describe('Fase 07.1 — coleta e integridade',()=>{
  it('pagina todas as fontes, preserva feições e publica manifesto por hash',async()=>{
    const d=await dir(),m=await coletarGeometrias(d,query,'2026-10-03T12:00:00.000Z');
    expect(m.arquivos).toHaveLength(11);expect(m.arquivos.every(a=>a.contagem===2)).toBe(true);
    expect(query.mock.calls.filter(([,p])=>p.f==='geojson')).toHaveLength(22);
    expect(query.mock.calls.filter(([u])=>u.includes('View__vias_alagamentos')).every(([,p])=>!p.where||p.where==="trecho_alagado = '1'")).toBe(true);
    expect(query.mock.calls.some(([u])=>/HAND|nivel_inundacao|mancha_inundacao|Inunda.*cotas|MapServer|VectorTileServer/i.test(u))).toBe(false);
    for(const a of m.arquivos){const text=await readFile(join(d,a.arquivo));expect(createHash('sha256').update(text).digest('hex')).toBe(a.sha256);}
    const again=await coletarGeometrias(d,query,'2026-10-04T12:00:00.000Z');expect(again.arquivos.map(a=>a.arquivo)).toEqual(m.arquivos.map(a=>a.arquivo));
  });
  it.each(['vazio','pagina','tipo','duplicado','contagem mudou'])('rejeita %s e preserva a versão publicada',async falha=>{
    const d=await dir();await coletarGeometrias(d,query);const before=await readFile(join(d,'manifesto.json'),'utf8');let counts=0;
    const bad=async(u:string,p:Record<string,string>)=>{
      const body=await query(u,p);
      if(falha==='vazio'&&p.returnCountOnly)return {count:0};
      if(falha==='pagina'&&p.f)return {type:'FeatureCollection',features:[]};
      if(falha==='tipo'&&!u.endsWith('/query'))return {...body,geometryType:'esriGeometryPoint'};
      if(falha==='duplicado'&&p.f)return {type:'FeatureCollection',features:[{properties:{fid:1},geometry:polygon}]};
      if(falha==='contagem mudou'&&p.returnCountOnly)return {count:++counts===1?2:3};
      return body;
    };
    await expect(coletarGeometrias(d,bad)).rejects.toThrow();expect(await readFile(join(d,'manifesto.json'),'utf8')).toBe(before);
  });
  it.each([{ok:false,status:503,json:async()=>({})},{ok:true,status:200,json:async()=>({error:{code:500}})}])('detecta HTTP/ArcGIS mesmo com status 200',async response=>{
    const fetcher=vi.fn().mockResolvedValue(response);vi.stubGlobal('fetch',fetcher);await expect(consultar('https://example.test',{})).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('confere datasets reais, contagem, vértices e carregamento local íntegro',async()=>{
    const m=manifestoHistoricoSchema.parse(JSON.parse(await readFile('public/data/historico/manifesto.json','utf8')));
    expect(m.arquivos.filter(a=>a.tipo==='historico').reduce((s,a)=>s+a.contagem,0)).toBe(357);
    expect(m.arquivos.filter(a=>a.tipo==='historico').reduce((s,a)=>s+a.vertices,0)).toBe(46903);
    expect(m.arquivos.at(-1)?.contagem).toBe(555);
    for(const a of m.arquivos){const bytes=await readFile(join('public/data/historico',a.arquivo));vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,arrayBuffer:async()=>new Uint8Array(bytes).buffer}));const g=await carregarHistorico(a,new AbortController().signal);expect(g.features).toHaveLength(a.contagem);expect(fetch).toHaveBeenCalledWith('/data/historico/'+a.arquivo,expect.any(Object));}
  });
  it('rejeita hash corrompido, coleções vazias e geometrias erradas',async()=>{
    const m=manifestoHistoricoSchema.parse(JSON.parse(await readFile('public/data/historico/manifesto.json','utf8')));
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,arrayBuffer:async()=>new TextEncoder().encode('{}').buffer}));await expect(carregarHistorico(m.arquivos[0]!,new AbortController().signal)).rejects.toThrow('Integridade');
    expect(()=>validarColecao({type:'FeatureCollection',features:[]},'historico',0)).toThrow();
    expect(()=>validarColecao({type:'FeatureCollection',features:[{type:'Feature',id:1,properties:{nome:null},geometry:line}]},'historico',1)).toThrow();
  });
  it('manifesto não permite troca de fonte, filtro ou caminho externo',async()=>{
    const m=JSON.parse(await readFile('public/data/historico/manifesto.json','utf8'));m.arquivos[0].arquivo='../qualquer.geojson';expect(()=>manifestoHistoricoSchema.parse(m)).toThrow();
  });
});
