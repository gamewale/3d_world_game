export class InputManager {
  private keys: Set<string> = new Set();
  private justPressedKeys: Set<string> = new Set();

  public mouseDeltaX = 0;
  public mouseDeltaY = 0;
  public isPointerLocked = false;

  private domElement: HTMLElement;

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    // Click canvas to lock pointer
    this.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.domElement.requestPointerLock();
      }
    });
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.keys.has(event.code)) {
      this.justPressedKeys.add(event.code);
    }
    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isPointerLocked) return;
    this.mouseDeltaX += event.movementX;
    this.mouseDeltaY += event.movementY;
  };

  private onPointerLockChange = (): void => {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
    const promptEl = document.getElementById('controls-hint');
    if (promptEl) {
      promptEl.textContent = this.isPointerLocked
        ? 'WASD: Move | Shift: Sprint | Space: Jump | V: Change View | Mouse: Look | ESC: Unlock Cursor'
        : 'Click anywhere on the screen to lock mouse & control player';
    }
  };

  public isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  public wasKeyJustPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  /**
   * Call at the end of every frame to clear single-frame deltas and presses.
   */
  public endFrame(): void {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.justPressedKeys.clear();
  }
}
