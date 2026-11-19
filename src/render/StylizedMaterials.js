import * as THREE from 'three';

/**
 * StylizedMaterials.js
 * Biblioteca central de Direção de Arte ("Maquete Carioca Viva"):
 * - Uniforms compartilhados em tempo real (tempo, direção solar, fator noturno)
 * - Paleta curada com tons tropicais harmônicos (sem primárias saturadas artificiais)
 * - Presets PBR + injeção leve de ruído world-space via onBeforeCompile (0 texturas em MAP_KEYS)
 *   para manter 100% de compatibilidade com StaticBatcher e 60 FPS.
 */

export const SHARED_SHADER_UNIFORMS = {
  uTime: { value: 0 },
  uNightFactor: { value: 0 },
  uSunDir: { value: new THREE.Vector3(-0.4, 0.8, 0.4).normalize() },
  uSkyHorizonColor: { value: new THREE.Color('#7EC8E8') }
};

export const CURATED_PALETTE = [
  { name: 'Coral Tropical', color: 0xD96B52 },
  { name: 'Amarelo Canário', color: 0xE6A15C },
  { name: 'Azul Guanabara', color: 0x3B6FB6 },
  { name: 'Verde Tropical', color: 0x3D8B7D },
  { name: 'Rosa Queimado', color: 0xC45C78 },
  { name: 'Tijolo Aparente', color: 0xA8543E },
  { name: 'Branco Caiado', color: 0xEAE4D7 },
  { name: 'Turquesa Suave', color: 0x4EA3B8 },
  { name: 'Terracota Solar', color: 0xBD5D3E }
];

export const SURFACE_PRESETS = {
  plaster: {
    roughness: 0.88,
    metalness: 0.0,
    grainScale: 2.6,
    grainAmp: 0.055,
    roughVar: 0.06,
    topLift: 0.055,
    cavityDip: 0.085,
    pattern: 0,
    flatShading: false
  },
  brick: {
    roughness: 0.85,
    metalness: 0.0,
    grainScale: 4.2,
    grainAmp: 0.070,
    roughVar: 0.07,
    topLift: 0.045,
    cavityDip: 0.105,
    pattern: 1,
    flatShading: false
  },
  wood: {
    roughness: 0.78,
    metalness: 0.0,
    grainScale: 5.0,
    grainAmp: 0.065,
    roughVar: 0.08,
    topLift: 0.045,
    cavityDip: 0.075,
    pattern: 2,
    flatShading: false
  },
  stone: {
    roughness: 0.90,
    metalness: 0.0,
    grainScale: 2.1,
    grainAmp: 0.075,
    roughVar: 0.08,
    topLift: 0.060,
    cavityDip: 0.115,
    pattern: 0,
    flatShading: false
  },
  asphalt: {
    roughness: 0.92,
    metalness: 0.0,
    grainScale: 5.8,
    grainAmp: 0.050,
    roughVar: 0.06,
    topLift: 0.025,
    cavityDip: 0.060,
    pattern: 0,
    flatShading: false
  },
  foliage: {
    roughness: 0.82,
    metalness: 0.0,
    grainScale: 1.7,
    grainAmp: 0.085,
    roughVar: 0.06,
    topLift: 0.110,
    cavityDip: 0.150,
    pattern: 3,
    flatShading: false
  },
  ceramic: {
    roughness: 0.48,
    metalness: 0.05,
    grainScale: 3.0,
    grainAmp: 0.030,
    roughVar: 0.05,
    topLift: 0.045,
    cavityDip: 0.060,
    pattern: 0,
    flatShading: false
  },
  metal: {
    roughness: 0.34,
    metalness: 0.55,
    grainScale: 4.0,
    grainAmp: 0.025,
    roughVar: 0.06,
    topLift: 0.040,
    cavityDip: 0.040,
    pattern: 0,
    flatShading: false
  },
  fabric: {
    roughness: 0.86,
    metalness: 0.0,
    grainScale: 6.5,
    grainAmp: 0.038,
    roughVar: 0.04,
    topLift: 0.040,
    cavityDip: 0.065,
    pattern: 0,
    flatShading: false
  },
  skin: {
    roughness: 0.64,
    metalness: 0.0,
    grainScale: 0.0,
    grainAmp: 0.0,
    roughVar: 0.0,
    topLift: 0.045,
    cavityDip: 0.060,
    pattern: 0,
    flatShading: false
  }
};

const _sharedMatCache = new Map();

