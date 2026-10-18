import * as THREE from 'three';
import { InputManager } from './InputManager';

export class ThirdPersonCamera {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Object3D;

  public yaw = 0; // Horizontal orbit angle (radians)
  private pitch = 0.32; // Vertical orbit angle (radians)
  private isFirstPerson = false;
  private isFallViewActive = false;
  private firstPersonBeforeFall = false;

  private readonly maxDistance = 6.5;
  private readonly minDistance = 0.8;
  private currentDistance = 6.5;

  private readonly lookAtHeight = 1.5;
  private readonly mouseSensitivity = 0.0022;
  private readonly wallOffset = 0.35; // Keep camera slightly in front of hit walls

  private currentLookAt = new THREE.Vector3();
  private ray = new THREE.Ray();
  private rayHitPoint = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, target: THREE.Object3D) {
    this.camera = camera;
    this.target = target;

    this.currentLookAt
      .copy(this.target.position)
      .add(new THREE.Vector3(0, this.lookAtHeight, 0));
    this.updateCameraTransform(1.0, []);
  }

  public update(
    deltaTime: number,
    input: InputManager,
    colliders: THREE.Box3[]
  ): void {
    if (!this.isFallViewActive && input.wasKeyJustPressed('KeyV')) {
      this.isFirstPerson = !this.isFirstPerson;
      this.target.visible = !this.isFirstPerson;
    }

    this.yaw -= input.mouseDeltaX * this.mouseSensitivity;
    this.pitch += input.mouseDeltaY * this.mouseSensitivity;

    const minPitch = -0.25;
    const maxPitch = 1.15;
    this.pitch = Math.max(minPitch, Math.min(maxPitch, this.pitch));

    if (this.isFallViewActive) {
      this.updateFallViewTransform();
      return;
    }
    if (this.isFirstPerson) {
      this.updateFirstPersonTransform();
      return;
    }

    const smoothFactor = 1 - Math.exp(-18 * deltaTime);
    this.updateCameraTransform(smoothFactor, colliders);
  }

  private updateFallViewTransform(): void {
    const playerPosition = this.target.position;
    const eye = new THREE.Vector3(
      playerPosition.x,
      playerPosition.y + 1.58,
      playerPosition.z
    );
    const lookAhead = 2.4;
    const stairSlope = 0.35 / 0.55;
    const stairLookAt = new THREE.Vector3(
      playerPosition.x + lookAhead,
      Math.max(0.05, playerPosition.y - lookAhead * stairSlope - 0.05),
      THREE.MathUtils.lerp(playerPosition.z, -18.68, 0.65)
    );
    this.camera.position.copy(eye);
    this.camera.lookAt(stairLookAt);
  }

  public setFallViewActive(active: boolean): void {
    if (active === this.isFallViewActive) return;
    this.isFallViewActive = active;
    if (active) {
      this.firstPersonBeforeFall = this.isFirstPerson;
      this.target.visible = false;
    } else {
      this.isFirstPerson = this.firstPersonBeforeFall;
      this.target.visible = !this.isFirstPerson;
      this.currentDistance = this.minDistance;
    }
  }

  private updateFirstPersonTransform(): void {
    const eye = new THREE.Vector3(
      this.target.position.x,
      this.target.position.y + 1.58,
      this.target.position.z
    );
    const cosPitch = Math.cos(this.pitch);
    const lookDirection = new THREE.Vector3(
      -cosPitch * Math.sin(this.yaw),
      -Math.sin(this.pitch),
      -cosPitch * Math.cos(this.yaw)
    );
    this.camera.position.copy(eye);
    this.camera.lookAt(eye.clone().add(lookDirection));
  }

  private updateCameraTransform(
    smoothFactor: number,
    colliders: THREE.Box3[]
  ): void {
    const desiredLookAt = new THREE.Vector3(
      this.target.position.x,
      this.target.position.y + this.lookAtHeight,
      this.target.position.z
    );

    this.currentLookAt.lerp(desiredLookAt, smoothFactor);

    // Compute unit direction vector from pivot to ideal camera position
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);

    const dir = new THREE.Vector3(
      cosPitch * Math.sin(this.yaw),
      sinPitch,
      cosPitch * Math.cos(this.yaw)
    ).normalize();

    // Prevent camera from going below the ground plane (y = 0.35)
    let allowedDistance = this.maxDistance;
    if (dir.y < -0.001) {
      const distToFloor = (0.35 - this.currentLookAt.y) / dir.y;
      if (distToFloor > 0 && distToFloor < allowedDistance) {
        allowedDistance = distToFloor;
      }
    }

    // Raycast from player shoulder pivot toward camera against all world Box3 colliders
    this.ray.origin.copy(this.currentLookAt);
    this.ray.direction.copy(dir);

    for (const box of colliders) {
      // Ignore boxes that contain the origin itself (e.g. if standing closely against a ledge)
      if (box.containsPoint(this.ray.origin)) continue;

      const hit = this.ray.intersectBox(box, this.rayHitPoint);
      if (hit) {
        const hitDist = this.ray.origin.distanceTo(this.rayHitPoint) - this.wallOffset;
        if (hitDist < allowedDistance) {
          allowedDistance = Math.max(this.minDistance, hitDist);
        }
      }
    }

    // Snap inward quickly when obstructed; ease outward smoothly when clear
    if (allowedDistance < this.currentDistance) {
      this.currentDistance = THREE.MathUtils.lerp(
        this.currentDistance,
        allowedDistance,
        0.55
      );
    } else {
      this.currentDistance = THREE.MathUtils.lerp(
        this.currentDistance,
        allowedDistance,
        smoothFactor
      );
    }

    const finalCamPos = new THREE.Vector3()
      .copy(this.currentLookAt)
      .addScaledVector(dir, this.currentDistance);

    this.camera.position.copy(finalCamPos);
    this.camera.lookAt(this.currentLookAt);
  }
}
