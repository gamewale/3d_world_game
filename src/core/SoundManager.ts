import * as THREE from 'three';

export class SoundManager {
  private trapAudio: HTMLAudioElement;
  private poolSplashAudio: HTMLAudioElement;
  private duckCollisionAudio: HTMLAudioElement;
  private grannyCollisionAudio: HTMLAudioElement;
  private stairFallAudio: HTMLAudioElement;
  private barMusicAudio: HTMLAudioElement;
  private isBarMusicActive = false;
  private templeMusicAudio: HTMLAudioElement;
  private isTempleMusicActive = false;
  private juiceStallAudio: HTMLAudioElement;
  private isPlayerAtJuiceStall = false;
  private biscuitCartAudio: HTMLAudioElement;
  private isBiscuitCartAudioPlaying = false;
  private biscuitCartAudioAttemptedThisVisit = false;
  private biscuitCartAudioVolume = 0;
  private previousBiscuitPlayerPosition: THREE.Vector3 | null = null;
  private previousBiscuitCartPosition: THREE.Vector3 | null = null;
  private barTrackIndex = 0;
  private readonly barTracks = [
    { path: '/bar_songs/cidxhoneysingh-song.mp3', title: 'Honey Singh' },
    { path: '/bar_songs/TUMHARI_MAA_KI_CHOO_ALL.mp3', title: 'Tumhari Maa Ki Choo All' },
  ];
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

    this.grannyCollisionAudio = new Audio('/teri-maa-ka-bosda-fat-jaga.mp3');
    this.grannyCollisionAudio.preload = 'auto';
    this.grannyCollisionAudio.volume = 1.0;

    this.stairFallAudio = new Audio('/ma-ka-bhosda-aag.mp3');
    this.stairFallAudio.preload = 'auto';
    this.stairFallAudio.volume = 1.0;

    this.barMusicAudio = this.createBarTrackAudio();

    this.templeMusicAudio = new Audio('/modi-ji-bhojyam.mp3');
    this.templeMusicAudio.preload = 'auto';
    this.templeMusicAudio.loop = true;
    this.templeMusicAudio.volume = 0.5;

    this.juiceStallAudio = new Audio('/vaste-gana-hoiyeinnn.mp3');
    this.juiceStallAudio.preload = 'auto';
    this.juiceStallAudio.volume = 0.85;

    this.biscuitCartAudio = new Audio('/nankhatai.mp3');
    this.biscuitCartAudio.preload = 'auto';
    this.biscuitCartAudio.loop = true;
    this.biscuitCartAudio.volume = 0;

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

  public playGrannyCollisionSound(): void {
    this.grannyCollisionAudio.currentTime = 0;
    this.grannyCollisionAudio.play().catch((err) => {
      console.warn('Could not play /teri-maa-ka-bosda-fat-jaga.mp3:', err);
    });
  }

  public playStairFallSound(): void {
    this.stairFallAudio.currentTime = 0;
    this.stairFallAudio.play().catch((err) => {
      console.warn('Could not play /ma-ka-bhosda-aag.mp3:', err);
    });
  }

  public setBarMusicActive(active: boolean): void {
    if (active === this.isBarMusicActive) return;
    this.isBarMusicActive = active;

    if (active) {
      this.playBarTrack();
    } else {
      this.barMusicAudio.pause();
      this.barMusicAudio.currentTime = 0;
    }
  }

  public setTempleMusicActive(active: boolean): void {
    if (active === this.isTempleMusicActive) return;
    this.isTempleMusicActive = active;

    if (active) {
      this.templeMusicAudio.play().catch((err) => {
        console.warn('Could not play /modi-ji-bhojyam.mp3:', err);
      });
    } else {
      this.templeMusicAudio.pause();
      this.templeMusicAudio.currentTime = 0;
    }
  }

  public setJuiceStallReached(reached: boolean): void {
    if (reached && !this.isPlayerAtJuiceStall) {
      this.juiceStallAudio.currentTime = 0;
      this.juiceStallAudio.play().catch((err) => {
        console.warn('Could not play /vaste-gana-hoiyeinnn.mp3:', err);
      });
    } else if (!reached && this.isPlayerAtJuiceStall) {
      this.juiceStallAudio.pause();
      this.juiceStallAudio.currentTime = 0;
    }
    this.isPlayerAtJuiceStall = reached;
  }

