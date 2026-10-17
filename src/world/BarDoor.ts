import * as THREE from 'three';

export interface BarDoorConfig {
  interactionPosition: THREE.Vector3;
  frameX: number;
  hingeX: number;
  centerZ: number;
  openingWidth: number;
  /** +1 swings into the villa from the outside; -1 swings into the bar. */
  swingDirection: 1 | -1;
}

/** Hinged, collidable entrance door for either side of the bar. */
export class BarDoor {
  public readonly interactionPosition: THREE.Vector3;
  public readonly collider = new THREE.Box3();

  private readonly hinge = new THREE.Group();
  private readonly leaf: THREE.Mesh;
  private open = false;
  private angle = 0;
  private readonly openAngle: number;

  constructor(scene: THREE.Scene, colliders: THREE.Box3[], config: BarDoorConfig) {
    this.interactionPosition = config.interactionPosition.clone();
    this.openAngle = config.swingDirection * Math.PI / 2;
    const wood = new THREE.MeshStandardMaterial({
      color: 0x70452b,
      roughness: 0.72,
    });
    const darkWood = new THREE.MeshStandardMaterial({
      color: 0x38251b,
      roughness: 0.78,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: 0xc69a4b,
      metalness: 0.68,
      roughness: 0.3,
    });

    // The wall opening is sized for a 1.5m-wide, 2.66m-high door leaf.
    const frameX = config.frameX;
    const frameOffset = config.openingWidth / 2 + 0.03;
    for (const z of [config.centerZ - frameOffset, config.centerZ + frameOffset]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.82, 0.16), darkWood);
      jamb.position.set(frameX, 1.41, z);
      jamb.castShadow = true;
      jamb.receiveShadow = true;
      scene.add(jamb);
    }
    const header = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.82), darkWood);
    header.position.set(frameX, 2.78, config.centerZ);
    header.castShadow = true;
    scene.add(header);

    // The hinge sits at the south edge of the doorway. The leaf swings inward
    // into the villa, leaving the outside approach and doorway clear.
    this.hinge.position.set(
      config.hingeX,
      0,
      config.centerZ - config.openingWidth / 2 + 0.04
    );
    scene.add(this.hinge);

    this.leaf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.66, 1.5), wood);
    this.leaf.position.set(0, 1.33, 0.75);
    this.leaf.castShadow = true;
    this.leaf.receiveShadow = true;
    this.hinge.add(this.leaf);

    // Raised inset panels on both faces make the entrance read as a proper door.
    for (const x of [-0.066, 0.066]) {
      for (const z of [0.42, 1.08]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.82, 0.48), darkWood);
        panel.position.set(x, 1.33, z);
        this.hinge.add(panel);
      }

      const handle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), brass);
      handle.position.set(x * 1.35, 1.12, 1.3);
      this.hinge.add(handle);
    }

    this.updateCollider();
    colliders.push(this.collider);
  }

  public openDoor(): void {
    this.open = true;
  }

  public get isOpen(): boolean {
    return this.open;
  }

  public update(deltaTime: number): void {
    const target = this.open ? this.openAngle : 0;
    this.angle = THREE.MathUtils.damp(this.angle, target, 7, deltaTime);
    this.hinge.rotation.y = this.angle;
    this.updateCollider();
  }

  private updateCollider(): void {
    this.hinge.updateMatrixWorld(true);
    this.collider.setFromObject(this.leaf).expandByScalar(0.015);
  }
}
