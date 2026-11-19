import * as THREE from 'three';
import { SHARED_SHADER_UNIFORMS, createStylizedMaterial } from '../render/StylizedMaterials.js';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.time = 0;
    this.kites = [];
    this.birds = [];
    this.fishingBoatTarget = null; // Can be set by fishing boats to attract gaivotas!
    this.iblMaps = null;
    this.iblPhase = null;

    // Automatic Continuous Day/Sunset/Night/Dawn Cycle:
    // Cycle duration: 220 seconds (approx 3.6 mins per 24h day at 1x speed)
    this.cycleTime = 25.0; // Start at pleasant mid-morning
    this.cycleDuration = 220.0;
    this.currentPhase = 'day'; // 'day', 'sunset', 'night', 'dawn'
    this.isAutoCycle = true;
    this.phaseListeners = [];

    this.init();
    this.scene.add(this.group);
  }

  init() {
    this.setupLightingAndSky();
    this.createStylizedTropicalOcean();
    this.createDynamicShorelineSurf();
    this.createHorizonArchipelago();
    this.createStarsAndMoon();
    this.createKites();
    this.createSeabirds();
  }

  setupLightingAndSky() {
    // Crisp summer Rio azure sky initially
    this.scene.background = new THREE.Color('#58B4E3');
    this.scene.fog = new THREE.Fog('#7EC8E8', 280, 1550);

    // Ambient Hemisphere Light (Sky vs Ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0xE1F5FE, 0x2E7D32, 0.85);
    this.scene.add(this.hemiLight);

    // Directional Celestial Light (Sun by day / Moon by night)
    this.dirLight = new THREE.DirectionalLight(0xFFF6DF, 2.45);
    this.dirLight.position.set(-60, 95, 50);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 380;
    this.dirLight.shadow.camera.left = -140;
    this.dirLight.shadow.camera.right = 140;
    this.dirLight.shadow.camera.top = 140;
    this.dirLight.shadow.camera.bottom = -140;
    this.dirLight.shadow.bias = -0.00025;
    this.dirLight.shadow.normalBias = 0.035;
    this.scene.add(this.dirLight);

    // Sun disc visible in sky dome
    const sunGeo = new THREE.SphereGeometry(22, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFF9C4, fog: false });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.copy(this.dirLight.position).multiplyScalar(4.8);
    this.group.add(this.sunMesh);
  }

  /**
   * Pré-computa 4 cubemaps IBL leves via PMREMGenerator para iluminação global realista
   * nos materiais PBR sem custo de CPU/GPU por frame.
   */
  initIBL(renderer) {
    if (!renderer || this.iblMaps) return;
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    const makePhaseIBL = ({ top, horizon, ground, sun, sunDir }) => {
      const envScene = new THREE.Scene();
      const domeGeo = new THREE.SphereGeometry(30, 24, 16);
      const domeMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(top) },
          uHorizon: { value: new THREE.Color(horizon) },
          uGround: { value: new THREE.Color(ground) },
          uSun: { value: new THREE.Color(sun) },
          uSunDir: { value: new THREE.Vector3(...sunDir).normalize() }
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uGround;
          uniform vec3 uSun;
          uniform vec3 uSunDir;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            vec3 sky = mix(uHorizon, uTop, smoothstep(0.0, 0.55, max(0.0, d.y)));
            vec3 col = d.y >= 0.0 ? sky : mix(uHorizon, uGround, smoothstep(0.0, 0.45, -d.y));
            float sunLobe = pow(max(dot(d, uSunDir), 0.0), 10.0);
            col += uSun * sunLobe * 0.55;
            gl_FragColor = vec4(col, 1.0);
          }
        `
      });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      envScene.add(dome);
      const rt = pmrem.fromScene(envScene, 0.04);
      domeGeo.dispose();
      domeMat.dispose();
      return rt;
    };

    this._iblTargets = {
      day: makePhaseIBL({ top: '#4EAEE6', horizon: '#BCE6FA', ground: '#3B6E47', sun: '#FFF3D1', sunDir: [-0.4, 0.8, 0.4] }),
      sunset: makePhaseIBL({ top: '#6D3FA8', horizon: '#F59E5B', ground: '#4D3224', sun: '#FBBF24', sunDir: [-0.7, 0.35, 0.3] }),
      night: makePhaseIBL({ top: '#132442', horizon: '#24416B', ground: '#182D26', sun: '#A8CBEB', sunDir: [0.4, 0.6, -0.4] }),
      dawn: makePhaseIBL({ top: '#5AA5DF', horizon: '#F9B8B8', ground: '#2C5C3D', sun: '#FDE68A', sunDir: [0.65, 0.4, 0.3] })
    };

    this.iblMaps = {
      day: this._iblTargets.day.texture,
      sunset: this._iblTargets.sunset.texture,
      night: this._iblTargets.night.texture,
      dawn: this._iblTargets.dawn.texture
    };

    pmrem.dispose();

    const phase = this.currentPhase || 'day';
    this.iblPhase = phase;
    this.scene.environment = this.iblMaps[phase];
    this.scene.environmentIntensity = phase === 'night' ? 0.52 : 0.78;
  }

  createStarsAndMoon() {
    // 1. Crescent / Full Silver Luminous Moon for the Tropical Night
    const moonGeo = new THREE.SphereGeometry(18, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xEEF6FF, fog: false });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.position.set(320, 480, -240);
    this.moonMesh.visible = false;
    this.group.add(this.moonMesh);

    // 2. Twinkling Low-Poly Starfield (220 stars scattered across the wide celestial dome)
    const starGeo = new THREE.BufferGeometry();
    const starCount = 220;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.75 + 0.25); // Only upper hemisphere above horizon
      const radius = 860 + Math.random() * 120;

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 3.2,
      transparent: true,
      opacity: 0.0,
      fog: false
    });

    this.stars = new THREE.Points(starGeo, this.starMat);
    this.group.add(this.stars);
  }

  _applyOceanShader(mat, { isBay = false } = {}) {
    mat.userData = mat.userData || {};
    mat.userData.isOceanShader = true;
    mat.customProgramCacheKey = () => (isBay ? 'morro_ocean_bay_v1' : 'morro_ocean_deep_v1');

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = SHARED_SHADER_UNIFORMS.uTime;
      shader.uniforms.uNightFactor = SHARED_SHADER_UNIFORMS.uNightFactor;
      shader.uniforms.uDeepColor = this.waterMat ? { value: this.waterMat.color } : { value: new THREE.Color(0x06649B) };

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uTime;
varying vec3 vOcWorldPos;
varying float vShoreDist;

float ocShoreZ(float wx) {
  float hl = max(0.0, (abs(wx) - 310.0) / 130.0);
  return 74.0 + sin(wx * 0.015) * 3.5 - (hl * hl * 82.0);
}

float ocWaveH(vec2 p, float t) {
  float w1 = sin(p.x * 0.055 + p.y * 0.035 + t * 1.35) * 0.14;
  float w2 = cos(p.y * 0.085 - p.x * 0.025 + t * 1.05) * 0.10;
  float w3 = sin((p.x + p.y) * 0.14 - t * 1.85) * 0.045;
  return w1 + w2 + w3;
}

vec2 ocWaveGrad(vec2 p, float t) {
  float dx = cos(p.x * 0.055 + p.y * 0.035 + t * 1.35) * 0.14 * 0.055
           + sin(p.y * 0.085 - p.x * 0.025 + t * 1.05) * 0.10 * 0.025
           + cos((p.x + p.y) * 0.14 - t * 1.85) * 0.045 * 0.14;
  float dz = cos(p.x * 0.055 + p.y * 0.035 + t * 1.35) * 0.14 * 0.035
           - sin(p.y * 0.085 - p.x * 0.025 + t * 1.05) * 0.10 * 0.085
           + cos((p.x + p.y) * 0.14 - t * 1.85) * 0.045 * 0.14;
  return vec2(dx, dz);
}`
        )
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
vec4 ocBaseW = modelMatrix * vec4( position, 1.0 );
float ocSD = ocBaseW.z - ocShoreZ( ocBaseW.x );
float ocDamp = smoothstep( 0.0, 14.0, max( 0.0, ocSD ) );
vec2 ocGrad = ocWaveGrad( ocBaseW.xz, uTime ) * ocDamp;
objectNormal = normalize( vec3( -ocGrad.x, 1.0, -ocGrad.y ) );`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
transformed.y += ocWaveH( ocBaseW.xz, uTime ) * ocDamp;`
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
vOcWorldPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
vShoreDist = ocSD;`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uTime;
uniform float uNightFactor;
uniform vec3 uDeepColor;
varying vec3 vOcWorldPos;
varying float vShoreDist;

float ocHash2(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float ocNoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(ocHash2(i), ocHash2(i + vec2(1.0, 0.0)), f.x),
    mix(ocHash2(i + vec2(0.0, 1.0)), ocHash2(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
float ocFoam = 0.0;
float ocDepthT = smoothstep(0.0, 48.0, max(0.0, vShoreDist));
vec3 ocShallowDay = vec3(0.07, 0.68, 0.78);
vec3 ocShallowNight = vec3(0.03, 0.24, 0.42);
vec3 ocShallowCol = mix(ocShallowDay, ocShallowNight, uNightFactor);

// Transição suave entre água turquesa rasa e o tom azul profundo do alto-mar
diffuseColor.rgb = mix(ocShallowCol, diffuseColor.rgb, ocDepthT);
${isBay ? `
diffuseColor.rgb = mix(diffuseColor.rgb, uDeepColor, smoothstep(32.0, 52.0, vShoreDist));

