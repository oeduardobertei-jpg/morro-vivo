import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
    this.scene.fog = new THREE.Fog('#A8DBF0', 190, 1180);

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

    // Referência invisível preservada p/ compatibilidade (Sol e Lua HDR agora brilham direto no SkyDome)
    const sunGeo = new THREE.SphereGeometry(22, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFF9C4, fog: false });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.copy(this.dirLight.position).multiplyScalar(4.8);
    this.sunMesh.visible = false;
    this.group.add(this.sunMesh);
  }

  /**
   * Domo celeste procedural v2 com gradiente de 4 faixas, Sol e Lua HDR luminosos
   * e hemisfério inferior vedado na cor do mar distante (elimina 100% o limbo).
   */
  createSkyDome() {
    const skyGeo = new THREE.SphereGeometry(1950, 32, 20);
    this.skyUniforms = {
      uTopColor: { value: new THREE.Color('#2B82D4') },
      uMidColor: { value: new THREE.Color('#66B9EC') },
      uLowColor: { value: new THREE.Color('#A6DEF5') },
      uHorizonColor: { value: new THREE.Color('#D4EFFA') },
      uSeaHorizonColor: { value: new THREE.Color('#4A9BC2') },
      uSunDir: { value: new THREE.Vector3(-0.5, 0.78, 0.36).normalize() },
      uMoonDir: { value: new THREE.Vector3(0.5, 0.65, -0.35).normalize() },
      uSunGlowColor: { value: new THREE.Color('#FFF4C8') },
      uSunGlowStrength: { value: 0.42 },
      uSunDiscStrength: { value: 0.72 },
      uMoonStrength: { value: 0.0 }
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
        uniform vec3 uLowColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSeaHorizonColor;
        uniform vec3 uSunDir;
        uniform vec3 uMoonDir;
        uniform vec3 uSunGlowColor;
        uniform float uSunGlowStrength;
        uniform float uSunDiscStrength;
        uniform float uMoonStrength;
        varying vec3 vWorldDir;

        void main() {
          vec3 d = normalize(vWorldDir);
          float h = clamp(d.y, 0.0, 1.0);

          // Gradiente atmosférico de 4 faixas acima do horizonte
          vec3 skyCol = mix(uHorizonColor, uLowColor, smoothstep(0.0, 0.11, h));
          skyCol = mix(skyCol, uMidColor, smoothstep(0.08, 0.34, h));
          skyCol = mix(skyCol, uTopColor, smoothstep(0.26, 0.82, h));

          // Hemisfério inferior vedado na cor do mar distante (nunca exibe limbo escuro ou laranja cru)
          vec3 col = d.y >= 0.0
            ? skyCol
            : mix(uHorizonColor, uSeaHorizonColor, smoothstep(0.0, 0.14, -d.y));

          // Sol HDR procedural com espalhamento atmosférico e disco brilhante (AgX mantém ouro-creme natural)
          float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
          float broadHalo = pow(sunDot, 3.5) * 0.46;
          float tightHalo = pow(sunDot, 18.0) * 0.72;
          float corona = pow(sunDot, 110.0) * 1.25;
          float sunDisc = smoothstep(0.9978, 0.9989, sunDot) * 3.1;
          float horizonBand = exp(-abs(d.y) * 8.5) * (0.30 + 0.50 * pow(sunDot, 2.0));
          float aboveHorizon = smoothstep(-0.04, 0.025, d.y);

          col += uSunGlowColor * (broadHalo + tightHalo + horizonBand * 0.45) * uSunGlowStrength;
          col += vec3(1.0, 0.96, 0.86) * (corona + sunDisc) * uSunDiscStrength * aboveHorizon;

          // Lua HDR procedural com halo prateado suave
          float moonDot = max(dot(d, normalize(uMoonDir)), 0.0);
          float moonHalo = pow(moonDot, 16.0) * 0.22 + pow(moonDot, 140.0) * 0.55;
          float moonDisc = smoothstep(0.9990, 0.9995, moonDot) * 1.85;
          float moonAbove = smoothstep(-0.02, 0.04, d.y);
          col += vec3(0.84, 0.92, 1.0) * (moonHalo + moonDisc) * uMoonStrength * moonAbove;

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
      { x: 150,  y: 94,  z: -115, s: 1.10, spd: 2.00 },
      // Cúmulos no horizonte oceânico sul/sudoeste/sudeste (enquadrados no Pôr do Sol do Mirante!)
      { x: -440, y: 72,  z: 215,  s: 1.85, spd: 1.15 },
      { x: -280, y: 84,  z: 340,  s: 2.10, spd: 1.00 },
      { x: -115, y: 76,  z: 420,  s: 2.25, spd: 0.90 },
      { x: 55,   y: 88,  z: 465,  s: 2.35, spd: 0.85 },
      { x: 230,  y: 78,  z: 390,  s: 2.05, spd: 1.05 },
      { x: 410,  y: 70,  z: 255,  s: 1.80, spd: 1.20 },
      { x: -375, y: 108, z: 365,  s: 2.40, spd: 0.92 }
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
    // 1. Referência invisível mantida p/ compatibilidade (Lua HDR brilha no SkyDome)
    const moonGeo = new THREE.SphereGeometry(18, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xEEF6FF, fog: false });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.position.set(320, 480, -240);
    this.moonMesh.visible = false;
    this.group.add(this.moonMesh);

    // 2. Campo estelar com variação sutil de cor (sempre acima de 12° sobre o horizonte!)
    const starGeo = new THREE.BufferGeometry();
    const starCount = 240;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starPalette = [
      new THREE.Color(0xFFFFFF),
      new THREE.Color(0xFFF1CC),
      new THREE.Color(0xCFE6FF)
    ];

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.72 + 0.22);
      const radius = 1280 + Math.random() * 170;

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const c = starPalette[i % starPalette.length];
      starColors[i * 3] = c.r;
      starColors[i * 3 + 1] = c.g;
      starColors[i * 3 + 2] = c.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      vertexColors: true,
      size: 3.6,
      transparent: true,
      opacity: 0.0,
      fog: false
    });

    this.stars = new THREE.Points(starGeo, this.starMat);
    this.group.add(this.stars);
  }

  _applyOceanShader(mat, { isBay = false, noWaves = false } = {}) {
    mat.userData = mat.userData || {};
    mat.userData.isOceanShader = true;
    mat.customProgramCacheKey = () => (isBay ? 'morro_ocean_bay_v2' : (noWaves ? 'morro_ocean_horizon_v2' : 'morro_ocean_deep_v2'));

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = SHARED_SHADER_UNIFORMS.uTime;
      shader.uniforms.uNightFactor = SHARED_SHADER_UNIFORMS.uNightFactor;
      shader.uniforms.uSunsetFactor = SHARED_SHADER_UNIFORMS.uSunsetFactor;
      shader.uniforms.uSunDir = SHARED_SHADER_UNIFORMS.uSunDir;
      shader.uniforms.uHorizonColor = this.skyUniforms
        ? this.skyUniforms.uHorizonColor
        : SHARED_SHADER_UNIFORMS.uSkyHorizonColor;
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
  return max(-180.0, 74.0 + sin(wx * 0.015) * 3.5 - (hl * hl * 82.0));
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
${noWaves ? `float ocSD = 100.0;
objectNormal = vec3( 0.0, 1.0, 0.0 );` : `float ocSD = ocBaseW.z - ocShoreZ( ocBaseW.x );
float ocDamp = smoothstep( 0.0, 14.0, max( 0.0, ocSD ) );
vec2 ocGrad = ocWaveGrad( ocBaseW.xz, uTime ) * ocDamp;
objectNormal = normalize( vec3( -ocGrad.x, 1.0, -ocGrad.y ) );`}`
        );

      if (!noWaves) {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
transformed.y += ocWaveH( ocBaseW.xz, uTime ) * ocDamp;`
        );
      }

      shader.vertexShader = shader.vertexShader.replace(
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
uniform float uSunsetFactor;
uniform vec3 uSunDir;
uniform vec3 uHorizonColor;
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
` : ''}
// Reflexos de Fresnel dourado-violeta no pôr do sol & prata lunar à noite sobre o mar
float ocSurfRip = ocNoise2(vOcWorldPos.xz * 0.75 + vec2(uTime * 0.45, -uTime * 0.32));
vec3 ocViewDir = normalize(cameraPosition - vOcWorldPos);
float ocFres = pow(1.0 - max(ocViewDir.y, 0.0), 3.0);
vec2 ocSunXZ = normalize(vec2(uSunDir.x, uSunDir.z) + vec2(0.0001));
vec2 ocRayXZ = normalize(vOcWorldPos.xz - cameraPosition.xz + vec2(0.0001));
float ocSunAlign = max(dot(ocRayXZ, ocSunXZ), 0.0);
diffuseColor.rgb += mix(vec3(0.55, 0.34, 0.56), vec3(1.0, 0.64, 0.30), ocSunAlign) * uSunsetFactor * ocFres * 0.55;
diffuseColor.rgb += vec3(1.0, 0.80, 0.46) * pow(ocSunAlign, 10.0) * uSunsetFactor * 0.38;
diffuseColor.rgb += vec3(1.0, 0.90, 0.64) * pow(ocSunAlign, 36.0) * smoothstep(0.38, 0.82, ocSurfRip) * uSunsetFactor * 0.95;
diffuseColor.rgb += vec3(0.32, 0.48, 0.68) * uNightFactor * ocFres * 0.25;
${!isBay ? `
// Fusão atmosférica suave do mar distante no horizonte (zero corte duro com o céu)
float ocHorizBlend = smoothstep(380.0, 1220.0, length(vOcWorldPos.xz));
diffuseColor.rgb = mix(diffuseColor.rgb, uHorizonColor, ocHorizBlend * 0.85);
` : ''}`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
${!isBay ? `float ocHorizGlow = smoothstep(420.0, 1320.0, length(vOcWorldPos.xz));
totalEmissiveRadiance += uHorizonColor * ocHorizGlow * mix(0.24, 0.42, max(uSunsetFactor, uNightFactor * 0.75));` : ''}`
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
    // 1. Oceano Atlântico de Alto-Mar (Open Ocean) - estendido até o horizonte sem quinas retangulares!
    const waterGeo = new THREE.PlaneGeometry(6400, 4400, 112, 96);
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
    this.waterMesh.position.set(0, 0.02, 2325.0);
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);

    // 1B. Saia Oceânica Externa (em y = -0.38): veda o horizonte Oeste/Leste/Norte sem passar sob a baía rasa ou praia!
    const westSkirtGeo = new THREE.PlaneGeometry(1740, 2335, 1, 1);
    westSkirtGeo.rotateX(-Math.PI / 2);
    westSkirtGeo.translate(-1330, 0, -1032.5);
    const eastSkirtGeo = new THREE.PlaneGeometry(1740, 2335, 1, 1);
    eastSkirtGeo.rotateX(-Math.PI / 2);
    eastSkirtGeo.translate(1330, 0, -1032.5);
    const northSkirtGeo = new THREE.PlaneGeometry(920, 1720, 1, 1);
    northSkirtGeo.rotateX(-Math.PI / 2);
    northSkirtGeo.translate(0, 0, -1340);

    const horizonSeaGeo = mergeGeometries([westSkirtGeo, eastSkirtGeo, northSkirtGeo], false);
    westSkirtGeo.dispose();
    eastSkirtGeo.dispose();
    northSkirtGeo.dispose();

    this.horizonSeaMat = new THREE.MeshStandardMaterial({
      color: 0x06649B,
      roughness: 0.30,
      metalness: 0.06,
      flatShading: false,
      transparent: false
    });
    this._applyOceanShader(this.horizonSeaMat, { isBay: false, noWaves: true });

    const horizonSeaMesh = new THREE.Mesh(horizonSeaGeo, this.horizonSeaMat);
    horizonSeaMesh.position.set(0, -0.38, 0);
    horizonSeaMesh.receiveShadow = false;
    horizonSeaMesh.castShadow = false;
    horizonSeaMesh.matrixAutoUpdate = false;
    horizonSeaMesh.updateMatrix();
    this.group.add(horizonSeaMesh);

    // 2. Águas Costeiras Calmas da Enseada Carioca (Bay Water Mesh estendida por toda a largura continental)
    this.createCoastalBayWater();
  }

  createCoastalBayWater() {
    const xMin = -645.0;
    const xMax = 645.0;
    const xStep = 3.0;
    const numCols = Math.round((xMax - xMin) / xStep) + 1;
    const numRows = 18; // 18 anéis do raso (shoreZ) até z = 126.5m para ondulação e curvatura suaves
    const positions = [];
    const indices = [];

    for (let r = 0; r < numRows; r++) {
      const rowT = r / (numRows - 1);
      for (let c = 0; c < numCols; c++) {
        const x = xMin + c * xStep;
        const headlandCurve = Math.max(0.0, (Math.abs(x) - 310.0) / 130.0);
        const shoreZ = Math.max(-180.0, 74.0 + Math.sin(x * 0.015) * 3.5 - (headlandCurve * headlandCurve * 82.0));

        const z = (shoreZ - 0.35) + rowT * (126.5 - (shoreZ - 0.35));
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

  // Arquipélago Carioca + Anel Contínuo 360° da Serra do Mar + Luzes Distantes na Baía:
  createHorizonArchipelago() {
    const archGroup = new THREE.Group();

    const graniteMat = createStylizedMaterial({ color: 0x56616B }, 'stone');
    const lushIslandMat = createStylizedMaterial({ color: 0x2E6B4F }, 'foliage');
    const sandRimMat = createStylizedMaterial({ color: 0xDEC07C }, 'stone');
    const distantRidgeMat = createStylizedMaterial({ color: 0x3A625B }, 'foliage');
    const deepBackdropMat = new THREE.MeshLambertMaterial({ color: 0x456B7A, flatShading: true });

    const islands = [
      // 1. Ilhotas Costeiras das Cagarras no Horizonte Sul (Mar Aberto, silhuetas multi-pico!)
      { x: -290, z: 450, rx: 32, rz: 19, h: 17, hasPalmCap: true, hasTwinPeak: true },
      { x: -235, z: 485, rx: 19, rz: 13, h: 10, hasPalmCap: false, hasTwinPeak: true },
      { x: 260,  z: 465, rx: 34, rz: 20, h: 18, hasPalmCap: true, hasTwinPeak: true },
      { x: 320,  z: 495, rx: 20, rz: 14, h: 11, hasPalmCap: false, hasTwinPeak: false },
      // 2. Ilha Rasa & Farol Oceânico ao Sul Profundo
      { x: 18,   z: 540, rx: 28, rz: 17, h: 15, hasPalmCap: true, hasBeacon: true, hasTwinPeak: true },
      // 3. Cadeia Contínua de Cabos Oeste/Noroeste (fecha 100% o horizonte visto do Mirante Imperial!)
      { x: -510, z: 120, rx: 120, rz: 72, h: 42, hasPalmCap: true, ridge: true },
      { x: -640, z: -20, rx: 145, rz: 95, h: 58, hasPalmCap: true, ridge: true },
      { x: -590, z: -180, rx: 160, rz: 115, h: 72, hasPalmCap: true, ridge: true },
      { x: -720, z: -320, rx: 190, rz: 130, h: 88, hasPalmCap: true, ridge: true },
      { x: -860, z: -470, rx: 220, rz: 145, h: 105, hasPalmCap: true, ridge: true },
      { x: -890, z: 40,  rx: 170, rz: 125, h: 66, hasPalmCap: true, distant: true },
      { x: -910, z: -195, rx: 200, rz: 140, h: 86, hasPalmCap: true, distant: true },
      // 4. Cadeia Contínua de Cabos Leste/Nordeste (simetria panorâmica 360°)
      { x: 520,  z: 125, rx: 120, rz: 72, h: 44, hasPalmCap: true, ridge: true },
      { x: 645,  z: -15, rx: 145, rz: 95, h: 60, hasPalmCap: true, ridge: true },
      { x: 595,  z: -175, rx: 160, rz: 115, h: 74, hasPalmCap: true, ridge: true },
      { x: 725,  z: -315, rx: 190, rz: 130, h: 90, hasPalmCap: true, ridge: true },
      { x: 865,  z: -465, rx: 220, rz: 145, h: 108, hasPalmCap: true, ridge: true },
      { x: 895,  z: 45,  rx: 170, rz: 125, h: 68, hasPalmCap: true, distant: true },
      { x: 915,  z: -190, rx: 200, rz: 140, h: 88, hasPalmCap: true, distant: true },
      // 5. Segunda & Terceira Camadas da Serra do Mar ao Fundo Norte/Noroeste/Nordeste (horizonte contínuo!)
      { x: -640, z: -560, rx: 240, rz: 120, h: 104, hasPalmCap: true, distant: true },
      { x: -360, z: -600, rx: 250, rz: 125, h: 114, hasPalmCap: true, distant: true },
      { x: -80,  z: -625, rx: 260, rz: 130, h: 122, hasPalmCap: true, distant: true },
      { x: 210,  z: -620, rx: 255, rz: 125, h: 118, hasPalmCap: true, distant: true },
      { x: 510,  z: -575, rx: 245, rz: 120, h: 106, hasPalmCap: true, distant: true }
    ];

    const bodyGeo = new THREE.DodecahedronGeometry(1.0, 1);
    const rimGeo = new THREE.CylinderGeometry(0.95, 1.12, 1.1, 10);
    const capGeo = new THREE.DodecahedronGeometry(0.82, 1);

    const rimMatrices = [];
    const graniteMatrices = [];
    const ridgeMatrices = [];
    const backdropMatrices = [];
    const lushCapMatrices = [];

    const d = this._dummy;
    const pushMatrix = (list, x, y, z, rx, ry, rz, rotY = 0) => {
      d.position.set(x, y, z);
      d.rotation.set(0, rotY, 0);
      d.scale.set(rx, ry, rz);
      d.updateMatrix();
      list.push(d.matrix.clone());
    };

    islands.forEach((isl, idx) => {
      const baseY = -0.5;
      // Base suave de areia na linha d'água
      pushMatrix(rimMatrices, isl.x, baseY + 0.2, isl.z, isl.rx * 1.02, 1.0, isl.rz * 1.02, 0);

      const targetList = isl.distant
        ? backdropMatrices
        : (isl.ridge ? ridgeMatrices : graniteMatrices);
      pushMatrix(targetList, isl.x, baseY + isl.h * 0.28, isl.z, isl.rx, isl.h, isl.rz, idx * 1.1);

      // Segundo pico / recife assimétrico nas ilhotas costeiras (acaba com a "meia-bola" simétrica!)
      if (isl.hasTwinPeak) {
        const sgn = idx % 2 === 0 ? 1 : -1;
        pushMatrix(
          targetList,
          isl.x + isl.rx * 0.52 * sgn,
          baseY + isl.h * 0.14,
          isl.z + isl.rz * 0.18,
          isl.rx * 0.56,
          isl.h * 0.62,
          isl.rz * 0.58,
          idx * 1.7 + 0.6
        );
        pushMatrix(
          graniteMatrices,
          isl.x - isl.rx * 0.65 * sgn,
          baseY + 0.7,
          isl.z - isl.rz * 0.2,
          isl.rx * 0.34,
          Math.max(2.6, isl.h * 0.22),
          isl.rz * 0.34,
          0
        );
      }

      if (isl.hasPalmCap && !isl.distant) {
        pushMatrix(
          lushCapMatrices,
          isl.x,
          baseY + isl.h * 0.46,
          isl.z,
          isl.rx * 0.76,
          isl.h * 0.42,
          isl.rz * 0.76,
          idx * 1.1
        );
      }

      // Farol oceânico na Ilha Rasa
      if (isl.hasBeacon) {
        const beaconGroup = new THREE.Group();
        beaconGroup.position.set(isl.x, baseY, isl.z);

        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.9, 1.3, 9.0, 8),
          new THREE.MeshLambertMaterial({ color: 0xF8FAFC })
        );
        tower.position.set(0, isl.h * 0.72 + 4.0, 0);
        beaconGroup.add(tower);

        const lantern = new THREE.Mesh(
          new THREE.SphereGeometry(1.3, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xFDE047 })
        );
        lantern.position.set(0, isl.h * 0.72 + 9.0, 0);
        beaconGroup.add(lantern);

        beaconGroup.traverse((o) => {
          if (o.isMesh || o === beaconGroup) {
            o.matrixAutoUpdate = false;
            o.updateMatrix();
          }
        });
        archGroup.add(beaconGroup);
      }
    });

    const makeInstanced = (geo, mat, matrices) => {
      if (!matrices.length) return null;
      const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
      for (let i = 0; i < matrices.length; i++) {
        inst.setMatrixAt(i, matrices[i]);
      }
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      inst.matrixAutoUpdate = false;
      inst.updateMatrix();
      archGroup.add(inst);
      return inst;
    };

    makeInstanced(rimGeo, sandRimMat, rimMatrices);
    makeInstanced(bodyGeo, graniteMat, graniteMatrices);
    makeInstanced(bodyGeo, distantRidgeMat, ridgeMatrices);
    makeInstanced(bodyGeo, deepBackdropMat, backdropMatrices);
    makeInstanced(capGeo, lushIslandMat, lushCapMatrices);

    // Luzes Distantes ancoradas nas encostas dos cabos voltadas para a baía (1 único Points draw call!)
    const ridgeCapes = islands.filter((isl) => isl.ridge);
    const bayLightCount = 132;
    const bayLightPos = new Float32Array(bayLightCount * 3);
    const bayLightCol = new Float32Array(bayLightCount * 3);
    const lightTones = [
      new THREE.Color(0xFFD580),
      new THREE.Color(0xFFB347),
      new THREE.Color(0xFFF1C9)
    ];
    for (let i = 0; i < bayLightCount; i++) {
      const cape = ridgeCapes[i % ridgeCapes.length];
      const inward = cape.x < 0 ? 1 : -1;
      const s1 = Math.sin(i * 19.31 + 1.7) * 43758.5453;
      const s2 = Math.sin(i * 47.17 + 3.9) * 43758.5453;
      const r1 = s1 - Math.floor(s1);
      const r2 = s2 - Math.floor(s2);

      const ang = (r1 - 0.5) * 1.35;
      bayLightPos[i * 3] = cape.x + inward * Math.cos(ang) * cape.rx * (0.46 + r2 * 0.24);
      bayLightPos[i * 3 + 1] = 2.2 + (1.0 - r2) * Math.min(11.0, cape.h * 0.18);
      bayLightPos[i * 3 + 2] = cape.z + Math.sin(ang) * cape.rz * 0.62;

      const col = lightTones[i % lightTones.length];
      bayLightCol[i * 3] = col.r;
      bayLightCol[i * 3 + 1] = col.g;
      bayLightCol[i * 3 + 2] = col.b;
    }
    const bayLightGeo = new THREE.BufferGeometry();
    bayLightGeo.setAttribute('position', new THREE.BufferAttribute(bayLightPos, 3));
    bayLightGeo.setAttribute('color', new THREE.BufferAttribute(bayLightCol, 3));
    this.distantBayLightsMat = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    this.distantBayLights = new THREE.Points(bayLightGeo, this.distantBayLightsMat);
    this.distantBayLights.matrixAutoUpdate = false;
    this.distantBayLights.updateMatrix();
    archGroup.add(this.distantBayLights);

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
    this.birdWingMat = new THREE.MeshLambertMaterial({
      color: 0xF8FAFC,
      emissive: 0xCBD5E1,
      emissiveIntensity: 0.12,
      side: THREE.DoubleSide,
      flatShading: true
    });
    this.birdBodyMat = new THREE.MeshLambertMaterial({
      color: 0xE2E8F0,
      emissive: 0x94A3B8,
      emissiveIntensity: 0.08,
      flatShading: true
    });
    const wingMat = this.birdWingMat;
    const bodyMat = this.birdBodyMat;

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
    // Sol & Lua HDR agora são renderizados no SkyDome; mantemos meshes ocultas por compatibilidade
    if (this.sunMesh) this.sunMesh.visible = false;
    if (this.moonMesh) this.moonMesh.visible = false;

    if (isDaylight) {
      this.dirLight.position.set(sunX, Math.max(12, sunY), sunZ);
      if (this.sunMesh) this.sunMesh.position.copy(this.dirLight.position).multiplyScalar(4.8);
    } else {
      const moonX = -sunX;
      const moonY = Math.max(25, -sunY);
      const moonZ = -sunZ;
      this.dirLight.position.set(moonX, moonY, moonZ);
      if (this.moonMesh) this.moonMesh.position.set(moonX * 4.5, moonY * 4.5, moonZ * 4.5);
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
      this.skyUniforms.uSunDir.value.set(sunX, Math.max(isDaylight ? 5 : -8, sunY), sunZ).normalize();
      this.skyUniforms.uMoonDir.value.set(-sunX, Math.max(22, -sunY), -sunZ).normalize();
    }

    if (targetPhase === 'day') {
      lerpTo(this.scene.background, '#58B4E3', rate);
      lerpTo(this.scene.fog.color, '#BCE6FA', rate);
      lerpTo(this.hemiLight.color, 0xE1F5FE, rate);
      lerpTo(this.hemiLight.groundColor, 0x367A45, rate);
      this.hemiLight.intensity = 0.85;
      lerpTo(this.dirLight.color, 0xFFF6DF, rate);
      this.dirLight.intensity = 2.45;
      if (this.iblMaps) this.scene.environmentIntensity = 0.78;
      if (this.starMat) this.starMat.opacity = instant ? 0.0 : Math.max(0, this.starMat.opacity - 0.08);
      if (this.distantBayLightsMat) this.distantBayLightsMat.opacity += (0.0 - this.distantBayLightsMat.opacity) * rate;
      if (this.waterMat) lerpTo(this.waterMat.color, 0x06649B, rate);
      if (this.horizonSeaMat && this.waterMat) this.horizonSeaMat.color.copy(this.waterMat.color);
      if (this.bayWaterMat) lerpTo(this.bayWaterMat.color, 0x0B86C4, rate);
      if (this.skyUniforms) {
        lerpTo(this.skyUniforms.uTopColor.value, '#2B82D4', rate);
        lerpTo(this.skyUniforms.uMidColor.value, '#66B9EC', rate);
        lerpTo(this.skyUniforms.uLowColor.value, '#A6DEF5', rate);
        lerpTo(this.skyUniforms.uHorizonColor.value, '#D4EFFA', rate);
        lerpTo(this.skyUniforms.uSeaHorizonColor.value, '#4A9BC2', rate);
        lerpTo(this.skyUniforms.uSunGlowColor.value, '#FFF4C8', rate);
        this.skyUniforms.uSunGlowStrength.value += (0.42 - this.skyUniforms.uSunGlowStrength.value) * rate;
        this.skyUniforms.uSunDiscStrength.value += (0.72 - this.skyUniforms.uSunDiscStrength.value) * rate;
        this.skyUniforms.uMoonStrength.value += (0.0 - this.skyUniforms.uMoonStrength.value) * rate;
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
      if (this.birdWingMat && this.birdBodyMat) {
        lerpTo(this.birdWingMat.color, 0xF8FAFC, rate);
        lerpTo(this.birdWingMat.emissive, 0xCBD5E1, rate);
        this.birdWingMat.emissiveIntensity = 0.12;
        lerpTo(this.birdBodyMat.color, 0xE2E8F0, rate);
        lerpTo(this.birdBodyMat.emissive, 0x94A3B8, rate);
        this.birdBodyMat.emissiveIntensity = 0.08;
      }
    } else if (targetPhase === 'sunset') {
      const sunsetT = (progress - 0.42) / 0.16;
      lerpBlend(this.scene.background, '#E87A48', '#52348F', sunsetT, rate);
      lerpBlend(this.scene.fog.color, '#F4AA6E', '#D9816A', sunsetT, rate);
      lerpTo(this.hemiLight.color, 0xFED7AA, rate);
      lerpTo(this.hemiLight.groundColor, 0x6D3518, rate);
      this.hemiLight.intensity = 0.84;
      lerpTo(this.dirLight.color, 0xF7A842, rate);
      this.dirLight.intensity = 2.20;
      if (this.iblMaps) this.scene.environmentIntensity = 0.76;
      if (this.starMat) this.starMat.opacity = instant ? (sunsetT * 0.38) : Math.min(0.38, sunsetT * 0.38);
      if (this.distantBayLightsMat) this.distantBayLightsMat.opacity += (0.30 - this.distantBayLightsMat.opacity) * rate;
      if (this.waterMat) lerpTo(this.waterMat.color, 0x0A4B78, rate);
      if (this.horizonSeaMat && this.waterMat) this.horizonSeaMat.color.copy(this.waterMat.color);
      if (this.bayWaterMat) lerpTo(this.bayWaterMat.color, 0x0875A8, rate);
      if (this.skyUniforms) {
        lerpBlend(this.skyUniforms.uTopColor.value, '#2B2F68', '#1D1A4C', sunsetT, rate);
        lerpBlend(this.skyUniforms.uMidColor.value, '#C6596E', '#8E4378', sunsetT, rate);
        lerpBlend(this.skyUniforms.uLowColor.value, '#F28A48', '#D8675A', sunsetT, rate);
        lerpBlend(this.skyUniforms.uHorizonColor.value, '#F8B878', '#E0886B', sunsetT, rate);
        lerpBlend(this.skyUniforms.uSeaHorizonColor.value, '#8B6572', '#52436A', sunsetT, rate);
        lerpTo(this.skyUniforms.uSunGlowColor.value, '#FFCA6B', rate);
        this.skyUniforms.uSunGlowStrength.value += (1.05 - this.skyUniforms.uSunGlowStrength.value) * rate;
        this.skyUniforms.uSunDiscStrength.value += (1.15 - this.skyUniforms.uSunDiscStrength.value) * rate;
        this.skyUniforms.uMoonStrength.value += (0.0 - this.skyUniforms.uMoonStrength.value) * rate;
      }
      if (this.cloudMat) {
        lerpTo(this.cloudMat.color, 0xFFF2D6, rate);
        lerpTo(this.cloudMat.emissive, 0xFFA764, rate);
        this.cloudMat.emissiveIntensity = 0.78;
        this.cloudMat.opacity = 0.88;
      }
      if (this.atmoMat) {
        lerpTo(this.atmoMat.color, 0xFFD080, rate);
        this.atmoMat.opacity += (0.36 - this.atmoMat.opacity) * rate;
        this.atmoMat.size = 0.80;
      }
      if (this.birdWingMat && this.birdBodyMat) {
        lerpTo(this.birdWingMat.color, 0xFFE6C2, rate);
        lerpTo(this.birdWingMat.emissive, 0xD98A54, rate);
        this.birdWingMat.emissiveIntensity = 0.18;
        lerpTo(this.birdBodyMat.color, 0xF5D0A9, rate);
        lerpTo(this.birdBodyMat.emissive, 0xC47644, rate);
        this.birdBodyMat.emissiveIntensity = 0.14;
      }
    } else if (targetPhase === 'night') {
      // LUMINOUS NIGHT: Deep cobalt blue sky, sparkling stars, bright moon bounce, zero murky darkness!
      lerpTo(this.scene.background, '#0E1C36', rate);
      lerpTo(this.scene.fog.color, '#1D375E', rate);
      lerpTo(this.hemiLight.color, 0x6788B2, rate);
      lerpTo(this.hemiLight.groundColor, 0x223E32, rate);
      this.hemiLight.intensity = 0.68; // Balanced with PMREM night IBL
      lerpTo(this.dirLight.color, 0xD4E6F8, rate);
      this.dirLight.intensity = 0.74; // Soft directional moon rim, prevents specular blowout on water
      if (this.iblMaps) this.scene.environmentIntensity = 0.52;
      if (this.starMat) this.starMat.opacity = instant ? 0.85 : Math.min(0.85, this.starMat.opacity + 0.08);
      if (this.distantBayLightsMat) this.distantBayLightsMat.opacity += (0.74 - this.distantBayLightsMat.opacity) * rate;
      if (this.waterMat) lerpTo(this.waterMat.color, 0x0A3654, rate);
      if (this.horizonSeaMat && this.waterMat) this.horizonSeaMat.color.copy(this.waterMat.color);
      if (this.bayWaterMat) lerpTo(this.bayWaterMat.color, 0x0369A1, rate);
      if (this.skyUniforms) {
        lerpTo(this.skyUniforms.uTopColor.value, '#081226', rate);
        lerpTo(this.skyUniforms.uMidColor.value, '#122446', rate);
        lerpTo(this.skyUniforms.uLowColor.value, '#1A345C', rate);
        lerpTo(this.skyUniforms.uHorizonColor.value, '#213E69', rate);
        lerpTo(this.skyUniforms.uSeaHorizonColor.value, '#132948', rate);
        lerpTo(this.skyUniforms.uSunGlowColor.value, '#7CA6D8', rate);
        this.skyUniforms.uSunGlowStrength.value += (0.28 - this.skyUniforms.uSunGlowStrength.value) * rate;
        this.skyUniforms.uSunDiscStrength.value += (0.0 - this.skyUniforms.uSunDiscStrength.value) * rate;
        this.skyUniforms.uMoonStrength.value += (1.0 - this.skyUniforms.uMoonStrength.value) * rate;
      }
      if (this.cloudMat) {
        lerpTo(this.cloudMat.color, 0x5B7DA6, rate);
        lerpTo(this.cloudMat.emissive, 0x2F4E78, rate);
        this.cloudMat.emissiveIntensity = 0.44;
        this.cloudMat.opacity = 0.32;
      }
      if (this.atmoMat) {
        lerpTo(this.atmoMat.color, 0xFFE882, rate);
        this.atmoMat.opacity += (0.76 - this.atmoMat.opacity) * rate;
        this.atmoMat.size = 1.05;
      }
      if (this.birdWingMat && this.birdBodyMat) {
        lerpTo(this.birdWingMat.color, 0x3C5475, rate);
        lerpTo(this.birdWingMat.emissive, 0x16243B, rate);
        this.birdWingMat.emissiveIntensity = 0.04;
        lerpTo(this.birdBodyMat.color, 0x334A68, rate);
        lerpTo(this.birdBodyMat.emissive, 0x111E33, rate);
        this.birdBodyMat.emissiveIntensity = 0.02;
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
      if (this.distantBayLightsMat) this.distantBayLightsMat.opacity += (0.18 - this.distantBayLightsMat.opacity) * rate;
      if (this.waterMat) lerpTo(this.waterMat.color, 0x0284C7, rate);
      if (this.horizonSeaMat && this.waterMat) this.horizonSeaMat.color.copy(this.waterMat.color);
      if (this.bayWaterMat) lerpTo(this.bayWaterMat.color, 0x0EA5E9, rate);
      if (this.skyUniforms) {
        lerpBlend(this.skyUniforms.uTopColor.value, '#3E5294', '#2B82D4', dawnT, rate);
        lerpBlend(this.skyUniforms.uMidColor.value, '#DF7E96', '#66B9EC', dawnT, rate);
        lerpBlend(this.skyUniforms.uLowColor.value, '#F8B994', '#A6DEF5', dawnT, rate);
        lerpBlend(this.skyUniforms.uHorizonColor.value, '#FFE2B3', '#D4EFFA', dawnT, rate);
        lerpBlend(this.skyUniforms.uSeaHorizonColor.value, '#5A6E94', '#4A9BC2', dawnT, rate);
        lerpTo(this.skyUniforms.uSunGlowColor.value, '#FDE68A', rate);
        this.skyUniforms.uSunGlowStrength.value += (0.60 - this.skyUniforms.uSunGlowStrength.value) * rate;
        this.skyUniforms.uSunDiscStrength.value += (0.85 - this.skyUniforms.uSunDiscStrength.value) * rate;
        this.skyUniforms.uMoonStrength.value += (0.0 - this.skyUniforms.uMoonStrength.value) * rate;
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
      if (this.birdWingMat && this.birdBodyMat) {
        lerpTo(this.birdWingMat.color, 0xFCE7F3, rate);
        lerpTo(this.birdWingMat.emissive, 0xD8A3B8, rate);
        this.birdWingMat.emissiveIntensity = 0.14;
        lerpTo(this.birdBodyMat.color, 0xF5D0E0, rate);
        lerpTo(this.birdBodyMat.emissive, 0xC48AA3, rate);
        this.birdBodyMat.emissiveIntensity = 0.10;
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
