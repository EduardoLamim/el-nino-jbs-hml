// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
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
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',vi.fn(async(url:string)=>{const b=readFileSync('public'+url);return {ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>new Uint8Array(b).buffer};}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const mount=()=>render(<TerritoryMap status={status} territorio={territorio} geo={geo}/>);
it('controle rotulado inicia desligado e funciona com Espaço no teclado',async()=>{
  mount();const toggle=screen.getByRole('checkbox',{name:'Nomes dos bairros'});expect((toggle as HTMLInputElement).checked).toBe(false);
  toggle.focus();await userEvent.keyboard(' ');expect((toggle as HTMLInputElement).checked).toBe(true);
  expect(state.engine.update.mock.lastCall![3]).toMatchObject({nomes:true});
  await userEvent.keyboard(' ');expect(state.engine.update.mock.lastCall![3]).toMatchObject({nomes:false});
});
it('nomes não selecionam bairro nem alteram exposição e risco',async()=>{
  mount();const before=JSON.stringify({status,territorio});
  await userEvent.click(screen.getByRole('checkbox',{name:'Nomes dos bairros'}));
  expect(state.engine.update.mock.lastCall![4]).toBeNull();
  expect(state.engine.update.mock.lastCall![3]).toMatchObject({exposicao:true,bairros:true,estacoes:true});
  expect(screen.getByLabelText('Consultar bairro ou localidade').querySelectorAll('optgroup[label="Bairros"] option')).toHaveLength(35);
  expect(JSON.stringify({status,territorio})).toBe(before);
});
it('seleção e nomes são preservados nas três bases e no fallback',async()=>{
  mount();await userEvent.selectOptions(screen.getByLabelText('Consultar estação'),'DC01');await userEvent.click(screen.getByRole('checkbox',{name:'Nomes dos bairros'}));
  for(const base of ['Aérea','Cartográfica','Simplificada'])await userEvent.click(screen.getByRole('radio',{name:base}));
  act(()=>state.fail!('cartografica'));
  expect((screen.getByRole('checkbox',{name:'Nomes dos bairros'}) as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText('Consultar estação') as HTMLSelectElement).value).toBe('DC01');
  expect(screen.getByRole('article',{name:'Detalhe DC01'})).toBeTruthy();
});
it.each(['Histórico de inundação','Vias com histórico de inundação'])('nomes convivem com %s carregado',async label=>{
  mount();await userEvent.click(screen.getByRole('checkbox',{name:'Nomes dos bairros'}));await userEvent.click(screen.getByRole('checkbox',{name:label}));
  await screen.findByText(label==='Histórico de inundação'?/1983: 1 feições/:/555 feições/);
  expect((screen.getByRole('checkbox',{name:'Nomes dos bairros'}) as HTMLInputElement).checked).toBe(true);
  expect(state.engine.history).toHaveBeenCalledWith(label==='Histórico de inundação'?'historico':'vias',expect.objectContaining({type:'FeatureCollection'}));
});
