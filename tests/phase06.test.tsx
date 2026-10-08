// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseStatus, parseTerritorio, type Status } from '../src/domain/contracts';
import { ImpactoStore } from '../src/services/impact';
import { PainelOperacional, Gatilhos } from '../src/components/Operational';
import { Dashboard, SituacaoOficial } from '../src/pages/Dashboard';
import { Monitoramento, Rios, Chuva, Barragens } from '../src/pages/Monitoramento';
import { ResumoChuva, PrevisaoDias } from '../src/components/Weather';
import { RiverChart } from '../src/components/RiverChart';
import { resumoRios } from '../src/utils/presentation';
import App from '../src/App';

const ctx = vi.hoisted(() => ({ store: null as ImpactoStore | null, status: null as Status | null, dados: 'carregado' }));
vi.mock('../src/services/impact', async original => ({ ...await original<typeof import('../src/services/impact')>(), criarImpactoStore: () => ctx.store }));
vi.mock('../src/hooks/useDados', () => ({ useDados: () => ctx.dados === 'carregado' ? { estado: 'carregado', dados: { status: ctx.status, territorio } } : { estado: 'erro', mensagem: 'Dados indisponíveis ou contrato inválido.' } }));
const original = parseStatus(JSON.parse(readFileSync('tests/fixtures/status-operacional.json', 'utf8')));
const territorio = parseTerritorio(JSON.parse(readFileSync('public/data/territorio.json', 'utf8')));
const atual = '2026-10-02T11:00:00Z';
const ativo = { id: 1, revisao: 1, ativo: true, impacto_id: randomUUID(), tipo: 'alagamento_terminal', acionado_em: atual, atualizado_em: atual };
const inativo = { ...ativo, revisao: 0, ativo: false, impacto_id: null, tipo: null, acionado_em: null };
let s: Status;
beforeEach(() => {
  s = structuredClone(original); ctx.status = s; ctx.dados = 'carregado'; window.location.hash = '#/dashboard';
  ctx.store = new ImpactoStore({ consultar: async () => inativo, executar: vi.fn(), assinar: () => () => {} });
});
afterEach(cleanup);

