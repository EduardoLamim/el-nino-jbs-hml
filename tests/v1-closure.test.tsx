// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AreaPlanView, PlansCenter } from '../src/pages/PlansCenter';
import { areas, areaPlans } from '../src/content/area-plans';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { WeatherIcon } from '../src/components/WeatherIcon';
import { createHash } from 'node:crypto';
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });
describe('Central de Planos', () => {
  it('remove somente Área redundante, mantendo títulos e metadados úteis', () => {
    const { container, rerender } = render(<AreaPlanView plan={areaPlans.TI!} />);
    expect(screen.getByRole('heading', { name: 'Plano de Ação — TI' })).toBeTruthy();
    expect([...container.querySelectorAll('dt')].map(e => e.textContent)).toEqual(['Responsável pelo plano', 'Versão', 'Última atualização']);
    rerender(<PlansCenter secao="areas" impacto={{ dado: null, qualidade: 'desconhecido', confirmado_em: null, realtime: 'reconectando' }} />);
    expect(screen.queryByText('Área', { exact: true })).toBeNull();
    expect(screen.getByRole('heading', { name: 'TI' })).toBeTruthy();
  });
  it('tabela nativa mantém seis colunas, 50 ações, ordem numérica e textos extensos integrais', () => {
    const long = 'Procedimento extenso com detalhes e acentos.\n'.repeat(40);
    const actions = Array.from({ length: 50 }, (_, i) => ({ ...areaPlans.TI!.acoes[0]!, Ordem: String(50 - i), 'Como faz': long + i }));
    const { container } = render(<AreaPlanView plan={{ ...areaPlans.TI!, acoes: actions }} />);
    expect(screen.getAllByRole('columnheader').map(e => e.textContent)).toEqual(['Ordem', 'Quem faz', 'Quem faz - Secundário', 'Quando faz', 'Onde faz', 'Como faz']);
    expect(screen.getAllByRole('rowheader').map(e => e.textContent)).toEqual(Array.from({ length: 50 }, (_, i) => String(i + 1)));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(50);
    expect(container.querySelector('tbody tr td:last-child')?.textContent).toBe(long + 49);
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByRole('region', { name: 'Ações de Emergência' }).tabIndex).toBe(0);
  });
  it('mantém integralmente a importação autorizada do Excel de 08/10/2026', () => {
    expect(createHash('sha256').update(JSON.stringify(areaPlans.TI!.acoes)).digest('hex')).toBe('0c77aa7c36e60bf9d3b7bc5d8b9061d5d5cb91d21abe31522b567f7a6e8ace09');
  });
  it('12 áreas, metadados completos e somente TI disponível', () => {
    render(<PlansCenter secao="areas" impacto={{ dado: null, qualidade: 'desconhecido', confirmado_em: null, realtime: 'reconectando' }} />);
    for (const area of areas) expect(screen.getByRole('heading', { name: area })).toBeTruthy();
    expect(screen.getAllByText('Plano em elaboração')).toHaveLength(11);
    expect(screen.getAllByText('Consultar plano', { exact: false })).toHaveLength(1);
    expect(screen.getByText('Eduardo da Silva Lamim')).toBeTruthy();
    expect(screen.getByText('08/10/2026')).toBeTruthy();
  });
  it('exibe sete ações exatas de Emergência e seis de Impacto somente na aba selecionada', () => {
    const { container } = render(<AreaPlanView plan={areaPlans.TI!} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(7);
    for (const action of areaPlans.TI!.acoes.filter(a => a['Nível'] === 'Emergência')) expect([...container.querySelectorAll('td')].some(e => e.textContent === action['Como faz'])).toBe(true);
    fireEvent.click(screen.getByRole('tab', { name: 'Impacto JBS' }));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(6);
    expect(screen.queryByText(areaPlans.TI!.acoes[0]!['Como faz'])).toBeNull();
    expect(container.querySelector('a[download]')).toBeNull();
    expect(container.querySelectorAll('iframe')).toHaveLength(0);
  });
  it('aba vazia explícita e navegação acessível por teclado', () => {
    render(<AreaPlanView plan={{ ...areaPlans.TI!, acoes: [] }} />);
    expect(screen.getByText('Nenhuma ação cadastrada para Emergência.')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Emergência' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Impacto JBS' }).getAttribute('aria-selected')).toBe('true');
  });
});
describe('Tema e ícone', () => {
  it('segue sistema, permite escolha persistida e não recarrega', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const { unmount } = render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Ativar tema claro' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('jbs-theme')).toBe('light');
    unmount(); render(<ThemeToggle />); expect(document.documentElement.dataset.theme).toBe('light');
  });
  it('rejeita preferência inválida e usa sistema', () => {
    localStorage.setItem('jbs-theme', 'outro'); render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe('light');
  });
  it('mapeamento explícito e fallback neutro', () => {
    const { container, rerender } = render(<WeatherIcon condition="Sol com muitas nuvens" />);
    expect(container.querySelector('svg')?.dataset.weatherIcon).toBe('sun-cloud');
    rerender(<WeatherIcon condition="condição não mapeada" />);
    expect(container.querySelector('svg')?.dataset.weatherIcon).toBe('unknown');
  });
});
