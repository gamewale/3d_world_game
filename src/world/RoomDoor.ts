import * as THREE from 'three';

export interface RoomDoorConfig {
  interactionPosition: THREE.Vector3;
  centerX: number;
  centerZ: number;
  width: number;
  height: number;
  baseY?: number;
  /** The wall's lengthwise axis. */
  wallAxis?: 'x' | 'z';
}

/** A hinged door in a wall running along the X axis. */
export class RoomDoor {
  public readonly interactionPosition: THREE.Vector3;
  public readonly collider = new THREE.Box3();

  private readonly hinge = new THREE.Group();
  private readonly leaf: THREE.Mesh;
  private readonly centerZ: number;
  private readonly wallAxis: 'x' | 'z';
  private open = false;
  private angle = 0;
  private openFromSide = 0;

  constructor(scene: THREE.Scene, colliders: THREE.Box3[], config: RoomDoorConfig) {
    this.interactionPosition = config.interactionPosition.clone();
    this.centerZ = config.centerZ;
    this.wallAxis = config.wallAxis ?? 'x';

    const doorMat = new THREE.MeshStandardMaterial({ color: 0x493125, roughness: 0.54 });
    const clearHeight = config.height;
    const frameX = config.centerX;

    if (this.wallAxis === 'x') {
      this.hinge.position.set(frameX - config.width / 2 + 0.04, config.baseY ?? 0, config.centerZ);
    } else {
      this.hinge.position.set(frameX, config.baseY ?? 0, config.centerZ - config.width / 2 + 0.04);
    }
    scene.add(this.hinge);
    const leafGeometry = this.wallAxis === 'x'
      ? new THREE.BoxGeometry(config.width - 0.08, clearHeight - 0.04, 0.09)
      : new THREE.BoxGeometry(0.09, clearHeight - 0.04, config.width - 0.08);
    this.leaf = new THREE.Mesh(leafGeometry, doorMat);
    this.leaf.position.set(
      this.wallAxis === 'x' ? (config.width - 0.08) / 2 : 0,
      (clearHeight - 0.04) / 2,
      this.wallAxis === 'x' ? 0 : (config.width - 0.08) / 2
    );
    this.leaf.castShadow = true;
    this.leaf.receiveShadow = true;
    this.hinge.add(this.leaf);

    this.updateCollider();
    colliders.push(this.collider);
  }

  public get isOpen(): boolean {
    return this.open;
  }

  public openDoor(playerPosition: THREE.Vector3): void {
    const position = this.wallAxis === 'x' ? playerPosition.z : playerPosition.x;
    const center = this.wallAxis === 'x' ? this.centerZ : this.hinge.position.x;
    this.openFromSide = Math.sign(position - center) || 1;
    this.open = true;
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    const position = this.wallAxis === 'x' ? playerPosition.z : playerPosition.x;
    const center = this.wallAxis === 'x' ? this.centerZ : this.hinge.position.x;
    const crossedThrough =
      Math.sign(position - center) === -this.openFromSide &&
      Math.abs(position - center) > 0.9;
    if (this.open && crossedThrough) this.open = false;

    const swingDirection = this.wallAxis === 'x' ? 1 : -1;
    const target = this.open ? this.openFromSide * swingDirection * Math.PI / 2 : 0;
    this.angle = THREE.MathUtils.damp(this.angle, target, 8, deltaTime);
    this.hinge.rotation.y = this.angle;
    this.updateCollider();
  }

  private updateCollider(): void {
    this.hinge.updateMatrixWorld(true);
    this.collider.setFromObject(this.leaf).expandByScalar(0.015);
  }
}
