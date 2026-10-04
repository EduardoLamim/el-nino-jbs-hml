// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerritoryMap } from '../src/pages/TerritoryMap';
import { parseStatus, parseTerritorio } from '../src/domain/contracts';
import { bairrosGeojsonSchema } from '../src/domain/territory';
import type { BaseMapa } from '../src/map/basemaps';
const state=vi.hoisted(()=>({fail:null as ((b:BaseMapa)=>void)|null,engine:{update:vi.fn(),base:vi.fn(),history:vi.fn(),dispose:vi.fn(),zoom:vi.fn(),move:vi.fn(),fit:vi.fn()}}));
vi.mock('../src/map/engine',()=>({criarMapa:(_el:unknown,_select:unknown,fail:(b:BaseMapa)=>void)=>{state.fail=fail;return state.engine;},cores:{}}));
const status=parseStatus(JSON.parse(readFileSync('tests/fixtures/status-operacional.json','utf8')));
const territorio=parseTerritorio(JSON.parse(readFileSync('public/data/territorio.json','utf8')));
const geo=bairrosGeojsonSchema.parse(JSON.parse(readFileSync('public/data/bairros.geojson','utf8')));
function localFetch(url:string){const body=readFileSync('public'+url);return Promise.resolve({ok:true,json:async()=>JSON.parse(body.toString()),arrayBuffer:async()=>new Uint8Array(body).buffer});}
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',vi.fn(localFetch));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const renderMap=()=>render(<TerritoryMap status={status} territorio={territorio} geo={geo}/>);
describe('Fase 07.1 — controles, lazy loading e falhas independentes',()=>{
  it('inicia em Simplificada sem consultas históricas',()=>{renderMap();expect((screen.getByRole('radio',{name:'Simplificada'}) as HTMLInputElement).checked).toBe(true);expect(fetch).not.toHaveBeenCalled();expect(state.engine.base).toHaveBeenCalledWith('simplificada');});
  it('troca de base preserva seleção e camadas',async()=>{
    renderMap();await userEvent.selectOptions(screen.getByLabelText('Consultar estação'),'DC01');await userEvent.click(screen.getByRole('checkbox',{name:'Exposição agregada JBS'}));
    for(const base of ['Aérea','Cartográfica','Simplificada'])await userEvent.click(screen.getByRole('radio',{name:base}));
    expect((screen.getByLabelText('Consultar estação') as HTMLSelectElement).value).toBe('DC01');expect((screen.getByRole('checkbox',{name:'Exposição agregada JBS'}) as HTMLInputElement).checked).toBe(false);
  });
  it('carrega apenas histórico ativado, troca referência e desliga sem manter geometria',async()=>{
    renderMap();await userEvent.click(screen.getByRole('checkbox',{name:'Histórico de inundação'}));await waitFor(()=>expect(state.engine.history).toHaveBeenCalledWith('historico',expect.objectContaining({type:'FeatureCollection'})));
    expect(vi.mocked(fetch).mock.calls.map(c=>String(c[0])).filter(u=>u.endsWith('.geojson'))).toHaveLength(1);
    expect(screen.getByLabelText('Referência histórica').querySelectorAll('option')).toHaveLength(10);
    await userEvent.selectOptions(screen.getByLabelText('Referência histórica'),'historico-3');await screen.findByText(/2008: 1 feições/);
    expect(vi.mocked(fetch).mock.calls.map(c=>String(c[0])).filter(u=>u.endsWith('.geojson'))).toHaveLength(2);
    await userEvent.click(screen.getByRole('checkbox',{name:'Histórico de inundação'}));expect(state.engine.history).toHaveBeenCalledWith('historico',null);
  });
  it('vias são locais, independentes e cache evita baixar novamente',async()=>{
    renderMap();const toggle=screen.getByRole('checkbox',{name:'Vias com histórico de inundação'});await userEvent.click(toggle);await screen.findByText(/555 feições/);expect(state.engine.history).toHaveBeenCalledWith('vias',expect.objectContaining({type:'FeatureCollection'}));const calls=vi.mocked(fetch).mock.calls.length;await userEvent.click(toggle);await userEvent.click(toggle);expect(vi.mocked(fetch).mock.calls.length).toBe(calls);
  });
  it.each(['Histórico de inundação','Vias com histórico de inundação'])('falha de %s não remove estações e seleção',async label=>{
    vi.mocked(fetch).mockResolvedValue({ok:false} as Response);renderMap();await userEvent.click(screen.getByRole('checkbox',{name:label}));await screen.findByText(/indisponível. As demais camadas/);await userEvent.selectOptions(screen.getByLabelText('Consultar estação'),'DC01');expect(screen.getByRole('article',{name:'Detalhe DC01'})).toBeTruthy();expect((screen.getByRole('checkbox',{name:'Estações hidrológicas DC01–DC11'}) as HTMLInputElement).checked).toBe(true);
  });
  it.each(['aerea','cartografica'] as const)('falha %s aciona Simplificada sem loop e permite nova tentativa manual',async b=>{
    renderMap();const label=b==='aerea'?'Aérea':'Cartográfica';await userEvent.click(screen.getByRole('radio',{name:label}));act(()=>state.fail!(b));expect((screen.getByRole('radio',{name:'Simplificada'}) as HTMLInputElement).checked).toBe(true);expect(screen.getByText(/Simplificada ativada/)).toBeTruthy();await userEvent.click(screen.getByRole('radio',{name:label}));expect(screen.queryByText(/Simplificada ativada/)).toBeNull();
  });
  it('desativar durante carregamento aborta e não publica resposta antiga',async()=>{
    let resolver:(v:Response)=>void=()=>{};vi.mocked(fetch).mockImplementationOnce(()=>new Promise(r=>{resolver=r;}));renderMap();const toggle=screen.getByRole('checkbox',{name:'Histórico de inundação'});await userEvent.click(toggle);await userEvent.click(toggle);expect((vi.mocked(fetch).mock.calls[0]![1]?.signal as AbortSignal).aborted).toBe(true);await act(async()=>resolver({ok:false} as Response));expect(state.engine.history).not.toHaveBeenCalledWith('historico',expect.objectContaining({features:expect.anything()}));
  });
});
