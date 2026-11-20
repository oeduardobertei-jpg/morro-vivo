import * as THREE from 'three';
import { getSharedStylizedMaterial } from '../render/StylizedMaterials.js';

let _petAssetCache = null;

function _getSharedPetAssets() {
  if (_petAssetCache) return _petAssetCache;

  const dogBodyGeo = new THREE.BoxGeometry(0.32, 0.25, 0.56);
  const dogLongBodyGeo = new THREE.BoxGeometry(0.28, 0.21, 0.72);
  const dogChestGeo = new THREE.BoxGeometry(0.27, 0.20, 0.18);
  const dogHeadGeo = new THREE.BoxGeometry(0.24, 0.22, 0.24);
  const dogSnoutGeo = new THREE.BoxGeometry(0.14, 0.11, 0.16);
  const noseGeo = new THREE.BoxGeometry(0.06, 0.045, 0.045);
  const eyeGeo = new THREE.SphereGeometry(0.028, 6, 5);
  const dogEarGeo = new THREE.ConeGeometry(0.065, 0.15, 3);
  const dogCollarGeo = new THREE.CylinderGeometry(0.14, 0.15, 0.06, 8);
  const dogBandanaGeo = new THREE.ConeGeometry(0.12, 0.18, 3);
  dogBandanaGeo.rotateX(Math.PI);

  const dogLegGeo = new THREE.BoxGeometry(0.085, 0.24, 0.09);
  dogLegGeo.translate(0, -0.12, 0);
  const dogSockGeo = new THREE.BoxGeometry(0.09, 0.075, 0.105);
  dogSockGeo.translate(0, -0.202, 0.01);

  const dogTailGeo = new THREE.CylinderGeometry(0.032, 0.048, 0.26, 6);
  dogTailGeo.translate(0, 0.12, 0);

  const catBodyGeo = new THREE.BoxGeometry(0.21, 0.18, 0.44);
  const catSpotGeo = new THREE.BoxGeometry(0.22, 0.11, 0.15);
  const catChestGeo = new THREE.BoxGeometry(0.16, 0.14, 0.12);
  const catHeadGeo = new THREE.SphereGeometry(0.125, 8, 7);
  const catMuzzleGeo = new THREE.BoxGeometry(0.10, 0.075, 0.07);
  const catNoseGeo = new THREE.BoxGeometry(0.04, 0.03, 0.03);
  const catEarGeo = new THREE.ConeGeometry(0.052, 0.12, 3);
  const catCollarGeo = new THREE.CylinderGeometry(0.095, 0.105, 0.04, 8);

  const catLegGeo = new THREE.BoxGeometry(0.062, 0.20, 0.065);
  catLegGeo.translate(0, -0.10, 0);

  const catTailSegGeo = new THREE.CylinderGeometry(0.022, 0.028, 0.28, 6);
  catTailSegGeo.translate(0, 0.13, 0);

  const particleHeartGeo = new THREE.OctahedronGeometry(0.09, 0);
  const heartPinkMat = new THREE.MeshBasicMaterial({ color: 0xFB7185, transparent: true, opacity: 0.92, depthWrite: false });
  const heartGoldMat = new THREE.MeshBasicMaterial({ color: 0xFACC15, transparent: true, opacity: 0.92, depthWrite: false });

  _petAssetCache = {
    dogBodyGeo,
    dogLongBodyGeo,
    dogChestGeo,
    dogHeadGeo,
    dogSnoutGeo,
    noseGeo,
    eyeGeo,
    dogEarGeo,
    dogCollarGeo,
    dogBandanaGeo,
    dogLegGeo,
    dogSockGeo,
    dogTailGeo,
    catBodyGeo,
    catSpotGeo,
    catChestGeo,
    catHeadGeo,
    catMuzzleGeo,
    catNoseGeo,
    catEarGeo,
    catCollarGeo,
    catLegGeo,
    catTailSegGeo,
    particleHeartGeo,
    heartPinkMat,
    heartGoldMat
  };
  return _petAssetCache;
}

