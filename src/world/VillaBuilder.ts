import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Granny } from '../entities/Granny';
import { BarReceptionist } from '../entities/BarReceptionist';
import { BarDancer } from '../entities/BarDancer';
import { RoomDoor } from './RoomDoor';

export class VillaBuilder {
  private scene: THREE.Scene;
  private colliders: THREE.Box3[];

  public duckGroup: THREE.Group | null = null;
  public duckBaseY = -0.1;
  public duckCollider: THREE.Box3 | null = null;
  public grannyNpc: Granny | null = null;
  public barDoor!: RoomDoor;
  public bathroomDoor!: RoomDoor;
  public backyardDoor!: RoomDoor;
  public barReceptionist!: BarReceptionist;
  private readonly barDancers: BarDancer[] = [];
  private readonly barCourtyardOffset = new THREE.Vector3(-7.5, 0, 24);
  private ceilingFanRotors: THREE.Object3D[] = [];
  private readonly discoLights: THREE.PointLight[] = [];
  private readonly discoBulbs: THREE.Mesh[] = [];
  private readonly discoBall: THREE.Mesh;
  private discoElapsed = 0;
  public poolWaterMesh: THREE.Mesh | null = null;

  private perimeterWallMat: THREE.MeshStandardMaterial;
  private outerVillaWallMat: THREE.MeshStandardMaterial;
  private interiorVillaWallMat: THREE.MeshStandardMaterial;
  private villaPavementMat: THREE.MeshStandardMaterial;
  private gatePavementMat: THREE.MeshStandardMaterial;
  private roadMat: THREE.MeshStandardMaterial;
  private interiorTileMat: THREE.MeshStandardMaterial;

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
    this.interiorTileMat = this.createInteriorTileMaterial();

