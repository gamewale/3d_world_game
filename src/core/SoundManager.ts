export class SoundManager {
  private trapAudio: HTMLAudioElement;
  private poolSplashAudio: HTMLAudioElement;
  private duckCollisionAudio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private lastSplashTime = 0;

  constructor() {
    this.trapAudio = new Audio('/are-baap-re-yaad-aya.mp3');
    this.trapAudio.preload = 'auto';
    this.trapAudio.volume = 1.0;

    this.poolSplashAudio = new Audio('/ghop-gop-gop.mp3');
    this.poolSplashAudio.preload = 'auto';
    this.poolSplashAudio.volume = 0.9;

    this.duckCollisionAudio = new Audio('/teri-maa-ka-bosda-fat-jaga.mp3');
    this.duckCollisionAudio.preload = 'auto';
    this.duckCollisionAudio.volume = 1.0;
  }

  public playTrapSound(): void {
    this.trapAudio.currentTime = 0;
    this.trapAudio.play().catch((err) => {
      console.warn('Could not play /are-baap-re-yaad-aya.mp3:', err);
    });
    this.playMetallicGateSlam();
  }

  public playPoolSplashSound(): void {
    const now = Date.now();
    // Debounce splash sound for 2 seconds so it doesn't spam while moving in water
    if (now - this.lastSplashTime < 2000) return;
    this.lastSplashTime = now;

    this.poolSplashAudio.currentTime = 0;
    this.poolSplashAudio.play().catch((err) => {
      console.warn(
        'Could not play /ghop-gop-gop.mp3. Make sure the file is inside the public/ folder:',
        err
      );
    });
  }

  public playDuckCollisionSound(): void {
    this.duckCollisionAudio.currentTime = 0;
    this.duckCollisionAudio.play().catch((err) => {
      console.warn('Could not play /teri-maa-ka-bosda-fat-jaga.mp3:', err);
    });
  }

  public playUnlockSound(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.12);
      osc.frequency.setValueAtTime(783.99, now + 0.24);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } catch {
      // Ignore
    }
  }

  private playMetallicGateSlam(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Ignore
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new window.AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }
}