  public updateBiscuitCartAudio(
    playerPosition: THREE.Vector3,
    cartPosition: THREE.Vector3,
    deltaTime: number
  ): void {
    const listenRadius = 24;
    const distance = playerPosition.distanceTo(cartPosition);
    const isNearCart = distance < listenRadius;

    if (isNearCart) {
      if (!this.isBiscuitCartAudioPlaying && !this.biscuitCartAudioAttemptedThisVisit) {
        this.biscuitCartAudio.currentTime = 0;
        this.biscuitCartAudio.play().catch((err) => {
          console.warn('Could not play /nankhatai.mp3:', err);
          this.isBiscuitCartAudioPlaying = false;
        });
        this.isBiscuitCartAudioPlaying = true;
        this.biscuitCartAudioAttemptedThisVisit = true;
      }

      const proximity = THREE.MathUtils.clamp(1 - distance / listenRadius, 0, 1);
      const targetVolume = 0.85 * Math.pow(proximity, 2.4);
      const smoothing = 1 - Math.exp(-Math.max(deltaTime, 0) * 8);
      this.biscuitCartAudioVolume = THREE.MathUtils.lerp(
        this.biscuitCartAudioVolume,
        targetVolume,
        smoothing
      );
      this.biscuitCartAudio.volume = this.biscuitCartAudioVolume;

      if (this.previousBiscuitPlayerPosition && this.previousBiscuitCartPosition && deltaTime > 0) {
        const playerVelocity = playerPosition
          .clone()
          .sub(this.previousBiscuitPlayerPosition)
          .multiplyScalar(1 / deltaTime);
        const cartVelocity = cartPosition
          .clone()
          .sub(this.previousBiscuitCartPosition)
          .multiplyScalar(1 / deltaTime);
        const directionFromCartToPlayer = playerPosition.clone().sub(cartPosition);
        if (directionFromCartToPlayer.lengthSq() > 0.0001) {
          directionFromCartToPlayer.normalize();
          const closingSpeed = cartVelocity.sub(playerVelocity).dot(directionFromCartToPlayer);
          // Apply the physical Doppler ratio from the relative radial speed.
          this.biscuitCartAudio.playbackRate = THREE.MathUtils.clamp(
            343 / (343 - THREE.MathUtils.clamp(closingSpeed, -30, 30)),
            0.9,
            1.1
          );
        }
      }
    } else {
      if (this.isBiscuitCartAudioPlaying) {
        this.biscuitCartAudio.pause();
        this.biscuitCartAudio.currentTime = 0;
        this.isBiscuitCartAudioPlaying = false;
      }
      this.biscuitCartAudioAttemptedThisVisit = false;
      this.biscuitCartAudioVolume = 0;
      this.biscuitCartAudio.volume = 0;
      this.biscuitCartAudio.playbackRate = 1;
    }

    this.previousBiscuitPlayerPosition = playerPosition.clone();
    this.previousBiscuitCartPosition = cartPosition.clone();
  }

  public nextBarTrack(): string {
    this.selectBarTrack(this.barTrackIndex + 1);
    return this.getCurrentBarTrackTitle();
  }

  public previousBarTrack(): string {
    this.selectBarTrack(this.barTrackIndex - 1);
    return this.getCurrentBarTrackTitle();
  }

  public getCurrentBarTrackTitle(): string {
    return this.barTracks[this.barTrackIndex].title;
  }

  private selectBarTrack(index: number): void {
    this.barMusicAudio.pause();
    this.barMusicAudio.currentTime = 0;
    this.barTrackIndex = (index + this.barTracks.length) % this.barTracks.length;
    this.barMusicAudio = this.createBarTrackAudio();
    if (this.isBarMusicActive) this.playBarTrack();
  }

  private createBarTrackAudio(): HTMLAudioElement {
    const audio = new Audio(this.barTracks[this.barTrackIndex].path);
    audio.preload = 'auto';
    audio.loop = false;
    audio.volume = 0.45;
    audio.addEventListener('ended', () => {
      if (this.isBarMusicActive) this.nextBarTrack();
    });
    return audio;
  }

  private playBarTrack(): void {
    this.barMusicAudio.play().catch((err) => {
      console.warn(`Could not play ${this.barTracks[this.barTrackIndex].path}:`, err);
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
