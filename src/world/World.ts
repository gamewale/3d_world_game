import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { VillaBuilder } from './VillaBuilder';
import { MainGate } from './MainGate';

export class World {
  public readonly scene: THREE.Scene;
  public readonly colliders: THREE.Box3[] = [];
  public readonly mainGate: MainGate;

  private builder: VillaBuilder;
  private secretButtonMesh: THREE.Mesh;
  private secretButtonMat: THREE.MeshStandardMaterial;
  private groundMaterial: THREE.MeshStandardMaterial;
  private elapsedTime = 0;
  private isButtonPressed = false;
  private duckCollisionActive = false;
  private readonly duckVelocity = new THREE.Vector3();

  constructor() {
    this.scene = new THREE.Scene();

    this.scene.background = new THREE.Color(0x9bc9ed);
    this.scene.fog = new THREE.Fog(0x9bc9ed, 100, 260);
    this.setupSky();

    this.setupLights();

    // Fallback brown mud material before the GLTF textures finish loading
    this.groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2718,
      roughness: 0.88,
      metalness: 0.02,
    });

    this.setupGroundWithPoolCutout();
    this.loadMudLeavesGLTF();

    this.builder = new VillaBuilder(this.scene, this.colliders);
    this.builder.build();

    // Secret Button on the pedestal in the East Study (12.5, 1.18, -16.5)
    this.secretButtonMat = new THREE.MeshStandardMaterial({
      color: 0xff2a85,
      emissive: 0xff2a85,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const btnGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.22, 20);
    this.secretButtonMesh = new THREE.Mesh(btnGeo, this.secretButtonMat);
    this.secretButtonMesh.position.set(12.5, 1.18, -16.5);
    this.scene.add(this.secretButtonMesh);

    this.mainGate = new MainGate(20);
    this.scene.add(this.mainGate.group);
    this.colliders.push(this.mainGate.collider);
  }

  private loadMudLeavesGLTF(): void {
    const loader = new GLTFLoader();
    const primaryPath =
      '/brown_mud_leaves_01_1k.gltf/brown_mud_leaves_01_1k.gltf';
    const fallbackPath = '/brown_mud_leaves_01_1k.gltf';

    const applyLoadedGLTF = (gltfScene: THREE.Group) => {
      let sourceMat: THREE.MeshStandardMaterial | null = null;

      gltfScene.traverse((child) => {
        if (
          (child as THREE.Mesh).isMesh &&
          (child as THREE.Mesh).material &&
          !sourceMat
        ) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) {
            sourceMat = mat[0] as THREE.MeshStandardMaterial;
          } else {
            sourceMat = mat as THREE.MeshStandardMaterial;
          }
        }
      });

      if (!sourceMat) {
        console.warn(
          'brown_mud_leaves_01_1k.gltf loaded, but no MeshStandardMaterial found.'
        );
        return;
      }

      const foundMat = sourceMat as THREE.MeshStandardMaterial;

      const maps: (THREE.Texture | null)[] = [
        foundMat.map,
        foundMat.normalMap,
        foundMat.roughnessMap,
        foundMat.metalnessMap,
        foundMat.aoMap,
      ];

      for (const tex of maps) {
        if (tex) {
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.needsUpdate = true;
        }
      }

      this.groundMaterial.color.setHex(0xffffff);
      this.groundMaterial.map = foundMat.map;
      this.groundMaterial.normalMap = foundMat.normalMap;
      this.groundMaterial.normalScale.set(1.2, 1.2);
      this.groundMaterial.roughnessMap = foundMat.roughnessMap;
      this.groundMaterial.metalnessMap = foundMat.metalnessMap;
      this.groundMaterial.aoMap = foundMat.aoMap;
      this.groundMaterial.aoMapIntensity = 0.8;
      this.groundMaterial.roughness = foundMat.roughness ?? 0.85;
      this.groundMaterial.metalness = foundMat.metalness ?? 0.02;
      this.groundMaterial.needsUpdate = true;
    };

    loader.load(
      primaryPath,
      (gltf) => applyLoadedGLTF(gltf.scene),
      undefined,
      () => {
        loader.load(
          fallbackPath,
          (gltf) => applyLoadedGLTF(gltf.scene),
          undefined,
          (err) => {
            console.warn(
              'Could not load brown_mud_leaves_01_1k.gltf. Ensure folder is at public/brown_mud_leaves_01_1k.gltf/',
              err
            );
          }
        );
      }
    );
  }

  public setButtonPressed(pressed: boolean): void {
    this.isButtonPressed = pressed;
    if (pressed) {
      this.secretButtonMesh.position.y = 1.09;
      this.secretButtonMat.color.setHex(0x00f5d4);
      this.secretButtonMat.emissive.setHex(0x00f5d4);
      this.secretButtonMat.emissiveIntensity = 1.0;
    } else {
      this.secretButtonMesh.position.y = 1.18;
      this.secretButtonMat.color.setHex(0xff2a85);
      this.secretButtonMat.emissive.setHex(0xff2a85);
    }
  }

  private setupLights(): void {
    const hemiLight = new THREE.HemisphereLight(0xd9edff, 0x77735f, 1.35);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff4dc, 2.6);
    dirLight.position.set(-35, 55, -25);
    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;

    const d = 46;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;

    this.scene.add(dirLight);
  }

  private setupSky(): void {
    const sky = new Sky();
    sky.scale.setScalar(450000);

    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = 2.2;
    uniforms['rayleigh'].value = 1.8;
    uniforms['mieCoefficient'].value = 0.004;
    uniforms['mieDirectionalG'].value = 0.82;

    const sunPosition = new THREE.Vector3(-0.45, 0.72, -0.52).normalize();
    uniforms['sunPosition'].value.copy(sunPosition);
    this.scene.add(sky);
  }

  /**
   * Builds the ground plane in 4 sections around the sunken swimming pool hole
   * (Pool opening is X = 7 to 16, Z = 4 to 14) using the PBR ground material with scaled UV repeat.
   */
  private setupGroundWithPoolCutout(): void {
    const addGroundPatch = (
      width: number,
      depth: number,
      centerX: number,
      centerZ: number
    ) => {
      const geo = new THREE.PlaneGeometry(width, depth);

      // Scale UVs so 1 full mud/leaves texture tile covers 4m x 4m of ground area
      const tileMeters = 4.0;
      const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uvAttr.count; i++) {
        const u = uvAttr.getX(i);
        const v = uvAttr.getY(i);
        uvAttr.setXY(i, (u * width) / tileMeters, (v * depth) / tileMeters);
      }
      uvAttr.needsUpdate = true;
      geo.setAttribute('uv2', uvAttr.clone());

      const mesh = new THREE.Mesh(geo, this.groundMaterial);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(centerX, 0, centerZ);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };

    // 1. West of pool
    addGroundPatch(107, 200, -46.5, 0);
    // 2. East of pool
    addGroundPatch(84, 200, 58, 0);
    // 3. North of pool
    addGroundPatch(9, 104, 11.5, -48);
    // 4. South of pool
    addGroundPatch(9, 86, 11.5, 57);
  }

  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime;
    this.mainGate.update(deltaTime);

    if (!this.isButtonPressed) {
      this.secretButtonMat.emissiveIntensity =
        0.65 + Math.sin(this.elapsedTime * 5.0) * 0.35;
    }

    if (this.builder.poolWaterMesh) {
      this.builder.poolWaterMesh.position.y =
        -0.14 + Math.sin(this.elapsedTime * 2.2) * 0.025;
    }

    if (this.builder.duckGroup) {
      this.builder.duckGroup.position.y =
        this.builder.duckBaseY + Math.sin(this.elapsedTime * 2.4) * 0.05;
      this.builder.duckGroup.rotation.y =
        Math.PI / 2 + Math.sin(this.elapsedTime * 0.8) * 0.35;
    }

    if (this.builder.fountainStatue) {
      this.builder.fountainStatue.rotation.y += deltaTime * 1.4;
      this.builder.fountainStatue.position.y =
        2.5 + Math.sin(this.elapsedTime * 3.0) * 0.12;
    }
  }

  public pushDuckFromPlayer(
    playerPosition: THREE.Vector3,
    deltaTime: number
  ): boolean {
    const duck = this.builder.duckGroup;
    const collider = this.builder.duckCollider;
    if (!duck || !collider) return false;

    const gapX = Math.max(
      collider.min.x - playerPosition.x,
      0,
      playerPosition.x - collider.max.x
    );
    const gapZ = Math.max(
      collider.min.z - playerPosition.z,
      0,
      playerPosition.z - collider.max.z
    );
    const collisionGap = Math.hypot(gapX, gapZ);
    let shouldPlaySound = false;
    if (collisionGap <= 0.48) {
      const pushX = duck.position.x - playerPosition.x;
      const pushZ = duck.position.z - playerPosition.z;
      const distance = Math.hypot(pushX, pushZ);
      if (distance > 0.001) {
        this.duckVelocity.x += (pushX / distance) * 4.5 * deltaTime;
        this.duckVelocity.z += (pushZ / distance) * 4.5 * deltaTime;
      }
      shouldPlaySound = !this.duckCollisionActive;
      this.duckCollisionActive = true;
    } else if (collisionGap > 0.65) {
      this.duckCollisionActive = false;
    }

    // The duck has little mass and slides over the water with gentle drag.
    this.duckVelocity.multiplyScalar(Math.exp(-1.8 * deltaTime));
    const nextX = THREE.MathUtils.clamp(
      duck.position.x + this.duckVelocity.x * deltaTime,
      7.6,
      15.4
    );
    const nextZ = THREE.MathUtils.clamp(
      duck.position.z + this.duckVelocity.z * deltaTime,
      4.6,
      13.4
    );
    const movedX = nextX - duck.position.x;
    const movedZ = nextZ - duck.position.z;
    duck.position.x = nextX;
    duck.position.z = nextZ;
    if (nextX === 7.6 || nextX === 15.4) this.duckVelocity.x = 0;
    if (nextZ === 4.6 || nextZ === 13.4) this.duckVelocity.z = 0;
    collider.translate(new THREE.Vector3(movedX, 0, movedZ));
    return shouldPlaySound;
  }
}
