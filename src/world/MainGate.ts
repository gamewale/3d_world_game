import * as THREE from 'three';

export class MainGate {
  public readonly group = new THREE.Group();
  public readonly collider = new THREE.Box3();

  private leftHinge = new THREE.Group();
  private rightHinge = new THREE.Group();
  private statusLightMat: THREE.MeshStandardMaterial;
  private leftLanternMat: THREE.MeshStandardMaterial;
  private rightLanternMat: THREE.MeshStandardMaterial;

  private isOpen = true;
  private openProgress = 1.0; // 1.0 = swung open, 0.0 = slammed shut
  private readonly gateZ: number;

  constructor(zPos = 20) {
    this.gateZ = zPos;
    this.group.position.set(0, 0, zPos);

    // Realistic Wrought-Iron & Brushed Gold Materials
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x1c1f26,
      roughness: 0.35,
      metalness: 0.85,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf4b942,
      roughness: 0.25,
      metalness: 0.9,
    });

    const stoneCapMat = new THREE.MeshStandardMaterial({
      color: 0xe6ccb2,
      roughness: 0.7,
      metalness: 0.05,
    });

    // 1. Stone Pillar Caps & Carriage Lanterns on top of the gate pillars (X = ±3.4)
    this.leftLanternMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffae00,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    this.rightLanternMat = this.leftLanternMat.clone();

    this.buildPillarMonument(-3.4, stoneCapMat, ironMat, this.leftLanternMat);
    this.buildPillarMonument(3.4, stoneCapMat, ironMat, this.rightLanternMat);

    // 2. Overhead Wrought-Iron Archway & Status Indicator
    const archBeam = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.35, 0.45),
      ironMat
    );
    archBeam.position.set(0, 4.45, 0);
    archBeam.castShadow = true;
    this.group.add(archBeam);

    const upperArch = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.45, 0.35),
      ironMat
    );
    upperArch.position.set(0, 4.85, 0);
    upperArch.castShadow = true;
    this.group.add(upperArch);

    // Decorative Gold Crest in the center of the arch
    const crest = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      goldMat
    );
    crest.position.set(0, 5.25, 0);
    this.group.add(crest);

    // Lock status light strip (Emerald Green when open, Crimson Red when locked)
    this.statusLightMat = new THREE.MeshStandardMaterial({
      color: 0x06d6a0,
      emissive: 0x06d6a0,
      emissiveIntensity: 0.9,
    });
    const statusStrip = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.14, 0.48),
      this.statusLightMat
    );
    statusStrip.position.set(0, 4.45, 0);
    this.group.add(statusStrip);

    // 3. Left & Right Hinged Wrought-Iron Gate Wings
    // Left hinge is anchored at the inner edge of the left pillar (X = -2.8)
    this.leftHinge.position.set(-2.8, 0, 0);
    this.leftHinge.add(this.createWroughtIronWing(1, ironMat, goldMat));
    this.group.add(this.leftHinge);

    // Right hinge is anchored at the inner edge of the right pillar (X = +2.8)
    this.rightHinge.position.set(2.8, 0, 0);
    this.rightHinge.add(this.createWroughtIronWing(-1, ironMat, goldMat));
    this.group.add(this.rightHinge);

    this.updateDoorsAndCollider();
  }

  private buildPillarMonument(
    x: number,
    stoneMat: THREE.Material,
    ironMat: THREE.Material,
    lanternMat: THREE.Material
  ): void {
    // Tiered stone cap sitting at y = 5.05 on top of the 5.0m pillar
    const capBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.24, 1.48),
      stoneMat
    );
    capBase.position.set(x, 5.12, 0);
    capBase.castShadow = true;
    this.group.add(capBase);

    // Wrought-iron lantern cage & glowing glass core
    const lanternBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.18, 8),
      ironMat
    );
    lanternBase.position.set(x, 5.33, 0);
    this.group.add(lanternBase);

    const lanternGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.48, 0.36),
      lanternMat
    );
    lanternGlass.position.set(x, 5.66, 0);
    this.group.add(lanternGlass);

    const lanternRoof = new THREE.Mesh(
      new THREE.ConeGeometry(0.36, 0.3, 4),
      ironMat
    );
    lanternRoof.position.set(x, 6.05, 0);
    lanternRoof.rotation.y = Math.PI / 4;
    this.group.add(lanternRoof);
  }

  /**
   * Builds one 2.78m-wide wrought-iron gate leaf extending from its hinge (x = 0)
   * toward the center of the driveway (direction = +1 for left wing, -1 for right wing).
   */
  private createWroughtIronWing(
    direction: 1 | -1,
    ironMat: THREE.Material,
    goldMat: THREE.Material
  ): THREE.Group {
    const wing = new THREE.Group();
    const width = 2.78;
    const centerOffset = (width / 2) * direction;

    // Outer Vertical Stile (at hinge) & Inner Vertical Stile (at center latch)
    const hingeStile = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 3.8, 0.12),
      ironMat
    );
    hingeStile.position.set(0.06 * direction, 1.95, 0);
    hingeStile.castShadow = true;
    wing.add(hingeStile);

    const latchStile = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 4.1, 0.12),
      ironMat
    );
    latchStile.position.set((width - 0.06) * direction, 2.1, 0);
    latchStile.castShadow = true;
    wing.add(latchStile);

    // Bottom, Middle, and Top Horizontal Iron Rails
    const railHeights = [0.35, 1.85, 3.55];
    for (const y of railHeights) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.1, 0.1),
        ironMat
      );
      rail.position.set(centerOffset, y, 0);
      rail.castShadow = true;
      wing.add(rail);
    }

    // 8 Vertical Wrought-Iron Bars (Pickets) with Golden Spear Finials on top
    const numBars = 8;
    const spacing = (width - 0.32) / (numBars - 1);

    for (let i = 0; i < numBars; i++) {
      const barX = (0.16 + i * spacing) * direction;
      // Bars rise slightly higher near the center of the gate for a regal curved silhouette
      const progressToCenter = i / (numBars - 1);
      const barHeight = 3.55 + progressToCenter * 0.45;

      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, barHeight, 8),
        ironMat
      );
      bar.position.set(barX, barHeight / 2 + 0.15, 0);
      bar.castShadow = true;
      wing.add(bar);

      // Golden Spearhead Finial on top of each bar
      const spear = new THREE.Mesh(
        new THREE.ConeGeometry(0.055, 0.22, 6),
        goldMat
      );
      spear.position.set(barX, barHeight + 0.25, 0);
      wing.add(spear);

      // Decorative Golden Ring between bottom and middle rails
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.09, 0.018, 6, 12),
        goldMat
      );
      ring.position.set(barX, 1.1, 0);
      wing.add(ring);
    }

    // Ornate Brass Lock Plate near the center meeting edge
    const lockPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.45, 0.16),
      goldMat
    );
    lockPlate.position.set((width - 0.18) * direction, 1.85, 0);
    wing.add(lockPlate);

    return wing;
  }

  public setOpen(open: boolean): void {
    this.isOpen = open;
    if (open) {
      this.statusLightMat.color.setHex(0x06d6a0);
      this.statusLightMat.emissive.setHex(0x06d6a0);
      this.leftLanternMat.emissive.setHex(0xffae00);
      this.rightLanternMat.emissive.setHex(0xffae00);
    } else {
      // Turn lanterns & status bar menacing crimson red when trapped!
      this.statusLightMat.color.setHex(0xff0055);
      this.statusLightMat.emissive.setHex(0xff0055);
      this.leftLanternMat.emissive.setHex(0xff0055);
      this.rightLanternMat.emissive.setHex(0xff0055);
    }
  }

  public toggle(): void {
    this.setOpen(!this.isOpen);
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  public update(deltaTime: number): void {
    const target = this.isOpen ? 1.0 : 0.0;
    // Fast violent slam when closing (speed 6.5), smooth regal swing when opening (speed 2.4)
    const speed = this.isOpen ? 2.4 : 6.5;

    if (Math.abs(this.openProgress - target) > 0.001) {
      if (this.openProgress < target) {
        this.openProgress = Math.min(target, this.openProgress + speed * deltaTime);
      } else {
        this.openProgress = Math.max(target, this.openProgress - speed * deltaTime);
      }
      this.updateDoorsAndCollider();
    }
  }

  private updateDoorsAndCollider(): void {
    // Swing doors inward toward the courtyard (up to 85 degrees = 1.48 radians)
    const maxSwingAngle = 1.48;
    const angle = this.openProgress * maxSwingAngle;

    this.leftHinge.rotation.y = angle;
    this.rightHinge.rotation.y = -angle;

    if (this.openProgress > 0.7) {
      // Move gate barrier collider underground when swung open
      this.collider.set(
        new THREE.Vector3(-3.0, -20, this.gateZ - 0.35),
        new THREE.Vector3(3.0, -15, this.gateZ + 0.35)
      );
    } else {
      // Solid barrier across the gateway when closed/closing
      this.collider.set(
        new THREE.Vector3(-3.0, 0, this.gateZ - 0.4),
        new THREE.Vector3(3.0, 4.6, this.gateZ + 0.4)
      );
    }
  }
}