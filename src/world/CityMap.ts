import * as THREE from 'three';
import { applyWaterAsset } from './WaterAsset';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const CITY_MAP_HALF_SIZE = 600;
export const CITY_MINIMAP_HALF_SIZE = 1100;
export const CITY_ROAD_SPACING = 150;
export const CITY_MAIN_ROAD_WIDTH = 16;
export const CITY_LOCAL_ROAD_WIDTH = 11;
export const CITY_WATER_LEVEL = -2.4;
const CITY_SEAFLOOR_LEVEL = -8;
const SHORE_INNER_SCALE = 1;
const SHORE_OUTER_SCALE = 1.05;
const PROTECTION_GUARD_CENTER_OFFSET = 18.4;
const PROTECTION_GUARD_WIDTH = 1.8;
const PROTECTION_GUARD_TOP = 3.2;

export interface CityRoad {
  points: [number, number][];
  width: number;
  arterial?: boolean;
}

export function createIslandOutline(): [number, number][] {
  const points: [number, number][] = [];
  const count = 144;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const radius = islandRadius(angle);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    points.push([x, z > 0 ? z + marineDriveCoastBulge(x) : z]);
  }
  return points;
}

function islandRadius(angle: number): number {
  return 920 +
    Math.sin(angle * 3 + 0.7) * 24 +
    Math.sin(angle * 7 - 1.2) * 14 +
    Math.sin(angle * 11 + 2.1) * 8;
}

function marineDriveCoastBulge(x: number): number {
  const normalizedX = Math.abs(x) / 440;
  if (normalizedX >= 1) return 0;
  const shoulder = 1 - normalizedX * normalizedX;
  // Pull the north shore inland at the center, then blend back into the
  // original island outline at either end to form a broad, smooth bay.
  return -140 * shoulder * shoulder;
}

export function getNorthernCoastZ(x: number): number {
  let low = 0;
  let high = Math.PI;
  for (let i = 0; i < 28; i += 1) {
    const angle = (low + high) / 2;
    if (Math.cos(angle) * islandRadius(angle) > x) low = angle;
    else high = angle;
  }
  const angle = (low + high) / 2;
  return Math.sin(angle) * islandRadius(angle) + marineDriveCoastBulge(x);
}

export function getNorthernCoastPosition(x: number, offset: number, y = 0): THREE.Vector3 {
  const slope = (getNorthernCoastZ(x + 1) - getNorthernCoastZ(x - 1)) / 2;
  const normalizer = Math.sqrt(1 + slope * slope);
  return new THREE.Vector3(
    x - (slope * offset) / normalizer,
    y,
    getNorthernCoastZ(x) + offset / normalizer
  );
}

const ISLAND_OUTLINE = createIslandOutline();

export function getIslandGroundHeight(x: number, z: number): number {
  const outline = ISLAND_OUTLINE;
  const distance = Math.hypot(x, z);
  if (distance < 1e-6) return 0;
  const directionX = x / distance;
  const directionZ = z / distance;
  let boundaryRadius = 0;

  for (let i = 0; i < outline.length; i += 1) {
    const [ax, az] = outline[i];
    const [bx, bz] = outline[(i + 1) % outline.length];
    const edgeX = bx - ax;
    const edgeZ = bz - az;
    const denominator = directionX * edgeZ - directionZ * edgeX;
    if (Math.abs(denominator) < 1e-8) continue;
    const radius = (ax * edgeZ - az * edgeX) / denominator;
    const edgeT = (ax * directionZ - az * directionX) / denominator;
    if (radius > boundaryRadius && edgeT >= 0 && edgeT <= 1) boundaryRadius = radius;
  }

  if (boundaryRadius === 0) return Number.NEGATIVE_INFINITY;
  const innerRadius = boundaryRadius * SHORE_INNER_SCALE;
  const outerRadius = boundaryRadius * SHORE_OUTER_SCALE;
  if (distance <= innerRadius) return 0;
  if (distance >= outerRadius) return Number.NEGATIVE_INFINITY;
  const shoreHeight = CITY_SEAFLOOR_LEVEL * ((distance - innerRadius) / (outerRadius - innerRadius));
  return shoreHeight <= CITY_WATER_LEVEL ? Number.NEGATIVE_INFINITY : shoreHeight;
}

