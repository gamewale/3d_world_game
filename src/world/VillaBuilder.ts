import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class VillaBuilder {
  private scene: THREE.Scene;
  private colliders: THREE.Box3[];

  public flamingoGroup: THREE.Group | null = null;
  public fountainStatue: THREE.Group | null = null;
  public poolWaterMesh: THREE.Mesh | null = null;

  private perimeterWallMat: THREE.MeshStandardMaterial;
  private outerVillaWallMat: THREE.MeshStandardMaterial;
  private interiorVillaWallMat: THREE.MeshStandardMaterial;
  private pathwayMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, colliders: THREE.Box3[]) {
    this.scene = scene;
    this.colliders = colliders;

    this.perimeterWallMat = new THREE.MeshStandardMaterial({
      color: 0xf8f9fa,
      roughness: 0.75,
    });
    this.outerVillaWallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.65,
    });
    this.interiorVillaWallMat = new THREE.MeshStandardMaterial({
      color: 0xf1f3f5,
      roughness: 0.65,
    });

    // Fallback pathway material before GLTF textures load
    this.pathwayMat = new THREE.MeshStandardMaterial({
      color: 0x8d99ae,
      roughness: 0.7,
    });
  }

  public build(): void {
    this.buildOuterStreet();
    this.buildCourtyardPathsAndPool();
    this.buildPerimeterWalls();
    this.buildExpandedVilla();
    this.buildTropicalTrees();

    this.loadPlasterWallGLTF();
    this.loadPathwayGLTF();
  }

  private loadPlasterWallGLTF(): void {
    const loader = new GLTFLoader();
    const primaryPath =
      '/painted_plaster_wall_1k.gltf/painted_plaster_wall_1k.gltf';
    const fallbackPath = '/painted_plaster_wall_1k.gltf';

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

      if (!sourceMat) return;

      const foundMat = sourceMat as THREE.MeshStandardMaterial;
      const maps = [
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

      const targetMaterials = [
        { mat: this.perimeterWallMat, tint: 0xf8f9fa },
        { mat: this.outerVillaWallMat, tint: 0xffffff },
        { mat: this.interiorVillaWallMat, tint: 0xf1f3f5 },
      ];

      for (const { mat, tint } of targetMaterials) {
        mat.color.setHex(tint);
        mat.map = foundMat.map;
        mat.normalMap = foundMat.normalMap;
        mat.normalScale.set(1.1, 1.1);
        mat.roughnessMap = foundMat.roughnessMap;
        mat.metalnessMap = foundMat.metalnessMap;
        mat.aoMap = foundMat.aoMap;
        mat.aoMapIntensity = 0.75;
        mat.roughness = foundMat.roughness ?? 0.85;
        mat.metalness = foundMat.metalness ?? 0.05;
        mat.needsUpdate = true;
      }
    };

    loader.load(
      primaryPath,
      (gltf) => applyLoadedGLTF(gltf.scene),
      undefined,
      () => {
        loader.load(fallbackPath, (gltf) => applyLoadedGLTF(gltf.scene));
      }
    );
  }

  private loadPathwayGLTF(): void {
    const loader = new GLTFLoader();
    const primaryPath =
      '/herringbone_concrete_tile_03_1k.gltf/herringbone_concrete_tile_03_1k.gltf';
    const fallbackPath = '/herringbone_concrete_tile_03_1k.gltf';

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

      if (!sourceMat) return;

      const foundMat = sourceMat as THREE.MeshStandardMaterial;
      const maps = [
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

      this.pathwayMat.color.setHex(0xffffff);
      this.pathwayMat.map = foundMat.map;
      this.pathwayMat.normalMap = foundMat.normalMap;
      this.pathwayMat.normalScale.set(1.25, 1.25);
      this.pathwayMat.roughnessMap = foundMat.roughnessMap;
      this.pathwayMat.metalnessMap = foundMat.metalnessMap;
      this.pathwayMat.aoMap = foundMat.aoMap;
      this.pathwayMat.aoMapIntensity = 0.85;
      this.pathwayMat.roughness = foundMat.roughness ?? 0.8;
      this.pathwayMat.metalness = foundMat.metalness ?? 0.02;
      this.pathwayMat.needsUpdate = true;
    };

    loader.load(
      primaryPath,
      (gltf) => applyLoadedGLTF(gltf.scene),
      undefined,
      () => {
        loader.load(fallbackPath, (gltf) => applyLoadedGLTF(gltf.scene));
      }
    );
  }

  private addBlock(
    size: [number, number, number],
    pos: [number, number, number],
    material: THREE.Material,
    hasCollider = true
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    if (hasCollider) {
      const box = new THREE.Box3().setFromObject(mesh);
      this.colliders.push(box);
    }
    return mesh;
  }

  private addPathBlock(
    size: [number, number, number],
    pos: [number, number, number],
    material: THREE.Material
  ): THREE.Mesh {
    const [w, h, d] = size;
    const geo = new THREE.BoxGeometry(w, h, d);

    // Scale UVs so 1 full herringbone tile texture covers 3m x 3m
    const tileMeters = 3.0;
    const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uvAttr.count; i++) {
      const u = uvAttr.getX(i);
      const v = uvAttr.getY(i);
      uvAttr.setXY(i, (u * w) / tileMeters, (v * d) / tileMeters);
    }
    uvAttr.needsUpdate = true;
    geo.setAttribute('uv2', uvAttr.clone());

    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  private addWallBlock(
    size: [number, number, number],
    pos: [number, number, number],
    material: THREE.Material,
    hasCollider = true
  ): THREE.Mesh {
    const [w, h, d] = size;
    const geo = new THREE.BoxGeometry(w, h, d);

    const tileMeters = 3.5;
    const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
    const normAttr = geo.attributes.normal as THREE.BufferAttribute;

    for (let i = 0; i < uvAttr.count; i++) {
      const nx = Math.abs(normAttr.getX(i));
      const ny = Math.abs(normAttr.getY(i));

      const u = uvAttr.getX(i);
      const v = uvAttr.getY(i);

      if (nx > 0.5) {
        uvAttr.setXY(i, (u * d) / tileMeters, (v * h) / tileMeters);
      } else if (ny > 0.5) {
        uvAttr.setXY(i, (u * w) / tileMeters, (v * d) / tileMeters);
      } else {
        uvAttr.setXY(i, (u * w) / tileMeters, (v * h) / tileMeters);
      }
    }

    uvAttr.needsUpdate = true;
    geo.setAttribute('uv2', uvAttr.clone());

    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    if (hasCollider) {
      const box = new THREE.Box3().setFromObject(mesh);
      this.colliders.push(box);
    }
    return mesh;
  }

  private createNeonSignTexture(
    text: string,
    borderColor: string,
    textColor: string
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#120824';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 8;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 18;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.font = '900 54px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.shadowColor = textColor;
    ctx.shadowBlur = 24;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createPoolTileTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0096c7';
    ctx.fillRect(0, 0, 256, 256);

    const tileSize = 32;
    for (let y = 0; y < 256; y += tileSize) {
      for (let x = 0; x < 256; x += tileSize) {
        ctx.fillStyle =
          (x / tileSize + y / tileSize) % 2 === 0 ? '#00b4d8' : '#0077b6';
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      }
    }

    ctx.strokeStyle = '#90e0ef';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += tileSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  private buildOuterStreet(): void {
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1d1e2c,
      roughness: 0.9,
    });
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0xbdb2ff,
      roughness: 0.75,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xffbe0b,
      emissive: 0xffbe0b,
      emissiveIntensity: 0.3,
      roughness: 0.4,
    });
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x2b2d42,
      metalness: 0.7,
      roughness: 0.3,
    });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xff4ecd,
      emissive: 0xff4ecd,
      emissiveIntensity: 1.0,
    });

    this.addBlock([120, 0.04, 10], [0, 0.02, 29], asphaltMat, false);
    this.addBlock([120, 0.14, 3.2], [0, 0.07, 22.4], sidewalkMat, false);
    this.addBlock([120, 0.14, 3.2], [0, 0.07, 35.6], sidewalkMat, false);

    for (let x = -45; x <= 45; x += 6) {
      this.addBlock([3.2, 0.06, 0.25], [x, 0.03, 29], stripeMat, false);
    }

    const lampXPositions = [-18, -7, 7, 18];
    for (const x of lampXPositions) {
      this.addBlock([0.35, 5.5, 0.35], [x, 2.75, 22.2], poleMat, true);
      this.addBlock([0.3, 0.25, 1.6], [x, 5.4, 22.8], poleMat, false);
      this.addBlock([0.6, 0.18, 0.9], [x, 5.25, 23.3], bulbMat, false);
    }
  }

  private buildCourtyardPathsAndPool(): void {
    // Central walkway from street sidewalk to villa front door now uses herringbone concrete tiles
    this.addPathBlock([6, 0.06, 24], [0, 0.03, 10], this.pathwayMat);

    const tileTex = this.createPoolTileTexture();
    const poolTileMat = new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.25,
      metalness: 0.1,
    });

    const poolCopingMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1de,
      roughness: 0.45,
    });

    this.addBlock([9.4, 0.3, 10.4], [11.5, -1.4, 9.0], poolTileMat, true);

    this.addBlock([0.3, 1.3, 10.2], [7.0, -0.6, 9.0], poolTileMat, true);
    this.addBlock([0.3, 1.3, 10.2], [16.0, -0.6, 9.0], poolTileMat, true);
    this.addBlock([9.2, 1.3, 0.3], [11.5, -0.6, 4.0], poolTileMat, true);
    this.addBlock([9.2, 1.3, 0.3], [11.5, -0.6, 14.0], poolTileMat, true);

    this.addBlock([0.6, 0.08, 10.8], [6.85, 0.04, 9.0], poolCopingMat, false);
    this.addBlock([0.6, 0.08, 10.8], [16.15, 0.04, 9.0], poolCopingMat, false);
    this.addBlock([9.9, 0.08, 0.6], [11.5, 0.04, 3.85], poolCopingMat, false);
    this.addBlock([9.9, 0.08, 0.6], [11.5, 0.04, 14.15], poolCopingMat, false);

    const stepMat = new THREE.MeshStandardMaterial({
      color: 0x90e0ef,
      roughness: 0.3,
    });
    this.addBlock([2.2, 0.35, 0.75], [8.3, -1.075, 6.2], stepMat, true);
    this.addBlock([2.2, 0.7, 0.75], [8.3, -0.9, 5.45], stepMat, true);
    this.addBlock([2.2, 1.05, 0.75], [8.3, -0.725, 4.7], stepMat, true);

    const poolLight = new THREE.PointLight(0x00f5d4, 25, 14);
    poolLight.position.set(11.5, -0.6, 9.0);
    this.scene.add(poolLight);

    const waterGeo = new THREE.PlaneGeometry(8.8, 9.8, 24, 24);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x00bbf9,
      emissive: 0x0077b6,
      emissiveIntensity: 0.35,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide,
    });
    this.poolWaterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.poolWaterMesh.rotation.x = -Math.PI / 2;
    this.poolWaterMesh.position.set(11.5, -0.14, 9.0);
    this.poolWaterMesh.receiveShadow = true;
    this.scene.add(this.poolWaterMesh);

    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      roughness: 0.3,
    });
    this.addBlock([1.2, 0.35, 0.8], [11.5, 0.175, 14.5], poolCopingMat, true);
    this.addBlock([1.1, 0.12, 2.7], [11.5, 0.4, 13.4], boardMat, true);

    const chairMat = new THREE.MeshStandardMaterial({
      color: 0xff4ecd,
      roughness: 0.5,
    });
    this.addBlock([1.0, 0.35, 2.1], [5.0, 0.175, 7.0], chairMat, true);
    this.addBlock([1.0, 0.35, 2.1], [5.0, 0.175, 11.0], chairMat, true);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa });
    const umbrellaMat = new THREE.MeshStandardMaterial({
      color: 0xffbe0b,
      roughness: 0.4,
    });
    this.addBlock([0.18, 2.6, 0.18], [5.0, 1.3, 9.0], poleMat, true);
    this.addBlock([2.8, 0.25, 2.8], [5.0, 2.6, 9.0], umbrellaMat, false);
    this.addBlock([1.6, 0.25, 1.6], [5.0, 2.85, 9.0], chairMat, false);

    this.flamingoGroup = new THREE.Group();
    this.flamingoGroup.position.set(12.2, -0.1, 8.8);

    const flamingoMat = new THREE.MeshStandardMaterial({
      color: 0xff2a85,
      emissive: 0xff2a85,
      emissiveIntensity: 0.2,
      roughness: 0.3,
    });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xffbe0b });

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.32, 12, 24),
      flamingoMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    this.flamingoGroup.add(ring);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 1.1, 12),
      flamingoMat
    );
    neck.position.set(0, 0.65, 0.75);
    neck.castShadow = true;
    this.flamingoGroup.add(neck);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.32, 0.45),
      flamingoMat
    );
    head.position.set(0, 1.2, 0.85);
    this.flamingoGroup.add(head);

    const beak = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.18, 0.35),
      beakMat
    );
    beak.position.set(0, 1.14, 1.18);
    this.flamingoGroup.add(beak);

    this.scene.add(this.flamingoGroup);

    const fountainBaseMat = new THREE.MeshStandardMaterial({
      color: 0xff4ecd,
      roughness: 0.4,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffbe0b,
      metalness: 0.85,
      roughness: 0.15,
    });

    this.addBlock([4.5, 0.5, 4.5], [-11.5, 0.25, 9], poolCopingMat, true);
    this.addBlock([4.0, 0.55, 4.0], [-11.5, 0.28, 9], waterMat, false);
    this.addBlock([1.6, 1.8, 1.6], [-11.5, 1.1, 9], fountainBaseMat, true);

    this.fountainStatue = new THREE.Group();
    this.fountainStatue.position.set(-11.5, 2.5, 9);
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.75, 0),
      goldMat
    );
    diamond.castShadow = true;
    this.fountainStatue.add(diamond);
    this.scene.add(this.fountainStatue);
  }

  private buildPerimeterWalls(): void {
    const wallH = 4.2;
    const wallY = wallH / 2;

    this.addWallBlock(
      [21, wallH, 0.8],
      [-13.5, wallY, 20],
      this.perimeterWallMat,
      true
    );
    this.addWallBlock(
      [21, wallH, 0.8],
      [13.5, wallY, 20],
      this.perimeterWallMat,
      true
    );

    this.addWallBlock(
      [1.2, 5.0, 1.2],
      [-3.4, 2.5, 20],
      this.outerVillaWallMat,
      true
    );
    this.addWallBlock(
      [1.2, 5.0, 1.2],
      [3.4, 2.5, 20],
      this.outerVillaWallMat,
      true
    );

    this.addWallBlock(
      [48.8, wallH, 0.8],
      [0, wallY, -26],
      this.perimeterWallMat,
      true
    );
    this.addWallBlock(
      [0.8, wallH, 46.8],
      [-24, wallY, -3],
      this.perimeterWallMat,
      true
    );
    this.addWallBlock(
      [0.8, wallH, 46.8],
      [24, wallY, -3],
      this.perimeterWallMat,
      true
    );
  }

  private buildExpandedVilla(): void {
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xff4ecd,
      roughness: 0.3,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x3d405b,
      roughness: 0.45,
    });
    const terraceMat = new THREE.MeshStandardMaterial({
      color: 0x2b2d42,
      roughness: 0.5,
    });

    const wallH = 4.2;
    const wallY = wallH / 2;

    this.addBlock([32, 0.1, 18], [0, 0.05, -11], floorMat, false);

    this.addWallBlock(
      [32.8, wallH, 0.8],
      [0, wallY, -20],
      this.outerVillaWallMat,
      true
    );
    this.addWallBlock(
      [0.8, wallH, 18.8],
      [-16, wallY, -11],
      this.outerVillaWallMat,
      true
    );
    this.addWallBlock(
      [0.8, wallH, 18.8],
      [16, wallY, -11],
      this.outerVillaWallMat,
      true
    );
    this.addWallBlock(
      [14, wallH, 0.8],
      [-9, wallY, -2],
      this.outerVillaWallMat,
      true
    );
    this.addWallBlock(
      [14, wallH, 0.8],
      [9, wallY, -2],
      this.outerVillaWallMat,
      true
    );
    this.addWallBlock(
      [4, 1.2, 0.8],
      [0, 3.6, -2],
      this.outerVillaWallMat,
      true
    );

    this.addWallBlock(
      [0.5, wallH, 5.9],
      [-5, wallY, -4.95],
      this.interiorVillaWallMat,
      true
    );
    this.addWallBlock(
      [0.5, wallH, 8.9],
      [-5, wallY, -15.55],
      this.interiorVillaWallMat,
      true
    );
    this.addWallBlock(
      [0.5, 1.2, 3.2],
      [-5, 3.6, -9.5],
      this.interiorVillaWallMat,
      true
    );

    this.addWallBlock(
      [0.5, wallH, 5.9],
      [5, wallY, -4.95],
      this.interiorVillaWallMat,
      true
    );
    this.addWallBlock(
      [0.5, wallH, 8.9],
      [5, wallY, -15.55],
      this.interiorVillaWallMat,
      true
    );
    this.addWallBlock(
      [0.5, 1.2, 3.2],
      [5, 3.6, -9.5],
      this.interiorVillaWallMat,
      true
    );

    const stairMat = new THREE.MeshStandardMaterial({
      color: 0xe9c46a,
      roughness: 0.4,
    });
    const numSteps = 14;
    const stepRise = 0.3;
    const stepRun = 0.6;
    for (let i = 0; i < numSteps; i++) {
      const h = (i + 1) * stepRise;
      const z = -8.5 - i * stepRun;
      this.addBlock([2.6, h, stepRun], [-2.5, h / 2, z], stairMat, true);
    }

    this.addBlock([12.2, 0.3, 18.8], [-10.3, 4.15, -11], terraceMat, true);
    this.addBlock([17.2, 0.3, 18.8], [7.8, 4.15, -11], terraceMat, true);
    this.addBlock([3.4, 0.3, 6.4], [-2.5, 4.15, -4.8], terraceMat, true);
    this.addBlock([3.4, 0.3, 3.8], [-2.5, 4.15, -18.5], terraceMat, true);

    this.addBlock([32.8, 1.1, 0.4], [0, 4.85, -1.8], trimMat, true);
    this.addBlock([32.8, 1.1, 0.4], [0, 4.85, -20.2], trimMat, true);
    this.addBlock([0.4, 1.1, 18.8], [-16.2, 4.85, -11], trimMat, true);
    this.addBlock([0.4, 1.1, 18.8], [16.2, 4.85, -11], trimMat, true);

    this.addWallBlock(
      [0.8, 3.2, 0.8],
      [-4.5, 5.8, -2.2],
      this.outerVillaWallMat,
      true
    );
    this.addWallBlock(
      [0.8, 3.2, 0.8],
      [4.5, 5.8, -2.2],
      this.outerVillaWallMat,
      true
    );
    this.addBlock([10.2, 0.7, 1.0], [0, 7.6, -2.2], trimMat, false);

    const villaSignTex = this.createNeonSignTexture(
      'VILLA CHAOS',
      '#00f5d4',
      '#ff4ecd'
    );
    const villaSignMat = new THREE.MeshStandardMaterial({
      map: villaSignTex,
      emissiveMap: villaSignTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.95,
      roughness: 0.2,
    });
    this.addBlock([7.6, 1.6, 0.25], [0, 7.6, -1.65], villaSignMat, false);

    this.populateRooms();
  }

  private populateRooms(): void {
    const foyerLight = new THREE.PointLight(0xffb703, 30, 18);
    foyerLight.position.set(1.5, 3.7, -8);
    this.scene.add(foyerLight);

    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.85,
    });
    this.addBlock([2.8, 0.04, 6.0], [0, 0.11, -5.2], carpetMat, false);

    const loungeLight = new THREE.PointLight(0xff4ecd, 35, 16);
    loungeLight.position.set(-10.5, 3.6, -11);
    this.scene.add(loungeLight);

    const barCounterMat = new THREE.MeshStandardMaterial({
      color: 0x1a0b2e,
      emissive: 0xff4ecd,
      emissiveIntensity: 0.25,
      roughness: 0.3,
    });
    const stoolMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      roughness: 0.3,
    });

    this.addBlock([1.2, 1.1, 6.5], [-13.2, 0.55, -14], barCounterMat, true);
    this.addBlock([0.6, 0.75, 0.6], [-11.5, 0.375, -12], stoolMat, true);
    this.addBlock([0.6, 0.75, 0.6], [-11.5, 0.375, -14], stoolMat, true);
    this.addBlock([0.6, 0.75, 0.6], [-11.5, 0.375, -16], stoolMat, true);

    const barSignTex = this.createNeonSignTexture(
      'VICE BAR',
      '#ff4ecd',
      '#00f5d4'
    );
    const barSignMat = new THREE.MeshStandardMaterial({
      map: barSignTex,
      emissiveMap: barSignTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.9,
    });
    const barSign = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.95, 0.12),
      barSignMat
    );
    barSign.position.set(-15.5, 2.5, -14);
    barSign.rotation.y = Math.PI / 2;
    this.scene.add(barSign);

    const sofaMat = new THREE.MeshStandardMaterial({
      color: 0xffbe0b,
      roughness: 0.6,
    });
    this.addBlock([3.8, 0.65, 1.4], [-10.5, 0.325, -4.2], sofaMat, true);

    const studyLight = new THREE.PointLight(0x00bbf9, 32, 16);
    studyLight.position.set(10.5, 3.6, -11);
    this.scene.add(studyLight);

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6f4e37,
      roughness: 0.7,
    });
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1a0b2e,
      roughness: 0.3,
      metalness: 0.5,
    });

    this.addBlock([0.9, 3.6, 11], [15.1, 1.8, -11], woodMat, true);
    this.addBlock([3.2, 0.85, 1.6], [10.0, 0.425, -11.5], woodMat, true);
    this.addBlock([1.4, 1.1, 1.4], [12.5, 0.55, -16.5], pedestalMat, true);

    this.addBlock([1.0, 0.35, 2.1], [8.5, 4.48, -6.5], stoolMat, true);
    this.addBlock([1.0, 0.35, 2.1], [11.0, 4.48, -6.5], stoolMat, true);
  }

  private buildTropicalTrees(): void {
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x8d5524,
      roughness: 0.9,
    });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x06d6a0,
      roughness: 0.6,
    });

    const palmCoords: [number, number][] = [
      [-17, 14],
      [-18, 4],
      [19, 16],
      [-20, -14],
      [20, -14],
      [-14, 22.4],
      [14, 22.4],
    ];

    for (const [x, z] of palmCoords) {
      this.addBlock([0.7, 4.8, 0.7], [x, 2.4, z], trunkMat, true);
      this.addBlock([3.6, 1.1, 3.6], [x, 5.1, z], leafMat, false);
      this.addBlock([2.2, 0.9, 2.2], [x, 5.9, z], leafMat, false);
    }
  }
}