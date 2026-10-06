// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { codigoHidrologicoSchema, parseStatus, parseTerritorio, type Status } from '../src/domain/contracts';
import { bairrosGeojsonSchema } from '../src/domain/territory';
import type { EstadoImpacto } from '../src/domain/impact';
import { ImpactoStore } from '../src/services/impact';
import { TerritoryMap, avisoHistorico, avisoVias } from '../src/pages/TerritoryMap';
import { ActionPlan } from '../src/pages/ActionPlan';
import { CompactOperational } from '../src/components/CompactOperational';
import { carregarBairros } from '../src/services/map-data';
import { planos } from '../src/content/action-plans';
import App from '../src/App';

const original = parseStatus(JSON.parse(readFileSync('tests/fixtures/status-operacional.json', 'utf8')));
const territorio = parseTerritorio(JSON.parse(readFileSync('public/data/territorio.json', 'utf8')));
const geo = bairrosGeojsonSchema.parse(JSON.parse(readFileSync('public/data/bairros.geojson', 'utf8')));
const ctx = vi.hoisted(() => ({ status: null as Status | null, store: null as ImpactoStore | null }));
vi.mock('../src/services/impact', async originalModule => ({ ...await originalModule<typeof import('../src/services/impact')>(), criarImpactoStore: () => ctx.store }));
vi.mock('../src/hooks/useDados', () => ({ useDados: () => ({ estado: 'carregado', dados: { status: ctx.status, territorio } }) }));
const inativo: EstadoImpacto = { dado: { id: 1, revisao: 0, ativo: false, impacto_id: null, tipo: null, acionado_em: null, atualizado_em: '2026-10-02T12:00:00Z' }, qualidade: 'confirmado', confirmado_em: '2026-10-02T12:00:00Z', realtime: 'conectado' };
const ativo: EstadoImpacto = { ...inativo, dado: { id: 1, revisao: 1, ativo: true, impacto_id: randomUUID(), tipo: 'alagamento_terminal', acionado_em: '2026-10-02T12:00:00Z', atualizado_em: '2026-10-02T12:00:00Z' } };
const desconhecido: EstadoImpacto = { dado: null, qualidade: 'desconhecido', confirmado_em: null, realtime: 'reconectando' };
let s: Status;
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  s = structuredClone(original); ctx.status = s; window.location.hash = '#/dashboard';
  ctx.store = new ImpactoStore({ consultar: async () => inativo.dado, executar: async () => ativo.dado, assinar: () => () => {} });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => geo }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const fakeMap = vi.hoisted(() => ({ update: vi.fn(), history: vi.fn(), base: vi.fn(), zoom: vi.fn(), move: vi.fn(), fit: vi.fn(), dispose: vi.fn() }));
vi.mock('../src/map/engine', () => ({ criarMapa: () => fakeMap, cores: { normalidade: '#257c52', atencao: '#e5ba24', alerta: '#c96615', emergencia: '#b33338', desconhecido: '#7e8992' } }));
const mapa = () => render(<TerritoryMap status={s} territorio={territorio} geo={geo} />);

