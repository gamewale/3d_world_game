import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { InputManager } from '../core/InputManager';

export class Player {
  public readonly mesh: THREE.Group;
  public readonly velocity = new THREE.Vector3();

  private readonly walkSpeed = 2.5;
  private readonly sprintSpeed = 5.5;
  private readonly jumpVelocity = 9.8;
  private readonly gravity = -24.0;

  private readonly collisionRadius = 0.45;
  private readonly collisionHeight = 1.8;
  private readonly stepHeight = 0.48;

  private isGrounded = true;
  private currentFacingAngle = 0;

  // Animation system
  private mixer: THREE.AnimationMixer | null = null;
  private idleAction: THREE.AnimationAction | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private runAction: THREE.AnimationAction | null = null;
  private jumpAction: THREE.AnimationAction | null = null;
  private danceAction: THREE.AnimationAction | null = null;
  private currentAction: THREE.AnimationAction | null = null;
  private isLoaded = false;
  private isDancing = false;

  constructor(startPosition = new THREE.Vector3(0, 0, 26)) {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(startPosition);

    this.loadCharacterModel();
  }

  private loadCharacterModel(): void {
    const loader = new FBXLoader();

    // 1. Load the main character FBX mesh
    loader.load(
      '/models/character.fbx',
      (fbx) => {
        fbx.scale.set(0.01, 0.01, 0.01);
        fbx.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.mesh.add(fbx);

        this.mixer = new THREE.AnimationMixer(fbx);

        // Load all 4 animation clips (Idle, Walk, Run, Jump)
        this.loadAnimationClips(loader, fbx);
      },
      undefined,
      (err) => {
        console.warn('Could not load /models/character.fbx:', err);
      }
    );
  }

  private loadAnimationClips(loader: FBXLoader, targetModel: THREE.Object3D): void {
    if (!this.mixer) return;

    // Load Idle.fbx
    loader.load('/models/Idle.fbx', (idleFbx) => {
      const idleClip = idleFbx.animations[0];
      if (idleClip && this.mixer) {
        // FBXLoader strips the colon from Mixamo bone names. The idle export
        // uses `mixamorigHips`, while this character uses `mixamorig5Hips`.
        idleClip.tracks.forEach((track) => {
          track.name = track.name.replace(/^mixamorig(?=[A-Z])/g, 'mixamorig5');
        });
        this.idleAction = this.mixer.clipAction(idleClip, targetModel);
        this.idleAction.setEffectiveWeight(1.0);
        this.currentAction = this.idleAction;
        this.currentAction.play();
        this.isLoaded = true;
      }
    });

    // Load Walking.fbx
    loader.load('/models/Walking.fbx', (walkFbx) => {
      const walkClip = walkFbx.animations[0];
      if (walkClip && this.mixer) {
        this.removeRootMotion(walkClip);
        this.walkAction = this.mixer.clipAction(walkClip, targetModel);
        this.walkAction.setEffectiveWeight(1.0);
      }
    });

    // Load Fast Run.fbx
    loader.load('/models/Fast Run.fbx', (runFbx) => {
      const runClip = runFbx.animations[0];
      if (runClip && this.mixer) {
        this.removeRootMotion(runClip);
        this.runAction = this.mixer.clipAction(runClip, targetModel);
        this.runAction.setEffectiveWeight(1.0);
      }
    });

    // Load Jump.fbx
    loader.load('/models/Jump.fbx', (jumpFbx) => {
      const jumpClip = jumpFbx.animations[0];
      if (jumpClip && this.mixer) {
        this.jumpAction = this.mixer.clipAction(jumpClip, targetModel);
        this.jumpAction.setLoop(THREE.LoopOnce, 1);
        this.jumpAction.clampWhenFinished = true;
      }
    });

    loader.load('/models/Wave%20Hip%20Hop%20Dance.fbx', (danceFbx) => {
      const danceClip = danceFbx.animations[0];
      if (!danceClip || !this.mixer) return;

      // The player rig uses mixamorig5 bone names while Mixamo animation
      // exports generally use mixamorig, so match the existing player clips.
      danceClip.tracks.forEach((track) => {
        track.name = track.name.replace(/^mixamorig(?=[A-Z])/g, 'mixamorig5');
      });
      this.removeRootMotion(danceClip);
      this.danceAction = this.mixer.clipAction(danceClip, targetModel);
      this.danceAction.setLoop(THREE.LoopOnce, 1);
      this.danceAction.clampWhenFinished = true;
    }, undefined, (err) => {
      console.warn('Could not load /models/Wave Hip Hop Dance.fbx:', err);
    });
  }

