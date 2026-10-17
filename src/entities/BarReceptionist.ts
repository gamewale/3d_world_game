import * as THREE from 'three';

/** Procedural bar worker posed behind the reception counter. */
export class BarReceptionist {
  public readonly group = new THREE.Group();

  private readonly upperBody = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly arms: THREE.Group[] = [];
  private elapsedTime = 0;

  private readonly skin = new THREE.MeshStandardMaterial({
    color: 0x9a6248,
    roughness: 0.85,
  });
  private readonly shirt = new THREE.MeshStandardMaterial({
    color: 0xe7dfca,
    roughness: 0.88,
  });
  private readonly apron = new THREE.MeshStandardMaterial({
    color: 0x176356,
    roughness: 0.82,
  });
  private readonly pants = new THREE.MeshStandardMaterial({
    color: 0x41232f,
    roughness: 0.88,
  });
  private readonly hair = new THREE.MeshStandardMaterial({
    color: 0x211613,
    roughness: 0.92,
  });
  private readonly dark = new THREE.MeshStandardMaterial({
    color: 0x261d19,
    roughness: 0.82,
  });
  private readonly eyeWhite = new THREE.MeshStandardMaterial({ color: 0xe7dfd2 });
  private readonly gold = new THREE.MeshStandardMaterial({
    color: 0xc69a58,
    metalness: 0.52,
    roughness: 0.38,
  });
  private readonly lip = new THREE.MeshStandardMaterial({
    color: 0x8b3f4c,
    roughness: 0.58,
  });

  constructor(position: THREE.Vector3) {
    this.group.position.copy(position);
    this.group.name = 'Bar Receptionist';
    this.buildBody();
    this.buildHead();
    this.buildArms();
  }

  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime;
    const t = this.elapsedTime;
    this.upperBody.position.y = 0.96 + Math.sin(t * 1.7) * 0.012;
    this.upperBody.rotation.z = Math.sin(t * 0.55) * 0.018;
    this.head.rotation.y = Math.sin(t * 0.42 + 0.6) * 0.12;
    this.head.rotation.z = Math.sin(t * 0.68) * 0.018;

