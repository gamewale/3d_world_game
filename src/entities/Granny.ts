import * as THREE from 'three';

/** A lightweight, procedural granny NPC assembled from scene-native geometry. */
export class Granny {
  public readonly group = new THREE.Group();
  public readonly collider: THREE.Box3;

  private readonly upperBody = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly eyes: THREE.Mesh[] = [];
  private readonly pathCenter: THREE.Vector3;
  private elapsedTime = 0;
  private readonly startY: number;
  private pathPhase = 0;

  private readonly skin = new THREE.MeshStandardMaterial({
    color: 0xb9755d,
    roughness: 0.82,
  });
  private readonly hair = new THREE.MeshStandardMaterial({
    color: 0x77716a,
    roughness: 0.96,
  });
  private readonly hairLight = new THREE.MeshStandardMaterial({
    color: 0xaaa39a,
    roughness: 0.96,
  });
  private readonly sari = new THREE.MeshStandardMaterial({
    color: 0x762c48,
    roughness: 0.86,
  });
  private readonly sariLight = new THREE.MeshStandardMaterial({
    color: 0x9b4058,
    roughness: 0.84,
  });
  private readonly blouse = new THREE.MeshStandardMaterial({
    color: 0x315d58,
    roughness: 0.8,
  });
  private readonly gold = new THREE.MeshStandardMaterial({
    color: 0xb58a45,
    metalness: 0.52,
    roughness: 0.38,
  });
  private readonly dark = new THREE.MeshStandardMaterial({
    color: 0x302923,
    roughness: 0.82,
  });
  private readonly eyeWhite = new THREE.MeshStandardMaterial({
    color: 0xe6ded0,
    roughness: 0.55,
  });
  private readonly eyeDark = new THREE.MeshStandardMaterial({
    color: 0x261c18,
    roughness: 0.45,
  });
  private readonly bindiMaterial = new THREE.MeshStandardMaterial({
    color: 0x9e263a,
    roughness: 0.5,
  });
  private readonly caneMaterial = new THREE.MeshStandardMaterial({
    color: 0x68452e,
    roughness: 0.55,
  });

  constructor(position: THREE.Vector3) {
    this.group.position.copy(position);
    this.pathCenter = position.clone();
    this.startY = position.y;
    this.group.name = 'Garden Granny';
    this.group.add(this.upperBody);
    this.upperBody.position.y = 0.58;
    this.head.position.set(0, 0.91, 0.015);
    this.upperBody.add(this.head);

    this.buildLowerBody();
    this.buildUpperBody();
    this.buildHead();
    this.buildCane();

    this.collider = new THREE.Box3(
      new THREE.Vector3(position.x - 0.43, 0, position.z - 0.36),
      new THREE.Vector3(position.x + 0.43, 1.75, position.z + 0.36)
    );
  }

  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime;
    const t = this.elapsedTime;
    this.pathPhase = (this.pathPhase + deltaTime * 0.48) % (Math.PI * 2);
    const pathSin = Math.sin(this.pathPhase);
    const pathCos = Math.cos(this.pathPhase);
    const pathRadiusX = 0.7;
    const pathRadiusZ = 0.45;
    this.group.position.set(
      this.pathCenter.x + pathRadiusX * pathSin,
      this.startY + Math.abs(pathCos) * 0.014,
      this.pathCenter.z + pathRadiusZ * pathCos
    );
    // Her modeled face points along local +Z; the ellipse tangent determines
    // which way she turns as she makes each circuit.
    this.group.rotation.y = Math.atan2(pathRadiusX * pathCos, -pathRadiusZ * pathSin);
    this.collider.min.set(
      this.group.position.x - 0.43 * this.group.scale.x,
      this.startY,
      this.group.position.z - 0.36 * this.group.scale.z
    );
    this.collider.max.set(
      this.group.position.x + 0.43 * this.group.scale.x,
      this.startY + 1.75 * this.group.scale.y,
      this.group.position.z + 0.36 * this.group.scale.z
    );

    // Gentle breathing, balance shifts, and head movement continue as she walks.
    this.upperBody.rotation.x = 0.055 + Math.sin(t * 1.35) * 0.035;
    this.upperBody.rotation.z = Math.sin(t * 1.3) * 0.055;
    this.head.rotation.y = Math.sin(t * 0.55 + 0.8) * 0.16;
    this.head.rotation.z = Math.sin(t * 0.7) * 0.035;

    // Her free hand occasionally lifts in a small, unhurried greeting.
    const greeting = Math.max(0, Math.sin(t * 0.34 - 1.2)) ** 5;
    this.leftArm.rotation.x = -0.12 - greeting * 0.32;
    this.leftArm.rotation.z = 0.04 + greeting * 0.16;

