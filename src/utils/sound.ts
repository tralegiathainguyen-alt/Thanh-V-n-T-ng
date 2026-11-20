class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08, delay = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  click() {
    // Pentatonic guzheng pluck
    this.playTone(587.33, 0.14, 'triangle', 0.06);
  }

  harvest() {
    this.playTone(523.25, 0.14, 'sine', 0.07, 0);
    this.playTone(659.25, 0.18, 'sine', 0.07, 0.06);
    this.playTone(783.99, 0.24, 'triangle', 0.06, 0.12);
  }

  upgrade() {
    this.playTone(440, 0.15, 'triangle', 0.07, 0);
    this.playTone(587.33, 0.18, 'triangle', 0.08, 0.08);
    this.playTone(880, 0.3, 'sine', 0.08, 0.16);
  }

  attack() {
    this.playTone(260, 0.12, 'sawtooth', 0.05, 0);
    this.playTone(170, 0.14, 'triangle', 0.06, 0.04);
  }

  combo(chain: number) {
    const notes = [523.25, 587.33, 659.25, 783.99, 1046.5];
    const count = Math.min(chain + 1, notes.length);
    for (let i = 0; i < count; i++) {
      this.playTone(notes[i], 0.28, 'triangle', 0.09, i * 0.07);
    }
  }

  breakthrough(success: boolean) {
    if (success) {
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((n, idx) => {
        this.playTone(n, 0.45, 'triangle', 0.09, idx * 0.09);
      });
    } else {
      this.playTone(220, 0.3, 'sawtooth', 0.07, 0);
      this.playTone(165, 0.4, 'sawtooth', 0.06, 0.15);
    }
  }

  victory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((n, idx) => {
      this.playTone(n, 0.35, 'triangle', 0.08, idx * 0.1);
    });
  }
}

export const sfx = new SoundEngine();
