import * as THREE from 'three';
import { applyWaterAsset } from './WaterAsset';

export const CITY_MAP_HALF_SIZE = 600;
export const CITY_MINIMAP_HALF_SIZE = 1100;
export const CITY_ROAD_SPACING = 150;
export const CITY_MAIN_ROAD_WIDTH = 16;
export const CITY_LOCAL_ROAD_WIDTH = 11;

export interface CityRoad {
  points: [number, number][];
  width: number;
  arterial?: boolean;
}

export function createIslandOutline(): [number, number][] {
  const points: [number, number][] = [];
  const count = 72;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const radius =
      920 +
      Math.sin(angle * 3 + 0.7) * 24 +
      Math.sin(angle * 7 - 1.2) * 14 +
      Math.sin(angle * 11 + 2.1) * 8;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return points;
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

  constructor(scene: THREE.Scene, grassMaterial: THREE.Material) {
    this.addWater(scene);
    this.addGround(scene, grassMaterial);
    this.addShore(scene);
    this.addRoads(scene);
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
      const localY = -z * 1.04;
      const localX = x * 1.04;
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
    water.position.y = -0.36;
    water.receiveShadow = true;
    scene.add(water);
  }

  private addShore(scene: THREE.Scene): void {
    const outline = createIslandOutline();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const innerScale = 0.985;
    const outerScale = 1.04;
    const waterline = -0.36;

    outline.forEach(([x, z], index) => {
      const next = outline[(index + 1) % outline.length];
      const start = positions.length / 3;
      positions.push(
        x * innerScale, 0, z * innerScale,
        next[0] * innerScale, 0, next[1] * innerScale,
        next[0] * outerScale, waterline, next[1] * outerScale,
        x * outerScale, waterline, z * outerScale
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
