import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Helpers de modelagem estilizada (formas arredondadas e anatômicas em vez de caixas cruas)
const RB = (w, h, d, r = 0.04, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w * 0.49, h * 0.49, d * 0.49));
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

// Cache compartilhado para figuras estilizadas de veículos, barcos, praia e lajes (mesma estética Claude Opus dos NPCs)
let _figCache = null;
function _getFigCache() {
  if (_figCache) return _figCache;
  const dome = (r, sy, drop) => {
    const g = new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, sy, 1);
    g.translate(0, -drop, 0);
    return g;
  };
  _figCache = {
    mats: new Map(),
    skinMats: new Map(),
    torsoM: merge(
      at(RB(0.45, 0.33, 0.26, 0.08), 0, 0.12, 0),
      at(RB(0.38, 0.31, 0.23, 0.07), 0, -0.14, 0)
    ),
    torsoF: merge(
      at(RB(0.40, 0.31, 0.24, 0.08), 0, 0.13, 0),
      at(RB(0.31, 0.15, 0.20, 0.06), 0, -0.06, 0),
      at(RB(0.40, 0.16, 0.24, 0.07), 0, -0.20, 0)
    ),
    collar: new THREE.CylinderGeometry(0.11, 0.13, 0.05, 12),
    lapel: RB(0.115, 0.54, 0.275, 0.04),
    stripe: RB(0.46, 0.10, 0.275, 0.045),
    neck: new THREE.CylinderGeometry(0.07, 0.082, 0.12, 10),
    head: merge(
      at(RB(0.30, 0.29, 0.29, 0.08, 3), 0, 0.02, 0),
      at(RB(0.25, 0.11, 0.26, 0.048, 2), 0, -0.105, 0.008)
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
    strawBrim: new THREE.CylinderGeometry(0.32, 0.35, 0.03, 16),
    strawCrown: new THREE.CylinderGeometry(0.155, 0.185, 0.14, 14),
    strawBand: new THREE.CylinderGeometry(0.18, 0.188, 0.038, 14),
    helmetDome: dome(0.195, 0.76, 0.055),
    visor: RB(0.28, 0.065, 0.05, 0.02, 1),
    shades: merge(
      at(RB(0.11, 0.056, 0.02, 0.018, 1), -0.065, 0, 0),
      at(RB(0.11, 0.056, 0.02, 0.018, 1), 0.065, 0, 0),
      at(new THREE.BoxGeometry(0.32, 0.014, 0.014), 0, 0.02, 0)
    ),
    sleeve: merge(
      at(new THREE.SphereGeometry(0.078, 10, 8), 0, 0, 0),
      at(RB(0.132, 0.20, 0.132, 0.055), 0, -0.09, 0)
    ),
    forearm: merge(
      at(new THREE.CapsuleGeometry(0.048, 0.19, 4, 10), 0, -0.28, 0),
      at(RB(0.08, 0.098, 0.06, 0.03), 0, -0.44, 0.005),
      at(RB(0.028, 0.055, 0.028, 0.01, 1), 0.042, -0.415, 0.018)
    ),
    thigh: at(RB(0.16, 0.30, 0.18, 0.065), 0, -0.14, 0),
    calf: merge(
      at(RB(0.135, 0.22, 0.145, 0.055), 0, -0.37, 0),
      at(new THREE.SphereGeometry(0.074, 10, 8), 0, -0.27, 0.005)
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

const _NPCS_FINISH = {
  cloth: { roughness: 0.85, metalness: 0.0 },
  gloss: { roughness: 0.24, metalness: 0.14 },
  leather: { roughness: 0.42, metalness: 0.05 },
  helmet: { roughness: 0.34, metalness: 0.10 },
  hair: { roughness: 0.72, metalness: 0.0 },
  straw: { roughness: 0.90, metalness: 0.0 }
};

export function createStylizedFigure(opts = {}) {
  const C = _getFigCache();
  const getMat = (hex, finish = 'cloth') => {
    const key = `${hex}_${finish}`;
    let m = C.mats.get(key);
    if (!m) {
      const f = _NPCS_FINISH[finish] || _NPCS_FINISH.cloth;
      m = new THREE.MeshStandardMaterial({
        color: hex,
        roughness: f.roughness,
        metalness: f.metalness,
        flatShading: false
      });
      C.mats.set(key, m);
    }
    return m;
  };
  const getSkin = (hex) => {
    let m = C.skinMats.get(hex);
    if (!m) {
      const warm = new THREE.Color(hex).multiplyScalar(0.08);
      m = new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.64,
        metalness: 0.0,
        emissive: warm,
        emissiveIntensity: 0.45,
        flatShading: false
      });
      C.skinMats.set(hex, m);
    }
    return m;
  };

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

  const skinMat = getSkin(skinColor);
  const torsoMat = bareChest ? skinMat : getMat(shirtColor, 'cloth');
  const sleeveMat = bareChest ? skinMat : getMat(shirtColor, 'cloth');
  const legMat = bareLegs ? skinMat : getMat(pantsColor, 'cloth');
  const calfMat = (bareLegs || wearsShorts) ? skinMat : getMat(pantsColor, 'cloth');
  const hairMat = getMat(hairColor, 'hair');

  const group = new THREE.Group();

  // 1. Torso em V + pescoço + gola/colete/listra
  const torso = new THREE.Mesh(isFemale ? C.torsoF : C.torsoM, torsoMat);
  torso.position.y = 0.85;
  torso.castShadow = true;
  group.add(torso);

  const neck = new THREE.Mesh(C.neck, skinMat);
  neck.position.set(0, 0.33, 0);
  torso.add(neck);

  if (!bareChest) {
    const collar = new THREE.Mesh(C.collar, getMat(0xF8FAFC));
    collar.position.set(0, 0.28, 0.01);
    torso.add(collar);
  }
  if (hasVest) {
    const vMat = getMat(vestColor);
    [-0.16, 0.16].forEach(lx => {
      const lapel = new THREE.Mesh(C.lapel, vMat);
      lapel.position.set(lx, -0.01, 0);
      torso.add(lapel);
    });
  }
  if (hasStripe && !bareChest) {
    const st = new THREE.Mesh(C.stripe, getMat(stripeColor));
    st.position.set(0, 0.05, 0);
    torso.add(st);
  }

  // 2. Cabeça esculpida com orelhas, olhos (esclera + íris + brilho), sobrancelhas, nariz, boca e barba
  const head = new THREE.Mesh(C.head, skinMat);
  head.position.y = 1.35;
  head.castShadow = true;
  group.add(head);

  [-0.155, 0.155].forEach(ex => {
    const ear = new THREE.Mesh(C.ear, skinMat);
    ear.position.set(ex, -0.005, 0);
    head.add(ear);
  });

  const whiteMat = getMat(0xF5F1EA, 'gloss');
  const irisMat = getMat(0x3B2414, 'gloss');
  const shineMat = getMat(0xFFFFFF, 'gloss');
  [-1, 1].forEach(side => {
    const ex = side * 0.064;
    const w = new THREE.Mesh(C.eyeWhite, whiteMat);
    w.position.set(ex, 0.024, 0.144);
    head.add(w);
    const ir = new THREE.Mesh(C.eyeIris, irisMat);
    ir.position.set(ex - side * 0.005, 0.021, 0.150);
    head.add(ir);
    const sh = new THREE.Mesh(C.eyeShine, shineMat);
    sh.position.set(ex - side * 0.005 + 0.007, 0.031, 0.155);
    head.add(sh);

    const brow = new THREE.Mesh(C.brow, hairMat);
    brow.position.set(ex, 0.068, 0.147);
    brow.rotation.z = side * -0.07;
    head.add(brow);
  });

  const nose = new THREE.Mesh(C.nose, skinMat);
  nose.position.set(0, -0.01, 0.152);
  head.add(nose);

  if (hasBeard) {
    const beard = new THREE.Mesh(C.beard, hairMat);
    beard.position.set(0, -0.13, 0.052);
    head.add(beard);
  } else if (hasMustache) {
    const must = new THREE.Mesh(C.mustache, hairMat);
    must.position.set(0, -0.062, 0.146);
    head.add(must);
  }

  const lipHex = new THREE.Color(skinColor).multiplyScalar(0.62).getHex();
  const mouth = new THREE.Mesh(C.mouth, getMat(lipHex));
  mouth.position.set(0, -0.088, hasBeard ? 0.156 : 0.143);
  head.add(mouth);

  if (hasShades) {
    const shades = new THREE.Mesh(C.shades, getMat(0x111827, 'gloss'));
    shades.position.set(0, 0.026, 0.158);
    head.add(shades);
  }

  // Base capilar traseira + chapéu/capacete/cabelo
  const hairBack = new THREE.Mesh(C.hairBack, hairMat);
  hairBack.position.set(0, 0.015, -0.138);
  head.add(hairBack);

  if (hatType === 'straw') {
    const strawMat = getMat(0xDFB848, 'straw');
    const brim = new THREE.Mesh(C.strawBrim, strawMat);
    brim.position.y = 0.155;
    const crown = new THREE.Mesh(C.strawCrown, strawMat);
    crown.position.y = 0.23;
    const band = new THREE.Mesh(C.strawBand, getMat(0x991B1B, 'cloth'));
    band.position.y = 0.182;
    head.add(brim, crown, band);
  } else if (hatType === 'helmet') {
    const hDome = new THREE.Mesh(C.helmetDome, getMat(helmetColor, 'helmet'));
    hDome.position.set(0, 0.14, -0.005);
    head.add(hDome);
    if (hasVisor) {
      const vis = new THREE.Mesh(C.visor, getMat(0x0F172A, 'gloss'));
      vis.position.set(0, 0.065, 0.155);
      head.add(vis);
    }
  } else if (hatType === 'hair') {
    const hTop = new THREE.Mesh(C.hairTop, hairMat);
    hTop.position.y = 0.155;
    head.add(hTop);
  }

  // 3. Braços articulados com ombro arredondado, antebraço e mão com polegar
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.295, 1.04, 0);
  leftArm.add(new THREE.Mesh(C.sleeve, sleeveMat), new THREE.Mesh(C.forearm, skinMat));
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.295, 1.04, 0);
  rightArm.add(new THREE.Mesh(C.sleeve, sleeveMat), new THREE.Mesh(C.forearm, skinMat));
  group.add(rightArm);

  // 4. Pernas articuladas (coxa + joelho + canela + calçado com solado)
  let leftLeg = null;
  let rightLeg = null;
  if (includeLegs) {
    const soleMat = getMat(shoeColor === 0xF8FAFC ? 0x9CA3AF : 0xF1F5F9, 'leather');
    leftLeg = new THREE.Mesh(C.thigh, legMat);
    leftLeg.position.set(-0.11, 0.56, 0);
    leftLeg.add(new THREE.Mesh(C.calf, calfMat));
    if (includeShoes) {
      const shL = new THREE.Mesh(C.shoe, getMat(shoeColor, 'leather'));
      shL.add(new THREE.Mesh(C.sole, soleMat));
      leftLeg.add(shL);
    }
    group.add(leftLeg);

    rightLeg = new THREE.Mesh(C.thigh, legMat);
    rightLeg.position.set(0.11, 0.56, 0);
    rightLeg.add(new THREE.Mesh(C.calf, calfMat));
    if (includeShoes) {
      const shR = new THREE.Mesh(C.shoe, getMat(shoeColor, 'leather'));
      shR.add(new THREE.Mesh(C.sole, soleMat));
      rightLeg.add(shR);
    }
    group.add(rightLeg);
  }

  if (sungaColor) {
    const sunga = new THREE.Mesh(C.sunga, getMat(sungaColor));
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
    // ANATOMIA ESTILIZADA v2: coxa e canela separadas (bermudas mostram a perna!), joelho, tornozelo e calçado com solado
    const legGeo = at(RB(0.17, 0.32, 0.19, 0.07), 0, -0.15, 0);
    const calfGeo = merge(
      at(RB(0.14, 0.24, 0.155, 0.06), 0, -0.40, 0),
      at(new THREE.SphereGeometry(0.078, 10, 8), 0, -0.29, 0.005) // joelho arredondado
    );
    const shoeGeo = merge(
      at(RB(0.15, 0.085, 0.24, 0.04), 0, -0.525, 0.035),
      at(RB(0.13, 0.06, 0.10, 0.03), 0, -0.49, -0.02) // tornozelo/cano do tênis
    );
    const soleGeo = at(RB(0.158, 0.03, 0.255, 0.012, 1), 0, -0.567, 0.035);

    // Braço com ombro arredondado (deltoide) + manga; antebraço cilíndrico com MÃO esculpida
    const sleeveGeo = merge(
      at(new THREE.SphereGeometry(0.082, 10, 8), 0, 0.0, 0),
      at(RB(0.14, 0.22, 0.14, 0.06), 0, -0.10, 0)
    );
    const forearmGeo = merge(
      at(new THREE.CapsuleGeometry(0.05, 0.20, 4, 10), 0, -0.30, 0),
      at(RB(0.085, 0.105, 0.065, 0.032), 0, -0.47, 0.005),          // palma
      at(RB(0.03, 0.06, 0.03, 0.012, 1), 0.045, -0.445, 0.02)        // polegar
    );

    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 14);
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

    // Cabeça arredondada com mandíbula/queixo suavizados
    const headGeo = merge(
      at(RB(0.31, 0.30, 0.30, 0.085, 3), 0, 0.02, 0),
      at(RB(0.26, 0.12, 0.27, 0.05, 2), 0, -0.11, 0.008)
    );

    // Dome helper (boné / capacete)
    const dome = (r, sy, drop) => {
      const g = new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      g.scale(1, sy, 1);
      g.translate(0, -drop, 0);
      return g;
    };

    // Cacheado: aglomerado orgânico de cachos
    const curlyTop = merge(
      at(new THREE.IcosahedronGeometry(0.11, 1), 0, 0.02, 0),
      at(new THREE.IcosahedronGeometry(0.09, 1), -0.09, 0, 0.06),
      at(new THREE.IcosahedronGeometry(0.09, 1), 0.09, 0, 0.06),
      at(new THREE.IcosahedronGeometry(0.095, 1), -0.09, -0.01, -0.07),
      at(new THREE.IcosahedronGeometry(0.095, 1), 0.09, -0.01, -0.07),
      at(new THREE.IcosahedronGeometry(0.09, 1), 0, 0.0, 0.10)
    );

    this._sharedNPCGeos = {
      shirt: shirtM,
      shirtF,
      chestStripe: at(RB(0.48, 0.11, 0.285, 0.05), 0, 0.0, 0),
      collar: new THREE.CylinderGeometry(0.115, 0.135, 0.05, 14),
      jacketLapel: RB(0.12, 0.58, 0.285, 0.045),
      necklace: (() => { const g = new THREE.TorusGeometry(0.105, 0.014, 5, 16); g.rotateX(Math.PI / 2.4); return g; })(),
      pendant: new THREE.OctahedronGeometry(0.028, 0),
      chestPrint: RB(0.13, 0.10, 0.012, 0.004, 1),
      belt: RB(0.40, 0.05, 0.25, 0.02),
      buckle: new THREE.BoxGeometry(0.05, 0.04, 0.01),
      skirt: new THREE.CylinderGeometry(0.20, 0.27, 0.30, 14, 1, true),
      neck: new THREE.CylinderGeometry(0.072, 0.084, 0.13, 12),
      apron: RB(0.40, 0.52, 0.035, 0.015),
      armSleeve: sleeveGeo,
      armForearm: forearmGeo,
      head: headGeo,
      ear: RB(0.035, 0.085, 0.06, 0.016),
      earring: new THREE.SphereGeometry(0.018, 6, 5),
      eyeWhite: RB(0.07, 0.052, 0.012, 0.006, 1),
      eye: RB(0.034, 0.042, 0.012, 0.008, 1),
      eyeShine: new THREE.BoxGeometry(0.011, 0.011, 0.006),
      lash: new THREE.BoxGeometry(0.08, 0.014, 0.016),
      cheek: new THREE.CircleGeometry(0.026, 10),
      brow: RB(0.072, 0.022, 0.022, 0.008, 1),
      nose: merge(
        at(RB(0.04, 0.07, 0.04, 0.016), 0, 0, 0),
        at(RB(0.06, 0.028, 0.035, 0.012, 1), 0, -0.03, -0.004)
      ),
      mouth: RB(0.09, 0.022, 0.014, 0.008, 1),
      glasses: merge(
        at(new THREE.TorusGeometry(0.036, 0.007, 4, 12), -0.068, 0, 0),
        at(new THREE.TorusGeometry(0.036, 0.007, 4, 12), 0.068, 0, 0),
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
      hairAfro: new THREE.IcosahedronGeometry(0.255, 2),
      hairCurlyTop: curlyTop,
      hairCurlySide: RB(0.36, 0.20, 0.27, 0.07),
      hairLongBack: RB(0.33, 0.42, 0.10, 0.045),
      hairBun: new THREE.SphereGeometry(0.105, 12, 10),
      hairPonytail: new THREE.CapsuleGeometry(0.048, 0.18, 4, 8),
      hairFringe: RB(0.30, 0.05, 0.05, 0.02, 1),
      headband: RB(0.335, 0.05, 0.325, 0.02),
      turbanCrown: new THREE.SphereGeometry(0.195, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
      turbanKnot: new THREE.IcosahedronGeometry(0.075, 1),
      panamaBrim: new THREE.CylinderGeometry(0.30, 0.32, 0.03, 18),
      panamaCrown: new THREE.CylinderGeometry(0.16, 0.19, 0.15, 16),
      panamaBand: new THREE.CylinderGeometry(0.185, 0.192, 0.04, 16),
      strawHat: new THREE.CylinderGeometry(0.30, 0.46, 0.12, 16),
      fishHat: new THREE.CylinderGeometry(0.24, 0.42, 0.14, 16),
      farmHat: new THREE.CylinderGeometry(0.22, 0.50, 0.12, 16),
      visorHat: RB(0.40, 0.08, 0.46, 0.03),
      beretHat: (() => { const g = new THREE.SphereGeometry(0.2, 14, 8); g.scale(1, 0.32, 1.05); return g; })(),
      capCrown: dome(0.178, 0.78, 0.06),
      capVisor: RB(0.30, 0.025, 0.17, 0.012, 1),
      backpack: RB(0.31, 0.38, 0.15, 0.06),
      crossbodyBag: RB(0.10, 0.20, 0.19, 0.03),
      strap: new THREE.BoxGeometry(0.035, 0.66, 0.02),
      fishBasket: new THREE.CylinderGeometry(0.18, 0.14, 0.26, 10),
      fishTail: new THREE.ConeGeometry(0.08, 0.22, 4),
      farmBasket: RB(0.28, 0.20, 0.24, 0.04),
      greens: new THREE.IcosahedronGeometry(0.12, 0),
      crate: new THREE.BoxGeometry(0.32, 0.22, 0.28),
      fruit: new THREE.SphereGeometry(0.09, 8, 6),
      cup: new THREE.CylinderGeometry(0.08, 0.06, 0.20, 10),
      straw: new THREE.CylinderGeometry(0.012, 0.012, 0.26, 4),
      shades: merge(
        at(RB(0.115, 0.06, 0.02, 0.02, 1), -0.068, 0, 0),
        at(RB(0.115, 0.06, 0.02, 0.02, 1), 0.068, 0, 0),
        at(new THREE.BoxGeometry(0.34, 0.015, 0.015), 0, 0.022, 0)
      ),
      sunVisor: new THREE.CylinderGeometry(0.38, 0.42, 0.09, 12),
      towel: RB(0.22, 0.62, 0.32, 0.04),
      helmetCrown: dome(0.215, 0.72, 0.075),
      helmetBrim: new THREE.CylinderGeometry(0.255, 0.255, 0.03, 18),
      toolHandle: new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6),
      pickHead: RB(0.36, 0.08, 0.08, 0.025),
      cartTub: RB(0.72, 0.36, 0.90, 0.06),
      cartWheel: wheelGeo,
      cartHandle: new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6).rotateX(Math.PI / 2),
      brickCargo: new THREE.BoxGeometry(0.58, 0.24, 0.70)
    };
    this._sharedNPCMats = new Map();
    this._sharedSkinMats = new Map();
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

    // Pescoço humano conectando o tronco à cabeça
    const neck = new THREE.Mesh(G.neck, skinMat);
    neck.position.set(0, 0.35, 0);
    torso.add(neck);

    // Detalhes de vestuário urbano no tronco (gola, listra esportiva, camisa aberta ou cordão)
    const cityClothesDetails = new THREE.Group();
    torso.add(cityClothesDetails);

    if (!isBarraqueiro && !isBanhista) {
      const styleVariant = (index + seedA) % 5;
      if (styleVariant === 0 || isSoccerPlayer) {
        // Faixa horizontal no peito (estilo camisa listrada / time carioca)
        const stripeColors = [0xF8FAFC, 0x111827, 0xFACC15, 0xEF4444, 0x38BDF8];
        const stripeCol = isSoccerPlayer
          ? (team === 'yellow' ? 0x15803D : 0xF8FAFC)
          : stripeColors[seedB % stripeColors.length];
        const stripe = new THREE.Mesh(G.chestStripe, this._getSharedLambertMat(stripeCol, true));
        stripe.position.set(0, 0.06, 0);
        if (isFemale) stripe.scale.set(0.87, 1, 0.89);
        cityClothesDetails.add(stripe);
      } else if (styleVariant === 1) {
        // Gola polo / colarinho contrastante
        const collar = new THREE.Mesh(G.collar, this._getSharedLambertMat(0xF8FAFC, true));
        collar.position.set(0, 0.30, 0.02);
        cityClothesDetails.add(collar);
      } else if (styleVariant === 2) {
        // Camisa de botão aberta / colete leve sobre a camiseta
        const jacketColors = [0x1E293B, 0x78350F, 0x1E3A8A, 0x065F46, 0x9A3412];
        const jMat = this._getSharedLambertMat(jacketColors[seedB % jacketColors.length], true);
        const lapelL = new THREE.Mesh(G.jacketLapel, jMat);
        lapelL.position.set(-0.175, -0.02, 0);
        cityClothesDetails.add(lapelL);
        const lapelR = new THREE.Mesh(G.jacketLapel, jMat);
        lapelR.position.set(0.175, -0.02, 0);
        cityClothesDetails.add(lapelR);
      } else if (styleVariant === 3) {
        // Cordão / colar artesanal no pescoço com pingente
        const goldMat = this._getSharedLambertMat(0xFBBF24, true);
        const necklace = new THREE.Mesh(G.necklace, goldMat);
        necklace.position.set(0, 0.26, 0.03);
        cityClothesDetails.add(necklace);
        const pendant = new THREE.Mesh(G.pendant, goldMat);
        pendant.position.set(0, 0.17, 0.142);
        cityClothesDetails.add(pendant);
      } else {
        // Estampa frontal (logo/arte de rua) em contraste com a camiseta
        const printCols = [0xF8FAFC, 0x111827, 0xFACC15, 0xF97316, 0x22C55E];
        const print = new THREE.Mesh(G.chestPrint, this._getSharedLambertMat(printCols[(seedA + index) % printCols.length], true));
        print.position.set(0, 0.13, isFemale ? 0.128 : 0.138);
        cityClothesDetails.add(print);
      }

      // Barra da camiseta / cinto com fivela (homens de calça) ou saia rodada (moradoras)
      if (wearsSkirt) {
        const skirtCols = [0x7C2D12, 0x1E3A8A, 0xBE185D, 0x0F766E, 0xF5F5F4, 0x6D28D9, 0xCA8A04];
        const skirtMat = new THREE.MeshLambertMaterial({ color: skirtCols[(index + seedA) % skirtCols.length], side: THREE.DoubleSide });
        const skirt = new THREE.Mesh(G.skirt, skirtMat);
        skirt.position.set(0, -0.40, 0);
        skirt.castShadow = true;
        cityClothesDetails.add(skirt);
      } else if (!isFemale && !isSoccerPlayer) {
        const beltCols = [0x3F2A1D, 0x111827, 0x57534E];
        const belt = new THREE.Mesh(G.belt, this._getSharedLambertMat(beltCols[seedB % beltCols.length], true));
        belt.position.set(0, -0.285, 0);
        cityClothesDetails.add(belt);
        const buckle = new THREE.Mesh(G.buckle, this._getSharedLambertMat(0xD4D4D8, true));
        buckle.position.set(0, -0.285, 0.128);
        cityClothesDetails.add(buckle);
      }
    }

    // Mochila ou bolsa tiracolo para estudantes, trilheiros e trabalhadores (35% dos civis)
    if (!isBarraqueiro && !isBanhista && !isSoccerPlayer && index % 3 === 1) {
      const packColors = [0x334155, 0x991B1B, 0x1E40AF, 0x065F46, 0x92400E, 0x4C1D95];
      const packMat = this._getSharedLambertMat(packColors[(index + seedB) % packColors.length], true);
      if (seedA % 2 === 0) {
        const pack = new THREE.Mesh(G.backpack, packMat);
        pack.position.set(0, 0.04, -0.20);
        cityClothesDetails.add(pack);
        // Alças da mochila passando pelos ombros
        const strapMat = this._getSharedLambertMat(darkenColor(packColors[(index + seedB) % packColors.length], 0.6), true);
        [-0.12, 0.12].forEach(sx => {
          const strap = new THREE.Mesh(G.strap, strapMat);
          strap.scale.y = 0.55;
          strap.position.set(sx, 0.10, 0.138);
          cityClothesDetails.add(strap);
        });
      } else {
        const bag = new THREE.Mesh(G.crossbodyBag, packMat);
        bag.position.set(0.26, -0.18, 0.04);
        cityClothesDetails.add(bag);
        // Alça transversal cruzando o peito
        const strap = new THREE.Mesh(G.strap, this._getSharedLambertMat(darkenColor(packColors[(index + seedB) % packColors.length], 0.6), true));
        strap.position.set(0.02, 0.06, 0.14);
        strap.rotation.z = 0.72;
        cityClothesDetails.add(strap);
      }
    }

    // Avental frontal para Barraqueiros
    if (isBarraqueiro) {
      let apronColor = 0x2D6A4F;
      if (role.stallId === 'mate') apronColor = 0xEA580C;
      else if (role.stallId === 'acai') apronColor = 0x7E22CE;
      else if (role.stallId === 'petiscos') apronColor = 0xDC2626;

      const apron = new THREE.Mesh(G.apron, this._getSharedLambertMat(apronColor, true));
      apron.position.set(0, -0.02, 0.16);
      torso.add(apron);
    }

    // 4. BRAÇOS ARTICULADOS NO OMBRO (Manga da camisa + Antebraço e Mão na cor da pele humana!)
    const citySleeveMat = isBarraqueiro ? this._getSharedLambertMat(0xF8FAFC, true) : cityTorsoMat;
    const beachSleeveMat = skinMat;

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.31, 1.06, 0);
    const leftSleeve = new THREE.Mesh(G.armSleeve, citySleeveMat);
    const leftForearm = new THREE.Mesh(G.armForearm, skinMat);
    leftArm.add(leftSleeve, leftForearm);
    npcGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.31, 1.06, 0);
    const rightSleeve = new THREE.Mesh(G.armSleeve, citySleeveMat);
    const rightForearm = new THREE.Mesh(G.armForearm, skinMat);
    rightArm.add(rightSleeve, rightForearm);
    npcGroup.add(rightArm);

    // 5. CABEÇA HUMANA ESCULPIDA COM ROSTO EXPRESSIVO (Olhos, Sobrancelhas, Nariz, Boca e Barba/Bigode opcional)
    const head = new THREE.Mesh(G.head, skinMat);
    head.position.y = 1.37;
    npcGroup.add(head);

    // Orelhas humanas nas laterais
    const earL = new THREE.Mesh(G.ear, skinMat);
    earL.position.set(-0.162, -0.005, 0.0);
    head.add(earL);
    const earR = new THREE.Mesh(G.ear, skinMat);
    earR.position.set(0.162, -0.005, 0.0);
    head.add(earR);

    // Brincos dourados/prateados para parte das moradoras
    if (isFemale && seedA % 2 === 0) {
      const earringMat = this._getSharedLambertMat(seedB % 2 === 0 ? 0xFBBF24 : 0xE5E7EB, true);
      [-0.168, 0.168].forEach(ex => {
        const er = new THREE.Mesh(G.earring, earringMat);
        er.position.set(ex, -0.055, 0.005);
        head.add(er);
      });
    }

    // Olhos expressivos com esclera, íris colorida e brilho (voltados para +Z)
    const irisPalette = [0x3B2414, 0x4A2C17, 0x2B1A10, 0x5B3A1E, 0x1F1A17, 0x3F5F3A, 0x35556E];
    const irisColor = (seedB % 9 < 7) ? irisPalette[seedB % 5] : irisPalette[5 + (seedA % 2)];
    const eyeWhiteMat = this._getSharedLambertMat(0xF5F1EA, false);
    const eyeMat = this._getSharedLambertMat(irisColor, false);
    const shineMat = this._getSharedLambertMat(0xFFFFFF, false);
    [-1, 1].forEach(side => {
      const ex = side * 0.066;
      const white = new THREE.Mesh(G.eyeWhite, eyeWhiteMat);
      white.position.set(ex, 0.025, 0.150);
      head.add(white);
      const iris = new THREE.Mesh(G.eye, eyeMat);
      iris.position.set(ex + side * -0.006, 0.022, 0.156);
      head.add(iris);
      const shine = new THREE.Mesh(G.eyeShine, shineMat);
      shine.position.set(ex + side * -0.006 + 0.008, 0.033, 0.161);
      head.add(shine);
      if (isFemale) {
        // Cílios marcados
        const lash = new THREE.Mesh(G.lash, this._getSharedLambertMat(0x111111, false));
        lash.position.set(ex, 0.052, 0.154);
        lash.rotation.z = side * -0.12;
        head.add(lash);
        // Blush suave nas bochechas
        const blushHex = new THREE.Color(skinColor).lerp(new THREE.Color(0xE11D48), 0.22).getHex();
        const cheek = new THREE.Mesh(G.cheek, this._getSharedLambertMat(blushHex, false));
        cheek.position.set(side * 0.095, -0.035, 0.1515);
        head.add(cheek);
      }
    });

    // Sobrancelhas na cor do cabelo (levemente inclinadas = expressão simpática)
    const browL = new THREE.Mesh(G.brow, hairMat);
    browL.position.set(-0.068, 0.072, 0.153);
    browL.rotation.z = isFemale ? 0.12 : 0.06;
    head.add(browL);
    const browR = new THREE.Mesh(G.brow, hairMat);
    browR.position.set(0.068, 0.072, 0.153);
    browR.rotation.z = isFemale ? -0.12 : -0.06;
    head.add(browR);

    // Nariz esculpido na cor da pele (ponte + aletas)
    const nose = new THREE.Mesh(G.nose, skinMat);
    nose.position.set(0, -0.012, 0.158);
    head.add(nose);

    // Barba ou bigode para uma parcela dos homens e mestres/anciãos
    const hasFullBeard = !isFemale && (isElder || seedA % 4 === 0) && (seedB % 2 === 0 || isElder);
    const hasMustache = !isFemale && !hasFullBeard && seedA % 4 === 0;
    if (hasFullBeard) {
      const beard = new THREE.Mesh(G.beard, hairMat);
      beard.position.set(0, -0.14, 0.055);
      head.add(beard);
    } else if (hasMustache) {
      const mustache = new THREE.Mesh(G.mustache, hairMat);
      mustache.position.set(0, -0.066, 0.152);
      head.add(mustache);
    }

    // Boca / Lábios com tom derivado da pele (batom suave para parte das moradoras)
    const lipBase = new THREE.Color(skinColor).multiplyScalar(0.62);
    if (isFemale) lipBase.lerp(new THREE.Color(seedA % 3 === 0 ? 0xB91C1C : 0xBE5A6A), 0.45);
    const mouth = new THREE.Mesh(G.mouth, this._getSharedLambertMat(lipBase.getHex(), false));
    mouth.position.set(0, -0.092, hasFullBeard ? 0.162 : 0.148);
    head.add(mouth);

    // Óculos de grau para anciãos e alguns estudantes
    if (isElder ? (index % 2 === 0) : (seedB % 11 === 0)) {
      const frameCols = [0x111827, 0x7C2D12, 0xB45309];
      const glasses = new THREE.Mesh(G.glasses, this._getSharedLambertMat(frameCols[seedA % frameCols.length], false));
      glasses.position.set(0, 0.024, 0.163);
      head.add(glasses);
    }

    // Identificação de papéis profissionais especializados
    const isFishermanRole = role.title.includes('Pescador') || role.title.includes('Barqueiro');
    const isFarmerRole = role.title.includes('Agricultor') || role.title.includes('Horta');
    const isMerchantRole = role.title.includes('Feirante');
    const isLighthouseRole = role.title.includes('Farol');
    const isMusicianRole = role.title.includes('Músico') || role.title.includes('Samba');

    // 6. PENTEADOS AUTÊNTICOS & CHAPÉUS CARIOCAS (Fixados à cabeça para acompanhar o olhar!)
    const hat = new THREE.Group();
    head.add(hat);

    // Base capilar natural sob todos os chapéus/bonés para nunca parecer careca por trás
    const baseHairBack = new THREE.Mesh(G.hairShortBack, hairMat);
    baseHairBack.position.set(0, 0.02, -0.145);
    hat.add(baseHairBack);

    if (isBarraqueiro) {
      if (role.stallId === 'coco') {
        const straw = new THREE.Mesh(G.strawHat, this._getSharedLambertMat(0xD4A373, true));
        straw.position.y = 0.21;
        hat.add(straw);
      } else {
        let visorColor = 0x15803D;
        if (role.stallId === 'acai') visorColor = 0x06B6D4;
        else if (role.stallId === 'petiscos') visorColor = 0xDC2626;
        const hairTop = new THREE.Mesh(G.hairShortTop, hairMat);
        hairTop.position.y = 0.17;
        hat.add(hairTop);
        const visor = new THREE.Mesh(G.visorHat, this._getSharedLambertMat(visorColor, false));
        visor.position.set(0, 0.14, 0.05);
        hat.add(visor);
      }
    } else if (isFishermanRole) {
      const fHat = new THREE.Mesh(G.fishHat, this._getSharedLambertMat(0xD4A373, true));
      fHat.position.y = 0.20;
      hat.add(fHat);
    } else if (isFarmerRole) {
      const frmHat = new THREE.Mesh(G.farmHat, this._getSharedLambertMat(0xCA8A04, true));
      frmHat.position.y = 0.20;
      hat.add(frmHat);
    } else if (isMerchantRole) {
      const beret = new THREE.Mesh(G.beretHat, this._getSharedLambertMat(0x059669, true));
      beret.position.y = 0.19;
      hat.add(beret);
    } else if (isLighthouseRole) {
      const capCrown = new THREE.Mesh(G.capCrown, this._getSharedLambertMat(0xF8FAFC, false));
      capCrown.position.y = 0.20;
      hat.add(capCrown);
      const capVisor = new THREE.Mesh(G.capVisor, this._getSharedLambertMat(0x0F172A, false));
      capVisor.position.set(0, 0.15, 0.22);
      hat.add(capVisor);
    } else if (isMusicianRole || (!isFemale && seedA % 9 === 0)) {
      // Chapéu Panamá Boêmio de Sambista (Creme com fita preta ou vermelha)
      const panamaMat = this._getSharedLambertMat(0xFEF3C7, true);
      const bandCol = (index % 2 === 0) ? 0x111827 : 0xDC2626;
      const brim = new THREE.Mesh(G.panamaBrim, panamaMat);
      brim.position.y = 0.17;
      hat.add(brim);
      const crown = new THREE.Mesh(G.panamaCrown, panamaMat);
      crown.position.y = 0.25;
      hat.add(crown);
      const band = new THREE.Mesh(G.panamaBand, this._getSharedLambertMat(bandCol, false));
      band.position.y = 0.20;
      hat.add(band);
    } else {
      // Diversidade de Penteados Humanos & Bonés para Moradores
      const hairStyle = isFemale ? (seedA % 5) : (seedA % 6);

      if (isFemale && hairStyle === 0) {
        // Coque Alto Carioca + Tiara colorida
        const topHair = new THREE.Mesh(G.hairShortTop, hairMat);
        topHair.position.y = 0.16;
        hat.add(topHair);
        const bun = new THREE.Mesh(G.hairBun, hairMat);
        bun.position.set(0, 0.29, -0.06);
        hat.add(bun);
        const bandCols = [0xF43F5E, 0xFACC15, 0x06B6D4, 0x10B981, 0xA855F7];
        const hBand = new THREE.Mesh(G.headband, this._getSharedLambertMat(bandCols[index % bandCols.length], true));
        hBand.position.set(0, 0.14, 0.01);
        hat.add(hBand);
      } else if (isFemale && hairStyle === 1) {
        // Cabelo Longo Solto nos Ombros
        const topHair = new THREE.Mesh(G.hairShortTop, hairMat);
        topHair.position.y = 0.165;
        hat.add(topHair);
        const longBack = new THREE.Mesh(G.hairLongBack, hairMat);
        longBack.position.set(0, -0.06, -0.14);
        hat.add(longBack);
        // Franja lateral emoldurando o rosto
        const fringe = new THREE.Mesh(G.hairFringe, hairMat);
        fringe.position.set(0.02, 0.125, 0.145);
        fringe.rotation.z = -0.18;
        hat.add(fringe);
        [-0.155, 0.155].forEach(sx => {
          const side = new THREE.Mesh(G.hairPonytail, hairMat);
          side.position.set(sx, -0.02, -0.02);
          side.scale.set(0.9, 1.15, 1.4);
          hat.add(side);
        });
      } else if (isFemale && hairStyle === 2) {
        // Turbante Afro-Carioca Vibrante
        const turbCols = [0xF59E0B, 0xEC4899, 0x8B5CF6, 0x10B981, 0xEF4444];
        const tMat = this._getSharedLambertMat(turbCols[(index + seedB) % turbCols.length], true);
        const tCrown = new THREE.Mesh(G.turbanCrown, tMat);
        tCrown.position.y = 0.065;
        tCrown.scale.set(1.0, 1.05, 1.02);
        hat.add(tCrown);
        const tKnot = new THREE.Mesh(G.turbanKnot, tMat);
        tKnot.position.set(0, 0.215, 0.12);
        hat.add(tKnot);
      } else if (isFemale && hairStyle === 3) {
        // Rabo de Cavalo (Ponytail)
        const topHair = new THREE.Mesh(G.hairShortTop, hairMat);
        topHair.position.y = 0.165;
        hat.add(topHair);
        const pony = new THREE.Mesh(G.hairPonytail, hairMat);
        pony.position.set(0, 0.0, -0.20);
        pony.rotation.x = 0.35;
        hat.add(pony);
        const scrunchie = new THREE.Mesh(G.earring, this._getSharedLambertMat([0xF43F5E, 0x06B6D4, 0xFACC15][index % 3], true));
        scrunchie.scale.setScalar(2.2);
        scrunchie.position.set(0, 0.11, -0.175);
        hat.add(scrunchie);
      } else if (hairStyle === 4 || (isFemale && hairStyle === 4)) {
        // Black Power / Afro Volumoso Esculpido
        const afro = new THREE.Mesh(G.hairAfro, hairMat);
        afro.position.set(0, 0.15, -0.02);
        hat.add(afro);
      } else if (!isFemale && hairStyle === 0) {
        // Corte Curto Degradê / Disfarçado (Fade Carioca)
        const topHair = new THREE.Mesh(G.hairShortTop, hairMat);
        topHair.position.y = 0.165;
        hat.add(topHair);
      } else if (!isFemale && hairStyle === 1) {
        // Cabelo Cacheado / Crespo Volumoso
        const curlyTop = new THREE.Mesh(G.hairCurlyTop, hairMat);
        curlyTop.position.y = 0.18;
        hat.add(curlyTop);
        const curlySide = new THREE.Mesh(G.hairCurlySide, hairMat);
        curlySide.position.set(0, 0.08, -0.02);
        hat.add(curlySide);
      } else if (!isFemale && (hairStyle === 2 || hairStyle === 3)) {
        // Boné Carioca (para frente ou virado para trás)
        const capColors = [0x1E3A8A, 0xDC2626, 0x111827, 0x047857, 0xD97706, 0xF8FAFC];
        const cMat = this._getSharedLambertMat(capColors[(index + seedB) % capColors.length], true);
        const cCrown = new THREE.Mesh(G.capCrown, cMat);
        cCrown.position.y = 0.185;
        hat.add(cCrown);
        const cVisor = new THREE.Mesh(G.capVisor, cMat);
        const backwards = (hairStyle === 3);
        cVisor.position.set(0, 0.13, backwards ? -0.2 : 0.2);
        hat.add(cVisor);
      } else {
        // Corte Natural Clássico com Faixa Esportiva opcional
        const topHair = new THREE.Mesh(G.hairShortTop, hairMat);
        topHair.position.y = 0.165;
        hat.add(topHair);
      }
    }

    // 7. ACESSÓRIO DA MÃO / OFÍCIO (Cesto de peixes, horta, feira ou bebida refrescante)
    const handItem = new THREE.Group();
    handItem.position.set(-0.35, 0.65, 0.12);

    if (isFishermanRole) {
      const basket = new THREE.Mesh(G.fishBasket, this._getSharedLambertMat(0x78350F, true));
      handItem.add(basket);
      const fishTail = new THREE.Mesh(G.fishTail, this._getSharedLambertMat(0x94A3B8, true));
      fishTail.rotation.x = Math.PI;
      fishTail.position.set(0, 0.14, 0);
      handItem.add(fishTail);
      handItem.visible = true;
    } else if (isFarmerRole) {
      const basket = new THREE.Mesh(G.farmBasket, this._getSharedLambertMat(0xA16207, true));
      handItem.add(basket);
      const greens = new THREE.Mesh(G.greens, this._getSharedLambertMat(0x16A34A, true));
      greens.position.set(0, 0.12, 0);
      handItem.add(greens);
      handItem.visible = true;
    } else if (isMerchantRole) {
      const crate = new THREE.Mesh(G.crate, this._getSharedLambertMat(0x854D0E, true));
      handItem.add(crate);
      const fruit = new THREE.Mesh(G.fruit, this._getSharedLambertMat(0xEA580C, true));
      fruit.position.set(0, 0.12, 0);
      handItem.add(fruit);
      handItem.visible = true;
    } else {
      const cup = new THREE.Mesh(G.cup, this._getSharedLambertMat(0x10B981, true));
      handItem.add(cup);
      const straw = new THREE.Mesh(G.straw, this._getSharedLambertMat(0xFEF08A, false));
      straw.position.set(0.02, 0.12, 0);
      straw.rotation.z = -0.2;
      handItem.add(straw);
      handItem.visible = false;
    }
    npcGroup.add(handItem);

    // 8. ACESSÓRIOS DE PRAIA (Óculos de sol, viseira de palha e toalha de praia)
    const beachAccGroup = new THREE.Group();
    const shades = new THREE.Mesh(G.shades, this._getSharedLambertMat(0x111111, false));
    shades.position.set(0, 1.40, 0.165);
    beachAccGroup.add(shades);

    if (index % 3 === 0) {
      const towelCol = [0xF59E0B, 0x10B981, 0xEC4899, 0x3B82F6][index % 4];
      const towel = new THREE.Mesh(G.towel, this._getSharedLambertMat(towelCol, true));
      towel.position.set(0.26, 0.88, 0);
      beachAccGroup.add(towel);
    }
    beachAccGroup.visible = false;
    npcGroup.add(beachAccGroup);

    // Capacete Amarelo de Obra (Mestre de Obras / Mutirão)
    const helmetGroup = new THREE.Group();
    const helmetMat = this._getSharedLambertMat(0xFACC15, true);
    const crown = new THREE.Mesh(G.helmetCrown, helmetMat);
    crown.position.y = 1.60;
    helmetGroup.add(crown);
    const brim = new THREE.Mesh(G.helmetBrim, helmetMat);
    brim.position.y = 1.53;
    helmetGroup.add(brim);
    helmetGroup.visible = false;
    npcGroup.add(helmetGroup);

    // Ferramenta de Obra
    const toolArm = new THREE.Group();
    toolArm.position.set(0.32, 1.05, 0);
    const handle = new THREE.Mesh(G.toolHandle, this._getSharedLambertMat(0x5C4033, false));
    handle.position.y = -0.12;
    toolArm.add(handle);
    const pickHead = new THREE.Mesh(G.pickHead, this._getSharedLambertMat(0x94A3B8, true));
    pickHead.position.y = 0.22;
    toolArm.add(pickHead);
    toolArm.visible = false;
    npcGroup.add(toolArm);

    // Carrinho de Mão da Olaria
    const cartGroup = new THREE.Group();
    cartGroup.position.set(0, 0.38, 0.85);
    const tubMat = this._getSharedLambertMat(0x6C4A2D, true);
    const tub = new THREE.Mesh(G.cartTub, tubMat);
    tub.position.y = 0.18;
    cartGroup.add(tub);
    const cartWheel = new THREE.Mesh(G.cartWheel, this._getSharedLambertMat(0x334155, true));
    cartWheel.position.set(0, 0.02, 0.52);
    cartGroup.add(cartWheel);
    const handleL = new THREE.Mesh(G.cartHandle, tubMat);
    handleL.position.set(-0.32, 0.35, -0.65);
    cartGroup.add(handleL);
    const handleR = new THREE.Mesh(G.cartHandle, tubMat);
    handleR.position.set(0.32, 0.35, -0.65);
    cartGroup.add(handleR);
    const brickCargo = new THREE.Mesh(G.brickCargo, this._getSharedLambertMat(0xB55338, true));
    brickCargo.position.y = 0.32;
    cartGroup.add(brickCargo);
    cartGroup.visible = false;
    npcGroup.add(cartGroup);

    // 9. PERNAS ARTICULADAS COM CALÇA / BERMUDA + CANELA EM TOM DE PELE + CALÇADOS (Tênis, Botas ou Chinelo)
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

    // Metade dos moradores e todos os atletas usam bermuda/shorts deixando a canela com a cor da pele humana!
    const wearsShortsInCity = wearsSkirt || isSoccerPlayer || (!isElder && (seedA % 2 === 0));
    const cityCalfMat = wearsShortsInCity ? skinMat : cityLegMat;

    const isSunga = (index % 2 === 1);
    const boardshortColors = [0x0284C7, 0x10B981, 0xF97316, 0xEC4899, 0x8B5CF6, 0xEAB308];
    const beachLegMat = isSunga ? skinMat : this._getSharedLambertMat(boardshortColors[(index + seedA) % boardshortColors.length], true);

    // Calçados variados (tênis branco, tênis preto, chuteira, bota de couro ou chinelo) com solado contrastante
    const shoeColors = [0xF8FAFC, 0x111827, 0x78350F, 0xDC2626, 0x1E40AF, 0x334155];
    const shoeHex = shoeColors[(index + seedA) % shoeColors.length];
    const shoeMat = this._getSharedLambertMat(shoeHex, true);
    const soleMat = this._getSharedLambertMat(shoeHex === 0xF8FAFC ? 0x9CA3AF : (shoeHex === 0x78350F ? 0x292524 : 0xF1F5F9), true);

    const leftLeg = new THREE.Mesh(G.leg, cityLegMat);
    leftLeg.position.set(-0.11, 0.58, 0);
    const leftCalf = new THREE.Mesh(G.calf, cityCalfMat);
    const leftShoe = new THREE.Mesh(G.shoe, shoeMat);
    leftShoe.add(new THREE.Mesh(G.sole, soleMat));
    leftLeg.add(leftCalf, leftShoe);
    leftLeg.castShadow = true;
    npcGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(G.leg, cityLegMat);
    rightLeg.position.set(0.11, 0.58, 0);
    const rightCalf = new THREE.Mesh(G.calf, cityCalfMat);
    const rightShoe = new THREE.Mesh(G.shoe, shoeMat);
    rightShoe.add(new THREE.Mesh(G.sole, soleMat));
    rightLeg.add(rightCalf, rightShoe);
    rightLeg.castShadow = true;
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
      leftSleeve,
      rightSleeve,
      leftCalf,
      rightCalf,
      leftShoe,
      rightShoe,
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
      if (npc.leftSleeve && npc.beachSleeveMat) npc.leftSleeve.material = npc.beachSleeveMat;
      if (npc.rightSleeve && npc.beachSleeveMat) npc.rightSleeve.material = npc.beachSleeveMat;
      if (npc.cityClothesDetails) npc.cityClothesDetails.visible = false;
      npc.leftLeg.material = npc.beachLegMat;
      npc.rightLeg.material = npc.beachLegMat;
      if (npc.leftCalf && npc.skinMat) npc.leftCalf.material = npc.skinMat;
      if (npc.rightCalf && npc.skinMat) npc.rightCalf.material = npc.skinMat;
      if (npc.leftShoe) npc.leftShoe.visible = false;
      if (npc.rightShoe) npc.rightShoe.visible = false;
      if (npc.sungaBrief) npc.sungaBrief.visible = true;
      if (npc.beachAccGroup) npc.beachAccGroup.visible = true;
    } else if (!isBeach && npc.isWearingBeachwear) {
      npc.isWearingBeachwear = false;
      npc.torso.material = npc.cityTorsoMat;
      if (npc.leftSleeve && npc.citySleeveMat) npc.leftSleeve.material = npc.citySleeveMat;
      if (npc.rightSleeve && npc.citySleeveMat) npc.rightSleeve.material = npc.citySleeveMat;
      if (npc.cityClothesDetails) npc.cityClothesDetails.visible = true;
      npc.leftLeg.material = npc.cityLegMat;
      npc.rightLeg.material = npc.cityLegMat;
      if (npc.leftCalf && npc.cityCalfMat) npc.leftCalf.material = npc.cityCalfMat;
      if (npc.rightCalf && npc.cityCalfMat) npc.rightCalf.material = npc.cityCalfMat;
      if (npc.leftShoe) npc.leftShoe.visible = true;
      if (npc.rightShoe) npc.rightShoe.visible = true;
      if (npc.sungaBrief) npc.sungaBrief.visible = false;
      if (npc.beachAccGroup) npc.beachAccGroup.visible = false;
    }
  }
};