export function updateSharedShaderUniforms(delta, env) {
  SHARED_SHADER_UNIFORMS.uTime.value += delta;
  if (!env) return;

  if (env.dirLight && env.dirLight.position) {
    SHARED_SHADER_UNIFORMS.uSunDir.value.copy(env.dirLight.position).normalize();
  }
  if (env.scene && env.scene.fog && env.scene.fog.color) {
    SHARED_SHADER_UNIFORMS.uSkyHorizonColor.value.copy(env.scene.fog.color);
  }
  if (typeof env.getTimeOfDay === 'function') {
    const info = env.getTimeOfDay();
    const phase = typeof info === 'string' ? info : (info.phase || 'day');
    const progress = typeof info === 'object' && info.progress !== undefined ? info.progress : 0;
    let targetNight = 0.0;
    if (phase === 'night') targetNight = 1.0;
    else if (phase === 'sunset') targetNight = 0.45 * Math.min(1, Math.max(0, (progress - 0.42) / 0.16));
    else if (phase === 'dawn') targetNight = 0.45 * Math.max(0, 1.0 - (progress - 0.88) / 0.12);
    const rate = Math.min(1.0, Math.max(0.05, delta * 3.0));
    SHARED_SHADER_UNIFORMS.uNightFactor.value += (targetNight - SHARED_SHADER_UNIFORMS.uNightFactor.value) * rate;
  }
}

/**
 * Infere um preset PBR coerente para materiais estáticos agrupados pelo StaticBatcher.
 */
export function inferPresetFromColor(color, roughnessHint = null) {
  if (!color) return 'stone';
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  if (hsl.s < 0.12 && hsl.l < 0.34) return 'asphalt';
  if (hsl.h > 0.20 && hsl.h < 0.46 && hsl.s > 0.22) return 'foliage';
  if (hsl.h >= 0.02 && hsl.h <= 0.11 && hsl.s > 0.28 && hsl.l < 0.48) return 'wood';
  if (hsl.h >= 0.01 && hsl.h <= 0.07 && hsl.s > 0.45 && hsl.l >= 0.35 && hsl.l <= 0.60) return 'brick';
  if (hsl.s < 0.16) return 'stone';
  if (roughnessHint !== null && roughnessHint < 0.45) return 'ceramic';
  return 'plaster';
}

const NOISE_GLSL = /* glsl */ `
float stGyroid(vec3 p) {
  return dot(sin(p), cos(p.yzx));
}
float stNoise3(vec3 x) {
  float g1 = stGyroid(x * 1.35);
  float g2 = stGyroid(x * 3.15 + vec3(1.7, 3.1, 2.3));
  return clamp(0.5 + g1 * 0.14 + g2 * 0.07, 0.0, 1.0);
}
`;

/**
 * Aplica shader PBR estilizado em world-space sem adicionar texturas em MAP_KEYS.
 * @param {THREE.Material} material
 * @param {string} presetKey
 * @param {object} opts { wind?: 'crown' | 'frond' | null, roughness?: number, metalness?: number, flatShading?: boolean }
 */