const PET_DEFINITIONS = [
  // 7 Cachorros Caramelos Cariocas
  {
    id: 'pet_caramelo',
    name: 'Caramelo',
    species: 'dog',
    role: 'Prefeito do Morro',
    coatName: 'Vira-lata caramelo clássico com bandana vermelha',
    coatHex: 0xD48A3B,
    accentHex: 0xFAF3E6,
    collarHex: 0xDC2626,
    eyeHex: 0x111827,
    socks: true,
    bandana: true,
    longBody: false,
    speed: 2.3,
    homeNodes: ['sol_plaza_portico', 'alameda_patamar_3', 'alameda_patamar_2', 'alameda_crossroads']
  },
  {
    id: 'pet_pacoca',
    name: 'Paçoca',
    species: 'dog',
    role: 'Vira-Lata da Praia',
    coatName: 'Caramelo dourado de peito creme',
    coatHex: 0xE3A658,
    accentHex: 0xFDF6E7,
    collarHex: 0xF97316,
    eyeHex: 0x111827,
    socks: true,
    bandana: true,
    longBody: false,
    speed: 2.45,
    homeNodes: ['coast_w_5', 'coast_w_6', 'coast_center', 'coast_w_4']
  },
  {
    id: 'pet_pipoca',
    name: 'Pipoca',
    species: 'dog',
    role: 'Torcedor do Campinho',
    coatName: 'Caramelo claro com coleira azul',
    coatHex: 0xE7B977,
    accentHex: 0xFFF9EE,
    collarHex: 0x2563EB,
    eyeHex: 0x111827,
    socks: false,
    bandana: false,
    longBody: false,
    speed: 2.5,
    homeNodes: ['varzea_promenade', 'varzea_west', 'coast_e_1b', 'coast_e_2']
  },
  {
    id: 'pet_biscoito',
    name: 'Biscoito',
    species: 'dog',
    role: 'Ajudante da Feira',
    coatName: 'Caramelo escuro de bandana verde',
    coatHex: 0xA66227,
    accentHex: 0xF3E0C0,
    collarHex: 0x16A34A,
    eyeHex: 0x111827,
    socks: true,
    bandana: true,
    longBody: false,
    speed: 2.25,
    homeNodes: ['varzea_market', 'mid_e_0', 'coast_e_3', 'varzea_promenade']
  },
  {
    id: 'pet_toby',
    name: 'Toby do Píer',
    species: 'dog',
    role: 'Amigo dos Pescadores',
    coatName: 'Caramelo clássico com coleira turquesa',
    coatHex: 0xCC8236,
    accentHex: 0xF7EBD5,
    collarHex: 0x0D9488,
    eyeHex: 0x111827,
    socks: true,
    bandana: false,
    longBody: false,
    speed: 2.2,
    homeNodes: ['coast_w_2', 'coast_w_3', 'coast_w_1']
  },
  {
    id: 'pet_salsicha',
    name: 'Salsicha',
    species: 'dog',
    role: 'Guardião da Capela',
    coatName: 'Caramelo alongado com bandana amarela',
    coatHex: 0xB86D2A,
    accentHex: 0xF5DFB8,
    collarHex: 0xFACC15,
    eyeHex: 0x111827,
    socks: false,
    bandana: true,
    longBody: true,
    speed: 2.05,
    homeNodes: ['hub_capela_poente', 'exp_w_2', 'exp_w_3', 'coast_exp_w_2']
  },
  {
    id: 'pet_cafe',
    name: 'Café',
    species: 'dog',
    role: 'Companheiro da Bocha',
    coatName: 'Caramelo tostado com coleira laranja',
    coatHex: 0x8F5328,
    accentHex: 0xEED5B0,
    collarHex: 0xEA580C,
    eyeHex: 0x111827,
    socks: true,
    bandana: false,
    longBody: false,
    speed: 2.35,
    homeNodes: ['hub_praca_levante', 'exp_e_2', 'exp_e_3', 'coast_exp_e_2']
  },

  // 3 Gatos Andarilhos de Beco/Peixaria
  {
    id: 'pet_frajola',
    name: 'Frajola',
    species: 'cat',
    isRooftop: false,
    role: 'Fiscal da Peixaria',
    coatName: 'Gato frajola preto e branco',
    coatHex: 0x1F242B,
    accentHex: 0xF8FAFC,
    spotHex: 0xF8FAFC,
    collarHex: 0xDC2626,
    eyeHex: 0x34D399,
    speed: 1.9,
    homeNodes: ['coast_w_1', 'viela_w_0', 'coast_far_w_2']
  },
  {
    id: 'pet_laranjinha',
    name: 'Laranjinha',
    species: 'cat',
    isRooftop: false,
    role: 'Rei do Boteco',
    coatName: 'Gato laranja rajado de bigode branco',
    coatHex: 0xEA8435,
    accentHex: 0xFFF7E6,
    spotHex: 0xC25E18,
    collarHex: 0x0EA5E9,
    eyeHex: 0xF59E0B,
    speed: 1.95,
    homeNodes: ['varzea_west', 'coast_e_1b', 'coast_e_1']
  },
  {
    id: 'pet_chico_bento',
    name: 'Chico Bento',
    species: 'cat',
    isRooftop: false,
    role: 'Vigia da Serra',
    coatName: 'Siamês creme de orelhas café',
    coatHex: 0xE5D3B3,
    accentHex: 0x5B4033,
    spotHex: 0x5B4033,
    collarHex: 0x10B981,
    eyeHex: 0x38BDF8,
    speed: 1.85,
    homeNodes: ['high_crista_w', 'exp_n_center', 'hub_anfiteatro_sela', 'torre_radio']
  },

  // 3 Gatos de Laje (Tomando Sol nas Lajes Planas)
  {
    id: 'pet_mingau',
    name: 'Mingau',
    species: 'cat',
    isRooftop: true,
    preferFaction: 'sol',
    role: 'Soneca da Laje',
    coatName: 'Gato branco com manchinhas cinza',
    coatHex: 0xF8FAFC,
    accentHex: 0xF8FAFC,
    spotHex: 0x8E959E,
    collarHex: 0x3B82F6,
    eyeHex: 0x34D399,
    speed: 0,
    fallbackNode: 'alameda_patamar_2'
  },
  {
    id: 'pet_amora',
    name: 'Amora',
    species: 'cat',
    isRooftop: true,
    preferFaction: 'varzea',
    role: 'Sentinela do Sol',
    coatName: 'Gata tricolor calico de laje',
    coatHex: 0xFAF5EE,
    accentHex: 0x1F242B,
    spotHex: 0xD97724,
    collarHex: 0xEC4899,
    eyeHex: 0xF59E0B,
    speed: 0,
    fallbackNode: 'varzea_market'
  },
  {
    id: 'pet_lua',
    name: 'Lua',
    species: 'cat',
    isRooftop: true,
    preferFaction: 'prainha',
    role: 'Gata da Sorte',
    coatName: 'Gata preta de olhos verdes e coleira dourada',
    coatHex: 0x181B20,
    accentHex: 0x242830,
    spotHex: null,
    collarHex: 0xFACC15,
    eyeHex: 0x34D399,
    speed: 0,
    fallbackNode: 'coast_w_4'
  }
];

