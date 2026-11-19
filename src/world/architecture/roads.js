import * as THREE from 'three';
import { getSharedStylizedMaterial } from '../../render/StylizedMaterials.js';

/** Vias, alameda do samba, bocas de boteco, estradas de laje e postes. */
export const RoadsMixin = {
  // Verifica se um bloco de estrada/escadaria está invadindo o interior de qualquer deck, parque, estação ou monumento
  isInsideLandmarkFootprint(sx, sz) {
    if (Math.abs(sx - 55.0) < 18.0 && Math.abs(sz - 4.0) < 13.0) return true; // Campinho de Futebol
    if (Math.abs(sx - 75.0) < 9.5 && Math.abs(sz - 4.0) < 7.5) return true;   // Mercado Cultural
    if (Math.abs(sx - (-22.0)) < 8.5 && Math.abs(sz - (-14.0)) < 6.5) return true; // Olaria Central
    if (Math.hypot(sx - 95.0, sz - (-18.0)) < 8.2) return true;               // Grande Olaria Leste
    if (Math.abs(sx - 82.0) < 9.5 && Math.abs(sz - (-8.0)) < 6.5) return true; // Agrofloresta
    if (Math.abs(sx - 75.0) < 8.2 && Math.abs(sz - (-45.0)) < 5.8) return true; // Socalcos Leste
    if (Math.abs(sx - 96.0) < 6.5 && Math.abs(sz - (-28.0)) < 5.0) return true; // Pomar Agroflorestal
    if (Math.hypot(sx - (-2.0), sz - (-4.0)) < 9.2) return true;              // Praça do Samba
    if (Math.abs(sx - (-2.0)) < 3.4 && sz > -19.0 && sz < -12.2) return true; // Escadaria da Alameda do Samba
    if (Math.abs(sx - (-18.0)) < 11.2 && Math.abs(sz - (-72.0)) < 8.6) return true; // Parque Solar da Serra
    if (Math.hypot(sx - (-8.0), sz - (-65.0)) < 4.5) return true;             // Nascente da Serra
    if (Math.hypot(sx - 0.0, sz - (-104.0)) < 4.8) return true;               // Torre de Rádio
    if (Math.hypot(sx - 50.0, sz - (-110.0)) < 8.8) return true;              // Deck do Mirante Imperial
    if (Math.hypot(sx - (-78.0), sz - (-50.0)) < 8.6) return true;            // Deck do Mirante das Pipas
    if (Math.hypot(sx - 88.0, sz - (-48.0)) < 6.8) return true;               // Deck do Pipódromo do Levante
    if (Math.hypot(sx - 70.0, sz - (-72.0)) < 4.4) return true;               // Deck da Trilha da Crista
    if (Math.hypot(sx - (-95.0), sz - (-68.0)) < 4.6) return true;            // Deck das Falésias do Poente
    if (Math.hypot(sx - (-98.0), sz - (-55.0)) < 5.2) return true;            // Mirante do Poente
    if (Math.hypot(sx - 98.0, sz - (-55.0)) < 5.2) return true;               // Mirante do Levante
    if (Math.hypot(sx - (-64.0), sz - (-44.0)) < 3.8) return true;            // Mesa de Dominó do Poente
    if (Math.hypot(sx - (-100.0), sz - (-38.0)) < 4.8) return true;           // Rancho das Canoas
    if (Math.hypot(sx - (-95.0), sz - 0.0) < 7.0) return true;                // Vila dos Pescadores do Poente
    if (Math.hypot(sx - (-110.0), sz - (-15.0)) < 6.8) return true;           // Terreiro de Capoeira
    if (Math.abs(sx - (-92.0)) < 5.2 && Math.abs(sz - (-25.0)) < 4.2) return true; // Horta em Socalcos
    if (Math.abs(sx - 112.0) < 6.0 && Math.abs(sz - (-12.0)) < 4.5) return true;   // Academia ao Ar Livre
    if (Math.abs(sx - 32.0) < 6.0 && (Math.abs(sz - 11.5) < 5.5 || Math.abs(sz - (-17.0)) < 5.0 || Math.abs(sz - (-58.0)) < 5.5)) return true; // Estações do Bondinho (Corredor Leste-Central)
    return false;
  },

  createContinentalRoadNetwork() {
    // Pavimentação Urbana Carioca: Asfalto contínuo de ladeira e meio-fio de granito
    const roadMat = getSharedStylizedMaterial(0x3E3B38, 'asphalt', {
      flatShading: true,
      side: THREE.DoubleSide
    });
    const curbMat = getSharedStylizedMaterial(0x8A837A, 'stone', {
      flatShading: true,
      side: THREE.DoubleSide
    });

    const routes = [
      // 1. Avenida Beira-Mar (Grande Calçadão Litorâneo: Z = 18.0, X de -285 a +285)
      [
        { x: -285, z: 18.0 }, { x: -245, z: 18.0 }, { x: -205, z: 18.0 }, { x: -165, z: 18.0 },
        { x: -125, z: 18.0 }, { x: -102, z: 18.0 }, { x: -78, z: 18.0 },  { x: -50, z: 18.0 },
        { x: -20, z: 18.0 },  { x: 0, z: 18.0 },    { x: 15, z: 18.0 },   { x: 45, z: 18.0 },
        { x: 75, z: 18.0 },   { x: 102, z: 18.0 },  { x: 125, z: 18.0 },  { x: 165, z: 18.0 },
        { x: 205, z: 18.0 },  { x: 245, z: 18.0 },  { x: 285, z: 18.0 }
      ],
      // 2. Ladeira do Morro do Sol (Subida Central do Morro: Orla -> Colina Sul -> Alameda -> Olaria -> Serra)
      [
        { x: 15, z: 18.0 },   { x: 22, z: 10.0 },   { x: 24, z: 0.0 },    { x: 20, z: -10.0 },
        { x: 14, z: -18.0 },  { x: -2, z: -19.5 },  { x: -15, z: -18.0 }, { x: -22, z: -14.0 }
      ],
      // 3. Eixo Central da Serra (Continuação suave subindo a encosta oeste até o Platô do Alto da Serra)
      [
        { x: -15, z: -18.0 }, { x: -18, z: -28.0 }, { x: -16, z: -40.0 }, { x: -10, z: -52.0 }, { x: 0, z: -66.0 }
      ],
      // 4. Ladeira da Várzea (Subida Oriental: Polo da Várzea contornando suavemente a encosta leste)
      [
        { x: 75, z: 18.0 },   { x: 85, z: 10.0 },   { x: 82, z: -2.0 },   { x: 78, z: -14.0 },
        { x: 62, z: -22.0 },  { x: 46, z: -26.0 },  { x: 28, z: -32.0 },  { x: 14, z: -46.0 }, { x: 0, z: -66.0 }
      ],
      // 5. Ladeira da Prainha (Subida Ocidental: Porto da Prainha contornando suavemente a encosta oeste)
      [
        { x: -78, z: 18.0 },  { x: -75, z: 14.0 },  { x: -70, z: 2.0 },   { x: -65, z: -10.0 },
        { x: -52, z: -20.0 }, { x: -35, z: -30.0 }, { x: -20, z: -42.0 }, { x: 0, z: -66.0 }
      ],
      // 6. Estrada da Crista & Mirante Imperial (Platô da Serra -> Mirante Imperial)
      [
        { x: 0, z: -66.0 },   { x: 16, z: -74.0 },  { x: 32, z: -86.0 },  { x: 46, z: -96.0 }, { x: 50, z: -102.0 }
      ],
      // 7. Estrada da Torre de Rádio (Platô da Serra -> Cume Norte)
      [
        { x: 0, z: -66.0 },   { x: 0, z: -82.0 },   { x: 0, z: -100.0 },  { x: 0, z: -104.0 }
      ],
      // 8. Trilha Panorâmica da Coroa das Alturas
      [
        { x: -45, z: -85.0 }, { x: -24, z: -92.0 }, { x: 0, z: -96.0 },   { x: 24, z: -92.0 }, { x: 45, z: -85.0 }
      ],
      // 9. Estrada das Falésias do Poente (Vale Ocidental)
      [
        { x: -78, z: 18.0 },  { x: -115, z: 12.0 }, { x: -135, z: -20.0 }, { x: -154, z: -16.0 },
        { x: -186, z: -22.0 }, { x: -216, z: -34.0 }, { x: -244, z: -22.0 }, { x: -266, z: 6.0 }, { x: -278, z: 18.0 }
      ],
      // 10. Estrada do Vale do Levante (Vale Oriental)
      [
        { x: 78, z: 18.0 },   { x: 115, z: 12.0 },  { x: 135, z: -20.0 }, { x: 154, z: -16.0 },
        { x: 186, z: -22.0 }, { x: 216, z: -34.0 }, { x: 244, z: -22.0 }, { x: 266, z: 6.0 },  { x: 278, z: 18.0 }
      ],
      // 11. Estrada da Sela da Serra Norte (Contorno norte profundo)
      [
        { x: -116, z: -132.0 }, { x: -62, z: -152.0 }, { x: 0, z: -156.0 }, { x: 62, z: -152.0 }, { x: 116, z: -132.0 }
      ]
    ];

    const roadPositions = [];
    const curbPositions = [];

    const halfW = 1.7; // Largura da pista asfáltica (3.4m)
    const curbW = 0.22; // Largura do meio-fio de cantaria (0.22m)

    routes.forEach(route => {
      // 1. Gera pontos de amostragem refinados (~1.2m)
      const points = [];
      for (let i = 0; i < route.length - 1; i++) {
        const p1 = route[i];
        const p2 = route[i + 1];
        const segDist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        const steps = Math.max(2, Math.ceil(segDist / 1.2));
        for (let s = (i === 0 ? 0 : 1); s <= steps; s++) {
          const t = s / steps;
          const x = p1.x + (p2.x - p1.x) * t;
          const z = p1.z + (p2.z - p1.z) * t;
          points.push({ x, z });
          // Registra nó de infraestrutura para evitar casas sobre as pistas
          this.infrastructureNodes.push({ x, z });
        }
      }

      if (points.length < 2) return;

      // 2. Para cada ponto da rota, calcula fatias com elevações reais do relevo
      const slices = [];
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        let tx = 0, tz = 0;
        if (i === 0) {
          tx = points[1].x - p.x;
          tz = points[1].z - p.z;
        } else if (i === points.length - 1) {
          tx = p.x - points[i - 1].x;
          tz = p.z - points[i - 1].z;
        } else {
          tx = points[i + 1].x - points[i - 1].x;
          tz = points[i + 1].z - points[i - 1].z;
        }
        const len = Math.hypot(tx, tz) || 1;
        const nx = -tz / len;
        const nz = tx / len;

        // Pista Asfáltica (Esquerda e Direita)
        const lx = p.x + nx * halfW;
        const lz = p.z + nz * halfW;
        const ly = (this.terrain ? this.terrain.getElevation(lx, lz) : 2.5) + 0.08;

        const rx = p.x - nx * halfW;
        const rz = p.z - nz * halfW;
        const ry = (this.terrain ? this.terrain.getElevation(rx, rz) : 2.5) + 0.08;

        // Meio-fio Esquerdo (topo ligeiramente elevado +0.16m para relevo)
        const clx = p.x + nx * (halfW + curbW);
        const clz = p.z + nz * (halfW + curbW);
        const cly = (this.terrain ? this.terrain.getElevation(clx, clz) : 2.5) + 0.16;

        // Meio-fio Direito
        const crx = p.x - nx * (halfW + curbW);
        const crz = p.z - nz * (halfW + curbW);
        const cry = (this.terrain ? this.terrain.getElevation(crx, crz) : 2.5) + 0.16;

        slices.push({
          l: [lx, ly, lz],
          r: [rx, ry, rz],
          cl: [clx, cly, clz],
          cr: [crx, cry, crz]
        });
      }

      // 3. Monta malha contínua (triângulos perfeitos sem dentes ou fendas)
      for (let i = 0; i < slices.length - 1; i++) {
        const s0 = slices[i];
        const s1 = slices[i + 1];

        // Superfície da Pista de Asfalto (2 triângulos por segmento)
        roadPositions.push(
          ...s0.l, ...s0.r, ...s1.l,
          ...s1.l, ...s0.r, ...s1.r
        );

        // Meio-fio Esquerdo (2 triângulos formando o topo da guia)
        curbPositions.push(
          ...s0.cl, ...s0.l, ...s1.cl,
          ...s1.cl, ...s0.l, ...s1.l
        );

        // Meio-fio Direito (2 triângulos formando o topo da guia)
        curbPositions.push(
          ...s0.r, ...s0.cr, ...s1.r,
          ...s1.r, ...s0.cr, ...s1.cr
        );
      }
    });

    // Gera a malha única e contínua do asfalto
    if (roadPositions.length > 0) {
      const roadGeo = new THREE.BufferGeometry();
      roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
      roadGeo.computeVertexNormals();
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.receiveShadow = true;
      this.group.add(roadMesh);
    }

    // Gera a malha única e contínua do meio-fio de granito
    if (curbPositions.length > 0) {
      const curbGeo = new THREE.BufferGeometry();
      curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
      curbGeo.computeVertexNormals();
      const curbMesh = new THREE.Mesh(curbGeo, curbMat);
      curbMesh.receiveShadow = true;
      this.group.add(curbMesh);
    }
  },

  // =========================================================================
  // ALAMEDA DO SAMBA (O Caminho Imperial dos Bambas)
  // Acesso nobre, pavimentado e decorado vindo do bairro alto (z: -19.5 a -12.8)
  // Pérgolas de buganvílias floridas, postes coloniais, floreiras e bancos
  // =========================================================================
  createAlamedaDoSamba() {
    const alamedaGroup = new THREE.Group();

    const terracotaMat = getSharedStylizedMaterial(0xB85D3F, 'brick', { flatShading: true });
    const stoneTrimMat = getSharedStylizedMaterial(0x475569, 'stone', { flatShading: true });
    const stoneBaseMat = getSharedStylizedMaterial(0x576374, 'stone', { flatShading: true });
    const woodMat = getSharedStylizedMaterial(0x4A3128, 'wood', { flatShading: true });
    const leafMat = getSharedStylizedMaterial(0x36754E, 'foliage', { wind: 'crown' });
    const bougPinkMat = getSharedStylizedMaterial(0xD64D7E, 'foliage', { wind: 'crown' });
    const bougPurpleMat = getSharedStylizedMaterial(0x8858C8, 'foliage', { wind: 'crown' });
    const potMat = getSharedStylizedMaterial(0x966B56, 'brick');
    const flowerMatRed = getSharedStylizedMaterial(0xDA4F49, 'plaster');
    const flowerMatYellow = getSharedStylizedMaterial(0xE0A443, 'plaster');

    // 1. Pavimentação Escalonada em Patamares Suaves de Jardim (Z = -19.5 até Z = -13.0)
    const numSlabs = 14;
    for (let i = 0; i < numSlabs; i++) {
      const t = i / (numSlabs - 1);
      const z = -19.5 + t * 6.5; // De -19.5 a -13.0
      const x = -2.0;
      
      const yTerr = this.terrain ? this.terrain.getElevation(x, z) : 12.0;
      const targetY = 11.6 + t * 2.5; // Subida suave de 11.6m para 14.1m
      const y = Math.max(yTerr, targetY);

      // Laje de Terracota
      const slabMesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.28, 0.65), terracotaMat);
      slabMesh.position.set(x, y + 0.12, z);
      slabMesh.receiveShadow = true;
      slabMesh.castShadow = true;
      alamedaGroup.add(slabMesh);

      // Friso de Cantaria nas bordas laterais
      [-2.4, 2.4].forEach(edgeX => {
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.65), stoneTrimMat);
        kerb.position.set(x + edgeX, y + 0.14, z);
        alamedaGroup.add(kerb);
      });

      // Embasamento de Arrimo de Pedra ancorando até o solo
      const baseH = Math.max(0.4, (y - yTerr) + 0.5);
      const baseBlock = new THREE.Mesh(new THREE.BoxGeometry(4.7, baseH, 0.62), stoneBaseMat);
      baseBlock.position.set(x, y - (baseH * 0.5) + 0.05, z);
      baseBlock.receiveShadow = true;
      alamedaGroup.add(baseBlock);
    }

    // 2. Dois Grandes Pórticos de Pérgola com Buganvílias Floridas
    const pergolaZs = [-18.0, -15.0];
    pergolaZs.forEach((pZ, pIdx) => {
      const pY = this.terrain ? this.terrain.getElevation(-2.0, pZ) : 22.0;

      // Colunas rústicas nas duas margens
      [-2.55, 2.55].forEach(colX => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.8, 6), woodMat);
        col.position.set(-2.0 + colX, pY + 1.9, pZ);
        alamedaGroup.add(col);

        // Mureta de apoio da coluna
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.45), stoneTrimMat);
        plinth.position.set(-2.0 + colX, pY + 0.3, pZ);
        alamedaGroup.add(plinth);
      });

      // Travessa Principal do Pórtico
      const beam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.22, 0.24), woodMat);
      beam.position.set(-2.0, pY + 3.8, pZ);
      alamedaGroup.add(beam);

      // Ripas de teto
      for (let rx = -2.4; rx <= 2.4; rx += 0.8) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.2), woodMat);
        rib.position.set(-2.0 + rx, pY + 3.95, pZ);
        alamedaGroup.add(rib);
      }

      // Copa de Buganvílias Floridas
      const bColor = (pIdx === 0) ? bougPinkMat : bougPurpleMat;
      for (let bx = -2.3; bx <= 2.3; bx += 0.65) {
        const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), leafMat);
        leaf.position.set(-2.0 + bx, pY + 3.95 + Math.sin(bx * 2) * 0.1, pZ + (Math.sin(bx * 3) * 0.25));
        alamedaGroup.add(leaf);

        const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), bColor);
        flower.position.set(-2.0 + bx, pY + 4.15, pZ + (Math.sin(bx * 3) * 0.25));
        alamedaGroup.add(flower);
      }
    });

    // 3. Postes Coloniais com Iluminação Âmbar e Floreiras Laterais
    const alamedaLampMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
    const lampZs = [-19.2, -17.0, -14.8, -13.2];
    lampZs.forEach((lZ, lIdx) => {
      const baseLY = this.terrain ? this.terrain.getElevation(-2.0, lZ) : 22.0;

      [-2.65, 2.65].forEach(sideX => {
        const postX = -2.0 + sideX;
        const lY = this.terrain ? this.terrain.getElevation(postX, lZ) : baseLY;

        // Poste Colonial
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.8, 6), woodMat);
        post.position.set(postX, lY + 1.4, lZ);
        alamedaGroup.add(post);

        // Luminária Dourada (sem PointLight por poste para evitar loop pesado de luzes no fragment shader!)
        const lamp = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), alamedaLampMat);
        lamp.position.set(postX, lY + 2.8, lZ);
        alamedaGroup.add(lamp);

        // Vaso com Folhagens e Flores entre os postes
        if (lIdx % 2 === 1) {
          const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.5, 6), potMat);
          pot.position.set(postX, lY + 0.25, lZ + 0.8);
          alamedaGroup.add(pot);

          const plant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), leafMat);
          plant.position.set(postX, lY + 0.55, lZ + 0.8);
          alamedaGroup.add(plant);

          const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), (sideX > 0) ? flowerMatRed : flowerMatYellow);
          fl.position.set(postX, lY + 0.72, lZ + 0.8);
          alamedaGroup.add(fl);
        }
      });
    });

    // 4. Bancos de Madeira Rústica para Contemplação e Descanso
    this.alamedaBenches = [];
    const benchConfigs = [
      { x: -4.8, z: -17.5, rot: 1.57, yOffset: 0.2 },
      { x: 0.8,  z: -14.2, rot: -1.57, yOffset: 0.2 }
    ];
    benchConfigs.forEach((bCfg, bIdx) => {
      const bY = this.terrain ? this.terrain.getElevation(bCfg.x, bCfg.z) : 12.5;

      const benchGroup = new THREE.Group();
      benchGroup.position.set(bCfg.x, bY + bCfg.yOffset, bCfg.z);
      benchGroup.rotation.y = bCfg.rot;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.45), woodMat);
      seat.position.y = 0.35;
      benchGroup.add(seat);

      [-0.65, 0.65].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.4), woodMat);
        leg.position.set(lx, 0.175, 0);
        benchGroup.add(leg);
      });

      const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.08), woodMat);
      back.position.set(0, 0.65, -0.2);
      benchGroup.add(back);

      alamedaGroup.add(benchGroup);

      this.alamedaBenches.push({
        id: `alameda_bench_${bIdx}`,
        x: bCfg.x,
        y: bY + bCfg.yOffset,
        z: bCfg.z,
        rot: bCfg.rot,
        isOccupied: false
      });
    });

    // 5. Bandeirinhas Festivas e Fios Aéreos Cruzando a Alameda
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const colors = [0xFF0000, 0x00FF00, 0xFFFF00, 0x00FFFF, 0xFF00FF, 0xF97316];
    pergolaZs.forEach((pZ, pIdx) => {
      const pY = this.terrain ? this.terrain.getElevation(-2.0, pZ) : 12.5;

      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 5.2, 3), wireMat);
      wire.position.set(-2.0, pY + 3.4, pZ);
      wire.rotation.z = Math.PI / 2;
      alamedaGroup.add(wire);

      for (let f = 0; f < 6; f++) {
        const flag = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.14, 0),
          new THREE.MeshBasicMaterial({ color: colors[(f + pIdx * 2) % colors.length] })
        );
        flag.position.set(-4.0 + f * 0.8, pY + 3.25 - Math.sin((f / 5) * Math.PI) * 0.12, pZ);
        alamedaGroup.add(flag);
      }
    });

    // Registrar nós de infraestrutura
    this.infrastructureNodes.push({ x: -2.0, z: -19.0 });
    this.infrastructureNodes.push({ x: -2.0, z: -16.0 });
    this.infrastructureNodes.push({ x: -2.0, z: -13.0 });

    this.group.add(alamedaGroup);
    this.alamedaDoSamba = alamedaGroup;
  },

  // CANTINHOS DE BOTECO SUTIS & MESINHAS DE CALÇADA (Atualização 1.1)
  // Apenas 2 pontos orgânicos e discretos na colina para encontros e pausas
  createBotecoPockets() {
    this.botecoSpots = [];
    const botecoGroup = new THREE.Group();

    const tableMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true });
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
    const chairMatAmbev = new THREE.MeshLambertMaterial({ color: 0xFACC15, flatShading: true }); // Amarela Ambev
    const chairMatBrahma = new THREE.MeshLambertMaterial({ color: 0xDC2626, flatShading: true }); // Vermelha Brahma
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x15803D, flatShading: true }); // Garrafa de Guaraná
    const umbrellaMat = new THREE.MeshLambertMaterial({ color: 0xF59E0B, flatShading: true });

    const configs = [
      {
        id: 'boteco_varzea',
        name: 'Boteco da Várzea',
        tableX: 38.0,
        tableZ: 14.0,
        chairColor: chairMatAmbev,
        hasUmbrella: true,
        chairs: [
          { x: 37.3, z: 14.0, rotY: Math.PI / 2 },
          { x: 38.7, z: 14.0, rotY: -Math.PI / 2 }
        ]
      },
      {
        id: 'boteco_prainha',
        name: 'Venda da Subida da Prainha',
        tableX: -66.0,
        tableZ: 2.2,
        chairColor: chairMatBrahma,
        hasUmbrella: false,
        chairs: [
          { x: -66.0, z: 1.5, rotY: 0 },
          { x: -66.0, z: 2.9, rotY: Math.PI }
        ]
      },
      {
        id: 'boteco_vale_poente',
        name: 'Boteco do Vale do Poente',
        tableX: -186.0,
        tableZ: -19.5,
        chairColor: chairMatAmbev,
        hasUmbrella: true,
        chairs: [
          { x: -186.7, z: -19.5, rotY: Math.PI / 2 },
          { x: -185.3, z: -19.5, rotY: -Math.PI / 2 }
        ]
      },
      {
        id: 'boteco_vale_levante',
        name: 'Boteco do Vale do Levante',
        tableX: 186.0,
        tableZ: -19.5,
        chairColor: chairMatBrahma,
        hasUmbrella: true,
        chairs: [
          { x: 185.3, z: -19.5, rotY: Math.PI / 2 },
          { x: 186.7, z: -19.5, rotY: -Math.PI / 2 }
        ]
      },
      {
        id: 'boteco_sela_serra',
        name: 'Venda da Sela da Serra',
        tableX: -6.0,
        tableZ: -155.5,
        chairColor: chairMatAmbev,
        hasUmbrella: false,
        chairs: [
          { x: -6.7, z: -155.5, rotY: Math.PI / 2 },
          { x: -5.3, z: -155.5, rotY: -Math.PI / 2 }
        ]
      }
    ];

    configs.forEach(cfg => {
      const tableY = this.terrain ? this.terrain.getElevation(cfg.tableX, cfg.tableZ) : 4.0;

      // Mesa de Boteco
      const tableMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 8), tableMat);
      tableMesh.position.set(cfg.tableX, tableY + 0.72, cfg.tableZ);
      tableMesh.castShadow = true;
      botecoGroup.add(tableMesh);

      const tablePole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6), poleMat);
      tablePole.position.set(cfg.tableX, tableY + 0.36, cfg.tableZ);
      botecoGroup.add(tablePole);

      const tableBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.48), poleMat);
      tableBase.position.set(cfg.tableX, tableY + 0.02, cfg.tableZ);
      botecoGroup.add(tableBase);

      // Garrafinha verde de refrigerante no centro da mesa
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.22, 6), glassMat);
      bottle.position.set(cfg.tableX + 0.07, tableY + 0.85, cfg.tableZ + 0.05);
      botecoGroup.add(bottle);

      // Guarda-sol clássico
      if (cfg.hasUmbrella) {
        const umbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 6), poleMat);
        umbPole.position.set(cfg.tableX, tableY + 1.05, cfg.tableZ);
        botecoGroup.add(umbPole);

        const umbTop = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.42, 8), umbrellaMat);
        umbTop.position.set(cfg.tableX, tableY + 2.2, cfg.tableZ);
        botecoGroup.add(umbTop);
      }

      // Cadeiras de plástico monobloco
      cfg.chairs.forEach((ch, idx) => {
        const chY = this.terrain ? this.terrain.getElevation(ch.x, ch.z) : tableY;
        const chairGroup = new THREE.Group();
        chairGroup.position.set(ch.x, chY, ch.z);
        chairGroup.rotation.y = ch.rotY;

        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.05, 0.40), cfg.chairColor);
        seat.position.y = 0.40;
        chairGroup.add(seat);

        const back = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.40, 0.04), cfg.chairColor);
        back.position.set(0, 0.60, -0.18);
        chairGroup.add(back);

        [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].forEach(([px, pz]) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.40, 0.04), cfg.chairColor);
          leg.position.set(px, 0.20, pz);
          chairGroup.add(leg);
        });

        botecoGroup.add(chairGroup);

        this.botecoSpots.push({
          id: `${cfg.id}_seat_${idx}`,
          botecoName: cfg.name,
          x: ch.x,
          y: chY,
          z: ch.z,
          rotY: ch.rotY,
          isOccupied: false
        });
      });
    });

    // Desabilitar auto-update de matrizes para máxima performance
    botecoGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    this.group.add(botecoGroup);
  },

  // REDE DE ESCADARIAS URBANAS PEDONAIS & VIELAS ARTICULADAS (Arquitetura Orgânica Carioca)
  // Conecta organicamente os diferentes platôs residenciais às ruas pavimentadas e monumentos.
  // Modelado com degraus contínuos de pedra/cimento, patamares e muretas de proteção.
  createEstradasDeLajes() {
    // Degrau de cantaria com fundação profunda (1.40m ancora firme até em paredões de 50° sem frestas!)
    const stepGeo = new THREE.BoxGeometry(2.55, 1.40, 1.16);
    stepGeo.translate(0, -0.58, 0);
    // Base branca para permitir tinting exato via setColorAt tanto nos degraus de pedra quanto nos azulejos Selarón (1 único shader!)
    const stepMat = getSharedStylizedMaterial(0xFFFFFF, 'stone', { flatShading: true });

    // Espelho cerâmico colorido estilo Escadaria Selarón para a subida monumental central
    const riserGeo = new THREE.BoxGeometry(2.38, 0.42, 0.09);
    riserGeo.translate(0, -0.10, -0.57);
    const riserMat = stepMat;

    // Mureta lateral contínua profundamente ancorada no barranco
    const parapetGeo = new THREE.BoxGeometry(0.32, 1.68, 1.24);
    parapetGeo.translate(0, -0.38, 0);
    const parapetMat = getSharedStylizedMaterial(0x7C746B, 'stone', { flatShading: true });

    // Corrimão metálico escuro acompanhando a inclinação real das muretas
    const railGeo = new THREE.BoxGeometry(0.08, 0.08, 1.28);
    railGeo.translate(0, 0.62, 0);
    const railMat = getSharedStylizedMaterial(0x2F3640, 'metal', { flatShading: true });

    const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.2, 5);
    const postMat = getSharedStylizedMaterial(0x433D36, 'metal', { flatShading: true });

    const lanternGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const lanternMat = new THREE.MeshLambertMaterial({
      color: 0xFEF3C7,
      emissive: 0xF59E0B,
      emissiveIntensity: 0.9,
      flatShading: true
    });

    // 6 Escadarias Principais Dedicadas (Conectam cotas de altitude reais; removida a escada sem saída no paredão sul do Morro do Sol!)
    const stairRoutes = [
      // 1. Escadaria da Vila da Prainha (Píer -> Socalcos Baixos e Hortas Oeste)
      [
        { x: -78.0, z: 18.0 },
        { x: -84.0, z: 8.0 },
        { x: -88.0, z: -2.0 },
        { x: -88.0, z: -14.0 },
        { x: -92.0, z: -25.0 }
      ],
      // 2. Escadaria da Capoeira do Poente (Socalcos Poente -> Roda de Capoeira)
      [
        { x: -95.0, z: 12.0 },
        { x: -102.0, z: 2.0 },
        { x: -110.0, z: -15.0 }
      ],
      // 3. Escadaria do Campinho da Várzea (Calçadão da Praia -> Campinho)
      [
        { x: 55.0, z: 18.0 },
        { x: 55.0, z: 13.0 },
        { x: 55.0, z: 8.0 },
        { x: 55.0, z: 4.0 }
      ],
      // 4. Escadaria do Pipódromo do Levante (Ladeira do Levante -> Alto do Pipódromo)
      [
        { x: 78.0, z: -14.0 },
        { x: 82.0, z: -26.0 },
        { x: 86.0, z: -38.0 },
        { x: 88.0, z: -48.0 }
      ],
      // 5. Escadaria de Acesso à Estação Alta do Bondinho (liga o Platô da Serra ao novo Terminal em X=32, Z=-58)
      [
        { x: 14.0, z: -58.0 },
        { x: 21.0, z: -58.0 },
        { x: 27.0, z: -58.0 }
      ],
      // 6. Escadaria da Usina Solar e Nascente da Serra
      [
        { x: 0.0, z: -66.0 },
        { x: -8.0, z: -68.0 },
        { x: -18.0, z: -72.0 }
      ]
    ];

    const stepMatrices = [];
    const riserMatrices = [];
    const parapetMatrices = [];
    const railMatrices = [];
    const postMatrices = [];
    const lanternMatrices = [];

    // CRÍTICO: ordem 'YXZ' garante que o yaw (heading) ocorra antes do pitch (slopeAngle),
    // impedindo inversão da inclinação em escadarias voltadas para o Norte!
    const dummy = new THREE.Object3D();
    dummy.rotation.order = 'YXZ';
    const dummyParapet = new THREE.Object3D();
    dummyParapet.rotation.order = 'YXZ';

    stairRoutes.forEach((route, routeIdx) => {
      // Toque Selarón agora valoriza a subida do Campinho da Várzea (acesso real e conectado entre a praia e o campinho!)
      const isMonumentalCentral = (routeIdx === 2);

      // Lanterna discreta no patamar inferior de entrada
      if (route.length > 0) {
        const start = route[0];
        const startY = this.terrain ? this.terrain.getElevation(start.x, start.z) : 2.5;
        dummy.position.set(start.x + 1.5, startY + 1.1, start.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        postMatrices.push(dummy.matrix.clone());

        dummy.position.set(start.x + 1.5, startY + 2.25, start.z);
        dummy.updateMatrix();
        lanternMatrices.push(dummy.matrix.clone());
      }

      let routeStepIdx = 0;
      for (let i = 0; i < route.length - 1; i++) {
        const p1 = route[i];
        const p2 = route[i + 1];
        const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        // Passo super compacto (0.48m) na escadaria central monumental para vencer o paredão íngreme com 0 frestas
        const stepSpacing = isMonumentalCentral ? 0.48 : 0.88;
        const steps = Math.max(2, Math.ceil(dist / stepSpacing));
        const dx = (p2.x - p1.x) / steps;
        const dz = (p2.z - p1.z) / steps;
        const stepRun = Math.hypot(dx, dz) || 1;
        const heading = Math.atan2(dx, dz);

        for (let s = 0; s < steps; s++) {
          const sx = p1.x + dx * s;
          const sz = p1.z + dz * s;

          this.infrastructureNodes.push({ x: sx, z: sz });

          if (this.isInsideLandmarkFootprint(sx, sz)) continue;

          const syCenter = this.terrain ? this.terrain.getElevation(sx, sz) : 2.5;
          const prevY = this.terrain ? this.terrain.getElevation(sx - dx * 0.55, sz - dz * 0.55) : syCenter;
          const nextY = this.terrain ? this.terrain.getElevation(sx + dx * 0.55, sz + dz * 0.55) : syCenter;
          const sy = Math.max(syCenter, prevY, (prevY + nextY) * 0.5);
          const slopeAngle = -Math.atan2(nextY - prevY, 1.1 * stepRun);
          const clampedSlope = Math.max(-0.78, Math.min(0.78, slopeAngle));
          // Degrau quase horizontal para formar patamar legível, acompanhando suavemente ladeiras longas
          const treadPitch = Math.max(-0.14, Math.min(0.14, slopeAngle * 0.20));

          // Degrau de cantaria (elevação +0.34m na central garante que nenhum triângulo do paredão atravesse o degrau)
          dummy.position.set(sx, sy + (isMonumentalCentral ? 0.34 : 0.16), sz);
          dummy.rotation.set(treadPitch, heading, 0);
          dummy.scale.set(isMonumentalCentral ? 1.15 : 1.0, 1.0, 1.0);
          dummy.updateMatrix();
          stepMatrices.push(dummy.matrix.clone());

          // Espelho colorido estilo Escadaria Selarón na subida central do Morro do Sol
          if (isMonumentalCentral) {
            riserMatrices.push(dummy.matrix.clone());
          }

          // Mureta de contenção lateral esquerda e direita + corrimão metálico contínuo
          const sideDist = isMonumentalCentral ? 1.48 : 1.30;
          const perpX = Math.cos(heading) * sideDist;
          const perpZ = -Math.sin(heading) * sideDist;

          dummyParapet.position.set(sx + perpX, sy + (isMonumentalCentral ? 0.34 : 0.18), sz + perpZ);
          dummyParapet.rotation.set(clampedSlope, heading, 0);
          dummyParapet.scale.set(1.0, 1.0, 1.0);
          dummyParapet.updateMatrix();
          parapetMatrices.push(dummyParapet.matrix.clone());
          railMatrices.push(dummyParapet.matrix.clone());

          dummyParapet.position.set(sx - perpX, sy + (isMonumentalCentral ? 0.34 : 0.18), sz - perpZ);
          dummyParapet.updateMatrix();
          parapetMatrices.push(dummyParapet.matrix.clone());
          railMatrices.push(dummyParapet.matrix.clone());

          // Lanternas intermediárias ao longo da Escadaria Monumental do Mirante Sul (espaçadas a cada ~4m)
          if (isMonumentalCentral && routeStepIdx > 0 && routeStepIdx % 8 === 0) {
            const sideSign = (routeStepIdx % 16 === 0) ? 1 : -1;
            const lx = sx + perpX * sideSign;
            const lz = sz + perpZ * sideSign;
            dummy.position.set(lx, sy + 1.45, lz);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            postMatrices.push(dummy.matrix.clone());

            dummy.position.set(lx, sy + 2.60, lz);
            dummy.updateMatrix();
            lanternMatrices.push(dummy.matrix.clone());
          }
          routeStepIdx++;
        }
      }

      // Lanterna discreta no patamar superior de chegada
      if (route.length > 1) {
        const end = route[route.length - 1];
        const endY = this.terrain ? this.terrain.getElevation(end.x, end.z) : 2.5;
        dummy.position.set(end.x - 1.5, endY + 1.1, end.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        postMatrices.push(dummy.matrix.clone());

        dummy.position.set(end.x - 1.5, endY + 2.25, end.z);
        dummy.updateMatrix();
        lanternMatrices.push(dummy.matrix.clone());
      }
    });

    // 1. Instanced Steps (Degraus de Pedra com variação sutil de tom)
    if (stepMatrices.length > 0) {
      const instancedSteps = new THREE.InstancedMesh(stepGeo, stepMat, stepMatrices.length);
      instancedSteps.castShadow = true;
      instancedSteps.receiveShadow = true;
      const baseStepColor = new THREE.Color(0x989084);
      const varStepColor = new THREE.Color();
      for (let i = 0; i < stepMatrices.length; i++) {
        instancedSteps.setMatrixAt(i, stepMatrices[i]);
        const tint = Math.sin(i * 1.7) * 0.035;
        varStepColor.copy(baseStepColor).addScalar(tint);
        instancedSteps.setColorAt(i, varStepColor);
      }
      instancedSteps.instanceMatrix.needsUpdate = true;
      if (instancedSteps.instanceColor) instancedSteps.instanceColor.needsUpdate = true;
      this.group.add(instancedSteps);
      this.instancedSteps = instancedSteps;
    }

    // 1B. Espelhos Cerâmicos Estilo Selarón (Escadaria Monumental Central)
    if (riserMatrices.length > 0) {
      const selaronPalette = [0xC94B3B, 0xDFAC3C, 0x2F74A6, 0x3D8A5A, 0xEFE6D4, 0xD96C42];
      const instancedRisers = new THREE.InstancedMesh(riserGeo, riserMat, riserMatrices.length);
      instancedRisers.receiveShadow = true;
      const tileCol = new THREE.Color();
      for (let i = 0; i < riserMatrices.length; i++) {
        instancedRisers.setMatrixAt(i, riserMatrices[i]);
        tileCol.setHex(selaronPalette[i % selaronPalette.length]);
        instancedRisers.setColorAt(i, tileCol);
      }
      instancedRisers.instanceMatrix.needsUpdate = true;
      if (instancedRisers.instanceColor) instancedRisers.instanceColor.needsUpdate = true;
      this.group.add(instancedRisers);
      this.instancedRisers = instancedRisers;
    }

    // 2. Instanced Parapets (Muretas de Cantaria)
    if (parapetMatrices.length > 0) {
      const instancedParapets = new THREE.InstancedMesh(parapetGeo, parapetMat, parapetMatrices.length);
      instancedParapets.castShadow = true;
      instancedParapets.receiveShadow = true;
      for (let i = 0; i < parapetMatrices.length; i++) {
        instancedParapets.setMatrixAt(i, parapetMatrices[i]);
      }
      instancedParapets.instanceMatrix.needsUpdate = true;
      this.group.add(instancedParapets);
      this.instancedParapets = instancedParapets;
    }

    // 2B. Corrimãos Metálicos Contínuos
    if (railMatrices.length > 0) {
      const instancedRails = new THREE.InstancedMesh(railGeo, railMat, railMatrices.length);
      instancedRails.castShadow = true;
      for (let i = 0; i < railMatrices.length; i++) {
        instancedRails.setMatrixAt(i, railMatrices[i]);
      }
      instancedRails.instanceMatrix.needsUpdate = true;
      this.group.add(instancedRails);
      this.instancedRails = instancedRails;
    }

    // 3. Instanced Solar Lampposts (Postes nos patamares)
    if (postMatrices.length > 0) {
      const instancedPosts = new THREE.InstancedMesh(postGeo, postMat, postMatrices.length);
      instancedPosts.castShadow = true;
      for (let i = 0; i < postMatrices.length; i++) {
        instancedPosts.setMatrixAt(i, postMatrices[i]);
      }
      instancedPosts.instanceMatrix.needsUpdate = true;
      this.group.add(instancedPosts);
      this.instancedPosts = instancedPosts;
    }

    // 4. Instanced Glowing Lanterns (Luz quente nos patamares)
    if (lanternMatrices.length > 0) {
      const instancedLanterns = new THREE.InstancedMesh(lanternGeo, lanternMat, lanternMatrices.length);
      for (let i = 0; i < lanternMatrices.length; i++) {
        instancedLanterns.setMatrixAt(i, lanternMatrices[i]);
      }
      instancedLanterns.instanceMatrix.needsUpdate = true;
      this.group.add(instancedLanterns);
      this.instancedLanterns = instancedLanterns;
    }
  },

  createSolarLamps() {
    this.solarLamps = [];
    const lampCoords = [
      { x: -90, z: 12 },
      { x: -50, z: 8 },
      { x: -6, z: -4 },  // Edge of Samba Plaza (cleanly away from campfire!)
      { x: 45, z: 8 },
      { x: 85, z: 6 },
      { x: 0, z: -55 },
      { x: -75, z: -45 },
      { x: 75, z: -45 },
      { x: -95, z: 0 },   // Vila dos Pescadores do Poente
      { x: -98, z: -55 }, // Mirante do Poente
      { x: 95, z: -18 },  // Grande Olaria
      { x: 98, z: -55 },  // Mirante do Levante
      { x: 0, z: -104 },  // Torre de Rádio
      { x: -168, z: 12 }, // Vale do Poente Baixo
      { x: -225, z: 12 }, // Orla do Poente Expandida
      { x: -195, z: -55 },// Encosta do Poente Expandida
      { x: 168, z: 12 },  // Vale do Levante Baixo
      { x: 225, z: 12 },  // Orla do Levante Expandida
      { x: 195, z: -55 }, // Encosta do Levante Expandida
      { x: -65, z: -155 },// Sela da Serra Oeste
      { x: 65, z: -155 }, // Sela da Serra Leste
      { x: 0, z: -165 }   // Mirante da Sela Norte
    ];

    // Geometrias e materiais compartilhados (permite batching em 1 draw call e 0 PointLights extras por poste!)
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 3.5, 5);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const solarGeo = new THREE.BoxGeometry(0.8, 0.05, 0.6);
    const solarMat = new THREE.MeshLambertMaterial({ color: 0x1E3A8A });
    const bulbGeo = new THREE.SphereGeometry(0.24, 6, 6);
    const sharedSolarBulbMat = new THREE.MeshLambertMaterial({
      color: 0xFFE066,
      emissive: 0xFFA200,
      emissiveIntensity: 0.2
    });

    lampCoords.forEach(pos => {
      const lampGroup = new THREE.Group();
      const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 6;
      lampGroup.position.set(pos.x, y, pos.z);

      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 1.75;
      lampGroup.add(pole);

      const solar = new THREE.Mesh(solarGeo, solarMat);
      solar.position.set(0, 3.55, 0);
      solar.rotation.x = 0.3;
      lampGroup.add(solar);

      const bulb = new THREE.Mesh(bulbGeo, sharedSolarBulbMat);
      bulb.position.set(0.3, 3.25, 0);
      lampGroup.add(bulb);

      this.group.add(lampGroup);
    });
    // Registra 1 única entrada para atualizar emissiveIntensity em O(1) para todos os 21 postes solares!
    this.solarLamps.push({ bulbMat: sharedSolarBulbMat, lampLight: null });
  }
};
