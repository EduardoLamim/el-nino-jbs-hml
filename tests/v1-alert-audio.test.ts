import { expect, it, vi, afterEach } from 'vitest';
import { AlertAudio } from '../src/services/alertAudio';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
function setup() {
  const media: FakeAudio[] = [];
  class FakeAudio {
    loop = false; volume = 1; currentTime = 0; onended: (() => void) | null = null; onerror: (() => void) | null = null;
    play = vi.fn(async () => {}); pause = vi.fn(); removeAttribute = vi.fn(); load = vi.fn();
    constructor(public src: string) { media.push(this); }
  }
  vi.stubGlobal('Audio', FakeAudio); vi.useFakeTimers();
  const changed = vi.fn(); return { audio:new AlertAudio(changed), media, changed };
}
it.each([['atencao',1],['alerta',2],['emergencia',3]] as const)('%s reproduz somente MP3 level %s, sem loop', async (nivel, n) => {
  const { audio, media, changed } = setup(); expect(await audio.play(nivel)).toBe(false);
  await audio.enable(); media.forEach(m=>m.play.mockClear());
  expect(await audio.play(nivel)).toBe(true); expect(media[n-1]!.src).toContain(`alarm_level_${n}.mp3`);
  expect(media.filter(m=>m.play.mock.calls.length)).toHaveLength(1); expect(media[n-1]!.loop).toBe(false);
  expect(changed).toHaveBeenLastCalledWith(true);
  media[n-1]!.onended?.(); expect(changed).toHaveBeenLastCalledWith(false); audio.dispose();
});
it('Parar som interrompe imediatamente; crítico simultâneo não sobrepõe; teste é curto', async () => {
  const { audio, media, changed } = setup(); await audio.enable(); media.forEach(m=>m.play.mockClear());
  await audio.play('emergencia'); await audio.play('emergencia'); await audio.play('atencao'); expect(media[2]!.play).toHaveBeenCalledTimes(1); expect(media[0]!.play).not.toHaveBeenCalled();
  audio.stop(); expect(changed).toHaveBeenLastCalledWith(false); expect(media[2]!.pause).toHaveBeenCalled();
  await audio.play('atencao',true); await vi.advanceTimersByTimeAsync(700); expect(changed).toHaveBeenLastCalledWith(false);
});
it('autoplay rejeitado retorna falha; Normalidade não toca; erro de arquivo limpa reprodução', async () => {
  const { audio, media, changed } = setup(); await audio.enable();
  media.forEach(m=>m.play.mockClear()); await audio.play('normalidade'); expect(media.every(m=>!m.play.mock.calls.length)).toBe(true);
  media[1]!.play.mockRejectedValueOnce(new Error('NotAllowed')); expect(await audio.play('alerta')).toBe(false);
  await audio.enable(); await audio.play('emergencia'); media[2]!.onerror?.(); expect(changed).toHaveBeenLastCalledWith(false);
});
it('reconhecimento durante play pendente impede reprodução tardia e timer', async () => {
  const { audio, media, changed } = setup(); await audio.enable(); let resolve!:()=>void;
  media[2]!.play.mockImplementationOnce(()=>new Promise<void>(r=>{resolve=r;}));
  const pending=audio.play('emergencia'); audio.stop(); resolve(); await pending; expect(changed).toHaveBeenLastCalledWith(false); expect(vi.getTimerCount()).toBe(0);
});