  private removeRootMotion(clip: THREE.AnimationClip): void {
    const rootPositionTrack = clip.tracks.find(
      (track) => track.name.endsWith('Hips.position')
    );
    if (!rootPositionTrack) return;

    // The player is moved by game input. Keep the hips at the first keyed
    // position so the FBX's forward root travel cannot snap back on each loop.
    const values = rootPositionTrack.values;
    const firstPosition = [values[0], values[1], values[2]];
    for (let i = 0; i < values.length; i += 3) {
      values[i] = firstPosition[0];
      values[i + 1] = firstPosition[1];
      values[i + 2] = firstPosition[2];
    }
  }

  private setAnimation(newAction: THREE.AnimationAction | null, duration = 0.2): void {
    if (!newAction || this.currentAction === newAction) return;
    if (this.currentAction) {
      this.currentAction.fadeOut(duration);
    }
    newAction.reset().fadeIn(duration).play();
    this.currentAction = newAction;
  }

  private isOverPoolBasin(): boolean {
    const x = this.mesh.position.x;
    const z = this.mesh.position.z;
    return x > 7.15 && x < 15.85 && z > 4.15 && z < 13.85;
  }

  public update(
    deltaTime: number,
    input: InputManager,
    cameraYaw: number,
    colliders: THREE.Box3[],
    isInsideBar: boolean
  ): void {
    if (this.mixer && this.isLoaded) {
      this.mixer.update(deltaTime);
    }

    if (this.isDancing && (!isInsideBar || !this.danceAction?.isRunning())) {
      this.isDancing = false;
      if (!isInsideBar && this.currentAction === this.danceAction) {
        this.setAnimation(this.idleAction);
      }
    }
    if (
      isInsideBar &&
      input.wasKeyJustPressed('KeyD') &&
      this.isGrounded &&
      this.danceAction
    ) {
      this.isDancing = true;
      this.velocity.x = 0;
      this.velocity.z = 0;
      this.danceAction.reset().setEffectiveWeight(1).fadeIn(0.15).play();
      if (this.currentAction) this.currentAction.fadeOut(0.15);
      this.currentAction = this.danceAction;
    }

    if (this.isDancing) {
      // Keep the dance in place while gravity and floor collision continue.
      this.velocity.x = 0;
      this.velocity.z = 0;
      this.velocity.y += this.gravity * deltaTime;
      this.moveVerticalAxis(this.velocity.y * deltaTime, colliders);
      return;
    }

    let inputX = 0;
    let inputZ = 0;

    if (input.isKeyDown('KeyW') || input.isKeyDown('ArrowUp')) inputZ -= 1;
    if (input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown')) inputZ += 1;
    if (input.isKeyDown('KeyA') || input.isKeyDown('ArrowLeft')) inputX -= 1;
    if (input.isKeyDown('KeyD') || input.isKeyDown('ArrowRight')) inputX += 1;

    const moveDir = new THREE.Vector3(inputX, 0, inputZ);
    const isSprinting =
      input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight');

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

      const speed = isSprinting ? this.sprintSpeed : this.walkSpeed;

      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;

      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.currentFacingAngle = this.lerpAngle(
        this.currentFacingAngle,
        targetAngle,
        1 - Math.exp(-14 * deltaTime)
      );
      this.mesh.rotation.y = this.currentFacingAngle;

      if (this.isGrounded) {
        if (isSprinting && this.runAction) {
          this.setAnimation(this.runAction);
        } else if (this.walkAction) {
          this.setAnimation(this.walkAction);
        }
      }
    } else {
      const damping = Math.exp(-16 * deltaTime);
      this.velocity.x *= damping;
      this.velocity.z *= damping;

      if (this.isGrounded && this.idleAction && this.currentAction !== this.jumpAction) {
        this.setAnimation(this.idleAction);
      }
    }

    if (this.isGrounded && input.wasKeyJustPressed('Space')) {
      this.velocity.y = this.jumpVelocity;
      this.isGrounded = false;
      if (this.jumpAction) {
        this.setAnimation(this.jumpAction, 0.1);
      }
    }

    this.velocity.y += this.gravity * deltaTime;

    this.moveHorizontalAxis('x', this.velocity.x * deltaTime, colliders);
    this.moveHorizontalAxis('z', this.velocity.z * deltaTime, colliders);
    this.moveVerticalAxis(this.velocity.y * deltaTime, colliders);

    // A jump clip is a one-shot. Once the player lands, resume the animation
    // that matches the current input state (movement or idle).
    if (this.isGrounded && this.currentAction === this.jumpAction) {
      const hasMovementInput = inputX !== 0 || inputZ !== 0;
      const nextAction = hasMovementInput
        ? isSprinting && this.runAction
          ? this.runAction
          : this.walkAction
        : this.idleAction;
      if (nextAction) this.setAnimation(nextAction);
    }
  }

