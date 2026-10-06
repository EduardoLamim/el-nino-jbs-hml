// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HmlAlertSimulator } from '../src/components/HmlAlertSimulator';
import { AlertAudio } from '../src/services/alertAudio';
import { simulationEnabled } from '../scripts/automation/simulation-config';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function setup() {
  const play = vi.spyOn(AlertAudio.prototype, 'play').mockReturnValue(true);
  const stop = vi.spyOn(AlertAudio.prototype, 'stop').mockImplementation(() => {});
  vi.spyOn(AlertAudio.prototype, 'dispose').mockImplementation(() => {});
  const change = vi.fn();
  const view = render(<HmlAlertSimulator nivel="emergencia" impactoAtivo={true} audioHost={null} onActiveChange={change} />);
  fireEvent.click(screen.getByText('Iniciar simulação'));
  expect(play).not.toHaveBeenCalled();
  return { ...view, play, stop, change };
}
it.each([
  ['Normalidade', 'Atenção', 'atencao'], ['Atenção', 'Alerta', 'alerta'], ['Alerta', 'Emergência', 'emergencia'],
  ['Normalidade', 'Alerta', 'alerta'], ['Normalidade', 'Emergência', 'emergencia'],
] as const)('simula %s → %s usando o alerta real', (de, para, som) => {
  const { play } = setup();
  fireEvent.click(screen.getByText(`Simular ${de}`)); play.mockClear();
  fireEvent.click(screen.getByText(`Simular ${para}`));
  expect(play).toHaveBeenCalledExactlyOnceWith(som);
  expect(screen.getByText(`${de} → ${para}`)).toBeTruthy();
  expect(screen.getByText('SIMULAÇÃO / HML — sem ocorrência operacional real')).toBeTruthy();
  fireEvent.click(screen.getByText(`Simular ${para}`)); expect(play).toHaveBeenCalledTimes(1);
});
it('simula Impacto e reconhecimento sem rede, persistência ou modificação de estado externo', () => {
  const network = vi.spyOn(globalThis, 'fetch');
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  const { play, stop } = setup();
  fireEvent.click(screen.getByText('Simular ativação de Impacto JBS')); expect(play).toHaveBeenCalledExactlyOnceWith('emergencia');
  fireEvent.click(screen.getByText('Simular ativação de Impacto JBS')); expect(play).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('Reconhecer alerta')); expect(stop).toHaveBeenCalled(); expect(screen.queryByRole('alert')).toBeNull();
  fireEvent.click(screen.getByText('Simular encerramento de Impacto JBS')); expect(play).toHaveBeenCalledTimes(1);
  expect(network).not.toHaveBeenCalled(); expect(storage).not.toHaveBeenCalled();
});
it('reset e saída param áudio, limpam aviso e estabelecem referência real sem alarme falso', () => {
  const { play, stop, change, rerender } = setup();
  fireEvent.click(screen.getByText('Simular Emergência + Impacto simultâneos')); expect(play).toHaveBeenCalledExactlyOnceWith('emergencia');
  fireEvent.click(screen.getByText('Resetar simulação')); expect(screen.queryByRole('alert')).toBeNull(); expect(stop).toHaveBeenCalled();
  expect(screen.getByText(/Nível simulado: Normalidade/)).toBeTruthy();
  rerender(<HmlAlertSimulator nivel="alerta" impactoAtivo={false} audioHost={null} onActiveChange={change} />);
  fireEvent.click(screen.getByText('Encerrar simulação e voltar aos dados reais')); expect(change).toHaveBeenLastCalledWith(false); expect(play).toHaveBeenCalledTimes(1);
  rerender(<HmlAlertSimulator nivel="emergencia" impactoAtivo={false} audioHost={null} onActiveChange={change} />);
  expect(play).toHaveBeenCalledTimes(2); expect(screen.getByText('Alerta → Emergência')).toBeTruthy();
});
it('somente desenvolvimento local ou build HML explícito habilitam a ferramenta', () => {
  expect(simulationEnabled({}, 'pages', 'build')).toBe(false);
  expect(simulationEnabled({}, 'development', 'serve')).toBe(true);
  expect(simulationEnabled({ APP_ENV:'hml', ENABLE_HML_SIMULATION:'true' }, 'pages', 'build')).toBe(true);
  expect(simulationEnabled({ APP_ENV:'production', ENABLE_HML_SIMULATION:'true' }, 'pages', 'build')).toBe(false);
  expect(simulationEnabled({ APP_ENV:'production' }, 'development', 'serve')).toBe(false);
  expect(simulationEnabled({ APP_ENV:'hml', ENABLE_HML_SIMULATION:'true', GITHUB_REPOSITORY:'EduardoLamim/el-nino-jbs-prd' }, 'pages', 'build')).toBe(false);
  expect(simulationEnabled({ APP_ENV:'hml', ENABLE_HML_SIMULATION:'true', VITE_SUPABASE_URL:'https://prd.supabase.co' }, 'pages', 'build')).toBe(false);
});
