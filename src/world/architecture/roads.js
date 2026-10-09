import * as THREE from 'three';

/** Vias, alameda do samba, bocas de boteco, estradas de laje e postes. */
export const RoadsMixin = {
  createContinentalRoadNetwork() {
    const roadMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, flatShading: true });
    const stoneGeo = new THREE.BoxGeometry(2.8, 1.4, 2.2);

    const routes = [
      // 1. Grand Coastal Highway (East to West along the beach promenade: z = 18.0)
      [
        { x: -135, z: 18.0 }, { x: -115, z: 18.0 }, { x: -102, z: 18.0 }, { x: -80, z: 18.0 }, { x: -58, z: 18.0 },
        { x: -35, z: 18.0 },  { x: -12, z: 18.0 },  { x: 12, z: 18.0 },
        { x: 35, z: 18.0 },   { x: 58, z: 18.0 },   { x: 80, z: 18.0 }, { x: 102, z: 18.0 }, { x: 115, z: 18.0 }, { x: 135, z: 18.0 }
      ],
      // 2. North-South Central Spine (upper portion from Alameda do Samba crossroads to Mirante da Vista Imperial)
      [
        { x: -2, z: -19.5 },
        { x: -18, z: -18 }, { x: 5, z: -32 },   { x: -12, z: -50 }, { x: 0, z: -66 }, { x: 0, z: -76 }
      ],
      // 3. West Mid-hill Arterial (Prainha to central junction)
      [
        { x: -75, z: 16 },  { x: -70, z: 4 },  { x: -65, z: -8 },
        { x: -50, z: -20 }, { x: -30, z: -32 }, { x: -3, z: -32 }
      ],
      // 4. East Mid-hill Arterial (Várzea to central junction)
      [
        { x: 75, z: 16 },   { x: 70, z: 4 },   { x: 65, z: -8 },
        { x: 50, z: -20 },  { x: 30, z: -32 },  { x: -3, z: -32 }
      ],
      // 5. ROUTE 5: WESTERN HIGHLAND HIGHWAY (Colina do Poente ao Mirante Imperial)
      [
        { x: -95, z: 18 },  { x: -95, z: 0 },  { x: -90, z: -25 },
        { x: -98, z: -55 }, { x: -78, z: -50 }, { x: -55, z: -70 }, { x: -28, z: -74 }, { x: 0, z: -72 }
      ],
      // 6. ROUTE 6: EASTERN HIGHLAND HIGHWAY (Encosta do Levante ao Mirante Imperial)
      [
        { x: 95, z: 18 },   { x: 95, z: -18 }, { x: 90, z: -25 },
        { x: 98, z: -55 },  { x: 75, z: -45 },  { x: 55, z: -70 }, { x: 28, z: -74 },  { x: 0, z: -72 }
      ],
      // 7. ROUTE 7: TRILHA PANORÂMICA DA COROA DAS ALTURAS (Contorno cênico da crista por trás do mirante)
      [
        { x: -78, z: -50 }, { x: -50, z: -75 }, { x: -24, z: -88 },
        { x: -14, z: -94 }, { x: 0, z: -98 },   { x: 14, z: -94 },
        { x: 24, z: -88 },  { x: 50, z: -75 },  { x: 75, z: -45 }
      ],
      // 8. ROUTE 8: AVENIDA DAS FALÉSIAS DO POENTE (Fronteira Extremo Oeste: X até -135)
      [
        { x: -95, z: 18 },  { x: -115, z: 8 },  { x: -125, z: -20 }, { x: -135, z: -25 },
        { x: -130, z: -45 }, { x: -135, z: -75 }, { x: -120, z: -85 }, { x: -98, z: -55 }
      ],
      // 9. ROUTE 9: AVENIDA DO VALE DO LEVANTE (Fronteira Extremo Leste: X até +135)
      [
        { x: 95, z: 18 },   { x: 115, z: 8 },   { x: 125, z: -20 }, { x: 135, z: -25 },
        { x: 130, z: -45 }, { x: 135, z: -75 }, { x: 120, z: -85 }, { x: 98, z: -55 }
      ],
      // 10. ROUTE 10: ESTRADA DAS ALTURAS DA CRISTA PROFUNDA (Cume Norte Extremo: Z até -132)
      [
        { x: -55, z: -120 }, { x: -45, z: -125 }, { x: -28, z: -115 }, { x: 0, z: -118 },
        { x: 0, z: -130 },   { x: 28, z: -115 },  { x: 45, z: -125 }, { x: 55, z: -120 }
      ]
    ];

    // Precalculate all block transformation matrices
    const blockMatrices = [];
    const dummy = new THREE.Object3D();

    routes.forEach((route, rIdx) => {
      for (let i = 0; i < route.length - 1; i++) {
        const p1 = route[i];
        const p2 = route[i + 1];
        const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        const heightDiff = Math.abs((this.terrain ? this.terrain.getElevation(p2.x, p2.z) : 0) - (this.terrain ? this.terrain.getElevation(p1.x, p1.z) : 0));
        
        // Se a montanha for um paredão, força a criação de MÚLTIPLOS blocos para não gerar escadas voadoras
        const steps = Math.max(9, Math.ceil(dist / 1.5), Math.ceil(heightDiff / 0.35));
        
        const dx = (p2.x - p1.x) / steps;
        const dz = (p2.z - p1.z) / steps;
        const roadHeading = Math.atan2(dx, dz);

        for (let s = 0; s < steps; s++) {
          const sx = p1.x + dx * s;
          const sz = p1.z + dz * s;

          // EVITAR SOBREPOSIÇÃO EM MONUMENTOS E CASAS
          const inSoccer = (Math.abs(sx - 55) < 13 && Math.abs(sz - 4) < 9);
          const inMarket = (Math.abs(sx - 75) < 10 && Math.abs(sz - 4) < 8);
          const inOlaria = (Math.abs(sx - (-22)) < 8 && Math.abs(sz - (-14)) < 6);
          const inAgro = (Math.abs(sx - 82) < 9 && Math.abs(sz - (-8)) < 6);
          const inSamba = (Math.hypot(sx - (-2), sz - (-4)) < 6);
          
          // Se a estrada passar por cima de uma casa, ela é cortada (virando um beco sem saída na porta da casa!)
          const inHouse = this.houses.some(h => Math.hypot(h.position.x - sx, h.position.z - sz) < 3.2);
          
          if (inSoccer || inMarket || inOlaria || inAgro || inSamba || inHouse) continue;

          const sy = this.terrain ? this.terrain.getElevation(sx, sz) : 2.5;

          const nY = this.terrain ? this.terrain.getElevation(sx + dx * 0.5, sz + dz * 0.5) : sy;
          const distStep = Math.hypot(dx, dz);
          const slopeAngle = -Math.atan2(nY - sy, distStep * 0.5);

          dummy.position.set(sx, sy - 0.65, sz);
          dummy.rotation.set(Math.max(-0.35, Math.min(0.35, slopeAngle)), roadHeading, 0);
          dummy.updateMatrix();

          blockMatrices.push({ matrix: dummy.matrix.clone(), routeIdx: rIdx, x: sx, y: sy, z: sz });

          // Register node to prevent houses from spawning here
          this.infrastructureNodes.push({ x: sx, z: sz });
        }
      }
    });

    // Single InstancedMesh rendering all road blocks in 1 draw call!
    const instancedRoad = new THREE.InstancedMesh(stoneGeo, roadMat, blockMatrices.length);
    instancedRoad.receiveShadow = true;

    const baseShade = new THREE.Color(0x9E978E);
    const colorVar = new THREE.Color();

    for (let i = 0; i < blockMatrices.length; i++) {
      const bm = blockMatrices[i];
      instancedRoad.setMatrixAt(i, bm.matrix);
      const tint = (Math.sin(i * 1.6) * 0.06);
      colorVar.copy(baseShade).addScalar(tint);
      instancedRoad.setColorAt(i, colorVar);
    }

    instancedRoad.instanceMatrix.needsUpdate = true;
    if (instancedRoad.instanceColor) instancedRoad.instanceColor.needsUpdate = true;

    this.group.add(instancedRoad);
    this.instancedRoad = instancedRoad;
  },

  // =========================================================================
  // ALAMEDA DO SAMBA (O Caminho Imperial dos Bambas)
  // Acesso nobre, pavimentado e decorado vindo do bairro alto (z: -19.5 a -12.8)
  // Pérgolas de buganvílias floridas, postes coloniais, floreiras e bancos
  // =========================================================================
  createAlamedaDoSamba() {
    const alamedaGroup = new THREE.Group();

    const terracotaMat = new THREE.MeshLambertMaterial({ color: 0xB85D3F, flatShading: true });
    const stoneTrimMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const stoneBaseMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2D6A4F });
    const bougPinkMat = new THREE.MeshLambertMaterial({ color: 0xEC4899 });
    const bougPurpleMat = new THREE.MeshLambertMaterial({ color: 0x8B5CF6 });
    const potMat = new THREE.MeshLambertMaterial({ color: 0x8D6E63 });
    const flowerMatRed = new THREE.MeshLambertMaterial({ color: 0xEF4444 });
    const flowerMatYellow = new THREE.MeshLambertMaterial({ color: 0xF59E0B });

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

        // Luminária Dourada
        const lamp = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: 0xFFD700 }));
        lamp.position.set(postX, lY + 2.8, lZ);
        alamedaGroup.add(lamp);

        const light = new THREE.PointLight(0xFFA200, 1.8, 8);
        light.position.set(postX, lY + 2.8, lZ);
        alamedaGroup.add(light);

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
      const bT = (bCfg.z - (-19.5)) / 6.5;
      const bY = 11.6 + bT * 2.5;

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
      const pT = (pZ - (-19.5)) / 6.5;
      const pY = 11.6 + pT * 2.5;

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
        tableX: 37.2,
        tableZ: -4.8,
        chairColor: chairMatAmbev,
        hasUmbrella: true,
        chairs: [
          { x: 36.5, z: -4.8, rotY: Math.PI / 2 },
          { x: 37.9, z: -4.8, rotY: -Math.PI / 2 }
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

  // REDE DE ESTRADAS DE LAJES, ESCADARIAS & VIELAS DO MORRO
  // Conecta organicamente 100% dos novos lotes residenciais aos eixos principais
  // Renderizado com InstancedMesh para altíssima performance (60 FPS fluidos em 1x a 5x)
  createEstradasDeLajes() {
    const slabGeo = new THREE.BoxGeometry(2.4, 0.28, 1.8);
    const slabMat = new THREE.MeshLambertMaterial({ color: 0xF7F2EB, flatShading: true });

    const stepGeo = new THREE.BoxGeometry(2.4, 0.38, 1.1);
    const stepMat = new THREE.MeshLambertMaterial({ color: 0xE8E0D5, flatShading: true });

    const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.4, 5);
    const postMat = new THREE.MeshLambertMaterial({ color: 0x3E3832, flatShading: true });

    const lanternGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
    const lanternMat = new THREE.MeshLambertMaterial({
      color: 0xFEF3C7,
      emissive: 0xF59E0B,
      emissiveIntensity: 1.25,
      flatShading: true
    });

    const slabRoutes = [
      // 1. Viela do Poente & Encostas Ocidentais (Conecta todos os lotes oeste ao mar e à colina)
      [
        { x: -75, z: 16 }, { x: -84, z: 8 }, { x: -88, z: -2 }, { x: -76, z: -12 },
        { x: -75, z: -25 }, { x: -84, z: -32 }, { x: -94, z: -32 }, { x: -96, z: -48 },
        { x: -84, z: -56 }, { x: -72, z: -62 }, { x: -60, z: -68 }, { x: -50, z: -70 }
      ],
      // 2. Escadaria Central da Colina Poente (Subida íngreme em degraus de concreto)
      [
        { x: -55, z: 4 }, { x: -58, z: -6 }, { x: -52, z: -16 }, { x: -44, z: -28 },
        { x: -54, z: -36 }, { x: -66, z: -60 }, { x: -70, z: -72 }, { x: -60, z: -85 }
      ],
      // 3. Viela da Prainha Extrema (Borda oeste do relevo - Alcança X = -135)
      [
        { x: -95, z: 12 },  { x: -105, z: 8 },  { x: -115, z: 8 },  { x: -125, z: -20 },
        { x: -135, z: -25 }, { x: -135, z: -75 }, { x: -125, z: -60 }, { x: -120, z: -85 },
        { x: -92, z: -72 }, { x: -80, z: -88 }
      ],
      // 4. Viela do Levante & Encostas Orientais (Conecta todos os lotes leste à várzea e à colina)
      [
        { x: 75, z: 16 }, { x: 84, z: 8 }, { x: 88, z: -2 }, { x: 76, z: -12 },
        { x: 75, z: -25 }, { x: 84, z: -32 }, { x: 94, z: -32 }, { x: 96, z: -48 },
        { x: 84, z: -56 }, { x: 72, z: -62 }, { x: 60, z: -68 }, { x: 50, z: -70 }
      ],
      // 5. Escadaria Central da Colina Levante (Subida íngreme em degraus de concreto)
      [
        { x: 55, z: 4 }, { x: 58, z: -6 }, { x: 52, z: -16 }, { x: 44, z: -28 },
        { x: 54, z: -36 }, { x: 66, z: -60 }, { x: 70, z: -72 }, { x: 60, z: -85 }
      ],
      // 6. Viela da Várzea Extrema (Borda leste do relevo - Alcança X = +135)
      [
        { x: 95, z: 12 },  { x: 105, z: 8 },  { x: 115, z: 8 },  { x: 125, z: -20 },
        { x: 135, z: -25 }, { x: 135, z: -75 }, { x: 125, z: -60 }, { x: 120, z: -85 },
        { x: 92, z: -72 }, { x: 80, z: -88 }
      ],
      // 7. Transversal Central-Oeste (conecta Morro do Sol ao Poente)
      [
        { x: -15, z: -18 }, { x: -28, z: -18 }, { x: -38, z: -15 }, { x: -48, z: -28 }, { x: -65, z: -38 }
      ],
      // 8. Transversal Central-Leste (conecta Morro do Sol ao Levante)
      [
        { x: 15, z: -18 }, { x: 28, z: -18 }, { x: 38, z: -15 }, { x: 48, z: -28 }, { x: 65, z: -38 }
      ],
      // 9. Transversal Alta da Serra (conecta a Serra aos flancos laterais)
      [
        { x: -18, z: -48 }, { x: -30, z: -52 }, { x: -45, z: -50 }, { x: -60, z: -55 }
      ],
      [
        { x: 18, z: -48 }, { x: 30, z: -52 }, { x: 45, z: -50 }, { x: 60, z: -55 }
      ],
      // 10. Estrada Panorâmica do Cume & Crista das Alturas
      [
        { x: -42, z: -82 }, { x: -32, z: -92 }, { x: -20, z: -94 }, { x: -10, z: -102 },
        { x: 0, z: -104 },
        { x: 10, z: -102 }, { x: 20, z: -94 }, { x: 32, z: -92 }, { x: 42, z: -82 }
      ],
      // 11. Escadaria da Crista Profunda & Cume Norte Extremo (Z até -132)
      [
        { x: -55, z: -120 }, { x: -45, z: -125 }, { x: -35, z: -132 }, { x: -20, z: -130 },
        { x: 0, z: -130 },   { x: 20, z: -130 },  { x: 35, z: -132 }, { x: 45, z: -125 }, { x: 55, z: -120 }
      ]
    ];

    const slabMatrices = [];
    const stepMatrices = [];
    const postMatrices = [];
    const lanternMatrices = [];
    const dummy = new THREE.Object3D();

    let globalStepCount = 0;

    slabRoutes.forEach(route => {
      for (let i = 0; i < route.length - 1; i++) {
        const p1 = route[i];
        const p2 = route[i + 1];
        const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        const heightDiff = Math.abs((this.terrain ? this.terrain.getElevation(p2.x, p2.z) : 0) - (this.terrain ? this.terrain.getElevation(p1.x, p1.z) : 0));
        // O segredo para não ter escada voadora: forçar muitos degraus se o tombo (heightDiff) for grande!
        const steps = Math.max(2, Math.ceil(heightDiff / 0.25), Math.ceil(dist / 1.0));
        const dx = (p2.x - p1.x) / steps;
        const dz = (p2.z - p1.z) / steps;
        const heading = Math.atan2(dx, dz);

        for (let s = 0; s < steps; s++) {
          globalStepCount++;
          const sx = p1.x + dx * s;
          const sz = p1.z + dz * s;
          
          // EVITAR SOBREPOSIÇÃO EM MONUMENTOS (Market, Olaria, Agroforest, Soccer, Samba) E CASAS
          const inSoccer = (Math.abs(sx - 55) < 13 && Math.abs(sz - 4) < 9);
          const inMarket = (Math.abs(sx - 75) < 10 && Math.abs(sz - 4) < 8);
          const inOlaria = (Math.abs(sx - (-22)) < 8 && Math.abs(sz - (-14)) < 6);
          const inAgro = (Math.abs(sx - 82) < 9 && Math.abs(sz - (-8)) < 6);
          const inSamba = (Math.hypot(sx - (-2), sz - (-4)) < 6);
          
          const inHouse = this.houses.some(h => Math.hypot(h.position.x - sx, h.position.z - sz) < 3.2);
          
          if (inSoccer || inMarket || inOlaria || inAgro || inSamba || inHouse) continue;

          const sy = this.terrain ? this.terrain.getElevation(sx, sz) : 2.5;

          const nextX = sx + dx * 0.5;
          const nextZ = sz + dz * 0.5;
          const nextY = this.terrain ? this.terrain.getElevation(nextX, nextZ) : sy;
          const deltaY = nextY - sy;
          const stepDist = Math.hypot(dx * 0.5, dz * 0.5);
          const slopeAngle = -Math.atan2(deltaY, stepDist);

          // If slope is steep, place a staircase step, otherwise a smooth slab paver
          if (Math.abs(deltaY) > 0.22) {
            dummy.position.set(sx, sy + 0.28, sz);
            dummy.rotation.set(Math.max(-0.4, Math.min(0.4, slopeAngle)), heading, 0);
            dummy.scale.set(1.0, 1.0, 1.0);
            dummy.updateMatrix();
            stepMatrices.push(dummy.matrix.clone());
          } else {
            dummy.position.set(sx, sy + 0.15, sz); // Laje mais rente ao chão
            dummy.rotation.set(Math.max(-0.35, Math.min(0.35, slopeAngle * 0.85)), heading, 0); // Rotaciona fielmente
            dummy.scale.set(1.0, 1.0, 1.0);
            dummy.updateMatrix();
            slabMatrices.push(dummy.matrix.clone());
          }

          // Place a solar lamppost every 7 steps along the viela
          if (globalStepCount % 7 === 0) {
            const sideOffset = 1.35;
            const px = sx + sideOffset * Math.cos(heading + Math.PI / 2);
            const pz = sz + sideOffset * Math.sin(heading + Math.PI / 2);
            const py = this.terrain ? this.terrain.getElevation(px, pz) : sy;

            // Post
            dummy.position.set(px, py + 1.2, pz);
            dummy.rotation.set(0, heading, 0);
            dummy.scale.set(1.0, 1.0, 1.0);
            dummy.updateMatrix();
            postMatrices.push(dummy.matrix.clone());

            // Lantern
            dummy.position.set(px, py + 2.45, pz);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1.0, 1.0, 1.0);
            dummy.updateMatrix();
            lanternMatrices.push(dummy.matrix.clone());
          }

          // Register node to prevent houses from spawning here
          this.infrastructureNodes.push({ x: sx, z: sz });
        }
      }
    });

    // 1. Instanced Slabs
    if (slabMatrices.length > 0) {
      const instancedSlabs = new THREE.InstancedMesh(slabGeo, slabMat, slabMatrices.length);
      instancedSlabs.receiveShadow = true;
      const baseColor = new THREE.Color(0xF5EFEB);
      const varColor = new THREE.Color();
      for (let i = 0; i < slabMatrices.length; i++) {
        instancedSlabs.setMatrixAt(i, slabMatrices[i]);
        const tint = (Math.sin(i * 1.9) * 0.04);
        varColor.copy(baseColor).addScalar(tint);
        instancedSlabs.setColorAt(i, varColor);
      }
      instancedSlabs.instanceMatrix.needsUpdate = true;
      if (instancedSlabs.instanceColor) instancedSlabs.instanceColor.needsUpdate = true;
      this.group.add(instancedSlabs);
      this.instancedSlabs = instancedSlabs;
    }

    // 2. Instanced Steps
    if (stepMatrices.length > 0) {
      const instancedSteps = new THREE.InstancedMesh(stepGeo, stepMat, stepMatrices.length);
      instancedSteps.receiveShadow = true;
      const baseStepColor = new THREE.Color(0xEAE3D8);
      const varStepColor = new THREE.Color();
      for (let i = 0; i < stepMatrices.length; i++) {
        instancedSteps.setMatrixAt(i, stepMatrices[i]);
        const tint = (Math.sin(i * 2.3) * 0.04);
        varStepColor.copy(baseStepColor).addScalar(tint);
        instancedSteps.setColorAt(i, varStepColor);
      }
      instancedSteps.instanceMatrix.needsUpdate = true;
      if (instancedSteps.instanceColor) instancedSteps.instanceColor.needsUpdate = true;
      this.group.add(instancedSteps);
      this.instancedSteps = instancedSteps;
    }

    // 3. Instanced Solar Lampposts
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

    // 4. Instanced Glowing Lanterns
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
      { x: 0, z: -104 }   // Torre de Rádio
    ];

    lampCoords.forEach(pos => {
      const lampGroup = new THREE.Group();
      const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 6;
      lampGroup.position.set(pos.x, y, pos.z);

      const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 3.5, 5);
      const poleMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 1.75;
      lampGroup.add(pole);

      const solarGeo = new THREE.BoxGeometry(0.8, 0.05, 0.6);
      const solarMat = new THREE.MeshLambertMaterial({ color: 0x1E3A8A });
      const solar = new THREE.Mesh(solarGeo, solarMat);
      solar.position.set(0, 3.55, 0);
      solar.rotation.x = 0.3;
      lampGroup.add(solar);

      const bulbGeo = new THREE.SphereGeometry(0.22, 6, 6);
      const bulbMat = new THREE.MeshLambertMaterial({
        color: 0xFFE066,
        emissive: 0xFFA200,
        emissiveIntensity: 0.2
      });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(0.3, 3.25, 0);
      lampGroup.add(bulb);

      const lampLight = new THREE.PointLight(0xFFA200, 0, 14);
      lampLight.position.set(0.3, 3.1, 0);
      lampGroup.add(lampLight);

      this.group.add(lampGroup);
      this.solarLamps.push({ bulbMat, lampLight });
    });
  }
};
