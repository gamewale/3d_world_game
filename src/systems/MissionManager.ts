import * as THREE from 'three';
import { World } from '../world/World';
import { Player } from '../entities/Player';
import { HUD } from '../ui/HUD';
import { InteractionSystem } from './InteractionSystem';
import { InputManager } from '../core/InputManager';
import { SoundManager } from '../core/SoundManager';
import { getNorthernCoastZ } from '../world/CityMap';

export enum MissionState {
  OUTSIDE_START = 'OUTSIDE_START',
  TRAPPED_FIND_BUTTON = 'TRAPPED_FIND_BUTTON',
  GATE_UNLOCKED_ESCAPE = 'GATE_UNLOCKED_ESCAPE',
  ESCAPED_VICTORY = 'ESCAPED_VICTORY',
}

export class MissionManager {
  private state: MissionState = MissionState.OUTSIDE_START;
  private world: World;
  private player: Player;
  private hud: HUD;
  private soundManager: SoundManager;

  constructor(
    world: World,
    player: Player,
    hud: HUD,
    interactionSystem: InteractionSystem,
    soundManager: SoundManager
  ) {
    this.world = world;
    this.player = player;
    this.hud = hud;
    this.soundManager = soundManager;

    // Register the secret button on the pedestal beside the east-side service rooms.
    interactionSystem.register({
      id: 'secret-gate-button',
      position: new THREE.Vector3(3.7, 1.0, -16.5),
      radius: 2.6,
      promptText: '[E] Press "Definitely Not A Trap" Button',
      isEnabled: () => this.state === MissionState.TRAPPED_FIND_BUTTON,
      onInteract: () => this.handleSecretButtonPressed(),
    });

    this.resetMission();
  }

  public resetMission(): void {
    this.state = MissionState.OUTSIDE_START;
    this.player.mesh.position.set(0, 2, getNorthernCoastZ(0) + 13);
    this.player.velocity.set(0, 0, 0);

    this.world.mainGate.setOpen(true);
    this.world.setButtonPressed(false);

    this.hud.hideBanner();
    this.hud.setObjective(
      'OBJECTIVE',
      'Walk through the Main Gate to check out the mysterious Villa'
    );
  }

  private handleSecretButtonPressed(): void {
    this.state = MissionState.GATE_UNLOCKED_ESCAPE;
    this.world.setButtonPressed(true);
    this.world.mainGate.setOpen(true);
    this.soundManager.playUnlockSound();

    this.hud.setObjective(
      'ESCAPE!',
      'The Main Gate is open! Run back out to the street before something else happens!'
    );
    this.hud.showBanner(
      'CLICK-CLANK! The Secret Override Button in the Study unlocked the Main Gate!',
      4500
    );
  }

  public update(input: InputManager): void {
    const playerZ = this.player.mesh.position.z;
    const playerX = this.player.mesh.position.x;

    // 1. Trigger the trap once the player walks cleanly inside the courtyard (Z < 16.0)
    if (
      this.state === MissionState.OUTSIDE_START &&
      playerZ < 16.0 &&
      Math.abs(playerX) < 18
    ) {
      this.state = MissionState.TRAPPED_FIND_BUTTON;
      this.world.mainGate.setOpen(false);

      // Play the "are-baap-re-yaad-aya.mp3" sound + metallic slam!
      this.soundManager.playTrapSound();

      this.hud.setObjective(
        'TRAPPED!',
        'Explore the Villa rooms & upstairs terrace to find the hidden gate override button'
      );
    }

    // 2. Trigger victory once the player exits past the Main Gate back onto the street (Z > 21.5)
    if (this.state === MissionState.GATE_UNLOCKED_ESCAPE && playerZ > 21.5) {
      this.state = MissionState.ESCAPED_VICTORY;

      this.hud.setObjective(
        'ESCAPED!',
        'You escaped the Chaos Villa! (Press R to play again)'
      );
      this.hud.showBanner(
        'FREEDOM! You escaped the Chaos Villa! Press [R] to replay.',
        0
      );
    }

    // 3. Allow replay after escaping
    if (
      this.state === MissionState.ESCAPED_VICTORY &&
      input.wasKeyJustPressed('KeyR')
    ) {
      this.resetMission();
    }
  }
}
