export class HUD {
  private badgeEl: HTMLElement;
  private objectiveEl: HTMLElement;
  private bannerEl: HTMLElement;
  private interactEl: HTMLElement;
  private barMusicControlsEl: HTMLElement;
  private bannerTimeout: number | null = null;

  constructor() {
    this.badgeEl = document.getElementById('phase-badge')!;
    this.objectiveEl = document.getElementById('objective-text')!;
    this.bannerEl = document.getElementById('status-banner')!;
    this.interactEl = document.getElementById('interaction-prompt')!;
    this.barMusicControlsEl = document.getElementById('bar-music-controls')!;
  }

  public setObjective(badgeText: string, objectiveText: string): void {
    if (this.badgeEl) this.badgeEl.textContent = badgeText;
    if (this.objectiveEl) this.objectiveEl.textContent = objectiveText;
  }

  public showBanner(message: string, durationMs = 4000): void {
    if (!this.bannerEl) return;

    this.bannerEl.textContent = message;
    this.bannerEl.classList.remove('hidden');

    if (this.bannerTimeout !== null) {
      window.clearTimeout(this.bannerTimeout);
    }

    if (durationMs > 0) {
      this.bannerTimeout = window.setTimeout(() => {
        this.bannerEl.classList.add('hidden');
      }, durationMs);
    }
  }

  public hideBanner(): void {
    if (!this.bannerEl) return;
    this.bannerEl.classList.add('hidden');
  }

  public setInteractionPrompt(promptText: string | null): void {
    if (!this.interactEl) return;
    if (promptText) {
      this.interactEl.textContent = promptText;
      this.interactEl.classList.remove('hidden');
    } else {
      this.interactEl.classList.add('hidden');
    }
  }

  public setBarMusicControlsActive(active: boolean): void {
    if (!this.barMusicControlsEl) return;
    this.barMusicControlsEl.classList.toggle('hidden', !active);
  }
}
