/** Three short pulses, ending within 2.4 seconds; no timers or looping media. */
export class AlertAudio {
  private context: AudioContext | null = null;
  private nodes: OscillatorNode[] = [];
  async enable() {
    this.context ??= new AudioContext();
    await this.context.resume();
    if (this.context.state !== 'running') throw new Error('Áudio bloqueado');
  }
  play() {
    this.stop();
    const context = this.context;
    if (!context || context.state !== 'running') return false;
    for (let i = 0; i < 3; i++) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + i * 0.8;
      oscillator.frequency.value = i === 1 ? 880 : 660;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
      gain.gain.setValueAtTime(0.15, start + 0.35);
      gain.gain.linearRampToValueAtTime(0, start + 0.45);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(start + 0.5);
      this.nodes.push(oscillator);
    }
    return true;
  }
  stop() {
    for (const node of this.nodes) { try { node.stop(); } catch { /* Already ended. */ } }
    this.nodes = [];
  }
  dispose() { this.stop(); void this.context?.close().catch(() => {}); this.context = null; }
}
