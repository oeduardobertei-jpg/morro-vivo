import * as THREE from 'three';

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

    // 1. Spawn the 4 Dedicated Beach Barraqueiros (stationed at their stalls)
    const barraqueiroConfigs = [
      { stallId: 'coco', title: 'Barraqueiro do Coco', name: 'Seu Baiano', x: -40, z: 42.8, color: 0x2D6A4F },
      { stallId: 'mate', title: 'Barraqueiro do Mate', name: 'Leandro do Mate', x: -10, z: 42.8, color: 0xF97316 },
      { stallId: 'acai', title: 'Barraqueiro do Açaí', name: 'Marcos Açaí', x: 20, z: 42.8, color: 0x7E22CE },
      { stallId: 'petiscos', title: 'Barraqueiro de Petiscos', name: 'Dona Cida', x: 50, z: 42.8, color: 0xDC2626 }
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
      { x: -92, z: 52 },
      { x: -40, z: 46 },
      { x: -10, z: 46 },
      { x: 20, z: 46 },
      { x: 50, z: 46 },
      { x: 78, z: 44 },
      { x: 98, z: 46 },
      { x: 116, z: 34 }
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
    if (mestreNPC.cityLegMat) mestreNPC.cityLegMat.color.setHex(0xF8FAFC);
    if (mestreNPC.leftLeg) mestreNPC.leftLeg.material.color.setHex(0xF8FAFC);
    if (mestreNPC.rightLeg) mestreNPC.rightLeg.material.color.setHex(0xF8FAFC);
    if (mestreNPC.torso) mestreNPC.torso.material.color.setHex(0xF1F5F9);
    const cordao = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.45), new THREE.MeshLambertMaterial({ color: 0xDC2626 }));
    cordao.position.set(0, 0.48, 0);
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
    if (donaNair.torso) donaNair.torso.material.color.setHex(0x16A34A);
    const strawHat = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 8), new THREE.MeshLambertMaterial({ color: 0xFDE047 }));
    strawHat.position.set(0, 1.45, 0);
    donaNair.group.add(strawHat);
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
    if (tiagoMoto.torso) tiagoMoto.torso.material.color.setHex(0xFACC15);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshLambertMaterial({ color: 0x2563EB }));
    helmet.position.set(0, 1.35, 0);
    tiagoMoto.group.add(helmet);
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
    const waxBlock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.18), new THREE.MeshLambertMaterial({ color: 0xFEF08A }));
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
    if (jonasCal.torso) jonasCal.torso.material.color.setHex(0x0F172A);
    this.npcs.push(jonasCal);
    
    // Os civis agora serão chamados um a um pela simulação! (Regra População / 10)
  },

  spawnNewCivilian() {
    // Teto de Vidro Visual (Performance): Limite máximo de 300 cidadãos simultâneos
    if (this.npcs.length >= 300) return;
    if (!this.waypoints) return;
    
    const civilianRoles = this.roles.filter(r => !r.title.startsWith('Barraqueiro') && r.title !== 'Banhista da Praia');
    
    if (this.civCount === undefined) this.civCount = 0;
    if (this.playerCount === undefined) this.playerCount = 0;
    
    const i = this.civCount++;
    const role = civilianRoles[i % civilianRoles.length];
    const name = this.firstNames[i % this.firstNames.length];

    let startNodeId = null;
    let targetNodeId = null;
    let startWp = null;
    let npcWaypoints = null;
    let team = null;

    if (role.title === 'Jogador da Pelada') {
      npcWaypoints = this.pitchWaypoints;
      startWp = this.pitchWaypoints[i % this.pitchWaypoints.length].clone();
      team = (this.playerCount % 2 === 0) ? 'yellow' : 'blue';
      this.playerCount++;
    } else {
      npcWaypoints = this.waypoints;
      // Seleciona um nó válido do grafo viário
      const spawnPool = (this.roadNodes && this.roadNodes.length > 0)
        ? this.roadNodes.filter(n => n.id !== 'sol_mirante')
        : [];
      if (spawnPool.length > 0) {
        const chosenNode = spawnPool[Math.floor(Math.random() * spawnPool.length)];
        startNodeId = chosenNode.id;
        startWp = chosenNode.position.clone();
        startWp.x += (Math.random() - 0.5) * 0.4;
        startWp.z += (Math.random() - 0.5) * 0.4;
        startWp.y = this.getFloorElevation(startWp.x, startWp.z);

        const nbrs = chosenNode.neighbors || [];
        targetNodeId = nbrs.length > 0 ? nbrs[Math.floor(Math.random() * nbrs.length)] : startNodeId;
      } else {
        startWp = (this.waypoints && this.waypoints[0]) ? this.waypoints[0].clone() : new THREE.Vector3(0, 0, 0);
      }
    }

    const npc = this.createNPCMesh(name, role, startWp, npcWaypoints, i, team);
    if (startNodeId) {
      npc.currentNodeId = startNodeId;
      npc.targetNodeId = targetNodeId;
      const tNode = (this.roadNodesMap && targetNodeId) ? this.roadNodesMap.get(targetNodeId) : null;
      if (tNode) {
        npc.targetPos = tNode.position.clone();
      }
    }
    this.npcs.push(npc);
  },

  createNPCMesh(name, role, startPos, waypoints, index, team = null, stallObj = null) {
    const npcGroup = new THREE.Group();
    npcGroup.position.copy(startPos);

    const isBanhista = (role.title === 'Banhista da Praia');
    const isBarraqueiro = role.title.startsWith('Barraqueiro');

    // Skin tones
    const skinPalette = [0x8D5524, 0x70411B, 0xC68642, 0xE0AC69, 0x5C381E];
    const skinColor = skinPalette[index % skinPalette.length];
    const headMat = new THREE.MeshLambertMaterial({ color: skinColor, flatShading: true });

    // Torso / Shirt Material
    let shirtColor = role.color;
    if (role.title === 'Jogador da Pelada' && team) {
      shirtColor = (team === 'yellow') ? 0xFACC15 : 0x0077B6;
    }

    // City vs Beach Torso Materials
    const cityTorsoMat = isBarraqueiro
      ? new THREE.MeshLambertMaterial({ color: 0xF3F4F6, flatShading: true })
      : new THREE.MeshLambertMaterial({ color: shirtColor, flatShading: true });

    const isBareChest = (index % 2 === 0);
    const topColors = [0x06B6D4, 0xF43F5E, 0xFACC15, 0x10B981, 0x8B5CF6];
    const beachTorsoMat = isBareChest
      ? headMat
      : new THREE.MeshLambertMaterial({ color: topColors[index % topColors.length], flatShading: true });

    const shirtGeo = new THREE.BoxGeometry(0.48, 0.65, 0.32);
    const torso = new THREE.Mesh(shirtGeo, cityTorsoMat);
    torso.position.y = 0.85;
    torso.castShadow = true;
    npcGroup.add(torso);

    // Front Apron for Barraqueiros
    if (isBarraqueiro) {
      let apronColor = 0x2D6A4F;
      if (role.stallId === 'mate') apronColor = 0xEA580C;
      else if (role.stallId === 'acai') apronColor = 0x7E22CE;
      else if (role.stallId === 'petiscos') apronColor = 0xF5F5F5;

      const apron = new THREE.Mesh(
        new THREE.BoxGeometry(0.49, 0.58, 0.05),
        new THREE.MeshLambertMaterial({ color: apronColor, flatShading: true })
      );
      apron.position.set(0, 0, 0.16);
      torso.add(apron);
    }

    // Arms (Left & Right)
    const armGeo = new THREE.BoxGeometry(0.12, 0.50, 0.12);
    const armMat = isBarraqueiro ? headMat : cityTorsoMat;
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.31, 0.88, 0);
    npcGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.31, 0.88, 0);
    npcGroup.add(rightArm);

    // Head
    const headGeo = new THREE.BoxGeometry(0.34, 0.36, 0.34);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.36;
    npcGroup.add(head);

    // Identificação de papéis profissionais especializados
    const isFishermanRole = role.title.includes('Pescador');
    const isFarmerRole = role.title.includes('Agricultor') || role.title.includes('Horta');
    const isMerchantRole = role.title.includes('Feirante');
    const isLighthouseRole = role.title.includes('Farol');

    // Hat / Visor / Cap (City hat & Uniformes Profissionais)
    let hat;
    if (isBarraqueiro) {
      if (role.stallId === 'coco') {
        const strawMat = new THREE.MeshLambertMaterial({ color: 0xD4A373, flatShading: true });
        hat = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, 0.12, 8), strawMat);
        hat.position.y = 1.58;
      } else {
        let visorColor = 0x15803D; // Green Matte Leão visor
        if (role.stallId === 'acai') visorColor = 0x06B6D4;
        else if (role.stallId === 'petiscos') visorColor = 0xDC2626;

        hat = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.10, 0.48),
          new THREE.MeshLambertMaterial({ color: visorColor })
        );
        hat.position.y = 1.58;
      }
      npcGroup.add(hat);
    } else if (isFishermanRole) {
      // Chapéu de palha de pescador caiçara tradicional com aba curva
      const fishStrawMat = new THREE.MeshLambertMaterial({ color: 0xD4A373, flatShading: true });
      hat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 0.14, 8), fishStrawMat);
      hat.position.y = 1.57;
      npcGroup.add(hat);
    } else if (isFarmerRole) {
      // Chapéu de palha rústico de aba larga da horta agroflorestal
      const farmStrawMat = new THREE.MeshLambertMaterial({ color: 0xCA8A04, flatShading: true });
      hat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.52, 0.12, 8), farmStrawMat);
      hat.position.y = 1.57;
      npcGroup.add(hat);
    } else if (isMerchantRole) {
      // Boina / boné verde da feira livre
      hat = new THREE.Mesh(
        new THREE.BoxGeometry(0.40, 0.10, 0.46),
        new THREE.MeshLambertMaterial({ color: 0x059669, flatShading: true })
      );
      hat.position.y = 1.58;
      npcGroup.add(hat);
    } else if (isLighthouseRole) {
      // Quepe náutico tradicional da marinha/farol
      const capGroup = new THREE.Group();
      const capCrown = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), new THREE.MeshLambertMaterial({ color: 0xF8FAFC }));
      capCrown.position.y = 1.60;
      capGroup.add(capCrown);
      const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.20), new THREE.MeshLambertMaterial({ color: 0x0F172A }));
      capVisor.position.set(0, 1.54, 0.24);
      capGroup.add(capVisor);
      hat = capGroup;
      npcGroup.add(hat);
    } else {
      hat = new THREE.Mesh(
        new THREE.BoxGeometry(0.40, 0.12, 0.44),
        new THREE.MeshLambertMaterial({ color: 0x1E293B })
      );
      hat.position.y = 1.58;
      npcGroup.add(hat);
    }

    // Acessório da Mão / Ofício (Cesto de peixes, horta, feira ou bebida refrescante)
    const handItem = new THREE.Group();
    handItem.position.set(-0.35, 0.65, 0.12);

    if (isFishermanRole) {
      // Cesto trançado com peixe fresco
      const basket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.14, 0.26, 6),
        new THREE.MeshLambertMaterial({ color: 0x78350F, flatShading: true })
      );
      handItem.add(basket);
      const fishTail = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.22, 4),
        new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: true })
      );
      fishTail.rotation.x = Math.PI;
      fishTail.position.set(0, 0.14, 0);
      handItem.add(fishTail);
      handItem.visible = true;
    } else if (isFarmerRole) {
      // Cesto de colheita com hortaliças frescas
      const basket = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.20, 0.24),
        new THREE.MeshLambertMaterial({ color: 0xA16207, flatShading: true })
      );
      handItem.add(basket);
      const greens = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.12, 0),
        new THREE.MeshLambertMaterial({ color: 0x16A34A, flatShading: true })
      );
      greens.position.set(0, 0.12, 0);
      handItem.add(greens);
      handItem.visible = true;
    } else if (isMerchantRole) {
      // Caixote de feira comunitária
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.22, 0.28),
        new THREE.MeshLambertMaterial({ color: 0x854D0E, flatShading: true })
      );
      handItem.add(crate);
      const fruit = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.10, 0),
        new THREE.MeshLambertMaterial({ color: 0xEA580C, flatShading: true })
      );
      fruit.position.set(0, 0.12, 0);
      handItem.add(fruit);
      handItem.visible = true;
    } else {
      // Copo de mate gelado / coco verde adquirido nas barracas (ativado na compra)
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.06, 0.20, 6),
        new THREE.MeshLambertMaterial({ color: 0x10B981, flatShading: true })
      );
      handItem.add(cup);
      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.26, 4),
        new THREE.MeshBasicMaterial({ color: 0xFEF08A })
      );
      straw.position.set(0.02, 0.12, 0);
      straw.rotation.z = -0.2;
      handItem.add(straw);
      handItem.visible = false;
    }
    npcGroup.add(handItem);

    // Beach Accessories Group (Sunglasses, straw sun visor, beach towel)
    const beachAccGroup = new THREE.Group();

    // Sunglasses
    const shades = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.08, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x111111 })
    );
    shades.position.set(0, 1.36, 0.16);
    beachAccGroup.add(shades);

    // Straw sun visor
    const strawMat = new THREE.MeshLambertMaterial({ color: 0xD4A373, flatShading: true });
    const sunVisor = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.44, 0.10, 8), strawMat);
    sunVisor.position.y = 1.58;
    beachAccGroup.add(sunVisor);

    // Beach towel draped over shoulder for some bathers
    if (index % 3 === 0) {
      const towelMat = new THREE.MeshLambertMaterial({
        color: [0xF59E0B, 0x10B981, 0xEC4899, 0x3B82F6][index % 4],
        flatShading: true
      });
      const towel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, 0.34), towelMat);
      towel.position.set(0.26, 0.88, 0);
      beachAccGroup.add(towel);
    }
    beachAccGroup.visible = false;
    npcGroup.add(beachAccGroup);

    // Yellow Safety Hard Hat (Capacete amarelo de obra para quando trabalhar)
    const helmetGroup = new THREE.Group();
    const helmetMat = new THREE.MeshLambertMaterial({ color: 0xFACC15, flatShading: true });
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.44), helmetMat);
    crown.position.y = 1.62;
    helmetGroup.add(crown);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.04, 0.52), helmetMat);
    brim.position.y = 1.54;
    helmetGroup.add(brim);
    helmetGroup.visible = false;
    npcGroup.add(helmetGroup);

    // Worker Tool Arm
    const toolArm = new THREE.Group();
    toolArm.position.set(0.32, 1.05, 0);
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.72, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x5C4033 })
    );
    handle.position.y = -0.12;
    toolArm.add(handle);
    const pickHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.09, 0.09),
      new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: true })
    );
    pickHead.position.y = 0.22;
    toolArm.add(pickHead);
    toolArm.visible = false;
    npcGroup.add(toolArm);

    // Pushcart / Wheelbarrow
    const cartGroup = new THREE.Group();
    cartGroup.position.set(0, 0.38, 0.85);
    const tub = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.36, 0.90),
      new THREE.MeshLambertMaterial({ color: 0x6C4A2D, flatShading: true })
    );
    tub.position.y = 0.18;
    cartGroup.add(tub);
    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const cartWheel = new THREE.Mesh(wheelGeo, new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true }));
    cartWheel.position.set(0, 0.02, 0.52);
    cartGroup.add(cartWheel);
    const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.65), tub.material);
    handleL.position.set(-0.32, 0.35, -0.65);
    cartGroup.add(handleL);
    const handleR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.65), tub.material);
    handleR.position.set(0.32, 0.35, -0.65);
    cartGroup.add(handleR);
    const brickCargo = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.24, 0.70),
      new THREE.MeshLambertMaterial({ color: 0xB55338, flatShading: true })
    );
    brickCargo.position.y = 0.32;
    cartGroup.add(brickCargo);
    cartGroup.visible = false;
    npcGroup.add(cartGroup);

    // City Pants vs Beach Sunga / Boardshorts
    const cityLegColor = isBarraqueiro ? 0x4B5563 : 0x2B2D42;
    const cityLegMat = new THREE.MeshLambertMaterial({ color: cityLegColor, flatShading: true });

    const isSunga = (index % 2 === 1);
    const boardshortColors = [0x0284C7, 0x10B981, 0xF97316, 0xEC4899];
    const beachLegColor = isSunga ? skinColor : boardshortColors[index % boardshortColors.length];
    const beachLegMat = new THREE.MeshLambertMaterial({ color: beachLegColor, flatShading: true });

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.20), cityLegMat);
    leftLeg.position.set(-0.13, 0.29, 0);
    npcGroup.add(leftLeg);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.20), cityLegMat);
    rightLeg.position.set(0.13, 0.29, 0);
    npcGroup.add(rightLeg);

    let sungaBrief = null;
    if (isSunga) {
      const sungaColor = [0xEF4444, 0x06B6D4, 0x8B5CF6, 0x10B981][index % 4];
      sungaBrief = new THREE.Mesh(
        new THREE.BoxGeometry(0.49, 0.20, 0.33),
        new THREE.MeshLambertMaterial({ color: sungaColor, flatShading: true })
      );
      sungaBrief.position.set(0, 0.53, 0);
      sungaBrief.visible = false;
      npcGroup.add(sungaBrief);
    }

    this.group.add(npcGroup);

    const targetIdx = (index + 2) % (waypoints.length || 1);
    const target = waypoints.length > 0 ? waypoints[targetIdx].clone() : startPos.clone();

    return {
      id: `npc_${index}`,
      name: `${name} (${role.title}${team ? (team === 'yellow' ? ' - Amarelo' : ' - Azul') : ''})`,
      citizenName: name,
      role: role.title,
      originalAction: role.action,
      currentAction: role.action,
      group: npcGroup,
      torso,
      head,
      leftArm,
      rightArm,
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
      cityTorsoMat,
      beachTorsoMat,
      cityLegMat,
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
      npc.leftLeg.material = npc.beachLegMat;
      npc.rightLeg.material = npc.beachLegMat;
      if (npc.sungaBrief) npc.sungaBrief.visible = true;
      if (npc.beachAccGroup) npc.beachAccGroup.visible = true;
      if (npc.hat) npc.hat.visible = false;
    } else if (!isBeach && npc.isWearingBeachwear) {
      npc.isWearingBeachwear = false;
      npc.torso.material = npc.cityTorsoMat;
      npc.leftLeg.material = npc.cityLegMat;
      npc.rightLeg.material = npc.cityLegMat;
      if (npc.sungaBrief) npc.sungaBrief.visible = false;
      if (npc.beachAccGroup) npc.beachAccGroup.visible = false;
      if (npc.hat) npc.hat.visible = true;
    }
  }
};