describe('Fase 06 — Dashboard e Impacto JBS', () => {
  it.each(['normalidade', 'atencao', 'alerta', 'emergencia'] as const)('apresenta nível %s sem recalcular alertas', async nivel => {
    s.nivel_jbs.nivel = nivel;
    render(<PainelOperacional status={s} />);
    await screen.findByText('Nenhum impacto físico confirmado.');
    expect(screen.getByRole('region', { name: 'Nível de Alerta JBS' }).className).toContain(`level-${nivel}`);
    expect(screen.queryByText('A condição ambiental é sustentada pelas fontes abaixo.')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Condição do Terminal' })).toBeTruthy();
  });
  it('preto domina, mantém nível ambiental e não duplica condição do terminal', async () => {
    ctx.store = new ImpactoStore({ consultar: async () => ativo, executar: vi.fn(), assinar: () => () => {} });
    render(<PainelOperacional status={s} />);
    await screen.findByRole('heading', { name: '⚫ IMPACTO JBS' });
    expect(screen.queryByRole('heading', { name: 'Condição do Terminal' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Nível de Alerta JBS' })).toBeNull();
    expect(screen.getByText(/Condição ambiental:/)).toBeTruthy();
    expect(screen.getByText(/Alagamento no Terminal/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Encerrar Impacto JBS' })).toBeTruthy();
  });
  it('preserva preto com cache degradado e consulta falhando', async () => {
    ctx.store = new ImpactoStore({ consultar: async () => { throw Error('offline'); }, executar: vi.fn(), assinar: () => () => {} },
      { ler: () => JSON.stringify({ versao: 1, dado: ativo, confirmado_em: '2020-01-01T00:00:00Z' }), gravar: vi.fn() });
    render(<PainelOperacional status={s} />);
    expect(await screen.findByText(/Último estado conhecido preservado; confirmação atual pendente/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: '⚫ IMPACTO JBS' })).toBeTruthy();
  });
  it('cliente sem confirmação não afirma ausência de impacto', async () => {
    ctx.store = new ImpactoStore({ consultar: async () => { throw Error('offline'); }, executar: vi.fn(), assinar: () => () => {} });
    render(<PainelOperacional status={s} />);
    expect(await screen.findByText('Estado operacional JBS indisponível. Não foi possível verificar se existe Impacto JBS ativo.')).toBeTruthy();
    expect(screen.queryByText('Nenhum impacto físico confirmado.')).toBeNull();
  });
  it('nível ambiental nulo nunca vira Normalidade', async () => {
    s.nivel_jbs = { nivel: null, desde: null, gatilhos: [] };
    render(<PainelOperacional status={s} />); await screen.findByText('Nenhum impacto físico confirmado.');
    expect(screen.getByRole('heading', { name: /Desconhecido/ })).toBeTruthy();
  });
  it('gatilhos provêm exclusivamente da saída do motor, sem meteo ou normalização técnica', () => {
    render(<Gatilhos status={s} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(s.nivel_jbs.gatilhos.length);
    expect(screen.getByText(/DC01/)).toBeTruthy();
    expect(screen.queryByText(/Epagri|Barragem|Chuva|leituras|Escalada imediata|Normalização confirmada/i)).toBeNull();
  });
  it('situação oficial apresenta conteúdo literal sem interpretar severidade', () => {
    s.situacao_oficial = { flag: 'Normalidade', conteudo: 'Texto oficial com a palavra emergência.', qualidade: null, atualizado_em: atual };
    render(<SituacaoOficial status={s} />);
    expect(screen.getByText('Normalidade')).toBeTruthy();
    expect(screen.getByText('Texto oficial com a palavra emergência.')).toBeTruthy();
    expect(screen.getByText(/02\/10\/2026/)).toBeTruthy();
  });
  it('situação oficial indisponível não afirma normalidade', () => {
    s.situacao_oficial = null; render(<SituacaoOficial status={s} />);
    expect(screen.getByText('Situação oficial indisponível.')).toBeTruthy();
    expect(screen.queryByText('Normalidade')).toBeNull();
  });
  it('exposição usa agregados e ressalvas, sem ocorrência atual e sem barragens no Dashboard', () => {
    render(<Dashboard status={s} territorio={territorio} />);
    for (const nome of ['São Vicente', 'Cordeiros', 'São João']) expect(screen.getByText(nome)).toBeTruthy();
    expect(screen.getByText('Informações territoriais representam exposição e vulnerabilidade histórica e não significam impacto real atual.')).toBeTruthy();
    expect(screen.getByText('88 colaboradores residem fora de Itajaí e não estão incluídos na análise territorial automática deste painel.')).toBeTruthy();
    expect(screen.queryByText(/colaboradores afetados|bairro atingido|área em alerta atual/i)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Barragens' })).toBeNull();
  });
  it('qualidade permanece interna, sem diagnóstico técnico na UI', async () => {
    s.qualidade_monitoramento.estado = 'degradado'; render(<PainelOperacional status={s} />);
    await screen.findByText('Nenhum impacto físico confirmado.'); expect(screen.queryByText('Degradado')).toBeNull(); expect(s.qualidade_monitoramento.estado).toBe('degradado');
  });
});

describe('Fase 06 — Rios', () => {
  it('conta níveis existentes e mantém ausências fora de Normalidade', () => {
    s.motor!.rios.DC01!.nivel = 'emergencia'; s.motor!.rios.DC01!.stale = true;
    s.motor!.rios.DC02!.nivel = null;
    const resumo = resumoRios(s);
    expect(resumo.maior).toBe('emergencia'); expect(resumo.contagem.desconhecido).toBe(1); expect(resumo.retidas).toBe(1);
    delete s.motor; expect(resumoRios(s).contagem.desconhecido).toBe(11);
  });
  it('apresenta 11 estações, limites atuais, tendência, atraso e retenção', () => {
    s.rios.DC01!.limites.atencao_m = 7.89; s.rios.DC01!.qualidade = 'atrasado'; s.motor!.rios.DC01!.stale = true;
    delete s.rios.DC02; s.motor!.rios.DC02!.nivel = null;
    render(<Rios status={s} />);
    expect(screen.getAllByRole('article', { name: /^Estação DC/ })).toHaveLength(11);
    expect(screen.getByRole('article', { name: 'Rio Itajaí-Açu — Blumenau' })).toBeTruthy();
    const rio = within(screen.getByRole('article', { name: 'Estação DC01' }));
    expect(rio.getByText('7,89 m')).toBeTruthy(); expect(rio.getByText(/Sem dado recente/)).toBeTruthy();
    expect(rio.getByText(/Última condição conhecida/)).toBeTruthy();
    expect(within(screen.getByRole('article', { name: 'Estação DC02' })).getByText(/Dado indisponível/)).toBeTruthy();
  });
  it('normalização aparece apenas no detalhe e mantém nível vigente', async () => {
    s.motor!.rios.DC01!.normalizacao.leituras_abaixo = 2; s.motor!.rios.DC01!.stale = false;
    render(<Rios status={s} />);
    const mensagem = screen.getByText('Em normalização — 2 de 3 leituras');
    expect(mensagem.closest('details')!.open).toBe(false);
    await userEvent.click(screen.getByText('Detalhar DC01'));
    expect(mensagem.closest('details')!.open).toBe(true);
    expect(within(screen.getByRole('article', { name: 'Estação DC01' })).getByText('Atenção', { selector: '.level-badge' })).toBeTruthy();
    expect(screen.getAllByText(/Em normalização/)).toHaveLength(1);
  });
  it('zero leituras ou stale não apresentam normalização', () => {
    for (const r of Object.values(s.motor!.rios)) r!.normalizacao.leituras_abaixo = 0;
    s.motor!.rios.DC01!.normalizacao.leituras_abaixo = 2; s.motor!.rios.DC01!.stale = true;
    render(<Rios status={s} />); expect(screen.queryByText(/Em normalização/)).toBeNull();
  });
  it('gráfico usa janela de 12h da série e interrompe valores ausentes', () => {
    const e = s.rios.DC01!;
    e.serie_12h = [{ medido_em: '2026-10-01T00:00:00Z', nivel_m: 99 }, { medido_em: '2026-10-02T00:00:00Z', nivel_m: 1 },
      { medido_em: '2026-10-02T01:00:00Z', nivel_m: null }, { medido_em: '2026-10-02T02:00:00Z', nivel_m: 2 }];
    const { container } = render(<RiverChart estacao={e} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('máximo 2 m');
    expect(container.querySelector('path')!.getAttribute('d')!.match(/M/g)).toHaveLength(2);
    expect(container.querySelector('path')!.getAttribute('d')).not.toContain('L');
  });
  it('série ausente não fabrica gráfico', () => {
    s.rios.DC01!.serie_12h = []; render(<RiverChart estacao={s.rios.DC01!} />);
    expect(screen.queryByRole('img')).toBeNull(); expect(screen.getByText('Série de níveis indisponível.')).toBeTruthy();
  });
});

describe('Fase 06 — Chuva, previsão, barragens e navegação', () => {
  it('contagem 1h exclui null/indisponível, preserva zero e não usa 24h como fallback', () => {
    const modelo = Object.values(s.chuvas)[0]!;
    s.chuvas = Object.fromEntries([2, 0, null, 5].map((v, i) => [`E${i}`, { ...modelo, codigo: `E${i}`, nome: `Estação ${i}`, chuva_1_h_mm: v, chuva_24_h_mm: 80, qualidade: i === 3 ? 'indisponivel' : 'atualizado' }]));
    render(<ResumoChuva status={s} />);
    expect(screen.getByText('1 de 2')).toBeTruthy(); expect(screen.getByText('2 mm')).toBeTruthy();
    expect(screen.getByText(/Estações com chuva na última 1h:/)).toBeTruthy();
    expect(screen.getAllByText(/Estação Estação 0/)).toHaveLength(2);
  });
  it('sem dado de 1h não afirma ausência de chuva', () => {
    for (const e of Object.values(s.chuvas)) e.chuva_1_h_mm = null;
    render(<ResumoChuva status={s} />); expect(screen.getByText('0 de 0')).toBeTruthy();
    expect(screen.getByText('Nenhuma estação com dado disponível de 1h.')).toBeTruthy();
  });
  it('chuva detalhada contém todas as janelas e estações, sem substituir null por zero', () => {
    Object.values(s.chuvas)[0]!.chuva_10_min_mm = null; render(<Chuva status={s} />);
    for (const h of ['10 min', '1h', '12h', '24h', '48h']) expect(screen.getByRole('columnheader', { name: h })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: '6h' })).toBeNull();
    expect(screen.getAllByRole('row')).toHaveLength(Object.keys(s.chuvas).length + 1);
    expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);
  });
  it('Epagri mostra todos os períodos e campos disponíveis sem modelo ou emissão inventados', () => {
    render(<PrevisaoDias previsao={s.previsao} />);
    expect(screen.getAllByRole('article')).toHaveLength(s.previsao.dias.length);
    expect(screen.getByText('Informação meteorológica para consulta.')).toBeTruthy();
    expect(screen.getAllByText('Rajada')).toHaveLength(s.previsao.dias.length);
    expect(screen.queryByText(/probabilística|CPTEC|INMET|WRF|Emissão/i)).toBeNull();
  });
  it('previsão indisponível não inventa períodos', () => {
    s.previsao.disponibilidade = 'indisponivel'; s.previsao.dias = [];
    render(<PrevisaoDias previsao={s.previsao} />); expect(screen.getByText('Previsão indisponível.')).toBeTruthy();
  });
  it('barragens são consultivas e null não vira comporta fechada', () => {
    render(<Barragens status={s} />);
    expect(screen.getAllByRole('article')).toHaveLength(Object.keys(s.barragens).length);
    expect(screen.queryByText(/Normalidade|Atenção|Alerta|Emergência|score/i)).toBeNull();
    expect(screen.getByText('Não informado / Não informado')).toBeTruthy();
  });
  it('seções possuem links acessíveis e tabelas roláveis sem depender de mouse', () => {
    render(<Monitoramento status={s} secao="chuva" />);
    expect(screen.getByRole('link', { name: 'Chuva' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('region', { name: 'Acumulados de chuva por estação' }).tabIndex).toBe(0);
  });
  it('troca de página preserva uma instância de Impacto JBS', async () => {
    const iniciar = vi.spyOn(ctx.store!, 'iniciar'); const parar = vi.spyOn(ctx.store!, 'parar');
    render(<App />); await screen.findByText('Nenhum impacto físico confirmado.');
    await act(async () => { window.location.hash = '#/monitoramento/barragens'; window.dispatchEvent(new Event('hashchange')); });
    expect(screen.getByRole('heading', { name: 'Barragens' })).toBeTruthy(); expect(iniciar).toHaveBeenCalledTimes(1); expect(parar).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Condição do Terminal' })).toBeNull();
    await act(async () => { window.location.hash = '#/mapa'; window.dispatchEvent(new Event('hashchange')); });
    // A Fase 07 substituiu apenas o placeholder; a proteção da instância permanece.
    expect(await screen.findByRole('heading', { name: 'Mapa' }, { timeout: 10000 })).toBeTruthy();
    expect(iniciar).toHaveBeenCalledTimes(1); expect(parar).not.toHaveBeenCalled();
  });
  it('erro no carregamento ambiental preserva a apresentação do impacto ativo', async () => {
    ctx.dados = 'erro'; ctx.store = new ImpactoStore({ consultar: async () => ativo, executar: vi.fn(), assinar: () => () => {} });
    render(<App />); expect(await screen.findByRole('heading', { name: '⚫ IMPACTO JBS' })).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy(); expect(screen.getByText(/Desconhecido — dados insuficientes/)).toBeTruthy();
  });
});
