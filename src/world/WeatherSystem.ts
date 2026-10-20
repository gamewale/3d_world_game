import * as THREE from 'three';

export const WEATHER_PRESETS = [
  'Clear Day',
  'Golden Hour',
  'Overcast',
  'Rainy',
  'Night',
] as const;

type WeatherPreset = (typeof WEATHER_PRESETS)[number];

interface WeatherState {
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  skyLower: THREE.Color;
  sunColor: THREE.Color;
  sunDirection: THREE.Vector3;
  sunGlow: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  keyColor: THREE.Color;
  keyIntensity: number;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  rain: number;
}

const color = (hex: number): THREE.Color => new THREE.Color(hex);
const makeState = (
  skyTop: number,
  skyHorizon: number,
  skyLower: number,
  sunColor: number,
  sunDirection: [number, number, number],
  sunGlow: number,
  hemiSky: number,
  hemiGround: number,
  hemiIntensity: number,
  keyColor: number,
  keyIntensity: number,
  fogColor: number,
  fogNear: number,
  fogFar: number,
  rain = 0
): WeatherState => ({
  skyTop: color(skyTop),
  skyHorizon: color(skyHorizon),
  skyLower: color(skyLower),
  sunColor: color(sunColor),
  sunDirection: new THREE.Vector3(...sunDirection).normalize(),
  sunGlow,
  hemiSky: color(hemiSky),
  hemiGround: color(hemiGround),
  hemiIntensity,
  keyColor: color(keyColor),
  keyIntensity,
  fogColor: color(fogColor),
  fogNear,
  fogFar,
  rain,
});

const PRESET_STATES: Record<WeatherPreset, WeatherState> = {
  'Clear Day': makeState(
    0x2865b0, 0x91c6e8, 0xd7e5eb, 0xfff1d1, [-0.45, 0.72, -0.52], 0.8,
    0xd9edff, 0x77735f, 1.35, 0xfff4dc, 2.6, 0x9bc9ed, 220, 1050
  ),
  'Golden Hour': makeState(
    0xb65a3e, 0xf18c85, 0xf57b32, 0xf5480d, [0, 0.12, 1], 2.65,
    0xe9a78f, 0x745044, 0.95, 0xff6c27, 3.1, 0xd88a78, 110, 760
  ),
  Overcast: makeState(
    0x566477, 0x9da7ac, 0xb9b7ad, 0xd1d8de, [-0.45, 0.72, -0.52], 0.12,
    0xb8c2ca, 0x777777, 0.9, 0xc4cdd4, 1.45, 0x89969c, 130, 760
  ),
  Rainy: makeState(
    0x303e53, 0x6b7781, 0x889197, 0x9daeba, [-0.45, 0.72, -0.52], 0.04,
    0x9baab8, 0x555b62, 0.62, 0x9ba8b5, 0.95, 0x667985, 80, 500, 1
  ),
  Night: makeState(
    0x070b23, 0x20284d, 0x33334e, 0x718bc8, [-0.45, 0.72, -0.52], 0.22,
    0x65749e, 0x28283c, 0.42, 0x8295d2, 0.48, 0x1c2440, 70, 480
  ),
};

const cloneState = (state: WeatherState): WeatherState => ({
  skyTop: state.skyTop.clone(),
  skyHorizon: state.skyHorizon.clone(),
  skyLower: state.skyLower.clone(),
  sunColor: state.sunColor.clone(),
  sunDirection: state.sunDirection.clone(),
  sunGlow: state.sunGlow,
  hemiSky: state.hemiSky.clone(),
  hemiGround: state.hemiGround.clone(),
  hemiIntensity: state.hemiIntensity,
  keyColor: state.keyColor.clone(),
  keyIntensity: state.keyIntensity,
  fogColor: state.fogColor.clone(),
  fogNear: state.fogNear,
  fogFar: state.fogFar,
  rain: state.rain,
});