describe('Fase 07 — regressão funcional do mapa migrado', () => {
  it('preserva onze estações, 35 bairros e estados produzidos pelo motor', () => {
    mapa(); const dc=screen.getByLabelText('Consultar estação');
    for(const c of codigoHidrologicoSchema.options) expect(within(dc).getByRole('option', { name: new RegExp(`^${c} ·`) })).toBeTruthy();
    expect(within(screen.getByLabelText('Consultar bairro ou localidade')).getAllByRole('option')).toHaveLength(38);
    expect(fakeMap.update).toHaveBeenLastCalledWith(s,territorio,geo,expect.any(Object),null);
  });
  it('liga apenas bairros, exposição e estações por padrão', () => {
    mapa(); for (const label of ['Limites dos bairros','Exposição agregada JBS','Estações hidrológicas DC01–DC11']) expect((screen.getByRole('checkbox',{name:label}) as HTMLInputElement).checked).toBe(true);
    for(const label of ['Histórico de inundação','Vias com histórico de inundação']) expect((screen.getByRole('checkbox',{name:label}) as HTMLInputElement).checked).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('desliga camadas sem alterar dados operacionais', async () => {
    mapa(); await userEvent.click(screen.getByRole('checkbox',{name:'Estações hidrológicas DC01–DC11'}));
    expect(fakeMap.update).toHaveBeenLastCalledWith(s,territorio,geo,expect.objectContaining({estacoes:false}),null); expect(s).toEqual(original);
  });
  it('detalhe da estação preserva limites dinâmicos, link e ausência de bairro associado', async () => {
    s.rios.DC01!.limites.atencao_m=9.87;mapa();await userEvent.selectOptions(screen.getByLabelText('Consultar estação'),'DC01');
    const detail=within(screen.getByRole('article',{name:'Detalhe DC01'})); expect(detail.getByText('9,87 m')).toBeTruthy();
    expect(detail.getByRole('link',{name:'Ver no Monitoramento'}).getAttribute('href')).toBe('#/monitoramento/rios');expect(detail.queryByText(/bairro|cobertura|influência|cenário/i)).toBeNull();
  });
  it('indisponibilidade preserva condição conhecida', async () => {
    s.motor!.rios.DC01!.nivel='emergencia';s.motor!.rios.DC01!.stale=true;s.rios.DC01!.qualidade='indisponivel';s.rios.DC01!.nivel_m=null;
    mapa();await userEvent.selectOptions(screen.getByLabelText('Consultar estação'),'DC01');const detail=within(screen.getByRole('article',{name:'Detalhe DC01'}));expect(detail.getByText(/Sem dado recente/)).toBeTruthy();expect(detail.getByText(/Emergência/, { selector: 'strong' })).toBeTruthy();
  });
  it('sem coordenadas não estima posição e sem estado não afirma normalidade', () => {
    s.rios.DC02!.latitude=null;s.motor!.rios.DC03!.nivel=null;mapa();expect(screen.getByText(/Sem coordenadas disponíveis para desenhar: DC02/)).toBeTruthy();expect(within(screen.getByLabelText('Consultar estação')).getByRole('option',{name:/DC03.*Desconhecido/})).toBeTruthy();
  });
  it('rótulos territoriais independem dos estados hidrológicos', () => {
    const {rerender}=mapa();s.motor!.rios.DC01!.nivel='emergencia';rerender(<TerritoryMap status={s} territorio={territorio} geo={geo}/>);
    expect(within(screen.getByLabelText('Consultar bairro ou localidade')).getByRole('option',{name:'São Vicente · 67 residentes'})).toBeTruthy();
  });
  it('bairro mostra agregados e história, sem cenários ou condição atual', async () => {
    mapa();await userEvent.selectOptions(screen.getByLabelText('Consultar bairro ou localidade'),territorio.bairros.find(b=>b.nome==='São Vicente')!.id);
    const detail=within(screen.getByRole('article',{name:'Detalhe territorial São Vicente'}));expect(detail.getByText('Exposição JBS')).toBeTruthy();expect(detail.getByText('Contexto histórico')).toBeTruthy();expect(detail.queryByText(/cenário|Situação atual do bairro|colaboradores afetados|DC01/i)).toBeNull();
  });
  it.each(['Portal 2','Brilhante I'])('preserva %s separado',async nome=>{
    mapa();await userEvent.selectOptions(screen.getByLabelText('Consultar bairro ou localidade'),territorio.localidades.find(l=>l.nome_exibicao===nome)!.id);
    const detail=within(screen.getByRole('article',{name:`Detalhe territorial ${nome}`}));expect(detail.getByText(/Sem geometria própria/)).toBeTruthy();expect(detail.getByText(/não avaliado para esta localidade/)).toBeTruthy();expect(territorio.bairros.find(b=>b.nome==='Espinheiros')!.colaboradores_jbs).toBe(10);
  });
  it('separa legenda e preserva exposição agregada e privacidade',()=>{
    const {container}=mapa();const legend=within(screen.getByLabelText('Legenda do mapa'));expect(legend.getByRole('heading',{name:'Condição atual'})).toBeTruthy();expect(legend.getByRole('heading',{name:'Contexto territorial'})).toBeTruthy();expect(container.textContent).not.toMatch(/matrícula|CPF|cargo|endereço individual/i);expect(container.textContent).toContain('292 residentes em Itajaí');expect(container.textContent).toContain('88 colaboradores residem fora de Itajaí');
  });
  it('preserva avisos e remove completamente cenários e seletor',async()=>{
    const {container}=mapa();await userEvent.click(screen.getByText('Limites das camadas históricas'));expect(screen.getByText(avisoHistorico)).toBeTruthy();expect(screen.getByText(avisoVias)).toBeTruthy();expect(container.textContent).not.toMatch(/cenário|\bHAND\b|10–400|em breve|camada pendente/i);expect(screen.queryByLabelText('Cenário de inundação')).toBeNull();
  });
  it('controles HTML navegam e selecionam por teclado',async()=>{
    mapa();screen.getByRole('button',{name:'Ampliar mapa'}).focus();await userEvent.keyboard('{Enter}');expect(fakeMap.zoom).toHaveBeenCalledWith(1);await userEvent.click(screen.getByRole('button',{name:'Enquadrar bairros'}));expect(fakeMap.fit).toHaveBeenCalled();await userEvent.selectOptions(screen.getByLabelText('Consultar estação'),'DC01');expect(screen.getByRole('article',{name:'Detalhe DC01'})).toBeTruthy();
  });
  it('não inventa geometria na ausência do GeoJSON',()=>{render(<TerritoryMap status={s} territorio={territorio} geo={null}/>);expect(screen.getByText(/Mapa geométrico indisponível/)).toBeTruthy();});
  it('carrega somente bairros locais e rejeita bases incompatíveis',async()=>{
    await expect(carregarBairros(territorio,new AbortController().signal)).resolves.toEqual(geo);expect(fetch).toHaveBeenCalledWith('/data/bairros.geojson',expect.any(Object));const bad=structuredClone(geo);bad.features[0]!.properties.nome='Outro';vi.mocked(fetch).mockResolvedValueOnce({ok:true,json:async()=>bad} as Response);await expect(carregarBairros(territorio,new AbortController().signal)).rejects.toThrow('incompatíveis');vi.mocked(fetch).mockResolvedValueOnce({ok:false} as Response);await expect(carregarBairros(territorio,new AbortController().signal)).rejects.toThrow('indisponível');
  });
});

describe('Fase 07 — Plano de Ação', () => {
  it.each(['normalidade', 'atencao', 'alerta', 'emergencia'] as const)('destaca automaticamente plano %s com texto fornecido', nivel => {
    s.nivel_jbs.nivel = nivel; render(<ActionPlan status={s} territorio={territorio} impacto={inativo} />);
    expect(screen.getByRole('heading', { name: `Plano de Ação — ${planos[nivel].titulo}` })).toBeTruthy();
    expect(screen.getByText(planos[nivel].objetivo)).toBeTruthy();
    for (const o of planos[nivel].orientacoes) expect(screen.getByText(o)).toBeTruthy();
  });
  it('Impacto JBS ativo usa apenas projeção pública e preserva ambiental', () => {
    render(<ActionPlan status={s} territorio={territorio} impacto={ativo} />);
    expect(screen.getByRole('heading', { name: 'Plano de Ação — Impacto JBS' })).toBeTruthy();
    expect(screen.getByText('Alagamento no Terminal')).toBeTruthy(); expect(screen.getByText(/Condição ambiental: 🟡 Atenção/)).toBeTruthy();
    expect(screen.queryByText(/responsavel_acionamento|observacao_acionamento/)).toBeNull();
  });
  it('consulta outra orientação não altera vigente nem o objeto de dados', async () => {
    s.nivel_jbs.nivel = 'alerta'; const antes = structuredClone(s);
    render(<ActionPlan status={s} territorio={territorio} impacto={inativo} />);
    await userEvent.selectOptions(screen.getByLabelText('Consultar orientações de outros níveis'), 'emergencia');
    expect(screen.getByRole('heading', { name: 'Consulta — Emergência' })).toBeTruthy();
    expect(screen.getByText('O Nível de Alerta JBS atual permanece 🟠 Alerta.')).toBeTruthy(); expect(s).toEqual(antes);
    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao plano vigente' }));
    expect(screen.getByRole('heading', { name: 'Plano de Ação — Alerta' })).toBeTruthy();
  });
  it('consulta preta sem ocorrência não inventa tipo nem acionamento', async () => {
    render(<ActionPlan status={s} territorio={territorio} impacto={inativo} />);
    await userEvent.selectOptions(screen.getByLabelText('Consultar orientações de outros níveis'), 'impacto');
    expect(screen.getByText('Plano de referência para Impacto JBS. Esta consulta não indica uma ocorrência ativa.')).toBeTruthy();
    expect(screen.queryByText('Alagamento no Terminal')).toBeNull(); expect(screen.queryByText(/Acionado em/)).toBeNull();
  });
  it('acompanha mudança de nível quando está no plano vigente', () => {
    const { rerender } = render(<ActionPlan status={s} territorio={territorio} impacto={inativo} />);
    s = { ...s, nivel_jbs: { ...s.nivel_jbs, nivel: 'emergencia' } };
    rerender(<ActionPlan status={s} territorio={territorio} impacto={inativo} />);
    expect(screen.getByRole('heading', { name: 'Plano de Ação — Emergência' })).toBeTruthy();
  });
  it('nível desconhecido não destaca Normalidade', () => {
    s.nivel_jbs.nivel = null; render(<ActionPlan status={s} territorio={territorio} impacto={desconhecido} />);
    expect(screen.getByRole('heading', { name: 'Plano de Ação — nível não confirmado' })).toBeTruthy();
    expect(screen.queryByText('Acompanhamento de rotina.')).toBeNull();
  });
  it('gatilhos continuam somente os do motor e a orientação Atenção não aciona Comitê', () => {
    s.nivel_jbs.nivel = 'atencao'; render(<ActionPlan status={s} territorio={territorio} impacto={inativo} />);
    const motivos = within(screen.getByRole('region', { name: 'Motivo do nível' }));
    expect(motivos.getAllByRole('listitem')).toHaveLength(s.nivel_jbs.gatilhos.length);
    expect(motivos.queryByText(/chuva|Epagri|barragen|HAND|colaborador/i)).toBeNull();
    expect(screen.queryByText('Acionar o Comitê El Niño pelo grupo de WhatsApp.')).toBeNull();
  });
  it('links e referência municipal são navegação, sem workflow, formulário ou banco', () => {
    const { container } = render(<ActionPlan status={s} territorio={territorio} impacto={inativo} />);
    for (const [nome, href] of [['Avaliar evolução dos rios', '#/monitoramento/rios'], ['Acompanhar chuva', '#/monitoramento/chuva'], ['Acompanhar previsão', '#/monitoramento/previsao'], ['Consultar exposição territorial', '#/mapa']]) expect(screen.getByRole('link', { name: nome! }).getAttribute('href')).toBe(href);
    expect(screen.getByRole('link', { name: 'Plano de Contingência de Inundação da Defesa Civil de Itajaí' }).getAttribute('href')).toBe(territorio.fontes.find(f => f.id === 'v17')!.url);
    expect(container.querySelectorAll('form,textarea,input[type="checkbox"]')).toHaveLength(0); expect(localStorage.length).toBe(0);
  });
});

describe('Fase 07 — barra global e integração', () => {
  it('barra mostra nível e gatilhos existentes sem recalcular', () => {
    render(<CompactOperational status={s} impacto={inativo} />);
    expect(screen.getByText('🟡 Nível de Alerta JBS — Atenção')).toBeTruthy();
    expect(screen.getByText('Situação Oficial + DC01 + DC11')).toBeTruthy();
  });
  it('barra preta retida mostra degradação, tipo e condição subjacente', () => {
    render(<CompactOperational status={s} impacto={{ ...ativo, qualidade: 'degradado' }} />);
    expect(screen.getByText('⚫ IMPACTO JBS ATIVO')).toBeTruthy(); expect(screen.getByText(/Condição ambiental: 🟡 Atenção/)).toBeTruthy();
    expect(screen.getByText('Impacto conhecido preservado — confirmação pendente.')).toBeTruthy();
  });
  it('barra com estado desconhecido não afirma terminal sem impacto', async () => {
    render(<CompactOperational status={s} impacto={desconhecido} />);
    expect(screen.getByText('Condição do Terminal sem confirmação atual.')).toBeTruthy();
    expect(screen.queryByText('Qualidade / confirmação')).toBeNull();
    expect(screen.getByText(/Não foi possível verificar se existe Impacto JBS ativo/)).toBeTruthy();
  });
  it('navegação compartilha um único store, sem barra no Dashboard e com atualização no Plano', async () => {
    const iniciar = vi.spyOn(ctx.store!, 'iniciar'); const parar = vi.spyOn(ctx.store!, 'parar');
    render(<App />); await screen.findByText('Nenhum impacto físico confirmado.');
    expect(screen.queryByRole('complementary', { name: 'Barra operacional' })).toBeNull();
    await act(async () => { window.location.hash = '#/plano-de-acao'; window.dispatchEvent(new Event('hashchange')); });
    expect(screen.getByRole('complementary', { name: 'Barra operacional' })).toBeTruthy();
    await act(async () => { await ctx.store!.executar({ action: 'ativar', pin: randomUUID(), tipo: 'alagamento_terminal', responsavel: 'Teste' }); });
    expect(screen.getByRole('heading', { name: 'Plano de Ação — Impacto JBS' })).toBeTruthy();
    expect(screen.getByText('⚫ IMPACTO JBS ATIVO')).toBeTruthy(); expect(iniciar).toHaveBeenCalledTimes(1); expect(parar).not.toHaveBeenCalled();
  });
});
