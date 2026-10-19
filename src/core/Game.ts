import * as THREE from 'three';
import { World } from '../world/World';
import { InputManager } from './InputManager';
import { Player } from '../entities/Player';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { HUD } from '../ui/HUD';
import { InteractionSystem } from '../systems/InteractionSystem';
import { MissionManager } from '../systems/MissionManager';
import { SoundManager } from './SoundManager';
import { MiniMap } from '../ui/MiniMap';

export class Game {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private world: World;
  private input: InputManager;
  private player: Player;
  private thirdPersonCamera: ThirdPersonCamera;
  private hud: HUD;
  private interactionSystem: InteractionSystem;
  private soundManager: SoundManager;
  private miniMap: MiniMap;
  private missionManager: MissionManager;
  private wasPlayerFalling = false;
  private isDriving = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1600
    );

    this.world = new World();
    this.input = new InputManager(this.renderer.domElement);
    this.player = new Player(new THREE.Vector3(0, 0, 26));
    this.world.scene.add(this.player.mesh);

    this.thirdPersonCamera = new ThirdPersonCamera(this.camera, this.player.mesh);

    this.hud = new HUD();
    this.miniMap = new MiniMap();
    this.interactionSystem = new InteractionSystem(this.hud);
    this.soundManager = new SoundManager();
    this.missionManager = new MissionManager(
      this.world,
      this.player,
      this.hud,
      this.interactionSystem,
      this.soundManager
    );
    this.interactionSystem.register({
      id: 'courtyard-bar-door',
      position: this.world.barDoorPosition,
      radius: 2.3,
      promptText: '[E] Open the bar door',
      isEnabled: () => !this.world.isBarDoorOpen,
      onInteract: () => this.world.openBarDoor(this.player.mesh.position),
    });
    this.interactionSystem.register({
      id: 'bathroom-door',
      position: this.world.bathroomDoorPosition,
      radius: 2.2,
      promptText: '[E] Open bathroom door',
      isEnabled: () => !this.world.isBathroomDoorOpen,
      onInteract: () => this.world.openBathroomDoor(this.player.mesh.position),
    });
    this.interactionSystem.register({
      id: 'backyard-door',
      position: this.world.backyardDoorPosition,
      radius: 2.3,
      promptText: '[E] Open back door',
      isEnabled: () => !this.world.isBackyardDoorOpen,
      onInteract: () => this.world.openBackyardDoor(this.player.mesh.position),
    });

    window.addEventListener('resize', this.onWindowResize);
  }

  public start(): void {
    this.clock.start();
    this.renderer.setAnimationLoop(this.update);
  }

  private update = (): void => {
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const worldDeltaTime = this.player.isInSlowMotionFall
      ? deltaTime * 0.28
      : deltaTime;

    // Move NPCs and refresh their colliders before resolving player movement.
    this.world.update(worldDeltaTime, this.player.mesh.position);

    if (this.input.wasKeyJustPressed('KeyC') && this.player.playPhoneCallAnimation()) {
      this.soundManager.playPhoneCallSound();
    }

    if (this.isDriving && this.input.wasKeyJustPressed('KeyF')) {
      const exitPosition = this.world.getCarExitPosition(new THREE.Vector3());
      if (exitPosition) this.player.mesh.position.copy(exitPosition);
      this.player.setVehicleMode(false);
      this.isDriving = false;
    } else if (
      !this.isDriving &&
      this.input.wasKeyJustPressed('KeyF') &&
      this.world.car &&
      this.player.mesh.position.distanceTo(this.world.car.position) < 3.6
    ) {
      this.isDriving = true;
      this.player.setVehicleMode(true);
    }

    if (this.isDriving && this.world.car) {
      const throttle =
        (this.input.isKeyDown('KeyW') || this.input.isKeyDown('ArrowUp') ? 1 : 0) -
        (this.input.isKeyDown('KeyS') || this.input.isKeyDown('ArrowDown') ? 1 : 0);
      const steering =
        (this.input.isKeyDown('KeyD') || this.input.isKeyDown('ArrowRight') ? 1 : 0) -
        (this.input.isKeyDown('KeyA') || this.input.isKeyDown('ArrowLeft') ? 1 : 0);
      this.world.updateCar(deltaTime, throttle, steering);
      const seatPosition = this.world.getCarSeatPosition(new THREE.Vector3());
      if (seatPosition) {
        this.player.updateInVehicle(seatPosition, this.world.car.rotation.y, deltaTime);
      }
    } else {
      this.player.update(
        deltaTime,
        this.input,
        this.thirdPersonCamera.yaw,
        this.world.colliders,
        this.world.isPlayerInsideBar(this.player.mesh.position)
      );
    }
    this.miniMap.update(
      this.player.mesh.position.x,
      this.player.mesh.position.z,
      this.player.mesh.rotation.y
    );
    if (this.player.phoneCallWasCancelledThisFrame) {
      this.soundManager.stopPhoneCallSound();
    }

    const biscuitCartPosition = this.world.biscuitCartPosition;
    if (biscuitCartPosition) {
      this.soundManager.updateBiscuitCartAudio(
        this.player.mesh.position,
        biscuitCartPosition,
        deltaTime
      );
    }

    const isPlayerFalling = this.player.isInSlowMotionFall;
    if (isPlayerFalling && !this.wasPlayerFalling) {
      this.soundManager.playStairFallSound();
    }
    this.wasPlayerFalling = isPlayerFalling;

    this.thirdPersonCamera.setFallViewActive(isPlayerFalling);

    this.thirdPersonCamera.update(
      isPlayerFalling ? deltaTime * 0.28 : deltaTime,
      this.input,
      this.world.colliders
    );

    if (this.isDriving) {
      this.hud.setInteractionPrompt('[F] Exit car · WASD / arrows to drive');
    } else {
      this.interactionSystem.update(this.player.mesh.position, this.input);
      if (
        this.world.car &&
        this.player.mesh.position.distanceTo(this.world.car.position) < 3.6
      ) {
        this.hud.setInteractionPrompt('[F] Get in car');
      }
    }
    this.missionManager.update(this.input);
    if (this.world.pushDuckFromPlayer(this.player.mesh.position, deltaTime)) {
      this.soundManager.playDuckCollisionSound();
    }
    if (this.world.didPlayerTouchGranny(this.player.mesh.position)) {
      this.soundManager.playGrannyCollisionSound();
    }
    this.soundManager.setBarMusicActive(
      this.world.isPlayerInsideBar(this.player.mesh.position)
    );
    this.soundManager.setTempleMusicActive(
      this.world.isPlayerInsideTemple(this.player.mesh.position)
    );
    this.soundManager.setJuiceStallReached(
      this.world.isPlayerAtJuiceStall(this.player.mesh.position)
    );
    const isInsideBar = this.world.isPlayerInsideBar(this.player.mesh.position);
    this.hud.setBarMusicControlsActive(isInsideBar);
    if (isInsideBar && this.input.wasKeyJustPressed('KeyN')) {
      this.hud.showBanner(`Now playing: ${this.soundManager.nextBarTrack()}`, 2500);
    } else if (isInsideBar && this.input.wasKeyJustPressed('KeyP')) {
      this.hud.showBanner(`Now playing: ${this.soundManager.previousBarTrack()}`, 2500);
    }
    this.renderer.render(this.world.scene, this.camera);
    this.input.endFrame();
  };

  private onWindowResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