function dampVal(current, target, lambda, delta) {
  return THREE.MathUtils.damp(current, target, lambda, delta);
}

function smoothAnglePet(current, target, lambda, delta) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1.0 - Math.exp(-lambda * delta));
}

export class PetManager {
  constructor(scene, terrain, architecture, npcManager) {
    this.scene = scene;
    this.terrain = terrain;
    this.arch = architecture;
    this.npcs = npcManager;
    this.env = null;
    this.soundtrack = null;

    this.group = new THREE.Group();
    this.pets = [];
    this.particles = [];
    this.scene.add(this.group);
  }

  setEnvironment(env) {
    this.env = env;
  }

  setSoundtrack(soundtrack) {
    this.soundtrack = soundtrack;
  }

  buildDogMesh(cfg) {
    const a = _getSharedPetAssets();
    const coatMat = getSharedStylizedMaterial(cfg.coatHex, 'fabric', { flatShading: true });
    const accentMat = getSharedStylizedMaterial(cfg.accentHex || 0xFAF3E6, 'fabric', { flatShading: true });
    const collarMat = getSharedStylizedMaterial(cfg.collarHex || 0xDC2626, 'fabric', { flatShading: true });
    const noseMat = getSharedStylizedMaterial(0x1C1917, 'plaster', { flatShading: true });
    const eyeMat = getSharedStylizedMaterial(cfg.eyeHex || 0x111827, 'ceramic', { flatShading: true });

    const root = new THREE.Group();
    const bodyBaseY = cfg.longBody ? 0.30 : 0.34;
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, bodyBaseY, 0);
    root.add(bodyGroup);

    const torso = new THREE.Mesh(cfg.longBody ? a.dogLongBodyGeo : a.dogBodyGeo, coatMat);
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    const chest = new THREE.Mesh(a.dogChestGeo, accentMat);
    chest.position.set(0, -0.02, cfg.longBody ? 0.29 : 0.21);
    bodyGroup.add(chest);

    const collar = new THREE.Mesh(a.dogCollarGeo, collarMat);
    collar.rotation.x = 0.35;
    collar.position.set(0, 0.08, cfg.longBody ? 0.30 : 0.22);
    bodyGroup.add(collar);

