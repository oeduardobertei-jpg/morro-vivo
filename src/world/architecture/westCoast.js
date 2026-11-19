import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createStylizedFigure } from '../npcs/population.js';
import { SHARED_SHADER_UNIFORMS } from '../../render/StylizedMaterials.js';

/** Costa oeste: farol, píer, enseada dos pescadores, palmeiras e barcos. */
export const WestCoastMixin = {
  createLighthouse(pos) {
    const lhGroup = new THREE.Group();
    // Force elevation so it sits high on a rocky outcrop in the sea
    const y = 4.0;
    lhGroup.position.set(pos.x, y, pos.z);

    // Deep rock foundation plinth
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 3.6, 12.0, 8),
      new THREE.MeshLambertMaterial({ color: 0x4A4A4A, flatShading: true })
    );
    plinth.position.y = -5.8;
    lhGroup.add(plinth);

    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xF5F5F5 });
    const redMat = new THREE.MeshLambertMaterial({ color: 0xD83A3A });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xFFE066 });

    for (let t = 0; t < 5; t++) {
      const segGeo = new THREE.CylinderGeometry(1.6 - t * 0.18, 1.8 - t * 0.18, 2.2, 8);
      const segMat = (t % 2 === 0 ? whiteMat : redMat);
      const seg = new THREE.Mesh(segGeo, segMat);
      seg.position.y = 1.1 + t * 2.2;
      seg.castShadow = true;
      lhGroup.add(seg);
    }

    const lanternGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.4, 8);
    const lantern = new THREE.Mesh(lanternGeo, glassMat);
    lantern.position.y = 11.8;
    lhGroup.add(lantern);

    // Aura aditiva quente envolvendo a lanterna do farol
    const lanternHalo = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 12, 10),
      new THREE.MeshBasicMaterial({
        color: 0xFFD97D,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      })
    );
    lanternHalo.position.y = 11.8;
    lhGroup.add(lanternHalo);

    const roofGeo = new THREE.ConeGeometry(1.3, 1.2, 8);
    const roof = new THREE.Mesh(roofGeo, redMat);
    roof.position.y = 13.1;
    lhGroup.add(roof);

    const beaconLight = new THREE.PointLight(0xFFEA88, 2.5, 35);
    beaconLight.position.y = 12.0;
    lhGroup.add(beaconLight);

    // 360-degree rotating volumetric lighthouse beam (active at sunset & night)
    const beamGroup = new THREE.Group();
    beamGroup.position.set(0, 12.0, 0);

    const beamGeo = new THREE.ConeGeometry(5.6, 62.0, 20, 1, true);
    // Ponta estreita em z = 0 (lanterna) e boca aberta estendendo-se até z = +62m
    beamGeo.rotateX(-Math.PI / 2);
    beamGeo.translate(0, 0, 31.0);

    const beamMat = new THREE.ShaderMaterial({
      uniforms: {
        uNightFactor: SHARED_SHADER_UNIFORMS.uNightFactor,
        uSunsetFactor: SHARED_SHADER_UNIFORMS.uSunsetFactor
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      fog: false,
      vertexShader: `
        varying vec2 vUv;
        varying float vAxialT;
        varying vec3 vViewNormal;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vAxialT = clamp(position.z / 62.0, 0.0, 1.0);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uNightFactor;
        uniform float uSunsetFactor;
        varying vec2 vUv;
        varying float vAxialT;
        varying vec3 vViewNormal;
        varying vec3 vViewDir;
        void main() {
          // Dissolve suavemente ao longo dos 62m e nas bordas laterais via Fresnel (zero corte reto!)
          float lenFade = pow(1.0 - vAxialT, 1.25) * smoothstep(1.0, 0.60, vAxialT) * smoothstep(0.0, 0.03, vAxialT);
          float rimFade = pow(abs(dot(normalize(vViewNormal), normalize(vViewDir))), 1.35);
          float phaseOpacity = clamp(uNightFactor + uSunsetFactor * 0.50, 0.0, 1.0);
          float alpha = lenFade * rimFade * 0.58 * phaseOpacity;
          gl_FragColor = vec4(vec3(1.0, 0.92, 0.66), alpha);
        }
      `
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamGroup.add(beamMesh);
    lhGroup.add(beamGroup);
    this.lhBeamGroup = beamGroup;

    this.group.add(lhGroup);
  },

  createFishingPier(pos) {
    // Relocated to the Western Cape (x: -78, z: 74) extending into deep marine water (z: 74 to 96)
    const pierGroup = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x4A2E18, flatShading: true });
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x5C4033, flatShading: true });

    // Elevate the entire pier so it's always above water
    const pierYOffset = 1.6;

    // =========================================================================
    // CABECEIRA DE PEDRA PORTUGUESA, PÓRTICO DO CAIS & RAMPA DE ACESSO CONTÍNUA
    // Conecta perfeitamente a passarela da areia (z: 61.2, y: 0.22) ao deck elevado do píer (z: 73.2, y: 1.60)
    // =========================================================================
    const stoneAbutmentMat = new THREE.MeshLambertMaterial({ color: 0x64748B, flatShading: true });
    const stoneTrimMat = new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: true });
    const railMat = new THREE.MeshLambertMaterial({ color: 0x6F4E37, flatShading: true });

    // 1. Piso de Transição e Mureta de Pedra na Areia (z: 59.8 a 62.2)
    const abutmentBase = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.42, 2.6), stoneAbutmentMat);
    abutmentBase.position.set(pos.x, 0.14, 61.0);
    abutmentBase.receiveShadow = true;
    pierGroup.add(abutmentBase);

    const abutmentStep = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 1.8), stoneTrimMat);
    abutmentStep.position.set(pos.x, 0.24, 60.4);
    abutmentStep.receiveShadow = true;
    pierGroup.add(abutmentStep);

    // Frades de Pedra Laterais e Pórtico de Madeira na Entrada do Píer (z: 61.2)
    [-2.05, 2.05].forEach(px => {
      const stonePillar = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.95, 0.58), stoneAbutmentMat);
      stonePillar.position.set(pos.x + px, 0.48, 61.2);
      stonePillar.castShadow = true;
      pierGroup.add(stonePillar);

      const pillarCap = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.68), stoneTrimMat);
      pillarCap.position.set(pos.x + px, 0.98, 61.2);
      pierGroup.add(pillarCap);

      const archPost = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 3.1, 6), woodMat);
      archPost.position.set(pos.x + px * 0.92, 1.85, 61.2);
      archPost.castShadow = true;
      pierGroup.add(archPost);
    });

    // Viga Superior do Pórtico do Cais + Placa Náutica e 2 Lanternas Quentes
    const portalBeam = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.28, 0.28), woodMat);
    portalBeam.position.set(pos.x, 3.35, 61.2);
    portalBeam.castShadow = true;
    pierGroup.add(portalBeam);

    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.46, 0.12),
      new THREE.MeshLambertMaterial({ color: 0x1E3A8A, flatShading: true })
    );
    signBoard.position.set(pos.x, 3.12, 61.2);
    pierGroup.add(signBoard);

    const signBorder = new THREE.Mesh(
      new THREE.BoxGeometry(2.72, 0.54, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xFBBF24, flatShading: true })
    );
    signBorder.position.set(pos.x, 3.12, 61.2);
    pierGroup.add(signBorder);

    [-1.45, 1.45].forEach(lx => {
      const entryLamp = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.16, 0),
        new THREE.MeshBasicMaterial({ color: 0xFFE082 })
      );
      entryLamp.position.set(pos.x + lx, 2.92, 61.2);
      pierGroup.add(entryLamp);
    });

    // 2. Rampa de Madeira Inclinada (z: 61.2, y: 0.26 -> z: 73.2, y: 1.60)
    const rampStartZ = 61.2;
    const rampEndZ = 73.2; // Encontra exatamente o início do deck principal (pos.z - 0.8 = 73.2)
    const rampStartY = 0.26;
    const rampEndY = pierYOffset;
    const rampDz = rampEndZ - rampStartZ; // 12.0m
    const rampDy = rampEndY - rampStartY; // 1.34m
    const rampLen = Math.hypot(rampDz, rampDy);
    const rampPitch = -Math.atan2(rampDy, rampDz); // Inclinação subindo em direção a +Z

    const rampPivot = new THREE.Group();
    rampPivot.position.set(pos.x, (rampStartY + rampEndY) * 0.5, (rampStartZ + rampEndZ) * 0.5);
    rampPivot.rotation.x = rampPitch;

    const rampDeck = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.28, rampLen + 0.35), deckMat);
    rampDeck.receiveShadow = true;
    rampDeck.castShadow = true;
    rampPivot.add(rampDeck);

    // Ripas transversais antiderrapantes (cleats) ao longo da rampa de madeira
    const cleatGeo = new THREE.BoxGeometry(3.65, 0.05, 0.14);
    for (let c = -5.2; c <= 5.2; c += 0.95) {
      const cleat = new THREE.Mesh(cleatGeo, woodMat);
      cleat.position.set(0, 0.16, c);
      rampPivot.add(cleat);
    }

    // Corrimão contínuo inclinado acompanhando toda a rampa
    const rampRailGeo = new THREE.BoxGeometry(0.12, 0.08, rampLen + 0.2);
    const rampMidRailGeo = new THREE.BoxGeometry(0.08, 0.05, rampLen + 0.2);
    [-1.85, 1.85].forEach(rx => {
      const topRampRail = new THREE.Mesh(rampRailGeo, railMat);
      topRampRail.position.set(rx, 1.02, 0);
      rampPivot.add(topRampRail);

      const midRampRail = new THREE.Mesh(rampMidRailGeo, railMat);
      midRampRail.position.set(rx, 0.56, 0);
      rampPivot.add(midRampRail);
    });
    pierGroup.add(rampPivot);

    // Pilares de sustentação e balaústres verticais da rampa (da areia até a água rasa)
    for (let rp = 0; rp <= 4; rp++) {
      const t = rp / 4;
      const rz = rampStartZ + t * rampDz;
      const ry = rampStartY + t * rampDy;
      [-1.85, 1.85].forEach(rx => {
        const rPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.05, 4), railMat);
        rPost.position.set(pos.x + rx, ry + 0.52, rz);
        pierGroup.add(rPost);
      });
      if (rp > 0 && rp < 4) {
        [-1.6, 1.6].forEach(px => {
          const rPile = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.5, 6), woodMat);
          rPile.position.set(pos.x + px, ry - 2.2, rz);
          pierGroup.add(rPile);
        });
      }
    }

    // Main wooden promenade deck extending 22m out to sea (z: 73.0 to 95.0)
    const deckGeo = new THREE.BoxGeometry(4.0, 0.35, 22.0);
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(pos.x, pierYOffset, pos.z + 10.0);
    deck.receiveShadow = true;
    pierGroup.add(deck);

    // Lateral wooden handrails with posts
    for (let r = 0; r <= 6; r++) {
      const rz = pos.z + r * 3.5;
      [-1.85, 1.85].forEach(rx => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 4), railMat);
        post.position.set(pos.x + rx, pierYOffset + 0.55, rz);
        pierGroup.add(post);
      });
    }

    const topRailGeo = new THREE.BoxGeometry(0.12, 0.08, 22.0);
    [-1.85, 1.85].forEach(rx => {
      const topRail = new THREE.Mesh(topRailGeo, railMat);
      topRail.position.set(pos.x + rx, pierYOffset + 1.05, pos.z + 10.0);
      pierGroup.add(topRail);
    });

    // Deep seabed pilings driven into deep water (-12m)
    for (let p = 0; p <= 6; p++) {
      const pileGeo = new THREE.CylinderGeometry(0.22, 0.26, 14.0, 6);
      const pileZ = pos.z + p * 3.5;
      [-1.6, 1.6].forEach(px => {
        const pile = new THREE.Mesh(pileGeo, woodMat);
        pile.position.set(pos.x + px, pierYOffset - 6.5, pileZ);
        pierGroup.add(pile);
      });
    }

    // Mooring bollards along pier edges
    const bollardMat = new THREE.MeshLambertMaterial({ color: 0x1E293B, flatShading: true });
    for (let b = 0; b <= 4; b++) {
      const bz = pos.z + 3.0 + b * 4.2;
      [-1.75, 1.75].forEach(bx => {
        const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.35, 6), bollardMat);
        bollard.position.set(pos.x + bx, pierYOffset + 0.35, bz);
        pierGroup.add(bollard);
      });
    }

    // Lantern posts at the head of the pier
    const lanternPostGeo = new THREE.CylinderGeometry(0.07, 0.09, 3.2, 5);
    const lanternPost = new THREE.Mesh(lanternPostGeo, woodMat);
    lanternPost.position.set(pos.x, pierYOffset + 1.5, pos.z + 20.2);
    pierGroup.add(lanternPost);

    const lamp = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.28, 0),
      new THREE.MeshBasicMaterial({ color: 0xFFE082 })
    );
    lamp.position.set(pos.x, pierYOffset + 3.1, pos.z + 20.2);
    pierGroup.add(lamp);

    // Garante listas dinâmicas para o StaticBatcher e FastPicker
    this.mobilityDynamicGroups = this.mobilityDynamicGroups || [];
    this.mobilitySelectables = this.mobilitySelectables || [];

    // Inicializa os Cardumes Visíveis em Alto-Mar e Boias de Maricultura nos cantos da baía
    this._initFishSchools();
    this._createDeepBayMariculture();

    // Frota Progressiva de até 4 Barcos Pesqueiros Caiçaras (expande conforme a população cresce: 1 inicial, +1 em 1000, +1 em 1500, +1 em 2000!)
    // Jamais invadem a área de banho dos banhistas (respeitam estritamente o limite z >= 114 fora do canal do Píer)!
    this.expeditionBoats = [];
    if (this.currentPopulation === undefined) this.currentPopulation = 320;

    const boatConfigs = [
      {
        id: 'estrela',
        name: 'Barco Estrela do Mar',
        captainName: 'Mestre Zeca do Farol',
        routeDesc: 'Píer do Porto ↔ Cardumes de Alto-Mar (1º Barco - Inicial)',
        color: 0x0284C7,
        shirtColor: 0xF8FAFC,
        skinColor: 0x844C21,
        hairColor: 0xD1D5DB,
        hasBeard: true,
        hasVest: true,
        vestColor: 0x1E3A8A,
        x: pos.x - 3.8,
        z: pos.z + 11.5,
        dockRotY: 0.08,
        initWait: 1.2,
        speed: 5.4,
        preferredSector: 'center',
        unlockPop: 0
      },
      {
        id: 'guanabara',
        name: 'Barco Guanabara',
        captainName: 'Mestre Bento Caiçara',
        routeDesc: 'Píer do Porto ↔ Cardumes do Mar Profundo (2º Barco - 1.000 hab.)',
        color: 0x0D9488,
        shirtColor: 0xEA580C,
        skinColor: 0xB27138,
        hairColor: 0x2D1E18,
        hasMustache: true,
        hasStripe: true,
        stripeColor: 0xF8FAFC,
        x: pos.x + 4.1,
        z: pos.z + 17.8,
        dockRotY: -0.11,
        initWait: 2.6,
        speed: 5.2,
        preferredSector: 'deep',
        unlockPop: 1000
      },
      {
        id: 'vento_forte',
        name: 'Saveiro Vento Forte',
        captainName: 'Mestre Tião da Rede',
        routeDesc: 'Enseada do Poente ↔ Cardumes Oeste (3º Barco - 1.500 hab.)',
        color: 0xDC2626,
        shirtColor: 0xFACC15,
        skinColor: 0x683A18,
        hairColor: 0x1F1917,
        hasBeard: true,
        hasVest: true,
        vestColor: 0x78350F,
        x: -152.0,
        z: 114.5,
        dockRotY: 0.16,
        initWait: 2.0,
        speed: 5.3,
        preferredSector: 'west_mid',
        unlockPop: 1500
      },
      {
        id: 'sol_varzea',
        name: 'Saveiro Sol da Várzea',
        captainName: 'Mestre Dito do Levante',
        routeDesc: 'Enseada do Levante ↔ Cardumes Leste (4º Barco - 2.000 hab.)',
        color: 0xD97706,
        shirtColor: 0x10B981,
        skinColor: 0xC68642,
        hairColor: 0x9CA3AF,
        hasBeard: true,
        hasStripe: true,
        stripeColor: 0xFEF08A,
        x: 158.0,
        z: 114.5,
        dockRotY: -0.14,
        initWait: 2.4,
        speed: 5.5,
        preferredSector: 'east_mid',
        unlockPop: 2000
      }
    ];

    const whiteStripeMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true });
    const wakeFoamMat = new THREE.MeshLambertMaterial({
      color: 0xE0F2FE,
      transparent: true,
      opacity: 0.65
    });

    boatConfigs.forEach((bd, idx) => {
      const boatGroup = new THREE.Group();

      // Casco naval arredondado estilo Trainera/Saveiro Caiçara (sem aspecto de caixote!)
      const hullGeo = new RoundedBoxGeometry(1.78, 0.68, 4.4, 3, 0.24);
      const hullMat = new THREE.MeshLambertMaterial({ color: bd.color, flatShading: false });
      const hull = new THREE.Mesh(hullGeo, hullMat);
      hull.position.y = 0.22;
      hull.castShadow = true;
      boatGroup.add(hull);

      // Quilha inferior escura (linha d'água naval) e friso branco curvo
      const keelMat = new THREE.MeshLambertMaterial({ color: 0x1E293B, flatShading: false });
      const keel = new THREE.Mesh(new RoundedBoxGeometry(1.62, 0.22, 4.25, 2, 0.08), keelMat);
      keel.position.y = 0.04;
      boatGroup.add(keel);

      const stripe = new THREE.Mesh(new RoundedBoxGeometry(1.84, 0.11, 4.32, 2, 0.04), whiteStripeMat);
      stripe.position.y = 0.45;
      boatGroup.add(stripe);

      // Proa curva hidrodinâmica (12 segmentos suaves) + roda de proa em madeira
      const bowGeo = new THREE.ConeGeometry(0.89, 1.45, 12);
      bowGeo.rotateX(Math.PI / 2);
      bowGeo.scale(1.0, 0.76, 1.0);
      const bow = new THREE.Mesh(bowGeo, hullMat);
      bow.position.set(0, 0.24, 2.68);
      boatGroup.add(bow);

      const stemPost = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.48, 0.16, 2, 0.04), woodMat);
      stemPost.position.set(0, 0.56, 3.12);
      stemPost.rotation.x = 0.28;
      boatGroup.add(stemPost);

      // Convés interno de tábuas de madeira e bancos arredondados
      const deckMesh = new THREE.Mesh(new RoundedBoxGeometry(1.56, 0.08, 3.95, 2, 0.03), woodMat);
      deckMesh.position.y = 0.36;
      boatGroup.add(deckMesh);

      const benchGeo = new RoundedBoxGeometry(1.52, 0.10, 0.46, 2, 0.03);
      const benchFront = new THREE.Mesh(benchGeo, woodMat);
      benchFront.position.set(0, 0.46, 0.65);
      boatGroup.add(benchFront);

      const benchBack = new THREE.Mesh(benchGeo, woodMat);
      benchBack.position.set(0, 0.46, -0.85);
      boatGroup.add(benchBack);

      // Mastro curto caiçara com lanterna náutica e boia salva-vidas laranja na amurada
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 2.05, 8), woodMat);
      mast.position.set(0, 1.32, 1.05);
      boatGroup.add(mast);

      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xFEF08A })
      );
      lantern.position.set(0, 2.38, 1.05);
      boatGroup.add(lantern);

      const lifeRingGeo = new THREE.TorusGeometry(0.20, 0.055, 8, 14);
      lifeRingGeo.rotateY(Math.PI / 2);
      const lifeRing = new THREE.Mesh(
        lifeRingGeo,
        new THREE.MeshLambertMaterial({ color: 0xF97316, flatShading: false })
      );
      lifeRing.position.set(0.92, 0.44, 0.35);
      boatGroup.add(lifeRing);

      // Rede recolhida na proa
      const netGeo = new THREE.IcosahedronGeometry(0.38, 1);
      const netMat = new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: false });
      const netMeshInBoat = new THREE.Mesh(netGeo, netMat);
      netMeshInBoat.scale.set(1.1, 0.65, 1.2);
      netMeshInBoat.position.set(0.32, 0.48, 1.42);
      boatGroup.add(netMeshInBoat);

      // Caixa de Pescado no centro do barco (enche de peixes prateados após pescar o cardume!)
      const crateMesh = new THREE.Mesh(
        new RoundedBoxGeometry(0.95, 0.28, 0.85, 2, 0.04),
        woodMat
      );
      crateMesh.position.set(0, 0.44, -0.10);
      boatGroup.add(crateMesh);

      const catchGroup = new THREE.Group();
      catchGroup.position.set(0, 0.56, -0.10);
      for (let f = 0; f < 6; f++) {
        const caughtFish = new THREE.Mesh(this.sharedFishGeo, this.sharedFishMat);
        caughtFish.position.set((f % 2 === 0 ? -0.18 : 0.18), 0.03 * (f % 3), -0.22 + (f * 0.08));
        caughtFish.rotation.y = f * 0.9;
        catchGroup.add(caughtFish);
      }
      catchGroup.visible = false;
      boatGroup.add(catchGroup);

      // Esteira de espuma (Wake) em V atrás da popa quando navegando
      const wakeGroup = new THREE.Group();
      const wakeBladeGeo = new THREE.BoxGeometry(0.22, 0.03, 2.8);
      const wakeL = new THREE.Mesh(wakeBladeGeo, wakeFoamMat);
      wakeL.position.set(-0.65, 0.02, -3.4);
      wakeL.rotation.y = 0.22;
      wakeGroup.add(wakeL);

      const wakeR = new THREE.Mesh(wakeBladeGeo, wakeFoamMat);
      wakeR.position.set(0.65, 0.02, -3.4);
      wakeR.rotation.y = -0.22;
      wakeGroup.add(wakeR);
      wakeGroup.visible = false;
      boatGroup.add(wakeGroup);

      // Mestre Pescador Caiçara na popa com anatomia esculpida Claude Opus, chapéu de palha e leme animado
      const fisherFig = createStylizedFigure({
        skinColor: bd.skinColor || 0x844C21,
        shirtColor: bd.shirtColor,
        pantsColor: 0x1E3A8A,
        shoeColor: 0x3F2A1D,
        hairColor: bd.hairColor || 0x1F1917,
        hatType: 'straw',
        hasBeard: !!bd.hasBeard,
        hasMustache: !!bd.hasMustache,
        hasVest: !!bd.hasVest,
        vestColor: bd.vestColor || 0x78350F,
        hasStripe: !!bd.hasStripe,
        stripeColor: bd.stripeColor || 0xF8FAFC,
        wearsShorts: true
      });
      const fishermanGroup = fisherFig.group;
      fishermanGroup.position.set(0, 0.28, -0.85);
      if (fisherFig.rightArm) fisherFig.rightArm.rotation.x = -0.55;
      if (fisherFig.leftArm) fisherFig.leftArm.rotation.x = -0.25;
      const fisherTorso = fisherFig.torso;

      const tiller = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 2.5, 8),
        woodMat
      );
      tiller.rotation.x = Math.PI / 4;
      tiller.position.set(0.28, 0.42, -0.75);
      fishermanGroup.add(tiller);

      boatGroup.add(fishermanGroup);
      boatGroup.position.set(bd.x, 0.05, bd.z);
      boatGroup.rotation.y = bd.dockRotY || 0;

      // Rede circular de cerco com boias de cortiça laranja (lançada sobre o cardume!)
      const netGroup = new THREE.Group();
      const netRingGeo = new THREE.TorusGeometry(2.6, 0.08, 6, 20);
      netRingGeo.rotateX(Math.PI / 2);
      const netRing = new THREE.Mesh(
        netRingGeo,
        new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true })
      );
      netGroup.add(netRing);

      const corkMat = new THREE.MeshLambertMaterial({ color: 0xF97316 });
      for (let c = 0; c < 10; c++) {
        const cAngle = (c / 10) * Math.PI * 2;
        const cork = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), corkMat);
        cork.position.set(Math.cos(cAngle) * 2.6, 0.04, Math.sin(cAngle) * 2.6);
        netGroup.add(cork);
      }

      const seaNetInterior = new THREE.Mesh(
        new THREE.CircleGeometry(2.5, 16),
        new THREE.MeshLambertMaterial({ color: 0x0EA5E9, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
      );
      seaNetInterior.rotation.x = -Math.PI / 2;
      seaNetInterior.position.y = -0.01;
      netGroup.add(seaNetInterior);

      netGroup.position.set(bd.x, 0.08, bd.z + 10);
      netGroup.visible = false;
      this.group.add(netGroup);

      const boatObj = {
        id: bd.id,
        name: bd.name,
        captainName: bd.captainName,
        type: 'fishingBoat',
        routeDesc: bd.routeDesc,
        preferredSector: bd.preferredSector || 'center',
        group: boatGroup,
        netMesh: netGroup,
        catchGroup,
        wakeGroup,
        fisherTorso,
        tiller,
        dockPos: new THREE.Vector3(bd.x, 0.05, bd.z),
        targetPos: new THREE.Vector3(bd.x, 0.05, bd.z + 35),
        currentPos: new THREE.Vector3(bd.x, 0.05, bd.z),
        targetSchool: null,
        heading: 0,
        currentSpeed: 0,
        state: 'DOCKED',
        timer: 0,
        waitDuration: bd.initWait,
        speed: bd.speed,
        baseY: 0.05,
        phase: idx * 1.4,
        totalCatches: 1 + idx,
        unlockPop: bd.unlockPop || 0,
        dockRotY: bd.dockRotY || 0
      };
      const isInitiallyUnlocked = (this.currentPopulation || 320) >= (bd.unlockPop || 0);
      boatGroup.visible = isInitiallyUnlocked;

      boatGroup.traverse(c => {
        if (c.isMesh) c.userData.mobilityRef = boatObj;
      });

      this.expeditionBoats.push(boatObj);
      this.mobilitySelectables.push(boatObj);
      this.mobilityDynamicGroups.push(boatGroup);
      this.mobilityDynamicGroups.push(netGroup);
      this.group.add(boatGroup);
    });

    // 4 Floating Mooring Buoys (Boias de Sinalização e Pesca)
    const buoyColors = [0xE63946, 0xFFFFFF, 0xF4A261, 0xE63946];
    for (let i = 0; i < 4; i++) {
      const buoyGroup = new THREE.Group();
      const bGeo = new THREE.SphereGeometry(0.38, 8, 8);
      const bMat = new THREE.MeshLambertMaterial({ color: buoyColors[i], flatShading: true });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      buoyGroup.add(bMesh);

      const flagRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.7, 4),
        new THREE.MeshLambertMaterial({ color: 0x111111 })
      );
      flagRod.position.y = 0.4;
      buoyGroup.add(flagRod);

      const bx = pos.x + (i % 2 === 0 ? -5.5 : 5.5);
      const bz = pos.z + 6.0 + i * 4.5;
      buoyGroup.position.set(bx, 0.22, bz);
      pierGroup.add(buoyGroup);
      this.boats.push({ group: buoyGroup, baseY: 0.22, phase: i * 0.95 });
      this.mobilityDynamicGroups.push(buoyGroup);
    }

    this.group.add(pierGroup);
  },

  resetBoatsForNewWorld(pop = 320) {
    this.currentPopulation = pop;
    if (!this.expeditionBoats) return;
    this.expeditionBoats.forEach(boat => {
      const isUnlocked = pop >= (boat.unlockPop || 0);
      boat.group.visible = isUnlocked;
      if (boat.netMesh) boat.netMesh.visible = false;
      if (boat.wakeGroup) boat.wakeGroup.visible = false;
      if (boat.catchGroup) boat.catchGroup.visible = false;
      if (boat.targetSchool) boat.targetSchool.claimedBy = null;
      boat.targetSchool = null;
      boat.state = 'DOCKED';
      boat.timer = 0;
      boat.currentSpeed = 0;
      boat.heading = boat.dockRotY || 0;
      boat.currentPos.copy(boat.dockPos);
      boat.group.position.copy(boat.dockPos);
      boat.group.rotation.set(0, boat.dockRotY || 0, 0);
    });
  },

  // 1. PRAINHA DOS PESCADORES (Extremo Oeste: X = -140 a -75)
  // Enseada caiçara autêntica com canoas de madeira, redes secando, varal de peixes e posto de pesca do Seu Zé
  createWestFishingCove() {
    const westCoveGroup = new THREE.Group();

    const woodDarkMat = new THREE.MeshLambertMaterial({ color: 0x45220C, flatShading: true });
    const woodWeatheredMat = new THREE.MeshLambertMaterial({ color: 0x6B5B4D, flatShading: true });
    const boatBlueMat = new THREE.MeshLambertMaterial({ color: 0x1D4ED8, flatShading: true });
    const boatRedMat = new THREE.MeshLambertMaterial({ color: 0xB91C1C, flatShading: true });
    const boatWhiteMat = new THREE.MeshLambertMaterial({ color: 0xF1F5F9, flatShading: true });
    const netMeshMat = new THREE.MeshLambertMaterial({ color: 0xA39171, wireframe: true });
    const corkMat = new THREE.MeshLambertMaterial({ color: 0xD97706, flatShading: true });
    const fishMat = new THREE.MeshLambertMaterial({ color: 0xCBD5E1, flatShading: true });
    const ropeMat = new THREE.MeshLambertMaterial({ color: 0xD4B886 });

    // Helper: Constrói uma canoa de pesca artesanal tradicional caiçara (Zero Z-Fighting!)
    const buildCanoe = (x, z, rotY, rotZ, hullColor) => {
      const canoeGroup = new THREE.Group();
      const cy = this.terrain ? this.terrain.getElevation(x, z) : 0.35;
      canoeGroup.position.set(x, cy + 0.32, z);
      canoeGroup.rotation.y = rotY;
      canoeGroup.rotation.z = rotZ;

      // 1. Fundo do casco arredondado
      const hullBottom = new THREE.Mesh(new RoundedBoxGeometry(1.24, 0.14, 4.4, 2, 0.05), hullColor);
      hullBottom.position.y = 0.07;
      canoeGroup.add(hullBottom);

      // 2. Bordas laterais vazadas arredondadas (bordas da canoa)
      const gunwaleL = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.38, 4.4, 2, 0.05), hullColor);
      gunwaleL.position.set(-0.62, 0.25, 0);
      canoeGroup.add(gunwaleL);

      const gunwaleR = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.38, 4.4, 2, 0.05), hullColor);
      gunwaleR.position.set(0.62, 0.25, 0);
      canoeGroup.add(gunwaleR);

      // 3. Faixa decorativa externa branca (Offset radial estrito = Zero Z-Fighting!)
      const stripeL = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.10, 4.38, 1, 0.015), boatWhiteMat);
      stripeL.position.set(-0.70, 0.31, 0);
      canoeGroup.add(stripeL);

      const stripeR = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.10, 4.38, 1, 0.015), boatWhiteMat);
      stripeR.position.set(0.70, 0.31, 0);
      canoeGroup.add(stripeR);

      // 4. Bico de proa curva e popa tradicional levantada
      const bowGeo = new THREE.ConeGeometry(0.68, 1.25, 12);
      bowGeo.rotateX(Math.PI / 2);
      bowGeo.scale(1.0, 0.65, 1.0);
      const bow = new THREE.Mesh(bowGeo, hullColor);
      bow.position.set(0, 0.24, 2.65);
      canoeGroup.add(bow);

      const stern = new THREE.Mesh(bowGeo, hullColor);
      stern.position.set(0, 0.24, -2.65);
      stern.rotation.y = Math.PI;
      canoeGroup.add(stern);

      // 5. Bancos internos de madeira encaixados na cavidade
      [-1.2, 0, 1.2].forEach(bz => {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, 0.38), woodDarkMat);
        bench.position.set(0, 0.22, bz);
        canoeGroup.add(bench);
      });

      // 6. Dois remos apoiados
      [-0.35, 0.35].forEach((rx, idx) => {
        const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 4), woodWeatheredMat);
        oar.position.set(rx, 0.34, 0.2);
        oar.rotation.set(-0.25, 0.1 * (idx === 0 ? 1 : -1), 0.35 * (idx === 0 ? 1 : -1));
        canoeGroup.add(oar);
      });

      // 7. Estaca fincada na areia com corda de amarração
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.1, 5), woodDarkMat);
      stake.position.set(0, -0.2, 3.4);
      canoeGroup.add(stake);

      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 3), ropeMat);
      rope.position.set(0, 0.05, 3.0);
      rope.rotation.x = Math.PI / 3;
      canoeGroup.add(rope);

      return canoeGroup;
    };

    // 1. Canoa Azul & Branca (Poente Extremo)
    westCoveGroup.add(buildCanoe(-116, 50, 0.25, 0.08, boatBlueMat));

    // 2. Canoa Vermelha & Branca (Enseada do Píer - Fora da passarela z=56!)
    westCoveGroup.add(buildCanoe(-93, 52, -0.35, -0.06, boatRedMat));

    // 3. Grande Rede de Pesca Estendida na Areia Secando (Elevada com folga sobre o relevo)
    const netY = this.terrain ? this.terrain.getElevation(-104, 46) : 0.35;
    const netMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 4.5, 6, 4), netMeshMat);
    netMesh.position.set(-104, netY + 0.08, 46);
    netMesh.rotation.x = -Math.PI / 2;
    westCoveGroup.add(netMesh);

    // Bóias de cortiça ao longo da borda da rede
    for (let c = 0; c < 8; c++) {
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 6), corkMat);
      cork.rotation.z = Math.PI / 2;
      cork.position.set(-107 + c * 0.85, netY + 0.10, 43.8 + (Math.sin(c) * 0.3));
      westCoveGroup.add(cork);
    }

    // 4. Varal de Salga de Pescado
    const rackY = this.terrain ? this.terrain.getElevation(-98, 42) : 0.4;
    const rackGroup = new THREE.Group();
    rackGroup.position.set(-98, rackY, 42);

    [-1.8, 1.8].forEach(px => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.8, 5), woodDarkMat);
      post.position.set(px, 0.9, 0);
      rackGroup.add(post);
    });

    const crossbeam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.8, 5), woodDarkMat);
    crossbeam.rotation.z = Math.PI / 2;
    crossbeam.position.set(0, 1.7, 0);
    rackGroup.add(crossbeam);

    // Peixes pendurados secando ao sol
    for (let f = 0; f < 5; f++) {
      const fish = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 4), fishMat);
      fish.position.set(-1.4 + f * 0.7, 1.45, 0);
      fish.rotation.z = Math.PI;
      rackGroup.add(fish);
    }
    westCoveGroup.add(rackGroup);

    // 5. Posto de Pesca do Seu Zé no Píer (-78, z: 92)
    const pierY = 1.6;
    const pierPostGroup = new THREE.Group();
    pierPostGroup.position.set(-77.8, pierY + 0.18, 92.5);

    // Caixote de madeira onde Seu Zé senta
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.65), woodWeatheredMat);
    crate.position.set(0, 0.22, 0);
    pierPostGroup.add(crate);

    // Balde metálico de iscas
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.35, 6), new THREE.MeshLambertMaterial({ color: 0x94A3B8 }));
    bucket.position.set(0.65, 0.18, 0.1);
    pierPostGroup.add(bucket);

    // Vara de bambu de pesca estendida sobre a água
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 3.8, 4), new THREE.MeshLambertMaterial({ color: 0xD97706 }));
    rod.position.set(-0.2, 0.9, 1.6);
    rod.rotation.set(Math.PI / 4, 0.1, -0.15);
    pierPostGroup.add(rod);

    // Linha de pesca descendo até o mar
    const lineMat = new THREE.LineBasicMaterial({ color: 0xE2E8F0, transparent: true, opacity: 0.6 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.2, 2.2, 3.2),
      new THREE.Vector3(-0.2, -1.0, 3.5)
    ]);
    const fLine = new THREE.Line(lineGeo, lineMat);
    pierPostGroup.add(fLine);

    westCoveGroup.add(pierPostGroup);

    // 6. Piscinas Naturais e Granitos Costeiros (Posicionados no Costão Poente, longe da passarela e da rampa do píer!)
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x52525B, flatShading: true });
    const rocks = [
      { x: -130, z: 52, s: 2.2 },
      { x: -124, z: 58, s: 1.8 },
      { x: -112, z: 62, s: 2.4 },
      { x: -101, z: 65, s: 1.9 },
      { x: -91,  z: 68, s: 2.0 }
    ];
    this.propObstacles = this.propObstacles || [];
    rocks.forEach(rk => {
      const ry = this.terrain ? this.terrain.getElevation(rk.x, rk.z) : 0.2;
      const rockMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(rk.s, 0), rockMat);
      rockMesh.position.set(rk.x, ry + rk.s * 0.25, rk.z);
      rockMesh.rotation.set(0.3, 0.5, 0.2);
      westCoveGroup.add(rockMesh);
      this.propObstacles.push({ x: rk.x, z: rk.z, r: rk.s + 0.75 });
    });

    // Registra também o Farol, Canoas, Varal e Pilares do Píer como obstáculos físicos para os NPCs desviarem
    this.propObstacles.push(
      { x: -95, z: 50, r: 3.6 },   // Base de pedra do Farol da Barra
      { x: -116, z: 50, r: 2.5 },  // Canoa Azul & Branca
      { x: -93, z: 52, r: 2.5 },   // Canoa Vermelha & Branca
      { x: -98, z: 42, r: 2.2 }    // Varal de Salga
    );

    westCoveGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    this.group.add(westCoveGroup);
  },

  // 6. VILA DOS PESCADORES DO POENTE (Cais Seco, Bote de Madeira, Redes e Armazém)
  createWestPioneerCove(pos = { x: -95, z: 0 }) {
    const coveGroup = new THREE.Group();
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 3.6;
    coveGroup.position.set(pos.x, y, pos.z);

    // Stone terrace foundation (arenito quente carioca + anel de madeira integrado ao relevo)
    const terrace = new THREE.Mesh(
      new THREE.CylinderGeometry(6.4, 7.4, 2.0, 14),
      new THREE.MeshLambertMaterial({ color: 0x9C8F7C, flatShading: true })
    );
    terrace.position.y = -0.82;
    terrace.receiveShadow = true;
    coveGroup.add(terrace);

    const woodRim = new THREE.Mesh(
      new THREE.CylinderGeometry(6.15, 6.25, 0.14, 14),
      new THREE.MeshLambertMaterial({ color: 0x82654A, flatShading: true })
    );
    woodRim.position.y = 0.18;
    woodRim.receiveShadow = true;
    coveGroup.add(woodRim);

    // Wooden boat dry-dock stanchions & rails
    const timberMat = new THREE.MeshLambertMaterial({ color: 0x5C4033, flatShading: true });
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 5.5), timberMat);
    rail1.position.set(-0.6, 0.15, 0);
    coveGroup.add(rail1);
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 5.5), timberMat);
    rail2.position.set(0.6, 0.15, 0);
    coveGroup.add(rail2);

    // Traditional Caiçara fishing rowboat resting on slipway (rounded hull + curved prow)
    const boatGroup = new THREE.Group();
    const hullMat = new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: false });
    const boatHull = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.68, 3.7, 3, 0.22), hullMat);
    boatHull.position.y = 0.45;
    boatHull.castShadow = true;
    boatGroup.add(boatHull);

    const slipBowGeo = new THREE.ConeGeometry(0.80, 1.15, 12);
    slipBowGeo.rotateX(Math.PI / 2);
    slipBowGeo.scale(1.0, 0.72, 1.0);
    const slipBow = new THREE.Mesh(slipBowGeo, hullMat);
    slipBow.position.set(0, 0.46, 2.25);
    boatGroup.add(slipBow);

    const gunwaleMat = new THREE.MeshLambertMaterial({ color: 0x78350F, flatShading: false });
    const gunwale = new THREE.Mesh(new RoundedBoxGeometry(1.68, 0.12, 3.8, 2, 0.04), gunwaleMat);
    gunwale.position.y = 0.80;
    boatGroup.add(gunwale);

    // Wooden oars
    const oarMat = new THREE.MeshLambertMaterial({ color: 0xD97706 });
    const oar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), oarMat);
    oar1.rotation.z = 0.6;
    oar1.position.set(-0.9, 0.8, 0.2);
    boatGroup.add(oar1);
    const oar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), oarMat);
    oar2.rotation.z = -0.6;
    oar2.position.set(0.9, 0.8, -0.2);
    boatGroup.add(oar2);

    boatGroup.position.set(0, 0, -0.4);
    coveGroup.add(boatGroup);

    // Fish drying racks (Varal de Secagem de Peixe)
    for (let r = 0; r < 2; r++) {
      const rack = new THREE.Group();
      const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 4), timberMat);
      pL.position.set(-1.4, 0.9, 0);
      rack.add(pL);
      const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 4), timberMat);
      pR.position.set(1.4, 0.9, 0);
      rack.add(pR);
      const pole = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.06, 0.06), timberMat);
      pole.position.set(0, 1.6, 0);
      rack.add(pole);

      // Hanging dried fish
      const fishMat = new THREE.MeshLambertMaterial({ color: 0xE2E8F0, flatShading: true });
      for (let f = -1.0; f <= 1.0; f += 0.38) {
        const fish = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), fishMat);
        fish.rotation.x = Math.PI;
        fish.position.set(f, 1.35, 0);
        rack.add(fish);
      }
      rack.position.set(3.2, 0, -1.5 + r * 2.8);
      coveGroup.add(rack);
    }

    // Wooden crates & fish barrels
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x92400E });
    for (let b = 0; b < 4; b++) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.75, 7), barrelMat);
      barrel.position.set(-3.0 + (b % 2) * 0.7, 0.38, -1.5 + Math.floor(b / 2) * 0.7);
      barrel.castShadow = true;
      coveGroup.add(barrel);
    }

    // Leaning anchor monument on a rock
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x64748B, flatShading: true });
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), rockMat);
    boulder.position.set(-3.2, 0.5, 2.0);
    coveGroup.add(boulder);

    const anchorMat = new THREE.MeshLambertMaterial({ color: 0x1E293B });
    const anchorShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 5), anchorMat);
    anchorShaft.rotation.z = 0.45;
    anchorShaft.position.set(-3.1, 0.8, 2.1);
    coveGroup.add(anchorShaft);

    this.group.add(coveGroup);
  },

  // 5. COQUEIROS INCLINADOS COM ANIMAÇÃO DE MARESIA (Leaning Beach Palms)
  createBeachPalms() {
    this.beachPalms = [];
    // Coqueirais naturais agrupados em pequenos bosquetes costeiros (em vez de árvores isoladas equidistantes)
    const palmLocations = [
      { x: -274, z: 31, lean: 0.38, rotY: 0.25 },
      { x: -268, z: 36, lean: 0.30, rotY: -0.45 },
      { x: -206, z: 30, lean: 0.40, rotY: 0.15 },
      { x: -199, z: 35, lean: 0.32, rotY: -0.35 },
      { x: -146, z: 31, lean: 0.36, rotY: 0.28 },
      { x: -139, z: 36, lean: 0.41, rotY: -0.22 },
      { x: -96,  z: 32, lean: 0.36, rotY: 0.3 },
      { x: -65,  z: 36, lean: 0.42, rotY: -0.2 },
      { x: -32,  z: 32, lean: 0.32, rotY: 0.1 },
      { x: 2,    z: 35, lean: 0.38, rotY: 0.4 },
      { x: 34,   z: 33, lean: 0.34, rotY: -0.3 },
      { x: 76,   z: 36, lean: 0.40, rotY: 0.2 },
      { x: 100,  z: 32, lean: 0.35, rotY: -0.1 },
      { x: 142,  z: 31, lean: 0.37, rotY: 0.25 },
      { x: 149,  z: 36, lean: 0.31, rotY: -0.40 },
      { x: 202,  z: 30, lean: 0.40, rotY: 0.18 },
      { x: 209,  z: 35, lean: 0.33, rotY: -0.28 },
      { x: 256,  z: 32, lean: 0.36, rotY: -0.22 },
      { x: 263,  z: 37, lean: 0.39, rotY: 0.32 }
    ];

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x795548, flatShading: true });
    const frondMat = new THREE.MeshLambertMaterial({ color: 0x2E7D32, flatShading: true, side: THREE.DoubleSide });
    const cocoMat = new THREE.MeshLambertMaterial({ color: 0x4E342E, flatShading: true });

    palmLocations.forEach((loc, idx) => {
      const y = this.terrain ? this.terrain.getElevation(loc.x, loc.z) : 0.65;
      const palmGroup = new THREE.Group();
      palmGroup.position.set(loc.x, y, loc.z);
      palmGroup.rotation.y = loc.rotY;

      let curY = 0;
      let curZ = 0;
      const segments = 5;
      const fronds = [];

      for (let s = 0; s < segments; s++) {
        const segHeight = 1.4;
        const radB = 0.40 * (1 - s * 0.07);
        const radT = 0.36 * (1 - (s + 1) * 0.07);
        const segMesh = new THREE.Mesh(new THREE.CylinderGeometry(radT, radB, segHeight, 5), trunkMat);
        segMesh.position.set(0, curY + segHeight / 2, curZ);
        // Progressive sea lean towards +Z
        segMesh.rotation.x = loc.lean * (s * 0.22);
        palmGroup.add(segMesh);

        curY += segHeight * Math.cos(loc.lean * 0.5);
        curZ += segHeight * Math.sin(loc.lean * 0.5) * 0.6;
      }

      // Broad coconut palm crown fronds
      const crown = new THREE.Group();
      crown.position.set(0, curY, curZ);

      for (let f = 0; f < 6; f++) {
        const angle = (f / 6) * Math.PI * 2;
        const frondGeo = new THREE.ConeGeometry(0.75, 4.6, 4);
        frondGeo.translate(0, 2.3, 0);
        frondGeo.rotateX(Math.PI / 2.5);

        const frond = new THREE.Mesh(frondGeo, frondMat);
        frond.rotation.y = angle;
        crown.add(frond);
        fronds.push(frond);
      }

      // Bunch of green coconuts
      for (let c = 0; c < 4; c++) {
        const coco = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), cocoMat);
        coco.position.set((Math.random() - 0.5) * 0.3, -0.15, (Math.random() - 0.5) * 0.3);
        crown.add(coco);
      }

      palmGroup.add(crown);
      this.group.add(palmGroup);

      this.beachPalms.push({
        group: palmGroup,
        crown,
        fronds,
        phase: idx * 1.1,
        position: new THREE.Vector3(loc.x, y, loc.z)
      });
    });
  },

  // =========================================================================
  // CARDUMES DE PEIXES VISÍVEIS, MARICULTURA & EXPEDIÇÕES PESQUEIRAS AUTÔNOMAS
  // =========================================================================
  _getDeepSeaZones() {
    // 11 amplos setores oceânicos distribuídos do Extremo Oeste (-265) ao Extremo Leste (+265) e em alto-mar profundo (z: 120..228)
    // Todos respeitam estritamente a margem de segurança dos banhistas (z >= 118)!
    return [
      { sector: 'west_extreme', minX: -265, maxX: -210, minZ: 122, maxZ: 168 },
      { sector: 'west_extreme', minX: -255, maxX: -185, minZ: 172, maxZ: 222 },
      { sector: 'west_far',     minX: -202, maxX: -142, minZ: 122, maxZ: 170 },
      { sector: 'west_mid',     minX: -138, maxX: -82,  minZ: 124, maxZ: 174 },
      { sector: 'deep',         minX: -125, maxX: -45,  minZ: 176, maxZ: 226 },
      { sector: 'center',       minX: -52,  maxX: 18,   minZ: 126, maxZ: 172 },
      { sector: 'deep',         minX: -18,  maxX: 65,   minZ: 178, maxZ: 228 },
      { sector: 'east_mid',     minX: 22,   maxX: 88,   minZ: 124, maxZ: 172 },
      { sector: 'east_far',     minX: 92,   maxX: 158,  minZ: 122, maxZ: 170 },
      { sector: 'east_extreme', minX: 145,  maxX: 215,  minZ: 172, maxZ: 224 },
      { sector: 'east_extreme', minX: 162,  maxX: 265,  minZ: 122, maxZ: 172 }
    ];
  },

  _pickRandomSeaPoint(excludeIndex = -1) {
    const zones = this._getDeepSeaZones();

    for (let attempt = 0; attempt < 22; attempt++) {
      const zoneIdx = (excludeIndex >= 0 ? excludeIndex + attempt * 3 : Math.floor(Math.random() * zones.length)) % zones.length;
      const zone = zones[zoneIdx];
      const rx = zone.minX + Math.random() * (zone.maxX - zone.minX);
      const rz = zone.minZ + Math.random() * (zone.maxZ - zone.minZ);

      let tooClose = false;
      if (this.fishSchools) {
        for (let i = 0; i < this.fishSchools.length; i++) {
          if (i === excludeIndex) continue;
          const other = this.fishSchools[i];
          // Espaçamento amplo de no mínimo 42m entre cardumes para nunca ficarem amontoados
          if (other && other.state !== 'DEPLETED' && Math.hypot(other.pos.x - rx, other.pos.z - rz) < 42.0) {
            tooClose = true;
            break;
          }
        }
      }
      if (!tooClose) return new THREE.Vector3(rx, 0.05, rz);
    }
    return new THREE.Vector3(-240 + Math.random() * 480, 0.05, 125 + Math.random() * 95);
  },

  _initFishSchools() {
    this.fishSchools = [];
    this.mobilityDynamicGroups = this.mobilityDynamicGroups || [];

    // Paletas de espécies marinhas compartilhadas (Zero duplicação de materiais/geometrias na GPU!)
    const speciesPalettes = [
      {
        name: 'Sardinhas Prateadas',
        primaryMat: new THREE.MeshLambertMaterial({ color: 0xE2E8F0, flatShading: true }),
        accentMat: new THREE.MeshLambertMaterial({ color: 0x38BDF8, flatShading: true }),
        finMat: new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: true }),
        glowMat: new THREE.MeshLambertMaterial({ color: 0x06B6D4, transparent: true, opacity: 0.30 }),
        shadowMat: new THREE.MeshLambertMaterial({ color: 0x0369A1, transparent: true, opacity: 0.24 })
      },
      {
        name: 'Dourados do Mar',
        primaryMat: new THREE.MeshLambertMaterial({ color: 0xFACC15, flatShading: true }),
        accentMat: new THREE.MeshLambertMaterial({ color: 0x10B981, flatShading: true }),
        finMat: new THREE.MeshLambertMaterial({ color: 0xF59E0B, flatShading: true }),
        glowMat: new THREE.MeshLambertMaterial({ color: 0x14B8A6, transparent: true, opacity: 0.28 }),
        shadowMat: new THREE.MeshLambertMaterial({ color: 0x0F766E, transparent: true, opacity: 0.24 })
      },
      {
        name: 'Anchovas Azuis',
        primaryMat: new THREE.MeshLambertMaterial({ color: 0x93C5FD, flatShading: true }),
        accentMat: new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true }),
        finMat: new THREE.MeshLambertMaterial({ color: 0x3B82F6, flatShading: true }),
        glowMat: new THREE.MeshLambertMaterial({ color: 0x0EA5E9, transparent: true, opacity: 0.30 }),
        shadowMat: new THREE.MeshLambertMaterial({ color: 0x1E3A8A, transparent: true, opacity: 0.24 })
      }
    ];

    const rippleMat = new THREE.MeshLambertMaterial({
      color: 0xE0F2FE,
      transparent: true,
      opacity: 0.62
    });
    const splashMat = new THREE.MeshBasicMaterial({
      color: 0xF8FAFC,
      transparent: true,
      opacity: 0.72
    });
    const birdWhiteMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true });
    const birdWingTipMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const birdBeakMat = new THREE.MeshLambertMaterial({ color: 0xF59E0B, flatShading: true });

    // Geometria anatômica low-poly otimizada dos peixes (focinho + dorso + nadadeira dorsal + cauda bifurcada)
    const fishBodyGeo = new THREE.ConeGeometry(0.15, 0.56, 5);
    fishBodyGeo.rotateX(Math.PI / 2);
    const fishSnoutGeo = new THREE.ConeGeometry(0.15, 0.22, 5);
    fishSnoutGeo.rotateX(-Math.PI / 2);
    const fishDorsalGeo = new THREE.BoxGeometry(0.03, 0.14, 0.20);
    const fishTailGeo = new THREE.ConeGeometry(0.13, 0.26, 3);
    fishTailGeo.rotateX(-Math.PI / 2);

    const rippleInnerGeo = new THREE.TorusGeometry(1.45, 0.045, 6, 18);
    rippleInnerGeo.rotateX(Math.PI / 2);
    const rippleMidGeo = new THREE.TorusGeometry(2.35, 0.040, 6, 20);
    rippleMidGeo.rotateX(Math.PI / 2);
    const rippleOuterGeo = new THREE.TorusGeometry(3.35, 0.035, 6, 24);
    rippleOuterGeo.rotateX(Math.PI / 2);
    const splashRingGeo = new THREE.TorusGeometry(0.42, 0.035, 5, 12);
    splashRingGeo.rotateX(Math.PI / 2);

    const shoalShadowGeo = new THREE.CircleGeometry(3.5, 16);
    shoalShadowGeo.rotateX(-Math.PI / 2);
    const shoalDiscGeo = new THREE.CircleGeometry(2.5, 14);
    shoalDiscGeo.rotateX(-Math.PI / 2);

    // 11 Cardumes bem espaçados cobrindo toda a extensão do oceano (Oeste Expandido, Centro, Leste Expandido e Alto-Mar Profundo)
    const zones = this._getDeepSeaZones();
    const initialCoords = [
      new THREE.Vector3(-242, 0.05, 136), // 0: Extremo Oeste (Pontal)
      new THREE.Vector3(-212, 0.05, 192), // 1: Alto-Mar Profundo Sudoeste
      new THREE.Vector3(-168, 0.05, 142), // 2: Enseada Oeste Expandida
      new THREE.Vector3(-112, 0.05, 150), // 3: Canal do Farol & Cabo Oeste
      new THREE.Vector3(-76,  0.05, 198), // 4: Abismo Oceânico Centro-Oeste
      new THREE.Vector3(-18,  0.05, 144), // 5: Baía Central de Alto-Mar
      new THREE.Vector3(24,   0.05, 204), // 6: Alto-Mar Profundo Sul
      new THREE.Vector3(58,   0.05, 146), // 7: Baía da Várzea de Alto-Mar
      new THREE.Vector3(124,  0.05, 138), // 8: Canal das Dunas & Surfe Fundo
      new THREE.Vector3(182,  0.05, 194), // 9: Alto-Mar Profundo Sudeste
      new THREE.Vector3(236,  0.05, 140)  // 10: Extremo Leste (Costa do Levante)
    ];

    for (let sIdx = 0; sIdx < initialCoords.length; sIdx++) {
      const sGroup = new THREE.Group();
      const initPos = initialCoords[sIdx].clone();
      sGroup.position.copy(initPos);

      const sp = speciesPalettes[sIdx % speciesPalettes.length];
      const zone = zones[sIdx % zones.length];

      // 1. Sombra profunda do cardume + Brilho cáustico solar na superfície
      const shoalShadow = new THREE.Mesh(shoalShadowGeo, sp.shadowMat);
      shoalShadow.position.y = -0.03;
      sGroup.add(shoalShadow);

      const shoalDisc = new THREE.Mesh(shoalDiscGeo, sp.glowMat);
      shoalDisc.position.y = -0.015;
      sGroup.add(shoalDisc);

      // 2. Três anéis concêntricos de fervura/rebojo na água + Anel de splash de salto
      const rippleInner = new THREE.Mesh(rippleInnerGeo, rippleMat);
      rippleInner.position.y = 0.03;
      sGroup.add(rippleInner);

      const rippleMid = new THREE.Mesh(rippleMidGeo, rippleMat);
      rippleMid.position.y = 0.03;
      sGroup.add(rippleMid);

      const rippleOuter = new THREE.Mesh(rippleOuterGeo, rippleMat);
      rippleOuter.position.y = 0.03;
      sGroup.add(rippleOuter);

      const splashRing = new THREE.Mesh(splashRingGeo, splashMat);
      splashRing.position.y = 0.04;
      splashRing.visible = false;
      sGroup.add(splashRing);

      // 3. 14 Peixes 3D detalhados nadando em correntes orgânicas (vórtice + figura-8) e saltando em parábola
      const fishEntries = [];
      for (let f = 0; f < 14; f++) {
        const fUnit = new THREE.Group();
        const isAccent = (f % 3 === 0);
        const body = new THREE.Mesh(fishBodyGeo, isAccent ? sp.accentMat : sp.primaryMat);
        fUnit.add(body);

        const snout = new THREE.Mesh(fishSnoutGeo, isAccent ? sp.accentMat : sp.primaryMat);
        snout.position.z = 0.36;
        fUnit.add(snout);

        const dorsal = new THREE.Mesh(fishDorsalGeo, sp.finMat);
        dorsal.position.set(0, 0.11, 0.02);
        dorsal.rotation.x = -0.25;
        fUnit.add(dorsal);

        const tail = new THREE.Mesh(fishTailGeo, sp.finMat);
        tail.position.z = -0.34;
        fUnit.add(tail);

        const baseRadius = 0.65 + (f % 5) * 0.46 + (Math.random() * 0.25);
        const baseAngle = (f / 14) * Math.PI * 2 + Math.random() * 0.35;
        const swimSpeed = (1.55 + (f % 4) * 0.38) * (sIdx % 2 === 0 ? 1 : -1);
        const scaleVar = 0.85 + (f % 3) * 0.14;
        fUnit.scale.set(scaleVar, scaleVar, scaleVar);

        fUnit.position.set(
          Math.cos(baseAngle) * baseRadius,
          0.03,
          Math.sin(baseAngle) * baseRadius
        );
        sGroup.add(fUnit);

        fishEntries.push({
          mesh: fUnit,
          tail,
          angle: baseAngle,
          radius: baseRadius,
          eccentricity: 0.78 + (f % 3) * 0.18,
          speed: swimSpeed,
          jumpPhase: f * 1.25 + sIdx * 0.9
        });
      }

      // 4. Gaivotas e Fragatas Marinhas com asas anguladas sobrevoando e mergulhando sobre o cardume
      const birds = [];
      const birdCount = (sIdx % 2 === 0) ? 3 : 2;
      for (let b = 0; b < birdCount; b++) {
        const birdGroup = new THREE.Group();
        const bBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.40), birdWhiteMat);
        birdGroup.add(bBody);

        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 4), birdBeakMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0, 0.24);
        birdGroup.add(beak);

        const tailFeathers = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.16), birdWingTipMat);
        tailFeathers.position.set(0, 0.01, -0.24);
        birdGroup.add(tailFeathers);

        const wingGeo = new THREE.BoxGeometry(0.48, 0.03, 0.18);
        const wingL = new THREE.Mesh(wingGeo, birdWhiteMat);
        wingL.position.set(-0.26, 0.02, 0);
        birdGroup.add(wingL);

        const wingR = new THREE.Mesh(wingGeo, birdWhiteMat);
        wingR.position.set(0.26, 0.02, 0);
        birdGroup.add(wingR);

        birdGroup.position.set(b === 0 ? -1.8 : 1.8, 3.4 + b * 0.65, 0);
        sGroup.add(birdGroup);
        birds.push({
          group: birdGroup,
          wingL,
          wingR,
          angle: (b / birdCount) * Math.PI * 2,
          orbitRadius: 2.2 + b * 0.55,
          height: 3.2 + b * 0.65
        });
      }

      this.group.add(sGroup);
      this.mobilityDynamicGroups.push(sGroup);

      this.fishSchools.push({
        id: `cardume_${sIdx}`,
        speciesName: sp.name,
        sector: zone.sector,
        zoneBounds: zone,
        group: sGroup,
        pos: initPos,
        shoalShadow,
        shoalDisc,
        rippleInner,
        rippleMid,
        rippleOuter,
        splashRing,
        fishEntries,
        birds,
        state: 'ACTIVE', // 'ACTIVE' | 'BEING_CAUGHT' | 'DEPLETED' | 'SPAWNING'
        claimedBy: null,
        respawnTimer: 0,
        scaleProgress: 1.0,
        driftAngle: sIdx * 1.7,
        phase: sIdx * 1.2
      });
    }
  },

  _createDeepBayMariculture() {
    // 1. Linha Costeira de Boias de Segurança dos Banhistas (z ~ 100m, de X = -255 a +255, deixando livre o canal do Píer)
    // Demarca visualmente o limite onde os banhistas nadam em segurança e onde barcos pesqueiros nunca entram!
    const swimBuoyGeo = new THREE.SphereGeometry(0.26, 7, 7);
    const swimRedMat = new THREE.MeshLambertMaterial({ color: 0xEF4444, flatShading: true });
    const swimYellowMat = new THREE.MeshLambertMaterial({ color: 0xFACC15, flatShading: true });

    for (let x = -252; x <= 252; x += 24) {
      // Deixa o canal de navegação do Píer (-88 a -66) aberto para entrada/saída dos barcos do Píer
      if (x >= -88 && x <= -66) continue;
      const sbMesh = new THREE.Mesh(swimBuoyGeo, Math.abs(x) % 48 === 0 ? swimRedMat : swimYellowMat);
      const sz = 100.0 + Math.sin(x * 0.02) * 2.0;
      sbMesh.position.set(x, 0.14, sz);
      this.group.add(sbMesh);
      this.boats.push({ group: sbMesh, baseY: 0.14, phase: x * 0.1 });
      if (this.mobilityDynamicGroups) this.mobilityDynamicGroups.push(sbMesh);
    }

    // 2. Boias de Poita (Ancoradouros de Alto-Mar Oeste e Leste) & Sinalização de Covos de Lagosta espalhados até as áreas expandidas
    const buoySpots = [
      { x: -224, z: 112.5, color: 0x10B981 }, // Poita do Saveiro Brisa do Pontal (Extremo Oeste)
      { x: -192, z: 128.0, color: 0xF97316 }, // Covos do Pontal Oeste
      { x: -152, z: 110.5, color: 0x38BDF8 }, // Poita da Canoa Rainha do Mar (Enseada Oeste)
      { x: -128, z: 122.0, color: 0xFACC15 }, // Covos do Cabo Oeste
      { x: 118,  z: 124.0, color: 0xEF4444 }, // Covos das Dunas
      { x: 158,  z: 110.5, color: 0xA855F7 }, // Poita do Barco Estrela do Levante (Enseada Leste)
      { x: 194,  z: 130.0, color: 0xF97316 }, // Covos do Levante
      { x: 228,  z: 112.5, color: 0xEC4899 }  // Poita do Saveiro Maresia das Dunas (Extremo Leste)
    ];
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3E2723 });

    buoySpots.forEach((sp, idx) => {
      const mGroup = new THREE.Group();
      const floatMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.28, 0.46, 7),
        new THREE.MeshLambertMaterial({ color: sp.color, flatShading: true })
      );
      mGroup.add(floatMesh);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.25, 5), poleMat);
      mast.position.y = 0.65;
      mGroup.add(mast);

      const flag = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.55, 4),
        new THREE.MeshLambertMaterial({ color: sp.color, flatShading: true })
      );
      flag.rotation.z = Math.PI / 2;
      flag.position.set(0.24, 1.12, 0);
      mGroup.add(flag);

      mGroup.position.set(sp.x, 0.16, sp.z);
      this.group.add(mGroup);
      this.boats.push({ group: mGroup, baseY: 0.16, phase: idx * 1.3 + 0.5 });
      if (this.mobilityDynamicGroups) this.mobilityDynamicGroups.push(mGroup);
    });
  },

  updateExpeditionBoats(delta, time) {
    // 1. Atualiza todos os 11 Cardumes de Peixes espalhados pelo mar fundo e áreas expandidas
    // Regra de ouro: Os cardumes permanecem vivos e visíveis até que um pescador vá até lá e os pesque!
    if (this.fishSchools && this.fishSchools.length > 0) {
      for (let s = 0; s < this.fishSchools.length; s++) {
        const school = this.fishSchools[s];

        if (school.state === 'DEPLETED') {
          school.respawnTimer -= delta;
          if (school.respawnTimer <= 0) {
            // Renasce em um novo ponto bem espaçado do mar fundo!
            const newPt = this._pickRandomSeaPoint(s);
            school.pos.copy(newPt);
            school.group.position.copy(newPt);
            school.state = 'SPAWNING';
            school.claimedBy = null;
            school.scaleProgress = 0.05;
            school.group.visible = true;
            school.group.scale.set(0.05, 0.05, 0.05);
          }
          continue;
        }

        if (school.state === 'SPAWNING') {
          school.scaleProgress = Math.min(1.0, school.scaleProgress + delta * 0.75);
          school.group.scale.set(school.scaleProgress, school.scaleProgress, school.scaleProgress);
          if (school.scaleProgress >= 1.0) {
            school.state = 'ACTIVE';
          }
        } else if (school.state === 'BEING_CAUGHT') {
          // À medida que o pescador puxa a rede, o cardume vai sendo recolhido para dentro do barco
          school.scaleProgress = Math.max(0.12, school.scaleProgress - delta * 0.28);
          school.group.scale.set(school.scaleProgress, 1.0, school.scaleProgress);
        } else {
          school.group.scale.set(1, 1, 1);
          // Movimento orgânico suave do cardume pelas correntes marinhas enquanto não está cercado por rede
          if (!school.claimedBy && school.zoneBounds) {
            school.driftAngle = (school.driftAngle || 0) + Math.sin(time * 0.4 + school.phase) * delta * 0.45;
            const driftSpeed = 0.65;
            let nx = school.pos.x + Math.cos(school.driftAngle) * driftSpeed * delta;
            let nz = school.pos.z + Math.sin(school.driftAngle) * driftSpeed * delta;

            const zb = school.zoneBounds;
            if (nx < zb.minX + 4 || nx > zb.maxX - 4) {
              school.driftAngle = Math.PI - school.driftAngle;
              nx = Math.max(zb.minX + 4, Math.min(zb.maxX - 4, nx));
            }
            if (nz < Math.max(118, zb.minZ + 4) || nz > zb.maxZ - 4) {
              school.driftAngle = -school.driftAngle;
              nz = Math.max(118, Math.min(zb.maxZ - 4, nz));
            }
            school.pos.x = nx;
            school.pos.z = nz;
            school.group.position.x = nx;
            school.group.position.z = nz;
          }
        }

        // Anima os 3 anéis de rebojo e o brilho cáustico na água
        const pulseA = 0.85 + Math.sin(time * 2.5 + school.phase) * 0.18;
        const pulseM = 0.90 + Math.sin(time * 2.0 + school.phase + 1.1) * 0.15;
        const pulseB = 0.88 + Math.cos(time * 1.8 + school.phase) * 0.16;
        school.rippleInner.scale.set(pulseA, pulseA, pulseA);
        if (school.rippleMid) school.rippleMid.scale.set(pulseM, pulseM, pulseM);
        school.rippleOuter.scale.set(pulseB, pulseB, pulseB);
        if (school.shoalDisc) {
          const glowPulse = 0.92 + Math.sin(time * 1.6 + school.phase) * 0.10;
          school.shoalDisc.scale.set(glowPulse, glowPulse, 1);
        }

        // Anima os 14 peixes nadando em cardume orgânico e saltando em parábola fora d'água
        let activeSplash = false;
        for (let f = 0; f < school.fishEntries.length; f++) {
          const fe = school.fishEntries[f];
          fe.angle += delta * fe.speed * (school.state === 'BEING_CAUGHT' ? 1.95 : 1.0);
          const dynamicR = fe.radius * (0.84 + Math.sin(time * 1.8 + f) * 0.18);
          const fx = Math.cos(fe.angle) * dynamicR;
          const fz = Math.sin(fe.angle) * dynamicR * (fe.eccentricity || 1.0);

          // Salto parabólico periódico de peixes fora d'água
          const jumpWave = Math.sin(time * 2.7 + fe.jumpPhase);
          const isJumping = jumpWave > 0.76;
          const jumpY = isJumping ? (jumpWave - 0.76) * 4.2 : 0.02 + Math.sin(time * 4.2 + f) * 0.02;

          if (jumpWave > 0.75 && jumpWave < 0.81 && school.splashRing && !activeSplash) {
            activeSplash = true;
            school.splashRing.visible = true;
            school.splashRing.position.set(fx, 0.04, fz);
            const spScale = 0.6 + (jumpWave - 0.75) * 14.0;
            school.splashRing.scale.set(spScale, spScale, spScale);
          }

          fe.mesh.position.set(fx, jumpY, fz);
          // Tangente da elipse para orientar o peixe na direção exata do nado
          const tangentYaw = Math.atan2(-Math.sin(fe.angle) * fe.speed, Math.cos(fe.angle) * fe.speed * (fe.eccentricity || 1.0));
          fe.mesh.rotation.y = tangentYaw;
          fe.mesh.rotation.x = isJumping ? -Math.cos((jumpWave - 0.76) * 13.0) * 0.52 : 0;
          fe.mesh.rotation.z = Math.sin(time * 6.0 + f) * 0.08;
          if (fe.tail) {
            fe.tail.rotation.y = Math.sin(time * 15.0 + f) * 0.38;
          }
        }
        if (!activeSplash && school.splashRing) {
          school.splashRing.visible = false;
        }

        // Anima as gaivotas circulando e mergulhando sobre o cardume
        for (let b = 0; b < school.birds.length; b++) {
          const bird = school.birds[b];
          bird.angle += delta * 1.38;
          const r = bird.orbitRadius || 2.2;
          const bx = Math.cos(bird.angle) * r;
          const bz = Math.sin(bird.angle) * r;
          const swoop = Math.sin(time * 1.9 + b * 2.1) * 0.55;
          bird.group.position.set(bx, bird.height + swoop, bz);
          bird.group.rotation.y = Math.atan2(-Math.sin(bird.angle), Math.cos(bird.angle));
          bird.group.rotation.z = -0.18; // Inclinação aerodinâmica na curva
          const flap = Math.sin(time * 9.8 + b * 2.0) * 0.44;
          bird.wingL.rotation.z = flap;
          bird.wingR.rotation.z = -flap;
        }
      }
    }

    if (!this.expeditionBoats || this.expeditionBoats.length === 0) return;

    const curPop = this.currentPopulation !== undefined ? this.currentPopulation : 320;

    // 2. Atualiza a Frota Progressiva de até 4 Barcos Pesqueiros (1 inicial, +1 em 1000, +1 em 1500, +1 em 2000 hab.)
    for (let i = 0; i < this.expeditionBoats.length; i++) {
      const boat = this.expeditionBoats[i];
      const isUnlocked = curPop >= (boat.unlockPop || 0);

      if (!isUnlocked) {
        if (boat.group.visible) {
          boat.group.visible = false;
          if (boat.netMesh) boat.netMesh.visible = false;
          if (boat.wakeGroup) boat.wakeGroup.visible = false;
          if (boat.targetSchool && boat.targetSchool.claimedBy === boat.id) {
            boat.targetSchool.claimedBy = null;
          }
          boat.targetSchool = null;
          boat.state = 'DOCKED';
          boat.currentPos.copy(boat.dockPos);
          boat.group.position.copy(boat.dockPos);
        }
        continue;
      }

      if (!boat.group.visible) {
        boat.group.visible = true;
      }

      // Balanço orgânico nas ondas do mar (pitch e roll combinados com a marejada)
      boat.group.position.y = boat.baseY + Math.sin(time * 2.1 + boat.phase) * 0.11;
      const waveRoll = Math.sin(time * 1.6 + boat.phase) * 0.045;
      const wavePitch = Math.cos(time * 1.8 + boat.phase * 0.7) * 0.032;

      if (boat.state === 'DOCKED') {
        boat.timer += delta;
        boat.currentSpeed = 0;
        if (boat.wakeGroup) boat.wakeGroup.visible = false;
        boat.group.rotation.z = waveRoll;
        boat.group.rotation.x = wavePitch;

        if (boat.timer >= boat.waitDuration) {
          // Procura um cardume ativo no mar, priorizando o setor oceânico do barco para espalhar a frota
          let chosenSchool = null;
          let bestScore = Infinity;

          if (this.fishSchools) {
            for (let s = 0; s < this.fishSchools.length; s++) {
              const candidate = this.fishSchools[s];
              if (candidate.state === 'ACTIVE' && (!candidate.claimedBy || candidate.claimedBy === boat.id)) {
                const d = boat.currentPos.distanceTo(candidate.pos);
                const sectorBonus = (candidate.sector === boat.preferredSector) ? 0.42 : 1.0;
                const score = d * sectorBonus * (0.80 + Math.random() * 0.40);
                if (score < bestScore) {
                  bestScore = score;
                  chosenSchool = candidate;
                }
              }
            }
          }

          if (chosenSchool) {
            chosenSchool.claimedBy = boat.id;
            boat.targetSchool = chosenSchool;
            const approachAngle = Math.atan2(
              boat.currentPos.x - chosenSchool.pos.x,
              boat.currentPos.z - chosenSchool.pos.z
            );
            boat.targetPos.set(
              chosenSchool.pos.x + Math.sin(approachAngle) * 2.4,
              0.05,
              chosenSchool.pos.z + Math.cos(approachAngle) * 2.4
            );
            boat.timer = 0;
            boat.state = 'SAILING_OUT';
            if (boat.catchGroup) boat.catchGroup.visible = false;
          } else {
            boat.timer = boat.waitDuration - 1.5;
          }
        }
      } else if (boat.state === 'SAILING_OUT') {
        if (!boat.targetSchool || boat.targetSchool.state === 'DEPLETED') {
          boat.state = 'RETURNING';
          boat.timer = 0;
          continue;
        }

        // Atualiza o ponto de encontro caso o cardume tenha derivado levemente com a corrente
        const approachAngle = Math.atan2(
          boat.currentPos.x - boat.targetSchool.pos.x,
          boat.currentPos.z - boat.targetSchool.pos.z
        );
        boat.targetPos.set(
          boat.targetSchool.pos.x + Math.sin(approachAngle) * 2.4,
          0.05,
          boat.targetSchool.pos.z + Math.cos(approachAngle) * 2.4
        );

        const dx = boat.targetPos.x - boat.currentPos.x;
        const dz = boat.targetPos.z - boat.currentPos.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 1.45) {
          // Corredor de Segurança Marítima: ao sair do Píer (-78), ganha mar fundo (z >= 116) antes de virar a Leste ou Oeste,
          // garantindo distância absoluta da área de banho dos banhistas em toda a orla!
          let steerX = boat.targetPos.x;
          let steerZ = boat.targetPos.z;
          if (boat.currentPos.z < 114.0 && Math.abs(boat.dockPos.x - (-78.0)) < 12.0) {
            steerX = boat.dockPos.x;
            steerZ = 118.0;
          }

          const desiredHeading = Math.atan2(steerX - boat.currentPos.x, steerZ - boat.currentPos.z);
          let headingDiff = desiredHeading - boat.heading;
          while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
          while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;

          boat.heading += headingDiff * Math.min(1, delta * 2.8);

          const approachFactor = dist < 6.0 ? Math.max(0.35, dist / 6.0) : 1.0;
          const targetSpd = boat.speed * approachFactor;
          boat.currentSpeed += (targetSpd - (boat.currentSpeed || 0)) * Math.min(1, delta * 2.5);

          const step = Math.min(dist, boat.currentSpeed * delta);
          boat.currentPos.x += Math.sin(boat.heading) * step;
          boat.currentPos.z += Math.cos(boat.heading) * step;

          // Geofence Costeiro Estrito em toda a praia expandida (-280 a +280):
          // Fora do canal do Píer (-86 a -68), nenhum barco pesqueiro pode navegar em z < 112!
          const inPierChannel = (boat.currentPos.x >= -86.0 && boat.currentPos.x <= -68.0);
          if (!inPierChannel && boat.currentPos.z < 112.0) {
            boat.currentPos.z = 112.0;
          }

          boat.group.position.x = boat.currentPos.x;
          boat.group.position.z = boat.currentPos.z;
          boat.group.rotation.y = boat.heading;
          boat.group.rotation.z = waveRoll - Math.max(-0.14, Math.min(0.14, headingDiff * 0.22));
          boat.group.rotation.x = wavePitch - 0.03;

          if (boat.tiller) boat.tiller.rotation.z = Math.sin(time * 4.5 + boat.phase) * 0.22;
          if (boat.fisherTorso) boat.fisherTorso.rotation.x = Math.sin(time * 4.5 + boat.phase) * 0.12;
          if (boat.wakeGroup) boat.wakeGroup.visible = true;
        } else {
          // Chegou ao Cardume: Lança a rede circular exatamente sobre o cardume!
          boat.state = 'CASTING_NETS';
          boat.timer = 0;
          boat.currentSpeed = 0;
          if (boat.wakeGroup) boat.wakeGroup.visible = false;

          const netCenter = boat.targetSchool ? boat.targetSchool.pos : boat.currentPos;
          if (boat.netMesh) {
            boat.netMesh.position.set(netCenter.x, 0.08, netCenter.z);
            boat.netMesh.visible = true;
            boat.netMesh.scale.set(0.2, 0.2, 0.2);
          }
          if (this.env) {
            this.env.fishingBoatTarget = netCenter.clone();
          }
        }
      } else if (boat.state === 'CASTING_NETS') {
        boat.timer += delta;
        boat.group.rotation.z = waveRoll;
        boat.group.rotation.x = wavePitch;
        if (boat.fisherTorso) boat.fisherTorso.rotation.x = 0.25 * Math.sin(boat.timer * 4.0);

        if (boat.netMesh) {
          const s = Math.min(1.0, 0.2 + boat.timer * 0.75);
          boat.netMesh.scale.set(s, s, s);
        }
        if (boat.timer >= 1.2) {
          boat.state = 'FISHING_WAIT';
          boat.timer = 0;
        }
      } else if (boat.state === 'FISHING_WAIT') {
        boat.timer += delta;
        boat.group.rotation.z = waveRoll;
        boat.group.rotation.x = wavePitch;

        if (boat.netMesh) {
          boat.netMesh.position.y = 0.08 + Math.sin(time * 2.2 + boat.phase) * 0.06;
        }
        if (boat.timer >= 4.2) {
          boat.state = 'HAULING_NETS';
          boat.timer = 0;
          if (boat.targetSchool && boat.targetSchool.state === 'ACTIVE') {
            boat.targetSchool.state = 'BEING_CAUGHT';
          }
        }
      } else if (boat.state === 'HAULING_NETS') {
        boat.timer += delta;
        if (boat.fisherTorso) {
          boat.fisherTorso.rotation.x = 0.18 + Math.sin(time * 8.0 + boat.phase) * 0.22;
        }
        boat.group.rotation.z = waveRoll + 0.06;

        if (Math.random() < 0.45 && boat.netMesh) {
          this.spawnJumpingFish(boat.netMesh.position);
        }
        if (boat.netMesh) {
          const s = Math.max(0.05, 1.0 - boat.timer * 0.32);
          boat.netMesh.scale.set(s, s, s);
          boat.netMesh.position.y = 0.08 + boat.timer * 0.12;
        }

        if (boat.timer >= 2.8) {
          if (boat.netMesh) boat.netMesh.visible = false;

          // O cardume só some depois que o pescador conclui a pesca!
          if (boat.targetSchool) {
            boat.targetSchool.state = 'DEPLETED';
            boat.targetSchool.group.visible = false;
            boat.targetSchool.claimedBy = null;
            boat.targetSchool.respawnTimer = 4.5 + Math.random() * 4.5;
            boat.targetSchool = null;
          }

          if (boat.catchGroup) boat.catchGroup.visible = true;

          if (this.env && this.env.fishingBoatTarget) {
            this.env.fishingBoatTarget = null;
          }
          if (this.soundtrack) {
            this.soundtrack.playCelebrationChime(boat.currentPos);
          }
          boat.state = 'RETURNING';
          boat.timer = 0;
        }
      } else if (boat.state === 'RETURNING') {
        const dx = boat.dockPos.x - boat.currentPos.x;
        const dz = boat.dockPos.z - boat.currentPos.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 1.2) {
          // Corredor de Segurança Marítima no retorno: barcos do Píer mantêm z >= 116 até alinharem com o canal (-78)
          let steerX = boat.dockPos.x;
          let steerZ = boat.dockPos.z;
          const isPierBoat = Math.abs(boat.dockPos.x - (-78.0)) < 12.0;
          if (isPierBoat && (boat.currentPos.x < -86.0 || boat.currentPos.x > -68.0)) {
            steerX = boat.dockPos.x;
            steerZ = Math.max(116.0, boat.currentPos.z * 0.94);
          }

          const desiredHeading = Math.atan2(steerX - boat.currentPos.x, steerZ - boat.currentPos.z);
          let headingDiff = desiredHeading - boat.heading;
          while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
          while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;

          boat.heading += headingDiff * Math.min(1, delta * 2.8);

          const dockBrake = dist < 6.0 ? Math.max(0.32, dist / 6.0) : 1.0;
          const targetSpd = (boat.speed * 0.94) * dockBrake;
          boat.currentSpeed += (targetSpd - (boat.currentSpeed || 0)) * Math.min(1, delta * 2.5);

          const step = Math.min(dist, boat.currentSpeed * delta);
          boat.currentPos.x += Math.sin(boat.heading) * step;
          boat.currentPos.z += Math.cos(boat.heading) * step;

          const inPierChannel = (boat.currentPos.x >= -86.0 && boat.currentPos.x <= -68.0);
          if (!inPierChannel && boat.currentPos.z < 112.0) {
            boat.currentPos.z = 112.0;
          }

          boat.group.position.x = boat.currentPos.x;
          boat.group.position.z = boat.currentPos.z;
          boat.group.rotation.y = boat.heading;
          boat.group.rotation.z = waveRoll - Math.max(-0.14, Math.min(0.14, headingDiff * 0.22));
          boat.group.rotation.x = wavePitch - 0.025;

          if (boat.tiller) boat.tiller.rotation.z = Math.sin(time * 4.2 + boat.phase) * 0.20;
          if (boat.fisherTorso) boat.fisherTorso.rotation.x = Math.sin(time * 4.2 + boat.phase) * 0.10;
          if (boat.wakeGroup) boat.wakeGroup.visible = true;
        } else {
          boat.currentPos.copy(boat.dockPos);
          boat.group.position.copy(boat.dockPos);
          boat.heading = 0;
          boat.group.rotation.set(0, 0, 0);
          if (boat.fisherTorso) boat.fisherTorso.rotation.x = 0;
          if (boat.tiller) boat.tiller.rotation.z = 0;
          if (boat.wakeGroup) boat.wakeGroup.visible = false;
          boat.totalCatches = (boat.totalCatches || 0) + 1;
          boat.state = 'DOCKED';
          boat.timer = 0;
          boat.waitDuration = 3.5 + Math.random() * 3.0;
        }
      }
    }

    // 3. Atualiza partículas de peixes saltando durante o recolhimento da rede
    for (let f = this.jumpingFish.length - 1; f >= 0; f--) {
      const fish = this.jumpingFish[f];
      fish.life -= delta * 1.4;
      fish.vel.y -= 11.0 * delta;
      fish.mesh.position.addScaledVector(fish.vel, delta);
      fish.mesh.rotation.x += delta * 10.0;
      fish.mesh.rotation.z += delta * 8.0;

      if (fish.life <= 0 || fish.mesh.position.y < -0.2) {
        this.group.remove(fish.mesh);
        this.jumpingFish.splice(f, 1);
      }
    }
  },

  spawnJumpingFish(pos) {
    if (this.jumpingFish.length > 20) return;
    const fishMesh = new THREE.Mesh(this.sharedFishGeo, this.sharedFishMat);
    fishMesh.position.copy(pos);
    fishMesh.position.x += (Math.random() - 0.5) * 1.8;
    fishMesh.position.z += (Math.random() - 0.5) * 1.8;
    fishMesh.position.y = 0.1;

    this.group.add(fishMesh);
    this.jumpingFish.push({
      mesh: fishMesh,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 2.2,
        3.2 + Math.random() * 1.4, // Leap out of water
        (Math.random() - 0.5) * 2.2
      ),
      life: 1.3
    });
  },

  // =========================================================================
  // REVITALIZAÇÃO DO FLANCO OESTE (MESA DE DOMINÓ, RANCHO DAS CANOAS & TRILHA)
  // =========================================================================
  createWestHillsideLife() {
    const lifeGroup = new THREE.Group();

    // 1. MESA DE DOMINÓ DOS PESCADORES (x: -64, z: -44 — Terraço próprio ao lado da trilha, livre do Mirante das Pipas)
    const domX = -64.0, domZ = -44.0;
    const domY = this.terrain ? this.terrain.getElevation(domX, domZ) : 5.2;
    const dominoGroup = new THREE.Group();
    dominoGroup.position.set(domX, domY + 0.22, domZ);

    // Patamar de pedra argamassada nivelado na encosta
    const stonePlinthMat = new THREE.MeshLambertMaterial({ color: 0x64748B, flatShading: true });
    const domPlinth = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.8, 4.6), stonePlinthMat);
    domPlinth.position.y = -0.9;
    domPlinth.receiveShadow = true;
    dominoGroup.add(domPlinth);

    // Deck base de madeira rústica
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x5C4033, flatShading: true });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 4.2), deckMat);
    deck.position.y = 0.11;
    deck.receiveShadow = true;
    dominoGroup.add(deck);

    // Pergola com 4 esteios de eucalipto e travessas
    const postMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });
    const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 2.7, 6);
    [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].forEach(([px, pz]) => {
      const p = new THREE.Mesh(postGeo, postMat);
      p.position.set(px, 1.35, pz);
      p.castShadow = true;
      dominoGroup.add(p);
    });

    // Travessas superiores e ripado de bambu
    const beamGeo = new THREE.BoxGeometry(4.2, 0.12, 0.14);
    const b1 = new THREE.Mesh(beamGeo, postMat);
    b1.position.set(0, 2.65, -1.8);
    dominoGroup.add(b1);
    const b2 = new THREE.Mesh(beamGeo, postMat);
    b2.position.set(0, 2.65, 1.8);
    dominoGroup.add(b2);

    const bambooMat = new THREE.MeshLambertMaterial({ color: 0xD4B886 });
    for (let i = -1.6; i <= 1.6; i += 0.45) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 4.0), bambooMat);
      slat.position.set(i, 2.72, 0);
      dominoGroup.add(slat);
    }

    // Mesa de Dominó
    const tableMat = new THREE.MeshLambertMaterial({ color: 0x4E342E });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.2), tableMat);
    tableTop.position.set(0, 0.72, 0);
    tableTop.castShadow = true;
    dominoGroup.add(tableTop);

    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.68, 6), postMat);
    tableLeg.position.set(0, 0.34, 0);
    dominoGroup.add(tableLeg);

    // Peças de dominó sobre a mesa
    const tileMat = new THREE.MeshLambertMaterial({ color: 0xFDFDFD });
    const dotMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
    for (let t = 0; t < 7; t++) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.06), (t % 2 === 0 ? tileMat : dotMat));
      tile.position.set((Math.random() - 0.5) * 0.7, 0.77, (Math.random() - 0.5) * 0.7);
      tile.rotation.y = Math.random() * Math.PI;
      dominoGroup.add(tile);
    }

    // 4 Tamboretes / Banquinhos de madeira
    const stoolMat = new THREE.MeshLambertMaterial({ color: 0x6D4C41 });
    const stoolGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.44, 8);
    const stoolPositions = [
      { x: 0, z: -0.9, angle: 0 },
      { x: 0, z: 0.9, angle: Math.PI },
      { x: -0.9, z: 0, angle: Math.PI / 2 },
      { x: 0.9, z: 0, angle: -Math.PI / 2 }
    ];
    stoolPositions.forEach(sp => {
      const stool = new THREE.Mesh(stoolGeo, stoolMat);
      stool.position.set(sp.x, 0.22, sp.z);
      stool.castShadow = true;
      dominoGroup.add(stool);
    });

    // Lampião a querosene pendurado no centro (emissivo puro sem PointLight extra)
    const lampMat = new THREE.MeshLambertMaterial({ color: 0xF59E0B, emissive: 0xD97706, emissiveIntensity: 0.7 });
    const lampMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.28, 6), lampMat);
    lampMesh.position.set(0, 2.35, 0);
    dominoGroup.add(lampMesh);

    lifeGroup.add(dominoGroup);

    // 2. RANCHO CAIÇARA & ESTALEIRO DA CANOA (x: -100, z: -38 — agora sobre deck rústico com cobertura de sapé!)
    const canX = -100.0, canZ = -38.0;
    const canY = this.terrain ? this.terrain.getElevation(canX, canZ) : 4.4;
    const canoGroup = new THREE.Group();
    canoGroup.position.set(canX, canY, canZ);
    canoGroup.rotation.y = 0.25;

    // Patamar de pedra/madeira assentado no solo para integrar a canoa e as redes ao terreno
    const yardBase = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 1.6, 6.2),
      new THREE.MeshLambertMaterial({ color: 0x8F8372, flatShading: true })
    );
    yardBase.position.set(0.6, -0.72, 0.6);
    yardBase.receiveShadow = true;
    canoGroup.add(yardBase);

    const yardDeck = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.16, 5.8),
      new THREE.MeshLambertMaterial({ color: 0x7A5C43, flatShading: true })
    );
    yardDeck.position.set(0.6, 0.10, 0.6);
    yardDeck.receiveShadow = true;
    canoGroup.add(yardDeck);

    // Telheiro leve de sapé sobre 4 esteios abrigando o estaleiro da canoa
    const shelterPostMat = new THREE.MeshLambertMaterial({ color: 0x5A3F2B, flatShading: true });
    [[-2.7, -1.6], [2.7, -1.6], [-2.7, 1.6], [2.7, 1.6]].forEach(([sx, sz]) => {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 2.75, 5), shelterPostMat);
      sp.position.set(sx, 1.48, sz);
      sp.castShadow = true;
      canoGroup.add(sp);
    });
    const shelterRoof = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.18, 4.0),
      new THREE.MeshLambertMaterial({ color: 0xB38B4D, flatShading: true })
    );
    shelterRoof.position.set(0, 2.88, 0);
    shelterRoof.rotation.x = 0.14;
    shelterRoof.castShadow = true;
    canoGroup.add(shelterRoof);

    // Dois cavaletes de carpinteiro naval
    const trestleMat = new THREE.MeshLambertMaterial({ color: 0x4E342E });
    [-1.8, 1.8].forEach(tx => {
      const trestle = new THREE.Group();
      trestle.position.set(tx, 0, 0);
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 1.4), trestleMat);
      crossbar.position.y = 0.85;
      trestle.add(crossbar);

      const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.95, 5);
      [-0.55, 0.55].forEach(lz => {
        const legA = new THREE.Mesh(legGeo, trestleMat);
        legA.position.set(-0.18, 0.45, lz);
        legA.rotation.z = -0.25;
        trestle.add(legA);

        const legB = new THREE.Mesh(legGeo, trestleMat);
        legB.position.set(0.18, 0.45, lz);
        legB.rotation.z = 0.25;
        trestle.add(legB);
      });
      canoGroup.add(trestle);
    });

    // Canoa de voga esculpida em madeira (azul e branca tradicional caiçara)
    const hullMat = new THREE.MeshLambertMaterial({ color: 0x1D4ED8, flatShading: true });
    const gunwaleMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true });

    const canoeHull = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.35, 5.2, 8, 1, false, 0, Math.PI), hullMat);
    canoeHull.rotation.z = Math.PI / 2;
    canoeHull.rotation.y = Math.PI;
    canoeHull.position.set(0, 1.05, 0);
    canoGroup.add(canoeHull);

    const gunwale = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.08, 0.95), gunwaleMat);
    gunwale.position.set(0, 1.08, 0);
    canoGroup.add(gunwale);

    // Dois remos apoiados
    const oarMat = new THREE.MeshLambertMaterial({ color: 0xD4B886 });
    [-0.8, 0.8].forEach((ox, i) => {
      const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 5), oarMat);
      oar.position.set(ox, 0.9, 0.7);
      oar.rotation.x = 0.55;
      oar.rotation.z = (i === 0 ? -0.2 : 0.2);
      canoGroup.add(oar);
    });

    // Varal de secagem de redes de pesca
    const rackMat = new THREE.MeshLambertMaterial({ color: 0x3E2723 });
    const netRack = new THREE.Group();
    netRack.position.set(3.2, 0, 2.5);

    [-2.2, 2.2].forEach(rx => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 6), rackMat);
      pole.position.set(rx, 1.1, 0);
      netRack.add(pole);
    });
    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.6, 6), rackMat);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, 2.05, 0);
    netRack.add(topBar);

    // Malha da rede de pesca pendurada
    const netMat = new THREE.MeshLambertMaterial({
      color: 0x93C5FD,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const netCloth = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.6, 6, 4), netMat);
    netCloth.position.set(0, 1.25, 0);
    netCloth.rotation.x = 0.15;
    netRack.add(netCloth);

    // Bóias de cortiça laranja penduradas na rede
    const floatMat = new THREE.MeshLambertMaterial({ color: 0xF97316 });
    for (let f = -1.8; f <= 1.8; f += 0.9) {
      const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.10, 6, 6), floatMat);
      buoy.position.set(f, 1.95, 0.05);
      netRack.add(buoy);
    }

    canoGroup.add(netRack);
    lifeGroup.add(canoGroup);

    // 3. MIRANTE DAS FALÉSIAS DO POENTE (x: -95, z: -68)
    const trailX = -95.0, trailZ = -68.0;
    const trailY = this.terrain ? this.terrain.getElevation(trailX, trailZ) : 9.8;
    const trailGroup = new THREE.Group();
    trailGroup.position.set(trailX, trailY, trailZ);

    const trailDeck = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.0, 1.4, 10), deckMat);
    trailDeck.position.y = -0.55;
    trailDeck.receiveShadow = true;
    trailGroup.add(trailDeck);

    // Banco rústico voltado para o mar aberto
    const trailBench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.6), stoolMat);
    trailBench.position.set(0, 0.35, 1.2);
    trailBench.rotation.y = Math.PI;
    trailGroup.add(trailBench);

    // Mastro com bandeirola indicadora de vento
    const windPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 4.2, 5), postMat);
    windPole.position.set(2.2, 2.1, 0);
    trailGroup.add(windPole);

    const windFlag = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.4, 6), new THREE.MeshLambertMaterial({ color: 0xEF4444 }));
    windFlag.rotation.z = Math.PI / 2;
    windFlag.position.set(2.9, 4.0, 0);
    trailGroup.add(windFlag);

    lifeGroup.add(trailGroup);

    this.group.add(lifeGroup);
  }
};