    // Brief natural blinks, spaced several seconds apart.
    const blinkPhase = t % 4.6;
    const blink = Math.max(0, 1 - Math.abs(blinkPhase - 0.16) / 0.12);
    for (const eye of this.eyes) eye.scale.y = 0.025 * (1 - blink * 0.92);
  }

  private buildLowerBody(): void {
    const skirtProfile = [
      new THREE.Vector2(0.32, 0.055),
      new THREE.Vector2(0.34, 0.11),
      new THREE.Vector2(0.3, 0.26),
      new THREE.Vector2(0.24, 0.48),
      new THREE.Vector2(0.18, 0.69),
      new THREE.Vector2(0.16, 0.73),
    ];
    const skirt = new THREE.Mesh(
      new THREE.LatheGeometry(skirtProfile, 32),
      this.sari
    );
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    this.group.add(skirt);

    const hem = this.torus(0.32, 0.012, this.gold);
    hem.position.y = 0.09;
    this.group.add(hem);

    const hemAccent = this.torus(0.325, 0.006, this.sariLight);
    hemAccent.position.y = 0.125;
    this.group.add(hemAccent);

    this.segment(
      this.group,
      new THREE.Vector3(-0.12, 0.08, 0),
      new THREE.Vector3(-0.12, 0.52, 0),
      0.065,
      this.dark
    );
    this.segment(
      this.group,
      new THREE.Vector3(0.12, 0.08, 0),
      new THREE.Vector3(0.12, 0.52, 0),
      0.065,
      this.dark
    );
    this.sphere(this.group, [-0.12, 0.065, 0.075], [0.105, 0.045, 0.17], this.dark);
    this.sphere(this.group, [0.12, 0.065, 0.075], [0.105, 0.045, 0.17], this.dark);

    // A modest pleated drape adds volume and keeps the sari silhouette readable.
    for (const side of [-1, 1]) {
      const pleat = this.segment(
        this.group,
        new THREE.Vector3(side * 0.07, 0.2, 0.295),
        new THREE.Vector3(side * 0.11, 0.62, 0.17),
        0.018,
        this.sariLight
      );
      pleat.scale.set(0.72, 1, 0.72);
    }
  }

  private buildUpperBody(): void {
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.19, 0.27, 6, 12),
      this.blouse
    );
    torso.position.set(0, 0.34, 0);
    torso.scale.set(1.08, 1, 0.88);
    this.addMesh(this.upperBody, torso);
    this.sphere(this.upperBody, [0, 0.5, 0], [0.28, 0.13, 0.19], this.blouse);

    const shoulderPoints = [
      [-0.23, 0.49, 0],
      [0.23, 0.49, 0],
    ] as const;
    for (const [x, y, z] of shoulderPoints) {
      this.sphere(this.upperBody, [x, y, z], [0.115, 0.13, 0.13], this.blouse);
    }

    const armPairs = [
      { side: -1, handX: -0.28 },
      { side: 1, handX: 0.29 },
    ];
    for (const { side, handX } of armPairs) {
      const shoulder = new THREE.Vector3(side * 0.24, 0.47, 0.015);
      const elbow = new THREE.Vector3(side * 0.3, 0.2, 0.055);
      const wrist = new THREE.Vector3(handX, 0.025, 0.08);
      const arm = side < 0 ? this.leftArm : new THREE.Group();
      arm.position.copy(shoulder);
      this.upperBody.add(arm);
      this.segment(arm, new THREE.Vector3(), elbow.clone().sub(shoulder), 0.079, this.blouse);
      this.segment(arm, elbow.clone().sub(shoulder), wrist.clone().sub(shoulder), 0.052, this.skin);
      this.sphere(
        arm,
        [handX - shoulder.x, 0.015 - shoulder.y, 0.085 - shoulder.z],
        [0.06, 0.075, 0.055],
        this.skin
      );

      const bangle = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.008, 6, 16),
        this.gold
      );
      bangle.position.copy(wrist).sub(shoulder);
      bangle.rotation.x = Math.PI / 2;
      arm.add(bangle);
    }

    // Sari pallu falls from the left shoulder across the blouse to the waist.
    const palluCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.22, 0.56, 0.105),
      new THREE.Vector3(-0.16, 0.43, 0.19),
      new THREE.Vector3(-0.08, 0.26, 0.205),
      new THREE.Vector3(0.1, 0.08, 0.16),
    ]);
    const pallu = new THREE.Mesh(
      new THREE.TubeGeometry(palluCurve, 24, 0.065, 10, false),
      this.sariLight
    );
    this.addMesh(this.upperBody, pallu);

    const trimCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.265, 0.56, 0.09),
      new THREE.Vector3(-0.205, 0.42, 0.205),
      new THREE.Vector3(-0.115, 0.25, 0.22),
      new THREE.Vector3(0.065, 0.08, 0.18),
    ]);
    this.addMesh(
      this.upperBody,
      new THREE.Mesh(new THREE.TubeGeometry(trimCurve, 24, 0.009, 6, false), this.gold)
    );

    const necklace = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.009, 6, 24, Math.PI),
      this.gold
    );
    necklace.position.set(0, 0.51, 0.08);
    necklace.rotation.x = Math.PI;
    this.upperBody.add(necklace);
  }

  private buildHead(): void {
    this.sphere(this.head, [0, 0, 0], [0.155, 0.185, 0.15], this.skin);

    // Soft gray hair cap with a low bun and individual curls around the edge.
    this.sphere(this.head, [0, 0.105, -0.012], [0.167, 0.12, 0.157], this.hair);
    this.sphere(this.head, [0, -0.025, -0.13], [0.095, 0.09, 0.085], this.hairLight);
    for (let i = 0; i < 11; i++) {
      const angle = (i / 11) * Math.PI * 2;
      this.sphere(
        this.head,
        [Math.cos(angle) * 0.145, 0.045 + Math.sin(angle) * 0.055, Math.sin(angle) * 0.12],
        [0.045, 0.045, 0.045],
        i % 3 === 0 ? this.hairLight : this.hair
      );
    }

    // Facial features face the front of the villa courtyard (+Z).
    for (const side of [-1, 1]) {
      this.eyes.push(
        this.sphere(this.head, [side * 0.054, 0.012, 0.132], [0.032, 0.025, 0.014], this.eyeWhite)
      );
      this.sphere(this.head, [side * 0.052, 0.01, 0.145], [0.012, 0.016, 0.008], this.eyeDark);
      this.sphere(this.head, [side * 0.158, -0.01, 0], [0.025, 0.04, 0.027], this.skin);

      const glasses = new THREE.Mesh(
        new THREE.TorusGeometry(0.045, 0.0045, 5, 20),
        this.dark
      );
      glasses.position.set(side * 0.054, 0.012, 0.146);
      this.head.add(glasses);
    }

    this.segment(
      this.head,
      new THREE.Vector3(-0.01, -0.005, 0.142),
      new THREE.Vector3(0.01, -0.045, 0.17),
      0.018,
      this.skin
    );
    this.sphere(this.head, [0, -0.08, 0.14], [0.032, 0.018, 0.013], this.bindiMaterial);

    const bridge = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.LineCurve3(
          new THREE.Vector3(-0.01, 0.012, 0.146),
          new THREE.Vector3(0.01, 0.012, 0.146)
        ),
        4,
        0.004,
        5,
        false
      ),
      this.dark
    );
    this.head.add(bridge);

    const smile = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-0.035, -0.112, 0.133),
          new THREE.Vector3(0, -0.13, 0.15),
          new THREE.Vector3(0.035, -0.112, 0.133)
        ),
        8,
        0.004,
        5,
        false
      ),
      this.dark
    );
    this.head.add(smile);

    // Small earrings and understated forehead creases.
    for (const side of [-1, 1]) {
      this.sphere(this.head, [side * 0.16, -0.055, 0.02], [0.012, 0.025, 0.012], this.gold);
      const crease = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.LineCurve3(
            new THREE.Vector3(side * 0.095, 0.074, 0.104),
            new THREE.Vector3(side * 0.035, 0.082, 0.13)
          ),
          3,
          0.0025,
          4,
          false
        ),
        this.hairLight
      );
      this.head.add(crease);
    }
  }

  private buildCane(): void {
    const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.72, 10), this.caneMaterial);
    cane.position.set(0.38, 0.37, 0.12);
    cane.castShadow = true;
    this.group.add(cane);

    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 6, 12, Math.PI), this.caneMaterial);
    handle.position.set(0.38, 0.74, 0.12);
    handle.rotation.z = Math.PI;
    this.group.add(handle);
    this.sphere(this.group, [0.38, 0.02, 0.12], [0.034, 0.025, 0.034], this.caneMaterial);
  }

  private sphere(
    parent: THREE.Object3D,
    position: [number, number, number],
    scale: [number, number, number],
    material: THREE.Material
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    return this.addMesh(parent, mesh);
  }

  private segment(
    parent: THREE.Object3D,
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    material: THREE.Material
  ): THREE.Mesh {
    const direction = end.clone().sub(start);
    const length = direction.length();
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 4, 8),
      material
    );
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );
    return this.addMesh(parent, mesh);
  }

  private torus(
    radius: number,
    tube: number,
    material: THREE.Material
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 32), material);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  private addMesh<T extends THREE.Mesh>(parent: THREE.Object3D, mesh: T): T {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}