    this.villaPavementMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
    });
    this.gatePavementMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
    });
    this.roadMat = new THREE.MeshStandardMaterial({
      color: 0x292b31,
      roughness: 0.92,
    });

    this.discoBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 18),
      new THREE.MeshStandardMaterial({
        color: 0xcbd0df,
        metalness: 0.92,
        roughness: 0.14,
        emissive: 0x171725,
      })
    );
  }

  public build(): void {
    this.buildOuterStreet();
    this.buildCourtyardPathsAndPool();
    this.buildPerimeterWalls();
    this.buildExpandedVilla();
    this.buildTropicalTrees();
    this.addGrannyNPC();

    this.loadPlasterWallGLTF();
    this.loadPavementGLTF(
      '/brick_pavement_03_1k.gltf/brick_pavement_03_1k.gltf',
      '/brick_pavement_03_1k.gltf',
      this.villaPavementMat
    );
    this.loadPavementGLTF(
      '/square_pavers_1k.gltf/square_pavers_1k.gltf',
      '/square_pavers_1k.gltf',
      this.gatePavementMat
    );
    this.loadPavementGLTF(
      '/asphalt_track_1k.gltf/asphalt_track_1k.gltf',
      '/asphalt_track_1k.gltf',
      this.roadMat
    );
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
        { mat: this.perimeterWallMat, tint: 0xffffff },
        { mat: this.outerVillaWallMat, tint: 0xffffff },
        { mat: this.interiorVillaWallMat, tint: 0xffffff },
      ];

      for (const { mat, tint } of targetMaterials) {
        mat.color.setHex(tint);
        // Keep the plaster's surface relief, but skip its gray albedo texture
        // so the walls read as freshly painted white instead of bare cement.
        mat.map = null;
        mat.normalMap = foundMat.normalMap;
        mat.normalScale.set(1.1, 1.1);
        mat.roughnessMap = foundMat.roughnessMap;
        mat.metalnessMap = foundMat.metalnessMap;
        mat.aoMap = foundMat.aoMap;
        mat.aoMapIntensity = 0.45;
        mat.roughness = 0.9;
        mat.metalness = 0;
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

  private loadPavementGLTF(
    primaryPath: string,
    fallbackPath: string,
    targetMaterial: THREE.MeshStandardMaterial
  ): void {
    const loader = new GLTFLoader();

    const applyLoadedGLTF = (gltfScene: THREE.Group) => {
      let sourceMat: THREE.MeshStandardMaterial | null = null;
      gltfScene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material || sourceMat) return;
        sourceMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      });
      if (!sourceMat) return;

      const foundMat = sourceMat as THREE.MeshStandardMaterial;
      for (const texture of [
        foundMat.map,
        foundMat.normalMap,
        foundMat.roughnessMap,
        foundMat.metalnessMap,
        foundMat.aoMap,
      ]) {
        if (!texture) continue;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;
      }

      targetMaterial.color.setHex(0xffffff);
      targetMaterial.map = foundMat.map;
      targetMaterial.normalMap = foundMat.normalMap;
      targetMaterial.normalScale.set(1, 1);
      targetMaterial.roughnessMap = foundMat.roughnessMap;
      targetMaterial.metalnessMap = foundMat.metalnessMap;
      targetMaterial.aoMap = foundMat.aoMap;
      targetMaterial.aoMapIntensity = 0.8;
      targetMaterial.roughness = foundMat.roughness ?? 0.82;
      targetMaterial.metalness = foundMat.metalness ?? 0;
      targetMaterial.needsUpdate = true;
    };

    loader.load(
      primaryPath,
      (gltf) => applyLoadedGLTF(gltf.scene),
      undefined,
      () => loader.load(fallbackPath, (gltf) => applyLoadedGLTF(gltf.scene))
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

  private createInteriorTileMaterial(): THREE.MeshStandardMaterial {
    const textureLoader = new THREE.TextureLoader();
    const colorMap = textureLoader.load(
      '/interior_tiles_1k.gltf/textures/interior_tiles_diff_1k.jpg'
    );
    colorMap.colorSpace = THREE.SRGBColorSpace;
    colorMap.wrapS = THREE.RepeatWrapping;
    colorMap.wrapT = THREE.RepeatWrapping;
    colorMap.anisotropy = 8;

    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: colorMap,
      roughness: 0.92,
      metalness: 0,
    });
  }

  private applyInteriorFloorUVs(mesh: THREE.Mesh, width: number, depth: number): void {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const normals = geometry.attributes.normal as THREE.BufferAttribute;
    const uvs = geometry.attributes.uv as THREE.BufferAttribute;
    const tileSize = 1.5;

    for (let i = 0; i < positions.count; i++) {
      if (Math.abs(normals.getY(i)) < 0.99) continue;
      uvs.setXY(
        i,
        (positions.getX(i) + width / 2) / tileSize,
        (positions.getZ(i) + depth / 2) / tileSize
      );
    }
    uvs.needsUpdate = true;
  }

  private addPathBlock(
    size: [number, number, number],
    pos: [number, number, number],
    material: THREE.Material
  ): THREE.Mesh {
    const [w, h, d] = size;
    const geo = new THREE.BoxGeometry(w, h, d);

    // Scale pavement UVs so one texture tile covers 3m x 3m.
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

    this.addPathBlock([120, 0.04, 10], [0, 0.02, 29], this.roadMat);
    this.addBlock([120, 0.14, 3.2], [0, 0.07, 35.6], sidewalkMat, false);
    // Square pavers cover the full gate-side sidewalk and sit just above the
    // brick path where the two surfaces overlap.
    this.addPathBlock([120, 0.01, 3.2], [0, 0.045, 22.4], this.gatePavementMat);

    for (let x = -45; x <= 45; x += 6) {
      this.addBlock([3.2, 0.06, 0.25], [x, 0.03, 29], stripeMat, false);
    }

    const lampXPositions = [-18, 7, 18];
    for (const x of lampXPositions) {
      this.addBlock([0.35, 5.5, 0.35], [x, 2.75, 22.2], poleMat, true);
      this.addBlock([0.3, 0.25, 1.6], [x, 5.4, 22.8], poleMat, false);
      this.addBlock([0.6, 0.18, 0.9], [x, 5.25, 23.3], bulbMat, false);
    }
  }

  private buildCourtyardPathsAndPool(): void {
    // Brick paving runs from the villa entrance to the outer gate-side pavers.
    this.addPathBlock([6, 0.04, 24], [0, 0.02, 10], this.villaPavementMat);

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

    const waterGeo = new THREE.PlaneGeometry(8.8, 9.8, 24, 24);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x39b9d7,
      emissive: 0x001820,
      emissiveIntensity: 0.08,
      roughness: 0.2,
      metalness: 0.02,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });
    this.poolWaterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.poolWaterMesh.rotation.x = -Math.PI / 2;
    this.poolWaterMesh.position.set(11.5, -0.14, 9.0);
    this.poolWaterMesh.receiveShadow = true;
    this.scene.add(this.poolWaterMesh);

    this.loadPoolDuck();
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

    const posterTexture = new THREE.TextureLoader().load('/poster.png');
    posterTexture.colorSpace = THREE.SRGBColorSpace;
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(6.2, 1.98),
      new THREE.MeshStandardMaterial({
        map: posterTexture,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      })
    );
    // Flush to the outside face of the left perimeter wall beside the gate.
    poster.position.set(-7.2, 2.65, 20.412);
    poster.receiveShadow = true;
    this.scene.add(poster);

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

    const rearBoundaryZ = -48;
    this.addWallBlock(
      [48.8, wallH, 0.8],
      [0, wallY, rearBoundaryZ],
      this.perimeterWallMat,
      true
    );
    this.addWallBlock(
      [0.8, wallH, 68.8],
      [-24, wallY, -14],
      this.perimeterWallMat,
      true
    );
    this.addWallBlock(
      [0.8, wallH, 68.8],
      [24, wallY, -14],
      this.perimeterWallMat,
      true
    );
  }

  private buildExpandedVilla(): void {
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xff4ecd,
      roughness: 0.3,
    });
    // Raise the upstairs floor to give the ground-floor hall a full 5 m ceiling.
    const groundFloorClearance = 5.0;
    const wallH = groundFloorClearance + 0.2;
    const wallY = wallH / 2;

    const groundFloor = this.addBlock([32, 0.1, 18], [0, 0.05, -11], this.interiorTileMat, false);
    this.applyInteriorFloorUVs(groundFloor, 32, 18);

    this.buildRearEntrance(wallH);
    this.buildBackyardTemple();
    this.buildBackyardJuiceStall();
    // Seal the former bar room's west wall after moving the bar outside.
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
    this.buildGroundFloorFrontFacade(wallH);
    this.addWallBlock(
      [3.2, 2.2, 0.8],
      [0, groundFloorClearance - 0.9, -2],
      this.outerVillaWallMat,
      true
    );

    // Keep the kitchen open to the hall through a wider, framed entrance.
    for (const [startZ, endZ] of [
      [-20, -10.6],
      [-8.4, -2],
    ]) {
      this.addWallBlock(
        [0.5, wallH, endZ - startZ],
        [-4.4, wallY, (startZ + endZ) / 2],
        this.interiorVillaWallMat,
        true
      );
    }
    this.addWallBlock(
      [0.5, 2.2, 2.2],
      [-4.4, groundFloorClearance - 0.9, -9.5],
      this.interiorVillaWallMat,
      true
    );
    const kitchenFrameMat = new THREE.MeshStandardMaterial({ color: 0x80552f, roughness: 0.68 });
    for (const z of [-10.6, -8.4]) {
      this.addBlock([0.56, 3.0, 0.14], [-4.4, 1.5, z], kitchenFrameMat, false);
    }
    this.addBlock([0.56, 0.16, 2.32], [-4.4, 3.0, -9.5], kitchenFrameMat, false);

    // Keep the east-side button room open to the stair hall as one large room.

    this.buildModernStaircase(groundFloorClearance);
    this.buildRightSideServiceRooms(groundFloorClearance);
    this.buildExtraRoomKitchen();

    // Second-floor slab with a compact transverse stairwell opening. The flight
    // rises toward -X, leaving a clear route past the bar entrance below.
    const secondFloorWest = this.addBlock([12.1, 0.3, 18.8], [-10.35, groundFloorClearance + 0.15, -11], this.interiorTileMat, true);
    const secondFloorEast = this.addBlock([12.1, 0.3, 18.8], [10.35, groundFloorClearance + 0.15, -11], this.interiorTileMat, true);
    const secondFloorCenter = this.addBlock([8.6, 0.3, 15.95], [0, groundFloorClearance + 0.15, -9.575], this.interiorTileMat, true);
    this.applyInteriorFloorUVs(secondFloorWest, 12.1, 18.8);
    this.applyInteriorFloorUVs(secondFloorEast, 12.1, 18.8);
    this.applyInteriorFloorUVs(secondFloorCenter, 8.6, 15.95);

    const upperTrimY = groundFloorClearance + 0.85;
    this.addBlock([32.8, 1.1, 0.4], [0, upperTrimY, -20.2], trimMat, true);
    this.addBlock([0.4, 1.1, 18.8], [-16.2, upperTrimY, -11], trimMat, true);
    this.addBlock([0.4, 1.1, 18.8], [16.2, upperTrimY, -11], trimMat, true);

    this.buildUpperFrontFacade(groundFloorClearance);

    this.populateRooms();
  }

  private buildRearEntrance(wallHeight: number): void {
    const wallWidth = 32.8;
    const wallDepth = 0.8;
    const wallZ = -20;
    // Offset the back door from the stair foot to leave a clear landing area.
    const doorX = 6.2;
    const doorWidth = 1.7;
    const doorHeight = 2.5;
    const xStart = -wallWidth / 2;
    const xEnd = wallWidth / 2;
    const doorStartX = doorX - doorWidth / 2;
    const doorEndX = doorX + doorWidth / 2;

    // Keep the rear entrance on the ground floor, beside the indoor stair landing.
    for (const [startX, endX] of [
      [xStart, doorStartX],
      [doorEndX, xEnd],
    ]) {
      this.addWallBlock(
        [endX - startX, wallHeight, wallDepth],
        [(startX + endX) / 2, wallHeight / 2, wallZ],
        this.outerVillaWallMat,
        true
      );
    }
    this.addWallBlock(
      [doorWidth, wallHeight - doorHeight, wallDepth],
      [doorX, doorHeight + (wallHeight - doorHeight) / 2, wallZ],
      this.outerVillaWallMat,
      true
    );

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x80552f, roughness: 0.68 });
    for (const x of [doorStartX, doorEndX]) {
      this.addBlock([0.12, doorHeight, wallDepth + 0.06], [x, doorHeight / 2, wallZ], frameMat, false);
    }
    this.addBlock(
      [doorWidth + 0.12, 0.14, wallDepth + 0.06],
      [doorX, doorHeight, wallZ],
      frameMat,
      false
    );

    this.backyardDoor = new RoomDoor(this.scene, this.colliders, {
      interactionPosition: new THREE.Vector3(doorX, 1.15, wallZ + 1.15),
      centerX: doorX,
      centerZ: wallZ,
      width: doorWidth,
      height: doorHeight,
    });

    // A ground-level paved apron connects the door directly to the expanded yard.
    const patioMat = new THREE.MeshStandardMaterial({ color: 0xd1cec6, roughness: 0.76 });
    this.addBlock(
      [9, 0.04, 4],
      [doorX, 0.02, wallZ - wallDepth / 2 - 2],
      patioMat,
      true
    );
  }

  private buildBackyardTemple(): void {
    // Place the open-front shrine in the far back-right corner, facing the villa.
    const centerX = 18;
    const frontZ = -38.7;
    const backZ = -44.5;
    const width = 6.4;
    const plinthHeight = 0.66;
    const roofY = 5.85;
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xf0e5d2, roughness: 0.82 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xb77b32, roughness: 0.52, metalness: 0.16 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x9d3428, roughness: 0.7 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xc9b89b, roughness: 0.9 });

    this.addBlock([7.4, plinthHeight, 6.8], [centerX, plinthHeight / 2, (frontZ + backZ) / 2], stoneMat, true);
    this.addBlock([6.8, 0.12, 6.2], [centerX, plinthHeight + 0.06, (frontZ + backZ) / 2], floorMat, false);

    // Three enclosed sides create a walk-in shrine, with the villa-facing side open.
    for (const x of [centerX - 3.05, centerX + 3.05]) {
      this.addBlock([0.3, 4.9, 5.8], [x, plinthHeight + 2.45, (frontZ + backZ) / 2], stoneMat, true);
    }
    this.addBlock([6.1, 5.1, 0.3], [centerX, plinthHeight + 2.55, backZ], stoneMat, true);

    // Broad three-step stair rises from the backyard to the raised temple floor.
    for (let step = 0; step < 3; step += 1) {
      const stepHeight = plinthHeight * (step + 1) / 3;
      this.addBlock(
        [5.4, stepHeight, 0.52],
        [centerX, stepHeight / 2, frontZ + 1.55 - step * 0.52],
        stoneMat,
        true
      );
    }

    // Tall carved-looking entry pillars frame the open side and support the roof.
    for (const x of [centerX - 2.65, centerX + 2.65]) {
      this.addBlock([0.42, 5.0, 0.42], [x, plinthHeight + 2.5, frontZ + 0.05], trimMat, true);
      this.addBlock([0.68, 0.2, 0.68], [x, plinthHeight + 0.1, frontZ + 0.05], stoneMat, false);
      this.addBlock([0.68, 0.2, 0.68], [x, 5.62, frontZ + 0.05], trimMat, false);
    }

    // Framed deity image on the inner rear wall. The portrait image keeps its aspect ratio.
    const frameZ = backZ + 0.2;
    this.addBlock([2.35, 3.95, 0.18], [centerX, 3.15, frameZ], trimMat, false);
    const imageTexture = new THREE.TextureLoader().load('/modi_mandir.png');
    imageTexture.colorSpace = THREE.SRGBColorSpace;
    const image = new THREE.Mesh(
      new THREE.PlaneGeometry(1.95, 3.75),
      new THREE.MeshBasicMaterial({ map: imageTexture, toneMapped: false })
    );
    image.position.set(centerX, 3.15, frameZ + 0.11);
    this.scene.add(image);

    this.addBlock([7.2, 0.32, 6.6], [centerX, roofY, (frontZ + backZ) / 2], trimMat, false);
    this.addBlock([6.8, 0.28, 6.2], [centerX, roofY + 0.3, (frontZ + backZ) / 2], roofMat, false);
    this.addBlock([5.2, 0.32, 4.8], [centerX, roofY + 0.62, (frontZ + backZ) / 2], trimMat, false);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.75, 3.4, 4), roofMat);
    spire.position.set(centerX, roofY + 2.42, (frontZ + backZ) / 2);
    spire.rotation.y = Math.PI / 4;
    spire.castShadow = true;
    spire.receiveShadow = true;
    this.scene.add(spire);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), trimMat);
    finial.position.set(centerX, roofY + 4.18, (frontZ + backZ) / 2);
    this.scene.add(finial);

    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffd37a, emissive: 0xffa928, emissiveIntensity: 0.8 });
    for (const x of [centerX - 1.4, centerX + 1.4]) {
      this.addBlock([0.28, 0.42, 0.28], [x, 0.87, frontZ - 0.5], trimMat, false);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), lampMat);
      lamp.position.set(x, 1.16, frontZ - 0.5);
      this.scene.add(lamp);
    }
  }

  private buildBackyardJuiceStall(): void {
    const centerX = 4.8;
    const frontZ = -39.0;
    const backZ = -42.2;
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x754126, roughness: 0.72 });
    const counterMat = new THREE.MeshStandardMaterial({ color: 0xfff0d0, roughness: 0.76 });
    const canopyColors = [0xf05a28, 0xffd447, 0x56a75a, 0xffd447, 0xf05a28, 0xffd447, 0x56a75a];

    // Walk-up counter faces the villa entrance and the open backyard.
    this.addBlock([5.0, 1.02, 0.82], [centerX, 0.63, frontZ], woodMat, true);
    this.addBlock([5.2, 0.14, 1.02], [centerX, 1.2, frontZ], counterMat, true);

    // Four posts support a striped canopy, leaving the stall open to walk up to.
    for (const x of [centerX - 2.55, centerX + 2.55]) {
      for (const z of [frontZ - 0.15, backZ + 0.15]) {
        this.addBlock([0.16, 2.75, 0.16], [x, 1.55, z], woodMat, true);
      }
    }
    for (let stripe = 0; stripe < canopyColors.length; stripe += 1) {
      const color = new THREE.MeshStandardMaterial({ color: canopyColors[stripe], roughness: 0.72 });
      this.addBlock(
        [5.8 / canopyColors.length, 0.14, 3.8],
        [centerX - 2.9 + (stripe + 0.5) * (5.8 / canopyColors.length), 2.98, (frontZ + backZ) / 2],
        color,
        false
      );
    }

    const posterFrameMat = new THREE.MeshStandardMaterial({ color: 0x754126, roughness: 0.62 });
    const posterY = 0.74;
    this.addBlock([4.85, 1.42, 0.1], [centerX, posterY, frontZ + 0.54], posterFrameMat, false);
    const posterTexture = new THREE.TextureLoader().load('/juice_poster.png');
    posterTexture.colorSpace = THREE.SRGBColorSpace;
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(4.62, 1.32),
      new THREE.MeshBasicMaterial({ map: posterTexture, toneMapped: false })
    );
    poster.position.set(centerX, posterY, frontZ + 0.60);
    this.scene.add(poster);

    // A blender and bright fruit display make the counter read as a juice stand.
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xbac5c8, roughness: 0.28, metalness: 0.68 });
    this.addBlock([0.48, 0.48, 0.42], [centerX - 1.5, 1.5, frontZ], steelMat, false);
    const blenderJar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.19, 0.42, 16),
      new THREE.MeshPhysicalMaterial({ color: 0xc6edf1, roughness: 0.12, transparent: true, opacity: 0.58 })
    );
    blenderJar.position.set(centerX - 1.5, 1.95, frontZ);
    this.scene.add(blenderJar);
    const fruitColors = [0xff6a2e, 0xf2d333, 0x56ad45, 0xe94343, 0xff9d25, 0x8abf3d];
    for (let fruit = 0; fruit < fruitColors.length; fruit += 1) {
      const fruitMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 12, 10),
        new THREE.MeshStandardMaterial({ color: fruitColors[fruit], roughness: 0.45 })
      );
      fruitMesh.position.set(
        centerX + 0.1 + (fruit % 3) * 0.36,
        1.47 + Math.floor(fruit / 3) * 0.2,
        frontZ + (fruit % 2) * 0.19
      );
      fruitMesh.scale.set(1, 0.9, 1);
      fruitMesh.castShadow = true;
      this.scene.add(fruitMesh);
    }

    // A friendly vendor stands behind the counter facing customers.
    const seller = new THREE.Group();
    seller.position.set(centerX + 1.0, 0, frontZ - 0.72);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x9b6246, roughness: 0.88 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2d8b68, roughness: 0.82 });
    const apronMat = new THREE.MeshStandardMaterial({ color: 0xf4d7a1, roughness: 0.9 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x231b18, roughness: 0.95 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x211b18, roughness: 0.7 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.42, 5, 10), shirtMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    seller.add(torso);
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.48, 0.06), apronMat);
    apron.position.set(0, 1.03, 0.2);
    seller.add(apron);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), skinMat);
    head.position.set(0, 1.72, 0.02);
    head.scale.set(0.9, 1.08, 0.9);
    head.castShadow = true;
    seller.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.225, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMat);
    hair.position.set(0, 1.76, 0.015);
    seller.add(hair);
    for (const eyeX of [-0.075, 0.075]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeMat);
      eye.position.set(eyeX, 1.75, 0.215);
      seller.add(eye);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), skinMat);
    nose.position.set(0, 1.69, 0.235);
    seller.add(nose);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.42, 4, 8), shirtMat);
      arm.position.set(side * 0.31, 1.17, 0.16);
      arm.rotation.x = Math.PI / 2.8;
      arm.rotation.z = side * -0.12;
      arm.castShadow = true;
      seller.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), skinMat);
      hand.position.set(side * 0.37, 1.03, 0.36);
      seller.add(hand);
    }
    this.scene.add(seller);

    // Nested paper cups are stacked at the customer end of the counter.
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xfffbf0, roughness: 0.58 });
    const cupBandMat = new THREE.MeshStandardMaterial({ color: 0xe85c37, roughness: 0.65 });
    const cupX = centerX + 1.95;
    const cupZ = frontZ + 0.12;
    for (let cup = 0; cup < 5; cup += 1) {
      const cupY = 1.31 + cup * 0.14;
      const disposableCup = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.095, 0.24, 16), cupMat);
      disposableCup.position.set(cupX, cupY, cupZ);
      disposableCup.castShadow = true;
      disposableCup.receiveShadow = true;
      this.scene.add(disposableCup);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.119, 0.11, 0.045, 16), cupBandMat);
      band.position.set(cupX, cupY - 0.025, cupZ);
      this.scene.add(band);
    }

    // Customer seating faces the walk-up counter and sits clear of the temple stairs.
    const chairPath = '/models/plastic_monobloc_chair_01_1k.gltf/plastic_monobloc_chair_01_1k.gltf';
    const chairSpots: Array<[number, number, number]> = [
      [centerX - 2.1, frontZ + 1.4, Math.PI + 0.42],
      [centerX + 0.15, frontZ + 1.8, Math.PI - 0.28],
      [centerX + 2.0, frontZ + 1.25, Math.PI + 0.86],
    ];
    for (const [x, z, angle] of chairSpots) {
      this.loadHallFurnitureModel(
        chairPath,
        new THREE.Vector3(x, 0, z),
        1.0,
        angle
      );
    }
  }

  private buildGroundFloorFrontFacade(wallHeight: number): void {
    const buildWing = (xStart: number, xEnd: number, windowStart: number, windowEnd: number) => {
      const windowBottom = 0.78;
      const windowTop = 3.25;
      const fullSegments: Array<[number, number]> = [
        [xStart, windowStart],
        [windowEnd, xEnd],
      ];
      for (const [start, end] of fullSegments) {
        this.addWallBlock(
          [end - start, wallHeight, 0.8],
          [(start + end) / 2, wallHeight / 2, -2],
          this.outerVillaWallMat,
          true
        );
      }
      this.addWallBlock(
        [windowEnd - windowStart, windowBottom, 0.8],
        [(windowStart + windowEnd) / 2, windowBottom / 2, -2],
        this.outerVillaWallMat,
        true
      );
      this.addWallBlock(
        [windowEnd - windowStart, wallHeight - windowTop, 0.8],
        [(windowStart + windowEnd) / 2, (wallHeight + windowTop) / 2, -2],
        this.outerVillaWallMat,
        true
      );
      this.addFrontWindow(
        (windowStart + windowEnd) / 2,
        (windowBottom + windowTop) / 2,
        windowEnd - windowStart,
        windowTop - windowBottom,
        -1.51
      );
    };

    buildWing(-16, -1.6, -13, -7);
    buildWing(1.6, 16, 6, 13);

    // Keep the main entrance open, with a timber frame and no door leaf.
    const timberFrame = new THREE.MeshStandardMaterial({ color: 0x80552f, roughness: 0.68 });
    for (const x of [-1.6, 1.6]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.9, 0.8), timberFrame);
      jamb.position.set(x, 1.45, -2);
      jamb.castShadow = true;
      this.scene.add(jamb);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.2, 0.8), timberFrame);
    lintel.position.set(0, 2.9, -2);
    lintel.castShadow = true;
    this.scene.add(lintel);
    this.addHindiEntrancePlaque('शुभ', -2.65, 2.55, 0.82, 0.54);
    this.addHindiEntrancePlaque('लाभ', 2.65, 2.55, 0.82, 0.54);
    this.addHindiEntrancePlaque('श्री', 0, 3.55, 1.02, 0.58);
  }

  private addHindiEntrancePlaque(
    text: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.12, height + 0.12, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x762b27, roughness: 0.48, metalness: 0.08 })
    );
    backing.position.set(x, y, -1.56);
    backing.castShadow = true;
    this.scene.add(backing);

    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#f4d58d';
    context.shadowColor = '#f4d58d';
    context.shadowBlur = 12;
    context.font = 'bold 150px "Noto Sans Devanagari", "Nirmala UI", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const lettering = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false })
    );
    lettering.position.set(x, y, -1.49);
    this.scene.add(lettering);
  }

  private buildUpperFrontFacade(floorHeight: number): void {
    const xStart = -16;
    const xEnd = 16;
    const wallBottom = floorHeight + 0.3;
    const wallTop = 9.2;
    const openings: Array<[number, number]> = [
      [-12.8, -5.0],
      [4.2, 13.6],
    ];
    const windowBottom = 5.78;
    const windowTop = 8.68;
    const wallZ = -2.0;
    let cursor = xStart;

    for (const [start, end] of openings) {
      if (start > cursor) {
        this.addWallBlock(
          [start - cursor, wallTop - wallBottom, 0.5],
          [(cursor + start) / 2, (wallBottom + wallTop) / 2, wallZ],
          this.outerVillaWallMat,
          true
        );
      }
      this.addWallBlock(
        [end - start, windowBottom - wallBottom, 0.5],
        [(start + end) / 2, (wallBottom + windowBottom) / 2, wallZ],
        this.outerVillaWallMat,
        true
      );
      this.addWallBlock(
        [end - start, wallTop - windowTop, 0.5],
        [(start + end) / 2, (windowTop + wallTop) / 2, wallZ],
        this.outerVillaWallMat,
        true
      );
      this.addFrontWindow(
        (start + end) / 2,
        (windowBottom + windowTop) / 2,
        end - start,
        windowTop - windowBottom,
        -1.66
      );
      cursor = end;
    }
    if (cursor < xEnd) {
      this.addWallBlock(
        [xEnd - cursor, wallTop - wallBottom, 0.5],
        [(cursor + xEnd) / 2, (wallBottom + wallTop) / 2, wallZ],
        this.outerVillaWallMat,
        true
      );
    }

    const balconyCenterX = -8.3;
    const balconyWidth = 14.4;
    const balconyDepth = 4.3;
    const balconyFrontZ = 2.45;
    const balcony = this.addBlock(
      [balconyWidth, 0.32, balconyDepth],
      [balconyCenterX, floorHeight + 0.46, 0.3],
      this.outerVillaWallMat,
      true
    );
    balcony.receiveShadow = true;

    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0x39434a,
      roughness: 0.34,
      metalness: 0.68,
    });
    const railXStart = balconyCenterX - balconyWidth / 2 + 0.18;
    const railXEnd = balconyCenterX + balconyWidth / 2 - 0.18;
    for (const y of [5.78, 6.48]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(railXEnd - railXStart, 0.065, 0.065),
        railMaterial
      );
      rail.position.set((railXStart + railXEnd) / 2, y, balconyFrontZ);
      rail.castShadow = true;
      this.scene.add(rail);
    }
    for (let x = railXStart; x <= railXEnd + 0.01; x += 1.25) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.78, 0.055), railMaterial);
      post.position.set(x, 6.12, balconyFrontZ);
      post.castShadow = true;
      this.scene.add(post);
    }
    for (const x of [balconyCenterX - balconyWidth / 2, balconyCenterX + balconyWidth / 2]) {
      const sideRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.065, balconyDepth - 0.2),
        railMaterial
      );
      sideRail.position.set(x, 6.48, 0.3);
      sideRail.castShadow = true;
      this.scene.add(sideRail);
      for (const z of [-1.45, 0.3, 2.05]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.78, 0.055), railMaterial);
        post.position.set(x, 6.12, z);
        this.scene.add(post);
      }
    }

    const timber = new THREE.MeshStandardMaterial({ color: 0x9b6234, roughness: 0.72 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.2, 5.8), timber);
    canopy.position.set(balconyCenterX, 9.38, 0.7);
    canopy.rotation.x = 0.16;
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    this.scene.add(canopy);

    for (let x = -15.3; x <= -1.3; x += 2.0) {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 5.75), timber);
      rafter.position.set(x, 9.28, 0.7);
      rafter.rotation.x = 0.16;
      rafter.castShadow = true;
      this.scene.add(rafter);
    }
    for (const x of [-15.2, -8.3, -1.4]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.3, 0.2), timber);
      post.position.set(x, 7.25, 2.34);
      post.castShadow = true;
      this.scene.add(post);
    }

    // A slim red metal awning shades the ground-floor windows on the right.
    const awningMat = new THREE.MeshStandardMaterial({
      color: 0x7c3941,
      roughness: 0.58,
      metalness: 0.22,
    });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(14, 0.16, 1.65), awningMat);
    awning.position.set(9, 5.03, -0.72);
    awning.rotation.x = 0.1;
    awning.castShadow = true;
    this.scene.add(awning);
    for (let x = 2.2; x <= 15.8; x += 0.65) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 1.55), awningMat);
      rib.position.set(x, 5.13, -0.72);
      rib.rotation.x = 0.1;
      this.scene.add(rib);
    }
  }

  private addFrontWindow(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    frontZ: number
  ): void {
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 0.16, height - 0.16),
      new THREE.MeshPhysicalMaterial({
        color: 0x9bbac8,
        roughness: 0.18,
        metalness: 0.12,
        transparent: true,
        opacity: 0.58,
        side: THREE.DoubleSide,
      })
    );
    glass.position.set(centerX, centerY, frontZ);
    this.scene.add(glass);

    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e5dc, roughness: 0.55 });
    const frameDepth = 0.14;
    const rail = 0.11;
    const xLeft = centerX - width / 2;
    const xRight = centerX + width / 2;
    const yBottom = centerY - height / 2;
    const yTop = centerY + height / 2;
    const frameBar = (size: [number, number, number], x: number, y: number) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(...size), frameMaterial);
      bar.position.set(x, y, frontZ + 0.025);
      bar.castShadow = true;
      this.scene.add(bar);
    };

    frameBar([rail, height + rail, frameDepth], xLeft, centerY);
    frameBar([rail, height + rail, frameDepth], xRight, centerY);
    frameBar([width + rail, rail, frameDepth], centerX, yBottom);
    frameBar([width + rail, rail, frameDepth], centerX, yTop);
    frameBar([0.075, height, frameDepth], centerX, centerY);
  }

  private buildRightSideServiceRooms(floorHeight: number): void {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe7e1d7, roughness: 0.78 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x98724c, roughness: 0.52 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd9d3c8, roughness: 0.3 });
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x67503e, roughness: 0.56 });
    const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xf4f2eb, roughness: 0.2 });

    // Keep only the compact bathroom in the east service wing. The old
    // kitchen area is opened back into the hall; the kitchen now occupies the
    // unused room on the villa's west side.
    const westWallX = 11.0;
    const wallThickness = 0.22;
    const wallHeight = floorHeight;
    const wallCenterY = wallHeight / 2;
    const wallZStart = -20;
    const bathroomEndZ = -15.0;
    const serviceWingEastX = 14.5;
    const serviceWingStartX = westWallX + wallThickness / 2;
    const roomDoorCenterX = 12.8;
    const roomDoorWidth = 1.35;
    const roomDoorHeight = 2.45;

    // West wall faces the hall. Leave its middle open as the entry to the
    // The bathroom's hall-facing wall; the rest remains open hall space.
    this.addBlock(
      [wallThickness, wallHeight, bathroomEndZ - wallZStart],
      [westWallX, wallCenterY, (wallZStart + bathroomEndZ) / 2],
      wallMat,
      true
    );
    this.addBlock(
      [wallThickness, wallHeight, bathroomEndZ - wallZStart],
      [serviceWingEastX, wallCenterY, (wallZStart + bathroomEndZ) / 2],
      wallMat,
      true
    );

    // Close the ends of both rooms with door openings facing the wash area.
    const addRoomDoorway = (boundaryZ: number) => {
      const doorStartX = roomDoorCenterX - roomDoorWidth / 2;
      const doorEndX = roomDoorCenterX + roomDoorWidth / 2;
      for (const [start, end] of [
        [serviceWingStartX, doorStartX],
        [doorEndX, serviceWingEastX],
      ]) {
        this.addBlock(
          [end - start, wallHeight, wallThickness],
          [(start + end) / 2, wallCenterY, boundaryZ],
          wallMat,
          true
        );
      }

      this.addBlock(
        [roomDoorWidth + 0.09, wallHeight - roomDoorHeight, wallThickness + 0.04],
        [roomDoorCenterX, (wallHeight + roomDoorHeight) / 2, boundaryZ],
        wallMat,
        true
      );
      for (const side of [-1, 1]) {
        this.addBlock(
          [0.09, roomDoorHeight, wallThickness + 0.04],
          [roomDoorCenterX + side * (roomDoorWidth / 2 + 0.045), roomDoorHeight / 2, boundaryZ],
          trimMat,
          true
        );
      }

    };

    // Keep the E-operated bathroom door. No partition or door is built for
    // the former kitchen section, leaving that part of the hall open.
    addRoomDoorway(bathroomEndZ);
    this.bathroomDoor = new RoomDoor(this.scene, this.colliders, {
      interactionPosition: new THREE.Vector3(roomDoorCenterX, 0, -14.25),
      centerX: roomDoorCenterX,
      centerZ: bathroomEndZ,
      width: roomDoorWidth,
      height: roomDoorHeight,
    });

    // Compact bathroom layout in the south room, with a clear route from its
    // door beside the shared wash area.
    this.addBlock([0.8, 0.24, 0.85], [13.7, 0.88, -18.4], ceramicMat, true);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.29, 0.18, 24), ceramicMat);
    basin.position.set(11.65, 0.98, -17.2);
    basin.castShadow = true;
    this.scene.add(basin);
    this.addBlock([0.12, 0.78, 0.12], [11.65, 0.39, -17.2], cabinetMat, true);

    const toiletBase = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.31, 0.42, 20), ceramicMat);
    toiletBase.position.set(13.7, 0.21, -16.0);
    toiletBase.castShadow = true;
    this.scene.add(toiletBase);
    const toiletSeat = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.045, 8, 20), ceramicMat);
    toiletSeat.rotation.x = Math.PI / 2;
    toiletSeat.position.set(13.7, 0.43, -16.0);
    this.scene.add(toiletSeat);
    this.addBlock([0.55, 0.72, 0.22], [14.05, 0.72, -16.35], ceramicMat, true);

    const showerBase = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 1.7), ceramicMat);
    showerBase.position.set(12.8, 0.06, -18.4);
    showerBase.receiveShadow = true;
    this.scene.add(showerBase);
    const showerGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 2.15, 1.7),
      new THREE.MeshPhysicalMaterial({
        color: 0xc9edf2,
        roughness: 0.12,
        transmission: 0.65,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      })
    );
    showerGlass.position.set(11.9, 1.08, -18.4);
    this.scene.add(showerGlass);

    // Shared wash area vanity and mirror, mounted on the east-facing wall.
    this.addBlock([0.72, 0.84, 1.55], [14.08, 0.42, -13.0], cabinetMat, true);
    this.addBlock([0.82, 0.08, 1.62], [14.02, 0.88, -13.0], stoneMat, true);
    const sharedSink = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.66),
      ceramicMat
    );
    sharedSink.position.set(13.77, 0.98, -13.0);
    sharedSink.castShadow = true;
    this.scene.add(sharedSink);
    const sharedMirror = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.05),
      new THREE.MeshPhysicalMaterial({
        color: 0xe6f2f5,
        metalness: 0.72,
        roughness: 0.12,
        side: THREE.DoubleSide,
      })
    );
    sharedMirror.rotation.y = -Math.PI / 2;
    sharedMirror.position.set(14.51, 2.05, -13.0);
    this.scene.add(sharedMirror);
  }

  private buildExtraRoomKitchen(): void {
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x67503e, roughness: 0.56 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd9d3c8, roughness: 0.3 });
    const applianceMat = new THREE.MeshStandardMaterial({
      color: 0x34383b,
      roughness: 0.32,
      metalness: 0.35,
    });

    // Turn the unused west-side room into the kitchen. Keep the worktop on
    // the outer wall and leave the widened timber-framed entrance clear.
    this.addBlock([1.25, 0.88, 7.6], [-14.8, 0.44, -12.8], cabinetMat, true);
    this.addBlock([1.42, 0.09, 7.75], [-14.8, 0.925, -12.8], stoneMat, true);
    this.addBlock([0.62, 0.95, 6.8], [-15.0, 2.05, -12.8], cabinetMat, true);
    this.addBlock([1.05, 1.9, 0.95], [-7.4, 0.95, -16.2], applianceMat, true);
    this.addBlock([0.8, 1.6, 0.65], [-7.6, 0.8, -13.8], cabinetMat, true);

    const sink = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.72), applianceMat);
    sink.position.set(-14.8, 1.02, -14.8);
    sink.castShadow = true;
    this.scene.add(sink);
    const faucet = new THREE.Mesh(
      new THREE.TorusGeometry(0.13, 0.025, 8, 18, Math.PI),
      applianceMat
    );
    faucet.rotation.z = Math.PI / 2;
    faucet.position.set(-14.5, 1.23, -14.8);
    this.scene.add(faucet);

    const hob = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.88), applianceMat);
    hob.position.set(-14.8, 1.01, -10.0);
    this.scene.add(hob);
    for (const z of [-10.27, -9.73]) {
      for (const x of [-15.0, -14.6]) {
        const burner = new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.13, 0.025, 16),
          applianceMat
        );
        burner.position.set(x, 1.055, z);
        this.scene.add(burner);
      }
    }
  }

  private buildModernStaircase(floorHeight: number): void {
    const treadMat = new THREE.MeshStandardMaterial({
      color: 0x8c6246,
      roughness: 0.34,
      metalness: 0.06,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x252b34,
      roughness: 0.28,
      metalness: 0.78,
    });
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xffdca0,
      emissive: 0xffa83d,
      emissiveIntensity: 0.5,
      roughness: 0.3,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbfe7ee,
      roughness: 0.12,
      metalness: 0.08,
      transmission: 0.52,
      transparent: true,
      opacity: 0.4,
      thickness: 0.04,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x333944,
      roughness: 0.25,
      metalness: 0.8,
    });

    const stepCount = 16;
    const run = 0.5;
    const rise = floorHeight / stepCount;
    const stairWidth = 1.75;
    const bottomX = 4.6;
    const centerZ = -18.68;

    for (let i = 0; i < stepCount; i += 1) {
      const x = bottomX - (i + 0.5) * run;
      const topY = (i + 1) * rise;
      const tread = this.addBlock(
        [run - 0.035, 0.13, stairWidth],
        [x, topY - 0.065, centerZ],
        treadMat,
        true
      );
      tread.castShadow = true;

      const nosing = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.025, stairWidth - 0.08),
        ledMat
      );
      nosing.position.set(x - (run - 0.035) / 2 + 0.035, topY - 0.12, centerZ);
      this.scene.add(nosing);
    }

    const start = new THREE.Vector3(bottomX, 0.08, centerZ);
    const end = new THREE.Vector3(bottomX - stepCount * run, stepCount * rise - 0.05, centerZ);
    this.addStairBeam(start, end, 0.16, 0.2, steelMat);

    // Slim glass balustrades and metal handrails follow the incline on both sides.
    for (const side of [1] as const) {
      const railZ = centerZ + side * (stairWidth / 2 + 0.045);
      const panelShape = new THREE.Shape();
      panelShape.moveTo(start.x, start.y + 0.13);
      panelShape.lineTo(end.x, end.y + 0.13);
      panelShape.lineTo(end.x, end.y + 1.02);
      panelShape.lineTo(start.x, start.y + 1.02);
      panelShape.closePath();
      const panel = new THREE.Mesh(new THREE.ShapeGeometry(panelShape), glassMat);
      panel.position.z = railZ;
      panel.castShadow = true;
      this.scene.add(panel);

      const topRailStart = new THREE.Vector3(start.x, start.y + 1.02, railZ);
      const topRailEnd = new THREE.Vector3(end.x, end.y + 1.02, railZ);
      this.addStairBeam(topRailStart, topRailEnd, 0.075, 0.075, railMat);

      for (let i = 0; i <= stepCount; i += 2) {
        const t = i / stepCount;
        const postX = THREE.MathUtils.lerp(start.x, end.x, t);
        const postY = THREE.MathUtils.lerp(start.y + 0.13, end.y + 0.13, t);
        const postHeight = 0.89;
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.045, postHeight, 0.045),
          railMat
        );
        post.position.set(postX, postY + postHeight / 2, railZ);
        this.scene.add(post);
      }
    }

    // Wall-side steel cleats fasten each floating tread close to the rear wall.
    for (let i = 0; i < stepCount; i += 1) {
      const x = bottomX - (i + 0.5) * run;
      const topY = (i + 1) * rise;
      const wallBracket = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.075, 0.3),
        steelMat
      );
      wallBracket.position.set(x, topY - 0.13, centerZ - stairWidth / 2 - 0.035);
      wallBracket.castShadow = true;
      this.scene.add(wallBracket);
    }

    const wallHandrailZ = centerZ - stairWidth / 2 + 0.1;
    const wallHandrailStart = new THREE.Vector3(bottomX, 1.08, wallHandrailZ);
    const wallHandrailEnd = new THREE.Vector3(
      bottomX - stepCount * run,
      stepCount * rise + 0.92,
      wallHandrailZ
    );
    this.addStairBeam(wallHandrailStart, wallHandrailEnd, 0.07, 0.07, railMat);

    // Keep the space beneath the elevated flight open for a lounge seat.
  }

  private addStairBeam(
    start: THREE.Vector3,
    end: THREE.Vector3,
    thickness: number,
    depth: number,
    material: THREE.Material
  ): void {
    const direction = end.clone().sub(start);
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(direction.length(), thickness, depth),
      material
    );
    beam.position.copy(start).add(end).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
    beam.castShadow = true;
    this.scene.add(beam);
  }

  private addBarDrinks(): void {
    const bottleMaterials = [0x4f7e42, 0xb87931, 0x466f9e].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.08 })
    );
    const labelMat = new THREE.MeshStandardMaterial({ color: 0xf1dfb0, roughness: 0.7 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xc89a54, metalness: 0.55, roughness: 0.35 });
    const bottleXs = [-12.45, -10.15, -7.85];

    bottleXs.forEach((x, index) => {
      const bottle = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.09, 0.3, 16),
        bottleMaterials[index]
      );
      body.position.y = 1.25;
      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.033, 0.05, 0.12, 12),
        bottleMaterials[index]
      );
      neck.position.y = 1.46;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.045, 12), capMat);
      cap.position.y = 1.54;
      const label = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.105, 0.008), labelMat);
      label.position.set(0, 1.25, 0.087);
      bottle.add(body, neck, cap, label);
      bottle.position.set(x, 0, -16.42);
      bottle.traverse((part) => {
        if ((part as THREE.Mesh).isMesh) {
          (part as THREE.Mesh).castShadow = true;
          (part as THREE.Mesh).receiveShadow = true;
        }
      });
      this.scene.add(bottle);
    });

    const glass = new THREE.MeshStandardMaterial({
      color: 0xe8f1f2,
      roughness: 0.15,
      metalness: 0.05,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const drinkMaterials = [0xe9a23b, 0xd84a63, 0x75c4b0].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.04 })
    );
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xf3ead7, roughness: 0.45 });
    const glassXs = [-11.65, -9.35, -8.65];

    glassXs.forEach((x, index) => {
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.06, 0.28, 16, 1, true),
        glass
      );
      cup.position.set(x, 1.24, -16.42);
      cup.castShadow = true;
      this.scene.add(cup);

      const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.052, 0.13, 14),
        drinkMaterials[index]
      );
      liquid.position.set(x, 1.17, -16.42);
      this.scene.add(liquid);

      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 8), strawMat);
      straw.position.set(x + 0.025, 1.38, -16.42);
      straw.rotation.z = -0.12;
      this.scene.add(straw);
    });
  }

  private buildBarStage(): void {
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x251330,
      roughness: 0.38,
      metalness: 0.3,
    });
    const stageTopMat = new THREE.MeshStandardMaterial({
      color: 0x17121f,
      roughness: 0.24,
      metalness: 0.42,
    });
    const neonPink = new THREE.MeshStandardMaterial({
      color: 0xff3fb4,
      emissive: 0xff168f,
      emissiveIntensity: 1.3,
      roughness: 0.25,
    });
    const neonCyan = new THREE.MeshStandardMaterial({
      color: 0x22e4e8,
      emissive: 0x08cdd7,
      emissiveIntensity: 1.0,
      roughness: 0.25,
    });

    this.addBlock([6.4, 0.38, 2.3], [-12.2, 0.29, -6.8], stageMat, true);
    this.addBlock([6.28, 0.035, 2.18], [-12.2, 0.498, -6.8], stageTopMat, false);
    this.addBlock([2.5, 0.16, 0.52], [-12.2, 0.18, -5.35], stageMat, true);
    this.addBlock([6.15, 0.035, 0.045], [-12.2, 0.39, -5.65], neonPink, false);
    this.addBlock([0.045, 0.035, 2.1], [-15.36, 0.39, -6.8], neonCyan, false);
    this.addBlock([0.045, 0.035, 2.1], [-9.04, 0.39, -6.8], neonCyan, false);

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x151020,
      roughness: 0.25,
      metalness: 0.38,
    });
    this.addBlock([7.0, 0.035, 4.0], [-12.2, 0.12, -11.1], floorMat, false);
    const tileMaterials = [neonPink, neonCyan];
    for (let column = 0; column < 4; column++) {
      for (let row = 0; row < 2; row++) {
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(1.57, 0.018, 1.86),
          tileMaterials[(column + row) % tileMaterials.length]
        );
        tile.position.set(-14.825 + column * 1.75, 0.15, -12.08 + row * 1.96);
        tile.receiveShadow = true;
        this.scene.add(tile);
      }
    }

    // Suspended truss, mirror ball, and low moving color washes over the floor.
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x292333,
      metalness: 0.72,
      roughness: 0.34,
    });
    const truss = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.1, 0.12), trussMat);
    truss.position.set(-12.2, 3.82, -6.8);
    truss.castShadow = true;
    this.scene.add(truss);
    this.discoBall.position.set(-12.2, 3.48, -9.2);
    this.discoBall.castShadow = true;
    this.scene.add(this.discoBall);

    const colors = [0xff3fb4, 0x23e6f0, 0x8b5cff];
    colors.forEach((color) => {
      const light = new THREE.PointLight(color, 30, 8.5, 2);
      light.position.set(-12.2, 3.35, -9.2);
      this.scene.add(light);
      this.discoLights.push(light);

      const bulbMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 2.2,
        roughness: 0.22,
      });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), bulbMat);
      bulb.position.copy(light.position);
      this.scene.add(bulb);
      this.discoBulbs.push(bulb);
    });

    const receptionistPosition = new THREE.Vector3(-10.25, 0, -17.35);
    const dancerZ = -6.82;
    const dancers = [-13.15, -11.25].map((x) => ({
      x,
      yaw: Math.atan2(receptionistPosition.x - x, receptionistPosition.z - dancerZ),
    }));
    for (const dancer of dancers) {
      const npc = new BarDancer(
        new THREE.Vector3(dancer.x, 0.48, dancerZ),
        dancer.yaw
      );
      this.barDancers.push(npc);
      this.colliders.push(npc.collider);
      this.scene.add(npc.group);
    }
  }

  public updateBarScene(deltaTime: number): void {
    this.discoElapsed += deltaTime;
    this.discoBall.rotation.y += deltaTime * 0.45;
    this.discoBall.rotation.x = Math.sin(this.discoElapsed * 0.35) * 0.12;
    this.ceilingFanRotors.forEach((rotor) => {
      rotor.rotation.y += deltaTime * 10;
    });
    this.barDancers.forEach((dancer) => dancer.update(deltaTime));

    const centerX = -12.2 + this.barCourtyardOffset.x;
    const centerZ = -9.2 + this.barCourtyardOffset.z;
    this.discoLights.forEach((light, index) => {
      const phase = this.discoElapsed * 0.65 + (index * Math.PI * 2) / this.discoLights.length;
      const x = centerX + Math.cos(phase) * 2.1;
      const z = centerZ + Math.sin(phase) * 1.7;
      light.position.set(x, 3.35, z);
      this.discoBulbs[index].position.copy(light.position);
      light.color.setHSL((0.82 + index * 0.34 + this.discoElapsed * 0.08) % 1, 0.88, 0.58);
      const material = this.discoBulbs[index].material as THREE.MeshStandardMaterial;
      material.color.copy(light.color);
      material.emissive.copy(light.color);
    });
  }

  private populateRooms(): void {
    const foyerLight = new THREE.PointLight(0xffb703, 30, 18);
    foyerLight.position.set(1.5, 4.6, -8);
    this.scene.add(foyerLight);

    const barSceneStart = this.scene.children.length;
    const barColliderStart = this.colliders.length;

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

    // Turn the long counter parallel to the back wall; keep a clear route
    // from both entrances and line up the stools along its serving side.
    this.addBlock([6.5, 1.1, 1.2], [-10.25, 0.55, -16.8], barCounterMat, true);
    this.addBlock([0.6, 0.75, 0.6], [-12.7, 0.375, -15.55], stoolMat, true);
    this.addBlock([0.6, 0.75, 0.6], [-10.25, 0.375, -15.55], stoolMat, true);
    this.addBlock([0.6, 0.75, 0.6], [-7.8, 0.375, -15.55], stoolMat, true);
    this.addBarDrinks();
    this.barReceptionist = new BarReceptionist(new THREE.Vector3(-10.25, 0, -17.35));
    this.scene.add(this.barReceptionist.group);
    this.addBarSpeaker();
    this.buildBarStage();

    // Relocate the complete bar setup from the villa to the courtyard's
    // left corner just inside the main gate.
    for (const object of this.scene.children.slice(barSceneStart)) {
      object.position.add(this.barCourtyardOffset);
    }
    for (const collider of this.colliders.slice(barColliderStart)) {
      collider.translate(this.barCourtyardOffset);
    }
    this.buildOutdoorBarEnclosure();

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
    barSign.position.set(-16.52, 3.55, -14);
    barSign.rotation.y = Math.PI / 2;
    this.scene.add(barSign);

    this.buildModernHallCeiling();
    this.loadHallFurnishings();

    const studyLight = new THREE.PointLight(0x00bbf9, 32, 16);
    studyLight.position.set(10.5, 4.5, -11);
    this.scene.add(studyLight);

    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1a0b2e,
      roughness: 0.3,
      metalness: 0.5,
    });

    this.addBlock([1.4, 1.1, 1.4], [3.7, 0.55, -16.5], pedestalMat, true);

    this.addHallTelevision();
  }

  private buildModernHallCeiling(): void {
    const gypsumMat = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.82 });
    const insetMat = new THREE.MeshStandardMaterial({ color: 0xe5dfd3, roughness: 0.72 });
    const walnutMat = new THREE.MeshStandardMaterial({ color: 0x71492f, roughness: 0.48 });
    const coveMat = new THREE.MeshStandardMaterial({
      color: 0xffd9a0,
      emissive: 0xffb45e,
      emissiveIntensity: 0.65,
      roughness: 0.3,
    });
    // The ceiling must participate in vertical collision so a jump cannot
    // clip through the false-ceiling mesh into the upstairs floor.
    const ceiling = this.addBlock([20.5, 0.18, 15.1], [5.5, 4.87, -9.9], gypsumMat, true);
    ceiling.castShadow = false;

    // A stepped inset tray, warm perimeter cove lighting, and walnut slat accents
    // give the main hall a finished false ceiling. The stairwell stays open behind it.
    this.addBlock([9.3, 0.06, 7.1], [5.5, 4.73, -9.9], insetMat, false);
    this.addBlock([9.0, 0.035, 0.055], [5.5, 4.68, -6.5], coveMat, false);
    this.addBlock([9.0, 0.035, 0.055], [5.5, 4.68, -13.3], coveMat, false);
    this.addBlock([0.055, 0.035, 6.8], [1.05, 4.68, -9.9], coveMat, false);
    this.addBlock([0.055, 0.035, 6.8], [9.95, 4.68, -9.9], coveMat, false);

    for (const z of [-12.65, -12.25, -11.85, -11.45, -11.05, -10.65, -10.25, -9.55, -9.15, -8.75, -8.35, -7.95, -7.55, -7.15]) {
      const slat = this.addBlock([8.7, 0.045, 0.11], [5.5, 4.68, z], walnutMat, false);
      slat.castShadow = false;
    }

    const trimMat = new THREE.MeshStandardMaterial({ color: 0xd1c4ad, roughness: 0.68 });
    for (const x of [-4.55, 15.55]) {
      this.addBlock([0.12, 0.1, 15.0], [x, 4.69, -9.9], trimMat, false);
    }
    for (const z of [-17.35, -2.45]) {
      this.addBlock([20.2, 0.1, 0.12], [5.5, 4.69, z], trimMat, false);
    }

    const lightTrimMat = new THREE.MeshStandardMaterial({
      color: 0xfff1d2,
      emissive: 0xffe2a6,
      emissiveIntensity: 1.1,
      roughness: 0.25,
    });
    for (const x of [0, 5.5, 11]) {
      for (const z of [-4.0, -9.9, -15.8]) {
        if (x === 5.5 && (z === -9.9 || z === -15.8)) continue;
        const fixture = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.035, 20),
          lightTrimMat
        );
        fixture.position.set(x, 4.755, z);
        this.scene.add(fixture);
      }
    }
  }

  private loadHallFurnishings(): void {
    const loader = new GLTFLoader();
    for (const x of [3.15, 7.85]) {
      loader.load(
        '/models/ceiling_fan_1k.gltf/ceiling_fan_1k.gltf',
        (gltf) => {
          const fan = gltf.scene;
          fan.scale.setScalar(1.25);
          fan.position.set(x, 4.84, -9.9);
          fan.traverse((node) => {
            const mesh = node as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
            if (node.name === 'ceiling_fan_blades') this.ceilingFanRotors.push(node);
          });
          this.scene.add(fan);
        },
        undefined,
        (error) => console.error('Could not load ceiling_fan_1k.gltf', error)
      );
    }

    // Keep one sofa opposite the TV and place a pair beneath the stairs.
    this.loadHallFurnitureModel(
      '/models/Sofa_01_1k.gltf/Sofa_01_1k.gltf',
      new THREE.Vector3(1.5, 0, -15.2),
      1.75,
      -Math.PI / 2
    );
    this.loadHallFurnitureModel(
      '/models/Sofa_01_1k.gltf/Sofa_01_1k.gltf',
      new THREE.Vector3(-2.8, 0, -18.1),
      1.55,
      0
    );
    this.loadHallFurnitureModel(
      '/models/Sofa_01_1k.gltf/Sofa_01_1k.gltf',
      new THREE.Vector3(0.0, 0, -18.1),
      1.55,
      0
    );
    this.loadHallFurnitureModel(
      '/models/coffee_table_round_01_1k.gltf/coffee_table_round_01_1k.gltf',
      new THREE.Vector3(-2.65, 0, -14.5),
      1.15,
      -Math.PI / 2
    );
    this.addSofaCornerPlant();
    this.loadHallFurnitureModel(
      '/models/dining_table_1k.gltf/dining_table_1k.gltf',
      new THREE.Vector3(-8.8, 0, -5.6),
      1.0,
      -Math.PI / 2
    );
  }

  private addSofaCornerPlant(): void {
    const position = new THREE.Vector3(1.75, 0, -18.1);
    const potMat = new THREE.MeshStandardMaterial({ color: 0x88745f, roughness: 0.68 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d7847, roughness: 0.78 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.42, 20), potMat);
    pot.position.set(position.x, 0.21, position.z);
    pot.castShadow = true;
    this.scene.add(pot);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.58, 10), leafMat);
    stem.position.set(position.x, 0.68, position.z);
    this.scene.add(stem);
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), leafMat);
      leaf.scale.set(0.52, 1.65, 0.55);
      leaf.position.set(
        position.x + Math.cos(angle) * 0.17,
        0.76 + (i % 3) * 0.11,
        position.z + Math.sin(angle) * 0.17
      );
      leaf.rotation.z = -Math.cos(angle) * 0.42;
      leaf.rotation.x = Math.sin(angle) * 0.42;
      leaf.castShadow = true;
      this.scene.add(leaf);
    }
  }

  private buildOutdoorBarEnclosure(): void {
    const centerX = -18.1;
    const westInnerX = -23.2;
    const eastInnerX = -13.0;
    const southInnerZ = 4.8;
    const northInnerZ = 19.3;
    const wallThickness = 0.3;
    const wallHeight = 4.75;
    const wallCenterY = wallHeight / 2;
    const southWallZ = southInnerZ - wallThickness / 2;
    const northWallZ = northInnerZ + wallThickness / 2;
    const wallDepth = northWallZ - southWallZ;
    const wallWidth = eastInnerX - westInnerX + wallThickness;
    const wallMaterial = this.outerVillaWallMat;

    this.addWallBlock(
      [wallThickness, wallHeight, wallDepth],
      [westInnerX - wallThickness / 2, wallCenterY, (southWallZ + northWallZ) / 2],
      wallMaterial,
      true
    );
    const barEntryWidth = 2.6;
    const barEntryCenterZ = (southInnerZ + northInnerZ) / 2;
    const barEntryStartZ = barEntryCenterZ - barEntryWidth / 2;
    const barEntryEndZ = barEntryCenterZ + barEntryWidth / 2;
    const entrySideSegments: Array<[number, number]> = [
      [southWallZ, barEntryStartZ],
      [barEntryEndZ, northWallZ],
    ];
    for (const [start, end] of entrySideSegments) {
      this.addWallBlock(
        [wallThickness, wallHeight, end - start],
        [eastInnerX + wallThickness / 2, wallCenterY, (start + end) / 2],
        wallMaterial,
        true
      );
    }
    const barDoorHeight = 2.65;
    const entryHeaderHeight = wallHeight - barDoorHeight;
    this.addWallBlock(
      [wallThickness, entryHeaderHeight, barEntryWidth],
      [eastInnerX + wallThickness / 2, barDoorHeight + entryHeaderHeight / 2, barEntryCenterZ],
      wallMaterial,
      true
    );
    this.addWallBlock(
      [wallWidth, wallHeight, wallThickness],
      [centerX, wallCenterY, southWallZ],
      wallMaterial,
      true
    );

    this.addWallBlock(
      [wallWidth, wallHeight, wallThickness],
      [centerX, wallCenterY, northWallZ],
      wallMaterial,
      true
    );
    this.barDoor = new RoomDoor(this.scene, this.colliders, {
      interactionPosition: new THREE.Vector3(eastInnerX + 1.3, 0, barEntryCenterZ),
      centerX: eastInnerX + wallThickness / 2,
      centerZ: barEntryCenterZ,
      width: barEntryWidth,
      height: barDoorHeight,
      wallAxis: 'z',
    });

    const signBacking = new THREE.MeshStandardMaterial({
      color: 0x17121f,
      roughness: 0.3,
      metalness: 0.45,
    });
    this.addBlock(
      [0.14, 0.78, 2.9],
      [eastInnerX + 0.36, 3.35, barEntryCenterZ],
      signBacking,
      false
    );
    const signTexture = this.createNeonSignTexture('BAR', '#00f5d4', '#ff4ecd');
    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 0.62),
      new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false })
    );
    signFace.rotation.y = Math.PI / 2;
    signFace.position.set(eastInnerX + 0.445, 3.35, barEntryCenterZ);
    this.scene.add(signFace);

    const ceiling = this.addBlock(
      [wallWidth, 0.3, wallDepth],
      [centerX, wallHeight + 0.15, (southInnerZ + northInnerZ) / 2],
      new THREE.MeshStandardMaterial({ color: 0xe7e1d7, roughness: 0.88 }),
      true
    );
    ceiling.receiveShadow = true;
  }

  private addHallTelevision(): void {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x08090d, roughness: 0.24, metalness: 0.55 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.65, 0.16), frameMat);
    frame.position.set(-4.04, 2.55, -14.5);
    frame.rotation.y = Math.PI / 2;
    frame.castShadow = true;
    frame.receiveShadow = true;
    this.scene.add(frame);

    const texture = new THREE.TextureLoader().load('/tv_show.jpg');
    texture.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.72, 1.52),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
    );
    screen.position.set(-3.945, 2.55, -14.5);
    screen.rotation.y = Math.PI / 2;
    this.scene.add(screen);
  }

  private loadHallFurnitureModel(
    path: string,
    position: THREE.Vector3,
    scale: number,
    rotationY: number
  ): void {
    new GLTFLoader().load(
      path,
      (gltf) => {
        const furniture = gltf.scene;
        furniture.scale.setScalar(scale);
        furniture.rotation.y = rotationY;
        furniture.position.copy(position);
        furniture.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        furniture.updateMatrixWorld(true);
        this.colliders.push(new THREE.Box3().setFromObject(furniture));
        this.scene.add(furniture);
      },
      undefined,
      (error) => console.error(`Could not load hall furniture ${path}`, error)
    );
  }

  private addBarSpeaker(): void {
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x17151d, roughness: 0.48, metalness: 0.2 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x45404f, roughness: 0.38, metalness: 0.55 });
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x08080b, roughness: 0.8 });
    const speaker = new THREE.Group();
    speaker.name = 'Bar Speaker';
    speaker.position.set(-15.25, 2.65, -11.25);

    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.45, 0.85), cabinetMat);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    speaker.add(cabinet);

    for (const y of [-0.38, 0.32]) {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 24), rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(0.27, y, 0);
      speaker.add(rim);

      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.14, 0.065, 24), coneMat);
      cone.rotation.z = Math.PI / 2;
      cone.position.set(0.31, y, 0);
      speaker.add(cone);

      const dustCap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), rimMat);
      dustCap.scale.set(0.38, 1, 1);
      dustCap.position.set(0.35, y, 0);
      speaker.add(dustCap);
    }
    this.scene.add(speaker);
  }

  private buildTropicalTrees(): void {
    const palmCoords: [number, number][] = [
      [19, 16],
      [-20, -14],
      [20, -14],
      [-14, 22.4],
      [14, 22.4],
    ];
    const loader = new GLTFLoader();
    loader.load(
      '/models/tree_small_02_1k.gltf/tree_small_02_1k.gltf',
      (gltf) => {
        const prototype = gltf.scene;
        prototype.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(prototype);
        const size = bounds.getSize(new THREE.Vector3());
        if (size.y <= 0) return;

        // Normalize the asset to the existing ~6m tree height and place its base on the ground.
        const scale = 6 / size.y;
        for (const [x, z] of palmCoords) {
          const tree = prototype.clone(true);
          tree.scale.setScalar(scale);
          tree.position.set(x, -bounds.min.y * scale, z);
          tree.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          });
          this.scene.add(tree);

          const scaledBounds = new THREE.Box3().setFromObject(tree);
          const trunkRadius = Math.min(size.x, size.z) * scale * 0.18;
          this.colliders.push(
            new THREE.Box3(
              new THREE.Vector3(x - trunkRadius, 0, z - trunkRadius),
              new THREE.Vector3(
                x + trunkRadius,
                Math.min(4.8, scaledBounds.max.y),
                z + trunkRadius
              )
            )
          );
        }
      },
      undefined,
      (error) => console.error('Could not load tree_small_02_1k.gltf', error)
    );
  }

  private addGrannyNPC(): void {
    // Keep granny in the initial camera view beside the entrance path and trees.
    const granny = new Granny(new THREE.Vector3(2.5, 0.05, 22.5));
    granny.group.scale.setScalar(1.18);
    this.grannyNpc = granny;
    this.scene.add(granny.group);
    this.colliders.push(granny.collider);
  }

  private loadPoolDuck(): void {
    const loader = new GLTFLoader();
    loader.load(
      '/models/rubber_duck_toy_1k.gltf/rubber_duck_toy_1k.gltf',
      (gltf) => {
        const duck = gltf.scene;
        duck.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(duck);
        const size = bounds.getSize(new THREE.Vector3());
        if (size.y <= 0) return;

        const scale = 0.9 / size.y;
        duck.scale.setScalar(scale);
        this.duckBaseY = -0.1 - bounds.min.y * scale;
        duck.position.set(12.2, this.duckBaseY, 8.8);
        duck.rotation.y = Math.PI / 2;
        duck.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const materials = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material];
            for (const material of materials) {
              if (material instanceof THREE.MeshStandardMaterial) {
                const sourceMap = material.map;
                if (sourceMap?.image) {
                  const canvas = document.createElement('canvas');
                  canvas.width = sourceMap.image.width;
                  canvas.height = sourceMap.image.height;
                  const context = canvas.getContext('2d');
                  if (context) {
                    context.drawImage(sourceMap.image, 0, 0);
                    const pixels = context.getImageData(
                      0,
                      0,
                      canvas.width,
                      canvas.height
                    );
                    for (let i = 0; i < pixels.data.length; i += 4) {
                      const red = pixels.data[i];
                      const green = pixels.data[i + 1];
                      const blue = pixels.data[i + 2];
                      // Shift the orange body texture toward rubber-duck yellow,
                      // while leaving the red bill and dark eyes intact.
                      if (
                        red > 80 &&
                        green / red > 0.28 &&
                        green / red < 0.78 &&
                        blue / red < 0.45
                      ) {
                        pixels.data[i + 1] = Math.max(green, red * 0.86);
                        pixels.data[i + 2] = Math.max(blue, red * 0.04);
                      }
                    }
                    context.putImageData(pixels, 0, 0);
                    const yellowMap = new THREE.CanvasTexture(canvas);
                    yellowMap.colorSpace = sourceMap.colorSpace;
                    yellowMap.flipY = sourceMap.flipY;
                    yellowMap.needsUpdate = true;
                    material.map = yellowMap;
                  }
                }
                // Keep the duck visibly yellow even if the texture is unavailable.
                // The texture carries the bill and eyes, so leave its RGB values
                // un-tinted after the orange body has been shifted toward yellow.
                material.color.set(material.map ? 0xffffff : 0xffdf00);
                material.emissive.set(0x000000);
                material.emissiveIntensity = 0;
                material.metalness = 0;
                material.metalnessMap = null;
                material.roughnessMap = null;
                material.roughness = 0.58;
                material.transparent = false;
                material.opacity = 1;
                material.alphaTest = 0;
                material.alphaMap = null;
                material.blending = THREE.NormalBlending;
                material.depthWrite = true;
                material.needsUpdate = true;
              }
            }
          }
        });
        this.duckGroup = duck;
        this.duckCollider = new THREE.Box3(
          // Slightly inset from the visual bounds so contact feels immediate.
          new THREE.Vector3(11.86, -0.14, 8.43),
          new THREE.Vector3(12.54, 0.8, 9.17)
        );
        this.colliders.push(this.duckCollider);
        this.scene.add(duck);
      },
      undefined,
      (error) => console.error('Could not load rubber_duck_toy_1k.gltf', error)
    );
  }
}
