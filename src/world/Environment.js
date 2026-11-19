import * as THREE from 'three';
import { SHARED_SHADER_UNIFORMS, createStylizedMaterial } from '../render/StylizedMaterials.js';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.time = 0;
    this.kites = [];
    this.birds = [];
    this.clouds = [];
    this.smokePuffs = [];
    this.fishingBoatTarget = null; // Can be set by fishing boats to attract gaivotas!
    this.iblMaps = null;
    this.iblPhase = null;
    this._tmpCol1 = new THREE.Color();
    this._tmpCol2 = new THREE.Color();
    this._dummy = new THREE.Object3D();

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
    this.createSkyDome();
    this.createStylizedClouds();
    this.createStylizedTropicalOcean();
    this.createDynamicShorelineSurf();
    this.createHorizonArchipelago();
    this.createStarsAndMoon();
    this.createKites();
    this.createSeabirds();
    this.createAtmosphereLife();
  }

  setupLightingAndSky() {
    // Crisp summer Rio azure sky initially
    this.scene.background = new THREE.Color('#58B4E3');
    this.scene.fog = new THREE.Fog('#9FD8EE', 210, 1280);

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
   * Domo celeste procedural com gradiente de perspectiva aérea (horizonte -> zênite)
   * e halo solar/crepuscular suave sincronizado com a névoa.
   */
  createSkyDome() {
    const skyGeo = new THREE.SphereGeometry(1480, 28, 16);
    this.skyUniforms = {
      uTopColor: { value: new THREE.Color('#3B97D8') },
      uMidColor: { value: new THREE.Color('#6BC0EB') },
      uHorizonColor: { value: new THREE.Color('#BFE7F7') },
      uSunDir: { value: new THREE.Vector3(-0.5, 0.78, 0.36).normalize() },
      uSunGlowColor: { value: new THREE.Color('#FFF3C4') },
      uSunGlowStrength: { value: 0.42 }
    };

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunGlowColor;
        uniform float uSunGlowStrength;
        varying vec3 vWorldDir;

        void main() {
          vec3 d = normalize(vWorldDir);
          float h = clamp(d.y, 0.0, 1.0);

          // Gradiente atmosférico de 3 faixas (horizonte úmido carioca -> céu médio -> zênite profundo)
          vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.24, h));
          col = mix(col, uTopColor, smoothstep(0.20, 0.78, h));

          // Halo quente solar/crepuscular próximo ao disco celeste
          float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
          float broadHalo = pow(sunDot, 5.0) * 0.45 * uSunGlowStrength;
          float tightHalo = pow(sunDot, 36.0) * 0.65 * uSunGlowStrength;
          float horizonBand = exp(-abs(d.y) * 9.0) * (0.28 + 0.45 * pow(sunDot, 2.0)) * uSunGlowStrength;

          col += uSunGlowColor * (broadHalo + tightHalo + horizonBand * 0.5);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });

    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.skyDome.renderOrder = -10;
    this.skyDome.frustumCulled = false;
    this.skyDome.matrixAutoUpdate = false;
    this.skyDome.updateMatrix();
    this.group.add(this.skyDome);
  }

  /**
   * Nuvens cúmulos estilizadas (estética maquete/Dorfromantik) em 1 único InstancedMesh.
   */
  createStylizedClouds() {
    const puffGeo = new THREE.IcosahedronGeometry(1.0, 1);
    const pos = puffGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      // Achata suavemente a base da nuvem para leitura clássica de cúmulos tropicais
      pos.setY(i, y < 0 ? y * 0.36 : y * 0.78);
    }
    puffGeo.computeVertexNormals();

    this.cloudMat = new THREE.MeshLambertMaterial({
      color: 0xFAF8F4,
      emissive: 0xDCEEF9,
      emissiveIntensity: 0.24,
      flatShading: true,
      transparent: true,
      opacity: 0.92,
      fog: true
    });

    const clusterDefs = [
      // Faixa panorâmica principal flutuando logo acima da Serra do Mar (enquadrada na câmera panorâmica!)
      { x: -320, y: 64,  z: -245, s: 1.45, spd: 1.55 },
      { x: -175, y: 72,  z: -275, s: 1.75, spd: 1.25 },
      { x: -40,  y: 66,  z: -235, s: 1.55, spd: 1.45 },
      { x: 95,   y: 74,  z: -285, s: 1.85, spd: 1.20 },
      { x: 235,  y: 64,  z: -245, s: 1.50, spd: 1.40 },
      { x: 375,  y: 70,  z: -265, s: 1.65, spd: 1.30 },
      // Segunda faixa mais próxima/alta para paralaxe suave ao orbitar
      { x: -390, y: 58,  z: -160, s: 1.20, spd: 1.85 },
      { x: -225, y: 62,  z: -155, s: 1.25, spd: 1.70 },
      { x: -85,  y: 60,  z: -185, s: 1.15, spd: 1.80 },
      { x: 65,   y: 59,  z: -175, s: 1.25, spd: 1.65 },
      { x: 215,  y: 63,  z: -160, s: 1.30, spd: 1.75 },
      { x: 365,  y: 58,  z: -165, s: 1.15, spd: 1.90 },
      // Nuvens ao fundo no horizonte profundo e laterais
      { x: -260, y: 76,  z: -360, s: 2.05, spd: 1.05 },
      { x: -10,  y: 84,  z: -385, s: 2.25, spd: 0.95 },
      { x: 255,  y: 78,  z: -355, s: 2.00, spd: 1.10 },
      { x: -290, y: 68,  z: 25,   s: 1.10, spd: 2.05 },
      { x: 300,  y: 66,  z: 35,   s: 1.15, spd: 2.10 },
      { x: -140, y: 92,  z: -120, s: 1.05, spd: 1.95 },
      { x: 150,  y: 94,  z: -115, s: 1.10, spd: 2.00 }
    ];

    const puffLayouts = [
      [
        { dx: 0, dy: 0.6, dz: 0, sx: 11.5, sy: 6.2, sz: 7.5 },
        { dx: -9.5, dy: -0.6, dz: 1.0, sx: 8.2, sy: 4.5, sz: 6.0 },
        { dx: 9.8, dy: -0.5, dz: -0.8, sx: 8.8, sy: 4.8, sz: 6.4 },
        { dx: 2.5, dy: 2.2, dz: -1.6, sx: 7.4, sy: 4.6, sz: 5.5 },
        { dx: -4.2, dy: -0.9, dz: -2.4, sx: 6.8, sy: 3.6, sz: 5.2 }
      ],
      [
        { dx: 0, dy: 0.4, dz: 0, sx: 10.2, sy: 5.2, sz: 6.8 },
        { dx: -8.0, dy: -0.5, dz: 0.6, sx: 7.2, sy: 3.9, sz: 5.4 },
        { dx: 8.5, dy: -0.4, dz: 1.1, sx: 7.8, sy: 4.1, sz: 5.6 },
        { dx: -2.0, dy: 1.9, dz: -1.0, sx: 6.5, sy: 4.0, sz: 5.0 }
      ]
    ];

    this.clouds = [];
    let totalPuffs = 0;
    clusterDefs.forEach((c, idx) => {
      const layout = puffLayouts[idx % puffLayouts.length];
      totalPuffs += layout.length;
      this.clouds.push({
        ...c,
        baseY: c.y,
        phase: idx * 1.17,
        puffs: layout
      });
    });

    this.cloudMesh = new THREE.InstancedMesh(puffGeo, this.cloudMat, totalPuffs);
    this.cloudMesh.castShadow = false;
    this.cloudMesh.receiveShadow = false;
    this.cloudMesh.frustumCulled = false;

    const shade = new THREE.Color();
    let pIdx = 0;
    this.clouds.forEach((cl) => {
      cl.puffs.forEach((pf, j) => {
        // Sutil variação de brilho entre topo e base de cada cúmulo
        const v = j === 0 || pf.dy > 1.0 ? 1.0 : 0.91;
        shade.setRGB(v, v, Math.min(1.0, v + 0.03));
        this.cloudMesh.setColorAt(pIdx++, shade);
      });
    });
    if (this.cloudMesh.instanceColor) this.cloudMesh.instanceColor.needsUpdate = true;

    this._updateCloudMatrices();
    this.group.add(this.cloudMesh);
  }

  _updateCloudMatrices() {
    if (!this.cloudMesh) return;
    const d = this._dummy;
    let idx = 0;
    for (let i = 0; i < this.clouds.length; i++) {
      const cl = this.clouds[i];
      const bobY = Math.sin(this.time * 0.28 + cl.phase) * 1.1;
      for (let j = 0; j < cl.puffs.length; j++) {
        const pf = cl.puffs[j];
        d.position.set(
          cl.x + pf.dx * cl.s,
          cl.baseY + bobY + pf.dy * cl.s,
          cl.z + pf.dz * cl.s
        );
        d.rotation.set(0, (i * 0.5 + j * 0.9) % 6.28, 0);
        d.scale.set(pf.sx * cl.s, pf.sy * cl.s, pf.sz * cl.s);
        d.updateMatrix();
        this.cloudMesh.setMatrixAt(idx++, d.matrix);
      }
    }
    this.cloudMesh.instanceMatrix.needsUpdate = true;
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
    // Gaivotas e aves costeiras sobrevoando a baía, a praia e o alto do Morro do Sol
    this.birds = [];
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xF8FAFC, side: THREE.DoubleSide });
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xE2E8F0 });

    const leftWingGeo = new THREE.BufferGeometry();
    leftWingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0.25,
      -0.75, 0.14, 0.05,
      -1.45, 0.22, -0.35,
      0, 0, 0.25,
      -1.45, 0.22, -0.35,
      0, 0, -0.42
    ]), 3));

    const rightWingGeo = new THREE.BufferGeometry();
    rightWingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0.25,
      0.75, 0.14, 0.05,
      1.45, 0.22, -0.35,
      0, 0, 0.25,
      1.45, 0.22, -0.35,
      0, 0, -0.42
    ]), 3));

    const bodyGeo = new THREE.ConeGeometry(0.14, 0.95, 4);
    bodyGeo.rotateX(Math.PI / 2);

    const patrolCenters = [
      // Bando sobre a orla e o Morro do Sol (visível na câmera panorâmica!)
      { x: -10,  z: 18,  y: 34, r: 34, hill: true },
      { x: 18,   z: 10,  y: 38, r: 30, hill: true },
      { x: -45,  z: 28,  y: 30, r: 36, hill: true },
      { x: 52,   z: 24,  y: 32, r: 34, hill: true },
      { x: 4,    z: -24, y: 44, r: 42, hill: true },
      { x: -34,  z: -16, y: 40, r: 32, hill: true },
      { x: 38,   z: -18, y: 42, r: 36, hill: true },
      { x: -72,  z: 56,  y: 22, r: 28, hill: false },
      { x: 12,   z: 66,  y: 20, r: 32, hill: false },
      { x: 84,   z: 60,  y: 23, r: 30, hill: false },
      // Alto-mar e baía
      { x: -200, z: 125, y: 17, r: 36, hill: false },
      { x: -120, z: 115, y: 16, r: 32, hill: false },
      { x: -40,  z: 135, y: 19, r: 38, hill: false },
      { x: 45,   z: 130, y: 18, r: 35, hill: false },
      { x: 135,  z: 140, y: 20, r: 40, hill: false },
      { x: 215,  z: 135, y: 18, r: 36, hill: false }
    ];

    for (let i = 0; i < patrolCenters.length; i++) {
      const birdGroup = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      birdGroup.add(body);
      const leftWing = new THREE.Mesh(leftWingGeo, wingMat);
      birdGroup.add(leftWing);
      const rightWing = new THREE.Mesh(rightWingGeo, wingMat);
      birdGroup.add(rightWing);

      const pc = patrolCenters[i];
      const sc = pc.hill ? (0.85 + (i % 3) * 0.14) : (0.95 + (i % 3) * 0.15);
      birdGroup.scale.setScalar(sc);
      birdGroup.position.set(pc.x, pc.y, pc.z);
      this.group.add(birdGroup);

      this.birds.push({
        group: birdGroup,
        radius: pc.r,
        center: pc,
        isHillFlock: pc.hill,
        speed: (pc.hill ? 0.24 : 0.30) + (i % 4) * 0.045,
        angle: (i / patrolCenters.length) * Math.PI * 2,
        phase: i * 1.7,
        swoopTimer: 3.0 + Math.random() * 8.0,
        isSwooping: false,
        baseY: pc.y,
        leftWing,
        rightWing
      });
    }
  }

  /**
   * Vida atmosférica sutil: plumas de fumaça estilizadas (Olaria + Terreiro de Samba)
   * e partículas flutuantes (brisa dourada de dia / vaga-lumes quentes à noite).
   */
  createAtmosphereLife() {
    // 1. Plumas de fumaça estilizada em 1 único InstancedMesh (Lambert leve = compilação instantânea)
    const smokeGeo = new THREE.IcosahedronGeometry(0.55, 1);
    this.smokeMat = new THREE.MeshLambertMaterial({
      color: 0xECEAE4,
      emissive: 0xD8D4CC,
      emissiveIntensity: 0.12,
      flatShading: true,
      transparent: true,
      opacity: 0.36,
      depthWrite: false
    });

    this.smokeEmitters = [
      // Chaminé exata do Forno da Olaria Central (pos -22,-14 + offset chaminé -3.5, +6.55)
      { x: -25.5, y: 13.5, z: -14.0, yOffset: 6.65, refX: -22.0, refZ: -14.0, rise: 8.5, spread: 1.6, speed: 0.24, count: 9, nightOnly: false, baseScale: 0.72 },
      // Fogueira central do Terreiro de Samba (-2, -4)
      { x: -2.0,  y: 16.5, z: -4.0,  yOffset: 1.60, refX: -2.0,  refZ: -4.0,  rise: 7.2, spread: 1.4, speed: 0.28, count: 8, nightOnly: true,  baseScale: 0.60 },
      // Chaminé principal da Grande Olaria Leste (95, -18 -> forno 0 em -2.8, -2.5)
      { x: 92.2,  y: 10.0, z: -20.5, yOffset: 4.65, refX: 95.0,  refZ: -18.0, rise: 7.8, spread: 1.5, speed: 0.22, count: 7, nightOnly: false, baseScale: 0.64 }
    ];

    this.smokePuffs = [];
    this.smokeEmitters.forEach((em, eIdx) => {
      for (let i = 0; i < em.count; i++) {
        this.smokePuffs.push({
          emitter: em,
          life: i / em.count,
          seed: eIdx * 17 + i * 3.13
        });
      }
    });

    this.smokeMesh = new THREE.InstancedMesh(smokeGeo, this.smokeMat, this.smokePuffs.length);
    this.smokeMesh.castShadow = false;
    this.smokeMesh.receiveShadow = false;
    this.smokeMesh.frustumCulled = false;
    this.group.add(this.smokeMesh);

    // 2. Partículas atmosféricas sobre o morro (pólen/brisa solar de dia -> vaga-lumes à noite)
    const moteCount = 150;
    const motePos = new Float32Array(moteCount * 3);
    this.moteSeeds = new Float32Array(moteCount * 4); // x0, y0, z0, phase

    for (let i = 0; i < moteCount; i++) {
      const s1 = Math.sin(i * 12.9898 + 4.14) * 43758.5453;
      const s2 = Math.sin(i * 78.233 + 1.73) * 43758.5453;
      const s3 = Math.sin(i * 39.425 + 9.21) * 43758.5453;
      const r1 = s1 - Math.floor(s1);
      const r2 = s2 - Math.floor(s2);
      const r3 = s3 - Math.floor(s3);

      const x = (r1 - 0.5) * 230.0;
      const z = -95.0 + r2 * 120.0;
      // Altura aproximada acima da silhueta da colina (mais alto quanto mais ao norte)
      const hillApprox = Math.max(0, (18.0 - z) * 0.20);
      const y = 3.5 + hillApprox + r3 * 16.0;

      motePos[i * 3] = x;
      motePos[i * 3 + 1] = y;
      motePos[i * 3 + 2] = z;

      this.moteSeeds[i * 4] = x;
      this.moteSeeds[i * 4 + 1] = y;
      this.moteSeeds[i * 4 + 2] = z;
      this.moteSeeds[i * 4 + 3] = r3 * Math.PI * 2;
    }

    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    this.atmoMat = new THREE.PointsMaterial({
      color: 0xFFF3C4,
      size: 0.72,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.atmoParticles = new THREE.Points(moteGeo, this.atmoMat);
    this.atmoParticles.frustumCulled = false;
    this.group.add(this.atmoParticles);
  }

  /**
   * Ajusta a cota Y exata dos emissores de fumaça (chaminés das olarias e fogueira do samba)
   * usando a elevação real da malha do terreno.
   */
  setTerrain(terrain) {
    if (!terrain || !this.smokeEmitters) return;
    this.smokeEmitters.forEach((em) => {
      const groundY = terrain.getElevation(em.refX ?? em.x, em.refZ ?? em.z);
      em.y = groundY + (em.yOffset || 0);
    });
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
    const c1 = this._tmpCol1;
    const c2 = this._tmpCol2;
    const lerpTo = (target, hex, r) => target.lerp(c1.set(hex), r);
    const lerpBlend = (target, hexA, hexB, t, r) => {
      c1.set(hexA).lerp(c2.set(hexB), t);
      target.lerp(c1, r);
    };
    const rate = instant ? 1.0 : 0.08;

    if (this.skyUniforms) {
      this.skyUniforms.uSunDir.value.copy(this.dirLight.position).normalize();
    }

    if (targetPhase === 'day') {
      lerpTo(this.scene.background, '#58B4E3', rate);
      lerpTo(this.scene.fog.color, '#A8DBF0', rate);
      lerpTo(this.hemiLight.color, 0xE1F5FE, rate);
      lerpTo(this.hemiLight.groundColor, 0x367A45, rate);
      this.hemiLight.intensity = 0.85;
      lerpTo(this.dirLight.color, 0xFFF6DF, rate);
      this.dirLight.intensity = 2.45;
      if (this.iblMaps) this.scene.environmentIntensity = 0.78;
      if (this.starMat) this.starMat.opacity = instant ? 0.0 : Math.max(0, this.starMat.opacity - 0.08);
      if (this.waterMat) lerpTo(this.waterMat.color, 0x06649B, rate);
      if (this.bayWaterMat) lerpTo(this.bayWaterMat.color, 0x0B86C4, rate);
      if (this.skyUniforms) {
        lerpTo(this.skyUniforms.uTopColor.value, '#3693D6', rate);
        lerpTo(this.skyUniforms.uMidColor.value, '#68BEEB', rate);
        lerpTo(this.skyUniforms.uHorizonColor.value, '#BCE5F6', rate);
        lerpTo(this.skyUniforms.uSunGlowColor.value, '#FFF4C8', rate);
        this.skyUniforms.uSunGlowStrength.value += (0.42 - this.skyUniforms.uSunGlowStrength.value) * rate;
      }
      if (this.cloudMat) {
        lerpTo(this.cloudMat.color, 0xFAF8F3, rate);
        lerpTo(this.cloudMat.emissive, 0xD6ECFA, rate);
        this.cloudMat.emissiveIntensity = 0.20;
        this.cloudMat.opacity = 0.92;
      }
      if (this.atmoMat) {
        lerpTo(this.atmoMat.color, 0xFFF5CC, rate);
        this.atmoMat.opacity += (0.22 - this.atmoMat.opacity) * rate;
        this.atmoMat.size = 0.65;
      }
    } else if (targetPhase === 'sunset') {
      const sunsetT = (progress - 0.42) / 0.16;
      lerpBlend(this.scene.background, '#F57C36', '#6A3BB8', sunsetT, rate);
      lerpBlend(this.scene.fog.color, '#F4A267', '#C87872', sunsetT, rate);
      lerpTo(this.hemiLight.color, 0xFED7AA, rate);
      lerpTo(this.hemiLight.groundColor, 0x6D3518, rate);
      this.hemiLight.intensity = 0.82;
      lerpTo(this.dirLight.color, 0xF5A336, rate);
      this.dirLight.intensity = 2.15;
      if (this.iblMaps) this.scene.environmentIntensity = 0.74;
      if (this.starMat) this.starMat.opacity = instant ? (sunsetT * 0.4) : Math.min(0.4, sunsetT * 0.4);
      if (this.waterMat) lerpTo(this.waterMat.color, 0x075985, rate);
      if (this.bayWaterMat) lerpTo(this.bayWaterMat.color, 0x0284C7, rate);
      if (this.skyUniforms) {
        lerpBlend(this.skyUniforms.uTopColor.value, '#5056A8', '#28235C', sunsetT, rate);
        lerpBlend(this.skyUniforms.uMidColor.value, '#E07A5F', '#8E4985', sunsetT, rate);
        lerpBlend(this.skyUniforms.uHorizonColor.value, '#FBBF77', '#E88B68', sunsetT, rate);
        lerpTo(this.skyUniforms.uSunGlowColor.value, '#FFB85C', rate);
        this.skyUniforms.uSunGlowStrength.value += (0.72 - this.skyUniforms.uSunGlowStrength.value) * rate;
      }
      if (this.cloudMat) {
        lerpTo(this.cloudMat.color, 0xFBD2A8, rate);
        lerpTo(this.cloudMat.emissive, 0xD96B43, rate);
        this.cloudMat.emissiveIntensity = 0.24;
        this.cloudMat.opacity = 0.90;
      }
      if (this.atmoMat) {
        lerpTo(this.atmoMat.color, 0xFFD080, rate);
        this.atmoMat.opacity += (0.34 - this.atmoMat.opacity) * rate;
        this.atmoMat.size = 0.80;
      }
    } else if (targetPhase === 'night') {
      // LUMINOUS NIGHT: Deep cobalt blue sky, sparkling stars, bright moon bounce, zero murky darkness!
      lerpTo(this.scene.background, '#111D33', rate);
      lerpTo(this.scene.fog.color, '#1D3254', rate);
      lerpTo(this.hemiLight.color, 0x6080A8, rate);
      lerpTo(this.hemiLight.groundColor, 0x1F3A2E, rate);
      this.hemiLight.intensity = 0.65; // Balanced with PMREM night IBL
      lerpTo(this.dirLight.color, 0xD4E6F8, rate);
      this.dirLight.intensity = 0.72; // Soft directional moon rim, prevents specular blowout on water
      if (this.iblMaps) this.scene.environmentIntensity = 0.50;
      if (this.starMat) this.starMat.opacity = instant ? 0.85 : Math.min(0.85, this.starMat.opacity + 0.08);
      if (this.waterMat) lerpTo(this.waterMat.color, 0x0A3654, rate);
      if (this.bayWaterMat) lerpTo(this.bayWaterMat.color, 0x0369A1, rate);
      if (this.skyUniforms) {
        lerpTo(this.skyUniforms.uTopColor.value, '#0B162B', rate);
        lerpTo(this.skyUniforms.uMidColor.value, '#142646', rate);
        lerpTo(this.skyUniforms.uHorizonColor.value, '#223B63', rate);
        lerpTo(this.skyUniforms.uSunGlowColor.value, '#7CA6D8', rate);
        this.skyUniforms.uSunGlowStrength.value += (0.28 - this.skyUniforms.uSunGlowStrength.value) * rate;
      }
      if (this.cloudMat) {
        lerpTo(this.cloudMat.color, 0x3D5578, rate);
        lerpTo(this.cloudMat.emissive, 0x1D2E49, rate);
        this.cloudMat.emissiveIntensity = 0.16;
        this.cloudMat.opacity = 0.52;
      }
      if (this.atmoMat) {
        lerpTo(this.atmoMat.color, 0xFFE882, rate);
        this.atmoMat.opacity += (0.76 - this.atmoMat.opacity) * rate;
        this.atmoMat.size = 1.05;
      }
    } else if (targetPhase === 'dawn') {
      const dawnT = (progress - 0.88) / 0.12;
      lerpBlend(this.scene.background, '#E95272', '#4EAEE6', dawnT, rate);
      lerpBlend(this.scene.fog.color, '#F4A9A8', '#B8E0F2', dawnT, rate);
      lerpTo(this.hemiLight.color, 0xBAE6FD, rate);
      lerpTo(this.hemiLight.groundColor, 0x1E623C, rate);
      this.hemiLight.intensity = 0.84;
      lerpTo(this.dirLight.color, 0xFDE06B, rate);
      this.dirLight.intensity = 1.95;
      if (this.iblMaps) this.scene.environmentIntensity = 0.72;
      if (this.starMat) this.starMat.opacity = instant ? 0.0 : Math.max(0, this.starMat.opacity - 0.06);
      if (this.waterMat) lerpTo(this.waterMat.color, 0x0284C7, rate);
      if (this.bayWaterMat) lerpTo(this.bayWaterMat.color, 0x0EA5E9, rate);
      if (this.skyUniforms) {
        lerpBlend(this.skyUniforms.uTopColor.value, '#4C5DA6', '#3B97D8', dawnT, rate);
        lerpBlend(this.skyUniforms.uMidColor.value, '#E07C95', '#76C4EB', dawnT, rate);
        lerpBlend(this.skyUniforms.uHorizonColor.value, '#FCD2B5', '#C2E8F8', dawnT, rate);
        lerpTo(this.skyUniforms.uSunGlowColor.value, '#FDE68A', rate);
        this.skyUniforms.uSunGlowStrength.value += (0.60 - this.skyUniforms.uSunGlowStrength.value) * rate;
      }
      if (this.cloudMat) {
        lerpTo(this.cloudMat.color, 0xFDE0D4, rate);
        lerpTo(this.cloudMat.emissive, 0xE59AA8, rate);
        this.cloudMat.emissiveIntensity = 0.22;
        this.cloudMat.opacity = 0.88;
      }
      if (this.atmoMat) {
        lerpTo(this.atmoMat.color, 0xFDE68A, rate);
        this.atmoMat.opacity += (0.28 - this.atmoMat.opacity) * rate;
        this.atmoMat.size = 0.72;
      }
    }
  }

  update(delta) {
    this.time += delta;

    // Advance continuous automatic day/night cycle
    if (this.isAutoCycle) {
      this.cycleTime += delta;
      this.applyLighting(delta);
    }

    // Deriva suave das nuvens estilizadas
    if (this.clouds.length > 0) {
      for (let i = 0; i < this.clouds.length; i++) {
        const cl = this.clouds[i];
        cl.x += cl.spd * delta;
        if (cl.x > 470) cl.x = -470;
      }
      this._updateCloudMatrices();
    }

    // Plumas de fumaça estilizadas (Olaria + Terreiro de Samba à noite)
    if (this.smokeMesh && this.smokePuffs.length > 0) {
      const d = this._dummy;
      const isWarmNight = this.currentPhase === 'night' || this.currentPhase === 'sunset';
      for (let i = 0; i < this.smokePuffs.length; i++) {
        const p = this.smokePuffs[i];
        const em = p.emitter;
        p.life = (p.life + delta * em.speed) % 1.0;

        if (em.nightOnly && !isWarmNight) {
          d.position.set(0, -500, 0);
          d.scale.setScalar(0.001);
          d.updateMatrix();
          this.smokeMesh.setMatrixAt(i, d.matrix);
          continue;
        }

        const t = p.life;
        // Sobe com deriva lateral da brisa marítima (+X suave, -Z encosta acima)
        const px = em.x + Math.sin(this.time * 1.1 + p.seed) * em.spread * t + t * 2.1;
        const py = em.y + t * em.rise;
        const pz = em.z + Math.cos(this.time * 0.9 + p.seed) * (em.spread * 0.6) * t - t * 1.1;

        // Cresce ao sair da chaminé e dissipa suavemente no topo
        const envScale = Math.sin(t * Math.PI) * (0.55 + t * 1.15) * em.baseScale;
        d.position.set(px, py, pz);
        d.rotation.set(this.time * 0.35 + p.seed, this.time * 0.25 + p.seed, 0);
        d.scale.setScalar(Math.max(0.02, envScale));
        d.updateMatrix();
        this.smokeMesh.setMatrixAt(i, d.matrix);
      }
      this.smokeMesh.instanceMatrix.needsUpdate = true;
    }

    // Brisa dourada de dia / vaga-lumes dançantes à noite
    if (this.atmoParticles && this.moteSeeds) {
      const posAttr = this.atmoParticles.geometry.attributes.position;
      const arr = posAttr.array;
      const seeds = this.moteSeeds;
      const count = posAttr.count;
      const t = this.time;
      const isNight = this.currentPhase === 'night';
      for (let i = 0; i < count; i++) {
        const si = i * 4;
        const ph = seeds[si + 3];
        arr[i * 3]     = seeds[si]     + Math.sin(t * (isNight ? 0.75 : 0.45) + ph) * (isNight ? 2.4 : 4.2);
        arr[i * 3 + 1] = seeds[si + 1] + Math.cos(t * (isNight ? 1.15 : 0.65) + ph * 1.3) * (isNight ? 1.4 : 1.0);
        arr[i * 3 + 2] = seeds[si + 2] + Math.sin(t * 0.52 + ph * 0.7) * 2.1;
      }
      posAttr.needsUpdate = true;
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

    // Dynamic Seabirds / Gaivotas (alternando batidas de asa e voo planado orgânico!)
    this.birds.forEach(b => {
      b.angle += b.speed * delta;

      // If fishing boat is active at sea, sea gaivotas flock towards the boat!
      let targetCenter = b.center;
      if (!b.isHillFlock && this.fishingBoatTarget) {
        targetCenter = this.fishingBoatTarget;
      }

      b.group.position.x += ((targetCenter.x + Math.cos(b.angle) * b.radius) - b.group.position.x) * delta * 0.8;
      b.group.position.z += ((targetCenter.z + Math.sin(b.angle) * b.radius) - b.group.position.z) * delta * 0.8;
      b.group.rotation.y = -b.angle - Math.PI / 2;
      b.group.rotation.z = Math.sin(this.time * 0.9 + b.phase) * 0.14;

      // Periodic swooping down to water surface to catch fish (apenas gaivotas costeiras)
      let targetY = b.baseY + Math.sin(this.time * 0.6 + b.phase) * 1.8;
      if (!b.isHillFlock) {
        b.swoopTimer -= delta;
        if (b.swoopTimer <= 0) {
          b.isSwooping = true;
          if (b.swoopTimer < -2.5) {
            b.isSwooping = false;
            b.swoopTimer = 6.0 + Math.random() * 8.0;
          }
        }
        if (b.isSwooping) targetY = Math.max(2.2, b.baseY - 11.5);
      }

      b.group.position.y += (targetY - b.group.position.y) * delta * 1.6;

      // Ciclo natural: ~40% planando, ~60% batendo asas suavemente
      const glideCycle = Math.sin(this.time * 0.85 + b.phase);
      const flapAmp = glideCycle > -0.15 ? 0.34 : 0.05;
      const flap = Math.sin(this.time * 6.8 + b.phase) * flapAmp + (glideCycle <= -0.15 ? 0.12 : 0);
      b.leftWing.rotation.z = flap;
      b.rightWing.rotation.z = -flap;
    });
  }
}
