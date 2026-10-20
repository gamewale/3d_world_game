import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface WaterAssetMaterial {
  normalMap: THREE.Texture;
  color: THREE.Color;
}

let waterAssetPromise: Promise<WaterAssetMaterial> | null = null;

function loadWaterAsset(): Promise<WaterAssetMaterial> {
  if (!waterAssetPromise) {
    waterAssetPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        '/waterocean%20(1).glb',
        (gltf) => {
          const candidates: THREE.MeshStandardMaterial[] = [];
          gltf.scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
              if (material instanceof THREE.MeshStandardMaterial && material.normalMap) {
                candidates.push(material);
              }
            }
          });
          const foundMaterial = candidates[0];

          if (!foundMaterial || !foundMaterial.normalMap) {
            reject(new Error('The water GLB does not contain a normal mapped material.'));
            return;
          }

          const assetMaterial: WaterAssetMaterial = {
            normalMap: foundMaterial.normalMap.clone(),
            color: foundMaterial.color.clone(),
          };
          resolve(assetMaterial);

          gltf.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) object.geometry.dispose();
          });
        },
        undefined,
        reject
      );
    });
  }
  return waterAssetPromise;
}

export function applyWaterAsset(material: THREE.MeshStandardMaterial, textureRepeat = 1): void {
  void loadWaterAsset()
    .then((asset) => {
      const normalMap = asset.normalMap.clone();
      normalMap.wrapS = THREE.RepeatWrapping;
      normalMap.wrapT = THREE.RepeatWrapping;
      normalMap.repeat.set(textureRepeat, textureRepeat);
      material.normalMap = normalMap;
      material.normalScale.set(0.7, 0.7);
      material.color.copy(asset.color);
      material.roughness = 0.12;
      material.metalness = 0;
      material.needsUpdate = true;
    })
    .catch((error: unknown) => console.error('Could not apply water GLB material.', error));
}
