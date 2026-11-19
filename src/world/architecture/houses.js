import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createStylizedFigure } from '../npcs/population.js';
import { getSharedStylizedMaterial } from '../../render/StylizedMaterials.js';

const _cmpInv = new THREE.Matrix4();
const _cmpRel = new THREE.Matrix4();

function _compactStaticChildren(root, sharedSet, skipSubtrees = null) {
  root.updateMatrixWorld(true);
  _cmpInv.copy(root.matrixWorld).invert();

  const buckets = new Map();
  const walk = (node) => {
    if (skipSubtrees && skipSubtrees.has(node)) return;
    if (node.userData && node.userData.dynamic) return;
    if (node.isMesh && node !== root) {
      const m = node.material;
      if (m && !Array.isArray(m) && !m.transparent && m.opacity >= 1) {
        const key = `${m.uuid}|${node.castShadow ? 1 : 0}|${node.receiveShadow ? 1 : 0}`;
        let list = buckets.get(key);
        if (!list) {
          list = [];
          buckets.set(key, list);
        }
        list.push(node);
      }
      return;
    }
    const ch = node.children;
    for (let i = 0; i < ch.length; i++) walk(ch[i]);
  };
  walk(root);

  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = [];
    for (let i = 0; i < list.length; i++) {
      const mesh = list[i];
      const srcGeo = mesh.geometry;
      if (!srcGeo || !srcGeo.attributes.position) continue;
      const g = srcGeo.index ? srcGeo.toNonIndexed() : srcGeo.clone();
      for (const attr of Object.keys(g.attributes)) {
        if (attr !== 'position' && attr !== 'normal') g.deleteAttribute(attr);
      }
      _cmpRel.multiplyMatrices(_cmpInv, mesh.matrixWorld);
      g.applyMatrix4(_cmpRel);
      geos.push(g);
    }
    if (geos.length < 2) {
      for (const g of geos) g.dispose();
      continue;
    }
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    merged.computeBoundingSphere();
    merged.computeBoundingBox();

    const first = list[0];
    const combined = new THREE.Mesh(merged, first.material);
    combined.castShadow = first.castShadow;
    combined.receiveShadow = first.receiveShadow;
    combined.matrixAutoUpdate = false;
    combined.updateMatrix();
    root.add(combined);

    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (m.parent) m.parent.remove(m);
      if (m.geometry && !sharedSet.has(m.geometry)) {
        m.geometry.dispose();
      }
    }
  }
}

let _houseGeoCache = null;
function _getHouseGeo() {
  if (_houseGeoCache) return _houseGeoCache;
  const shedShape = new THREE.Shape();
  shedShape.moveTo(-1.77, 0);
  shedShape.lineTo(1.77, 0);
  shedShape.lineTo(1.77, 0.49);
  shedShape.lineTo(-1.77, 0.05);
  shedShape.closePath();
  const roofShedWedge = new THREE.ExtrudeGeometry(shedShape, { depth: 3.86, bevelEnabled: false });
  roofShedWedge.translate(0, 0, -1.93);
  roofShedWedge.rotateY(Math.PI / 2);
  roofShedWedge.computeVertexNormals();

  _houseGeoCache = {
    door: new THREE.BoxGeometry(0.84, 1.60, 0.08),
    doorFrame: new THREE.BoxGeometry(1.00, 1.72, 0.06),
    doorCanopy: new THREE.BoxGeometry(1.22, 0.08, 0.42),
    winFrame: new THREE.BoxGeometry(0.88, 0.88, 0.07),
    winSill: new THREE.BoxGeometry(0.96, 0.09, 0.14),
    winPane: new THREE.BoxGeometry(0.70, 0.70, 0.06),
    winShutter: new THREE.BoxGeometry(0.18, 0.72, 0.05),
    roofHipCone: new THREE.ConeGeometry(1.0, 1.0, 4),
    roofRidge: new THREE.BoxGeometry(0.18, 0.14, 0.9),
    roofEaveRim: new THREE.BoxGeometry(1.0, 0.14, 1.0),
    roofShedPlate: new THREE.BoxGeometry(1.0, 0.13, 1.0),
    roofShedWedge,
    antMast: new THREE.CylinderGeometry(0.02, 0.02, 1.8, 5),
    clothPole: new THREE.CylinderGeometry(0.04, 0.04, 1.5, 4),
    clothWire: new THREE.BoxGeometry(1.7, 0.02, 0.02),
    clothPiece: new THREE.BoxGeometry(0.35, 0.5, 0.03),
    potBase: new THREE.CylinderGeometry(0.18, 0.13, 0.28, 6),
    potPlant: new THREE.DodecahedronGeometry(0.23, 0),
    planterBox: new THREE.BoxGeometry(0.96, 0.20, 0.24),
    planterBush: new THREE.BoxGeometry(0.86, 0.18, 0.20),
    planterBloom: new THREE.DodecahedronGeometry(0.11, 0),
    balcPost: new THREE.BoxGeometry(0.05, 0.52, 0.05),
    corbel: new THREE.BoxGeometry(0.16, 0.24, 0.34),
    extStairStep: new THREE.BoxGeometry(0.64, 0.18, 0.36),
    extStairRail: new THREE.BoxGeometry(0.05, 0.05, 2.95),
    muralBand: new THREE.BoxGeometry(0.03, 0.72, 2.2),
    dishCone: new THREE.ConeGeometry(0.36, 0.14, 8),
    pergolaPost: new THREE.BoxGeometry(0.11, 1.85, 0.11),
    pergolaBeam: new THREE.BoxGeometry(3.5, 0.09, 0.11),
    pennantFlag: new THREE.ConeGeometry(0.14, 0.25, 3),
    awningCanopy: new THREE.BoxGeometry(1.75, 0.07, 0.76)
  };
  return _houseGeoCache;
}