export class WeatherSystem {
  private readonly scene: THREE.Scene;
  private readonly skyMaterial: THREE.ShaderMaterial;
  private readonly sky: THREE.Mesh;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly keyLight: THREE.DirectionalLight;
  private readonly fog: THREE.Fog;
  private readonly rain: THREE.Points;
  private readonly rainPositions: Float32Array;
  private readonly current: WeatherState;
  private transitionStart: WeatherState;
  private transitionTarget: WeatherState;
  private transitionElapsed = 0;
  private readonly transitionDuration = 3;
  private readonly roadMaterials: THREE.MeshStandardMaterial[] = [];
  private surfacesCollected = false;
  private readonly sunDirection = new THREE.Vector3();
  private activePreset: WeatherPreset = 'Clear Day';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.current = cloneState(PRESET_STATES['Clear Day']);
    this.transitionStart = cloneState(this.current);
    this.transitionTarget = cloneState(this.current);

    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: this.current.skyTop.clone() },
        horizonColor: { value: this.current.skyHorizon.clone() },
        lowerColor: { value: this.current.skyLower.clone() },
        sunColor: { value: this.current.sunColor.clone() },
        sunDirection: { value: this.current.sunDirection.clone() },
        sunGlow: { value: this.current.sunGlow },
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize((modelMatrix * vec4(position, 0.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDirection;
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 lowerColor;
        uniform vec3 sunColor;
        uniform vec3 sunDirection;
        uniform float sunGlow;
        void main() {
          float elevation = normalize(vDirection).y;
          float upperBlend = smoothstep(-0.08, 0.68, elevation);
          float lowerBlend = smoothstep(-0.16, 0.04, elevation);
          vec3 horizonBand = mix(lowerColor, horizonColor, lowerBlend);
          vec3 sky = mix(horizonBand, topColor, upperBlend);
          float sunDot = max(dot(normalize(vDirection), normalize(sunDirection)), 0.0);
          float disc = smoothstep(0.99945, 0.9998, sunDot);
          float glow = pow(sunDot, 18.0) * sunGlow * 0.32;
          sky = mix(sky, sunColor, disc * min(sunGlow, 1.0));
          sky += sunColor * glow;
          gl_FragColor = vec4(sky, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      toneMapped: true,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 20), this.skyMaterial);
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    this.hemiLight = new THREE.HemisphereLight(
      this.current.hemiSky,
      this.current.hemiGround,
      this.current.hemiIntensity
    );
    this.hemiLight.position.set(0, 50, 0);
    scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(this.current.keyColor, this.current.keyIntensity);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 120;
    const shadowExtent = 46;
    this.keyLight.shadow.camera.left = -shadowExtent;
    this.keyLight.shadow.camera.right = shadowExtent;
    this.keyLight.shadow.camera.top = shadowExtent;
    this.keyLight.shadow.camera.bottom = -shadowExtent;
    this.keyLight.shadow.bias = -0.0005;
    scene.add(this.keyLight);
    scene.add(this.keyLight.target);

    this.fog = new THREE.Fog(this.current.fogColor, this.current.fogNear, this.current.fogFar);
    scene.fog = this.fog;

    const rainCount = 520;
    this.rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 46;
      this.rainPositions[i * 3 + 1] = Math.random() * 24;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 46;
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const rainMaterial = new THREE.PointsMaterial({
      color: 0xd4e7ff,
      size: 0.075,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rain = new THREE.Points(rainGeometry, rainMaterial);
    this.rain.frustumCulled = false;
    scene.add(this.rain);
  }

  public get presetName(): WeatherPreset {
    return this.activePreset;
  }

  public cycle(): WeatherPreset {
    const nextIndex = (WEATHER_PRESETS.indexOf(this.activePreset) + 1) % WEATHER_PRESETS.length;
    this.activePreset = WEATHER_PRESETS[nextIndex];
    this.transitionStart = cloneState(this.current);
    this.transitionTarget = cloneState(PRESET_STATES[this.activePreset]);
    this.transitionElapsed = 0;
    return this.activePreset;
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (!this.surfacesCollected) {
      this.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (
            material instanceof THREE.MeshStandardMaterial &&
            material.userData.weatherRoadSurface
          ) {
            this.roadMaterials.push(material);
          }
        }
      });
      this.surfacesCollected = true;
    }

    if (this.transitionElapsed < this.transitionDuration) {
      this.transitionElapsed = Math.min(
        this.transitionElapsed + deltaTime,
        this.transitionDuration
      );
      const linearT = this.transitionElapsed / this.transitionDuration;
      const t = linearT * linearT * (3 - 2 * linearT);
      this.interpolateState(this.transitionStart, this.transitionTarget, t);
      this.applyState();
    }

    this.sky.position.copy(playerPosition);
    this.rain.position.set(playerPosition.x, playerPosition.y, playerPosition.z);
    const position = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
    if (this.current.rain > 0.001) {
      for (let i = 0; i < this.rainPositions.length; i += 3) {
        this.rainPositions[i + 1] -= deltaTime * 18;
        if (this.rainPositions[i + 1] < 0) this.rainPositions[i + 1] += 24;
      }
      position.needsUpdate = true;
    }
    const sunsetSheen = THREE.MathUtils.clamp((this.current.sunGlow - 0.8) / 1.4, 0, 1) * 0.18;
    const roadRoughness = THREE.MathUtils.lerp(0.95, 0.48, Math.max(this.current.rain, sunsetSheen));
    for (const material of this.roadMaterials) material.roughness = roadRoughness;
  }

  private interpolateState(from: WeatherState, to: WeatherState, t: number): void {
    this.current.skyTop.copy(from.skyTop).lerp(to.skyTop, t);
    this.current.skyHorizon.copy(from.skyHorizon).lerp(to.skyHorizon, t);
    this.current.skyLower.copy(from.skyLower).lerp(to.skyLower, t);
    this.current.sunColor.copy(from.sunColor).lerp(to.sunColor, t);
    this.current.sunDirection.copy(from.sunDirection).lerp(to.sunDirection, t).normalize();
    this.current.sunGlow = THREE.MathUtils.lerp(from.sunGlow, to.sunGlow, t);
    this.current.hemiSky.copy(from.hemiSky).lerp(to.hemiSky, t);
    this.current.hemiGround.copy(from.hemiGround).lerp(to.hemiGround, t);
    this.current.hemiIntensity = THREE.MathUtils.lerp(from.hemiIntensity, to.hemiIntensity, t);
    this.current.keyColor.copy(from.keyColor).lerp(to.keyColor, t);
    this.current.keyIntensity = THREE.MathUtils.lerp(from.keyIntensity, to.keyIntensity, t);
    this.current.fogColor.copy(from.fogColor).lerp(to.fogColor, t);
    this.current.fogNear = THREE.MathUtils.lerp(from.fogNear, to.fogNear, t);
    this.current.fogFar = THREE.MathUtils.lerp(from.fogFar, to.fogFar, t);
    this.current.rain = THREE.MathUtils.lerp(from.rain, to.rain, t);
  }

  private applyState(): void {
    const uniforms = this.skyMaterial.uniforms;
    uniforms.topColor.value.copy(this.current.skyTop);
    uniforms.horizonColor.value.copy(this.current.skyHorizon);
    uniforms.lowerColor.value.copy(this.current.skyLower);
    uniforms.sunColor.value.copy(this.current.sunColor);
    uniforms.sunDirection.value.copy(this.current.sunDirection);
    uniforms.sunGlow.value = this.current.sunGlow;

    this.hemiLight.color.copy(this.current.hemiSky);
    this.hemiLight.groundColor.copy(this.current.hemiGround);
    this.hemiLight.intensity = this.current.hemiIntensity;
    this.keyLight.color.copy(this.current.keyColor);
    this.keyLight.intensity = this.current.keyIntensity;
    this.sunDirection.copy(this.current.sunDirection).multiplyScalar(90);
    this.keyLight.position.copy(this.sunDirection);
    this.keyLight.target.position.set(0, 0, 0);
    this.keyLight.target.updateMatrixWorld();
    this.fog.color.copy(this.current.fogColor);
    this.fog.near = this.current.fogNear;
    this.fog.far = this.current.fogFar;
    (this.rain.material as THREE.PointsMaterial).opacity = this.current.rain * 0.58;
  }
}