  private moveHorizontalAxis(
    axis: 'x' | 'z',
    delta: number,
    colliders: THREE.Box3[]
  ): void {
    const prevVal = this.mesh.position[axis];
    const prevY = this.mesh.position.y;

    this.mesh.position[axis] += delta;

    const hitBoxes = this.getIntersectingBoxes(colliders);
    if (hitBoxes.length === 0) return;

    let maxBoxTop = -Infinity;
    for (const box of hitBoxes) {
      if (box.max.y > maxBoxTop) {
        maxBoxTop = box.max.y;
      }
    }

    const climbAmount = maxBoxTop - prevY;
    if (this.isGrounded && climbAmount > 0 && climbAmount <= this.stepHeight) {
      this.mesh.position.y = maxBoxTop + 0.001;
      if (this.getIntersectingBoxes(colliders).length === 0) {
        return;
      }
      this.mesh.position.y = prevY;
    }

    this.mesh.position[axis] = prevVal;
    this.velocity[axis] = 0;
  }

  private moveVerticalAxis(deltaY: number, colliders: THREE.Box3[]): void {
    const prevY = this.mesh.position.y;
    this.mesh.position.y += deltaY;
    this.isGrounded = false;

    const hitBoxes = this.getIntersectingBoxes(colliders);

    if (deltaY <= 0) {
      // The pool basin top is at -1.25m; let the player walk on that bottom.
      let highestFloor = this.isOverPoolBasin() ? -1.25 : 0;

      for (const box of hitBoxes) {
        if (prevY >= box.max.y - 0.25 && box.max.y > highestFloor) {
          highestFloor = box.max.y;
        }
      }

      if (this.mesh.position.y <= highestFloor) {
        this.mesh.position.y = highestFloor;
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    } else {
      for (const box of hitBoxes) {
        if (prevY + this.collisionHeight <= box.min.y + 0.25) {
          this.mesh.position.y = box.min.y - this.collisionHeight - 0.01;
          this.velocity.y = 0;
          break;
        }
      }
    }
  }

  private getIntersectingBoxes(colliders: THREE.Box3[]): THREE.Box3[] {
    const pos = this.mesh.position;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(
        pos.x - this.collisionRadius,
        pos.y + 0.02,
        pos.z - this.collisionRadius
      ),
      new THREE.Vector3(
        pos.x + this.collisionRadius,
        pos.y + this.collisionHeight,
        pos.z + this.collisionRadius
      )
    );

    const hits: THREE.Box3[] = [];
    for (const box of colliders) {
      if (playerBox.intersectsBox(box)) {
        hits.push(box);
      }
    }
    return hits;
  }

  private lerpAngle(start: number, end: number, t: number): number {
    let diff = ((end - start + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return start + diff * t;
  }
}
