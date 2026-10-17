import * as THREE from 'three';
import { World } from '../world/World';
import { InputManager } from './InputManager';
import { Player } from '../entities/Player';
import { ThirdPersonCamera } from './ThirdPersonCamera';
import { HUD } from '../ui/HUD';
import { InteractionSystem } from '../systems/InteractionSystem';
import { MissionManager } from '../systems/MissionManager';
import { SoundManager } from './SoundManager';

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
  private missionManager: MissionManager;

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
      300
    );

    this.world = new World();
    this.input = new InputManager(this.renderer.domElement);
    this.player = new Player(new THREE.Vector3(0, 0, 26));
    this.world.scene.add(this.player.mesh);

    this.thirdPersonCamera = new ThirdPersonCamera(this.camera, this.player.mesh);

    this.hud = new HUD();
    this.interactionSystem = new InteractionSystem(this.hud);
    this.soundManager = new SoundManager();
    this.missionManager = new MissionManager(
      this.world,
      this.player,
      this.hud,
      this.interactionSystem,
      this.soundManager
    );

    window.addEventListener('resize', this.onWindowResize);
  }

  public start(): void {
    this.clock.start();
    this.renderer.setAnimationLoop(this.update);
  }

  private update = (): void => {
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.player.update(
      deltaTime,
      this.input,
      this.thirdPersonCamera.yaw,
      this.world.colliders
    );

    this.thirdPersonCamera.update(
      deltaTime,
      this.input,
      this.world.colliders
    );

    this.interactionSystem.update(this.player.mesh.position, this.input);
    this.missionManager.update(this.input);
    if (this.world.pushDuckFromPlayer(this.player.mesh.position, deltaTime)) {
      this.soundManager.playDuckCollisionSound();
    }
    this.world.update(deltaTime);

    this.renderer.render(this.world.scene, this.camera);
    this.input.endFrame();
  };

  private onWindowResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
