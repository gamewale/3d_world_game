import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VillaBuilder } from './VillaBuilder';
import { MainGate } from './MainGate';
import { CityMap, createGrassMaterial } from './CityMap';

export class World {
  public readonly scene: THREE.Scene;
  public readonly colliders: THREE.Box3[] = [];
  public readonly mainGate: MainGate;
  public car: THREE.Group | null = null;

  private builder: VillaBuilder;
  private secretButtonMesh: THREE.Mesh;
  private secretButtonMat: THREE.MeshStandardMaterial;
  private elapsedTime = 0;
  private isButtonPressed = false;
  private duckCollisionActive = false;
  private grannyCollisionActive = false;
  private readonly duckVelocity = new THREE.Vector3();
  private carSpeed = 0;

  constructor() {
    this.scene = new THREE.Scene();

    this.scene.background = new THREE.Color(0x9bc9ed);
    this.scene.fog = new THREE.Fog(0x9bc9ed, 220, 1050);
    this.setupSky();

    this.setupLights();

    new CityMap(this.scene, createGrassMaterial());

    this.builder = new VillaBuilder(this.scene, this.colliders);
    this.builder.build();

    // Secret Button on the pedestal beside the east-side service rooms.
    this.secretButtonMat = new THREE.MeshStandardMaterial({
      color: 0xff2a85,
      emissive: 0xff2a85,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const btnGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.22, 20);
    this.secretButtonMesh = new THREE.Mesh(btnGeo, this.secretButtonMat);
    this.secretButtonMesh.position.set(3.7, 1.18, -16.5);
    this.scene.add(this.secretButtonMesh);

    this.mainGate = new MainGate(20);
    this.scene.add(this.mainGate.group);
    this.colliders.push(this.mainGate.collider);
    this.loadRoadsideCar();
  }

  private loadRoadsideCar(): void {
    const loader = new GLTFLoader();
    const addCar = (gltf: { scene: THREE.Group }): void => {
      const car = gltf.scene;
      car.updateMatrixWorld(true);
      const initialBounds = new THREE.Box3().setFromObject(car);
      const size = initialBounds.getSize(new THREE.Vector3());
      const horizontalLength = Math.max(size.x, size.z);

      if (horizontalLength > 0) {
        car.scale.multiplyScalar(5.4 / horizontalLength);
      }

      // Keep the longest axis parallel to the street and settle the wheels on
      // the road surface, regardless of the model's original origin.
      if (size.z > size.x) car.rotation.y = Math.PI / 2;
      car.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(car);
      const center = bounds.getCenter(new THREE.Vector3());
      car.position.x -= center.x;
      car.position.y -= bounds.min.y;
      car.position.z -= center.z;

      const parkedCar = new THREE.Group();
      parkedCar.position.set(0, 0.04, 29);
      parkedCar.add(car);
      car.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;

          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const material of materials) {
            const materialName = material.name.toLowerCase();
            const isCarPaint =
              material instanceof THREE.MeshStandardMaterial &&
              (materialName.includes('carpaint') || materialName.includes('metallic_paint'));
            if (isCarPaint) {
              material.color.set('#087bff');
              material.metalness = 0.72;
              material.roughness = 0.24;
            }
          }
        }
      });
      this.car = parkedCar;
      this.scene.add(parkedCar);
    };

    loader.load(
      '/models/Lamborghini%2BTemerario.glb',
      addCar,
      undefined,
      (error) => {
        console.error('Could not load encoded Lamborghini model path; retrying filename as-is.', error);
        loader.load(
          '/models/Lamborghini+Temerario.glb',
          addCar,
          undefined,
          (fallbackError) => console.error('Could not load Lamborghini car model.', fallbackError)
        );
      }
    );
  }

  public updateCar(deltaTime: number, throttle: number, steering: number): void {
    if (!this.car) return;

    if (throttle !== 0) {
      this.carSpeed += throttle * 9 * deltaTime;
    } else {
      this.carSpeed *= Math.exp(-1.5 * deltaTime);
    }
    this.carSpeed = THREE.MathUtils.clamp(this.carSpeed, -6, 18);

    if (Math.abs(this.carSpeed) > 0.15) {
      this.car.rotation.y -= steering * Math.sign(this.carSpeed) *
        Math.min(Math.abs(this.carSpeed) / 8, 1) * 1.2 * deltaTime;
    }

    this.car.position.x -= Math.cos(this.car.rotation.y) * this.carSpeed * deltaTime;
    this.car.position.z += Math.sin(this.car.rotation.y) * this.carSpeed * deltaTime;
  }

  public getCarSeatPosition(target: THREE.Vector3): THREE.Vector3 | null {
    if (!this.car) return null;
    return this.car.localToWorld(target.set(0.45, 0.48, 0.38));
  }

  public getCarExitPosition(target: THREE.Vector3): THREE.Vector3 | null {
    if (!this.car) return null;
    return this.car.localToWorld(target.set(0, 0, 2.3));
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

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.elapsedTime += deltaTime;
    this.mainGate.update(deltaTime);
    this.builder.barDoor.update(deltaTime, playerPosition);
    this.builder.bathroomDoor.update(deltaTime, playerPosition);
    this.builder.backyardDoor.update(deltaTime, playerPosition);
    this.builder.grannyNpc?.update(deltaTime);
    this.builder.barReceptionist?.update(deltaTime);
    this.builder.updateBarScene(deltaTime);

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

  }

  public get biscuitCartPosition(): THREE.Vector3 | null {
    return this.builder.getBiscuitCartPosition();
  }

  public get bathroomDoorPosition(): THREE.Vector3 {
    return this.builder.bathroomDoor.interactionPosition;
  }

  public get isBathroomDoorOpen(): boolean {
    return this.builder.bathroomDoor.isOpen;
  }

  public openBathroomDoor(playerPosition: THREE.Vector3): void {
    this.builder.bathroomDoor.openDoor(playerPosition);
  }

  public get backyardDoorPosition(): THREE.Vector3 {
    return this.builder.backyardDoor.interactionPosition;
  }

  public get isBackyardDoorOpen(): boolean {
    return this.builder.backyardDoor.isOpen;
  }

  public openBackyardDoor(playerPosition: THREE.Vector3): void {
    this.builder.backyardDoor.openDoor(playerPosition);
  }

  public get barDoorPosition(): THREE.Vector3 {
    return this.builder.barDoor.interactionPosition;
  }

  public get isBarDoorOpen(): boolean {
    return this.builder.barDoor.isOpen;
  }

  public openBarDoor(playerPosition: THREE.Vector3): void {
    this.builder.barDoor.openDoor(playerPosition);
  }

  public isPlayerInsideBar(position: THREE.Vector3): boolean {
    // The outdoor bar occupies the left courtyard corner just inside the gate.
    return position.y < 0.9 &&
      position.x > -23.6 && position.x < -12.8 &&
      position.z > 3.8 && position.z < 19.4;
  }

  public isPlayerInsideTemple(position: THREE.Vector3): boolean {
    // Temple interior bounds; exclude the exterior stair approach.
    return position.x > 15.25 && position.x < 20.75 &&
      position.z > -44.2 && position.z < -38.9;
  }

  public isPlayerAtJuiceStall(position: THREE.Vector3): boolean {
    return position.y < 2.2 &&
      position.x > 0.8 && position.x < 8.8 &&
      position.z > -42.8 && position.z < -35.5;
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

  public didPlayerTouchGranny(playerPosition: THREE.Vector3): boolean {
    const collider = this.builder.grannyNpc?.collider;
    if (!collider) return false;

    const playerBox = new THREE.Box3(
      new THREE.Vector3(
        playerPosition.x - 0.45,
        playerPosition.y + 0.02,
        playerPosition.z - 0.45
      ),
      new THREE.Vector3(
        playerPosition.x + 0.45,
        playerPosition.y + 1.8,
        playerPosition.z + 0.45
      )
    );
    // Player movement rolls back the attempted step on solid colliders, so
    // the two boxes will not overlap when this is checked after movement.
    // A small tolerance catches physical contact at the resolved boundary.
    playerBox.expandByVector(new THREE.Vector3(0.08, 0, 0.08));
    const touching = playerBox.intersectsBox(collider);
    const shouldPlaySound = touching && !this.grannyCollisionActive;
    this.grannyCollisionActive = touching;
    return shouldPlaySound;
  }

}