export function createCityRoadNetwork(): CityRoad[] {
  const roads: CityRoad[] = [];
  let seed = 20261019;
  const random = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const coordinates = Array.from({ length: 9 }, (_, index) =>
    (index - 4) * CITY_ROAD_SPACING
  );
  const nodes = coordinates.map((baseZ, row) =>
    coordinates.map((baseX, column): [number, number] => {
      const isCenterApproach = baseX === 0 && Math.abs(baseZ) === 150;
      const jitterX = column === 0 || column === coordinates.length - 1 || isCenterApproach
        ? 0
        : (random() - 0.5) * 58;
      const jitterZ = row === 0 || row === coordinates.length - 1 || isCenterApproach
        ? 0
        : (random() - 0.5) * 58;
      return [baseX + jitterX, baseZ + jitterZ];
    })
  );

  const addCurvedLink = (start: [number, number], end: [number, number]): void => {
    const horizontal = Math.abs(end[0] - start[0]) >= Math.abs(end[1] - start[1]);
    const bendRange = random() < 0.32 ? 140 : 70;
    const bend = (random() - 0.5) * bendRange;
    const midpoint: [number, number] = horizontal
      ? [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + bend]
      : [(start[0] + end[0]) / 2 + bend, (start[1] + end[1]) / 2];
    const road: CityRoad = {
      points: [start, midpoint, end],
      width: CITY_LOCAL_ROAD_WIDTH + (random() - 0.5) * 2.6,
    };
    if (!roadTouchesVilla(road)) roads.push(road);
  };

  for (let row = 0; row < nodes.length; row += 1) {
    for (let column = 0; column < nodes[row].length; column += 1) {
      if (column + 1 < nodes[row].length) {
        addCurvedLink(nodes[row][column], nodes[row][column + 1]);
      }
      if (row + 1 < nodes.length) {
        addCurvedLink(nodes[row][column], nodes[row + 1][column]);
      }
    }
  }

  roads.push(
    {
      points: [[0, 29], [0, 48], [18, 68], [55, 86], [96, 112], [150, 150]],
      width: CITY_MAIN_ROAD_WIDTH,
      arterial: true,
    },
    {
      points: [[-600, 430], [-455, 405], [-300, 350], [-150, 285], [15, 230], [190, 210], [380, 250], [600, 335]],
      width: 15,
      arterial: true,
    },
    {
      points: [[-600, -420], [-445, -375], [-295, -300], [-140, -230], [25, -245], [190, -300], [370, -385], [600, -445]],
      width: 15,
      arterial: true,
    }
  );

  return roads;
}

// Use one shared road layout for the rendered city and the minimap.
export const CITY_ROAD_NETWORK = createCityRoadNetwork();

function roadTouchesVilla(road: CityRoad): boolean {
  const curve = makeRoadCurve(road);
  const samples = Math.max(12, Math.ceil(curve.getLength() / 6));
  for (let i = 0; i <= samples; i += 1) {
    const point = curve.getPoint(i / samples);
    if (point.x > -42 && point.x < 42 && point.z > -55 && point.z < 25) return true;
  }
  return false;
}

export function makeRoadCurve(road: CityRoad): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    road.points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal'
  );
}

export function createGrassMaterial(): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) {
    return new THREE.MeshStandardMaterial({ color: 0x587b39, roughness: 1 });
  }

  const image = context.createImageData(canvas.width, canvas.height);
  let seed = 91273;
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const noise = (seed / 2147483647 - 0.5) * 32;
    image.data[i] = 78 + noise;
    image.data[i + 1] = 112 + noise;
    image.data[i + 2] = 52 + noise * 0.65;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);

  seed = 417;
  for (let i = 0; i < 900; i += 1) {
    seed = (seed * 16807) % 2147483647;
    const x = (seed / 2147483647) * canvas.width;
    seed = (seed * 16807) % 2147483647;
    const y = (seed / 2147483647) * canvas.height;
    const height = 2 + (seed % 5);
    context.strokeStyle = i % 3 === 0 ? 'rgba(176, 190, 92, 0.48)' : 'rgba(30, 73, 35, 0.42)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + ((seed % 3) - 1), y - height);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = 8;
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    roughness: 1,
    metalness: 0,
  });
}

export class CityMap {
  public static readonly halfSize = CITY_MAP_HALF_SIZE;

  constructor(scene: THREE.Scene, grassMaterial: THREE.Material, colliders: THREE.Box3[] = []) {
    this.addWater(scene);
    this.addGround(scene, grassMaterial);
    this.addShore(scene);
    this.addRoads(scene);
    this.addPromenade(scene, colliders);
  }

