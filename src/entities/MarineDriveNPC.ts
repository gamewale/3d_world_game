import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { getNorthernCoastPosition, getNorthernCoastZ } from '../world/CityMap';

interface Patrol {
  minX: number;
  maxX: number;
  speed: number;
  coastOffset: number;
  direction: -1 | 1;
}

/** Animated sitter or promenade walker on the Marine Drive platform. */
export class MarineDriveNPC {
  public readonly group = new THREE.Group();

  private mixer: THREE.AnimationMixer | null = null;
  private readonly patrol: Patrol | null;
  private direction: -1 | 1;

  constructor(
    characterUrl: string,
    animationUrl: string,
    position: THREE.Vector3,
    facingYaw: number,
    patrol: Patrol | null = null
  ) {
    this.group.position.copy(position);
    this.group.rotation.y = facingYaw;
    this.group.name = patrol ? 'Marine Drive Walker' : 'Marine Drive Sitter';
    this.patrol = patrol;
    this.direction = patrol?.direction ?? 1;
    this.loadCharacter(characterUrl, animationUrl);
  }

  public update(deltaTime: number): void {
    this.mixer?.update(deltaTime);
    if (!this.patrol) return;

    const patrol = this.patrol;
    let x = this.group.position.x + this.direction * patrol.speed * deltaTime;
    if (x >= patrol.maxX) {
      x = patrol.maxX;
      this.direction = -1;
    } else if (x <= patrol.minX) {
      x = patrol.minX;
      this.direction = 1;
    }

    const position = getNorthernCoastPosition(x, patrol.coastOffset, 2);
    this.group.position.copy(position);
    const slope = (getNorthernCoastZ(x + 1) - getNorthernCoastZ(x - 1)) / 2;
    this.group.rotation.y = Math.atan2(this.direction, slope * this.direction);
  }

  private loadCharacter(characterUrl: string, animationUrl: string): void {
    const loader = new FBXLoader();
    loader.load(characterUrl, (character) => {
      character.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(character);
      const height = bounds.getSize(new THREE.Vector3()).y;
      if (height <= 0) {
        console.warn(`Marine Drive NPC model has no measurable height: ${characterUrl}`);
        return;
      }

      const scale = 1.72 / height;
      character.scale.setScalar(scale);
      character.position.y = -bounds.min.y * scale;
      character.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      this.group.add(character);
      this.mixer = new THREE.AnimationMixer(character);
      this.loadAnimation(loader, animationUrl, character);
    }, undefined, (error) => {
      console.error(`Could not load Marine Drive NPC model ${characterUrl}.`, error);
    });
  }

  private loadAnimation(loader: FBXLoader, animationUrl: string, character: THREE.Group): void {
    loader.load(animationUrl, (source) => {
      const sourceClip = source.animations[0];
      if (!sourceClip || !this.mixer) {
        console.warn(`Marine Drive NPC animation contains no clip: ${animationUrl}`);
        return;
      }

      const targetBones = new Map<string, string>();
      character.traverse((node) => {
        if ((node as THREE.Bone).isBone) {
          targetBones.set(this.canonicalBoneName(node.name), node.name);
        }
      });
      const clip = sourceClip.clone();
      clip.tracks.forEach((track) => {
        const separator = track.name.indexOf('.');
        if (separator < 0) return;
        const sourceName = track.name.slice(0, separator);
        const targetName = targetBones.get(this.canonicalBoneName(sourceName));
        if (targetName) track.name = `${targetName}${track.name.slice(separator)}`;
      });

      if (animationUrl.toLowerCase().includes('walking')) this.removeRootMotion(clip);
      this.mixer.clipAction(clip, character).setLoop(THREE.LoopRepeat, Infinity).play();
    }, undefined, (error) => {
      console.error(`Could not load Marine Drive NPC animation ${animationUrl}.`, error);
    });
  }

  private canonicalBoneName(name: string): string {
    const compactName = name.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const prefix = compactName.indexOf('mixamorig');
    if (prefix >= 0) {
      return compactName.slice(prefix + 'mixamorig'.length).replace(/^\d+/, '');
    }
    return compactName.replace(/^\d+/, '');
  }

  private removeRootMotion(clip: THREE.AnimationClip): void {
    const hipsTrack = clip.tracks.find((track) => track.name.endsWith('Hips.position'));
    if (!hipsTrack) return;
    const values = hipsTrack.values;
    const first = [values[0], values[1], values[2]];
    for (let i = 0; i < values.length; i += 3) {
      values[i] = first[0];
      values[i + 1] = first[1];
      values[i + 2] = first[2];
    }
  }
}