    if (cfg.bandana) {
      const bandana = new THREE.Mesh(a.dogBandanaGeo, collarMat);
      bandana.position.set(0, -0.04, cfg.longBody ? 0.38 : 0.30);
      bandana.rotation.x = 0.22;
      bodyGroup.add(bandana);
    }

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.20, cfg.longBody ? 0.33 : 0.25);
    bodyGroup.add(headGroup);

    const skull = new THREE.Mesh(a.dogHeadGeo, coatMat);
    skull.castShadow = true;
    headGroup.add(skull);

    const muzzle = new THREE.Mesh(a.dogSnoutGeo, coatMat);
    muzzle.position.set(0, -0.04, 0.16);
    muzzle.castShadow = true;
    headGroup.add(muzzle);

    const trufa = new THREE.Mesh(a.noseGeo, noseMat);
    trufa.position.set(0, -0.015, 0.24);
    headGroup.add(trufa);

    [-0.068, 0.068].forEach((ex) => {
      const eye = new THREE.Mesh(a.eyeGeo, eyeMat);
      eye.position.set(ex, 0.04, 0.115);
      headGroup.add(eye);
    });

    const earL = new THREE.Mesh(a.dogEarGeo, coatMat);
    earL.position.set(-0.115, 0.10, -0.01);
    earL.rotation.set(0.25, 0, 0.45);
    headGroup.add(earL);

    const earR = new THREE.Mesh(a.dogEarGeo, coatMat);
    earR.position.set(0.115, 0.10, -0.01);
    earR.rotation.set(0.25, 0, -0.45);
    headGroup.add(earR);

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.08, cfg.longBody ? -0.34 : -0.26);
    tailPivot.rotation.x = -0.68;
    const tailMesh = new THREE.Mesh(a.dogTailGeo, coatMat);
    tailMesh.castShadow = true;
    tailPivot.add(tailMesh);
    bodyGroup.add(tailPivot);

    const legX = 0.11;
    const legZFront = cfg.longBody ? 0.25 : 0.18;
    const legZBack = cfg.longBody ? -0.25 : -0.18;
    const makeLeg = (x, z, withSock) => {
      const lg = new THREE.Group();
      lg.position.set(x, 0.24, z);
      const upper = new THREE.Mesh(a.dogLegGeo, coatMat);
      upper.castShadow = true;
      lg.add(upper);
      if (withSock) {
        const sock = new THREE.Mesh(a.dogSockGeo, accentMat);
        lg.add(sock);
      }
      root.add(lg);
      return lg;
    };

    const flLeg = makeLeg(-legX, legZFront, cfg.socks);
    const frLeg = makeLeg(legX, legZFront, cfg.socks);
    const blLeg = makeLeg(-legX, legZBack, cfg.socks);
    const brLeg = makeLeg(legX, legZBack, false);

    return { root, bodyGroup, bodyBaseY, headGroup, earL, earR, tailPivot, flLeg, frLeg, blLeg, brLeg };
  }

  buildCatMesh(cfg) {
    const a = _getSharedPetAssets();
    const coatMat = getSharedStylizedMaterial(cfg.coatHex, 'fabric', { flatShading: true });
    const accentMat = getSharedStylizedMaterial(cfg.accentHex || cfg.coatHex, 'fabric', { flatShading: true });
    const spotMat = cfg.spotHex ? getSharedStylizedMaterial(cfg.spotHex, 'fabric', { flatShading: true }) : null;
    const collarMat = getSharedStylizedMaterial(cfg.collarHex || 0xDC2626, 'fabric', { flatShading: true });
    const noseMat = getSharedStylizedMaterial(0xFB7185, 'plaster', { flatShading: true });
    const eyeMat = getSharedStylizedMaterial(cfg.eyeHex || 0x34D399, 'ceramic', { flatShading: true });

    const root = new THREE.Group();
    const bodyBaseY = 0.28;
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, bodyBaseY, 0);
    root.add(bodyGroup);

    const torso = new THREE.Mesh(a.catBodyGeo, coatMat);
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    if (spotMat) {
      const saddle = new THREE.Mesh(a.catSpotGeo, spotMat);
      saddle.position.set(0, 0.04, -0.02);
      bodyGroup.add(saddle);
    }

    const chest = new THREE.Mesh(a.catChestGeo, accentMat);
    chest.position.set(0, -0.02, 0.17);
    bodyGroup.add(chest);

    const collar = new THREE.Mesh(a.catCollarGeo, collarMat);
    collar.rotation.x = 0.30;
    collar.position.set(0, 0.06, 0.18);
    bodyGroup.add(collar);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.14, 0.21);
    bodyGroup.add(headGroup);

    const skull = new THREE.Mesh(a.catHeadGeo, spotMat && cfg.id === 'pet_chico_bento' ? spotMat : coatMat);
    skull.castShadow = true;
    headGroup.add(skull);

    const muzzle = new THREE.Mesh(a.catMuzzleGeo, cfg.id === 'pet_frajola' ? accentMat : coatMat);
    muzzle.position.set(0, -0.03, 0.095);
    headGroup.add(muzzle);

    const nose = new THREE.Mesh(a.catNoseGeo, noseMat);
    nose.position.set(0, -0.01, 0.13);
    headGroup.add(nose);

    [-0.05, 0.05].forEach((ex) => {
      const eye = new THREE.Mesh(a.eyeGeo, eyeMat);
      eye.scale.setScalar(0.85);
      eye.position.set(ex, 0.025, 0.10);
      headGroup.add(eye);
    });

    const earMat = cfg.id === 'pet_chico_bento' && spotMat ? spotMat : coatMat;
    const earL = new THREE.Mesh(a.catEarGeo, earMat);
    earL.position.set(-0.075, 0.12, 0);
    earL.rotation.z = 0.24;
    headGroup.add(earL);

    const earR = new THREE.Mesh(a.catEarGeo, earMat);
    earR.position.set(0.075, 0.12, 0);
    earR.rotation.z = -0.24;
    headGroup.add(earR);

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.05, -0.20);
    tailPivot.rotation.x = -0.55;
    const tailMat = spotMat && cfg.id === 'pet_chico_bento' ? spotMat : coatMat;
    const tailMesh = new THREE.Mesh(a.catTailSegGeo, tailMat);
    tailMesh.castShadow = true;
    tailPivot.add(tailMesh);
    bodyGroup.add(tailPivot);

    const makeLeg = (x, z) => {
      const lg = new THREE.Group();
      lg.position.set(x, 0.20, z);
      const legMesh = new THREE.Mesh(a.catLegGeo, cfg.id === 'pet_frajola' ? accentMat : coatMat);
      legMesh.castShadow = true;
      lg.add(legMesh);
      root.add(lg);
      return lg;
    };

    const flLeg = makeLeg(-0.07, 0.14);
    const frLeg = makeLeg(0.07, 0.14);
    const blLeg = makeLeg(-0.07, -0.14);
    const brLeg = makeLeg(0.07, -0.14);

    return { root, bodyGroup, bodyBaseY, headGroup, earL, earR, tailPivot, flLeg, frLeg, blLeg, brLeg };
  }

  _pickRoadNode(id) {
    const map = this.npcs && this.npcs.roadNodesMap;
    if (map && map.has(id)) return map.get(id);
    return (this.npcs && this.npcs.roadNodes && this.npcs.roadNodes[0]) || null;
  }

  _placeRooftopCat(pet, usedHouseIds) {
    const houses = (this.arch && this.arch.houses) || [];
    const findLajeHouse = (factionFilter) => houses.find((h) =>
      h &&
      !usedHouseIds.has(h.id) &&
      h.roofStyle === 'laje' &&
      h.lajeTopY !== undefined &&
      h.position &&
      (!factionFilter || h.faction === factionFilter)
    );

    const targetHouse = findLajeHouse(pet.preferFaction) || findLajeHouse(null);
    if (targetHouse) {
      usedHouseIds.add(targetHouse.id);
      const rotY = targetHouse.meshGroup ? targetHouse.meshGroup.rotation.y : 0;
      const localOff = new THREE.Vector3(0, targetHouse.lajeTopY, 1.15);
      localOff.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      pet.group.position.set(
        targetHouse.position.x + localOff.x,
        targetHouse.position.y + localOff.y,
        targetHouse.position.z + localOff.z
      );
      pet.group.rotation.y = rotY;
      pet.rooftopHouse = targetHouse;
      pet.rooftopBaseY = pet.group.position.y;
      pet.isRooftop = true;
      pet.state = 'napping';
      pet.stateTimer = 4.0 + Math.random() * 6.0;
      pet.currentAction = '☀️ Tomando sol na laje de frente pro mar';
      return;
    }

    // Fallback seguro caso nenhuma casa possua laje plana: vai para o piso do bairro sem flutuar
    pet.isRooftop = false;
    const node = this._pickRoadNode(pet.fallbackNode || 'alameda_patamar_2');
    if (node) {
      pet.currentNodeId = node.id;
      pet.targetNodeId = node.id;
      pet.targetPos.set(node.x, this.npcs.getFloorElevation(node.x, node.z), node.z);
      pet.group.position.copy(pet.targetPos);
    }
  }

  spawnInitialPets() {
    this.clearAll();
    const usedLajeHouseIds = new Set();

    PET_DEFINITIONS.forEach((def, idx) => {
      const rig = def.species === 'dog' ? this.buildDogMesh(def) : this.buildCatMesh(def);
      const pet = {
        ...def,
        group: rig.root,
        bodyGroup: rig.bodyGroup,
        bodyBaseY: rig.bodyBaseY,
        headGroup: rig.headGroup,
        earL: rig.earL,
        earR: rig.earR,
        tailPivot: rig.tailPivot,
        flLeg: rig.flLeg,
        frLeg: rig.frLeg,
        blLeg: rig.blLeg,
        brLeg: rig.brLeg,
        seed: idx * 1.7 + 0.5,
        walkCycle: idx * 1.1,
        cuddles: 0,
        lastHarmonyCuddleAt: -999,
        joyTimer: 0,
        state: 'walking',
        stateTimer: 2.0 + (idx % 4) * 1.1,
        currentAction: def.species === 'dog' ? '🐾 Farejando a rua com rabinho alegre' : '🐈 Passeando pelas calçadas do morro',
        targetPos: new THREE.Vector3(),
        currentNodeId: null,
        targetNodeId: null,
        pathQueue: [],
        isPet: true,
        stuckTimer: 0,
        stuckLastPos: new THREE.Vector3(),
        rooftopHouse: null,
        rooftopBaseY: 0
      };

      if (def.isRooftop) {
        this._placeRooftopCat(pet, usedLajeHouseIds);
      } else {
        const startId = (def.homeNodes && def.homeNodes[0]) || 'alameda_crossroads';
        const startNode = this._pickRoadNode(startId);
        const sx = startNode ? startNode.x + (Math.sin(idx * 3.1) * 0.65) : 0;
        const sz = startNode ? startNode.z + (Math.cos(idx * 2.7) * 0.65) : 0;
        const sy = this.npcs && this.npcs.getFloorElevation ? this.npcs.getFloorElevation(sx, sz) : 4.0;
        pet.group.position.set(sx, sy, sz);
        pet.currentNodeId = startNode ? startNode.id : startId;
        this._chooseNextTarget(pet);
        if (this.npcs && this.npcs.resolveHouseAndWorldObstacles) {
          this.npcs.resolveHouseAndWorldObstacles(pet, 0.016);
          pet.group.position.y = this.npcs.getFloorElevation(pet.group.position.x, pet.group.position.z);
        }
      }

      this.group.add(pet.group);
      this.pets.push(pet);
    });
  }

  _chooseNextTarget(pet) {
    const homeIds = pet.homeNodes || [];
    const curId = pet.currentNodeId || homeIds[0] || 'alameda_crossroads';
    const curNode = this._pickRoadNode(curId);

    // Se já houver rota viária planejada na fila, avança pelo próximo nó conectado da rua
    if (pet.pathQueue && pet.pathQueue.length > 0) {
      const nextId = pet.pathQueue.shift();
      const nextNode = this._pickRoadNode(nextId);
      if (nextNode) {
        pet.targetNodeId = nextNode.id;
        const ox = (Math.random() - 0.5) * 0.9;
        const oz = (Math.random() - 0.5) * 0.9;
        const ty = this.npcs && this.npcs.getFloorElevation ? this.npcs.getFloorElevation(nextNode.x + ox, nextNode.z + oz) : 4.0;
        pet.targetPos.set(nextNode.x + ox, ty, nextNode.z + oz);
        return;
      }
    }

    let candidates = [];
    if (homeIds.length > 1) {
      candidates = homeIds.filter((id) => id !== curId);
    }
    if (candidates.length === 0 && curNode && curNode.neighbors && curNode.neighbors.length > 0) {
      candidates = curNode.neighbors.filter((id) => id !== pet.targetNodeId);
      if (candidates.length === 0) candidates = curNode.neighbors;
    }

    const goalId = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : curId;

    // Traça caminho conectado pelo grafo viário para que pets nunca atravessem paredes em linha reta!
    let nextId = goalId;
    if (this.npcs && this.npcs.findRoadPath && curNode) {
      const path = this.npcs.findRoadPath(curNode.id, goalId);
      if (path && path.length > 1) {
        pet.pathQueue = path.slice(1);
        nextId = pet.pathQueue.shift();
      }
    }

    const dest = this._pickRoadNode(nextId);
    if (dest) {
      pet.targetNodeId = dest.id;
      const ox = (Math.random() - 0.5) * 0.95;
      const oz = (Math.random() - 0.5) * 0.95;
      const ty = this.npcs && this.npcs.getFloorElevation ? this.npcs.getFloorElevation(dest.x + ox, dest.z + oz) : 4.0;
      pet.targetPos.set(dest.x + ox, ty, dest.z + oz);
    }
  }

  _getCurrentPhase() {
    if (!this.env || !this.env.getTimeOfDay) return 'day';
    const info = this.env.getTimeOfDay();
    return typeof info === 'string' ? info : (info.phase || 'day');
  }

  greetOnSelect(pet) {
    if (!pet) return;
    pet.joyTimer = Math.max(pet.joyTimer, 1.1);
    if (this.soundtrack) {
      if (pet.species === 'dog' && this.soundtrack.playDogBark) {
        this.soundtrack.playDogBark(pet.group.position);
      } else if (pet.species === 'cat' && this.soundtrack.playCatMeow) {
        this.soundtrack.playCatMeow(pet.group.position);
      }
    }
  }

  petAnimal(pet) {
    if (!pet || !pet.group) return { grantedHarmony: false };
    pet.cuddles = (pet.cuddles || 0) + 1;
    pet.joyTimer = 2.6;
    pet.currentAction = pet.species === 'dog'
      ? '💛 Abanando o rabo super feliz pelo carinho!'
      : '💚 Ronronando alto ao receber cafuné!';

    this.spawnHeartBurst(pet.group.position);

    if (this.soundtrack) {
      if (pet.species === 'dog' && this.soundtrack.playDogBark) {
        this.soundtrack.playDogBark(pet.group.position);
      } else if (pet.species === 'cat' && this.soundtrack.playCatMeow) {
        this.soundtrack.playCatMeow(pet.group.position);
      }
    }

    const nowSec = performance.now() * 0.001;
    const grantedHarmony = (nowSec - (pet.lastHarmonyCuddleAt || -999)) >= 15.0;
    if (grantedHarmony) {
      pet.lastHarmonyCuddleAt = nowSec;
    }
    return { grantedHarmony };
  }

  spawnHeartBurst(pos) {
    const a = _getSharedPetAssets();
    for (let i = 0; i < 5; i++) {
      const mat = (i % 2 === 0 ? a.heartPinkMat : a.heartGoldMat).clone();
      const mesh = new THREE.Mesh(a.particleHeartGeo, mat);
      const ang = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
      mesh.position.set(
        pos.x + Math.cos(ang) * 0.25,
        pos.y + 0.72 + Math.random() * 0.18,
        pos.z + Math.sin(ang) * 0.25
      );
      this.group.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(ang) * 0.45, 0.95 + Math.random() * 0.45, Math.sin(ang) * 0.45),
        life: 1.0
      });
    }
  }

  _updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= delta * 0.95;
      pt.mesh.position.addScaledVector(pt.vel, delta);
      pt.mesh.rotation.y += delta * 3.5;
      pt.mesh.scale.setScalar(Math.max(0.2, pt.life));
      if (pt.mesh.material) {
        pt.mesh.material.opacity = Math.max(0, pt.life * 0.9);
      }
      if (pt.life <= 0) {
        this.group.remove(pt.mesh);
        if (pt.mesh.material) pt.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  _animateLimbs(pet, delta, time, moving) {
    const joy = pet.joyTimer > 0;
    const isNight = this._getCurrentPhase() === 'night';

    if (pet.isRooftop) {
      const sleeping = pet.state === 'napping' && !joy;
      const breath = Math.sin(time * 2.2 + pet.seed) * 0.012;
      const targetBodyY = joy
        ? pet.bodyBaseY + Math.abs(Math.sin(time * 12)) * 0.10
        : (sleeping ? 0.11 + breath : pet.bodyBaseY + breath);
      pet.bodyGroup.position.y = dampVal(pet.bodyGroup.position.y, targetBodyY, 10.0, delta);
      pet.bodyGroup.rotation.x = dampVal(pet.bodyGroup.rotation.x, joy ? -0.14 : (sleeping ? 0.05 : -0.06), 8.0, delta);
      pet.headGroup.rotation.y = dampVal(pet.headGroup.rotation.y, sleeping ? 0.45 : Math.sin(time * 0.9 + pet.seed) * 0.45, 5.0, delta);
      pet.headGroup.rotation.x = dampVal(pet.headGroup.rotation.x, sleeping ? 0.35 : -0.05, 6.0, delta);
      const legCurl = sleeping ? -1.15 : 0;
      pet.flLeg.rotation.x = dampVal(pet.flLeg.rotation.x, legCurl, 8.0, delta);
      pet.frLeg.rotation.x = dampVal(pet.frLeg.rotation.x, legCurl, 8.0, delta);
      pet.blLeg.rotation.x = dampVal(pet.blLeg.rotation.x, sleeping ? 1.15 : 0, 8.0, delta);
      pet.brLeg.rotation.x = dampVal(pet.brLeg.rotation.x, sleeping ? 1.15 : 0, 8.0, delta);
      pet.tailPivot.rotation.z = Math.sin(time * (joy ? 11.0 : 2.6) + pet.seed) * (joy ? 0.55 : 0.25);
      return;
    }

    const napping = pet.state === 'napping' && !moving && !joy;
    const sniffing = pet.state === 'sniffing' && !moving && !joy;

    if (moving) {
      pet.walkCycle += delta * (pet.species === 'dog' ? 12.0 : 9.5);
      const swing = Math.sin(pet.walkCycle) * 0.65;
      const bounce = Math.abs(Math.sin(pet.walkCycle)) * 0.035;
      pet.flLeg.rotation.x = dampVal(pet.flLeg.rotation.x, swing, 18.0, delta);
      pet.brLeg.rotation.x = dampVal(pet.brLeg.rotation.x, swing, 18.0, delta);
      pet.frLeg.rotation.x = dampVal(pet.frLeg.rotation.x, -swing, 18.0, delta);
      pet.blLeg.rotation.x = dampVal(pet.blLeg.rotation.x, -swing, 18.0, delta);
      pet.bodyGroup.position.y = dampVal(pet.bodyGroup.position.y, pet.bodyBaseY + bounce, 18.0, delta);
      pet.bodyGroup.rotation.x = dampVal(pet.bodyGroup.rotation.x, 0, 12.0, delta);
      pet.headGroup.rotation.x = dampVal(pet.headGroup.rotation.x, 0.06, 10.0, delta);
      pet.headGroup.rotation.y = dampVal(pet.headGroup.rotation.y, Math.sin(time * 2.2 + pet.seed) * 0.14, 6.0, delta);
    } else if (joy) {
      const hop = Math.abs(Math.sin(time * 13.5 + pet.seed)) * 0.14;
      pet.bodyGroup.position.y = dampVal(pet.bodyGroup.position.y, pet.bodyBaseY + hop, 20.0, delta);
      pet.bodyGroup.rotation.x = dampVal(pet.bodyGroup.rotation.x, -0.18, 12.0, delta);
      pet.headGroup.rotation.x = dampVal(pet.headGroup.rotation.x, -0.25, 12.0, delta);
      pet.headGroup.rotation.z = Math.sin(time * 7.5) * 0.22;
      pet.flLeg.rotation.x = dampVal(pet.flLeg.rotation.x, -0.35 + Math.sin(time * 14) * 0.25, 18.0, delta);
      pet.frLeg.rotation.x = dampVal(pet.frLeg.rotation.x, -0.35 - Math.sin(time * 14) * 0.25, 18.0, delta);
      pet.blLeg.rotation.x = dampVal(pet.blLeg.rotation.x, 0.2, 16.0, delta);
      pet.brLeg.rotation.x = dampVal(pet.brLeg.rotation.x, 0.2, 16.0, delta);
    } else if (napping) {
      const breath = Math.sin(time * 2.0 + pet.seed) * 0.012;
      const restY = pet.species === 'dog' ? 0.14 : 0.11;
      pet.bodyGroup.position.y = dampVal(pet.bodyGroup.position.y, restY + breath, 8.0, delta);
      pet.bodyGroup.rotation.x = dampVal(pet.bodyGroup.rotation.x, 0.04, 8.0, delta);
      pet.headGroup.rotation.x = dampVal(pet.headGroup.rotation.x, 0.34, 6.0, delta);
      pet.headGroup.rotation.y = dampVal(pet.headGroup.rotation.y, 0.35, 6.0, delta);
      pet.headGroup.rotation.z = dampVal(pet.headGroup.rotation.z, 0, 8.0, delta);
      pet.flLeg.rotation.x = dampVal(pet.flLeg.rotation.x, -1.25, 10.0, delta);
      pet.frLeg.rotation.x = dampVal(pet.frLeg.rotation.x, -1.25, 10.0, delta);
      pet.blLeg.rotation.x = dampVal(pet.blLeg.rotation.x, 1.25, 10.0, delta);
      pet.brLeg.rotation.x = dampVal(pet.brLeg.rotation.x, 1.25, 10.0, delta);
    } else {
      const sniffDip = sniffing ? (0.48 + Math.sin(time * 6.5) * 0.12) : 0.05;
      pet.bodyGroup.position.y = dampVal(pet.bodyGroup.position.y, pet.bodyBaseY, 12.0, delta);
      pet.bodyGroup.rotation.x = dampVal(pet.bodyGroup.rotation.x, sniffing ? 0.14 : 0, 10.0, delta);
      pet.headGroup.rotation.x = dampVal(pet.headGroup.rotation.x, sniffDip, 10.0, delta);
      pet.headGroup.rotation.y = dampVal(pet.headGroup.rotation.y, Math.sin(time * 2.8 + pet.seed) * 0.32, 6.0, delta);
      pet.headGroup.rotation.z = dampVal(pet.headGroup.rotation.z, 0, 8.0, delta);
      pet.flLeg.rotation.x = dampVal(pet.flLeg.rotation.x, 0, 12.0, delta);
      pet.frLeg.rotation.x = dampVal(pet.frLeg.rotation.x, 0, 12.0, delta);
      pet.blLeg.rotation.x = dampVal(pet.blLeg.rotation.x, 0, 12.0, delta);
      pet.brLeg.rotation.x = dampVal(pet.brLeg.rotation.x, 0, 12.0, delta);
    }

    const tailFreq = joy ? 15.0 : (pet.species === 'dog' ? (isNight && pet.id === 'pet_caramelo' ? 8.5 : 6.0) : 2.5);
    const tailAmp = joy ? 0.65 : (napping ? 0.08 : (pet.species === 'dog' ? 0.42 : 0.25));
    pet.tailPivot.rotation.z = Math.sin(time * tailFreq + pet.seed) * tailAmp;
    if (pet.species === 'dog' && isNight && pet.id === 'pet_caramelo') {
      pet.earL.rotation.z = 0.45 + Math.sin(time * 4.5) * 0.14;
      pet.earR.rotation.z = -0.45 - Math.cos(time * 4.5) * 0.14;
    }
  }

  update(delta) {
    const dt = Math.min(delta, 0.08);
    const time = performance.now() * 0.001;
    const phase = this._getCurrentPhase();
    const isNight = phase === 'night';

    for (let i = 0; i < this.pets.length; i++) {
      const pet = this.pets[i];
      if (!pet || !pet.group) continue;

      if (pet.joyTimer > 0) {
        pet.joyTimer = Math.max(0, pet.joyTimer - dt);
        pet.group.rotation.y += dt * (pet.species === 'dog' ? 1.8 : 0.4);
      }

      if (pet.isRooftop) {
        pet.stateTimer -= dt;
        if (pet.stateTimer <= 0) {
          pet.state = pet.state === 'napping' ? 'watching' : 'napping';
          pet.stateTimer = pet.state === 'napping' ? (6.5 + Math.random() * 5.0) : (4.0 + Math.random() * 4.0);
          pet.currentAction = pet.state === 'napping'
            ? (isNight ? '🌙 Cochilando enroscado na laje tranquila' : '☀️ Tomando sol na laje de frente pro mar')
            : '👀 Vigiando o movimento das ruas lá embaixo';
        }
        // Sincroniza dinamicamente a altura da laje caso a casa suba de nível (puxadinho N2/N3)!
        if (pet.rooftopHouse && pet.rooftopHouse.position) {
          if (pet.rooftopHouse.roofStyle === 'laje' && pet.rooftopHouse.lajeTopY !== undefined) {
            pet.rooftopBaseY = pet.rooftopHouse.position.y + pet.rooftopHouse.lajeTopY;
          } else {
            this._placeRooftopCat(pet, new Set());
          }
        }
        if (pet.rooftopBaseY) {
          pet.group.position.y = pet.rooftopBaseY;
        }
        this._animateLimbs(pet, dt, time, false);
        continue;
      }

      pet.stateTimer -= dt;
      if (pet.joyTimer <= 0 && pet.stateTimer <= 0) {
        if (pet.state === 'walking') {
          const sleepChance = isNight && pet.species === 'dog' ? 0.62 : 0.34;
          pet.state = Math.random() < sleepChance ? 'napping' : 'sniffing';
          pet.stateTimer = pet.state === 'napping' ? (6.0 + Math.random() * 5.0) : (2.2 + Math.random() * 2.0);
          pet.currentAction = pet.state === 'napping'
            ? '💤 Tirando uma soneca preguiçosa na calçada'
            : (pet.species === 'dog' ? '👃 Farejando a esquina atrás de petisco' : '👀 Observando pássaros na encosta');
        } else {
          pet.state = 'walking';
          pet.stateTimer = 4.5 + Math.random() * 5.5;
          this._chooseNextTarget(pet);
          pet.currentAction = pet.species === 'dog'
            ? '🐾 Trotando alegremente pelas ruas do bairro'
            : '🐈 Rondando os becos e quintais sem pressa';
        }
      }

      let isMovingNow = false;
      if (pet.state === 'walking' && pet.joyTimer <= 0) {
        const dx = pet.targetPos.x - pet.group.position.x;
        const dz = pet.targetPos.z - pet.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1.1) {
          pet.currentNodeId = pet.targetNodeId;
          this._chooseNextTarget(pet);
        } else {
          const step = Math.min(dist, pet.speed * dt);
          const nx = dx / dist;
          const nz = dz / dist;
          pet.group.position.x += nx * step;
          pet.group.position.z += nz * step;
          pet.group.rotation.y = smoothAnglePet(pet.group.rotation.y, Math.atan2(nx, nz), 9.5, dt);
          isMovingNow = true;

          // Stuck Watchdog para Pets Terrestres: evita travamento em quinas de muros ou becos
          pet.stuckTimer = (pet.stuckTimer || 0) + dt;
          if (pet.stuckTimer >= 2.0) {
            pet.stuckTimer = 0;
            if (pet.stuckLastPos) {
              const moved = Math.hypot(
                pet.group.position.x - pet.stuckLastPos.x,
                pet.group.position.z - pet.stuckLastPos.z
              );
              if (moved < 0.25) {
                pet.avoidSide = -(pet.avoidSide || 1);
                pet.avoidSideTimer = 1.4;
                pet.pathQueue = [];
                this._chooseNextTarget(pet);
              }
            }
            pet.stuckLastPos.copy(pet.group.position);
          }
        }
      }

      if (this.npcs && this.npcs.resolveHouseAndWorldObstacles) {
        this.npcs.resolveHouseAndWorldObstacles(pet, dt);
      }
      if (this.npcs && this.npcs.getFloorElevation) {
        pet.group.position.y = this.npcs.getFloorElevation(pet.group.position.x, pet.group.position.z);
      }

      this._animateLimbs(pet, dt, time, isMovingNow);
    }

    this._updateParticles(dt);
  }

  clearAll() {
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      this.group.remove(pt.mesh);
      if (pt.mesh.material) pt.mesh.material.dispose();
    }
    this.particles = [];

    for (let i = 0; i < this.pets.length; i++) {
      if (this.pets[i] && this.pets[i].group) {
        this.group.remove(this.pets[i].group);
      }
    }
    this.pets = [];
  }

  resetForNewWorld() {
    this.spawnInitialPets();
  }
}