/** Casas, construção, upgrades e lajes. */
export const HousesMixin = {
  createInitialSettlements(plateaus, savedHouses = null) {
    this.allPlateaus = plateaus;

    // Clear any previous houses if resetting or loading
    this.clearHouses();

    // 1. CHOCQUE DE ORDEM URBANA: Construir Infraestrutura PRIMEIRO!
    if (!this.infrastructureCreated) {
      this.createContinentalRoadNetwork();
      this.createAlamedaDoSamba();
      this.createBotecoPockets();
      this.createEstradasDeLajes();
      this.createLighthouse({ x: -95, z: 50 });
      this.createFishingPier({ x: -78, z: 74 });
      this.createBeachBoardwalks();
      this.createBeachStalls();
      this.createBeachLeisureZones();
      this.createAltinhaDuo();
      this.createBeachPalms();
      this.createBeachfrontKiosks();
      this.createBeachLifeEdges();
      this.createSambaPlaza({ x: -2, z: -4 });
      this.createSoccerField({ x: 55, z: 4 });
      this.createBrickOlaria({ x: -22, z: -14 });
      this.createAgroforestFarm({ x: 82, z: -8 });
      this.createCulturalMarket({ x: 75, z: 4 });
      this.createSolarPark({ x: -18, z: -72 });
      this.createHighlandLandmarks();
      this.createWestPioneerCove({ x: -95, z: 0 });
      this.createMiranteDoPoente({ x: -98, z: -55 });
      this.createGrandeOlariaCeramica({ x: 95, z: -18 });
      this.createMiranteDoLevante({ x: 98, z: -55 });
      this.createTorreDeRadioCume({ x: 0, z: -104 });
      this.createWestHillsideLife();
      this.createEastHighlandLife();
      this.createSoutheastDunesLounge();
      this.createExpandedNeighborhoodHubs();
      this.createSolarLamps();
      this.createHillsideCommunityDetails();
      if (this.createMobilitySystems) this.createMobilitySystems();
      this.infrastructureCreated = true;
    }

    if (savedHouses && savedHouses.length > 0) {
      // Rehydrate faithfully from Save Data, filtering out any obsolete houses inside the Mirante, Solar zone, or any Landmark footprint!
      const sanitizedHouses = savedHouses.filter(sh => {
        if (this.terrain && this.terrain.isProtectedLandmark && this.terrain.isProtectedLandmark(sh.x, sh.z, 2.8)) {
          return false;
        }
        const inMirante = Math.abs(sh.x - 50) <= 25 && sh.z <= -95;
        const inCampinho = Math.abs(sh.x - 55) <= 16 && Math.abs(sh.z - 4) <= 12;
        const inMercado = Math.abs(sh.x - 75) <= 11 && Math.abs(sh.z - 4) <= 9;
        const inAgro = Math.abs(sh.x - 82) <= 15 && Math.abs(sh.z - -8) <= 12;
        const inOlaria = Math.abs(sh.x - -22) <= 11 && Math.abs(sh.z - -14) <= 9;
        const inSamba = Math.hypot(sh.x - (-2), sh.z - (-4)) <= 15.0; // Preservação Estrita da Praça do Samba!
        const inNascente = Math.abs(sh.x - -8) <= 12 && Math.abs(sh.z - -65) <= 12;

        let inInfra = false;
        if (this.infrastructureNodes) {
          // Retroactively demolish houses intersecting infrastructure
          inInfra = this.infrastructureNodes.some(node => Math.hypot(node.x - sh.x, node.z - sh.z) < 4.5);
        }

        // Remove legacy collinear rows from previous expansion versions so organic village clusters replace them cleanly
        const isLegacyLinearExpansion = (Math.abs(sh.x) >= 145 || sh.z <= -135) &&
          [10, -18, -44, -72, -142, -162].includes(Math.round(sh.z));

        return !(inMirante || inCampinho || inMercado || inAgro || inOlaria || inSamba || inNascente || inInfra || isLegacyLinearExpansion);
      });
      const seenIds = new Set();
      const placedHouses = [];
      sanitizedHouses.forEach((sh, idx) => {
        if (seenIds.has(sh.id)) return;
        
        // Estrita colisão 2D para impedir casas de nascerem fundidas umas nas outras (distância mínima de 7.5m)
        const tooClose = placedHouses.some(ph => Math.hypot(ph.x - sh.x, ph.z - sh.z) < 7.5);
        if (tooClose) return;

        seenIds.add(sh.id);
        placedHouses.push(sh);

        const plat = plateaus.find(p => p.id === sh.id) || {
          id: sh.id,
          faction: sh.faction || 'sol',
          order: idx,
          x: sh.x,
          y: sh.y,
          z: sh.z
        };
        const paletteItem = this.palette.find(p => p.name === sh.colorName) || this.palette[idx % this.palette.length];
        const house = this.buildHouse(plat, sh.level || 1, paletteItem);
        if (house) {
          if (sh.wealth) house.wealth = sh.wealth;
          if (sh.residents) house.residents = sh.residents;
          this.houses.push(house);
        }
      });
    } else {
      // New World: ONLY spawn the humble founding starter nuclei (8 houses total)!
      const starters = plateaus.filter(p => p.isStarter);
      starters.forEach((plat, idx) => {
        const paletteItem = this.palette[idx % this.palette.length];
        const house = this.buildHouse(plat, 1, paletteItem);
        if (house) this.houses.push(house);
      });
    }

    // 36 NÚCLEOS PIONEIROS DA ÁREA VERMELHA (12 Oeste, 12 Leste, 12 Cume Profundo)
    // Garantem vida imediata e ocupação orgânica dos confins territoriais no save Dia 673 e em novos jogos
    const continentalFrontierPioneers = [
      // 1. Distrito Poente & Falésias do Farol (12 casas no Flanco Oeste: X <= -45)
      { x: -135, z: 6, faction: 'prainha', level: 1 },
      { x: -125, z: -20, faction: 'prainha', level: 2 },
      { x: -135, z: -75, faction: 'prainha', level: 1 },
      { x: -115, z: -35, faction: 'prainha', level: 2 },
      { x: -102, z: -4,  faction: 'prainha', level: 1 },
      { x: -95,  z: -40, faction: 'prainha', level: 2 },
      { x: -92,  z: -72, faction: 'prainha', level: 1 },
      { x: -80,  z: -88, faction: 'prainha', level: 1 },
      { x: -64,  z: -74, faction: 'prainha', level: 2 },
      { x: -65,  z: -38, faction: 'prainha', level: 1 },
      { x: -55,  z: -15, faction: 'prainha', level: 2 },
      { x: -48,  z: -68, faction: 'prainha', level: 1 },

      // 2. Distrito Levante & Vale Verde (12 casas no Flanco Leste: X >= 45)
      { x: 135, z: 6, faction: 'varzea', level: 1 },
      { x: 125, z: -20, faction: 'varzea', level: 2 },
      { x: 135, z: -75, faction: 'varzea', level: 1 },
      { x: 115, z: -35, faction: 'varzea', level: 2 },
      { x: 102, z: -4,  faction: 'varzea', level: 1 },
      { x: 95,  z: -36, faction: 'varzea', level: 2 },
      { x: 92,  z: -72, faction: 'varzea', level: 1 },
      { x: 80,  z: -88, faction: 'varzea', level: 1 },
      { x: 60,  z: -76, faction: 'varzea', level: 2 },
      { x: 65,  z: -38, faction: 'varzea', level: 1 },
      { x: 55,  z: -15, faction: 'varzea', level: 2 },
      { x: 48,  z: -68, faction: 'varzea', level: 1 },

      // 3. Distrito Cume & Crista das Alturas (12 casas na Crista Norte Profunda: Z <= -115 ou Flancos Exteriores)
      { x: 0,   z: -130, faction: 'serra', level: 1 },
      { x: -28, z: -115, faction: 'serra', level: 2 },
      { x: 28,  z: -115, faction: 'serra', level: 2 },
      { x: -45, z: -125, faction: 'serra', level: 1 },
      { x: 45,  z: -125, faction: 'serra', level: 1 },
      { x: -20, z: -130, faction: 'serra', level: 1 },
      { x: 20,  z: -130, faction: 'serra', level: 1 },
      { x: -35, z: -132, faction: 'serra', level: 2 },
      { x: 35,  z: -132, faction: 'serra', level: 2 },
      { x: -50, z: -118, faction: 'serra', level: 1 },
      { x: 50,  z: -118, faction: 'serra', level: 1 },
      { x: 0,   z: -122, faction: 'serra', level: 2 },

      // 4. Expansão Continental Oeste — Núcleos Orgânicos de Vilas do Poente (Agrupados ao longo das curvas, sem linha reta!)
      { x: -152, z: 9,    faction: 'prainha', level: 2 },
      { x: -163, z: -2,   faction: 'prainha', level: 1 },
      { x: -175, z: 11,   faction: 'prainha', level: 3 },
      { x: -168, z: -28,  faction: 'prainha', level: 2 },
      { x: -198, z: -13,  faction: 'prainha', level: 2 },
      { x: -208, z: -27,  faction: 'prainha', level: 1 },
      { x: -190, z: -38,  faction: 'prainha', level: 3 },
      { x: -229, z: 8,    faction: 'prainha', level: 2 },
      { x: -244, z: -4,   faction: 'prainha', level: 1 },
      { x: -236, z: -46,  faction: 'prainha', level: 2 },
      { x: -255, z: -38,  faction: 'prainha', level: 1 },
      { x: -194, z: -66,  faction: 'prainha', level: 2 },
      { x: -166, z: -96,  faction: 'prainha', level: 1 },

      // 5. Expansão Continental Leste — Núcleos Orgânicos de Vilas do Levante (Agrupados ao longo das curvas, sem linha reta!)
      { x: 152, z: 9,     faction: 'varzea', level: 2 },
      { x: 164, z: -3,    faction: 'varzea', level: 1 },
      { x: 176, z: 11,    faction: 'varzea', level: 3 },
      { x: 168, z: -27,   faction: 'varzea', level: 2 },
      { x: 198, z: -13,   faction: 'varzea', level: 1 },
      { x: 208, z: -27,   faction: 'varzea', level: 2 },
      { x: 190, z: -39,   faction: 'varzea', level: 3 },
      { x: 230, z: 8,     faction: 'varzea', level: 2 },
      { x: 245, z: -4,    faction: 'varzea', level: 1 },
      { x: 236, z: -46,   faction: 'varzea', level: 2 },
      { x: 254, z: -38,   faction: 'varzea', level: 1 },
      { x: 195, z: -65,   faction: 'varzea', level: 2 },
      { x: 167, z: -96,   faction: 'varzea', level: 1 },

      // 6. Expansão Continental Norte — Vila da Sela da Serra & Chácaras (Curva orgânica da encosta norte)
      { x: -112, z: -140, faction: 'serra', level: 2 },
      { x: -85,  z: -136, faction: 'serra', level: 1 },
      { x: -58,  z: -142, faction: 'serra', level: 2 },
      { x: -16,  z: -145, faction: 'serra', level: 3 },
      { x: 16,   z: -146, faction: 'serra', level: 2 },
      { x: 59,   z: -143, faction: 'serra', level: 1 },
      { x: 86,   z: -137, faction: 'serra', level: 2 },
      { x: 114,  z: -141, faction: 'serra', level: 1 },
      { x: -38,  z: -167, faction: 'serra', level: 2 },
      { x: 39,   z: -166, faction: 'serra', level: 1 },

      // 7. Adensamento dos Bolsões Internos (Preenchendo os grandes quarteirões verdes Leste, Oeste e Sela Norte)
      // Flanco Leste (Várzea & Levante: X: 58..230, Z: -115..-8)
      { x: 74,   z: -24,  faction: 'varzea', level: 2 },
      { x: 86,   z: -28,  faction: 'varzea', level: 3 },
      { x: 108,  z: -18,  faction: 'varzea', level: 2 },
      { x: 122,  z: -32,  faction: 'varzea', level: 1 },
      { x: 138,  z: -14,  faction: 'varzea', level: 2 },
      { x: 152,  z: -22,  faction: 'varzea', level: 3 },
      { x: 182,  z: -20,  faction: 'varzea', level: 2 },
      { x: 214,  z: -10,  faction: 'varzea', level: 1 },
      { x: 74,   z: -52,  faction: 'varzea', level: 2 },
      { x: 88,   z: -54,  faction: 'varzea', level: 1 },
      { x: 104,  z: -56,  faction: 'varzea', level: 3 },
      { x: 118,  z: -54,  faction: 'varzea', level: 2 },
      { x: 132,  z: -62,  faction: 'varzea', level: 1 },
      { x: 156,  z: -48,  faction: 'varzea', level: 2 },
      { x: 174,  z: -54,  faction: 'varzea', level: 3 },
      { x: 212,  z: -52,  faction: 'varzea', level: 2 },
      { x: 108,  z: -74,  faction: 'varzea', level: 2 },
      { x: 126,  z: -94,  faction: 'varzea', level: 1 },
      { x: 146,  z: -86,  faction: 'varzea', level: 2 },
      { x: 184,  z: -82,  faction: 'varzea', level: 3 },
      { x: 212,  z: -82,  faction: 'varzea', level: 1 },

      // Flanco Oeste (Prainha & Poente: X: -58..-230, Z: -115..-8)
      { x: -74,  z: -24,  faction: 'prainha', level: 2 },
      { x: -86,  z: -28,  faction: 'prainha', level: 3 },
      { x: -108, z: -18,  faction: 'prainha', level: 2 },
      { x: -122, z: -32,  faction: 'prainha', level: 1 },
      { x: -138, z: -14,  faction: 'prainha', level: 2 },
      { x: -152, z: -22,  faction: 'prainha', level: 3 },
      { x: -182, z: -20,  faction: 'prainha', level: 2 },
      { x: -214, z: -10,  faction: 'prainha', level: 1 },
      { x: -74,  z: -52,  faction: 'prainha', level: 2 },
      { x: -88,  z: -54,  faction: 'prainha', level: 1 },
      { x: -104, z: -56,  faction: 'prainha', level: 3 },
      { x: -118, z: -54,  faction: 'prainha', level: 2 },
      { x: -132, z: -62,  faction: 'prainha', level: 1 },
      { x: -156, z: -48,  faction: 'prainha', level: 2 },
      { x: -174, z: -54,  faction: 'prainha', level: 3 },
      { x: -212, z: -52,  faction: 'prainha', level: 2 },
      { x: -108, z: -74,  faction: 'prainha', level: 2 },
      { x: -126, z: -94,  faction: 'prainha', level: 1 },
      { x: -146, z: -86,  faction: 'prainha', level: 2 },
      { x: -184, z: -82,  faction: 'prainha', level: 3 },
      { x: -212, z: -82,  faction: 'prainha', level: 1 },

      // Sela Central-Norte (Serra: X: -72..72, Z: -88..-135)
      { x: -62,  z: -96,  faction: 'serra', level: 2 },
      { x: -44,  z: -94,  faction: 'serra', level: 1 },
      { x: -18,  z: -96,  faction: 'serra', level: 3 },
      { x: 18,   z: -96,  faction: 'serra', level: 2 },
      { x: 44,   z: -94,  faction: 'serra', level: 1 },
      { x: 62,   z: -96,  faction: 'serra', level: 2 },
      { x: -58,  z: -108, faction: 'serra', level: 1 },
      { x: 58,   z: -108, faction: 'serra', level: 2 },
      { x: -74,  z: -126, faction: 'serra', level: 2 },
      { x: 74,   z: -126, faction: 'serra', level: 1 }
    ];

    const isNewWorldStart = !savedHouses || savedHouses.length === 0;
    continentalFrontierPioneers.forEach((fp, i) => {
      // Em um Novo Mundo, o mapa inicia limpo e focado no Morro do Sol e nas vilas fundadoras;
      // os confins territoriais são conquistados organicamente pelos mutirões ativos dos NPCs!
      if (isNewWorldStart) {
        return;
      }
      // Micro-deslocamento orgânico determinístico para quebrar qualquer alinhamento matemático
      const jx = fp.x + Math.sin(i * 17.3 + fp.z * 0.7) * 2.1;
      const jz = fp.z + Math.cos(i * 23.1 + fp.x * 0.5) * 2.1;

      if (this.terrain && this.terrain.isProtectedLandmark && this.terrain.isProtectedLandmark(jx, jz, 2.8)) {
        return;
      }
      if (this.infrastructureNodes && this.infrastructureNodes.some(node => Math.hypot(node.x - jx, node.z - jz) < 4.2)) {
        return;
      }
      // Check if any existing house is already near this pioneer lot (< 10 meters)
      const hasCloseHouse = this.houses.some(h => Math.hypot(h.position.x - jx, h.position.z - jz) < 10.0);
      if (!hasCloseHouse) {
        const plat = plateaus.find(p => Math.hypot(p.x - jx, p.z - jz) < 5.0) || {
          id: `frontier_${fp.faction}_${i + 1}`,
          faction: fp.faction,
          order: i,
          x: jx,
          y: this.terrain ? this.terrain.getElevation(jx, jz) : 4.0,
          z: jz
        };
        const lvl = isNewWorldStart ? 1 : (fp.level || 1);
        const paletteItem = this.palette[(i * 3 + 2) % this.palette.length];
        const house = this.buildHouse(plat, lvl, paletteItem);
        if (house) {
          house.residents = lvl === 2 ? 6 : 4;
          house.wealth = lvl === 2 ? 250 : 150;
          this.houses.push(house);
        }
      }
    });

    // Criar o Cinturão da Mata Atlântica APÓS todas as casas e vilas estarem posicionadas,
    // garantindo que NENHUMA árvore ou rocha brote sobre ou dentro de casas existentes!
    if (!this.mataAtlanticaCreated) {
      this.createMataAtlanticaBorders();
      this.mataAtlanticaCreated = true;
    }
  },

  clearHouses() {
    this.houses.forEach(h => {
      this.group.remove(h.meshGroup);
    });
    this.houses = [];
    this.windowMeshes = [];
    this.lajeBBQs = [];

    // Clear any ongoing construction sites and release workers
    this.activeConstructions.forEach(c => {
      this.group.remove(c.siteGroup);
      if (c.workers && this.npcManager) {
        c.workers.forEach(w => this.npcManager.releaseWorker(w));
      }
    });
    this.activeConstructions = [];

    // Clear any ongoing upgrades and release workers
    this.activeUpgrades.forEach(u => {
      this.group.remove(u.scaffoldGroup);
      if (u.workers && this.npcManager) {
        u.workers.forEach(w => this.npcManager.releaseWorker(w));
      }
    });
    this.activeUpgrades = [];
  },

  // ALGORITMO DE EXPANSÃO TERRITORIAL ORGÂNICA (Morro Central Primeiro & Radiação Contígua)
  // 1. O Morro do Sol (Centro, Roda de Samba e Alameda) é o foco primário e natural de expansão (~70% das novas obras).
  // 2. As extremidades (Prainha, Várzea, Serra) atuam como sementes locais secundárias, crescendo contiguamente
  //    para os lados e confins, sem espalhar casas isoladas aleatoriamente no vazio.
  selectExpansionPlateau(preferredFaction = null) {
    const builtIds = new Set(this.houses.map(h => h.id));
    const constructingIds = new Set(this.activeConstructions.map(c => c.id));

    // Todos os lotes vagos disponíveis que respeitam patrimônio público e afastamento físico
    const available = this.allPlateaus.filter(p => {
      if (builtIds.has(p.id) || constructingIds.has(p.id)) return false;
      if (this.terrain && this.terrain.isProtectedLandmark && this.terrain.isProtectedLandmark(p.x, p.z, 2.8)) {
        return false;
      }
      // Zonas de Preservação Turística & Monumentos: nenhuma casa no Mirante, Parque Solar ou sobre estruturas especiais!
      const inMirante = Math.abs(p.x - 50) <= 20 && Math.abs(p.z - (-102)) <= 16;
      const inCampinho = Math.abs(p.x - 55) <= 15 && Math.abs(p.z - 4) <= 10;
      const inMercado = Math.abs(p.x - 75) <= 10 && Math.abs(p.z - 4) <= 8;
      const inAgro = Math.abs(p.x - 82) <= 11 && Math.abs(p.z - -8) <= 8;
      const inOlaria = Math.abs(p.x - -22) <= 10 && Math.abs(p.z - -14) <= 8;
      const inSamba = Math.hypot(p.x - (-2), p.z - (-4)) <= 15.0; // Preservação Estrita da Praça e Roda do Samba
      
      if (inMirante || inCampinho || inMercado || inAgro || inOlaria || inSamba) return false;

      // Afastamento físico entre casas (6.5m de clearance para criar o autêntico adensamento de favela sem z-fighting)
      const tooClose = this.houses.some(h => Math.hypot(h.position.x - p.x, h.position.z - p.z) < 6.5);
      const tooCloseActive = this.activeConstructions.some(c => Math.hypot(c.plateau.x - p.x, c.plateau.z - p.z) < 6.5);
      if (tooClose || tooCloseActive) return false;

      // Respeito à Natureza: Prevenir construção sobre árvores e grandes rochas
      if (this.natureObstacles) {
        const hitsNature = this.natureObstacles.some(n => Math.hypot(n.x - p.x, n.z - p.z) < n.radius);
        if (hitsNature) return false;
      }

      // Respeito à Infraestrutura Pública: Prevenir casas invadindo vielas principais e ruas de laje
      if (this.infrastructureNodes) {
        const blocksStreet = this.infrastructureNodes.some(node => Math.hypot(node.x - p.x, node.z - p.z) < 3.8);
        if (blocksStreet) return false;
      }

      return true;
    });
    if (available.length === 0) return null;

    const isCentral = (p) => p.faction === 'sol' || (Math.abs(p.x) <= 35 && p.z >= -52);
    const centralCandidates = available.filter(isCentral);
    const outerCandidates = available.filter(p => !isCentral(p));

    // Se uma facção específica foi solicitada pelo conselho/gestão política
    if (preferredFaction) {
      const factionLots = available.filter(p => p.faction === preferredFaction);
      if (factionLots.length > 0) {
        const factionHouses = this.houses.filter(h => (h.faction || 'sol') === preferredFaction);
        if (factionHouses.length > 0) {
          factionLots.sort((a, b) => {
            const minDistA = Math.min(...factionHouses.map(h => Math.hypot(h.position.x - a.x, h.position.z - a.z)));
            const minDistB = Math.min(...factionHouses.map(h => Math.hypot(h.position.x - b.x, h.position.z - b.z)));
            return minDistA - minDistB;
          });
          const topFactionPool = factionLots.slice(0, Math.min(3, factionLots.length));
          return topFactionPool[Math.floor(Math.random() * topFactionPool.length)];
        }
        return factionLots[Math.floor(Math.random() * factionLots.length)];
      }
    }

    // 1. FOCO PRIMÁRIO: ADENSAR O MORRO CENTRAL (MORRO DO SOL)
    // 70% das novas moradias concentram-se no Morro do Sol enquanto houver lotes vagos nele!
    const shouldBuildCenter = centralCandidates.length > 0 && (outerCandidates.length === 0 || Math.random() < 0.70);

    if (shouldBuildCenter) {
      const solHouses = this.houses.filter(h => isCentral(h.position));
      centralCandidates.sort((a, b) => {
        // Se já existem casas no centro, prefere construir contiguamente perto delas
        if (solHouses.length > 0) {
          const distA = Math.min(...solHouses.map(h => Math.hypot(h.position.x - a.x, h.position.z - a.z)));
          const distB = Math.min(...solHouses.map(h => Math.hypot(h.position.x - b.x, h.position.z - b.z)));
          return distA - distB;
        }
        // Inicial: irradia a partir da Roda de Samba (-2, -4) e Alameda
        const dSambaA = Math.hypot(a.x - (-2), a.z - (-4));
        const dSambaB = Math.hypot(b.x - (-2), b.z - (-4));
        return dSambaA - dSambaB;
      });

      // Sorteia entre os 4 lotes contíguos mais próximos para variação orgânica
      const topPool = centralCandidates.slice(0, Math.min(4, centralCandidates.length));
      return topPool[Math.floor(Math.random() * topPool.length)];
    }

    // 2. FOCO SECUNDÁRIO: CRESCIMENTO DAS EXTREMIDADES A PARTIR DE SUAS SEMENTES
    if (outerCandidates.length > 0) {
      const outerDistricts = ['prainha', 'varzea', 'serra'];
      const chosenDistrict = outerDistricts[Math.floor(Math.random() * outerDistricts.length)];
      const districtCandidates = outerCandidates.filter(p => p.faction === chosenDistrict);
      const targetPool = districtCandidates.length > 0 ? districtCandidates : outerCandidates;

      const districtHouses = this.houses.filter(h => h.faction === chosenDistrict);
      if (districtHouses.length > 0) {
        targetPool.sort((a, b) => {
          const distA = Math.min(...districtHouses.map(h => Math.hypot(h.position.x - a.x, h.position.z - a.z)));
          const distB = Math.min(...districtHouses.map(h => Math.hypot(h.position.x - b.x, h.position.z - b.z)));
          return distA - distB;
        });
        const topDistrictPool = targetPool.slice(0, Math.min(3, targetPool.length));
        return topDistrictPool[Math.floor(Math.random() * topDistrictPool.length)];
      }

      return targetPool[Math.floor(Math.random() * targetPool.length)];
    }

    return available[Math.floor(Math.random() * available.length)];
  },

  // Spawns a new house with dynamic visual construction & terrain terraforming
  spawnNewHouse(preferredFaction = null, onComplete = null, specificPlateau = null) {
    const bestCandidate = specificPlateau || this.selectExpansionPlateau(preferredFaction);
    if (!bestCandidate) return null;

    const paletteItem = this.palette[this.houses.length % this.palette.length];

    // Start Visual Construction & Terraforming project!
    this.startHouseConstruction(bestCandidate, paletteItem, onComplete);

    return { id: bestCandidate.id, faction: bestCandidate.faction, isConstructing: true };
  },

  // VISUAL TERRAIN TERRAFORMING & STEP-BY-STEP CONSTRUCTION BY REAL CITIZEN BUILDERS
  startHouseConstruction(plateau, paletteItem, onComplete = null) {
    const siteGroup = new THREE.Group();
    const groundY = this.terrain ? this.terrain.getElevation(plateau.x, plateau.z) : plateau.y;
    siteGroup.position.set(plateau.x, groundY, plateau.z);

    // 1. Survey Stakes & Demarcation Flags (Piquetes de topografia e fita de demarcação de lote)
    const stakeMat = new THREE.MeshLambertMaterial({ color: 0x8C7456, flatShading: true });
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xFACC15 });
    const corners = [
      { x: -2.2, z: -2.0 }, { x: 2.2, z: -2.0 },
      { x: -2.2, z: 2.0 },  { x: 2.2, z: 2.0 }
    ];
    corners.forEach(c => {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 4), stakeMat);
      stake.position.set(c.x, 0.5, c.z);
      siteGroup.add(stake);

      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.02), flagMat);
      flag.position.set(c.x + 0.12, 0.95, c.z);
      siteGroup.add(flag);
    });

    // 2. Construction Logistics: Stacks of Red Clay Bricks & Cement Bags (Delivered by pushcart courier)
    const brickMat = new THREE.MeshLambertMaterial({ color: 0xB55338, flatShading: true });
    const brickStack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.7), brickMat);
    brickStack.position.set(-1.4, 0.35, 1.4);
    brickStack.visible = false; // Hidden until courier delivers them!
    siteGroup.add(brickStack);

    const cementMat = new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: true });
    const cementBags = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.55), cementMat);
    cementBags.position.set(1.4, 0.25, 1.4);
    cementBags.visible = false; // Hidden until courier delivers them!
    siteGroup.add(cementBags);

    // 3. Excavation Pad / Muro de Arrimo de Terraplanagem (emerges as workers mold terrain)
    const padMat = new THREE.MeshLambertMaterial({ color: 0x5C5348, flatShading: true });
    const padGeo = new THREE.BoxGeometry(4.4, 0.4, 4.0);
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.y = 0.2;
    padMesh.scale.set(0.01, 0.01, 0.01);
    padMesh.receiveShadow = true;
    siteGroup.add(padMesh);

    // 4. Wooden Scaffolding Poles (Andaimes de Obra - appears during scaffolding phase)
    const scaffoldGroup = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8C7456, flatShading: true });
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.6, 4);
    corners.forEach(c => {
      const pole = new THREE.Mesh(poleGeo, woodMat);
      pole.position.set(c.x, 1.8, c.z);
      scaffoldGroup.add(pole);
    });

    const plankGeo = new THREE.BoxGeometry(4.8, 0.08, 0.25);
    const plank1 = new THREE.Mesh(plankGeo, woodMat);
    plank1.position.set(0, 1.4, -2.0);
    scaffoldGroup.add(plank1);
    const plank2 = new THREE.Mesh(plankGeo, woodMat);
    plank2.position.set(0, 1.4, 2.0);
    scaffoldGroup.add(plank2);

    scaffoldGroup.visible = false;
    scaffoldGroup.scale.set(1, 0.01, 1);
    siteGroup.add(scaffoldGroup);

    // 5. Emerging House Preview (scales up during masonry phase)
    const housePreviewGroup = new THREE.Group();
    const tempBody = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 2.5, 3.5),
      new THREE.MeshLambertMaterial({ color: paletteItem.color, flatShading: true })
    );
    tempBody.position.y = 1.25;
    housePreviewGroup.add(tempBody);
    housePreviewGroup.visible = false;
    housePreviewGroup.scale.set(1, 0.01, 1);
    siteGroup.add(housePreviewGroup);

    this.group.add(siteGroup);

    // Active project tracker
    const project = {
      id: plateau.id,
      plateau,
      paletteItem,
      siteGroup,
      brickStack,
      cementBags,
      padMesh,
      scaffoldGroup,
      housePreviewGroup,
      state: 'WAITING_SUPPLIES', // Phase 0: Waiting for courier to transport bricks from Olaria
      workers: [],
      progress: 0.0,
      duration: 13.5, // Duração dinâmica e ágil (~13.5s de trabalho de canteiro ativo)
      particleTimer: 0,
      onComplete
    };

    // 6. Dispatch courier from Olaria with materials, then recruit builders upon arrival!
    if (this.npcManager) {
      this.npcManager.dispatchCourierWithSupplies(project, () => {
        // Material delivery arrived!
        project.brickStack.visible = true;
        project.cementBags.visible = true;
        project.state = 'WAITING_WORKERS';

        this.spawnConstructionPuff({
          x: project.plateau.x,
          y: project.siteGroup.position.y + 0.4,
          z: project.plateau.z
        });
        if (this.soundtrack) {
          this.soundtrack.playConstructionSound(project.plateau);
        }

        // Recruit 2 citizen builders to walk over and construct ONLY if not already recruited
        if ((!project.workers || project.workers.length === 0) && this.npcManager) {
          project.workers = this.npcManager.recruitWorkersForSite(project, 2);
        }
      });
    } else {
      project.brickStack.visible = true;
      project.cementBags.visible = true;
      project.state = 'WAITING_WORKERS';
    }

    this.activeConstructions.push(project);
  },

  upgradeHouse(houseId, visual = false) {
    const house = this.houses.find(h => h.id === houseId);
    if (!house) return false;

    if (house.level < 3) {
      house.level++;
      house.residents += 3;
      house.wealth += 35;

      this.spawnConstructionPuff(house.position);

      if (house.level === 2) {
        this.buildStory(house, 1);
        this.buildLaje(house, 2);
      } else if (house.level === 3) {
        this.buildLaje(house, 2);
      }

      return true;
    }
    return false;
  },

  buildHouse(plat, level = 1, paletteItem = null) {
    if (this.terrain && this.terrain.isProtectedLandmark && this.terrain.isProtectedLandmark(plat.x, plat.z, 2.8)) {
      return null;
    }

    // URBANISMO SÊNIOR & DESCONFLITAÇÃO VIÁRIA:
    // Se o lote estiver sobre uma via/escadaria (< 4.5m de infrastructureNodes) ou colado em outra casa (< 7.2m),
    // realoca automaticamente o lote para a margem lateral da via (formando fachada de rua organizada!).
    const isSpotClean = (tx, tz) => {
      if (this.terrain && this.terrain.isProtectedLandmark && this.terrain.isProtectedLandmark(tx, tz, 2.8)) return false;
      if (this.infrastructureNodes && this.infrastructureNodes.some(n => Math.hypot(n.x - tx, n.z - tz) < 3.8)) return false;
      if (this.houses && this.houses.some(h => Math.hypot(h.position.x - tx, h.position.z - tz) < 6.2)) return false;
      if (this.terrain) {
        const gy = this.terrain.getElevation(tx, tz);
        if (gy < 0.5) return false;
        const s1 = this.terrain.getElevation(tx - 2.0, tz - 1.8);
        const s2 = this.terrain.getElevation(tx + 2.0, tz + 1.8);
        if (Math.abs(s1 - s2) > 5.5) return false;
      }
      return true;
    };

    if (!isSpotClean(plat.x, plat.z)) {
      let relocated = false;
      const searchRadii = [5.2, 6.6];
      for (const rad of searchRadii) {
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          const cx = plat.x + Math.cos(ang) * rad;
          const cz = plat.z + Math.sin(ang) * rad;
          if (isSpotClean(cx, cz)) {
            plat.x = cx;
            plat.z = cz;
            relocated = true;
            break;
          }
        }
        if (relocated) break;
      }
      if (!relocated) return null;
    }

    const houseGroup = new THREE.Group();
    const groundY = this.terrain ? this.terrain.getElevation(plat.x, plat.z) : (plat.y || 2.0);

    const halfW = 2.1;
    const halfD = 1.9;
    const c1 = this.terrain ? this.terrain.getElevation(plat.x - halfW, plat.z - halfD) : groundY;
    const c2 = this.terrain ? this.terrain.getElevation(plat.x + halfW, plat.z - halfD) : groundY;
    const c3 = this.terrain ? this.terrain.getElevation(plat.x - halfW, plat.z + halfD) : groundY;
    const c4 = this.terrain ? this.terrain.getElevation(plat.x + halfW, plat.z + halfD) : groundY;
    // Highest and lowest points around the 4.2x3.8m footprint
    const highestPoint = Math.max(c1, c2, c3, c4, groundY);
    const lowestPoint = Math.min(c1, c2, c3, c4, groundY);
    const slopeDelta = highestPoint - lowestPoint;

    // Risco Geológico: Suporta fundação palafita/baldrame escalonada em encostas acentuadas (até 5.5m)
    if (slopeDelta > 5.5) {
      return null;
    }

    // PRESERVAÇÃO INTEGRAL: Remover qualquer árvore de borda que porventura estivesse colidindo com este lote
    if (this.forestGroup) {
      for (let i = this.forestGroup.children.length - 1; i >= 0; i--) {
        const child = this.forestGroup.children[i];
        if (Math.hypot(child.position.x - plat.x, child.position.z - plat.z) < 8.5) {
          this.forestGroup.remove(child);
        }
      }
    }
    if (this.natureObstacles) {
      this.natureObstacles = this.natureObstacles.filter(n => Math.hypot(n.x - plat.x, n.z - plat.z) >= 8.5);
    }
    
    let buildY = highestPoint;
    // Ground floor placed at the natural highest point to prevent clipping
    houseGroup.position.set(plat.x, buildY, plat.z);

    // ORIENTAÇÃO URBANÍSTICA E INTEGRAÇÃO COM AS VIELAS/RUAS:
    // Usa this.infrastructureNodes para apontar a fachada (+Z, porta e escadinha) diretamente para a rua mais próxima!
    let naturalAngle = 0;
    let nearestNode = null;
    let minDist = 9999;
    const roadNodes = (this.infrastructureNodes && this.infrastructureNodes.length > 0) ? this.infrastructureNodes : this.slabRoutes;
    if (roadNodes && roadNodes.length > 0) {
      for (let i = 0; i < roadNodes.length; i += 2) {
        const node = roadNodes[i];
        const d = Math.hypot(node.x - plat.x, node.z - plat.z);
        if (d < minDist) {
          minDist = d;
          nearestNode = node;
        }
      }
    }

    const seed = Math.abs(Math.sin(plat.x * 12.9898 + plat.z * 78.233));
    if (nearestNode && minDist < 16.5) {
      const dx = nearestNode.x - plat.x;
      const dz = nearestNode.z - plat.z;
      // Aponta a fachada frontal (+Z) para a via com micro-variação orgânica sutil (±4 graus)
      naturalAngle = Math.atan2(dx, dz) + (seed - 0.5) * 0.14;
    } else {
      // Lotes mais afastados miram suavemente na direção do declive / vista para o mar
      const gradX = (c2 + c4) - (c1 + c3);
      const gradZ = (c3 + c4) - (c1 + c2);
      naturalAngle = Math.atan2(-gradX, gradZ) + (seed - 0.5) * 0.32;
    }
    
    houseGroup.rotation.y = naturalAngle;

    const houseColor = paletteItem ? paletteItem.color : 0xE76F51;
    const houseColorName = paletteItem ? paletteItem.name : 'Coral';

    const houseData = {
      id: plat.id,
      faction: plat.faction,
      position: { x: plat.x, y: highestPoint, z: plat.z },
      level: level,
      color: houseColor,
      colorName: houseColorName,
      meshGroup: houseGroup,
      residents: 6 + level * 3,
      wealth: 15 * level,
      waterLevel: 90,
      stories: [],
      laje: null
    };

    // FUNDAÇÃO ARQUITETÔNICA INTEGRADA (Patamar de Pedra de Mão + Mureta de Contenção + Pilotis):
    const fDepth = Math.max(1.8, slopeDelta + 2.0);
    const baseMat = getSharedStylizedMaterial(0x524A42, 'stone', { flatShading: true });
    const stonePlinthMat = getSharedStylizedMaterial(0x6C7784, 'stone', { flatShading: true });
    const concreteRimMat = getSharedStylizedMaterial(0xCBC6BC, 'stone', { flatShading: true });

    // Patamar de pedra argamassada sob toda a projeção da casa (elimina aspecto de "caixa solta na grama")
    const plinthHeight = Math.max(0.95, slopeDelta + 0.85);
    const stonePlinth = new THREE.Mesh(new THREE.BoxGeometry(4.6, plinthHeight, 4.3), stonePlinthMat);
    stonePlinth.position.set(0, -plinthHeight / 2 - 0.08, 0.1);
    stonePlinth.receiveShadow = true;
    houseGroup.add(stonePlinth);

    const concretePad = new THREE.Mesh(new THREE.BoxGeometry(4.75, 0.14, 4.45), concreteRimMat);
    concretePad.position.set(0, -0.07, 0.1);
    concretePad.receiveShadow = true;
    houseGroup.add(concretePad);

    if (slopeDelta > 1.8) {
      // PILOTIS REFORÇADOS sobre o muro de arrimo em encostas íngremes
      const offsets = [
        { x: -1.7, z: -1.5 }, { x: 1.7, z: -1.5 },
        { x: -1.7, z: 1.5 }, { x: 1.7, z: 1.5 },
        { x: 0, z: 0 }
      ];
      offsets.forEach(off => {
        const px = plat.x + Math.cos(naturalAngle) * off.x + Math.sin(naturalAngle) * off.z;
        const pz = plat.z - Math.sin(naturalAngle) * off.x + Math.cos(naturalAngle) * off.z;
        const gy = this.terrain ? this.terrain.getElevation(px, pz) : groundY;
        const localGroundY = gy - buildY;
        const pHeight = Math.max(0.2, -0.05 - localGroundY + 0.35);

        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, pHeight, 6), baseMat);
        pillar.position.set(off.x, -0.05 - pHeight / 2, off.z);
        pillar.receiveShadow = true;
        pillar.castShadow = true;
        houseGroup.add(pillar);
      });
      const baseGeo = new THREE.BoxGeometry(4.3, 0.25, 3.9);
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(0, -0.125, 0);
      base.receiveShadow = true;
      houseGroup.add(base);
    } else {
      // Embasamento sólido em alvenaria estrutural
      const w = 3.95;
      const d = 3.65;
      const foundationGeo = new THREE.BoxGeometry(w, fDepth * 0.65, d);
      const foundationMat = getSharedStylizedMaterial(0x5D5852, 'stone', { flatShading: true });
      const foundation = new THREE.Mesh(foundationGeo, foundationMat);
      foundation.position.set(0, -(fDepth * 0.65) / 2, 0);
      foundation.receiveShadow = true;
      houseGroup.add(foundation);
    }

    // Ground floor
    this.buildStory(houseData, 0);

    // Upper floor & laje if level >= 2
    if (level >= 2) {
      this.buildStory(houseData, 1);
      this.buildLaje(houseData, 2);
    } else {
      this.buildLaje(houseData, 1);
    }

    // Solid stone entrance steps (escadaria de acesso) leading out from the doorway
    const stepMat = getSharedStylizedMaterial(0x746D64, 'stone', { flatShading: true });
    for (let s = 1; s <= 3; s++) {
      const sz = 1.95 + s * 0.55;
      const gx = plat.x + Math.sin(naturalAngle) * sz;
      const gz = plat.z + Math.cos(naturalAngle) * sz;
      const gy = this.terrain ? this.terrain.getElevation(gx, gz) : groundY;
      const localGroundY = gy - buildY;
      
      const stepTop = -s * 0.16;
      // Estica o degrau da altura stepTop até encostar firme no solo (-0.2 para enterrar um pouco)
      let stepHeight = Math.max(0.1, stepTop - localGroundY + 0.2);
      
      // TRAVA DE BOM SENSO: Se o degrau for > 1.2m, ele não estica até o chão, vira degrau flutuante!
      if (stepHeight > 1.2) {
        stepHeight = 0.25;
      }
      
      const stepY = stepTop - stepHeight / 2;

      const step = new THREE.Mesh(new THREE.BoxGeometry(1.5, stepHeight, 0.65), stepMat);
      step.position.set(0, stepY, sz);
      step.receiveShadow = true;
      houseGroup.add(step);
    }

    // EXTENSÃO DA CALÇADA ATÉ A RUA (Integração Orgânica)
    if (nearestNode && minDist > 3.6 && minDist < 15.0) {
      const numSlabs = Math.floor((minDist - 3.6) / 0.85);
      const slabGeo = new THREE.BoxGeometry(1.2, 0.1, 0.8);
      const slabMat = getSharedStylizedMaterial(0x949FA9, 'stone', { flatShading: true });
      for (let s = 1; s <= numSlabs; s++) {
        const distFromCenter = 3.6 + s * 0.85;
        // Convert to global to get proper terrain height
        const gx = plat.x + Math.sin(naturalAngle) * distFromCenter;
        const gz = plat.z + Math.cos(naturalAngle) * distFromCenter;
        const gy = this.terrain ? this.terrain.getElevation(gx, gz) : groundY;
        const localY = gy - buildY;
        
        const slab = new THREE.Mesh(slabGeo, slabMat);
        slab.position.set(0, localY + 0.05, distFromCenter);
        slab.receiveShadow = true;
        slab.castShadow = true;
        houseGroup.add(slab);
      }
    }

    // Compactar fundação, degraus e calçada estática por material para cortar draw calls
    const _shared = new Set([...Object.values(_getHouseGeo()), this.sharedWaterTankGeo, this.sharedWaterTankLidGeo].filter(Boolean));
    const _skipSubs = new Set([...houseData.stories, houseData.laje].filter(Boolean));
    _compactStaticChildren(houseGroup, _shared, _skipSubs);

    // CONGELAR MATRIZES (PERFORMANCE OPTIMIZATION)
    // Casas nunca mudam de posição, então desabilitamos os recálculos da placa de vídeo
    houseGroup.traverse((child) => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    this.group.add(houseGroup);
    return houseData;
  },

  buildStory(houseData, storyIndex) {
    const geo = _getHouseGeo();
    const storyGroup = new THREE.Group();
    const houseHash = Math.abs(Math.round(houseData.position.x * 13 + houseData.position.z * 29));
    const h2 = Math.abs(Math.round(houseData.position.x * 37 - houseData.position.z * 19));

    // Proporções orgânicas variadas (sobrados estreitos, casarões largos e balanços sutis de encosta)
    const wVar = ((houseHash % 9) - 4) * 0.11; // -0.44 .. +0.44
    const dVar = ((h2 % 7) - 3) * 0.12;        // -0.36 .. +0.36
    const w = Math.max(3.35, Math.min(4.35, 3.85 + wVar + Math.sin(houseData.position.x * 2 + storyIndex) * 0.12));
    const d = Math.max(3.15, Math.min(4.05, 3.55 + dVar + Math.cos(houseData.position.z * 2 + storyIndex) * 0.10));
    const h = 2.5;
    const storyY = storyIndex * h + h / 2;

    const offsetX = storyIndex > 0 ? (((houseHash + storyIndex) % 5) - 2) * 0.08 : 0;
    const offsetZ = storyIndex > 0 ? (houseHash % 3 === 0 ? 0.16 : (((h2 + storyIndex) % 5) - 2) * 0.06) : 0;

    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const isBrick = (storyIndex === 1 && (houseHash % 5 < 2));
    const bodyColor = isBrick ? 0xA8543E : houseData.color;

    const bodyMat = getSharedStylizedMaterial(bodyColor, isBrick ? 'brick' : 'plaster', { flatShading: false });

    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.position.set(offsetX, storyY, offsetZ);
    storyGroup.add(bodyMesh);

    const trimMat = getSharedStylizedMaterial(0xEAE4D7, 'plaster');
    const sillMat = getSharedStylizedMaterial(0xCFC9BC, 'stone', { flatShading: true });
    const railMat = getSharedStylizedMaterial(0x2B323A, 'metal', { flatShading: true });
    const potMat = getSharedStylizedMaterial(0xB95B3E, 'brick', { flatShading: true });
    const plantMat = getSharedStylizedMaterial(0x41823D, 'foliage', { flatShading: true });
    const awningPalette = [0xC94B3B, 0x2F74A6, 0x3D8A5A, 0xDDA63A, 0x7A4988];

    // Mãos-francesas sob o balanço do 2º andar quando projetado para frente
    if (storyIndex > 0 && offsetZ > 0.10) {
      const corbelMat = getSharedStylizedMaterial(0x8E867B, 'stone', { flatShading: true });
      [-w * 0.34, w * 0.34].forEach((cx) => {
        const corbel = new THREE.Mesh(geo.corbel, corbelMat);
        corbel.position.set(offsetX + cx, storyY - h / 2 - 0.12, offsetZ + d / 2 - 0.18);
        storyGroup.add(corbel);
      });
    }

    if (storyIndex === 0) {
      const doorFrame = new THREE.Mesh(geo.doorFrame, trimMat);
      doorFrame.position.set(offsetX - w * 0.22, 1.72 / 2, offsetZ + d / 2 + 0.015);
      storyGroup.add(doorFrame);

      const doorMat = getSharedStylizedMaterial(0x5A3A28, 'wood');
      const door = new THREE.Mesh(geo.door, doorMat);
      door.position.set(offsetX - w * 0.22, 1.60 / 2, offsetZ + d / 2 + 0.032);
      storyGroup.add(door);

      // Marquise ou toldo colorido de birosca/fachada sobre a entrada
      const useColoredAwning = (houseHash % 3 === 0);
      const canopyMat = useColoredAwning
        ? getSharedStylizedMaterial(awningPalette[houseHash % awningPalette.length], 'plaster', { flatShading: true })
        : getSharedStylizedMaterial(0x475361, 'metal', { flatShading: true });
      const canopy = new THREE.Mesh(useColoredAwning ? geo.awningCanopy : geo.doorCanopy, canopyMat);
      canopy.position.set(
        offsetX - (useColoredAwning ? w * 0.14 : w * 0.22),
        1.84,
        offsetZ + d / 2 + (useColoredAwning ? 0.34 : 0.20)
      );
      canopy.rotation.x = useColoredAwning ? 0.24 : 0.16;
      canopy.castShadow = true;
      storyGroup.add(canopy);

      // Vasos de cerâmica com plantas tropicais flanqueando a porta de entrada (~65% das casas)
      if (houseHash % 3 !== 2) {
        const potSides = houseHash % 2 === 0 ? [offsetX - w * 0.22 - 0.68, offsetX - w * 0.22 + 0.68] : [offsetX - w * 0.22 - 0.68];
        potSides.forEach((px) => {
          const pot = new THREE.Mesh(geo.potBase, potMat);
          pot.position.set(px, 0.14, offsetZ + d / 2 + 0.24);
          pot.castShadow = true;
          storyGroup.add(pot);

          const bush = new THREE.Mesh(geo.potPlant, plantMat);
          bush.position.set(px, 0.42, offsetZ + d / 2 + 0.24);
          bush.castShadow = true;
          storyGroup.add(bush);
        });
      }

      // Escada externa lateral carioca ligando o térreo ao 2º andar (~40% das casas de 2+ andares)
      const stairSide = (h2 % 2 === 0) ? -1 : 1; // Sempre no lado oposto à extrusão em L do térreo!
      const hasExtStair = houseData.level >= 2 && (houseHash % 5 < 2);
      if (hasExtStair) {
        const sx = offsetX + stairSide * (w / 2 + 0.32);
        const stairMat = getSharedStylizedMaterial(0x888178, 'stone', { flatShading: true });
        for (let st = 0; st < 6; st++) {
          const t = st / 5;
          const stepMesh = new THREE.Mesh(geo.extStairStep, stairMat);
          stepMesh.position.set(sx, 0.30 + t * 2.05, offsetZ + d * 0.36 - t * (d * 0.72));
          stepMesh.castShadow = true;
          stepMesh.receiveShadow = true;
          storyGroup.add(stepMesh);
        }
        const extRail = new THREE.Mesh(geo.extStairRail, railMat);
        extRail.position.set(sx + stairSide * 0.29, 1.80, offsetZ);
        extRail.rotation.x = 0.68;
        storyGroup.add(extRail);
      }

      // Mural / Grafite geométrico carioca em ~22% das empenas laterais cegas (-X, evitando a escada externa)
      if ((houseHash % 9 === 1 || houseHash % 9 === 5) && !(hasExtStair && stairSide === -1)) {
        const muralColors = [
          [0xE6A938, 0x2E74A6, 0xD45A46],
          [0x3E8A5B, 0xF2BA38, 0xD9468F],
          [0x2F85A6, 0xEAE0CE, 0xD96B43]
        ][houseHash % 3];
        const mx = offsetX - w / 2 - 0.02;
        muralColors.forEach((mc, mi) => {
          const band = new THREE.Mesh(geo.muralBand, getSharedStylizedMaterial(mc, 'plaster', { flatShading: true }));
          band.position.set(mx, 0.62 + mi * 0.56, offsetZ + (mi - 1) * 0.14);
          band.scale.set(1.0, 0.52, 0.62 + (mi === 1 ? 0.24 : 0));
          storyGroup.add(band);
        });
      }
    }

    // Variedade Arquitetônica 3.0: Extrusões em L para quebrar o caixote!
    if ((houseHash + storyIndex * 3) % 5 < 2) {
      const extW = w * 0.44;
      const extD = d * 0.58;
      const isRight = ((h2 + storyIndex) % 2 === 0);
      const extX = isRight ? (offsetX + w / 2 + extW / 2 - 0.2) : (offsetX - w / 2 - extW / 2 + 0.2);

      const extBody = new THREE.Mesh(new THREE.BoxGeometry(extW, h, extD), bodyMat);
      extBody.position.set(extX, storyY, offsetZ - d / 2 + extD / 2);
      extBody.castShadow = true;
      extBody.receiveShadow = true;
      storyGroup.add(extBody);

      const extSlabMat = getSharedStylizedMaterial(0x9A9288, 'stone', { flatShading: true });
      const extSlab = new THREE.Mesh(new THREE.BoxGeometry(extW + 0.2, 0.2, extD + 0.2), extSlabMat);
      extSlab.position.set(extX, storyY + h / 2 + 0.1, offsetZ - d / 2 + extD / 2);
      extSlab.castShadow = true;
      storyGroup.add(extSlab);
    }

    // Helper local: janela emoldurada com peitoril e venezianas opcionais
    const winMats = this.sharedWindowMats;
    const winSlot = (houseHash + storyIndex) % (winMats ? winMats.length : 1);
    const winMat = winMats ? winMats[winSlot] : getSharedStylizedMaterial(0x3D5570, 'ceramic');
    const shutterColors = [0x3D6E59, 0x355C8A, 0x8F4B38, 0xDDD6C7];
    const hasShutters = (houseHash % 3 !== 0);
    const shutterMat = hasShutters ? getSharedStylizedMaterial(shutterColors[houseHash % shutterColors.length], 'wood') : null;

    const addFramedWindow = (wx, wy, wz, rotY = 0) => {
      const wg = new THREE.Group();
      wg.position.set(wx, wy, wz);
      wg.rotation.y = rotY;

      const frame = new THREE.Mesh(geo.winFrame, trimMat);
      frame.position.z = 0.015;
      wg.add(frame);

      const sill = new THREE.Mesh(geo.winSill, sillMat);
      sill.position.set(0, -0.45, 0.045);
      wg.add(sill);

      const pane = new THREE.Mesh(geo.winPane, winMat);
      pane.position.z = 0.030;
      wg.add(pane);
      this.windowMeshes.push(pane);

      if (shutterMat) {
        const shL = new THREE.Mesh(geo.winShutter, shutterMat);
        shL.position.set(-0.52, 0, 0.025);
        wg.add(shL);
        const shR = new THREE.Mesh(geo.winShutter, shutterMat);
        shR.position.set(0.52, 0, 0.025);
        wg.add(shR);
      }

      storyGroup.add(wg);
    };

    addFramedWindow(offsetX + w * 0.22, storyY + 0.15, offsetZ + d / 2, 0);
    addFramedWindow(offsetX + w / 2, storyY + 0.15, offsetZ, Math.PI / 2);
    if (storyIndex > 0) {
      addFramedWindow(offsetX - w * 0.22, storyY + 0.15, offsetZ + d / 2, 0);
      addFramedWindow(offsetX - w / 2, storyY + 0.15, offsetZ, -Math.PI / 2);
    }

    // Friso/cintamento de laje em tom quente coordenado (quebra o aspecto cinza frio repetitivo)
    const slabColors = [0x948C82, 0xD8CFC0, 0x868E98];
    const slabGeo = new THREE.BoxGeometry(w + 0.24, 0.22, d + 0.24);
    const slabMat = getSharedStylizedMaterial(slabColors[houseHash % slabColors.length], 'stone', { flatShading: true });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(offsetX, storyY + h / 2 + 0.1, offsetZ);
    slab.castShadow = true;
    slab.receiveShadow = true;
    storyGroup.add(slab);

    // Varanda Carioca (gradil metálico, floreira florida e toldo sombreado em ~65% dos pavimentos superiores)
    if (storyIndex > 0 && ((houseHash + storyIndex) % 3 !== 0)) {
      const balcW = Math.min(w * 0.68, 2.35);
      const balcD = 0.86;
      const balcY = storyY - h / 2 + 0.06;
      const balcZ = offsetZ + d / 2 + balcD / 2;

      const balconyMat = getSharedStylizedMaterial(0x7A7F86, 'stone', { flatShading: true });
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(balcW, 0.12, balcD), balconyMat);
      balcony.position.set(offsetX, balcY, balcZ);
      balcony.castShadow = true;
      balcony.receiveShadow = true;
      storyGroup.add(balcony);

      const railFrontZ = offsetZ + d / 2 + balcD - 0.06;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(balcW, 0.07, 0.06), railMat);
      rail.position.set(offsetX, balcY + 0.50, railFrontZ);
      storyGroup.add(rail);

      // 5 balaustres verticais de gradil
      for (let bp = 0; bp < 5; bp++) {
        const px = -balcW / 2 + 0.06 + (bp / 4) * (balcW - 0.12);
        const post = new THREE.Mesh(geo.balcPost, railMat);
        post.position.set(offsetX + px, balcY + 0.28, railFrontZ);
        storyGroup.add(post);
      }

      // Floreira florida pendurada na grade da varanda
      const planter = new THREE.Mesh(geo.planterBox, potMat);
      planter.position.set(offsetX, balcY + 0.44, railFrontZ + 0.10);
      storyGroup.add(planter);

      const pBush = new THREE.Mesh(geo.planterBush, plantMat);
      pBush.position.set(offsetX, balcY + 0.58, railFrontZ + 0.10);
      storyGroup.add(pBush);

      const bloomCols = [0xD9468F, 0xF2BA38, 0xE86747, 0xF5EFE2];
      const bMat = getSharedStylizedMaterial(bloomCols[houseHash % bloomCols.length], 'foliage', { flatShading: true });
      [-0.30, 0, 0.30].forEach((bx) => {
        const bl = new THREE.Mesh(geo.planterBloom, bMat);
        bl.position.set(offsetX + bx, balcY + 0.70, railFrontZ + 0.10);
        storyGroup.add(bl);
      });

      // Toldo inclinado colorido cobrindo a varanda em metade das casas
      if (houseHash % 2 === 0) {
        const balcAwningMat = getSharedStylizedMaterial(awningPalette[(houseHash + storyIndex) % awningPalette.length], 'plaster', { flatShading: true });
        const balcAwning = new THREE.Mesh(geo.awningCanopy, balcAwningMat);
        balcAwning.scale.set(balcW / 1.75, 1.0, 1.05);
        balcAwning.position.set(offsetX, storyY + h / 2 - 0.20, balcZ + 0.04);
        balcAwning.rotation.x = 0.26;
        balcAwning.castShadow = true;
        storyGroup.add(balcAwning);
      }

      if ((houseHash + storyIndex) % 2 === 1) {
        const miniLine = this.createClothesline();
        miniLine.scale.set(0.5, 0.5, 0.5);
        miniLine.position.set(offsetX + 0.2, storyY - h / 2 + 0.2, offsetZ + d / 2 + 0.32);
        storyGroup.add(miniLine);
      }
    }

    const _shared = new Set([...Object.values(geo), this.sharedWaterTankGeo, this.sharedWaterTankLidGeo].filter(Boolean));
    _compactStaticChildren(storyGroup, _shared);

    // CONGELAR MATRIZES PARA PERFORMANCE
    storyGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    houseData.meshGroup.add(storyGroup);
    houseData.stories.push(storyGroup);
  },

  buildLaje(houseData, storyIndex) {
    if (houseData.laje) {
      houseData.meshGroup.remove(houseData.laje);
    }

    const geo = _getHouseGeo();
    const lajeGroup = new THREE.Group();
    const h = 2.5;
    const lajeY = storyIndex * h + 0.2;

    const houseHash = Math.abs(Math.round(houseData.position.x * 17 + houseData.position.z * 31));
    const variant = houseHash % 10;
    // Casas Nível 3+ mantêm a laje social com churrasco; Níveis 1-2 ganham variação de telhado colonial e meia-água!
    const roofStyle = houseData.level >= 3 ? 'laje' : (variant < 4 ? 'laje' : (variant < 7 ? 'hipped' : 'shed'));

    const floorGeo = new THREE.BoxGeometry(4.0, 0.22, 3.6);
    const floorMat = getSharedStylizedMaterial(0x747E8B, 'stone', { flatShading: true });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, lajeY, 0);
    floor.receiveShadow = true;
    lajeGroup.add(floor);

    if (roofStyle === 'hipped') {
      // Telhado colonial de 4 águas em cerâmica com beiral de madeira
      const eaveMat = getSharedStylizedMaterial(0x52392B, 'wood', { flatShading: true });
      const eaveRim = new THREE.Mesh(geo.roofEaveRim, eaveMat);
      eaveRim.scale.set(4.55, 1.0, 4.15);
      eaveRim.position.set(0, lajeY + 0.14, 0);
      eaveRim.castShadow = true;
      lajeGroup.add(eaveRim);

      const tileColors = [0xB45338, 0xA34932, 0xC26243];
      const tileMat = getSharedStylizedMaterial(tileColors[houseHash % tileColors.length], 'brick', { flatShading: true });
      const ridgeH = 1.05;
      const hipRoof = new THREE.Mesh(geo.roofHipCone, tileMat);
      hipRoof.scale.set(4.65 / Math.SQRT2, ridgeH, 4.25 / Math.SQRT2);
      hipRoof.rotation.y = Math.PI / 4;
      hipRoof.position.set(0, lajeY + 0.16 + ridgeH / 2, 0);
      hipRoof.castShadow = true;
      hipRoof.receiveShadow = true;
      lajeGroup.add(hipRoof);
    } else if (roofStyle === 'shed') {
      // Telhado meia-água inclinado (telha cerâmica ou zinco) com oitão fechado nas laterais
      const wallMat = getSharedStylizedMaterial(0xA8543E, 'brick', { flatShading: true });
      const gableWedge = new THREE.Mesh(geo.roofShedWedge, wallMat);
      gableWedge.position.set(0, lajeY + 0.08, 0);
      gableWedge.castShadow = true;
      gableWedge.receiveShadow = true;
      lajeGroup.add(gableWedge);

      const isMetalRoof = (houseHash % 2 === 0);
      const shedMat = isMetalRoof
        ? getSharedStylizedMaterial(0x667482, 'metal', { flatShading: true, roughness: 0.45, metalness: 0.32 })
        : getSharedStylizedMaterial(0xB5563B, 'brick', { flatShading: true });
      const shedRoof = new THREE.Mesh(geo.roofShedPlate, shedMat);
      shedRoof.scale.set(4.55, 1.0, 4.20);
      shedRoof.rotation.x = 0.13;
      shedRoof.position.set(0, lajeY + 0.36, 0.02);
      shedRoof.castShadow = true;
      shedRoof.receiveShadow = true;
      lajeGroup.add(shedRoof);
    } else {
      const wallMat = getSharedStylizedMaterial(0xA8543E, 'brick', { flatShading: true });
      const frontWallGeo = new THREE.BoxGeometry(4.0, 0.55, 0.15);
      const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
      frontWall.position.set(0, lajeY + 0.32, 1.75);
      lajeGroup.add(frontWall);

      // Muretas laterais parciais para dar acabamento de terraço carioca
      const sideParapetGeo = new THREE.BoxGeometry(0.15, 0.48, 1.8);
      [-1.92, 1.92].forEach((sx) => {
        const sp = new THREE.Mesh(sideParapetGeo, wallMat);
        sp.position.set(sx, lajeY + 0.28, 0.85);
        lajeGroup.add(sp);
      });

      // Floreira colorida no parapeito frontal da laje (~55% das lajes sociais)
      if (houseHash % 9 < 5) {
        const potMat = getSharedStylizedMaterial(0xB95B3E, 'brick', { flatShading: true });
        const plantMat = getSharedStylizedMaterial(0x41823D, 'foliage', { flatShading: true });
        const bloomCols = [0xD9468F, 0xF2BA38, 0xE86747, 0xF5EFE2];
        const bloomMat = getSharedStylizedMaterial(bloomCols[houseHash % bloomCols.length], 'foliage', { flatShading: true });

        const planter = new THREE.Mesh(geo.planterBox, potMat);
        planter.position.set(-0.6, lajeY + 0.64, 1.78);
        lajeGroup.add(planter);

        const pBush = new THREE.Mesh(geo.planterBush, plantMat);
        pBush.position.set(-0.6, lajeY + 0.78, 1.78);
        lajeGroup.add(pBush);

        [-0.90, -0.60, -0.30].forEach((bx) => {
          const fl = new THREE.Mesh(geo.planterBloom, bloomMat);
          fl.position.set(bx, lajeY + 0.90, 1.78);
          lajeGroup.add(fl);
        });
      }

      // Caixa d'água azul tradicional carioca (alterna lado em níveis 1-2; fixa na esquerda em nível 3+ para não colidir com a churrasqueira)
      if (houseData.level >= 2 || (houseHash % 3 !== 0)) {
        const tankX = houseData.level >= 3 ? -1.15 : ((houseHash % 2 === 0) ? -1.15 : 1.15);
        const tankBaseH = (houseHash % 3 === 0) ? 0.35 : 0;
        if (tankBaseH > 0) {
          const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.95, tankBaseH, 0.95), wallMat);
          plinth.position.set(tankX, lajeY + 0.11 + tankBaseH / 2, -0.95);
          plinth.castShadow = true;
          lajeGroup.add(plinth);
        }
        const tank = new THREE.Mesh(this.sharedWaterTankGeo, this.sharedWaterTankMat);
        tank.position.set(tankX, lajeY + 0.7 + tankBaseH, -0.95);
        tank.castShadow = true;
        lajeGroup.add(tank);

        const lid = new THREE.Mesh(this.sharedWaterTankLidGeo, this.sharedWaterTankMat);
        lid.position.set(tankX, lajeY + 1.25 + tankBaseH, -0.95);
        lajeGroup.add(lid);
      }

      // Pérgola leve de madeira + bandeirinhas festivas em ~35% das lajes sociais!
      if (houseHash % 3 === 0) {
        const woodMat = getSharedStylizedMaterial(0x6D4A35, 'wood', { flatShading: true });
        [[-1.65, 1.35], [1.65, 1.35], [-1.65, -0.25], [1.65, -0.25]].forEach(([px, pz]) => {
          const post = new THREE.Mesh(geo.pergolaPost, woodMat);
          post.position.set(px, lajeY + 1.0, pz);
          post.castShadow = true;
          lajeGroup.add(post);
        });
        [1.35, 0.55, -0.25].forEach((bz) => {
          const beam = new THREE.Mesh(geo.pergolaBeam, woodMat);
          beam.position.set(0, lajeY + 1.92, bz);
          beam.castShadow = true;
          lajeGroup.add(beam);
        });

        // Cordão de bandeirinhas cariocas sob a pérgola
        const pennantPalette = [0xE6A938, 0xD45A46, 0x3A82B5, 0x459A62, 0xD9468F];
        for (let f = 0; f < 6; f++) {
          const t = (f + 0.5) / 6;
          const fx = -1.55 + t * 3.1;
          const sag = Math.sin(t * Math.PI) * 0.22;
          const flag = new THREE.Mesh(
            geo.pennantFlag,
            getSharedStylizedMaterial(pennantPalette[(houseHash + f) % pennantPalette.length], 'plaster', { flatShading: true })
          );
          flag.rotation.x = Math.PI; // Ponta para baixo
          flag.position.set(fx, lajeY + 1.78 - sag, 0.95);
          lajeGroup.add(flag);
        }
      } else if (houseHash % 2 === 1) {
        // Clothesline nas lajes sem pérgola
        const lineGroup = this.createClothesline();
        lineGroup.position.set(0.45, lajeY + 0.1, 0.25);
        lajeGroup.add(lineGroup);
      }
    }

    // Antena de TV ou Antena Parabólica estilizada (~55% das casas)
    if (houseHash % 9 < 5) {
      const antennaGroup = new THREE.Group();
      const antMat = getSharedStylizedMaterial(0x94A3B8, 'metal');
      if (houseHash % 2 === 0) {
        // Antena espinha-de-peixe
        const mast = new THREE.Mesh(geo.antMast, antMat);
        mast.position.y = 0.9;
        antennaGroup.add(mast);
        for (let i = 0; i < 4; i++) {
          const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8 - i * 0.15, 4), antMat);
          cross.rotation.z = Math.PI / 2;
          cross.position.y = 1.0 + i * 0.2;
          antennaGroup.add(cross);
        }
      } else {
        // Antena parabólica estilizada apontada para o céu
        const dishMast = new THREE.Mesh(geo.antMast, antMat);
        dishMast.scale.set(1.2, 0.45, 1.2);
        dishMast.position.y = 0.4;
        antennaGroup.add(dishMast);

        const dishMat = getSharedStylizedMaterial(0xDCE2E8, 'metal', { flatShading: true });
        const dish = new THREE.Mesh(geo.dishCone, dishMat);
        dish.position.set(0, 0.82, 0);
        dish.rotation.set(-0.75, (houseHash % 6) * 0.5, 0);
        antennaGroup.add(dish);
      }
      const antY = roofStyle === 'hipped' ? lajeY + 0.55 : (roofStyle === 'shed' ? lajeY + 0.35 : lajeY + 0.1);
      antennaGroup.position.set(1.5, antY, 1.0);
      lajeGroup.add(antennaGroup);
    }

    // Churrasqueira de tijolo, mesa de boteco e churrasqueiro: APENAS NÍVEL MÁXIMO (Nível 3)!
    // Casas recém-construídas (Nível 1 ou 2) NÃO possuem churrasqueira nem morador na laje!
    if (houseData.level >= 3) {
      const bbqGroup = new THREE.Group();
      bbqGroup.position.set(1.2, lajeY + 0.5, -1.0);

      const bbqGeo = new THREE.BoxGeometry(0.65, 0.95, 0.65);
      const bbqMat = getSharedStylizedMaterial(0xA8543E, 'brick', { flatShading: true });
      const bbq = new THREE.Mesh(bbqGeo, bbqMat);
      bbqGroup.add(bbq);

      // Chaminé de tijolo
      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.5, 0.35),
        bbqMat
      );
      chimney.position.set(0, 0.7, 0);
      bbqGroup.add(chimney);

      // Brasa incandescente (desligada de dia, incandescente de noite)
      const coalsMat = new THREE.MeshBasicMaterial({ color: 0x2B2B2B });
      const coals = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.08, 0.48),
        coalsMat
      );
      coals.userData.dynamic = true;
      coals.position.set(0, 0.46, 0.06);
      bbqGroup.add(coals);

      lajeGroup.add(bbqGroup);

      // Mesa de madeira de boteco com caipirinhas
      const tableMat = getSharedStylizedMaterial(0x634535, 'wood', { flatShading: true });
      const table = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.5), tableMat);
      table.position.set(-0.25, lajeY + 0.26, -0.9);
      lajeGroup.add(table);

      // 2 Copos de Caipirinha gelada com limão verde
      const drinkMat = getSharedStylizedMaterial(0x7AB82E, 'ceramic', { flatShading: true });
      const cup1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 5), drinkMat);
      cup1.position.set(-0.38, lajeY + 0.58, -0.9);
      lajeGroup.add(cup1);

      const cup2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 5), drinkMat);
      cup2.position.set(-0.12, lajeY + 0.58, -0.85);
      lajeGroup.add(cup2);

      // Cadeira de praia / banqueta amarela
      const chairMat = getSharedStylizedMaterial(0xE0B038, 'ceramic', { flatShading: true });
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.42), chairMat);
      chair.position.set(-0.25, lajeY + 0.22, -0.3);
      lajeGroup.add(chair);

      // Churrasqueiro da Laje com anatomia esculpida Claude Opus (aparece APENAS à noite nas casas com churrasco!)
      const skinColors = [0x8D5524, 0xC68642, 0xE0AC69];
      const chosenSkin = skinColors[Math.floor(Math.random() * skinColors.length)];
      const bbqFig = createStylizedFigure({
        skinColor: chosenSkin,
        shirtColor: houseData.color,
        pantsColor: 0x1E293B,
        hairColor: 0x1F1917,
        wearsShorts: true,
        hasMustache: true
      });
      const churrasqueiroGroup = bbqFig.group;
      churrasqueiroGroup.userData.dynamic = true;
      churrasqueiroGroup.scale.setScalar(0.82);
      churrasqueiroGroup.position.set(0.55, lajeY + 0.02, -0.75);
      churrasqueiroGroup.visible = false; // Começa invisível! Só aparece à noite se a casa decidir fazer churrasco!

      const resTorso = bbqFig.torso;
      const armR = bbqFig.rightArm;
      if (armR) armR.rotation.x = -0.65;

      const skewerMat = new THREE.MeshBasicMaterial({ color: 0xCCCCCC });
      const skewer = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.03), skewerMat);
      skewer.position.set(0.0, -0.45, 0.16);
      skewer.rotation.x = Math.PI / 2.5;
      if (armR) armR.add(skewer);

      lajeGroup.add(churrasqueiroGroup);

      // Registrar posição do churrasco e componentes para animação de noite
      const bbqWorldPos = new THREE.Vector3(
        houseData.position.x + 1.2,
        houseData.position.y + lajeY + 1.85,
        houseData.position.z - 1.0
      );
      this.lajeBBQs.push({
        houseId: houseData.id,
        pos: bbqWorldPos,
        coals,
        churrasqueiro: churrasqueiroGroup,
        armR,
        torso: resTorso,
        timer: Math.random() * 0.5
      });
    }

    const _sharedLaje = new Set([...Object.values(geo), this.sharedWaterTankGeo, this.sharedWaterTankLidGeo].filter(Boolean));
    _compactStaticChildren(lajeGroup, _sharedLaje);

    // CONGELAR MATRIZES PARA PERFORMANCE
    lajeGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    houseData.meshGroup.add(lajeGroup);
    houseData.laje = lajeGroup;
  },

  createClothesline() {
    const geo = _getHouseGeo();
    const lineGroup = new THREE.Group();
    const poleMat = getSharedStylizedMaterial(0x523726, 'wood');

    const pole1 = new THREE.Mesh(geo.clothPole, poleMat);
    pole1.position.set(-0.85, 0.75, 0);
    lineGroup.add(pole1);

    const pole2 = new THREE.Mesh(geo.clothPole, poleMat);
    pole2.position.set(0.85, 0.75, 0);
    lineGroup.add(pole2);

    const wireMat = getSharedStylizedMaterial(0x282828, 'metal');
    const wire = new THREE.Mesh(geo.clothWire, wireMat);
    wire.position.set(0, 1.35, 0);
    lineGroup.add(wire);

    const clothesColors = [0xD95C64, 0x4592CE, 0xDFB848, 0xEAE4D7];
    for (let c = 0; c < 3; c++) {
      const clothMat = getSharedStylizedMaterial(clothesColors[c % clothesColors.length], 'plaster');
      const cloth = new THREE.Mesh(geo.clothPiece, clothMat);
      cloth.userData.dynamic = true;
      cloth.position.set(-0.45 + c * 0.45, 1.05, 0);
      lineGroup.add(cloth);
      this.clotheslines.push({ mesh: cloth, phase: c * 0.8 });
    }

    return lineGroup;
  },

  spawnConstructionPuff(pos) {
    if (this.particles.length > 40) return; // Pool safeguard
    const numParticles = 8;
    const mats = [this.puffMatBrick, this.puffMatCement, this.puffMatWood];
    for (let i = 0; i < numParticles; i++) {
      const mat = mats[Math.floor(Math.random() * mats.length)];
      const cube = new THREE.Mesh(this.sharedPuffGeo, mat);
      cube.position.set(
        pos.x + (Math.random() - 0.5) * 1.6,
        pos.y + 1.2 + Math.random() * 1.4,
        pos.z + (Math.random() - 0.5) * 1.6
      );

      this.group.add(cube);
      this.particles.push({
        mesh: cube,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 2.2,
          1.8 + Math.random() * 2.0,
          (Math.random() - 0.5) * 2.2
        ),
        gravity: 2.4,
        life: 1.2,
        maxLife: 1.2
      });
    }
  },

  getActiveHousesData() {
    return this.houses.map(h => ({
      id: h.id,
      faction: h.faction,
      x: h.position.x,
      y: h.position.y,
      z: h.position.z,
      level: h.level,
      color: h.color,
      colorName: h.colorName,
      wealth: h.wealth,
      residents: h.residents
    }));
  },

  createExpandedNeighborhoodHubs() {
    const getElev = (x, z) => this.terrain ? this.terrain.getElevation(x, z) : 6.0;
    const matStone = new THREE.MeshLambertMaterial({ color: 0x78716C, flatShading: true });
    const matConcrete = new THREE.MeshLambertMaterial({ color: 0xCBD5E1, flatShading: true });
    const matWood = new THREE.MeshLambertMaterial({ color: 0x8B5A2B, flatShading: true });
    const matCourtBlue = new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: true });
    const matCourtOrange = new THREE.MeshLambertMaterial({ color: 0xEA580C, flatShading: true });
    const matLine = new THREE.MeshLambertMaterial({ color: 0xE2E8F0, flatShading: true });
    const matRoofRed = new THREE.MeshLambertMaterial({ color: 0xC2410C, flatShading: true });
    const matRoofTeal = new THREE.MeshLambertMaterial({ color: 0x0F766E, flatShading: true });
    const matWater = new THREE.MeshLambertMaterial({ color: 0x38BDF8, flatShading: true });
    const matFoliage = new THREE.MeshLambertMaterial({ color: 0x2D6A4F, flatShading: true });

    // Helper para criar fundação nivelada nas encostas
    const makeTerrace = (x, z, w, d, topMat) => {
      const g = new THREE.Group();
      const yC = getElev(x, z);
      const yMin = Math.min(
        yC,
        getElev(x - w * 0.45, z - d * 0.45),
        getElev(x + w * 0.45, z - d * 0.45),
        getElev(x - w * 0.45, z + d * 0.45),
        getElev(x + w * 0.45, z + d * 0.45)
      );
      const baseH = Math.max(1.8, (yC - yMin) + 1.4);
      const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, baseH, d + 0.6), matStone);
      base.position.y = -baseH * 0.5 + 0.15;
      base.receiveShadow = true;
      base.castShadow = true;
      g.add(base);

      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), topMat || matConcrete);
      top.position.y = 0.22;
      top.receiveShadow = true;
      g.add(top);

      g.position.set(x, yC, z);
      if (this.infrastructureNodes) {
        this.infrastructureNodes.push({ x, z, r: Math.max(w, d) * 0.65 });
      }
      return g;
    };

    // 1. QUADRA DE BASQUETE DE RUA & ARQUIBANCADA DO LEVANTE (X: 142, Z: -42)
    const courtGroup = makeTerrace(142, -42, 13.0, 9.0, matCourtBlue);
    const keyL = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.27, 3.2), matCourtOrange);
    keyL.position.set(-4.6, 0.23, 0);
    const keyR = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.27, 3.2), matCourtOrange);
    keyR.position.set(4.6, 0.23, 0);
    const midLine = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 8.6), matLine);
    midLine.position.set(0, 0.23, 0);
    courtGroup.add(keyL, keyR, midLine);

    [-5.8, 5.8].forEach(hx => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 3.1, 6), matConcrete);
      pole.position.set(hx, 1.75, 0);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 1.5), matLine);
      board.position.set(hx > 0 ? hx - 0.35 : hx + 0.35, 2.9, 0);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 12), matCourtOrange);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(hx > 0 ? hx - 0.68 : hx + 0.68, 2.65, 0);
      courtGroup.add(pole, board, rim);
    });
    // Arquibancada comunitária ao norte da quadra
    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.45 * (s + 1), 0.9), matConcrete);
      step.position.set(0, 0.35 + s * 0.22, -3.2 - s * 0.85);
      courtGroup.add(step);
    }
    this.group.add(courtGroup);

    // 2. FEIRINHA ORGÂNICA & PÉRGOLA DO POENTE (X: -142, Z: -42)
    const fairGroup = makeTerrace(-142, -42, 12.0, 9.0, matConcrete);
    const stallColors = [0xE76F51, 0x2A9D8F, 0xF4A261, 0xE63946];
    for (let i = 0; i < 4; i++) {
      const sx = -3.8 + (i % 2) * 7.6;
      const sz = -2.2 + Math.floor(i / 2) * 4.4;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 1.4), matWood);
      counter.position.set(sx, 0.75, sz);
      const canopyMat = new THREE.MeshLambertMaterial({ color: stallColors[i], flatShading: true });
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.1, 0.9, 4), canopyMat);
      canopy.rotation.y = Math.PI / 4;
      canopy.position.set(sx, 2.35, sz);
      fairGroup.add(counter, canopy);
    }
    // Pérgola central de madeira
    const pergTop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 4.2), matWood);
    pergTop.position.set(0, 2.6, 0);
    fairGroup.add(pergTop);
    this.group.add(fairGroup);

    // 3. PRAÇA DO CORETO & CHAFARIZ DA SERRA (X: -32, Z: -102)
    const coretoGroup = makeTerrace(-32, -102, 11.0, 11.0, matConcrete);
    const gazeboBase = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.6, 8), matStone);
    gazeboBase.position.y = 0.55;
    const gazeboRoof = new THREE.Mesh(new THREE.ConeGeometry(4.0, 2.2, 8), matRoofRed);
    gazeboRoof.position.y = 3.5;
    coretoGroup.add(gazeboBase, gazeboRoof);
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6), matConcrete);
      col.position.set(Math.cos(ang) * 2.9, 1.8, Math.sin(ang) * 2.9);
      coretoGroup.add(col);
    }
    const fountainPool = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.45, 8), matWater);
    fountainPool.position.set(0, 0.95, 0);
    coretoGroup.add(fountainPool);
    this.group.add(coretoGroup);

    // 4. GALPÃO CULTURAL DE GRAFITE & OFICINA NORDESTE (X: 118, Z: -82)
    const galpaoGroup = makeTerrace(118, -82, 11.5, 8.5, matConcrete);
    const hallBody = new THREE.Mesh(new THREE.BoxGeometry(8.2, 3.4, 5.4), new THREE.MeshLambertMaterial({ color: 0xF59E0B, flatShading: true }));
    hallBody.position.set(-1.0, 1.95, -0.5);
    hallBody.castShadow = true;
    const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.35, 6.0), matRoofTeal);
    hallRoof.position.set(-1.0, 3.75, -0.5);
    // Painel mural colorido na fachada sul
    const muralA = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 0.15), matCourtBlue);
    muralA.position.set(-2.6, 2.0, 2.22);
    const muralB = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 0.15), matCourtOrange);
    muralB.position.set(0.4, 2.0, 2.22);
    galpaoGroup.add(hallBody, hallRoof, muralA, muralB);
    this.group.add(galpaoGroup);

    // 5. TERREIRO CULTURAL DO JONGO & POMAR NOROESTE (X: -118, Z: -82)
    const jongoGroup = makeTerrace(-118, -82, 11.0, 10.0, new THREE.MeshLambertMaterial({ color: 0xD97706, flatShading: true }));
    const rodaRing = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.9, 0.18, 12), matWood);
    rodaRing.position.y = 0.38;
    const shadePavilion = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.8, 6), matRoofTeal);
    shadePavilion.position.set(0, 3.1, -1.8);
    const planterL = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), matFoliage);
    planterL.position.set(-4.0, 1.4, -3.0);
    const planterR = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), matFoliage);
    planterR.position.set(4.0, 1.4, -3.0);
    jongoGroup.add(rodaRing, shadePavilion, planterL, planterR);
    this.group.add(jongoGroup);

    // 6. MIRANTE & QUIOSQUE PANORÂMICO DA SELA NORTE (X: 28, Z: -136)
    const miranteSela = makeTerrace(28, -136, 10.5, 8.0, matWood);
    const kioskRoof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.6, 6), matRoofRed);
    kioskRoof.position.set(0, 2.9, -1.0);
    const kioskCounter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 1.2), matStone);
    kioskCounter.position.set(0, 0.8, -1.0);
    miranteSela.add(kioskRoof, kioskCounter);
    this.group.add(miranteSela);
  }
};
