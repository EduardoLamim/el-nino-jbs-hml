import type { NivelJbs } from '../domain/contracts';

/** Finite Web Audio patterns, selected exclusively by destination level. */
export class AlertAudio {
  private context: AudioContext | null = null;
  private nodes: OscillatorNode[] = [];
  private criticalUntil = 0;
  async enable() {
    this.context ??= new AudioContext();
    await this.context.resume();
    if (this.context.state !== 'running') throw new Error('Áudio bloqueado');
  }
  play(nivel: NivelJbs) {
    if (nivel === 'normalidade') return true;
    const context = this.context;
    if (!context || context.state !== 'running') return false;
    // A simultaneous Impacto/ Emergência shares the existing finite siren.
    if (context.currentTime < this.criticalUntil) return true;
    this.stop();
    const sirene = nivel === 'emergencia';
    if (sirene) this.criticalUntil = context.currentTime + 6;
    const count = sirene ? 1 : nivel === 'atencao' ? 2 : 6;
    const spacing = nivel === 'atencao' ? 0.6 : 0.35;
    const duration = sirene ? 6 : nivel === 'atencao' ? 0.22 : 0.2;
    const volume = nivel === 'atencao' ? 0.07 : 0.15;
    for (let i = 0; i < count; i++) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + i * spacing;
      oscillator.frequency.setValueAtTime(sirene ? 440 : nivel === 'atencao' ? 520 : i % 2 ? 1100 : 800, start);
      if (sirene) {
        for (let sweep = 0; sweep < 6; sweep++) {
          oscillator.frequency.linearRampToValueAtTime(1100, start + sweep + 0.5);
          oscillator.frequency.linearRampToValueAtTime(440, start + sweep + 1);
        }
      }
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.03);
      gain.gain.setValueAtTime(volume, start + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, start + duration);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(start + duration);
      this.nodes.push(oscillator);
    }
    return true;
  }
  stop() {
    this.criticalUntil = 0;
    for (const node of this.nodes) { try { node.stop(); } catch { /* Already ended. */ } }
    this.nodes = [];
  }
  dispose() { this.stop(); void this.context?.close().catch(() => {}); this.context = null; }
}