  private addPromenade(scene: THREE.Scene, colliders: THREE.Box3[]): void {
    // Shared north-coast curve keeps the boulevard, promenade and seawall aligned.
    const coastZ = getNorthernCoastZ;
    // Move the boulevard into the former paved apron, closer to the platform.
    const roadOffset = -18;
    // Replace the exposed sandy shelf beneath the tetrapods with a dark, sloped
    // rock revetment that meets the same lower waterline as the full island shore.
    const revetmentPositions: number[] = [];
    const revetmentIndices: number[] = [];
    const revetmentSegments = 152;
    for (let i = 0; i <= revetmentSegments; i += 1) {
      const x = -252 + (504 * i) / revetmentSegments;
      revetmentPositions.push(
        x * SHORE_INNER_SCALE, 0, coastZ(x) * SHORE_INNER_SCALE,
        x * SHORE_OUTER_SCALE, CITY_SEAFLOOR_LEVEL, coastZ(x) * SHORE_OUTER_SCALE
      );
      if (i < revetmentSegments) {
        const n = i * 2;
        revetmentIndices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    const revetmentGeometry = new THREE.BufferGeometry();
    revetmentGeometry.setAttribute('position', new THREE.Float32BufferAttribute(revetmentPositions, 3));
    revetmentGeometry.setIndex(revetmentIndices);
    revetmentGeometry.computeVertexNormals();
    const revetment = new THREE.Mesh(
      revetmentGeometry,
      new THREE.MeshStandardMaterial({ color: 0x55595a, roughness: 0.98, side: THREE.DoubleSide })
    );
    revetment.receiveShadow = true;
    scene.add(revetment);
    const makeStrip = (centerOffset: number, width: number, y: number, material: THREE.Material): THREE.Mesh => {
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      const segments = 128;
      for (let i = 0; i <= segments; i += 1) {
        const x = -228 + (456 * i) / segments;
        const z = coastZ(x) + centerOffset;
        const slope = (coastZ(Math.min(919, x + 1)) - coastZ(Math.max(-919, x - 1))) /
          (Math.min(919, x + 1) - Math.max(-919, x - 1));
        const normalizer = Math.sqrt(1 + slope * slope);
        const offsetX = (width / 2) * slope / normalizer;
        const offsetZ = (width / 2) / normalizer;
        positions.push(x - offsetX, y, z + offsetZ, x + offsetX, y, z - offsetZ);
        uvs.push((i / segments) * 80, 0, (i / segments) * 80, 3);
        if (i < segments) {
          const n = i * 2;
          indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);
      return mesh;
    };

    const roadY = 0.31;
    const asphaltLoader = new THREE.TextureLoader();
    const asphaltColor = asphaltLoader.load('/asphalt_track_1k.gltf/textures/asphalt_track_diff_1k.jpg');
    asphaltColor.colorSpace = THREE.SRGBColorSpace;
    asphaltColor.wrapS = asphaltColor.wrapT = THREE.RepeatWrapping;
    const asphaltNormal = asphaltLoader.load('/asphalt_track_1k.gltf/textures/asphalt_track_nor_gl_1k.jpg');
    asphaltNormal.colorSpace = THREE.NoColorSpace;
    asphaltNormal.wrapS = asphaltNormal.wrapT = THREE.RepeatWrapping;
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: asphaltColor,
      normalMap: asphaltNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.92,
    });
    roadMaterial.userData.weatherRoadSurface = true;
    const roadHeightAtOffset = (offset: number): number => roadY * ((offset + 11) / 22);
    const roadPositions: number[] = [];
    const roadIndices: number[] = [];
    const roadSegments = 128;
    for (let i = 0; i <= roadSegments; i += 1) {
      const x = -228 + (456 * i) / roadSegments;
      const slope = (coastZ(x + 1) - coastZ(x - 1)) / 2;
      const normalizer = Math.sqrt(1 + slope * slope);
      for (const localOffset of [-11, 11]) {
        const offset = roadOffset + localOffset;
        roadPositions.push(
          x - (slope * offset) / normalizer,
          roadHeightAtOffset(localOffset),
          coastZ(x) + offset / normalizer
        );
      }
      if (i < roadSegments) {
        const a = i * 2;
        roadIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const roadGeometry = new THREE.BufferGeometry();
    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
    roadGeometry.setIndex(roadIndices);
    roadGeometry.computeVertexNormals();
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.receiveShadow = true;
    road.castShadow = true;
    scene.add(road);
    const makeFascia = (centerOffset: number, width: number, height: number, material: THREE.Material): void => {
      for (const side of [-1, 1]) {
        const positions: number[] = [];
        const indices: number[] = [];
        const segments = 128;
        for (let i = 0; i <= segments; i += 1) {
          const x = -228 + (456 * i) / segments;
          const slope = (coastZ(x + 1) - coastZ(x - 1)) / 2;
          const normalizer = Math.sqrt(1 + slope * slope);
          const offsetX = side * (width / 2) * slope / normalizer;
          const offsetZ = -side * (width / 2) / normalizer;
          const z = coastZ(x) + centerOffset + offsetZ;
          const edgeX = x + offsetX;
          positions.push(edgeX, 0, z, edgeX, height, z);
          if (i < segments) {
            const n = i * 2;
            indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
          }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        scene.add(new THREE.Mesh(geometry, material));
      }
    };
    const roadColliderStep = 12;
    for (let x = -228; x < 228; x += roadColliderStep) {
      const mid = x + roadColliderStep / 2;
      const angle = Math.atan((coastZ(mid + 1) - coastZ(mid - 1)) / 2);
      const halfX = (roadColliderStep + 0.25) / 2;
      const halfZ = 22 / 8;
      for (let band = 0; band < 4; band += 1) {
        const localEnd = -11 + ((band + 1) * 22) / 4;
        const localCenter = localEnd - 22 / 8;
        const top = roadHeightAtOffset(localEnd);
        const rotatedHalfX = Math.abs(Math.cos(angle)) * halfX + Math.abs(Math.sin(angle)) * halfZ;
        const rotatedHalfZ = Math.abs(Math.sin(angle)) * halfX + Math.abs(Math.cos(angle)) * halfZ;
        colliders.push(new THREE.Box3(
          new THREE.Vector3(mid - rotatedHalfX, top - 0.22, coastZ(mid) + roadOffset + localCenter - rotatedHalfZ),
          new THREE.Vector3(mid + rotatedHalfX, top, coastZ(mid) + roadOffset + localCenter + rotatedHalfZ)
        ));
      }
    }

    const promenadeMaterial = new THREE.MeshStandardMaterial({ color: 0xc9c5b8, roughness: 0.88 });
    // Merge the narrowed pavement and platform into one level promenade deck.
    const upperPlatformY = 2;
    // Narrow the raised platform toward land while preserving its ocean-facing edge.
    const upperPlatformOffset = 13;
    const promenadeOffsets = [-7, 1, 19];
    const promenadeHeights = [roadY, upperPlatformY, upperPlatformY];
    const promenadePositions: number[] = [];
    const promenadeIndices: number[] = [];
    const promenadeSegments = 128;
    for (let i = 0; i <= promenadeSegments; i += 1) {
      const x = -228 + (456 * i) / promenadeSegments;
      const slope = (coastZ(x + 1) - coastZ(x - 1)) / 2;
      const normalizer = Math.sqrt(1 + slope * slope);
      for (let row = 0; row < promenadeOffsets.length; row += 1) {
        const offset = promenadeOffsets[row];
        promenadePositions.push(
          x - (slope * offset) / normalizer,
          promenadeHeights[row],
          coastZ(x) + offset / normalizer
        );
      }
      if (i < promenadeSegments) {
        for (let row = 0; row < promenadeOffsets.length - 1; row += 1) {
          const a = i * promenadeOffsets.length + row;
          const b = a + promenadeOffsets.length;
          promenadeIndices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
    const promenadeGeometry = new THREE.BufferGeometry();
    promenadeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(promenadePositions, 3));
    promenadeGeometry.setIndex(promenadeIndices);
    promenadeGeometry.computeVertexNormals();
    const promenade = new THREE.Mesh(promenadeGeometry, promenadeMaterial);
    promenade.receiveShadow = true;
    promenade.castShadow = true;
    scene.add(promenade);

    // Extend the platform's ocean-facing edge below the waterline to close
    // the visible gap beneath the deck.
    const platformFasciaPositions: number[] = [];
    const platformFasciaIndices: number[] = [];
    const platformFasciaSteps = 456;
    const platformEdgeOffset = 19;
    for (let i = 0; i <= platformFasciaSteps; i += 1) {
      const x = -228 + (456 * i) / platformFasciaSteps;
      const slope = (coastZ(x + 1) - coastZ(x - 1)) / 2;
      const normalizer = Math.sqrt(1 + slope * slope);
      const edgeX = x - (slope * platformEdgeOffset) / normalizer;
      const edgeZ = coastZ(x) + platformEdgeOffset / normalizer;
      platformFasciaPositions.push(edgeX, CITY_SEAFLOOR_LEVEL, edgeZ, edgeX, upperPlatformY, edgeZ);
      if (i < platformFasciaSteps) {
        const base = i * 2;
        platformFasciaIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }
    const platformFasciaGeometry = new THREE.BufferGeometry();
    platformFasciaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(platformFasciaPositions, 3));
    platformFasciaGeometry.setIndex(platformFasciaIndices);
    platformFasciaGeometry.computeVertexNormals();
    const platformFascia = new THREE.Mesh(
      platformFasciaGeometry,
      new THREE.MeshStandardMaterial({ color: 0x8d918f, roughness: 0.92, side: THREE.DoubleSide })
    );
    platformFascia.receiveShadow = true;
    platformFascia.castShadow = true;
    scene.add(platformFascia);

    // Small collision steps follow the visual ramp so the player can walk up it.
    const rampColliderSteps = 8;
    for (let x = -228; x < 228; x += 8) {
      const mid = x + 4;
      const slope = (coastZ(mid + 1) - coastZ(mid - 1)) / 2;
      const angle = Math.atan(slope);
      const halfX = 4.15;
      for (let step = 0; step < rampColliderSteps; step += 1) {
        const offset = -7 + step + 0.5;
        const top = roadY + ((upperPlatformY - roadY) * (step + 1)) / rampColliderSteps;
        const halfZ = 0.5;
        const rotatedHalfX = Math.abs(Math.cos(angle)) * halfX + Math.abs(Math.sin(angle)) * halfZ;
        const rotatedHalfZ = Math.abs(Math.sin(angle)) * halfX + Math.abs(Math.cos(angle)) * halfZ;
        colliders.push(new THREE.Box3(
          new THREE.Vector3(mid - rotatedHalfX, top - 0.22, coastZ(mid) + offset - rotatedHalfZ),
          new THREE.Vector3(mid + rotatedHalfX, top, coastZ(mid) + offset + rotatedHalfZ)
        ));
      }
      const platformOffset = 10;
      const halfZ = 9;
      const rotatedHalfX = Math.abs(Math.cos(angle)) * halfX + Math.abs(Math.sin(angle)) * halfZ;
      const rotatedHalfZ = Math.abs(Math.sin(angle)) * halfX + Math.abs(Math.cos(angle)) * halfZ;
      colliders.push(new THREE.Box3(
        new THREE.Vector3(mid - rotatedHalfX, upperPlatformY - 0.22, coastZ(mid) + platformOffset - rotatedHalfZ),
        new THREE.Vector3(mid + rotatedHalfX, upperPlatformY, coastZ(mid) + platformOffset + rotatedHalfZ)
      ));
    }
    // One continuous rectangular-profile guard follows the platform edge.
    const edgeGuardMaterial = new THREE.MeshStandardMaterial({
      color: 0xb7b6af, roughness: 0.82, flatShading: true, side: THREE.DoubleSide,
    });
    const guardPositions: number[] = [];
    const guardIndices: number[] = [];
    const guardTopPositions: number[] = [];
    const guardTopIndices: number[] = [];
    const guardSteps = 456;
    const guardCenterOffset = PROTECTION_GUARD_CENTER_OFFSET;
    const guardWidth = PROTECTION_GUARD_WIDTH;
    for (let i = 0; i <= guardSteps; i += 1) {
      const x = -228 + (456 * i) / guardSteps;
      const slope = (coastZ(x + 1) - coastZ(x - 1)) / 2;
      const normalizer = Math.sqrt(1 + slope * slope);
      const nx = -slope / normalizer;
      const nz = 1 / normalizer;
      const innerOffset = guardCenterOffset - guardWidth / 2;
      const outerOffset = guardCenterOffset + guardWidth / 2;
      const innerX = x + nx * innerOffset;
      const innerZ = coastZ(x) + nz * innerOffset;
      const outerX = x + nx * outerOffset;
      const outerZ = coastZ(x) + nz * outerOffset;
      guardPositions.push(innerX, upperPlatformY, innerZ, innerX, PROTECTION_GUARD_TOP, innerZ);
      guardPositions.push(outerX, upperPlatformY, outerZ, outerX, PROTECTION_GUARD_TOP, outerZ);
      guardTopPositions.push(innerX, PROTECTION_GUARD_TOP, innerZ, outerX, PROTECTION_GUARD_TOP, outerZ);
      if (i < guardSteps) {
        const base = i * 4;
        guardIndices.push(base, base + 1, base + 4, base + 1, base + 5, base + 4);
        guardIndices.push(base + 2, base + 6, base + 3, base + 3, base + 6, base + 7);
        guardIndices.push(base, base + 4, base + 2, base + 2, base + 4, base + 6);
        const topBase = i * 2;
        guardTopIndices.push(topBase, topBase + 1, topBase + 2, topBase + 1, topBase + 3, topBase + 2);
      }
    }
    const endBase = guardSteps * 4;
    guardIndices.push(0, 2, 1, 1, 2, 3);
    guardIndices.push(endBase, endBase + 1, endBase + 2, endBase + 1, endBase + 3, endBase + 2);
    const guardGeometry = new THREE.BufferGeometry();
    guardGeometry.setAttribute('position', new THREE.Float32BufferAttribute(guardPositions, 3));
    guardGeometry.setIndex(guardIndices);
    guardGeometry.computeVertexNormals();
    const edgeGuard = new THREE.Mesh(guardGeometry, edgeGuardMaterial);
    edgeGuard.castShadow = true;
    edgeGuard.receiveShadow = true;
    scene.add(edgeGuard);
    const guardTopGeometry = new THREE.BufferGeometry();
    guardTopGeometry.setAttribute('position', new THREE.Float32BufferAttribute(guardTopPositions, 3));
    guardTopGeometry.setIndex(guardTopIndices);
    guardTopGeometry.computeVertexNormals();
    const guardTop = new THREE.Mesh(guardTopGeometry, new THREE.MeshStandardMaterial({
      color: 0xb7b6af, roughness: 0.82, flatShading: true, side: THREE.DoubleSide,
    }));
    guardTop.receiveShadow = true;
    scene.add(guardTop);
    // Segmented boxes keep collision aligned to the curved mesh; only the
    // continuous guard mesh is rendered.
    for (let x = -228; x < 228; x += 8) {
      const centerX = x + 4;
      const slope = (coastZ(centerX + 1) - coastZ(centerX - 1)) / 2;
      const guardCollider = new THREE.Mesh(new THREE.BoxGeometry(8.2, PROTECTION_GUARD_TOP - upperPlatformY, guardWidth));
      guardCollider.position.set(centerX, (PROTECTION_GUARD_TOP + upperPlatformY) / 2, coastZ(centerX) + guardCenterOffset);
      guardCollider.rotation.y = Math.atan(slope);
      guardCollider.updateMatrixWorld(true);
      colliders.push(new THREE.Box3().setFromObject(guardCollider));
    }

    // Double yellow center lines, dashed lane dividers and solid road edges.
    const markingMaterial = new THREE.MeshStandardMaterial({ color: 0xf4d44f, roughness: 0.8, emissive: 0x211a00 });
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e5d8, roughness: 0.8 });
    const addMarking = (offset: number, width: number, fromX: number, toX: number, material: THREE.Material): void => {
      const positions: number[] = [];
      const indices: number[] = [];
      for (let x = fromX; x <= toX; x += 2) {
        const z = coastZ(x) + roadOffset + offset;
        const y = roadHeightAtOffset(offset) + 0.012;
        positions.push(x, y, z - width / 2, x, y, z + width / 2);
        if (x < toX) {
          const n = positions.length / 3 - 2;
          indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      scene.add(new THREE.Mesh(geo, material));
    };
    for (const offset of [-0.22, 0.22]) addMarking(offset, 0.12, -228, 228, markingMaterial);
    for (const offset of [-10.2, 10.2]) addMarking(offset, 0.18, -228, 228, edgeMaterial);
    for (const offset of [-5, 5]) {
      for (let x = -224; x < 224; x += 14) addMarking(offset, 0.12, x, Math.min(x + 6, 228), edgeMaterial);
    }

    const markerCanvas = document.createElement('canvas');
    markerCanvas.width = 256;
    markerCanvas.height = 256;
    const markerContext = markerCanvas.getContext('2d');
    if (markerContext) {
      markerContext.fillStyle = '#087f8c';
      markerContext.beginPath();
      markerContext.roundRect(18, 18, 220, 220, 36);
      markerContext.fill();
      markerContext.strokeStyle = '#f3e7c9';
      markerContext.lineWidth = 12;
      markerContext.stroke();
      markerContext.fillStyle = '#ffffff';
      markerContext.font = 'bold 174px system-ui, sans-serif';
      markerContext.textAlign = 'center';
      markerContext.textBaseline = 'middle';
      markerContext.fillText('M', 128, 137);
    }
    if (markerContext) {
      const markerTexture = new THREE.CanvasTexture(markerCanvas);
      markerTexture.colorSpace = THREE.SRGBColorSpace;
      const marker = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 3.2),
        new THREE.MeshBasicMaterial({ map: markerTexture, side: THREE.DoubleSide })
      );
      marker.position.set(0, 5.5, coastZ(0) + upperPlatformOffset);
      scene.add(marker);
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 2.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x343b3d, metalness: 0.5, roughness: 0.45 })
      );
      post.position.set(0, 3.27, coastZ(0) + upperPlatformOffset);
      post.castShadow = true;
      scene.add(post);
    }

    // Simple regularly spaced promenade lights give the long platform scale.
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x343b3d, metalness: 0.55, roughness: 0.4 });
    const lampMaterial = new THREE.MeshStandardMaterial({
      color: 0xffedbc, emissive: 0xffd47a, emissiveIntensity: 0.45, roughness: 0.35,
    });
    for (let x = -216; x <= 216; x += 36) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 5.2, 8), poleMaterial);
      pole.position.set(x, upperPlatformY + 2.55, coastZ(x) + upperPlatformOffset - 3);
      pole.castShadow = true;
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), lampMaterial);
      lamp.position.set(x, upperPlatformY + 5.25, coastZ(x) + upperPlatformOffset - 3);
      scene.add(lamp);
    }

    const loader = new GLTFLoader();
    loader.load('/tetrapods.glb', (gltf) => {
      const source = gltf.scene;
      source.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(source);
      const size = bounds.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.y, size.z);
      if (longest <= 0) return;
      // Scale every tetrapod to 1.5x while keeping the dense, interlocking layout.
      const scale = (2.2 * 1.5) / longest;
      source.scale.setScalar(scale);
      source.updateMatrixWorld(true);
      const scaledBounds = new THREE.Box3().setFromObject(source);
      source.position.y -= scaledBounds.min.y;
      source.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      const pods: { x: number; z: number; y: number; rotation: number }[] = [];
      let seed = 6012026;
      const random = (): number => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const stackCounts = [4, 4, 3, 3, 2, 2];
      const bandOffsets = [-0.75, 0, 1.25, 2.5, 3.75, 5];
      for (let band = 0; band < stackCounts.length; band += 1) {
        const stackCount = stackCounts[band];
        // Stagger each band and pack its columns closer together so the
        // interlocking models fill the gaps along the seawall.
        let x = -236 + random() * 1.7 + band * 0.72;
        while (x <= 236) {
          const podX = x + (random() - 0.5) * 0.48;
          const coast = coastZ(podX);
          const innerOffset = -coast * (1 - SHORE_INNER_SCALE);
          const outerOffset = coast * (SHORE_OUTER_SCALE - 1);
          const waterlineFraction = CITY_WATER_LEVEL / CITY_SEAFLOOR_LEVEL;
          const waterlineOffset = innerOffset + (outerOffset - innerOffset) * waterlineFraction;
          // Nudge the revetment row slightly farther into the water from the promenade.
          const bandOffset = Math.max(waterlineOffset + 1.5, 20) + bandOffsets[band];
          for (let stack = 0; stack < stackCount; stack += 1) {
            pods.push({
              x: podX + (stack % 2 === 0 ? -0.28 : 0.32) + (random() - 0.5) * 0.28,
              z: coast + bandOffset + stack * 0.2 + (random() - 0.5) * 0.4,
              y: CITY_WATER_LEVEL - 1.2 - band * 0.28 + stack * 0.72,
              rotation: random() * Math.PI * 2,
            });
          }
          x += 1.35 + random() * 0.35;
        }
      }
      source.updateMatrixWorld(true);
      const sourceMeshes: THREE.Mesh[] = [];
      source.traverse((object) => {
        if (object instanceof THREE.Mesh) sourceMeshes.push(object);
      });
      const dummy = new THREE.Object3D();
      for (const sourceMesh of sourceMeshes) {
        const instances = new THREE.InstancedMesh(sourceMesh.geometry, sourceMesh.material, pods.length);
        instances.castShadow = true;
        instances.receiveShadow = true;
        pods.forEach((pod, index) => {
          dummy.position.set(pod.x, pod.y, pod.z);
          dummy.rotation.set(0, pod.rotation, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          dummy.matrix.multiply(sourceMesh.matrixWorld);
          instances.setMatrixAt(index, dummy.matrix);
        });
        instances.instanceMatrix.needsUpdate = true;
        scene.add(instances);
      }
    }, undefined, (error) => console.error('Could not load tetrapod model.', error));
  }

  private addGround(scene: THREE.Scene, material: THREE.Material): void {
    const island = new THREE.Shape();
    createIslandOutline().forEach(([x, z], index) => {
      const localY = -z;
      if (index === 0) island.moveTo(x, localY);
      else island.lineTo(x, localY);
    });
    island.closePath();

    const poolOpening = new THREE.Path();
    poolOpening.moveTo(7, -4);
    poolOpening.lineTo(16, -4);
    poolOpening.lineTo(16, -14);
    poolOpening.lineTo(7, -14);
    poolOpening.closePath();
    island.holes.push(poolOpening);

    const geometry = new THREE.ShapeGeometry(island, 4);
    this.applyGroundUVs(geometry);
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  private addWater(scene: THREE.Scene): void {
    const waterShape = new THREE.Shape();
    waterShape.moveTo(-2600, -2600);
    waterShape.lineTo(2600, -2600);
    waterShape.lineTo(2600, 2600);
    waterShape.lineTo(-2600, 2600);
    waterShape.closePath();

    const coastHole = new THREE.Path();
    createIslandOutline().forEach(([x, z], index) => {
      const localY = -z * SHORE_INNER_SCALE;
      const localX = x * SHORE_INNER_SCALE;
      if (index === 0) coastHole.moveTo(localX, localY);
      else coastHole.lineTo(localX, localY);
    });
    coastHole.closePath();
    waterShape.holes.push(coastHole);

    const geometry = new THREE.ShapeGeometry(waterShape, 1);
    this.applyGroundUVs(geometry);
    const material = new THREE.MeshStandardMaterial({
      color: 0x238aa2,
      roughness: 0.24,
      metalness: 0.12,
      emissive: 0x052c3c,
      emissiveIntensity: 0.28,
    });
    applyWaterAsset(material, 0.08);
    const water = new THREE.Mesh(geometry, material);
    water.rotation.x = -Math.PI / 2;
    water.position.y = CITY_WATER_LEVEL;
    water.receiveShadow = true;
    scene.add(water);
  }

  private addShore(scene: THREE.Scene): void {
    const outline = createIslandOutline();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const innerScale = SHORE_INNER_SCALE;
    const outerScale = SHORE_OUTER_SCALE;
    const seafloor = CITY_SEAFLOOR_LEVEL;

    outline.forEach(([x, z], index) => {
      const next = outline[(index + 1) % outline.length];
      const midpointX = (x + next[0]) / 2;
      const midpointZ = (z + next[1]) / 2;
      // The Marine Drive edge transitions directly from the raised platform
      // into its engineered ocean-side revetment, without a sandy beach strip.
      if (midpointZ > 0 && Math.abs(midpointX) < 250) return;
      const start = positions.length / 3;
      positions.push(
        x * innerScale, 0, z * innerScale,
        next[0] * innerScale, 0, next[1] * innerScale,
        next[0] * outerScale, seafloor, next[1] * outerScale,
        x * outerScale, seafloor, z * outerScale
      );
      uvs.push(
        x / 8, z / 8,
        next[0] / 8, next[1] / 8,
        next[0] * outerScale / 8, next[1] * outerScale / 8,
        x * outerScale / 8, z * outerScale / 8
      );
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const textureLoader = new THREE.TextureLoader();
    const sandColor = textureLoader.load('/gravelly_sand_1k.gltf/textures/gravelly_sand_diff_1k.jpg');
    sandColor.colorSpace = THREE.SRGBColorSpace;
    sandColor.wrapS = THREE.RepeatWrapping;
    sandColor.wrapT = THREE.RepeatWrapping;
    const sandNormal = textureLoader.load('/gravelly_sand_1k.gltf/textures/gravelly_sand_nor_gl_1k.jpg');
    sandNormal.colorSpace = THREE.NoColorSpace;
    sandNormal.wrapS = THREE.RepeatWrapping;
    sandNormal.wrapT = THREE.RepeatWrapping;
    const sandArm = textureLoader.load('/gravelly_sand_1k.gltf/textures/gravelly_sand_arm_1k.jpg');
    sandArm.colorSpace = THREE.NoColorSpace;
    sandArm.wrapS = THREE.RepeatWrapping;
    sandArm.wrapT = THREE.RepeatWrapping;

    const shore = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: sandColor,
        normalMap: sandNormal,
        normalScale: new THREE.Vector2(0.7, 0.7),
        roughness: 1,
        roughnessMap: sandArm,
        metalness: 0,
        side: THREE.DoubleSide,
      })
    );
    shore.receiveShadow = true;
    scene.add(shore);
  }

  private applyGroundUVs(geometry: THREE.BufferGeometry): void {
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const uv = geometry.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i += 1) {
      uv.setXY(i, positions.getX(i) / 20, positions.getY(i) / 20);
    }
    uv.needsUpdate = true;
  }

  private addRoads(scene: THREE.Scene): void {
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x34383b,
      roughness: 0.95,
      metalness: 0,
    });
    roadMaterial.userData.weatherRoadSurface = true;
    const markingMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8e7d8,
      roughness: 0.78,
      metalness: 0,
      emissive: 0x191916,
    });
    const roadPositions: number[] = [];
    const roadIndices: number[] = [];
    const markingPositions: number[] = [];

    for (const road of CITY_ROAD_NETWORK) {
      const curve = makeRoadCurve(road);
      const length = curve.getLength();
      const segments = Math.max(2, Math.ceil(length / 6));
      const firstVertex = roadPositions.length / 3;

      for (let segment = 0; segment <= segments; segment += 1) {
        const t = segment / segments;
        const point = curve.getPoint(t);
        const tangent = curve.getTangent(t).normalize();
        const sideX = -tangent.z;
        const sideZ = tangent.x;
        const halfWidth = road.width / 2;
        roadPositions.push(
          point.x + sideX * halfWidth, 0, point.z + sideZ * halfWidth,
          point.x - sideX * halfWidth, 0, point.z - sideZ * halfWidth
        );

        if (segment < segments) {
          const left = firstVertex + segment * 2;
          const right = left + 1;
          const nextLeft = left + 2;
          const nextRight = left + 3;
          roadIndices.push(left, nextLeft, right, right, nextLeft, nextRight);
        }
      }

      if (road.arterial) this.addCurvedDashes(markingPositions, curve, length);
    }

    const roadGeometry = new THREE.BufferGeometry();
    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
    roadGeometry.setIndex(roadIndices);
    roadGeometry.computeVertexNormals();
    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roadMesh.position.y = 0.012;
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    const markingGeometry = new THREE.BufferGeometry();
    markingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(markingPositions, 3));
    markingGeometry.computeVertexNormals();
    const markingMesh = new THREE.Mesh(markingGeometry, markingMaterial);
    markingMesh.position.y = 0.026;
    markingMesh.receiveShadow = true;
    scene.add(markingMesh);
  }

  private addCurvedDashes(
    positions: number[],
    curve: THREE.CatmullRomCurve3,
    length: number
  ): void {
    const dashLength = 4;
    const gap = 10;
    const thickness = 0.2;
    for (let distance = 5; distance + dashLength < length; distance += dashLength + gap) {
      const start = curve.getPointAt(distance / length);
      const end = curve.getPointAt((distance + dashLength) / length);
      const direction = end.clone().sub(start).setY(0).normalize();
      const sideX = -direction.z * thickness / 2;
      const sideZ = direction.x * thickness / 2;
      const corners: [number, number][] = [
        [start.x + sideX, start.z + sideZ],
        [end.x + sideX, end.z + sideZ],
        [end.x - sideX, end.z - sideZ],
        [start.x - sideX, start.z - sideZ],
      ];
      const [a, b, c, d] = corners;
      for (const [x, z] of [a, c, b, a, d, c]) positions.push(x, 0, z);
    }
  }
}
