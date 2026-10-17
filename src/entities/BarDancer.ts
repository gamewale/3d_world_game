import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

/** FBX character playing the Snake Hip Hop Dance animation in the bar. */
export class BarDancer {
  public readonly group = new THREE.Group();
  public readonly collider = new THREE.Box3();

  private mixer: THREE.AnimationMixer | null = null;

  constructor(position: THREE.Vector3, facingYaw: number) {
    this.group.position.copy(position);
    this.group.rotation.y = facingYaw;
    this.group.name = 'Peasant Girl Bar Dancer';
    this.updateCollider();
    this.loadCharacterAndDance();
  }

  public update(deltaTime: number): void {
    this.mixer?.update(deltaTime);
    this.updateCollider();
  }

  private updateCollider(): void {
    // A compact body-sized collider lets the player approach and touch her
    // without the wide bounds of her dance pose blocking the whole stage.
    this.collider.min.set(
      this.group.position.x - 0.3,
      this.group.position.y,
      this.group.position.z - 0.3
    );
    this.collider.max.set(
      this.group.position.x + 0.3,
      this.group.position.y + 1.72,
      this.group.position.z + 0.3
    );
  }

  private loadCharacterAndDance(): void {
    const loader = new FBXLoader();
    loader.load(
      '/models/Peasant%20Girl.fbx',
      (character) => {
        character.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(character);
        const height = bounds.getSize(new THREE.Vector3()).y;
        if (height <= 0) {
          console.warn('Peasant Girl.fbx has no measurable height.');
          return;
        }

        // Normalize the asset to a believable human height and place her feet
        // on the bar stage, regardless of the FBX's source units or origin.
        const scale = 1.72 / height;
        character.scale.setScalar(scale);
        character.position.y = -bounds.min.y * scale;
        character.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        this.group.add(character);
        this.mixer = new THREE.AnimationMixer(character);
        this.loadDance(loader, character);
      },
      undefined,
      (error) => console.error('Could not load /models/Peasant Girl.fbx', error)
    );
  }

  private loadDance(loader: FBXLoader, character: THREE.Group): void {
    loader.load(
      '/models/Snake%20Hip%20Hop%20Dance.fbx',
      (danceFile) => {
        const sourceClip = danceFile.animations[0];
        if (!sourceClip || !this.mixer) {
          console.warn('Snake Hip Hop Dance.fbx contains no animation clip.');
          return;
        }

        // Mixamo exports often differ only by a numeric rig prefix, such as
        // mixamorigHips versus mixamorig5Hips. Retarget track node names to
        // the matching bones in this character before creating the action.
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
          const trackNode = track.name.slice(0, separator);
          const targetName = targetBones.get(this.canonicalBoneName(trackNode));
          if (targetName) track.name = `${targetName}${track.name.slice(separator)}`;
        });

        this.mixer.clipAction(clip, character).setLoop(THREE.LoopRepeat, Infinity).play();
      },
      undefined,
      (error) => console.error('Could not load /models/Snake Hip Hop Dance.fbx', error)
    );
  }

  private canonicalBoneName(name: string): string {
    const compactName = name.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const mixamoPrefix = compactName.indexOf('mixamorig');
    if (mixamoPrefix >= 0) {
      return compactName.slice(mixamoPrefix + 'mixamorig'.length).replace(/^\d+/, '');
    }
    return compactName.replace(/^\d+/, '');
  }
}