// Cáusticas tropicais suaves na lâmina rasa (dia)
float ocCaus1 = sin(vOcWorldPos.x * 0.75 + uTime * 1.4 + sin(vOcWorldPos.z * 0.65 - uTime));
float ocCaus2 = cos(vOcWorldPos.z * 0.85 - uTime * 1.2 + cos(vOcWorldPos.x * 0.55 + uTime * 0.8));
float ocCaustics = smoothstep(0.55, 1.0, (ocCaus1 * ocCaus2) * 0.5 + 0.5);
float ocShallowZone = (1.0 - smoothstep(2.0, 18.0, max(0.0, vShoreDist))) * smoothstep(-0.1, 1.2, vShoreDist);
diffuseColor.rgb += vec3(0.10, 0.20, 0.22) * ocCaustics * ocShallowZone * (1.0 - 0.78 * uNightFactor);

// Rebentação animada e espuma orgânica contínua na linha da praia
float ocEbb = 0.5 + 0.5 * sin(uTime * 1.4 + vOcWorldPos.x * 0.035);
float ocEdgeN = ocNoise2(vOcWorldPos.xz * 0.65 - vec2(0.0, uTime * 0.35));
float ocCrest = 1.0 - smoothstep(0.0, 0.62, abs(vShoreDist - (0.38 + ocEbb * 0.72 + (ocEdgeN - 0.5) * 0.55)));
float ocBack = 1.0 - smoothstep(0.0, 0.52, abs(vShoreDist - (1.85 + (1.0 - ocEbb) * 0.55 + (ocEdgeN - 0.5) * 0.45)));
float ocShoreFade = smoothstep(-0.28, 0.95, vShoreDist);
ocFoam = clamp(ocCrest * 0.92 + ocBack * 0.45, 0.0, 1.0) * smoothstep(-0.32, 0.25, vShoreDist);
vec3 ocFoamCol = mix(vec3(0.95, 0.98, 1.0), vec3(0.68, 0.78, 0.90), uNightFactor);
diffuseColor.rgb = mix(diffuseColor.rgb, ocFoamCol, ocFoam * 0.86);
diffuseColor.a = clamp(max(diffuseColor.a * ocShoreFade, ocFoam * 0.92), 0.0, 0.96);
` : ''}`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
float ocRip = ocNoise2(vOcWorldPos.xz * 0.75 + vec2(uTime * 0.45, -uTime * 0.32));
float ocBaseRough = mix(0.24, 0.54, uNightFactor) + (ocRip - 0.5) * 0.14;
roughnessFactor = clamp(mix(ocBaseRough, 0.92, ocFoam), 0.14, 0.96);`
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
float ocRipScale = (1.0 - 0.62 * uNightFactor) * smoothstep(0.0, 4.0, max(0.0, vShoreDist)) * (1.0 - ocFoam);
float ocRx = (ocNoise2(vOcWorldPos.xz * 1.4 + vec2(uTime * 0.65, uTime * 0.25)) - 0.5) * 0.14 * ocRipScale;
float ocRz = (ocNoise2(vOcWorldPos.xz * 1.4 - vec2(uTime * 0.30, uTime * 0.58)) - 0.5) * 0.14 * ocRipScale;
normal = normalize(normal + (viewMatrix * vec4(ocRx, 0.0, ocRz, 0.0)).xyz);`
        );
    };
  }

  createStylizedTropicalOcean() {
    // 1. Oceano Atlântico de Alto-Mar (Open Ocean) - shader GPU compartilhado
    // Inicia em Z = 125m (50m mar adentro), estendendo-se até o horizonte
    const waterGeo = new THREE.PlaneGeometry(4200, 3200, 112, 96);
    waterGeo.rotateX(-Math.PI / 2);

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x06649B,
      roughness: 0.30,
      metalness: 0.06,
      flatShading: false,
      transparent: false
    });
    this._applyOceanShader(this.waterMat, { isBay: false });

    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    this.waterMesh.position.set(0, 0.02, 1725.15);
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);

    // 2. Águas Costeiras Calmas da Enseada Carioca (Bay Water Mesh)
    this.createCoastalBayWater();
  }

  createCoastalBayWater() {
    const xMin = -375.0;
    const xMax = 375.0;
    const xStep = 2.5;
    const numCols = Math.round((xMax - xMin) / xStep) + 1;
    const numRows = 12; // 12 anéis do raso (shoreZ) até z = 125.1m (encaixe exato com alto-mar)
    const positions = [];
    const indices = [];

    for (let r = 0; r < numRows; r++) {
      const rowT = r / (numRows - 1);
      for (let c = 0; c < numCols; c++) {
        const x = xMin + c * xStep;
        const headlandCurve = Math.max(0.0, (Math.abs(x) - 310.0) / 130.0);
        const shoreZ = 74.0 + Math.sin(x * 0.015) * 3.5 - (headlandCurve * headlandCurve * 82.0);

        const z = (shoreZ - 0.35) + rowT * (125.15 - (shoreZ - 0.35));
        const y = -0.008 + rowT * 0.028;

        positions.push(x, y, z);

        if (r > 0 && c > 0) {
          const i0 = (r - 1) * numCols + (c - 1);
          const i1 = (r - 1) * numCols + c;
          const i2 = r * numCols + (c - 1);
          const i3 = r * numCols + c;
          indices.push(i0, i2, i1);
          indices.push(i1, i2, i3);
        }
      }
    }

    const bayGeo = new THREE.BufferGeometry();
    bayGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    bayGeo.setIndex(indices);
    bayGeo.computeVertexNormals();

    this.bayWaterMat = new THREE.MeshStandardMaterial({
      color: 0x0B86C4,
      roughness: 0.28,
      metalness: 0.05,
      flatShading: false,
      transparent: true,
      depthWrite: false,
      opacity: 0.90
    });
    this._applyOceanShader(this.bayWaterMat, { isBay: true });

    this.bayWaterMesh = new THREE.Mesh(bayGeo, this.bayWaterMat);
    this.bayWaterMesh.receiveShadow = true;
    this.group.add(this.bayWaterMesh);
  }

  createDynamicShorelineSurf() {
    // A rebentação animada contínua agora é calculada por pixel no shader da Enseada (GPU, 0ms CPU),
    // mantendo surfGroup vazio/oculto para compatibilidade de interface sem facetas geométricas.
    this.surfGroup = new THREE.Group();
    this.surfGroup.visible = false;
    this.group.add(this.surfGroup);
  }

  // Arquipélago Tropical Distante no Horizonte Sul (Atlântico Sul):
  // Apenas ilhotas oceânicas suaves ao sul (mar aberto), sem blocos gigantes atrás da serra norte!
  createHorizonArchipelago() {
    const archGroup = new THREE.Group();

    const graniteMat = createStylizedMaterial({ color: 0x56616B }, 'stone');
    const lushIslandMat = createStylizedMaterial({ color: 0x2E6B4F }, 'foliage');
    const sandRimMat = createStylizedMaterial({ color: 0xDEC07C }, 'stone');

    const islands = [
      // 1. Ilhotas Costeiras das Cagarras no Horizonte Sul (Mar Aberto, Z > 420)
      { x: -290, z: 450, rx: 28, rz: 18, h: 16, hasPalmCap: true },
      { x: -235, z: 485, rx: 16, rz: 12, h: 10, hasPalmCap: false },
      { x: 260,  z: 465, rx: 32, rz: 20, h: 18, hasPalmCap: true },
      { x: 320,  z: 495, rx: 18, rz: 14, h: 11, hasPalmCap: false },
      // 2. Ilha Rasa & Farol Oceânico ao Sul Profundo
      { x: 18,   z: 540, rx: 26, rz: 16, h: 14, hasPalmCap: true, hasBeacon: true }
    ];

    islands.forEach((isl, idx) => {
      const g = new THREE.Group();
      g.position.set(isl.x, -0.5, isl.z);

      // Base suave de areia na linha d'água
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.12, 1.1, 10), sandRimMat);
      rim.scale.set(isl.rx * 1.02, 1.0, isl.rz * 1.02);
      rim.position.y = 0.2;
      g.add(rim);

      // Silhueta baixa e alongada de ilhota granítica
      const peak = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 1), graniteMat);
      peak.scale.set(isl.rx, isl.h, isl.rz);
      peak.position.y = isl.h * 0.28;
      peak.rotation.y = idx * 1.1;
      g.add(peak);

      // Vegetação integrada no topo da ilhota (sem saltar para fora da lateral)
      if (isl.hasPalmCap) {
        const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.82, 1), lushIslandMat);
        cap.scale.set(isl.rx * 0.76, isl.h * 0.42, isl.rz * 0.76);
        cap.position.set(0, isl.h * 0.46, 0);
        cap.rotation.y = idx * 1.1;
        g.add(cap);
      }

      // Farol oceânico na Ilha Rasa
      if (isl.hasBeacon) {
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.9, 1.3, 9.0, 8),
          new THREE.MeshLambertMaterial({ color: 0xF8FAFC })
        );
        tower.position.set(0, isl.h * 0.72 + 4.0, 0);
        g.add(tower);

        const lantern = new THREE.Mesh(
          new THREE.SphereGeometry(1.3, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xFDE047 })
        );
        lantern.position.set(0, isl.h * 0.72 + 9.0, 0);
        g.add(lantern);
      }

      archGroup.add(g);
    });

    this.group.add(archGroup);
  }

  createKites() {
    const kitePositions = [
      { x: -78, y: 19, z: -50, color: 0xEF4444 },
      { x: -84, y: 22, z: -46, color: 0xFACC15 },
      { x: -74, y: 25, z: -56, color: 0x3B82F6 },
      { x: -90, y: 20, z: -54, color: 0x10B981 }
    ];

    kitePositions.forEach((kp, idx) => {
      const kiteGroup = new THREE.Group();
      kiteGroup.position.set(kp.x, kp.y, kp.z);

      const kiteGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0.9, 0,
        -0.7, 0, 0,
        0.7, 0, 0,
        0, -1.1, 0
      ]);
      const indices = [0, 1, 2, 1, 3, 2];
      kiteGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      kiteGeo.setIndex(indices);
      kiteGeo.computeVertexNormals();

      const kiteMat = new THREE.MeshBasicMaterial({ color: kp.color, side: THREE.DoubleSide });
      const kiteMesh = new THREE.Mesh(kiteGeo, kiteMat);
      kiteGroup.add(kiteMesh);

      // Tail with bows
      const tailGroup = new THREE.Group();
      tailGroup.position.set(0, -1.1, 0);
      for (let b = 1; b <= 4; b++) {
        const bow = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 0.08, 0.02),
          new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
        );
        bow.position.set(Math.sin(b * 0.9) * 0.15, -b * 0.45, 0);
        tailGroup.add(bow);
      }
      kiteGroup.add(tailGroup);

      this.group.add(kiteGroup);
      this.kites.push({
        group: kiteGroup,
        basePos: { ...kp },
        phase: idx * 1.3,
        tail: tailGroup
      });
    });
  }

  createSeabirds() {
    // 12 gaivotas e fragatas sobrevoando toda a extensão da baía e do mar expandido (Oeste, Centro, Leste e Alto-Mar)
    this.birds = [];
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });

    const leftWingGeo = new THREE.BufferGeometry();
    leftWingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0,
      -1.3, 0.25, -0.3,
      0, 0, -0.5
    ]), 3));

    const rightWingGeo = new THREE.BufferGeometry();
    rightWingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0,
      1.3, 0.25, -0.3,
      0, 0, -0.5
    ]), 3));

    const patrolCenters = [
      { x: -225, z: 125 }, { x: -165, z: 145 }, { x: -110, z: 115 },
      { x: -65,  z: 165 }, { x: -15,  z: 120 }, { x: 25,   z: 175 },
      { x: 65,   z: 130 }, { x: 115,  z: 155 }, { x: 165,  z: 125 },
      { x: 205,  z: 170 }, { x: 235,  z: 135 }, { x: -185, z: 185 }
    ];

    for (let i = 0; i < patrolCenters.length; i++) {
      const birdGroup = new THREE.Group();
      const leftWing = new THREE.Mesh(leftWingGeo, wingMat);
      birdGroup.add(leftWing);
      const rightWing = new THREE.Mesh(rightWingGeo, wingMat);
      birdGroup.add(rightWing);

      const pc = patrolCenters[i];
      birdGroup.position.set(pc.x, 16 + (i % 3) * 3, pc.z);
      this.group.add(birdGroup);

      this.birds.push({
        group: birdGroup,
        radius: 28 + (i % 5) * 9,
        center: pc,
        speed: 0.32 + (i % 4) * 0.06,
        angle: (i / patrolCenters.length) * Math.PI * 2,
        swoopTimer: Math.random() * 8.0,
        isSwooping: false,
        baseY: 15 + (i % 3) * 3,
        leftWing,
        rightWing
      });
    }
  }

  // Set time of day manually or query current phase
  // Set time of day manually or query current phase
  getTimeOfDay() {
    return {
      phase: this.currentPhase,
      progress: this.getCycleProgress(),
      toString() { return this.phase; }
    };
  }

  getCycleProgress() {
    return (this.cycleTime % this.cycleDuration) / this.cycleDuration;
  }

  onPhaseChange(callback) {
    this.phaseListeners.push(callback);
  }

  notifyPhaseChange(phase) {
    const data = { phase: phase, progress: this.getCycleProgress() };
    this.phaseListeners.forEach(cb => cb(data));
  }

  setTimeOfDay(phaseKey) {
    if (phaseKey === 'day') this.cycleTime = 25.0;
    else if (phaseKey === 'sunset') this.cycleTime = 105.0;
    else if (phaseKey === 'night') this.cycleTime = 150.0;
    else if (phaseKey === 'dawn') this.cycleTime = 205.0;
    this.currentPhase = phaseKey;
    this.applyLighting(0, true);
    this.notifyPhaseChange(phaseKey);
  }

  toggleTimeOfDay() {
    const sequence = ['day', 'sunset', 'night'];
    const nextIdx = (sequence.indexOf(this.currentPhase) + 1) % sequence.length;
    this.setTimeOfDay(sequence[nextIdx]);
    return sequence[nextIdx];
  }

  applyLighting(delta, instant = false) {
    const progress = (this.cycleTime % this.cycleDuration) / this.cycleDuration;
    let targetPhase = 'day';

    // 0.00 .. 0.42: Day Tropical (Crisp summer azure)
    // 0.42 .. 0.58: Entardecer / Sunset (Amber, violet, golden horizon)
    // 0.58 .. 0.88: Noite Carioca Iluminada (Luminous deep blue, NEVER pitch black!)
    // 0.88 .. 1.00: Alvorecer / Dawn (Soft rose and azure morning glow)
    if (progress < 0.42) {
      targetPhase = 'day';
    } else if (progress < 0.58) {
      targetPhase = 'sunset';
    } else if (progress < 0.88) {
      targetPhase = 'night';
    } else {
      targetPhase = 'dawn';
    }

    if (targetPhase !== this.currentPhase) {
      this.currentPhase = targetPhase;
      this.notifyPhaseChange(this.currentPhase);
    }

    if (this.iblMaps && this.iblPhase !== targetPhase) {
      this.iblPhase = targetPhase;
      this.scene.environment = this.iblMaps[targetPhase];
    }

    // Smoothly calculate celestial arc:
    // Sun rises in East (+X), peaks at noon, sets in West (-X)
    const sunAngle = progress * Math.PI * 2;
    const sunX = Math.cos(sunAngle) * 110;
    const sunY = Math.sin(sunAngle) * 95;
    const sunZ = Math.sin(sunAngle * 0.5) * 45 + 20;

    const isDaylight = (sunY > -10);
    this.sunMesh.visible = isDaylight;
    this.moonMesh.visible = !isDaylight || (progress > 0.45 && progress < 0.95);

    if (isDaylight) {
      this.dirLight.position.set(sunX, Math.max(12, sunY), sunZ);
      this.sunMesh.position.copy(this.dirLight.position).multiplyScalar(4.8);
    } else {
      // Moon lighting position
      const moonX = -sunX;
      const moonY = Math.max(25, -sunY);
      const moonZ = -sunZ;
      this.dirLight.position.set(moonX, moonY, moonZ);
      this.moonMesh.position.set(moonX * 4.5, moonY * 4.5, moonZ * 4.5);
    }

    // Color Palettes & Atmosphere Blend:
    // IMPORTANT: Night is calibrated with high ambient luminosity so the game is NEVER too dark!
    const lerpColor = (c1, c2, t) => new THREE.Color(c1).lerp(new THREE.Color(c2), t);
    const rate = instant ? 1.0 : 0.08;

    if (targetPhase === 'day') {
      this.scene.background.lerp(new THREE.Color('#58B4E3'), rate);
      this.scene.fog.color.lerp(new THREE.Color('#86CBE9'), rate);
      this.hemiLight.color.lerp(new THREE.Color(0xE1F5FE), rate);
      this.hemiLight.groundColor.lerp(new THREE.Color(0x367A45), rate);
      this.hemiLight.intensity = 0.85;
      this.dirLight.color.lerp(new THREE.Color(0xFFF6DF), rate);
      this.dirLight.intensity = 2.45;
      if (this.iblMaps) this.scene.environmentIntensity = 0.78;
      if (this.starMat) this.starMat.opacity = instant ? 0.0 : Math.max(0, this.starMat.opacity - 0.08);
      if (this.waterMat) this.waterMat.color.lerp(new THREE.Color(0x06649B), rate);
      if (this.bayWaterMat) this.bayWaterMat.color.lerp(new THREE.Color(0x0B86C4), rate);
    } else if (targetPhase === 'sunset') {
      const sunsetT = (progress - 0.42) / 0.16;
      const skyCol = lerpColor('#F57C36', '#723EC2', sunsetT);
      this.scene.background.lerp(skyCol, rate);
      this.scene.fog.color.lerp(new THREE.Color('#F59656'), rate);
      this.hemiLight.color.lerp(new THREE.Color(0xFED7AA), rate);
      this.hemiLight.groundColor.lerp(new THREE.Color(0x6D3518), rate);
      this.hemiLight.intensity = 0.82;
      this.dirLight.color.lerp(new THREE.Color(0xF5A336), rate);
      this.dirLight.intensity = 2.15;
      if (this.iblMaps) this.scene.environmentIntensity = 0.74;
      if (this.starMat) this.starMat.opacity = instant ? (sunsetT * 0.4) : Math.min(0.4, sunsetT * 0.4);
      if (this.waterMat) this.waterMat.color.lerp(new THREE.Color(0x075985), rate);
      if (this.bayWaterMat) this.bayWaterMat.color.lerp(new THREE.Color(0x0284C7), rate);
    } else if (targetPhase === 'night') {
      // LUMINOUS NIGHT: Deep cobalt blue sky, sparkling stars, bright moon bounce, zero murky darkness!
      this.scene.background.lerp(new THREE.Color('#111D33'), rate);
      this.scene.fog.color.lerp(new THREE.Color('#1A2C4A'), rate);
      this.hemiLight.color.lerp(new THREE.Color(0x6080A8), rate);
      this.hemiLight.groundColor.lerp(new THREE.Color(0x1F3A2E), rate);
      this.hemiLight.intensity = 0.65; // Balanced with PMREM night IBL
      this.dirLight.color.lerp(new THREE.Color(0xD4E6F8), rate);
      this.dirLight.intensity = 0.72; // Soft directional moon rim, prevents specular blowout on water
      if (this.iblMaps) this.scene.environmentIntensity = 0.50;
      if (this.starMat) this.starMat.opacity = instant ? 0.85 : Math.min(0.85, this.starMat.opacity + 0.08);
      if (this.waterMat) this.waterMat.color.lerp(new THREE.Color(0x0A3654), rate);
      if (this.bayWaterMat) this.bayWaterMat.color.lerp(new THREE.Color(0x0369A1), rate);
    } else if (targetPhase === 'dawn') {
      const dawnT = (progress - 0.88) / 0.12;
      const dawnCol = lerpColor('#E95272', '#4EAEE6', dawnT);
      this.scene.background.lerp(dawnCol, rate);
      this.scene.fog.color.lerp(new THREE.Color('#F9A8A8'), rate);
      this.hemiLight.color.lerp(new THREE.Color(0xBAE6FD), rate);
      this.hemiLight.groundColor.lerp(new THREE.Color(0x1E623C), rate);
      this.hemiLight.intensity = 0.84;
      this.dirLight.color.lerp(new THREE.Color(0xFDE06B), rate);
      this.dirLight.intensity = 1.95;
      if (this.iblMaps) this.scene.environmentIntensity = 0.72;
      if (this.starMat) this.starMat.opacity = instant ? 0.0 : Math.max(0, this.starMat.opacity - 0.06);
      if (this.waterMat) this.waterMat.color.lerp(new THREE.Color(0x0284C7), rate);
      if (this.bayWaterMat) this.bayWaterMat.color.lerp(new THREE.Color(0x0EA5E9), rate);
    }
  }

  update(delta) {
    this.time += delta;

    // Advance continuous automatic day/night cycle
    if (this.isAutoCycle) {
      this.cycleTime += delta;
      this.applyLighting(delta);
    }

    // As ondas costeiras, alto-mar e rebentação da praia agora executam 100% na GPU via uTime!

    // Kites dance
    this.kites.forEach(k => {
      const sway = Math.sin(this.time * 2.2 + k.phase) * 0.15;
      const bob = Math.cos(this.time * 1.8 + k.phase) * 0.35;
      k.group.position.y = k.basePos.y + bob;
      k.group.rotation.z = sway;
      if (k.tail) k.tail.rotation.z = Math.sin(this.time * 3 + k.phase) * 0.25;
    });

    // Dynamic Seabirds / Gaivotas
    this.birds.forEach(b => {
      b.angle += b.speed * delta;

      // If fishing boat is active at sea, gaivotas flock towards the boat!
      let targetCenter = b.center;
      if (this.fishingBoatTarget) {
        targetCenter = this.fishingBoatTarget;
      }

      b.group.position.x += ((targetCenter.x + Math.cos(b.angle) * b.radius) - b.group.position.x) * delta * 0.8;
      b.group.position.z += ((targetCenter.z + Math.sin(b.angle) * b.radius) - b.group.position.z) * delta * 0.8;
      b.group.rotation.y = -b.angle - Math.PI / 2;

      // Periodic swooping down to water surface to catch fish
      b.swoopTimer -= delta;
      if (b.swoopTimer <= 0) {
        b.isSwooping = true;
        if (b.swoopTimer < -2.5) {
          b.isSwooping = false;
          b.swoopTimer = 6.0 + Math.random() * 8.0;
        }
      }

      const targetY = b.isSwooping ? Math.max(1.5, b.baseY - 11.5) : b.baseY;
      b.group.position.y += (targetY - b.group.position.y) * delta * 1.8;

      const flap = Math.sin(this.time * 7) * 0.28;
      b.leftWing.rotation.z = flap;
      b.rightWing.rotation.z = -flap;
    });
  }
}
