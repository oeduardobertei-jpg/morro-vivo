import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Helpers de modelagem estilizada (formas arredondadas e anatômicas com baixo custo de vértices)
const RB = (w, h, d, r = 0.04, seg = 1) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w * 0.49, h * 0.49, d * 0.49));
const at = (geo, x = 0, y = 0, z = 0) => { geo.translate(x, y, z); return geo; };
// Merge seguro: normaliza atributos (remove index/uv divergentes) para unir partes numa única malha
const merge = (...geos) => {
  const prepared = geos.map(g => {
    const ng = g.index ? g.toNonIndexed() : g;
    ['uv', 'uv1', 'uv2'].forEach(a => { if (ng.attributes[a]) ng.deleteAttribute(a); });
    return ng;
  });
  const merged = mergeGeometries(prepared, false);
  merged.computeBoundingSphere();
  return merged;
};

// Reutilizáveis para fundir sub-partes coloridas de um mesmo membro rígido em 1 único draw call (vertex colors)
const _m4 = new THREE.Matrix4();
const _mp = new THREE.Vector3();
const _mq = new THREE.Quaternion();
const _me = new THREE.Euler();
const _ms = new THREE.Vector3();
const _mc = new THREE.Color();

function mergeColoredParts(parts) {
  if (!parts || parts.length === 0) return null;
  const prepared = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p || !p.geo) continue;
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    for (const attrName of Object.keys(g.attributes)) {
      if (attrName !== 'position' && attrName !== 'normal') g.deleteAttribute(attrName);
    }
    if (p.pos || p.rot || p.scale) {
      _mp.set(p.pos ? p.pos[0] : 0, p.pos ? p.pos[1] : 0, p.pos ? p.pos[2] : 0);
      _me.set(p.rot ? p.rot[0] : 0, p.rot ? p.rot[1] : 0, p.rot ? p.rot[2] : 0);
      _mq.setFromEuler(_me);
      _ms.set(p.scale ? p.scale[0] : 1, p.scale ? p.scale[1] : 1, p.scale ? p.scale[2] : 1);
      _m4.compose(_mp, _mq, _ms);
      g.applyMatrix4(_m4);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    _mc.setHex(p.color);
    if (p.skinWarm) {
      // Leve aquecimento para simular dispersão subsuperficial sem precisar de emissivo no material compartilhado
      _mc.r = Math.min(1, _mc.r * 1.12);
      _mc.g = Math.min(1, _mc.g * 1.10);
      _mc.b = Math.min(1, _mc.b * 1.08);
    }
    for (let v = 0; v < count; v++) {
      colors[v * 3] = _mc.r;
      colors[v * 3 + 1] = _mc.g;
      colors[v * 3 + 2] = _mc.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    prepared.push(g);
  }
  if (prepared.length === 0) return null;
  const merged = mergeGeometries(prepared, false);
  for (let i = 0; i < prepared.length; i++) prepared[i].dispose();
  merged.computeBoundingSphere();
  return merged;
}

// Cache compartilhado para figuras estilizadas de veículos, barcos, praia e lajes (compactadas em 4-6 draw calls por figura)
let _figCache = null;
function _getFigCache() {
  if (_figCache) return _figCache;
  const dome = (r, sy, drop) => {
    const g = new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, sy, 1);
    g.translate(0, -drop, 0);
    return g;
  };
  _figCache = {
    vertexMat: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.78,
      metalness: 0.02,
      flatShading: false
    }),
    mats: new Map(),
    torsoM: merge(
      at(RB(0.45, 0.33, 0.26, 0.08), 0, 0.12, 0),
      at(RB(0.38, 0.31, 0.23, 0.07), 0, -0.14, 0)
    ),
    torsoF: merge(
      at(RB(0.40, 0.31, 0.24, 0.08), 0, 0.13, 0),
      at(RB(0.31, 0.15, 0.20, 0.06), 0, -0.06, 0),
      at(RB(0.40, 0.16, 0.24, 0.07), 0, -0.20, 0)
    ),
    collar: new THREE.CylinderGeometry(0.11, 0.13, 0.05, 10),
    lapel: RB(0.115, 0.54, 0.275, 0.04),
    stripe: RB(0.46, 0.10, 0.275, 0.045),
    neck: new THREE.CylinderGeometry(0.07, 0.082, 0.12, 8),
    head: merge(
      at(RB(0.30, 0.29, 0.29, 0.08, 2), 0, 0.02, 0),
      at(RB(0.25, 0.11, 0.26, 0.048, 1), 0, -0.105, 0.008)
    ),
    ear: RB(0.034, 0.08, 0.055, 0.015),
    eyeWhite: RB(0.066, 0.048, 0.012, 0.005, 1),
    eyeIris: RB(0.032, 0.038, 0.012, 0.007, 1),
    eyeShine: new THREE.BoxGeometry(0.01, 0.01, 0.005),
    brow: RB(0.068, 0.02, 0.02, 0.007, 1),
    nose: merge(
      at(RB(0.038, 0.066, 0.038, 0.015), 0, 0, 0),
      at(RB(0.056, 0.026, 0.032, 0.01, 1), 0, -0.028, -0.004)
    ),
    mouth: RB(0.085, 0.02, 0.014, 0.007, 1),
    beard: merge(
      at(RB(0.27, 0.095, 0.19, 0.04), 0, 0, 0),
      at(RB(0.13, 0.048, 0.095, 0.022, 1), 0, -0.05, 0.048)
    ),
    mustache: RB(0.115, 0.03, 0.028, 0.01, 1),
    hairTop: RB(0.315, 0.095, 0.305, 0.042),
    hairBack: RB(0.305, 0.20, 0.068, 0.028),
    strawBrim: new THREE.CylinderGeometry(0.32, 0.35, 0.03, 12),
    strawCrown: new THREE.CylinderGeometry(0.155, 0.185, 0.14, 10),
    strawBand: new THREE.CylinderGeometry(0.18, 0.188, 0.038, 10),
    helmetDome: dome(0.195, 0.76, 0.055),
    visor: RB(0.28, 0.065, 0.05, 0.02, 1),
    shades: merge(
      at(RB(0.11, 0.056, 0.02, 0.018, 1), -0.065, 0, 0),
      at(RB(0.11, 0.056, 0.02, 0.018, 1), 0.065, 0, 0),
      at(new THREE.BoxGeometry(0.32, 0.014, 0.014), 0, 0.02, 0)
    ),
    sleeve: merge(
      at(new THREE.SphereGeometry(0.078, 8, 6), 0, 0, 0),
      at(RB(0.132, 0.20, 0.132, 0.055), 0, -0.09, 0)
    ),
    forearm: merge(
      at(new THREE.CapsuleGeometry(0.048, 0.19, 2, 6), 0, -0.28, 0),
      at(RB(0.08, 0.098, 0.06, 0.03), 0, -0.44, 0.005),
      at(RB(0.028, 0.055, 0.028, 0.01, 1), 0.042, -0.415, 0.018)
    ),
    thigh: at(RB(0.16, 0.30, 0.18, 0.065), 0, -0.14, 0),
    calf: merge(
      at(RB(0.135, 0.22, 0.145, 0.055), 0, -0.37, 0),
      at(new THREE.SphereGeometry(0.074, 8, 6), 0, -0.27, 0.005)
    ),
    shoe: merge(
      at(RB(0.145, 0.08, 0.225, 0.038), 0, -0.49, 0.03),
      at(RB(0.125, 0.055, 0.095, 0.028), 0, -0.455, -0.018)
    ),
    sole: at(RB(0.152, 0.028, 0.238, 0.01, 1), 0, -0.53, 0.03),
    sunga: RB(0.39, 0.15, 0.245, 0.048)
  };
  return _figCache;
}

