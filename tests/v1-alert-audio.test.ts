import { expect, it, vi, afterEach } from 'vitest';
import { AlertAudio } from '../src/services/alertAudio';
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const param = () => ({ setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
  const oscillator = () => ({ frequency: param(), connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null });
  const nodes: Array<ReturnType<typeof oscillator>> = [];
  const close = vi.fn(async () => {});
  vi.stubGlobal('AudioContext', class {
    state = 'running'; currentTime = 10; destination = {};
    resume = vi.fn(async () => {}); close = close;
    createOscillator() { const node = oscillator(); nodes.push(node); return node; }
    createGain() { return { gain: param(), connect: vi.fn(), disconnect: vi.fn() }; }
  });
  return { audio: new AlertAudio(), nodes, close };
}
it.each([['atencao', 2, 0.82], ['alerta', 6, 1.95], ['emergencia', 1, 6]] as const)('%s tem padrão finito próprio e pode ser interrompido', async (nivel, count, duration) => {
  const { audio, nodes, close } = setup();
  expect(audio.play(nivel)).toBe(false); await audio.enable(); expect(audio.play(nivel)).toBe(true);
  expect(nodes).toHaveLength(count); expect(nodes.at(-1)!.stop.mock.calls[0]![0]).toBeCloseTo(10 + duration);
  if (nivel === 'emergencia') { expect(nodes[0]!.frequency.linearRampToValueAtTime).toHaveBeenCalledTimes(12); expect(nodes[0]!.frequency.linearRampToValueAtTime).toHaveBeenLastCalledWith(440, 16); }
  else expect(nodes[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(nivel === 'atencao' ? 520 : 800, 10);
  audio.stop(); expect(nodes.every(n => n.stop.mock.calls.length === 2)).toBe(true);
  audio.dispose(); expect(close).toHaveBeenCalledOnce();
});
it('Normalidade é silenciosa; sirene crítica tem prioridade sem sobreposição ou reinício', async () => {
  const { audio, nodes } = setup(); await audio.enable(); audio.play('normalidade'); expect(nodes).toHaveLength(0);
  audio.play('emergencia'); audio.play('atencao'); audio.play('emergencia'); expect(nodes).toHaveLength(1); expect(nodes[0]!.stop).toHaveBeenCalledTimes(1);
  audio.stop(); audio.play('atencao'); expect(nodes).toHaveLength(3);
});
