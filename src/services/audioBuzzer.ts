class AudioBuzzerService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Triggers a piezoelectric warning buzzer pattern (3 sharp beeps)
   * used when food condition is BAD.
   */
  playWarningPattern() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const beeps = [0, 0.22, 0.44]; // 3 quick pulses

      beeps.forEach((delay) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        // 2400Hz resonant piezo frequency
        osc.type = 'square';
        osc.frequency.setValueAtTime(2400, now + delay);

        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.02);
        gain.gain.setValueAtTime(0.18, now + delay + 0.12);
        gain.gain.linearRampToValueAtTime(0, now + delay + 0.15);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.16);
      });
    } catch (e) {
      console.warn('Web Audio buzzer simulation error:', e);
    }
  }

  /**
   * Pleasant single chime for GOOD condition
   */
  playSuccessChime() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn('Web Audio success chime error:', e);
    }
  }
}

export const audioBuzzer = new AudioBuzzerService();