export function createStylizedFigure(opts = {}) {
  const C = _getFigCache();
  const vMat = C.vertexMat;

  const {
    skinColor = 0xB27138,
    shirtColor = 0x0284C7,
    pantsColor = 0x1E3A8A,
    shoeColor = 0xF8FAFC,
    hairColor = 0x1F1917,
    hatType = 'hair', // 'straw' | 'helmet' | 'hair' | 'none'
    helmetColor = 0x0284C7,
    hasVisor = false,
    hasBeard = false,
    hasMustache = false,
    hasShades = false,
    hasVest = false,
    vestColor = 0x78350F,
    hasStripe = false,
    stripeColor = 0xF8FAFC,
    bareChest = false,
    bareLegs = false,
    wearsShorts = false,
    sungaColor = null,
    isFemale = false,
    includeLegs = true,
    includeShoes = true
  } = opts;

  const torsoHex = bareChest ? skinColor : shirtColor;
  const sleeveHex = bareChest ? skinColor : shirtColor;
  const legHex = bareLegs ? skinColor : pantsColor;
  const calfHex = (bareLegs || wearsShorts) ? skinColor : pantsColor;

  const group = new THREE.Group();

  // 1. Torso em V + pescoço + gola/colete/listra (1 único draw call)
  const torsoParts = [
    { geo: isFemale ? C.torsoF : C.torsoM, color: torsoHex, skinWarm: bareChest },
    { geo: C.neck, color: skinColor, skinWarm: true, pos: [0, 0.33, 0] }
  ];
  if (!bareChest) {
    torsoParts.push({ geo: C.collar, color: 0xF8FAFC, pos: [0, 0.28, 0.01] });
  }
  if (hasVest) {
    torsoParts.push({ geo: C.lapel, color: vestColor, pos: [-0.16, -0.01, 0] });
    torsoParts.push({ geo: C.lapel, color: vestColor, pos: [0.16, -0.01, 0] });
  }
  if (hasStripe && !bareChest) {
    torsoParts.push({ geo: C.stripe, color: stripeColor, pos: [0, 0.05, 0] });
  }
  const torso = new THREE.Mesh(mergeColoredParts(torsoParts), vMat);
  torso.position.y = 0.85;
  torso.castShadow = true;
  group.add(torso);

  // 2. Cabeça esculpida + rosto + barba/óculos + cabelo/chapéu/capacete (1 único draw call)
  const lipHex = new THREE.Color(skinColor).multiplyScalar(0.62).getHex();
  const headParts = [
    { geo: C.head, color: skinColor, skinWarm: true },
    { geo: C.ear, color: skinColor, skinWarm: true, pos: [-0.155, -0.005, 0] },
    { geo: C.ear, color: skinColor, skinWarm: true, pos: [0.155, -0.005, 0] },
    { geo: C.nose, color: skinColor, skinWarm: true, pos: [0, -0.01, 0.152] },
    { geo: C.mouth, color: lipHex, pos: [0, -0.088, hasBeard ? 0.156 : 0.143] },
    { geo: C.hairBack, color: hairColor, pos: [0, 0.015, -0.138] }
  ];
  [-1, 1].forEach(side => {
    const ex = side * 0.064;
    headParts.push(
      { geo: C.eyeWhite, color: 0xF5F1EA, pos: [ex, 0.024, 0.144] },
      { geo: C.eyeIris, color: 0x3B2414, pos: [ex - side * 0.005, 0.021, 0.150] },
      { geo: C.eyeShine, color: 0xFFFFFF, pos: [ex - side * 0.005 + 0.007, 0.031, 0.155] },
      { geo: C.brow, color: hairColor, pos: [ex, 0.068, 0.147], rot: [0, 0, side * -0.07] }
    );
  });
  if (hasBeard) {
    headParts.push({ geo: C.beard, color: hairColor, pos: [0, -0.13, 0.052] });
  } else if (hasMustache) {
    headParts.push({ geo: C.mustache, color: hairColor, pos: [0, -0.062, 0.146] });
  }
  if (hasShades) {
    headParts.push({ geo: C.shades, color: 0x111827, pos: [0, 0.026, 0.158] });
  }
  if (hatType === 'straw') {
    headParts.push(
      { geo: C.strawBrim, color: 0xDFB848, pos: [0, 0.155, 0] },
      { geo: C.strawCrown, color: 0xDFB848, pos: [0, 0.23, 0] },
      { geo: C.strawBand, color: 0x991B1B, pos: [0, 0.182, 0] }
    );
  } else if (hatType === 'helmet') {
    headParts.push({ geo: C.helmetDome, color: helmetColor, pos: [0, 0.14, -0.005] });
    if (hasVisor) headParts.push({ geo: C.visor, color: 0x0F172A, pos: [0, 0.065, 0.155] });
  } else if (hatType === 'hair') {
    headParts.push({ geo: C.hairTop, color: hairColor, pos: [0, 0.155, 0] });
  }
  const head = new THREE.Mesh(mergeColoredParts(headParts), vMat);
  head.position.y = 1.35;
  group.add(head);

  // 3. Braços articulados (1 único draw call por braço, geometria compartilhada)
  const armGeo = mergeColoredParts([
    { geo: C.sleeve, color: sleeveHex, skinWarm: bareChest },
    { geo: C.forearm, color: skinColor, skinWarm: true }
  ]);
  const leftArm = new THREE.Mesh(armGeo, vMat);
  leftArm.position.set(-0.295, 1.04, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, vMat);
  rightArm.position.set(0.295, 1.04, 0);
  group.add(rightArm);

  // 4. Pernas articuladas (1 único draw call por perna, geometria compartilhada)
  let leftLeg = null;
  let rightLeg = null;
  if (includeLegs) {
    const legParts = [
      { geo: C.thigh, color: legHex, skinWarm: bareLegs },
      { geo: C.calf, color: calfHex, skinWarm: bareLegs || wearsShorts }
    ];
    if (includeShoes) {
      const soleHex = shoeColor === 0xF8FAFC ? 0x9CA3AF : 0xF1F5F9;
      legParts.push(
        { geo: C.shoe, color: shoeColor },
        { geo: C.sole, color: soleHex }
      );
    }
    const legGeo = mergeColoredParts(legParts);
    leftLeg = new THREE.Mesh(legGeo, vMat);
    leftLeg.position.set(-0.11, 0.56, 0);
    group.add(leftLeg);

    rightLeg = new THREE.Mesh(legGeo, vMat);
    rightLeg.position.set(0.11, 0.56, 0);
    group.add(rightLeg);
  }

  if (sungaColor) {
    let sMat = C.mats.get(`sunga_${sungaColor}`);
    if (!sMat) {
      sMat = new THREE.MeshStandardMaterial({ color: sungaColor, roughness: 0.85, metalness: 0.0, flatShading: false });
      C.mats.set(`sunga_${sungaColor}`, sMat);
    }
    const sunga = new THREE.Mesh(C.sunga, sMat);
    sunga.position.set(0, 0.54, 0);
    group.add(sunga);
  }

  return { group, torso, head, leftArm, rightArm, leftLeg, rightLeg };
}

