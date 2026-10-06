// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LevelAlert } from '../src/components/LevelAlert';
import { DecisionMap, decisionMapUrl } from '../src/components/DecisionMap';
import { AlertAudio } from '../src/services/alertAudio';
import { ActionPlan } from '../src/pages/ActionPlan';

const play = vi.spyOn(AlertAudio.prototype, 'play');
const enable = vi.spyOn(AlertAudio.prototype, 'enable');
const stop = vi.spyOn(AlertAudio.prototype, 'stop');
const dispose = vi.spyOn(AlertAudio.prototype, 'dispose');
beforeEach(() => {
  play.mockReturnValue(true); enable.mockResolvedValue(); stop.mockImplementation(() => {}); dispose.mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event('close')); };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it.each(['normalidade', 'atencao', 'alerta', 'emergencia'] as const)('primeira leitura %s não alarma, inclusive StrictMode', nivel => {
  render(<StrictMode><LevelAlert nivel={nivel} /></StrictMode>);
  expect(screen.queryByRole('alert')).toBeNull(); expect(play).not.toHaveBeenCalled();
});
it.each([
  ['normalidade', 'atencao'], ['normalidade', 'alerta'], ['normalidade', 'emergencia'],
  ['atencao', 'alerta'], ['atencao', 'emergencia'], ['alerta', 'emergencia'],
] as const)('agravamento %s → %s alerta uma vez, reconhece e não repete', (de, para) => {
  const { rerender } = render(<LevelAlert nivel={de} />);
  rerender(<LevelAlert nivel={para} />); expect(screen.getByRole('alert')).toBeTruthy(); expect(play).toHaveBeenCalledTimes(1); expect(play).toHaveBeenLastCalledWith(para);
  rerender(<LevelAlert nivel={para} />); expect(play).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Reconhecer alerta' })); expect(stop).toHaveBeenCalled(); expect(screen.queryByRole('alert')).toBeNull();
  rerender(<LevelAlert nivel={para} />); expect(screen.queryByRole('alert')).toBeNull();
});
it('redução não alarma; agravamentos pendentes permanecem identificados e nível atual é atualizado', () => {
  const { rerender } = render(<LevelAlert nivel="alerta" />);
  rerender(<LevelAlert nivel="normalidade" />); expect(play).not.toHaveBeenCalled();
  rerender(<LevelAlert nivel="atencao" />); rerender(<LevelAlert nivel="emergencia" />);
  expect(screen.getByText('Normalidade → Atenção')).toBeTruthy(); expect(screen.getByText('Atenção → Emergência')).toBeTruthy();
  rerender(<LevelAlert nivel="normalidade" />); expect(play).toHaveBeenCalledTimes(2); expect(screen.getByText(/Nível atual: Normalidade/)).toBeTruthy();
});
it('sem dado inicial estabelece referência; ausência temporária preserva a última referência conhecida', () => {
  const { rerender } = render(<LevelAlert nivel={null} />); rerender(<LevelAlert nivel="atencao" />); expect(play).not.toHaveBeenCalled();
  rerender(<LevelAlert nivel={null} />); rerender(<LevelAlert nivel="alerta" />); expect(play).toHaveBeenCalledTimes(1);
});
it('bloqueio de autoplay mantém visual e permite habilitar/testar/desabilitar por gesto', async () => {
  play.mockReturnValue(false); const { rerender } = render(<LevelAlert nivel="normalidade" />); rerender(<LevelAlert nivel="alerta" />);
  expect(screen.getByRole('alert')).toBeTruthy(); expect(screen.getByText(/Alerta sonoro indisponível/)).toBeTruthy();
  enable.mockRejectedValueOnce(new Error('blocked')); fireEvent.click(screen.getByText('Habilitar som'));
  await screen.findByText(/Não foi possível habilitar/);
  play.mockReturnValue(true); fireEvent.click(screen.getByText('Habilitar som')); await screen.findByText('Testar som');
  fireEvent.click(screen.getByText('Desabilitar som')); expect(dispose).toHaveBeenCalled(); expect(screen.getByText('Habilitar som')).toBeTruthy();
});
it('mapa abre sem imagem inventada, informa erro e restaura foco ao fechar', async () => {
  render(<DecisionMap />); const trigger = screen.getByText('Visualizar Mapa de Decisões do Terminal'); fireEvent.click(trigger);
  expect(screen.getByRole('dialog')).toBeTruthy(); expect(screen.getByAltText('Mapa de Decisões do Terminal').getAttribute('src')).toBe(decisionMapUrl);
  fireEvent.error(screen.getByAltText('Mapa de Decisões do Terminal')); expect(screen.getByText(/ainda não disponibilizado/)).toBeTruthy();
  fireEvent.click(screen.getByText('Fechar mapa')); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); expect(document.activeElement).toBe(trigger);
});
it('mapa carregado permite ampliar, reduzir, ajustar e reinicia ao reabrir', () => {
  render(<DecisionMap />); fireEvent.click(screen.getByText('Visualizar Mapa de Decisões do Terminal'));
  const img = screen.getByAltText('Mapa de Decisões do Terminal'); fireEvent.load(img);
  fireEvent.click(screen.getByText('Ampliar zoom')); expect(img.style.width).toBe('150%');
  fireEvent.click(screen.getByText('Diminuir zoom')); expect(img.style.width).toBe('100%');
  for (let i = 0; i < 8; i++) fireEvent.click(screen.getByText('Ampliar zoom')); expect(img.style.width).toBe('400%');
  fireEvent.click(screen.getByText('Ajustar à largura')); expect(img.style.width).toBe('100%');
  fireEvent.click(screen.getByText('Fechar mapa')); fireEvent.click(screen.getByText('Visualizar Mapa de Decisões do Terminal')); expect(screen.getByLabelText('Zoom').textContent).toBe('100%');
});

it('botão do mapa fica depois dos quatro links na mesma área de ações', () => {
  render(<ActionPlan impacto={{ dado:null, qualidade:'desconhecido', confirmado_em:null, realtime:'reconectando' }} />);
  const nav = screen.getByRole('navigation', { name:'Links operacionais' });
  expect(nav.querySelectorAll('a')).toHaveLength(4);
  expect(nav.lastElementChild?.contains(screen.getByText('Visualizar Mapa de Decisões do Terminal'))).toBe(true);
});
