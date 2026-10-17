import * as THREE from 'three';
import { InputManager } from '../core/InputManager';
import { HUD } from '../ui/HUD';

export interface Interactable {
  id: string;
  position: THREE.Vector3;
  radius: number;
  promptText: string;
  isEnabled: () => boolean;
  onInteract: () => void;
}

export class InteractionSystem {
  private interactables: Interactable[] = [];
  private hud: HUD;

  constructor(hud: HUD) {
    this.hud = hud;
  }

  public register(item: Interactable): void {
    this.interactables.push(item);
  }

  public update(playerPosition: THREE.Vector3, input: InputManager): void {
    let closest: Interactable | null = null;
    let closestDistSq = Infinity;

    for (const item of this.interactables) {
      if (!item.isEnabled()) continue;

      const distSq = playerPosition.distanceToSquared(item.position);
      if (distSq <= item.radius * item.radius && distSq < closestDistSq) {
        closest = item;
        closestDistSq = distSq;
      }
    }

    if (closest) {
      this.hud.setInteractionPrompt(closest.promptText);
      if (input.wasKeyJustPressed('KeyE')) {
        closest.onInteract();
      }
    } else {
      this.hud.setInteractionPrompt(null);
    }
  }
}