/** População: spawn inicial, novos moradores, malha 3D dos NPCs e roupas de praia. */
export const PopulationMixin = {
  spawnInitialPopulation() {
    // Constrói a topologia da malha viária conectada (Grafo Viário v3.5.0)
    this.buildRoadGraph();
    const waypoints = this.waypoints;

    // Special mini-waypoints inside soccer field for 'Jogador da Pelada'
    this.pitchWaypoints = [
      new THREE.Vector3(48, 3.7, 1),
      new THREE.Vector3(55, 3.7, 7),
      new THREE.Vector3(62, 3.7, 2),
      new THREE.Vector3(55, 3.7, -1),
      new THREE.Vector3(51, 3.7, 5)
    ];

    // 1. Spawn Dedicated Beach Barraqueiros (stationed at all 8 beach stalls across the coastline)
    const barraqueiroConfigs = [
      { stallId: 'caldo', title: 'Barraqueiro do Caldo de Cana', name: 'Seu Tonho da Cana', x: -215, z: 42.8, color: 0x15803D },
      { stallId: 'caipirinha', title: 'Barraqueira do Poente', name: 'Tia Néia', x: -155, z: 42.8, color: 0x0284C7 },
      { stallId: 'coco', title: 'Barraqueiro do Coco', name: 'Seu Baiano', x: -40, z: 42.8, color: 0x2D6A4F },
      { stallId: 'mate', title: 'Barraqueiro do Mate', name: 'Leandro do Mate', x: -10, z: 42.8, color: 0xF97316 },
      { stallId: 'acai', title: 'Barraqueiro do Açaí', name: 'Marcos Açaí', x: 20, z: 42.8, color: 0x7E22CE },
      { stallId: 'petiscos', title: 'Barraqueiro de Petiscos', name: 'Dona Cida', x: 50, z: 42.8, color: 0xDC2626 },
      { stallId: 'milho', title: 'Barraqueiro do Milho Verde', name: 'Chico do Milho', x: 160, z: 42.8, color: 0xEA580C },
      { stallId: 'sorvete', title: 'Barraqueira do Levante', name: 'Lúcia do Picolé', x: 225, z: 42.8, color: 0x0D9488 }
    ];

    barraqueiroConfigs.forEach((cfg, idx) => {
      const stallRole = {
        title: cfg.title,
        action: `Atendendo clientes com produtos frescos na barraca`,
        color: cfg.color,
        stallId: cfg.stallId
      };
      const bPos = new THREE.Vector3(cfg.x, 0.6, cfg.z);
      if (this.terrain) bPos.y = this.terrain.getElevation(bPos.x, bPos.z);

      const stallObj = this.arch && this.arch.beachStalls ? this.arch.beachStalls.find(s => s.id === cfg.stallId) : null;
      const bNPC = this.createNPCMesh(cfg.name, stallRole, bPos, [bPos], 100 + idx, null, stallObj);
      this.npcs.push(bNPC);
    });

    // 2. Personagens Cênicos Dedicados (Alameda das Flores, Terreiro de Samba & Mirante Sul)
    const miranteConfigs = [
      {
        name: 'Dona Teresa',
        role: {
          title: 'Florista da Alameda',
          action: 'Cuidando dos canteiros de buganvílias e acolhendo os visitantes',
          color: 0xDC2626
        },
        x: -4.8,
        z: -17.5,
        rot: 1.57,
        isScenicMirante: true
      },
      {
        name: 'Tião do Cavaco',
        role: {
          title: 'Músico do Terreiro de Samba',
          action: 'Tocando cavaquinho com ginga e harmonia na roda de samba',
          color: 0x2563EB
        },
        x: -4.5,
        z: -4.0,
        rot: 1.1,
        isScenicMirante: true,
        isMusician: true
      },
      {
        name: 'Seu Agenor',
        role: {
          title: 'Mestre do Mirante Sul',
          action: 'Sentado no banco do mirante apreciando a vista panorâmica do oceano',
          color: 0xF59E0B
        },
        x: 1.4,
        z: 2.8,
        rot: 0.0,
        isScenicMirante: true
      }
    ];

    miranteConfigs.forEach((cfg, idx) => {
      const mPos = new THREE.Vector3(cfg.x, this.getFloorElevation(cfg.x, cfg.z), cfg.z);
      const mNPC = this.createNPCMesh(cfg.name, cfg.role, mPos, [mPos], 200 + idx);
      mNPC.isScenicMirante = true;
      mNPC.isMusician = !!cfg.isMusician;
      mNPC.group.rotation.y = cfg.rot;

      if (cfg.isMusician) {
        // Cavaquinho low-poly fixado ergonomicamente ao Tião
        const cavacoGroup = new THREE.Group();
        cavacoGroup.position.set(0.12, 0.72, 0.28);
        cavacoGroup.rotation.set(-0.25, 0.45, -0.65);

        const bodyGeo = new THREE.BoxGeometry(0.32, 0.42, 0.12);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xB45309, flatShading: true });
        const cBody = new THREE.Mesh(bodyGeo, bodyMat);
        cavacoGroup.add(cBody);

        const neckGeo = new THREE.BoxGeometry(0.08, 0.38, 0.06);
        const neckMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });
        const cNeck = new THREE.Mesh(neckGeo, neckMat);
        cNeck.position.set(0, 0.36, 0);
        cavacoGroup.add(cNeck);

        const soundHole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8), new THREE.MeshBasicMaterial({ color: 0x1F2937 }));
        soundHole.rotation.x = Math.PI / 2;
        soundHole.position.set(0, 0, 0.07);
        cavacoGroup.add(soundHole);

        mNPC.group.add(cavacoGroup);
        mNPC.cavacoGroup = cavacoGroup;
      } else if (cfg.name === 'Seu Agenor') {
        // Seu Agenor sentado ergonomicamente no banco do Mirante Sul
        const plazaBaseY = this.terrain ? this.terrain.getElevation(-2.0, -4.0) + 0.1 : 14.1;
        const seatY = plazaBaseY + 0.24 + 0.35;
        mNPC.group.position.set(1.4, seatY - 0.50, 2.80);
        mNPC.group.rotation.y = 0.0;
        if (mNPC.leftLeg) mNPC.leftLeg.rotation.x = -1.45;
        if (mNPC.rightLeg) mNPC.rightLeg.rotation.x = -1.45;
        if (mNPC.leftArm) mNPC.leftArm.rotation.x = -0.45;
        if (mNPC.rightArm) mNPC.rightArm.rotation.x = -0.45;
        if (mNPC.torso) mNPC.torso.rotation.x = 0.06;
      }

      this.npcs.push(mNPC);
    });

    // 3. Personagens Autênticos dos Extremos da Praia (Atualização 1.2)
    // 3a. Seu Zé do Covo - Pescador Artesanal no Píer Oeste
    const pierFloorY = 1.58;
    const zePos = new THREE.Vector3(-77.8, pierFloorY, 92.2);
    const zeRole = {
      title: 'Pescador Tradicional',
      action: 'Pescando no extremo do píer de madeira com sua vara de bambu e paciência caiçara',
      color: 0x1E3A8A
    };
    const zeNPC = this.createNPCMesh('Seu Zé do Covo', zeRole, zePos, [zePos], 301);
    zeNPC.isFisherman = true;
    zeNPC.group.rotation.y = 0; // Olhando para o mar aberto ao sul
    
    // Vara de bambu na mão do Seu Zé
    const zeRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.025, 2.8, 4),
      new THREE.MeshLambertMaterial({ color: 0xD97706, flatShading: true })
    );
    zeRod.position.set(0.35, 1.1, 0.8);
    zeRod.rotation.set(Math.PI / 3.8, 0, 0);
    zeNPC.group.add(zeRod);
    zeNPC.fishingRod = zeRod;
    this.npcs.push(zeNPC);

    // 3b. Betinho & Pedrão - Dupla de Futevôlei Carioca (Quadra em x: 78, z: 42)
    const futevoleiConfigs = [
      { name: 'Betinho do Futevôlei', x: 76.2, z: 42.0, rot: Math.PI / 2, index: 302 },
      { name: 'Pedrão da Altinha', x: 79.8, z: 42.0, rot: -Math.PI / 2, index: 303 }
    ];
    futevoleiConfigs.forEach(cfg => {
      const pos = new THREE.Vector3(cfg.x, this.getFloorElevation(cfg.x, cfg.z), cfg.z);
      const role = {
        title: 'Atleta de Futevôlei',
        action: 'Trocando peitadas e cabeceios plásticos sobre a rede de futevôlei',
        color: 0x0284C7
      };
      const athlete = this.createNPCMesh(cfg.name, role, pos, [pos], cfg.index);
      athlete.isAthlete = true;
      athlete.athleteType = 'futevolei';
      athlete.group.rotation.y = cfg.rot;
      this.setNPCBeachOutfit(athlete, true);
      this.npcs.push(athlete);
    });

    // Bola animada de Futevôlei
    const fvBall = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.18, 1),
      new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true })
    );
    fvBall.position.set(78.0, 2.4, 42.0);
    this.group.add(fvBall);
    this.futevoleiBall = fvBall;

    // 3c. Rodrigo & Carlos - Dupla de Vôlei de Praia (Quadra em x: 98, z: 44)
    const voleiConfigs = [
      { name: 'Rodrigo do Vôlei', x: 95.8, z: 44.0, rot: Math.PI / 2, index: 304 },
      { name: 'Carlos do Vôlei', x: 100.2, z: 44.0, rot: -Math.PI / 2, index: 305 }
    ];
    voleiConfigs.forEach(cfg => {
      const pos = new THREE.Vector3(cfg.x, this.getFloorElevation(cfg.x, cfg.z), cfg.z);
      const role = {
        title: 'Jogador de Vôlei de Praia',
        action: 'Treinando manchetes e saques potentes na quadra de areia',
        color: 0xEA580C
      };
      const athlete = this.createNPCMesh(cfg.name, role, pos, [pos], cfg.index);
      athlete.isAthlete = true;
      athlete.athleteType = 'volei';
      athlete.group.rotation.y = cfg.rot;
      this.setNPCBeachOutfit(athlete, true);
      this.npcs.push(athlete);
    });

    // Bola animada de Vôlei de Praia
    const vbBall = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.19, 1),
      new THREE.MeshLambertMaterial({ color: 0xFDE047, flatShading: true })
    );
    vbBall.position.set(98.0, 2.7, 44.0);
    this.group.add(vbBall);
    this.voleiBall = vbBall;

    // 3d. Beto do Mate - Ambulante Icônico de Praia
    const matePos = new THREE.Vector3(10, 0.45, 42);
    matePos.y = this.getFloorElevation(matePos.x, matePos.z);
    const mateRole = {
      title: 'Ambulante do Mate',
      action: 'Circulando pelas areias da praia com seus galões de Mate gelado e Biscoito Globo',
      color: 0xF97316
    };
    const mateNPC = this.createNPCMesh('Beto do Mate', mateRole, matePos, [matePos], 306);
    mateNPC.isMateiro = true;
    this.setNPCBeachOutfit(mateNPC, true);

    // Galões de mate nas costas e ombros
    const canisterGroup = new THREE.Group();
    canisterGroup.position.set(0, 0.85, 0);

    const mateCanister = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.55, 6),
      new THREE.MeshLambertMaterial({ color: 0xEA580C, flatShading: true }) // Laranja Mate Leão
    );
    mateCanister.position.set(-0.28, 0, -0.15);
    canisterGroup.add(mateCanister);

    const limaoCanister = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.55, 6),
      new THREE.MeshLambertMaterial({ color: 0xFACC15, flatShading: true }) // Amarelo Limão
    );
    limaoCanister.position.set(0.28, 0, -0.15);
    canisterGroup.add(limaoCanister);

    // Sacola de Biscoito Globo na mão
    const globoBag = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.28, 0.16),
      new THREE.MeshLambertMaterial({ color: 0xFEF08A, flatShading: true })
    );
    globoBag.position.set(0.35, -0.2, 0.12);
    canisterGroup.add(globoBag);

    mateNPC.group.add(canisterGroup);
    mateNPC.canisterGroup = canisterGroup;

    mateNPC.beachPatrolSpots = [
      { x: -215, z: 46 },
      { x: -155, z: 46 },
      { x: -92, z: 52 },
      { x: -40, z: 46 },
      { x: -10, z: 46 },
      { x: 20, z: 46 },
      { x: 50, z: 46 },
      { x: 78, z: 44 },
      { x: 98, z: 46 },
      { x: 116, z: 34 },
      { x: 160, z: 46 },
      { x: 225, z: 46 }
    ];
    mateNPC.patrolIndex = 2;
    mateNPC.targetPos = new THREE.Vector3(20, this.getFloorElevation(20, 46), 46);
    this.npcs.push(mateNPC);

    // 3e. EXPANSÃO 1.2.2: CINCO PERSONAGENS EMBLEMÁTICOS DE ENCOSTA E DUNA
    // 1. Mestre Bimba - Terreiro de Capoeira do Poente (-110, -15)
    const capoeiraPos = new THREE.Vector3(-110.0, this.getFloorElevation(-110.0, -15.0), -15.0);
    const capoeiraRole = {
      title: 'Mestre de Capoeira',
      action: 'Gingando no terreiro e ensinando a tradição afro-brasileira ao som do berimbau',
      color: 0xF8FAFC
    };
    const mestreNPC = this.createNPCMesh('Mestre Bimba', capoeiraRole, capoeiraPos, [capoeiraPos], 310);
    mestreNPC.isCapoeira = true;
    mestreNPC.group.rotation.y = 1.2;
    const whiteAbadaMat = this._getSharedLambertMat(0xF8FAFC, true);
    mestreNPC.cityLegMat = whiteAbadaMat;
    mestreNPC.cityTorsoMat = whiteAbadaMat;
    if (mestreNPC.leftLeg) mestreNPC.leftLeg.material = whiteAbadaMat;
    if (mestreNPC.rightLeg) mestreNPC.rightLeg.material = whiteAbadaMat;
    if (mestreNPC.torso) mestreNPC.torso.material = whiteAbadaMat;
    const cordao = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.07, 0.34), this._getSharedLambertMat(0xDC2626, true));
    cordao.position.set(0, 0.56, 0);
    mestreNPC.group.add(cordao);
    this.npcs.push(mestreNPC);

    // 2. Dona Nair - Horta Comunitária da Encosta (-92, -25)
    const hortaPos = new THREE.Vector3(-92.0, this.getFloorElevation(-92.0, -25.0), -25.0);
    const hortaRole = {
      title: 'Agricultora Comunitária',
      action: 'Cultivando hortaliças frescas, couve e temperos na horta em socalcos',
      color: 0x15803D
    };
    const donaNair = this.createNPCMesh('Dona Nair', hortaRole, hortaPos, [hortaPos], 311);
    donaNair.isHorta = true;
    donaNair.group.rotation.y = -0.8;
    const nairGreenMat = this._getSharedLambertMat(0x16A34A, true);
    donaNair.cityTorsoMat = nairGreenMat;
    if (donaNair.torso) donaNair.torso.material = nairGreenMat;
    this.npcs.push(donaNair);

    // 3. Tiago Mototáxi - Ponto de Mototáxi do Levante (92, 14)
    const motoPos = new THREE.Vector3(92.0, this.getFloorElevation(92.0, 14.0), 14.0);
    const motoRole = {
      title: 'Mototaxista da Comunidade',
      action: 'Aguardando passageiros no ponto oficial para transportes ágeis pelas ladeiras',
      color: 0xEAB308
    };
    const tiagoMoto = this.createNPCMesh('Tiago Mototáxi', motoRole, motoPos, [motoPos], 312);
    tiagoMoto.isMototaxi = true;
    tiagoMoto.group.rotation.y = -1.6;
    const motoYellowMat = this._getSharedLambertMat(0xFACC15, true);
    tiagoMoto.cityTorsoMat = motoYellowMat;
    if (tiagoMoto.torso) tiagoMoto.torso.material = motoYellowMat;
    this.npcs.push(tiagoMoto);

    // 4. Guga do Surfe - Escola de Surfe das Dunas (126, 58)
    const surfPos = new THREE.Vector3(126.0, this.getFloorElevation(126.0, 58.0), 58.0);
    const surfRole = {
      title: 'Instrutor de Surfe',
      action: 'Encerando pranchas e instruindo jovens nas ondas cristalinas do mar',
      color: 0x0EA5E9
    };
    const gugaSurf = this.createNPCMesh('Guga do Surfe', surfRole, surfPos, [surfPos], 313);
    gugaSurf.isSurfer = true;
    this.setNPCBeachOutfit(gugaSurf, true);
    gugaSurf.group.rotation.y = 0.4;
    const waxBlock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.18), this._getSharedLambertMat(0xFEF08A, true));
    waxBlock.position.set(0.35, 0.4, 0.15);
    gugaSurf.group.add(waxBlock);
    this.npcs.push(gugaSurf);

    // 5. Jonas da Calistenia - Academia ao Ar Livre (112, -12)
    const calPos = new THREE.Vector3(112.0, this.getFloorElevation(112.0, -12.0), -12.0);
    const calRole = {
      title: 'Atleta de Calistenia',
      action: 'Executando séries de barras paralelas e flexões na academia ao ar livre',
      color: 0x1E293B
    };
    const jonasCal = this.createNPCMesh('Jonas da Calistenia', calRole, calPos, [calPos], 314);
    jonasCal.isCalistenia = true;
    jonasCal.group.rotation.y = 0.2;
    const calDarkMat = this._getSharedLambertMat(0x0F172A, true);
    jonasCal.cityTorsoMat = calDarkMat;
    if (jonasCal.torso) jonasCal.torso.material = calDarkMat;
    this.npcs.push(jonasCal);

    // 5b. Anfitriões dos Botecos e Vendas das Vilas Expandidas (Oeste, Leste e Norte)
    const frontierHosts = [
      {
        name: 'Seu Moacir do Poente',
        x: -186.0, z: -20.5, rot: 0.4, idx: 315,
        role: { title: 'Comerciante do Vale do Poente', action: 'Servindo refrescos e recebendo moradores no Boteco do Poente', color: 0x0369A1 }
      },
      {
        name: 'Dona Dalva do Levante',
        x: 186.0, z: -20.5, rot: -0.4, idx: 316,
        role: { title: 'Anfitriã do Vale do Levante', action: 'Preparando quitutes e acolhendo vizinhos no Boteco do Levante', color: 0xBE123C }
      },
      {
        name: 'Seu Bento da Sela',
        x: -6.0, z: -154.5, rot: 0.1, idx: 317,
        role: { title: 'Vendeiro da Sela da Serra', action: 'Passando café fresco para os caminhantes no topo da Serra Norte', color: 0x15803D }
      }
    ];
    frontierHosts.forEach(fh => {
      const fPos = new THREE.Vector3(fh.x, this.getFloorElevation(fh.x, fh.z), fh.z);
      const fhNpc = this.createNPCMesh(fh.name, fh.role, fPos, [fPos], fh.idx);
      fhNpc.isScenicMirante = true;
      fhNpc.group.rotation.y = fh.rot;
      this.npcs.push(fhNpc);
    });

    // 6. População dedicada de banhistas vivendo a rotina orgânica da praia (cadeiras, mar raso, fundo e luau)
    if (this.spawnDedicatedBeachgoers) {
      this.spawnDedicatedBeachgoers();
    }
    
    // Os civis agora serão chamados de forma equilibrada pela simulação!
  },

  spawnNewCivilian() {
    // Limite equilibrado para evitar superlotação visual nas ruas (máx 128 NPCs totais no mundo)
    if (this.npcs.length >= 128) return;
    if (!this.waypoints) return;
    
    const allCivilianRoles = this.roles.filter(r => !r.title.startsWith('Barraqueiro') && r.title !== 'Banhista da Praia');
    const nonSoccerRoles = allCivilianRoles.filter(r => r.title !== 'Jogador da Pelada');
    
    // Índices únicos (≥1000) para que novos moradores nunca clonem aparência/ID/vaga de samba dos iniciais
    if (this.civCount === undefined) this.civCount = 1000;
    if (this.playerCount === undefined) this.playerCount = 0;
    
    const i = this.civCount++;
    let role = allCivilianRoles[i % allCivilianRoles.length];
    // Limita a pelada do campinho a exatamente 6 jogadores (3x3) para não superlotar o campo
    if (role.title === 'Jogador da Pelada' && this.playerCount >= 6) {
      role = nonSoccerRoles[i % nonSoccerRoles.length];
    }
    const name = this.firstNames[i % this.firstNames.length];

    let startNodeId = null;
    let targetNodeId = null;
    let tacticalRole = null;
    let team = null;
    let startWp = null;
    let npcWaypoints = null;

    if (role.title === 'Jogador da Pelada') {
      npcWaypoints = this.pitchWaypoints;
      team = (this.playerCount % 2 === 0) ? 'yellow' : 'blue';
      const teamPlayerIndex = Math.floor(this.playerCount / 2) % 3; // 0: Goleiro, 1: Zagueiro, 2: Atacante
      tacticalRole = (teamPlayerIndex === 0 ? 'goleiro' : (teamPlayerIndex === 1 ? 'zagueiro' : 'atacante'));
      this.playerCount++;

      // Posições táticas iniciais distribuídas
      if (team === 'yellow') {
        if (tacticalRole === 'goleiro') startWp = new THREE.Vector3(46.2, 3.8, 4.0);
        else if (tacticalRole === 'zagueiro') startWp = new THREE.Vector3(51.0, 3.8, 1.8);
        else startWp = new THREE.Vector3(57.5, 3.8, 6.2);
      } else {
        if (tacticalRole === 'goleiro') startWp = new THREE.Vector3(63.8, 3.8, 4.0);
        else if (tacticalRole === 'zagueiro') startWp = new THREE.Vector3(59.0, 3.8, 6.2);
        else startWp = new THREE.Vector3(52.5, 3.8, 1.8);
      }
    } else {
      npcWaypoints = this.waypoints;
      // Estratifica o nascimento: 55% dos cidadãos já nascem nas áreas expandidas (Oeste, Leste e Norte)
      // para que todo o mapa tenha vida orgânica desde o primeiro segundo!
      const allValidNodes = (this.roadNodes && this.roadNodes.length > 0)
        ? this.roadNodes.filter(n => n.id !== 'sol_mirante')
        : [];
      const expandedPool = allValidNodes.filter(n =>
        n.id.startsWith('exp_') ||
        n.id.startsWith('coast_exp_') ||
        Math.abs(n.x) >= 115 ||
        n.z <= -110
      );
      const useExpanded = expandedPool.length > 0 && (i % 10 < 6); // 60% nascem nas vilas e orlas expandidas
      const spawnPool = useExpanded ? expandedPool : allValidNodes;

      if (spawnPool.length > 0) {
        const chosenNode = spawnPool[(i * 7 + Math.floor(Math.random() * spawnPool.length)) % spawnPool.length];
        startNodeId = chosenNode.id;
        startWp = chosenNode.position.clone();
        startWp.x += (Math.random() - 0.5) * 1.4;
        startWp.z += (Math.random() - 0.5) * 1.4;
        startWp.y = this.getFloorElevation(startWp.x, startWp.z);

        const nbrs = chosenNode.neighbors || [];
        targetNodeId = nbrs.length > 0 ? nbrs[Math.floor(Math.random() * nbrs.length)] : startNodeId;
      } else {
        startWp = (this.waypoints && this.waypoints[0]) ? this.waypoints[0].clone() : new THREE.Vector3(0, 0, 0);
      }
    }

    const npc = this.createNPCMesh(name, role, startWp, npcWaypoints, i, team, null, tacticalRole);
    npc.laneOffset = ((i % 7) - 3) * 0.28 + (Math.random() - 0.5) * 0.25;
    if (startNodeId) {
      npc.currentNodeId = startNodeId;
      npc.targetNodeId = targetNodeId;
      const tNode = (this.roadNodesMap && targetNodeId) ? this.roadNodesMap.get(targetNodeId) : null;
      if (tNode) {
        npc.targetPos = tNode.position.clone();
      }
    }
    this.npcs.push(npc);
    return npc;
  },

  _ensureSharedNPCAssets() {
    if (this._sharedNPCGeos) return;
    // ANATOMIA ESTILIZADA v3 (Compactada p/ 60 FPS): formas arredondadas limpas com ~65% menos triângulos
    const legGeo = at(RB(0.17, 0.32, 0.19, 0.07), 0, -0.15, 0);
    const calfGeo = merge(
      at(RB(0.14, 0.24, 0.155, 0.06), 0, -0.40, 0),
      at(new THREE.SphereGeometry(0.078, 8, 6), 0, -0.29, 0.005) // joelho arredondado
    );
    const shoeGeo = merge(
      at(RB(0.15, 0.085, 0.24, 0.04), 0, -0.525, 0.035),
      at(RB(0.13, 0.06, 0.10, 0.03), 0, -0.49, -0.02) // tornozelo/cano do tênis
    );
    const soleGeo = at(RB(0.158, 0.03, 0.255, 0.012, 1), 0, -0.567, 0.035);

    // Braço com ombro arredondado (deltoide) + manga; antebraço cilíndrico com MÃO esculpida
    const sleeveGeo = merge(
      at(new THREE.SphereGeometry(0.082, 8, 6), 0, 0.0, 0),
      at(RB(0.14, 0.22, 0.14, 0.06), 0, -0.10, 0)
    );
    const forearmGeo = merge(
      at(new THREE.CapsuleGeometry(0.05, 0.20, 2, 6), 0, -0.30, 0),
      at(RB(0.085, 0.105, 0.065, 0.032), 0, -0.47, 0.005),          // palma
      at(RB(0.03, 0.06, 0.03, 0.012, 1), 0.045, -0.445, 0.02)        // polegar
    );

    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10);
    wheelGeo.rotateZ(Math.PI / 2);

    // Tronco masculino em "V" (peitoral largo + cintura) e feminino com cintura marcada e quadril
    const shirtM = merge(
      at(RB(0.47, 0.34, 0.27, 0.08), 0, 0.13, 0),
      at(RB(0.39, 0.33, 0.235, 0.07), 0, -0.15, 0)
    );
    const shirtF = merge(
      at(RB(0.41, 0.32, 0.25, 0.08), 0, 0.14, 0),
      at(RB(0.32, 0.16, 0.21, 0.06), 0, -0.07, 0),
      at(RB(0.41, 0.17, 0.25, 0.07), 0, -0.22, 0)
    );

    // Cabeça arredondada com mandíbula/queixo suavizados (crânio seg=2 mantém close-up super macio)
    const headGeo = merge(
      at(RB(0.31, 0.30, 0.30, 0.085, 2), 0, 0.02, 0),
      at(RB(0.26, 0.12, 0.27, 0.05, 1), 0, -0.11, 0.008)
    );

    // Dome helper (boné / capacete)
    const dome = (r, sy, drop) => {
      const g = new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      g.scale(1, sy, 1);
      g.translate(0, -drop, 0);
      return g;
    };

    // Cacheado: aglomerado orgânico de cachos
    const curlyTop = merge(
      at(new THREE.IcosahedronGeometry(0.11, 0), 0, 0.02, 0),
      at(new THREE.IcosahedronGeometry(0.09, 0), -0.09, 0, 0.06),
      at(new THREE.IcosahedronGeometry(0.09, 0), 0.09, 0, 0.06),
      at(new THREE.IcosahedronGeometry(0.095, 0), -0.09, -0.01, -0.07),
      at(new THREE.IcosahedronGeometry(0.095, 0), 0.09, -0.01, -0.07),
      at(new THREE.IcosahedronGeometry(0.09, 0), 0, 0.0, 0.10)
    );

    this._sharedNPCGeos = {
      shirt: shirtM,
      shirtF,
      chestStripe: at(RB(0.48, 0.11, 0.285, 0.05), 0, 0.0, 0),
      collar: new THREE.CylinderGeometry(0.115, 0.135, 0.05, 10),
      jacketLapel: RB(0.12, 0.58, 0.285, 0.045),
      necklace: (() => { const g = new THREE.TorusGeometry(0.105, 0.014, 4, 10); g.rotateX(Math.PI / 2.4); return g; })(),
      pendant: new THREE.OctahedronGeometry(0.028, 0),
      chestPrint: RB(0.13, 0.10, 0.012, 0.004, 1),
      belt: RB(0.40, 0.05, 0.25, 0.02),
      buckle: new THREE.BoxGeometry(0.05, 0.04, 0.01),
      skirt: new THREE.CylinderGeometry(0.20, 0.27, 0.30, 12, 1, false),
      neck: new THREE.CylinderGeometry(0.072, 0.084, 0.13, 8),
      apron: RB(0.40, 0.52, 0.035, 0.015),
      armSleeve: sleeveGeo,
      armForearm: forearmGeo,
      head: headGeo,
      ear: RB(0.035, 0.085, 0.06, 0.016),
      earring: new THREE.SphereGeometry(0.018, 5, 4),
      eyeWhite: RB(0.07, 0.052, 0.012, 0.006, 1),
      eye: RB(0.034, 0.042, 0.012, 0.008, 1),
      eyeShine: new THREE.BoxGeometry(0.011, 0.011, 0.006),
      lash: new THREE.BoxGeometry(0.08, 0.014, 0.016),
      cheek: new THREE.CircleGeometry(0.026, 8),
      brow: RB(0.072, 0.022, 0.022, 0.008, 1),
      nose: merge(
        at(RB(0.04, 0.07, 0.04, 0.016), 0, 0, 0),
        at(RB(0.06, 0.028, 0.035, 0.012, 1), 0, -0.03, -0.004)
      ),
      mouth: RB(0.09, 0.022, 0.014, 0.008, 1),
      glasses: merge(
        at(new THREE.TorusGeometry(0.036, 0.007, 4, 10), -0.068, 0, 0),
        at(new THREE.TorusGeometry(0.036, 0.007, 4, 10), 0.068, 0, 0),
        at(new THREE.BoxGeometry(0.04, 0.008, 0.008), 0, 0.006, 0)
      ),
      mustache: RB(0.12, 0.032, 0.03, 0.012, 1),
      beard: merge(
        at(RB(0.29, 0.10, 0.20, 0.045), 0, 0, 0),
        at(RB(0.14, 0.05, 0.10, 0.025, 1), 0, -0.055, 0.05)
      ),
      leg: legGeo,
      calf: calfGeo,
      shoe: shoeGeo,
      sole: soleGeo,
      sunga: RB(0.40, 0.15, 0.255, 0.05),
      // Penteados & Chapéus Autênticos (formas arredondadas e volumosas)
      hairShortTop: RB(0.33, 0.10, 0.32, 0.045),
      hairShortBack: RB(0.32, 0.22, 0.07, 0.03),
      hairAfro: new THREE.IcosahedronGeometry(0.255, 1),
      hairCurlyTop: curlyTop,
      hairCurlySide: RB(0.36, 0.20, 0.27, 0.07),
      hairLongBack: RB(0.33, 0.42, 0.10, 0.045),
      hairBun: new THREE.SphereGeometry(0.105, 8, 6),
      hairPonytail: new THREE.CapsuleGeometry(0.048, 0.18, 2, 6),
      hairFringe: RB(0.30, 0.05, 0.05, 0.02, 1),
      headband: RB(0.335, 0.05, 0.325, 0.02),
      turbanCrown: new THREE.SphereGeometry(0.195, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.62),
      turbanKnot: new THREE.IcosahedronGeometry(0.075, 0),
      panamaBrim: new THREE.CylinderGeometry(0.30, 0.32, 0.03, 12),
      panamaCrown: new THREE.CylinderGeometry(0.16, 0.19, 0.15, 10),
      panamaBand: new THREE.CylinderGeometry(0.185, 0.192, 0.04, 10),
      strawHat: new THREE.CylinderGeometry(0.30, 0.46, 0.12, 12),
      fishHat: new THREE.CylinderGeometry(0.24, 0.42, 0.14, 12),
      farmHat: new THREE.CylinderGeometry(0.22, 0.50, 0.12, 12),
      visorHat: RB(0.40, 0.08, 0.46, 0.03),
      beretHat: (() => { const g = new THREE.SphereGeometry(0.2, 10, 6); g.scale(1, 0.32, 1.05); return g; })(),
      capCrown: dome(0.178, 0.78, 0.06),
      capVisor: RB(0.30, 0.025, 0.17, 0.012, 1),
      backpack: RB(0.31, 0.38, 0.15, 0.06),
      crossbodyBag: RB(0.10, 0.20, 0.19, 0.03),
      strap: new THREE.BoxGeometry(0.035, 0.66, 0.02),
      fishBasket: new THREE.CylinderGeometry(0.18, 0.14, 0.26, 8),
      fishTail: new THREE.ConeGeometry(0.08, 0.22, 4),
      farmBasket: RB(0.28, 0.20, 0.24, 0.04),
      greens: new THREE.IcosahedronGeometry(0.12, 0),
      crate: new THREE.BoxGeometry(0.32, 0.22, 0.28),
      fruit: new THREE.SphereGeometry(0.09, 6, 5),
      cup: new THREE.CylinderGeometry(0.08, 0.06, 0.20, 8),
      straw: new THREE.CylinderGeometry(0.012, 0.012, 0.26, 4),
      shades: merge(
        at(RB(0.115, 0.06, 0.02, 0.02, 1), -0.068, 0, 0),
        at(RB(0.115, 0.06, 0.02, 0.02, 1), 0.068, 0, 0),
        at(new THREE.BoxGeometry(0.34, 0.015, 0.015), 0, 0.022, 0)
      ),
      sunVisor: new THREE.CylinderGeometry(0.38, 0.42, 0.09, 10),
      towel: RB(0.22, 0.62, 0.32, 0.04),
      helmetCrown: dome(0.215, 0.72, 0.075),
      helmetBrim: new THREE.CylinderGeometry(0.255, 0.255, 0.03, 12),
      toolHandle: new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6),
      pickHead: RB(0.36, 0.08, 0.08, 0.025),
      cartTub: RB(0.72, 0.36, 0.90, 0.06),
      cartWheel: wheelGeo,
      cartHandle: new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6).rotateX(Math.PI / 2),
      brickCargo: new THREE.BoxGeometry(0.58, 0.24, 0.70)
    };
    this._sharedNPCMats = new Map();
    this._sharedSkinMats = new Map();
    this._npcVertexMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: false });
    this._npcMergedCache = new Map();

    // Geometrias compostas pré-fundidas compartilhadas por todos os NPCs (1 draw call por prop)
    const G = this._sharedNPCGeos;
    this._npcMergedCache.set('hand_fish', mergeColoredParts([
      { geo: G.fishBasket, color: 0x78350F },
      { geo: G.fishTail, color: 0x94A3B8, pos: [0, 0.14, 0], rot: [Math.PI, 0, 0] }
    ]));
    this._npcMergedCache.set('hand_farm', mergeColoredParts([
      { geo: G.farmBasket, color: 0xA16207 },
      { geo: G.greens, color: 0x16A34A, pos: [0, 0.12, 0] }
    ]));
    this._npcMergedCache.set('hand_merch', mergeColoredParts([
      { geo: G.crate, color: 0x854D0E },
      { geo: G.fruit, color: 0xEA580C, pos: [0, 0.12, 0] }
    ]));
    this._npcMergedCache.set('hand_drink', mergeColoredParts([
      { geo: G.cup, color: 0x10B981 },
      { geo: G.straw, color: 0xFEF08A, pos: [0.02, 0.12, 0], rot: [0, 0, -0.2] }
    ]));
    this._npcMergedCache.set('builder_helmet', mergeColoredParts([
      { geo: G.helmetCrown, color: 0xFACC15, pos: [0, 1.60, 0] },
      { geo: G.helmetBrim, color: 0xFACC15, pos: [0, 1.53, 0] }
    ]));
    this._npcMergedCache.set('tool_arm', mergeColoredParts([
      { geo: G.toolHandle, color: 0x5C4033, pos: [0, -0.12, 0] },
      { geo: G.pickHead, color: 0x94A3B8, pos: [0, 0.22, 0] }
    ]));
    this._npcMergedCache.set('cart_body', mergeColoredParts([
      { geo: G.cartTub, color: 0x6C4A2D, pos: [0, 0.18, 0] },
      { geo: G.cartHandle, color: 0x6C4A2D, pos: [-0.32, 0.35, -0.65] },
      { geo: G.cartHandle, color: 0x6C4A2D, pos: [0.32, 0.35, -0.65] },
      { geo: G.brickCargo, color: 0xB55338, pos: [0, 0.32, 0] }
    ]));
  },

  _getCachedMergedGeo(key, partsBuilder) {
    let geo = this._npcMergedCache.get(key);
    if (!geo) {
      geo = mergeColoredParts(partsBuilder());
      this._npcMergedCache.set(key, geo);
    }
    return geo;
  },

  _getSharedLambertMat(color, flatShading = true) {
    this._ensureSharedNPCAssets();
    // Sombreamento suave em todas as peças (formas arredondadas ficam orgânicas, sem facetas duras)
    const key = `L_${color}`;
    let m = this._sharedNPCMats.get(key);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color, flatShading: false });
      this._sharedNPCMats.set(key, m);
    }
    return m;
  },

  // Cache estritamente isolado para tons de pele humanos (nunca compartilha referência mutável com roupas!)
  _getSharedSkinMat(skinColor) {
    this._ensureSharedNPCAssets();
    let m = this._sharedSkinMats.get(skinColor);
    if (!m) {
      // Leve emissivo quente simula dispersão subsuperficial (pele viva, nunca acinzentada nas sombras)
      const warm = new THREE.Color(skinColor).multiplyScalar(0.12);
      m = new THREE.MeshLambertMaterial({ color: skinColor, emissive: warm, flatShading: false });
      this._sharedSkinMats.set(skinColor, m);
    }
    return m;
  },

  createNPCMesh(name, role, startPos, waypoints, index, team = null, stallObj = null, tacticalRole = null) {
    this._ensureSharedNPCAssets();
    const G = this._sharedNPCGeos;
    const npcGroup = new THREE.Group();
    npcGroup.position.copy(startPos);

    // Hash determinístico por cidadão para criar variedade visual rica e única
    const seedA = ((index * 2654435761) >>> 0) % 997;
    const seedB = ((index * 1597334677 + (name ? name.length * 37 : 13)) >>> 0) % 991;

    // Variação natural de estatura e porte físico (93% a 106%)
    const scaleY = 0.94 + (seedA % 13) * 0.01;
    const scaleXZ = 0.94 + (seedB % 14) * 0.01;
    npcGroup.scale.set(scaleXZ, scaleY, scaleXZ);

    const isBanhista = (role.title === 'Banhista da Praia');
    const isBarraqueiro = role.title.startsWith('Barraqueiro');
    const isSoccerPlayer = (role.title === 'Jogador da Pelada');

    // Identificação de gênero/idade pelo nome para feições, barba e penteados coerentes
    const firstNameToken = (name || '').split(' ')[0];
    const isElder = firstNameToken === 'Seu' || firstNameToken === 'Dona' || firstNameToken === 'Mestre';
    const femaleNames = new Set([
      'Camila', 'Dona', 'Beatriz', 'Iara', 'Valéria', 'Júlia', 'Larissa',
      'Aline', 'Mariana', 'Renata', 'Letícia', 'Priscila', 'Juliana',
      'Bruna', 'Amanda', 'Natália', 'Carolina', 'Fernanda', 'Teresa', 'Cida', 'Nair'
    ]);
    const secondToken = (name || '').split(' ')[1] || '';
    const isFemale = femaleNames.has(firstNameToken) || firstNameToken === 'Dona' || femaleNames.has(secondToken);

    // 1. PALETA DE 10 TONS DE PELE HUMANOS REALISTAS (Diversidade Brasileira Autêntica)
    const skinPalette = [
      0xF4C9AC, // Pele clara rosada/pêssego
      0xECC09C, // Pele clara dourada
      0xE2AF84, // Trigo / bronzeado leve
      0xD59B6A, // Morena clara / oliva
      0xC68642, // Parda dourada
      0xB27138, // Morena média quente
      0x995C2B, // Parda intensa / canela
      0x844C21, // Negra clara / mogno
      0x683A18, // Negra média / café
      0x4A2711  // Negra retinta / ébano
    ];
    const skinColor = skinPalette[(index + (seedA % 7)) % skinPalette.length];
    const skinMat = this._getSharedSkinMat(skinColor);

    // 2. PALETA DE CABELOS NATURAIS (Preto, Castanho Escuro, Castanho Médio, Ruivo/Acobreado, Loiro Escuro e Grisalho para Idosos)
    const hairPalette = [
      0x141416, // Preto intenso
      0x1F1917, // Preto natural
      0x2D1E18, // Castanho café
      0x3E2723, // Castanho escuro
      0x5D4037, // Castanho médio
      0x7C3F1D, // Castanho acobreado
      0xA16207  // Loiro mel / dourado
    ];
    const hairColor = isElder
      ? ((index % 2 === 0) ? 0xD1D5DB : 0x9CA3AF) // Cabelo grisalho/prateado de respeito para Seu/Dona/Mestre
      : hairPalette[(index + (seedB % 5)) % hairPalette.length];
    const hairMat = this._getSharedLambertMat(hairColor, true);

    // 3. TORSO / CAMISA COM CAMADAS E DETALHES CARIOCAS
    const shirtPalette = [
      role.color, 0xE76F51, 0x2A9D8F, 0x2563EB, 0xF59E0B,
      0xDB2777, 0x7C3AED, 0x059669, 0xDC2626, 0x0284C7,
      0xEA580C, 0xF8FAFC, 0x14B8A6, 0xE11D48
    ];
    let shirtColor = (index % 3 === 0) ? role.color : shirtPalette[(index + seedA) % shirtPalette.length];
    if (isSoccerPlayer && team) {
      shirtColor = (team === 'yellow') ? 0xFACC15 : 0x0284C7;
    }

    const cityTorsoMat = isBarraqueiro
      ? this._getSharedLambertMat(0xF8FAFC, true)
      : this._getSharedLambertMat(shirtColor, true);

    const isBareChest = !isFemale && (index % 2 === 0);
    const topColors = [0x06B6D4, 0xF43F5E, 0xFACC15, 0x10B981, 0x8B5CF6, 0xEC4899, 0xF97316];
    const beachTorsoMat = isBareChest
      ? skinMat
      : this._getSharedLambertMat(topColors[(index + seedB) % topColors.length], true);

    const torso = new THREE.Mesh(isFemale ? G.shirtF : G.shirt, cityTorsoMat);
    torso.position.y = 0.85;
    torso.castShadow = true;
    npcGroup.add(torso);

    // Saia/vestido rodado para parte das moradoras (pernas à mostra em tom de pele)
    const wearsSkirt = isFemale && !isBarraqueiro && !isBanhista && !isSoccerPlayer && (seedB % 3 === 0);
    const darkenColor = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
    const vMat = this._npcVertexMat;

    // Detalhes de vestuário urbano no tronco compactados em 1 único draw call (gola, listra, colete, cordão, cinto/saia, mochila, avental)
    const cityParts = [];

    if (!isBarraqueiro && !isBanhista) {
      const styleVariant = (index + seedA) % 5;
      if (styleVariant === 0 || isSoccerPlayer) {
        const stripeColors = [0xF8FAFC, 0x111827, 0xFACC15, 0xEF4444, 0x38BDF8];
        const stripeCol = isSoccerPlayer
          ? (team === 'yellow' ? 0x15803D : 0xF8FAFC)
          : stripeColors[seedB % stripeColors.length];
        cityParts.push({
          geo: G.chestStripe,
          color: stripeCol,
          pos: [0, 0.06, 0],
          scale: isFemale ? [0.87, 1, 0.89] : null
        });
      } else if (styleVariant === 1) {
        cityParts.push({ geo: G.collar, color: 0xF8FAFC, pos: [0, 0.30, 0.02] });
      } else if (styleVariant === 2) {
        const jacketColors = [0x1E293B, 0x78350F, 0x1E3A8A, 0x065F46, 0x9A3412];
        const jCol = jacketColors[seedB % jacketColors.length];
        cityParts.push(
          { geo: G.jacketLapel, color: jCol, pos: [-0.175, -0.02, 0] },
          { geo: G.jacketLapel, color: jCol, pos: [0.175, -0.02, 0] }
        );
      } else if (styleVariant === 3) {
        cityParts.push(
          { geo: G.necklace, color: 0xFBBF24, pos: [0, 0.26, 0.03] },
          { geo: G.pendant, color: 0xFBBF24, pos: [0, 0.17, 0.142] }
        );
      } else {
        const printCols = [0xF8FAFC, 0x111827, 0xFACC15, 0xF97316, 0x22C55E];
        cityParts.push({
          geo: G.chestPrint,
          color: printCols[(seedA + index) % printCols.length],
          pos: [0, 0.13, isFemale ? 0.128 : 0.138]
        });
      }

      if (wearsSkirt) {
        const skirtCols = [0x7C2D12, 0x1E3A8A, 0xBE185D, 0x0F766E, 0xF5F5F4, 0x6D28D9, 0xCA8A04];
        cityParts.push({ geo: G.skirt, color: skirtCols[(index + seedA) % skirtCols.length], pos: [0, -0.40, 0] });
      } else if (!isFemale && !isSoccerPlayer) {
        const beltCols = [0x3F2A1D, 0x111827, 0x57534E];
        cityParts.push(
          { geo: G.belt, color: beltCols[seedB % beltCols.length], pos: [0, -0.285, 0] },
          { geo: G.buckle, color: 0xD4D4D8, pos: [0, -0.285, 0.128] }
        );
      }
    }

    // Mochila ou bolsa tiracolo (35% dos civis)
    if (!isBarraqueiro && !isBanhista && !isSoccerPlayer && index % 3 === 1) {
      const packColors = [0x334155, 0x991B1B, 0x1E40AF, 0x065F46, 0x92400E, 0x4C1D95];
      const packCol = packColors[(index + seedB) % packColors.length];
      const strapCol = darkenColor(packCol, 0.6);
      if (seedA % 2 === 0) {
        cityParts.push(
          { geo: G.backpack, color: packCol, pos: [0, 0.04, -0.20] },
          { geo: G.strap, color: strapCol, pos: [-0.12, 0.10, 0.138], scale: [1, 0.55, 1] },
          { geo: G.strap, color: strapCol, pos: [0.12, 0.10, 0.138], scale: [1, 0.55, 1] }
        );
      } else {
        cityParts.push(
          { geo: G.crossbodyBag, color: packCol, pos: [0.26, -0.18, 0.04] },
          { geo: G.strap, color: strapCol, pos: [0.02, 0.06, 0.14], rot: [0, 0, 0.72] }
        );
      }
    }

    // Avental frontal para Barraqueiros
    if (isBarraqueiro) {
      let apronColor = 0x2D6A4F;
      if (role.stallId === 'mate') apronColor = 0xEA580C;
      else if (role.stallId === 'acai') apronColor = 0x7E22CE;
      else if (role.stallId === 'petiscos') apronColor = 0xDC2626;
      cityParts.push({ geo: G.apron, color: apronColor, pos: [0, -0.02, 0.16] });
    }

    const cityClothesDetails = cityParts.length > 0
      ? new THREE.Mesh(mergeColoredParts(cityParts), vMat)
      : new THREE.Group();
    torso.add(cityClothesDetails);

    // 4. BRAÇOS ARTICULADOS NO OMBRO (1 único draw call por braço, geometrias em cache por cor de manga/pele!)
    const citySleeveHex = isBarraqueiro ? 0xF8FAFC : shirtColor;
    const citySleeveMat = isBarraqueiro ? this._getSharedLambertMat(0xF8FAFC, true) : cityTorsoMat;
    const beachSleeveMat = skinMat;

    const cityArmGeo = this._getCachedMergedGeo(`arm_c_${citySleeveHex}_${skinColor}`, () => [
      { geo: G.armSleeve, color: citySleeveHex },
      { geo: G.armForearm, color: skinColor, skinWarm: true }
    ]);
    const beachArmGeo = this._getCachedMergedGeo(`arm_b_${skinColor}`, () => [
      { geo: G.armSleeve, color: skinColor, skinWarm: true },
      { geo: G.armForearm, color: skinColor, skinWarm: true }
    ]);

    const leftArm = new THREE.Mesh(cityArmGeo, vMat);
    leftArm.position.set(-0.31, 1.06, 0);
    npcGroup.add(leftArm);

    const rightArm = new THREE.Mesh(cityArmGeo, vMat);
    rightArm.position.set(0.31, 1.06, 0);
    npcGroup.add(rightArm);

    // 5. CABEÇA HUMANA + PESCOÇO + ROSTO EXPRESSIVO COMPACTADOS EM 1 ÚNICO DRAW CALL!
    const irisPalette = [0x3B2414, 0x4A2C17, 0x2B1A10, 0x5B3A1E, 0x1F1A17, 0x3F5F3A, 0x35556E];
    const irisColor = (seedB % 9 < 7) ? irisPalette[seedB % 5] : irisPalette[5 + (seedA % 2)];
    const hasFullBeard = !isFemale && (isElder || seedA % 4 === 0) && (seedB % 2 === 0 || isElder);
    const hasMustache = !isFemale && !hasFullBeard && seedA % 4 === 0;
    const lipBase = new THREE.Color(skinColor).multiplyScalar(0.62);
    if (isFemale) lipBase.lerp(new THREE.Color(seedA % 3 === 0 ? 0xB91C1C : 0xBE5A6A), 0.45);
    const blushHex = isFemale ? new THREE.Color(skinColor).lerp(new THREE.Color(0xE11D48), 0.22).getHex() : 0;

    const headParts = [
      { geo: G.head, color: skinColor, skinWarm: true },
      { geo: G.neck, color: skinColor, skinWarm: true, pos: [0, -0.17, 0] },
      { geo: G.ear, color: skinColor, skinWarm: true, pos: [-0.162, -0.005, 0] },
      { geo: G.ear, color: skinColor, skinWarm: true, pos: [0.162, -0.005, 0] },
      { geo: G.nose, color: skinColor, skinWarm: true, pos: [0, -0.012, 0.158] },
      { geo: G.brow, color: hairColor, pos: [-0.068, 0.072, 0.153], rot: [0, 0, isFemale ? 0.12 : 0.06] },
      { geo: G.brow, color: hairColor, pos: [0.068, 0.072, 0.153], rot: [0, 0, isFemale ? -0.12 : -0.06] },
      { geo: G.mouth, color: lipBase.getHex(), pos: [0, -0.092, hasFullBeard ? 0.162 : 0.148] }
    ];

    if (isFemale && seedA % 2 === 0) {
      const earringCol = seedB % 2 === 0 ? 0xFBBF24 : 0xE5E7EB;
      headParts.push(
        { geo: G.earring, color: earringCol, pos: [-0.168, -0.055, 0.005] },
        { geo: G.earring, color: earringCol, pos: [0.168, -0.055, 0.005] }
      );
    }

    [-1, 1].forEach(side => {
      const ex = side * 0.066;
      headParts.push(
        { geo: G.eyeWhite, color: 0xF5F1EA, pos: [ex, 0.025, 0.150] },
        { geo: G.eye, color: irisColor, pos: [ex + side * -0.006, 0.022, 0.156] },
        { geo: G.eyeShine, color: 0xFFFFFF, pos: [ex + side * -0.006 + 0.008, 0.033, 0.161] }
      );
      if (isFemale) {
        headParts.push(
          { geo: G.lash, color: 0x111111, pos: [ex, 0.052, 0.154], rot: [0, 0, side * -0.12] },
          { geo: G.cheek, color: blushHex, pos: [side * 0.095, -0.035, 0.1515] }
        );
      }
    });

    if (hasFullBeard) {
      headParts.push({ geo: G.beard, color: hairColor, pos: [0, -0.14, 0.055] });
    } else if (hasMustache) {
      headParts.push({ geo: G.mustache, color: hairColor, pos: [0, -0.066, 0.152] });
    }

    if (isElder ? (index % 2 === 0) : (seedB % 11 === 0)) {
      const frameCols = [0x111827, 0x7C2D12, 0xB45309];
      headParts.push({ geo: G.glasses, color: frameCols[seedA % frameCols.length], pos: [0, 0.024, 0.163] });
    }

    const head = new THREE.Mesh(mergeColoredParts(headParts), vMat);
    head.position.y = 1.37;
    npcGroup.add(head);

    // Identificação de papéis profissionais especializados
    const isFishermanRole = role.title.includes('Pescador') || role.title.includes('Barqueiro');
    const isFarmerRole = role.title.includes('Agricultor') || role.title.includes('Horta');
    const isMerchantRole = role.title.includes('Feirante');
    const isLighthouseRole = role.title.includes('Farol');
    const isMusicianRole = role.title.includes('Músico') || role.title.includes('Samba');

    // 6. PENTEADOS AUTÊNTICOS & CHAPÉUS CARIOCAS COMPACTADOS EM 1 ÚNICO DRAW CALL (oculta limpo quando põe capacete de obra!)
    const hatParts = [
      { geo: G.hairShortBack, color: hairColor, pos: [0, 0.02, -0.145] }
    ];

    if (isBarraqueiro) {
      if (role.stallId === 'coco') {
        hatParts.push({ geo: G.strawHat, color: 0xD4A373, pos: [0, 0.21, 0] });
      } else {
        let visorColor = 0x15803D;
        if (role.stallId === 'acai') visorColor = 0x06B6D4;
        else if (role.stallId === 'petiscos') visorColor = 0xDC2626;
        hatParts.push(
          { geo: G.hairShortTop, color: hairColor, pos: [0, 0.17, 0] },
          { geo: G.visorHat, color: visorColor, pos: [0, 0.14, 0.05] }
        );
      }
    } else if (isFishermanRole) {
      hatParts.push({ geo: G.fishHat, color: 0xD4A373, pos: [0, 0.20, 0] });
    } else if (isFarmerRole) {
      hatParts.push({ geo: G.farmHat, color: 0xCA8A04, pos: [0, 0.20, 0] });
    } else if (isMerchantRole) {
      hatParts.push({ geo: G.beretHat, color: 0x059669, pos: [0, 0.19, 0] });
    } else if (isLighthouseRole) {
      hatParts.push(
        { geo: G.capCrown, color: 0xF8FAFC, pos: [0, 0.20, 0] },
        { geo: G.capVisor, color: 0x0F172A, pos: [0, 0.15, 0.22] }
      );
    } else if (isMusicianRole || (!isFemale && seedA % 9 === 0)) {
      const bandCol = (index % 2 === 0) ? 0x111827 : 0xDC2626;
      hatParts.push(
        { geo: G.panamaBrim, color: 0xFEF3C7, pos: [0, 0.17, 0] },
        { geo: G.panamaCrown, color: 0xFEF3C7, pos: [0, 0.25, 0] },
        { geo: G.panamaBand, color: bandCol, pos: [0, 0.20, 0] }
      );
    } else {
      const hairStyle = isFemale ? (seedA % 5) : (seedA % 6);
      if (isFemale && hairStyle === 0) {
        const bandCols = [0xF43F5E, 0xFACC15, 0x06B6D4, 0x10B981, 0xA855F7];
        hatParts.push(
          { geo: G.hairShortTop, color: hairColor, pos: [0, 0.16, 0] },
          { geo: G.hairBun, color: hairColor, pos: [0, 0.29, -0.06] },
          { geo: G.headband, color: bandCols[index % bandCols.length], pos: [0, 0.14, 0.01] }
        );
      } else if (isFemale && hairStyle === 1) {
        hatParts.push(
          { geo: G.hairShortTop, color: hairColor, pos: [0, 0.165, 0] },
          { geo: G.hairLongBack, color: hairColor, pos: [0, -0.06, -0.14] },
          { geo: G.hairFringe, color: hairColor, pos: [0.02, 0.125, 0.145], rot: [0, 0, -0.18] },
          { geo: G.hairPonytail, color: hairColor, pos: [-0.155, -0.02, -0.02], scale: [0.9, 1.15, 1.4] },
          { geo: G.hairPonytail, color: hairColor, pos: [0.155, -0.02, -0.02], scale: [0.9, 1.15, 1.4] }
        );
      } else if (isFemale && hairStyle === 2) {
        const turbCols = [0xF59E0B, 0xEC4899, 0x8B5CF6, 0x10B981, 0xEF4444];
        const tCol = turbCols[(index + seedB) % turbCols.length];
        hatParts.push(
          { geo: G.turbanCrown, color: tCol, pos: [0, 0.065, 0], scale: [1.0, 1.05, 1.02] },
          { geo: G.turbanKnot, color: tCol, pos: [0, 0.215, 0.12] }
        );
      } else if (isFemale && hairStyle === 3) {
        const scCol = [0xF43F5E, 0x06B6D4, 0xFACC15][index % 3];
        hatParts.push(
          { geo: G.hairShortTop, color: hairColor, pos: [0, 0.165, 0] },
          { geo: G.hairPonytail, color: hairColor, pos: [0, 0.0, -0.20], rot: [0.35, 0, 0] },
          { geo: G.earring, color: scCol, pos: [0, 0.11, -0.175], scale: [2.2, 2.2, 2.2] }
        );
      } else if (hairStyle === 4) {
        hatParts.push({ geo: G.hairAfro, color: hairColor, pos: [0, 0.15, -0.02] });
      } else if (!isFemale && hairStyle === 0) {
        hatParts.push({ geo: G.hairShortTop, color: hairColor, pos: [0, 0.165, 0] });
      } else if (!isFemale && hairStyle === 1) {
        hatParts.push(
          { geo: G.hairCurlyTop, color: hairColor, pos: [0, 0.18, 0] },
          { geo: G.hairCurlySide, color: hairColor, pos: [0, 0.08, -0.02] }
        );
      } else if (!isFemale && (hairStyle === 2 || hairStyle === 3)) {
        const capColors = [0x1E3A8A, 0xDC2626, 0x111827, 0x047857, 0xD97706, 0xF8FAFC];
        const cCol = capColors[(index + seedB) % capColors.length];
        const backwards = (hairStyle === 3);
        hatParts.push(
          { geo: G.capCrown, color: cCol, pos: [0, 0.185, 0] },
          { geo: G.capVisor, color: cCol, pos: [0, 0.13, backwards ? -0.2 : 0.2] }
        );
      } else {
        hatParts.push({ geo: G.hairShortTop, color: hairColor, pos: [0, 0.165, 0] });
      }
    }

    const hat = new THREE.Mesh(mergeColoredParts(hatParts), vMat);
    head.add(hat);

    // 7. ACESSÓRIO DA MÃO / OFÍCIO (1 único draw call compartilhado do cache!)
    const handKey = isFishermanRole ? 'hand_fish' : (isFarmerRole ? 'hand_farm' : (isMerchantRole ? 'hand_merch' : 'hand_drink'));
    const handItem = new THREE.Mesh(this._npcMergedCache.get(handKey), vMat);
    handItem.position.set(-0.35, 0.65, 0.12);
    handItem.visible = isFishermanRole || isFarmerRole || isMerchantRole;
    npcGroup.add(handItem);

    // 8. ACESSÓRIOS DE PRAIA (1 único draw call em cache!)
    const towelCol = (index % 3 === 0) ? [0xF59E0B, 0x10B981, 0xEC4899, 0x3B82F6][index % 4] : null;
    const beachAccGeo = this._getCachedMergedGeo(`beachAcc_${towelCol ?? 'none'}`, () => {
      const parts = [{ geo: G.shades, color: 0x111111, pos: [0, 1.40, 0.165] }];
      if (towelCol !== null) parts.push({ geo: G.towel, color: towelCol, pos: [0.26, 0.88, 0] });
      return parts;
    });
    const beachAccGroup = new THREE.Mesh(beachAccGeo, vMat);
    beachAccGroup.visible = false;
    npcGroup.add(beachAccGroup);

    // Capacete Amarelo de Obra (1 draw call em cache!)
    const helmetGroup = new THREE.Mesh(this._npcMergedCache.get('builder_helmet'), vMat);
    helmetGroup.visible = false;
    npcGroup.add(helmetGroup);

    // Ferramenta de Obra (1 draw call em cache!)
    const toolArm = new THREE.Mesh(this._npcMergedCache.get('tool_arm'), vMat);
    toolArm.position.set(0.32, 1.05, 0);
    toolArm.visible = false;
    npcGroup.add(toolArm);

    // Carrinho de Mão da Olaria (corpo fundido em 1 draw call + roda giratória)
    const cartGroup = new THREE.Group();
    cartGroup.position.set(0, 0.38, 0.85);
    cartGroup.add(new THREE.Mesh(this._npcMergedCache.get('cart_body'), vMat));
    const cartWheel = new THREE.Mesh(G.cartWheel, this._getSharedLambertMat(0x334155, true));
    cartWheel.position.set(0, 0.02, 0.52);
    cartGroup.add(cartWheel);
    cartGroup.visible = false;
    npcGroup.add(cartGroup);

    // 9. PERNAS ARTICULADAS (1 único draw call por perna com geometrias em cache para cidade & praia!)
    const pantsPalette = [
      0x1E3A8A, // Jeans azul clássico
      0x1E293B, // Calça sarja escura
      0x374151, // Grafite urbano
      0x0F172A, // Preto social/esportivo
      0x78350F, // Cáqui / Marrom
      0x2563EB, // Jeans claro
      0x065F46, // Bermuda cargo verde-militar
      0xD97706  // Mostarda / Linho
    ];
    let cityLegColor = isBarraqueiro ? 0x334155 : pantsPalette[(index + seedB) % pantsPalette.length];
    if (isSoccerPlayer && team) {
      cityLegColor = (team === 'yellow') ? 0x1E3A8A : 0xF8FAFC;
    }
    const cityLegMat = wearsSkirt ? skinMat : this._getSharedLambertMat(cityLegColor, true);

    const wearsShortsInCity = wearsSkirt || isSoccerPlayer || (!isElder && (seedA % 2 === 0));
    const cityCalfMat = wearsShortsInCity ? skinMat : cityLegMat;

    const isSunga = (index % 2 === 1);
    const boardshortColors = [0x0284C7, 0x10B981, 0xF97316, 0xEC4899, 0x8B5CF6, 0xEAB308];
    const beachLegHex = isSunga ? skinColor : boardshortColors[(index + seedA) % boardshortColors.length];
    const beachLegMat = isSunga ? skinMat : this._getSharedLambertMat(beachLegHex, true);

    const shoeColors = [0xF8FAFC, 0x111827, 0x78350F, 0xDC2626, 0x1E40AF, 0x334155];
    const shoeHex = shoeColors[(index + seedA) % shoeColors.length];
    const soleHex = shoeHex === 0xF8FAFC ? 0x9CA3AF : (shoeHex === 0x78350F ? 0x292524 : 0xF1F5F9);

    const cityThighHex = wearsSkirt ? skinColor : cityLegColor;
    const cityCalfHex = wearsShortsInCity ? skinColor : cityLegColor;
    const cityLegGeo = this._getCachedMergedGeo(
      `leg_c_${cityThighHex}_${cityCalfHex}_${shoeHex}_${soleHex}_${wearsSkirt ? 1 : 0}_${wearsShortsInCity ? 1 : 0}`,
      () => [
        { geo: G.leg, color: cityThighHex, skinWarm: wearsSkirt },
        { geo: G.calf, color: cityCalfHex, skinWarm: wearsShortsInCity },
        { geo: G.shoe, color: shoeHex },
        { geo: G.sole, color: soleHex }
      ]
    );
    const beachLegGeo = this._getCachedMergedGeo(
      `leg_b_${beachLegHex}_${skinColor}_${isSunga ? 1 : 0}`,
      () => [
        { geo: G.leg, color: beachLegHex, skinWarm: isSunga },
        { geo: G.calf, color: skinColor, skinWarm: true }
      ]
    );

    const leftLeg = new THREE.Mesh(cityLegGeo, vMat);
    leftLeg.position.set(-0.11, 0.58, 0);
    npcGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(cityLegGeo, vMat);
    rightLeg.position.set(0.11, 0.58, 0);
    npcGroup.add(rightLeg);

    let sungaBrief = null;
    if (isSunga) {
      const sungaColor = [0xEF4444, 0x06B6D4, 0x8B5CF6, 0x10B981, 0xF59E0B][index % 5];
      sungaBrief = new THREE.Mesh(G.sunga, this._getSharedLambertMat(sungaColor, true));
      sungaBrief.position.set(0, 0.53, 0);
      sungaBrief.visible = false;
      npcGroup.add(sungaBrief);
    }

    this.group.add(npcGroup);

    const targetIdx = (index + 2) % (waypoints.length || 1);
    const target = waypoints.length > 0 ? waypoints[targetIdx].clone() : startPos.clone();

    return {
      id: `npc_${index}`,
      name: `${name} (${role.title}${team ? (team === 'yellow' ? ' - Amarelo' : ' - Azul') : ''}${tacticalRole ? ` [${tacticalRole.toUpperCase()}]` : ''})`,
      citizenName: name,
      role: role.title,
      team,
      tacticalRole,
      originalAction: role.action,
      currentAction: role.action,
      group: npcGroup,
      torso,
      head,
      leftArm,
      rightArm,
      cityArmGeo,
      beachArmGeo,
      cityLegGeo,
      beachLegGeo,
      cityClothesDetails,
      hat,
      handItem,
      isFishermanRole,
      isFarmerRole,
      isMerchantRole,
      isLighthouseRole,
      // Micro-economia comunitária orgânica
      wallet: 15 + Math.floor(Math.random() * 25),
      purchaseCooldown: 8.0 + Math.random() * 20.0,
      holdingDrinkTimer: 0,
      builderHelmet: helmetGroup,
      toolArm,
      cartGroup,
      cartWheel,
      leftLeg,
      rightLeg,
      originalColor: shirtColor,
      skinMat,
      cityTorsoMat,
      beachTorsoMat,
      citySleeveMat,
      beachSleeveMat,
      cityLegMat,
      cityCalfMat,
      beachLegMat,
      beachAccGroup,
      sungaBrief,
      isWearingBeachwear: false,
      beachTrip: {
        state: 'idle', // 'idle', 'going_to_beach', 'at_beach', 'returning'
        chosenEntrance: null,
        targetSpot: null,
        beachTimer: 0,
        hasPurchased: false
      },
      sambaState: {
        isParticipant: (index >= 0 && index < 24), // 24 Músicos e Boêmios na Roda!
        slotIndex: (index >= 0 && index < 24) ? index : 0,
        isActive: false
      },
      // Vida Noturna nas Ruas: Encontros sociais e papos na calçada
      chatPartner: null,
      chatTimer: 0,
      chatCooldown: 8.0 + Math.random() * 20.0,
      targetPos: target,
      currentWpIndex: targetIdx,
      currentNodeId: null,
      targetNodeId: null,
      lastNodeId: null,
      pathQueue: [],
      sambaRoutingActive: false,
      waypoints,
      speed: 1.8 + Math.random() * 0.6,
      speedMult: 0.88 + Math.random() * 0.24, // Variação orgânica do passo
      glanceTimer: 2.0 + Math.random() * 4.0,
      greetingTimer: 0,
      walkCycle: Math.random() * 10,
      waitTimer: 0,
      // Beach Roles State:
      isBarraqueiro,
      assignedStall: stallObj,
      saleTimer: 0,
      isBanhista,
      // Real Citizen Worker State:
      isBuilder: false,
      builderState: 'idle',
      assignedSite: null,
      workerSpot: null,
      cheerTimer: 0,
      // Wheelbarrow Courier State:
      isCourier: false,
      courierState: 'idle',
      courierSite: null,
      onDelivered: null,
      cartRattleTimer: 0,
      // Soccer Player State:
      team,
      kickTimer: 0,
      // Anti-Stuck & Watchdog Monitor:
      stuckCheckTimer: Math.random() * 1.5,
      stuckLastPos: new THREE.Vector3(startPos.x, startPos.y, startPos.z)
    };
  },

  // DYNAMIC OUTFIT SYSTEM:
  // Automatically transforms citizens into swimwear upon reaching the sand (Z >= 24)
  // and back into street clothes when returning to the morro (Z < 21)!
  setNPCBeachOutfit(npc, isBeach) {
    if (npc.isBarraqueiro || npc.role === 'Jogador da Pelada' || npc.isScenicMirante || npc.isFisherman || npc.isCapoeira || npc.isHorta || npc.isMototaxi || npc.isCalistenia) return;
    if (npc.isBuilder || npc.isCourier) return;

    if (isBeach && !npc.isWearingBeachwear) {
      npc.isWearingBeachwear = true;
      npc.torso.material = npc.beachTorsoMat;
      if (npc.leftArm && npc.beachArmGeo) npc.leftArm.geometry = npc.beachArmGeo;
      if (npc.rightArm && npc.beachArmGeo) npc.rightArm.geometry = npc.beachArmGeo;
      if (npc.cityClothesDetails) npc.cityClothesDetails.visible = false;
      if (npc.leftLeg && npc.beachLegGeo) npc.leftLeg.geometry = npc.beachLegGeo;
      if (npc.rightLeg && npc.beachLegGeo) npc.rightLeg.geometry = npc.beachLegGeo;
      if (npc.sungaBrief) npc.sungaBrief.visible = true;
      if (npc.beachAccGroup) npc.beachAccGroup.visible = true;
    } else if (!isBeach && npc.isWearingBeachwear) {
      npc.isWearingBeachwear = false;
      npc.torso.material = npc.cityTorsoMat;
      if (npc.leftArm && npc.cityArmGeo) npc.leftArm.geometry = npc.cityArmGeo;
      if (npc.rightArm && npc.cityArmGeo) npc.rightArm.geometry = npc.cityArmGeo;
      if (npc.cityClothesDetails) npc.cityClothesDetails.visible = true;
      if (npc.leftLeg && npc.cityLegGeo) npc.leftLeg.geometry = npc.cityLegGeo;
      if (npc.rightLeg && npc.cityLegGeo) npc.rightLeg.geometry = npc.cityLegGeo;
      if (npc.sungaBrief) npc.sungaBrief.visible = false;
      if (npc.beachAccGroup) npc.beachAccGroup.visible = false;
    }
  }
};