    // A slow, small hand movement gives the impression of tending the bar.
    const gesture = Math.max(0, Math.sin(t * 0.38 - 1.1)) ** 6;
    this.arms[0].rotation.x = -0.08 - gesture * 0.12;
    this.arms[1].rotation.x = -0.08 + Math.sin(t * 0.8) * 0.025;
  }

  private buildBody(): void {
    const legGeometry = new THREE.CapsuleGeometry(0.105, 0.48, 4, 8);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(legGeometry, this.pants);
      leg.position.set(side * 0.12, 0.43, 0);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.group.add(leg);

      const shoe = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.09, 0.31),
        this.dark
      );
      shoe.position.set(side * 0.12, 0.07, 0.055);
      shoe.castShadow = true;
      this.group.add(shoe);
    }

    const skirt = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.14, 0.08),
          new THREE.Vector2(0.18, 0.16),
          new THREE.Vector2(0.22, 0.48),
          new THREE.Vector2(0.21, 0.82),
          new THREE.Vector2(0.17, 0.9),
        ],
        24
      ),
      this.pants
    );
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    this.group.add(skirt);

    const waistTrim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.012, 6, 24), this.gold);
    waistTrim.position.y = 0.88;
    waistTrim.rotation.x = Math.PI / 2;
    this.group.add(waistTrim);

    this.group.add(this.upperBody);
    this.upperBody.position.y = 0.96;
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.35, 6, 12),
      this.shirt
    );
    torso.position.y = 0.08;
    torso.scale.set(1, 1, 0.82);
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.upperBody.add(torso);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.025, 6, 20),
      this.apron
    );
    collar.position.set(0, 0.31, 0.045);
    collar.rotation.x = Math.PI / 2;
    this.upperBody.add(collar);

    const apronPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.45, 0.025),
      this.apron
    );
    apronPanel.position.set(0, -0.12, 0.188);
    apronPanel.castShadow = true;
    this.upperBody.add(apronPanel);

    for (const side of [-1, 1]) {
      const lapel = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.35, 0.025),
        this.apron
      );
      lapel.position.set(side * 0.105, 0.19, 0.202);
      lapel.rotation.z = side * -0.14;
      lapel.castShadow = true;
      this.upperBody.add(lapel);
    }

    for (let i = 0; i < 3; i++) {
      const button = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 8, 6),
        this.gold
      );
      button.position.set(0, 0.18 - i * 0.12, 0.205);
      this.upperBody.add(button);
    }
  }

  private buildHead(): void {
    this.upperBody.add(this.head);
    this.head.position.set(0, 0.49, 0.015);

    this.sphere(this.head, [0, 0.02, 0], [0.16, 0.19, 0.15], this.skin);
    this.sphere(this.head, [0, 0.14, -0.015], [0.17, 0.105, 0.16], this.hair);
    this.sphere(this.head, [0, -0.03, -0.105], [0.15, 0.19, 0.075], this.hair);
    this.sphere(this.head, [0, 0.15, 0.07], [0.15, 0.04, 0.07], this.hair);

    for (const side of [-1, 1]) {
      this.sphere(this.head, [side * 0.058, 0.035, 0.135], [0.031, 0.022, 0.014], this.eyeWhite);
      this.sphere(this.head, [side * 0.058, 0.034, 0.149], [0.011, 0.015, 0.008], this.dark);
      this.sphere(this.head, [side * 0.162, 0.01, 0], [0.026, 0.04, 0.03], this.skin);
      this.sphere(this.head, [side * 0.058, 0.078, 0.132], [0.035, 0.009, 0.014], this.hair);

      const earring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 5, 12), this.gold);
      earring.position.set(side * 0.17, -0.055, 0.025);
      this.head.add(earring);
    }

    this.sphere(this.head, [0, -0.005, 0.151], [0.027, 0.042, 0.028], this.skin);
    this.sphere(this.head, [0, -0.087, 0.141], [0.043, 0.012, 0.014], this.lip);
    this.sphere(this.head, [0, -0.11, 0.137], [0.03, 0.009, 0.01], this.skin);

    const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.009, 5, 20, Math.PI), this.gold);
    necklace.position.set(0, -0.2, 0.05);
    necklace.rotation.x = Math.PI;
    this.head.add(necklace);

    // Long, softly curved side locks frame the face and rest on the shoulders.
    for (const side of [-1, 1]) {
      const lock = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.038, 0.19, 5, 8),
        this.hair
      );
      lock.position.set(side * 0.145, -0.17, 0.005);
      lock.rotation.z = side * -0.12;
      lock.castShadow = true;
      this.head.add(lock);
    }
  }

  private buildArms(): void {
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.23, 0.21, 0.005);
      this.upperBody.add(arm);
      this.arms.push(arm);

      const shoulder = new THREE.Vector3();
      const elbow = new THREE.Vector3(side * 0.06, -0.05, 0.14);
      const wrist = new THREE.Vector3(side * 0.07, -0.03, 0.62);
      this.segment(arm, shoulder, elbow, 0.09, this.shirt);
      this.segment(arm, elbow, wrist, 0.058, this.skin);
      this.sphere(arm, [wrist.x, wrist.y, wrist.z], [0.065, 0.06, 0.07], this.skin);
    }
  }

  private sphere(
    parent: THREE.Object3D,
    position: [number, number, number],
    scale: [number, number, number],
    material: THREE.Material
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private segment(
    parent: THREE.Object3D,
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    material: THREE.Material
  ): void {
    const direction = end.clone().sub(start);
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, Math.max(0.01, direction.length() - radius * 2), 4, 8),
      material
    );
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
}
