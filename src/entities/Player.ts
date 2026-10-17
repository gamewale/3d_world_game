import * as THREE from 'three';
import { InputManager } from '../core/InputManager';
import { SoundManager } from '../core/SoundManager';

export class Player {
  public readonly mesh: THREE.Group;
  public readonly velocity = new THREE.Vector3();

  private readonly walkSpeed = 7.5;
  private readonly sprintSpeed = 13.0;
  private readonly jumpVelocity = 9.8;
  private readonly gravity = -24.0;

  private readonly collisionRadius = 0.42;
  private readonly collisionHeight = 1.8;
  private readonly stepHeight = 0.48;

  private isGrounded = true;
  private isInWater = false;
  private currentFacingAngle = 0;

  private visualRoot!: THREE.Group;
  private headGroup!: THREE.Group;
  private leftArmPivot!: THREE.Group;
  private rightArmPivot!: THREE.Group;
  private leftLegPivot!: THREE.Group;
  private rightLegPivot!: THREE.Group;
  private walkCycleTime = 0;
  private idleTime = 0;

  constructor(startPosition = new THREE.Vector3(0, 0, 26)) {
    this.mesh = this.buildCharacterMesh();
    this.mesh.position.copy(startPosition);
  }

  private buildCharacterMesh(): THREE.Group {
    const root = new THREE.Group();
    this.visualRoot = new THREE.Group();
    root.add(this.visualRoot);

    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      roughness: 0.35,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xff4ecd,
      roughness: 0.4,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0xf8f9fa,
      roughness: 0.5,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffcba4,
      roughness: 0.6,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1a0b2e,
      roughness: 0.7,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x120824,
      emissive: 0xff4ecd,
      emissiveIntensity: 0.5,
      roughness: 0.15,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0xff2a85,
      roughness: 0.4,
    });

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.68, 0.32),
      jacketMat
    );
    torso.position.set(0, 1.04, 0);
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.visualRoot.add(torso);

    const shirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.66, 0.34),
      shirtMat
    );
    shirt.position.set(0, 1.04, 0);
    this.visualRoot.add(shirt);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.42, 0);
    this.visualRoot.add(this.headGroup);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, 0.42),
      skinMat
    );
    head.position.set(0, 0.21, 0);
    head.castShadow = true;
    this.headGroup.add(head);

    const hair = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.16, 0.46),
      hairMat
    );
    hair.position.set(0, 0.42, 0.02);
    hair.castShadow = true;
    this.headGroup.add(hair);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.13, 0.12),
      visorMat
    );
    visor.position.set(0, 0.24, -0.19);
    this.headGroup.add(visor);

    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.39, 1.32, 0);
    this.visualRoot.add(this.leftArmPivot);

    const leftArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.56, 0.18),
      jacketMat
    );
    leftArm.position.set(0, -0.24, 0);
    leftArm.castShadow = true;
    this.leftArmPivot.add(leftArm);

    const leftHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      skinMat
    );
    leftHand.position.set(0, -0.55, 0);
    this.leftArmPivot.add(leftHand);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.39, 1.32, 0);
    this.visualRoot.add(this.rightArmPivot);

    const rightArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.56, 0.18),
      jacketMat
    );
    rightArm.position.set(0, -0.24, 0);
    rightArm.castShadow = true;
    this.rightArmPivot.add(rightArm);

    const rightHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      skinMat
    );
    rightHand.position.set(0, -0.55, 0);
    this.rightArmPivot.add(rightHand);

    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.16, 0.7, 0);
    this.visualRoot.add(this.leftLegPivot);

    const leftLeg = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.58, 0.22),
      pantsMat
    );
    leftLeg.position.set(0, -0.29, 0);
    leftLeg.castShadow = true;
    this.leftLegPivot.add(leftLeg);

    const leftShoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 0.32),
      shoeMat
    );
    leftShoe.position.set(0, -0.63, -0.04);
    this.leftLegPivot.add(leftShoe);

    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.16, 0.7, 0);
    this.visualRoot.add(this.rightLegPivot);

    const rightLeg = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.58, 0.22),
      pantsMat
    );
    rightLeg.position.set(0, -0.29, 0);
    rightLeg.castShadow = true;
    this.rightLegPivot.add(rightLeg);

    const rightShoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 0.32),
      shoeMat
    );
    rightShoe.position.set(0, -0.63, -0.04);
    this.rightLegPivot.add(rightShoe);

    return root;
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
    soundManager: SoundManager
  ): void {
    const wasInWater = this.isInWater;
    this.isInWater = this.isOverPoolBasin() && this.mesh.position.y < -0.15;

    // Trigger splash sound the exact frame the player enters the pool water
    if (!wasInWater && this.isInWater) {
      soundManager.playPoolSplashSound();
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

      const waterDrag = this.isInWater ? 0.72 : 1.0;
      const speed =
        (isSprinting ? this.sprintSpeed : this.walkSpeed) * waterDrag;

      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;

      const targetAngle = Math.atan2(-moveDir.x, -moveDir.z);
      this.currentFacingAngle = this.lerpAngle(
        this.currentFacingAngle,
        targetAngle,
        1 - Math.exp(-14 * deltaTime)
      );
      this.mesh.rotation.y = this.currentFacingAngle;
    } else {
      const damping = Math.exp(-16 * deltaTime);
      this.velocity.x *= damping;
      this.velocity.z *= damping;
    }

    if ((this.isGrounded || this.isInWater) && input.wasKeyJustPressed('Space')) {
      this.velocity.y = this.isInWater ? 8.8 : this.jumpVelocity;
      this.isGrounded = false;
    }

    const effectiveGravity = this.isInWater ? this.gravity * 0.55 : this.gravity;
    this.velocity.y += effectiveGravity * deltaTime;

    this.moveHorizontalAxis('x', this.velocity.x * deltaTime, colliders);
    this.moveHorizontalAxis('z', this.velocity.z * deltaTime, colliders);
    this.moveVerticalAxis(this.velocity.y * deltaTime, colliders);

    this.updateCharacterAnimation(deltaTime, isSprinting);
  }

  private updateCharacterAnimation(deltaTime: number, isSprinting: boolean): void {
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const blend = 1 - Math.exp(-15 * deltaTime);

    if (!this.isGrounded && !this.isInWater) {
      this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(
        this.leftArmPivot.rotation.x,
        -2.2,
        blend
      );
      this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(
        this.rightArmPivot.rotation.x,
        -2.2,
        blend
      );
      this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(
        this.leftLegPivot.rotation.x,
        -0.55,
        blend
      );
      this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(
        this.rightLegPivot.rotation.x,
        0.45,
        blend
      );
      this.visualRoot.position.y = THREE.MathUtils.lerp(
        this.visualRoot.position.y,
        0,
        blend
      );
      return;
    }

    if (horizontalSpeed > 0.4) {
      const freq = isSprinting ? 15.0 : 10.5;
      const swingAmp = isSprinting ? 0.85 : 0.55;
      this.walkCycleTime += deltaTime * freq;

      const legSwing = Math.sin(this.walkCycleTime) * swingAmp;
      const armSwing = this.isInWater ? -legSwing * 1.35 : -legSwing * 0.9;

      this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(
        this.leftLegPivot.rotation.x,
        legSwing,
        blend
      );
      this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(
        this.rightLegPivot.rotation.x,
        -legSwing,
        blend
      );
      this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(
        this.leftArmPivot.rotation.x,
        armSwing,
        blend
      );
      this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(
        this.rightArmPivot.rotation.x,
        -armSwing,
        blend
      );

      this.visualRoot.position.y = Math.abs(Math.sin(this.walkCycleTime)) * 0.06;
    } else {
      this.idleTime += deltaTime * 2.5;
      this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(
        this.leftLegPivot.rotation.x,
        0,
        blend
      );
      this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(
        this.rightLegPivot.rotation.x,
        0,
        blend
      );
      this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(
        this.leftArmPivot.rotation.x,
        0,
        blend
      );
      this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(
        this.rightArmPivot.rotation.x,
        0,
        blend
      );
      this.visualRoot.position.y = Math.sin(this.idleTime) * 0.015;
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