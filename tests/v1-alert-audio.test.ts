import { expect, it, vi, afterEach } from 'vitest';
import { AlertAudio } from '../src/services/alertAudio';
afterEach(() => vi.unstubAllGlobals());
it('áudio requer habilitação, programa somente três pulsos finitos e limpa ao reconhecer/sair', async () => {
  const nodes: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
  const close = vi.fn(async () => {});
  vi.stubGlobal('AudioContext', class {
    state = 'running'; currentTime = 10; destination = {};
    resume = vi.fn(async () => {}); close = close;
    createOscillator() { const node = { frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }; nodes.push(node); return node; }
    createGain() { return { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }; }
  });
  const audio = new AlertAudio(); expect(audio.play()).toBe(false); await audio.enable(); expect(audio.play()).toBe(true);
  expect(nodes).toHaveLength(3); expect(nodes.map(n => n.stop.mock.calls[0]?.[0])).toEqual([10.5, 11.3, 12.1]);
  audio.stop(); expect(nodes.every(n => n.stop.mock.calls.length === 2)).toBe(true); audio.dispose(); expect(close).toHaveBeenCalledOnce(); expect(audio.play()).toBe(false);
});