export function applyStylizedShader(material, presetKey = 'plaster', opts = {}) {
  const preset = SURFACE_PRESETS[presetKey] || SURFACE_PRESETS.plaster;
  if (material.isMeshStandardMaterial) {
    material.roughness = opts.roughness ?? preset.roughness;
    material.metalness = opts.metalness ?? preset.metalness;
  }
  if (opts.flatShading !== undefined) {
    material.flatShading = opts.flatShading;
  } else {
    material.flatShading = preset.flatShading;
  }

  const windMode = opts.wind || null;
  material.userData = material.userData || {};
  material.userData.stylizedPreset = presetKey;
  material.userData.stylizedWind = windMode;

  material.customProgramCacheKey = () => `morro_stylized_${presetKey}_${windMode || 'static'}`;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = SHARED_SHADER_UNIFORMS.uTime;
    shader.uniforms.uGrainScale = { value: preset.grainScale };
    shader.uniforms.uGrainAmp = { value: preset.grainAmp };
    shader.uniforms.uRoughVar = { value: preset.roughVar };
    shader.uniforms.uTopLift = { value: preset.topLift };
    shader.uniforms.uCavityDip = { value: preset.cavityDip };
    shader.uniforms.uPatternMode = { value: preset.pattern };

    // Vertex: world pos, world normal & optional wind sway
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uTime;
varying vec3 vStylizedWorldPos;
varying vec3 vStylizedWorldNorm;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
${windMode === 'crown' ? `
#ifdef USE_INSTANCING
  vec3 stWindOrig = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
  vec3 stWindOrig = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
#endif
float stWPhase = stWindOrig.x * 0.19 + stWindOrig.z * 0.23;
float stWMask = smoothstep(-0.8, 1.75, position.y);
transformed.x += sin(uTime * 1.45 + stWPhase + position.y * 0.65) * 0.11 * stWMask;
transformed.z += cos(uTime * 1.12 + stWPhase * 1.37 + position.x * 0.5) * 0.08 * stWMask;
` : ''}${windMode === 'frond' ? `
#ifdef USE_INSTANCING
  vec3 stWindOrig = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
  vec3 stWindOrig = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
#endif
float stWPhase = stWindOrig.x * 0.21 + stWindOrig.z * 0.17;
float stFrondDist = length(position.xz);
float stWMask = smoothstep(0.35, 3.6, stFrondDist);
transformed.y += sin(uTime * 1.85 + stWPhase + stFrondDist * 0.6) * 0.14 * stWMask;
transformed.x += cos(uTime * 1.30 + stWPhase) * 0.08 * stWMask;
` : ''}`
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vec4 stWorld = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  stWorld = batchingMatrix * stWorld;
#endif
#ifdef USE_INSTANCING
  stWorld = instanceMatrix * stWorld;
#endif
stWorld = modelMatrix * stWorld;
vStylizedWorldPos = stWorld.xyz;
vec3 stWNorm = objectNormal;
#ifdef USE_INSTANCING
  stWNorm = mat3( instanceMatrix ) * stWNorm;
#endif
vStylizedWorldNorm = normalize( mat3( modelMatrix ) * stWNorm );`
      );

    // Fragment: micro-grain + directional hemisphere warmth/coolness + subtle material breakup
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uGrainScale;
uniform float uGrainAmp;
uniform float uRoughVar;
uniform float uTopLift;
uniform float uCavityDip;
uniform float uPatternMode;
varying vec3 vStylizedWorldPos;
varying vec3 vStylizedWorldNorm;
${NOISE_GLSL}`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float stN1 = uGrainScale > 0.01 ? stNoise3(vStylizedWorldPos * uGrainScale) : 0.5;
float stGrain = stN1 - 0.5;

if (uPatternMode > 0.5 && uPatternMode < 1.5) {
  // Tijolo / Alvenaria: fiadas horizontais sutis
  float course = sin(vStylizedWorldPos.y * 13.0) * 0.5 + 0.5;
  stGrain += (course - 0.5) * 0.45;
} else if (uPatternMode > 1.5 && uPatternMode < 2.5) {
  // Madeira: veio alongado
  float woodN = sin(vStylizedWorldPos.z * 9.0 + stN1 * 3.0) * 0.5 + 0.5;
  stGrain += (woodN - 0.5) * 0.40;
} else if (uPatternMode > 2.5) {
  // Folhagem: variação orgânica por massa de folhas
  float leafN = stGyroid(vStylizedWorldPos * 3.2) * 0.15;
  stGrain += leafN;
}

float stUp = clamp(vStylizedWorldNorm.y, -1.0, 1.0);
float stTop = smoothstep(0.15, 0.95, stUp);
float stUnder = smoothstep(0.10, -0.85, stUp);

diffuseColor.rgb *= (1.0 + stGrain * uGrainAmp);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.06, 1.04, 0.96) + vec3(0.012, 0.010, 0.002), stTop * uTopLift * 3.0);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.76, 0.84, 0.96), stUnder * uCavityDip * 2.6);
diffuseColor.rgb = clamp(diffuseColor.rgb, 0.0, 1.0);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
if (uRoughVar > 0.001) {
  roughnessFactor = clamp(roughnessFactor + stGrain * uRoughVar, 0.08, 1.0);
}`
      );
  };

  return material;
}

/**
 * Cria um MeshStandardMaterial estilizado pronto para uso.
 */
export function createStylizedMaterial(params = {}, presetKey = 'plaster', opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    ...params,
    flatShading: opts.flatShading ?? (SURFACE_PRESETS[presetKey]?.flatShading ?? false)
  });
  return applyStylizedShader(mat, presetKey, opts);
}

/**
 * Retorna um MeshStandardMaterial compartilhado do cache para reduzir troca de estado WebGL.
 */
export function getSharedStylizedMaterial(colorHex, presetKey = 'plaster', opts = {}) {
  const side = opts.side ?? THREE.FrontSide;
  const flat = opts.flatShading ?? (SURFACE_PRESETS[presetKey]?.flatShading ?? false);
  const wind = opts.wind || '';
  const key = `${colorHex}_${presetKey}_${side}_${flat ? 1 : 0}_${wind}`;
  let mat = _sharedMatCache.get(key);
  if (!mat) {
    mat = createStylizedMaterial({ color: colorHex, side }, presetKey, opts);
    _sharedMatCache.set(key, mat);
  }
  return mat;
}

