import type { NivelJbs } from '../domain/contracts';

export const alarmFiles = { atencao: 'alarm_level_1.mp3', alerta: 'alarm_level_2.mp3', emergencia: 'alarm_level_3.mp3' } as const;
/** One active, finite MP3. All media elements are unlocked in the operator gesture. */
export class AlertAudio {
  private media: Partial<Record<keyof typeof alarmFiles, HTMLAudioElement>> = {};
  private current: HTMLAudioElement | null = null;
  private level: NivelJbs | null = null;
  private enabled = false;
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private changed: (playing: boolean) => void = () => {}) {}
  async enable() {
    if (this.enabled) return;
    const generation = ++this.generation;
    try {
      await Promise.all(Object.entries(alarmFiles).map(async ([level, file]) => {
        const media = this.media[level as keyof typeof alarmFiles] ??= new Audio(`${import.meta.env.BASE_URL}assets/${file}`);
        media.loop = false; media.volume = 0;
        await media.play(); media.pause(); media.currentTime = 0; media.volume = 1;
      }));
      if (generation !== this.generation) throw new Error('Habilitação interrompida');
      this.enabled = true;
    } catch (e) { this.enabled = false; this.stop(); throw e; }
  }
  async play(nivel: NivelJbs, test = false): Promise<boolean> {
    if (nivel === 'normalidade') return true;
    if (!this.enabled) return false;
    if (this.current && this.level === 'emergencia') return true;
    this.stop();
    const media = this.media[nivel];
    if (!media) return false;
    const generation = this.generation;
    this.current = media; this.level = nivel;
    media.currentTime = 0; media.volume = 1; media.loop = false;
    media.onended = () => { if (this.current === media) this.stop(); };
    media.onerror = () => { if (this.current === media) this.stop(); };
    try {
      await media.play();
      if (generation !== this.generation) return true;
      this.changed(true);
      // Natural end normally wins. Safety cap also prevents malformed media from running forever.
      this.timer = setTimeout(() => this.stop(), test ? 700 : 120_000);
      return true;
    } catch {
      if (generation === this.generation) { this.enabled = false; this.stop(); }
      return false;
    }
  }
  stop() {
    this.generation++; clearTimeout(this.timer);
    for (const media of Object.values(this.media)) { media.pause(); media.currentTime = 0; }
    this.current = null; this.level = null; this.changed(false);
  }
  dispose() { this.enabled = false; this.stop(); for (const media of Object.values(this.media)) { media.onended = null; media.onerror = null; media.removeAttribute('src'); media.load(); } this.media = {}; }
}
