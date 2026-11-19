import * as THREE from 'three';

/** Centro e várzea: samba, futebol, feira, horta agroflorestal e usina solar. */
export const CommunityMixin = {
  createAgroforestFarm(pos) {
    const farmGroup = new THREE.Group();
    // Apoiado diretamente no terreno plano esculpido (sem base)
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) + 0.1 : 5.2;
    farmGroup.position.set(pos.x, y, pos.z);

    // Terreno plano recebe apenas os canteiros!
    const soilMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });
    const cropMat1 = new THREE.MeshLambertMaterial({ color: 0x2E7D32, flatShading: true });
    const cropMat2 = new THREE.MeshLambertMaterial({ color: 0x558B2F, flatShading: true });

    for (let r = 0; r < 4; r++) {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(10, 0.35, 1.6), soilMat);
      bed.position.set(0, 0.28, -3.5 + r * 2.4);
      farmGroup.add(bed);

      // Vegetable crops
      const cMat = (r % 2 === 0 ? cropMat1 : cropMat2);
      for (let c = -4; c <= 4; c += 1.2) {
        const plant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), cMat);
        plant.position.set(c, 0.5, -3.5 + r * 2.4);
        farmGroup.add(plant);
      }
    }

    // Wooden tool shed & lumber storage for scaffolding
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5D4037, flatShading: true });
    const shed = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 3.0), woodMat);
    shed.position.set(-6.5, 1.2, 0);
    shed.castShadow = true;
    farmGroup.add(shed);

    // Stacked lumber poles (madeiras para andaimes)
    const lumberMat = new THREE.MeshLambertMaterial({ color: 0x8C7456 });
    for (let l = 0; l < 3; l++) {
      const log = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 0.2), lumberMat);
      log.position.set(6.0, 0.2 + l * 0.22, 0);
      farmGroup.add(log);
    }

    this.group.add(farmGroup);
    this.agroFarm = farmGroup;
  },

  createCulturalMarket(pos) {
    const marketGroup = new THREE.Group();
    // Apoiado diretamente no terreno plano esculpido (sem base)
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) + 0.1 : 4.1;
    marketGroup.position.set(pos.x, y, pos.z);

    const stallColors = [0xE63946, 0xFFB703, 0x2A9D8F, 0x9B5DE5];
    for (let s = 0; s < 4; s++) {
      const stallGeo = new THREE.BoxGeometry(2.8, 2.2, 2.2);
      const stallMat = new THREE.MeshLambertMaterial({ color: stallColors[s], flatShading: true });
      const stall = new THREE.Mesh(stallGeo, stallMat);
      stall.position.set(-6 + s * 4, 1.1, 0);
      stall.castShadow = true;
      marketGroup.add(stall);
    }

    this.group.add(marketGroup);
  },

  createSoccerField(pos) {
    const pitchGroup = new THREE.Group();
    // Apoiado sobre o platô nivelado com firmeza
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) + 0.1 : 3.6;
    pitchGroup.position.set(pos.x, y, pos.z);

    // 1. Embasamento Estrutural e Fundação Sólida (elimina flutuação no ar)
    const stoneBaseMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x64748B, flatShading: true });

    // Plinto/Plataforma de fundação que ancora o campo no terreno
    const foundationGeo = new THREE.BoxGeometry(23.2, 1.4, 15.2);
    const foundation = new THREE.Mesh(foundationGeo, stoneBaseMat);
    foundation.position.set(0, -0.62, 0);
    foundation.receiveShadow = true;
    pitchGroup.add(foundation);

    // Pilares de concreto estendidos na borda frontal (Sul) onde o terreno desce
    [-10.5, -5.5, 0, 5.5, 10.5].forEach(px => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 3.8, 6), concreteMat);
      pillar.position.set(px, -1.8, 7.3);
      pillar.receiveShadow = true;
      pitchGroup.add(pillar);
    });

    // 2. Muro de Arrimo e Contenção (Norte / Fundo do morro)
    // Segura a encosta da montanha impedindo que a terra invada o gramado
    const northRetainingWall = new THREE.Mesh(new THREE.BoxGeometry(23.4, 1.8, 0.6), wallMat);
    northRetainingWall.position.set(0, 0.85, -7.4);
    northRetainingWall.castShadow = true;
    northRetainingWall.receiveShadow = true;
    pitchGroup.add(northRetainingWall);

    // Muro de arrimo lateral oeste (em direção à subida)
    const westRetainingWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 7.6), wallMat);
    westRetainingWall.position.set(-11.5, 0.85, -3.8);
    westRetainingWall.castShadow = true;
    pitchGroup.add(westRetainingWall);

    // 3. Superfície do Gramado de Terra Batida Carioca (compactada e nivelada)
    const pitchGeo = new THREE.BoxGeometry(22.4, 0.18, 14.4);
    const pitchMat = new THREE.MeshLambertMaterial({ color: 0x8C6544, flatShading: true });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.position.set(0, 0.09, 0);
    pitch.receiveShadow = true;
    pitchGroup.add(pitch);

    // 4. Linhas de Cal Branca Regulamentares
    const lineMat = new THREE.MeshLambertMaterial({ color: 0xE2E8F0 });
    const midLine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.20, 14.2), lineMat);
    midLine.position.set(0, 0.10, 0);
    pitchGroup.add(midLine);

    const circleGeo = new THREE.RingGeometry(2.4, 2.52, 16);
    circleGeo.rotateX(-Math.PI / 2);
    const centerCircle = new THREE.Mesh(circleGeo, lineMat);
    centerCircle.position.set(0, 0.20, 0);
    pitchGroup.add(centerCircle);

    const centerSpot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.20, 8), lineMat);
    centerSpot.position.set(0, 0.10, 0);
    pitchGroup.add(centerSpot);

    // Linhas das grandes áreas
    [-11.1, 11.1].forEach(gx => {
      const boxDepth = 7.0;
      const boxWidth = 3.6;
      const sideLine = new THREE.Mesh(new THREE.BoxGeometry(boxWidth, 0.20, 0.1), lineMat);
      sideLine.position.set(gx > 0 ? gx - boxWidth / 2 : gx + boxWidth / 2, 0.10, -boxDepth / 2);
      pitchGroup.add(sideLine);
      const sideLine2 = sideLine.clone();
      sideLine2.position.z = boxDepth / 2;
      pitchGroup.add(sideLine2);
      const frontLine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.20, boxDepth), lineMat);
      frontLine.position.set(gx > 0 ? gx - boxWidth : gx + boxWidth, 0.10, 0);
      pitchGroup.add(frontLine);
    });

    // 5. Alambrado de Proteção Completo com Telas e Postes
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const netFenceMat = new THREE.MeshLambertMaterial({ color: 0x94A3B8, wireframe: true, transparent: true, opacity: 0.35 });
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.6, 4);

    // Postes Norte e Sul
    for (let px = -11.2; px <= 11.2; px += 3.73) {
      const postN = new THREE.Mesh(postGeo, fenceMat);
      postN.position.set(px, 1.3, -7.15);
      pitchGroup.add(postN);
      const postS = new THREE.Mesh(postGeo, fenceMat);
      postS.position.set(px, 1.3, 7.15);
      pitchGroup.add(postS);
    }
    // Postes Leste e Oeste
    [-11.2, 11.2].forEach(px => {
      for (let pz = -4.8; pz <= 4.8; pz += 3.2) {
        const postE = new THREE.Mesh(postGeo, fenceMat);
        postE.position.set(px, 1.3, pz);
        pitchGroup.add(postE);
      }
    });

    // Travessas Superiores do Alambrado
    const railMat = new THREE.MeshLambertMaterial({ color: 0x64748B });
    const railNorth = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.06, 0.06), railMat);
    railNorth.position.set(0, 2.55, -7.15);
    pitchGroup.add(railNorth);
    const railSouth = railNorth.clone();
    railSouth.position.z = 7.15;
    pitchGroup.add(railSouth);

    // Painéis de Tela do Alambrado (Semitransparentes)
    const netPanelNorth = new THREE.Mesh(new THREE.BoxGeometry(22.4, 2.3, 0.02), netFenceMat);
    netPanelNorth.position.set(0, 1.35, -7.15);
    pitchGroup.add(netPanelNorth);
    const netPanelSouth = netPanelNorth.clone();
    netPanelSouth.position.z = 7.15;
    pitchGroup.add(netPanelSouth);

    // 6. Traves de Gol com Redes Artísticas
    const goalMat = new THREE.MeshLambertMaterial({ color: 0xF1F5F9 });
    const createGoal = (gx) => {
      const gGroup = new THREE.Group();
      gGroup.position.x = gx;

      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 4), goalMat);
      p1.position.set(0, 1.0, -1.9);
      gGroup.add(p1);

      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 4), goalMat);
      p2.position.set(0, 1.0, 1.9);
      gGroup.add(p2);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.88), goalMat);
      bar.position.set(0, 2.0, 0);
      gGroup.add(bar);

      const netBox = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.9, 3.8),
        new THREE.MeshLambertMaterial({ color: 0xCBD5E1, wireframe: true, transparent: true, opacity: 0.45 })
      );
      netBox.position.set(gx > 0 ? 0.7 : -0.7, 0.95, 0);
      gGroup.add(netBox);

      return gGroup;
    };

    pitchGroup.add(createGoal(-10.8));
    pitchGroup.add(createGoal(10.8));

    // 7. Bancos de Reservas com Toldo (Lateral Sul)
    const benchWoodMat = new THREE.MeshLambertMaterial({ color: 0x78350F, flatShading: true });
    const createDugout = (dx, colorHex) => {
      const dGroup = new THREE.Group();
      dGroup.position.set(dx, 0, 8.1);

      // Banco
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.5), benchWoodMat);
      seat.position.set(0, 0.42, 0);
      dGroup.add(seat);

      // Toldo de proteção
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.08, 1.1),
        new THREE.MeshLambertMaterial({ color: colorHex, flatShading: true })
      );
      canopy.position.set(0, 1.85, 0.1);
      canopy.rotation.x = 0.15;
      dGroup.add(canopy);

      // Hastes de suporte
      [-1.15, 1.15].forEach(hx => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.85, 4), fenceMat);
        pole.position.set(hx, 0.92, -0.3);
        dGroup.add(pole);
      });

      return dGroup;
    };

    pitchGroup.add(createDugout(-4.5, 0xFACC15)); // Time Amarelo Canário
    pitchGroup.add(createDugout(4.5, 0x0284C7));  // Time Azul Guanabara

    // 8. Refletores Solares nos 4 Cantos (Iluminação Noturna da Pelada)
    const cornerOffsets = [
      { x: -11.2, z: -7.2 },
      { x: 11.2,  z: -7.2 },
      { x: -11.2, z: 7.2 },
      { x: 11.2,  z: 7.2 }
    ];
    cornerOffsets.forEach(co => {
      const lightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 4.2, 4), fenceMat);
      lightPost.position.set(co.x, 2.1, co.z);
      pitchGroup.add(lightPost);

      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3), concreteMat);
      lampHead.position.set(co.x, 4.25, co.z);
      pitchGroup.add(lampHead);

      const bulb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xFEF08A }));
      bulb.position.set(co.x + (co.x > 0 ? -0.15 : 0.15), 4.15, co.z + (co.z > 0 ? -0.15 : 0.15));
      pitchGroup.add(bulb);
    });

    // 9. Bola da Pelada (física e interatividade)
    const ballGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const ballMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, flatShading: true });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    const ballY = y + 0.28;
    ball.position.set(pos.x, ballY, pos.z);
    ball.castShadow = true;
    this.group.add(ball);

    this.soccerBall = ball;
    this.soccerBallBaseY = ballY;
    this.soccerPitchPos = pos;
    this.group.add(pitchGroup);
  },

  kickSoccerBall(dirX, dirZ, force = 6.5) {
    if (!this.soccerBall) return;
    this.soccerBallVel.x = dirX * force;
    this.soccerBallVel.z = dirZ * force;
    this.soccerBallIdleTimer = 0;
    if (this.soundtrack) {
      this.soundtrack.playSoccerKick(this.soccerBall.position);
    }
  },

  createSambaPlaza(pos) {
    const plazaGroup = new THREE.Group();
    // Apoiado diretamente no terreno
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) + 0.1 : 14.1;
    plazaGroup.position.set(pos.x, y, pos.z);

    // 1. Embasamento de Arrimo e Cantaria (ancora a praça sem nenhuma fresta ou flutuação)
    const stoneBaseMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
    const stoneTrimMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });
    const baseGeo = new THREE.CylinderGeometry(9.1, 9.35, 1.2, 32);
    const baseMesh = new THREE.Mesh(baseGeo, stoneBaseMat);
    baseMesh.position.set(0, -0.5, 0);
    baseMesh.receiveShadow = true;
    plazaGroup.add(baseMesh);

    // Friso de Cantaria na borda
    const trimGeo = new THREE.TorusGeometry(9.1, 0.14, 8, 32);
    const trimMesh = new THREE.Mesh(trimGeo, stoneTrimMat);
    trimMesh.rotation.x = Math.PI / 2;
    trimMesh.position.set(0, 0.12, 0);
    plazaGroup.add(trimMesh);

    // 2. Tablado Principal em Terracota e Madeira Nobre (Cálido, Festivo e Acolhedor)
    const topGeo = new THREE.CylinderGeometry(9.0, 9.0, 0.22, 32);
    const terracotaMat = new THREE.MeshLambertMaterial({ color: 0xB85D3F, flatShading: true });
    const top = new THREE.Mesh(topGeo, terracotaMat);
    top.position.set(0, 0.11, 0);
    top.receiveShadow = true;
    plazaGroup.add(top);

    // Roda de Dança Central em Deck de Madeira Circular
    const danceRingGeo = new THREE.CylinderGeometry(6.4, 6.4, 0.25, 32);
    const woodDeckMat = new THREE.MeshLambertMaterial({ color: 0x7A4E32, flatShading: true });
    const danceRing = new THREE.Mesh(danceRingGeo, woodDeckMat);
    danceRing.position.set(0, 0.13, 0);
    danceRing.receiveShadow = true;
    plazaGroup.add(danceRing);

    // Friso em Madeira Escurecida delimitando a roda de samba
    const woodTrimGeo = new THREE.TorusGeometry(6.4, 0.09, 6, 32);
    const woodTrim = new THREE.Mesh(woodTrimGeo, darkWoodMat);
    woodTrim.rotation.x = Math.PI / 2;
    woodTrim.position.set(0, 0.26, 0);
    plazaGroup.add(woodTrim);

    // Círculo de Cantaria Central da Fogueira
    const hearthRingGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.28, 24);
    const hearthMesh = new THREE.Mesh(hearthRingGeo, stoneTrimMat);
    hearthMesh.position.set(0, 0.14, 0);
    hearthMesh.receiveShadow = true;
    plazaGroup.add(hearthMesh);

    // 3. Soleira Monumental de Transição NORTE (Conexão direta com a Alameda do Samba)
    const thresholdMat = new THREE.MeshLambertMaterial({ color: 0xB85D3F, flatShading: true });
    const threshold = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.24, 2.0), thresholdMat);
    threshold.position.set(0, 0.12, -8.8);
    threshold.receiveShadow = true;
    plazaGroup.add(threshold);

    const threshTrim = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.12, 0.2), stoneTrimMat);
    threshTrim.position.set(0, 0.24, -9.7);
    plazaGroup.add(threshTrim);

    // 4. Pórtico Monumental "Terreiro da Colina" voltado para o NORTE (Alameda Superior)
    const porticoMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });
    const postGeo = new THREE.CylinderGeometry(0.16, 0.18, 4.4, 6);
    
    // Pilares Frontais do Pórtico (Entrada Norte)
    const pylonLeft = new THREE.Mesh(postGeo, porticoMat);
    pylonLeft.position.set(-3.2, 2.2, -8.8);
    plazaGroup.add(pylonLeft);
    const pylonRight = new THREE.Mesh(postGeo, porticoMat);
    pylonRight.position.set(3.2, 2.2, -8.8);
    plazaGroup.add(pylonRight);

    // Pilares Traseiros para suporte de pérgola
    const pylonBackL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.4, 6), porticoMat);
    pylonBackL.position.set(-3.2, 2.2, -8.0);
    plazaGroup.add(pylonBackL);
    const pylonBackR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.4, 6), porticoMat);
    pylonBackR.position.set(3.2, 2.2, -8.0);
    plazaGroup.add(pylonBackR);

    // Travessas Superiores do Pórtico
    const crossBeamFront = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.2, 0.2), porticoMat);
    crossBeamFront.position.set(0, 4.3, -8.8);
    plazaGroup.add(crossBeamFront);
    const crossBeamBack = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.2, 0.2), porticoMat);
    crossBeamBack.position.set(0, 4.3, -8.0);
    plazaGroup.add(crossBeamBack);

    // Ripas transversais da pérgola
    for (let rx = -3.0; rx <= 3.0; rx += 0.85) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.4), porticoMat);
      rib.position.set(rx, 4.45, -8.4);
      plazaGroup.add(rib);
    }

    // Lanternas Coloniais Douradas no Pórtico
    [-3.2, 3.2].forEach(lx => {
      const lanternArm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), darkWoodMat);
      lanternArm.position.set(lx > 0 ? lx - 0.25 : lx + 0.25, 3.8, -8.8);
      plazaGroup.add(lanternArm);

      const lanternBulb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), new THREE.MeshBasicMaterial({ color: 0xFFD700 }));
      lanternBulb.position.set(lx > 0 ? lx - 0.5 : lx + 0.5, 3.65, -8.8);
      plazaGroup.add(lanternBulb);
    });

    // Fitinhas do Bonfim esvoaçantes suspensas na viga frontal
    const ribbonColors = [0xEF4444, 0x10B981, 0x06B6D4, 0xFBBF24, 0xEC4899, 0x8B5CF6, 0xFFFFFF];
    const ribbonGeo = new THREE.BoxGeometry(0.04, 0.75, 0.02);
    for (let r = 0; r < 24; r++) {
      const rx = -2.8 + (r / 23) * 5.6;
      const rMat = new THREE.MeshLambertMaterial({ color: ribbonColors[r % ribbonColors.length] });
      const ribbon = new THREE.Mesh(ribbonGeo, rMat);
      ribbon.position.set(rx, 3.75 - (r % 3) * 0.08, -8.8 + (Math.sin(r * 1.5) * 0.04));
      ribbon.rotation.z = Math.sin(r * 2.1) * 0.15;
      plazaGroup.add(ribbon);
    }

    // 5. Guarda-Corpo no Perímetro & O Grande Mirante Sul voltado para o Mar
    const potGeo = new THREE.CylinderGeometry(0.34, 0.24, 0.58, 6);
    const potMat = new THREE.MeshLambertMaterial({ color: 0x8D6E63 });
    const leafGeo = new THREE.DodecahedronGeometry(0.42, 0);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2D6A4F });
    const flowerGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const flowerMatRed = new THREE.MeshLambertMaterial({ color: 0xEF4444 });
    const flowerMatYellow = new THREE.MeshLambertMaterial({ color: 0xFBBF24 });

    const numSections = 18;
    for (let s = 0; s < numSections; s++) {
      const ang = (s / numSections) * Math.PI * 2;
      // Pular entrada Norte (z < -7.0, onde chega a Alameda do Samba, em torno de 3*PI/2 = 4.71 rad)
      if (ang > 4.30 && ang < 5.15) continue;

      const bx = Math.cos(ang) * 8.8;
      const bz = Math.sin(ang) * 8.8;

      // Mureta de Cantaria Baixa
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.35), stoneBaseMat);
      wallMesh.position.set(bx, 0.4, bz);
      wallMesh.rotation.y = -ang + Math.PI / 2;
      plazaGroup.add(wallMesh);

      // Friso Superior de Madeira Rústica
      const railMesh = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 0.38), darkWoodMat);
      railMesh.position.set(bx, 0.7, bz);
      railMesh.rotation.y = -ang + Math.PI / 2;
      plazaGroup.add(railMesh);

      // Vaso Decorativo com Flores a cada 2 seções
      if (s % 2 === 0) {
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.position.set(bx * 0.94, 0.5, bz * 0.94);
        plazaGroup.add(pot);

        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(bx * 0.94, 0.88, bz * 0.94);
        plazaGroup.add(leaf);

        const flower = new THREE.Mesh(flowerGeo, (s % 4 === 0) ? flowerMatRed : flowerMatYellow);
        flower.position.set(bx * 0.94, 1.08, bz * 0.94);
        plazaGroup.add(flower);
      }
    }

    // Bancos de Contemplação no Mirante Sul (voltados para a vista panorâmica do oceano)
    [
      { x: -3.4, z: 6.8, rot: 0 },
      { x: 3.4,  z: 6.8, rot: 0 }
    ].forEach(mBench => {
      const mbGroup = new THREE.Group();
      mbGroup.position.set(mBench.x, 0.24, mBench.z);
      mbGroup.rotation.y = mBench.rot;

      const mSeat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.52), darkWoodMat);
      mSeat.position.y = 0.35;
      mbGroup.add(mSeat);

      [-0.8, 0.8].forEach(lx => {
        const mLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.42), darkWoodMat);
        mLeg.position.set(lx, 0.175, 0);
        mbGroup.add(mLeg);
      });

      const mBack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 0.08), darkWoodMat);
      mBack.position.set(0, 0.65, -0.22);
      mbGroup.add(mBack);

      plazaGroup.add(mbGroup);
    });

    // 6. Instrumentos Musicais Cenográficos de Samba & Engradados de Bebidas
    // A) Atabaques Tradicionais (2 tambores de solo)
    const atabaqueWoodMat = new THREE.MeshLambertMaterial({ color: 0x5D4037, flatShading: true });
    const atabaqueHeadMat = new THREE.MeshLambertMaterial({ color: 0xFEF3C7, flatShading: true });
    const atabaqueRimMat = new THREE.MeshLambertMaterial({ color: 0xCBD5E1, flatShading: true });

    [
      { x: -3.6, z: -1.8, rot: 0.3 },
      { x: 3.6,  z: -1.8, rot: -0.3 }
    ].forEach(atPos => {
      const atGroup = new THREE.Group();
      atGroup.position.set(atPos.x, 0.22, atPos.z);
      atGroup.rotation.y = atPos.rot;

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.14, 0.88, 10), atabaqueWoodMat);
      body.position.y = 0.44;
      atGroup.add(body);

      const drumHead = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.04, 10), atabaqueHeadMat);
      drumHead.position.y = 0.89;
      atGroup.add(drumHead);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 4, 10), atabaqueRimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.87;
      atGroup.add(rim);

      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.18, 0.22, 4), darkWoodMat);
      stand.position.y = 0.1;
      atGroup.add(stand);

      plazaGroup.add(atGroup);
    });

    // B) Surdos de Samba (2 surdos de marcação)
    const surdoShellMat1 = new THREE.MeshLambertMaterial({ color: 0x16A34A, flatShading: true });
    const surdoShellMat2 = new THREE.MeshLambertMaterial({ color: 0xEAB308, flatShading: true });
    [
      { x: -2.8, z: -3.8, mat: surdoShellMat1, rot: 0.5 },
      { x: 2.8,  z: -3.8, mat: surdoShellMat2, rot: -0.5 }
    ].forEach((surdoPos) => {
      const sGroup = new THREE.Group();
      sGroup.position.set(surdoPos.x, 0.24, surdoPos.z);
      sGroup.rotation.y = surdoPos.rot;

      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.65, 12), surdoPos.mat);
      shell.position.y = 0.48;
      sGroup.add(shell);

      [-0.15, 0.15].forEach(dy => {
        const sRim = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.02, 4, 12), atabaqueRimMat);
        sRim.rotation.x = Math.PI / 2;
        sRim.position.y = 0.48 + dy * 2.0;
        sGroup.add(sRim);
      });

      const dHead = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.365, 0.03, 12), atabaqueHeadMat);
      dHead.position.y = 0.81;
      sGroup.add(dHead);

      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 4), darkWoodMat);
      stick.rotation.z = 0.4;
      stick.position.set(0.3, 0.75, 0);
      sGroup.add(stick);

      plazaGroup.add(sGroup);
    });

    // C) Pandeiros sobre os bancos
    const pandeiroGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.03, 8);
    const pandeiroMat = new THREE.MeshLambertMaterial({ color: 0xF5F5F4, flatShading: true });
    [
      { x: -4.3, z: 0.8, rot: 0.4 },
      { x: 4.1,  z: 1.2, rot: -0.3 }
    ].forEach(pnd => {
      const pMesh = new THREE.Mesh(pandeiroGeo, pandeiroMat);
      pMesh.position.set(pnd.x, 0.68, pnd.z);
      pMesh.rotation.x = 0.2;
      pMesh.rotation.y = pnd.rot;
      plazaGroup.add(pMesh);
    });

    // D) Engradados de Bebidas (Estilo Boteco Carioca)
    const crateGeo = new THREE.BoxGeometry(0.5, 0.32, 0.4);
    const crateYellowMat = new THREE.MeshLambertMaterial({ color: 0xF59E0B, flatShading: true });
    const crateRedMat = new THREE.MeshLambertMaterial({ color: 0xDC2626, flatShading: true });
    const bottleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.24, 4);
    const bottleMat = new THREE.MeshLambertMaterial({ color: 0x65A30D });

    [
      { x: -4.8, z: 3.5, mat: crateYellowMat },
      { x: -4.8, z: 3.95, mat: crateRedMat },
      { x: 4.8,  z: 3.5, mat: crateYellowMat }
    ].forEach(cPos => {
      const crate = new THREE.Mesh(crateGeo, cPos.mat);
      crate.position.set(cPos.x, 0.4, cPos.z);
      plazaGroup.add(crate);

      for (let gx = -0.15; gx <= 0.15; gx += 0.15) {
        for (let gz = -0.1; gz <= 0.1; gz += 0.2) {
          const bottle = new THREE.Mesh(bottleGeo, bottleMat);
          bottle.position.set(cPos.x + gx, 0.6, cPos.z + gz);
          plazaGroup.add(bottle);
        }
      }
    });

    // 7. Fogueira Central Majestosa com Pedras e Lenha
    const stoneRingGeo = new THREE.TorusGeometry(1.1, 0.18, 6, 12);
    const stoneRing = new THREE.Mesh(stoneRingGeo, stoneTrimMat);
    stoneRing.rotation.x = Math.PI / 2;
    stoneRing.position.set(0, 0.28, 0);
    plazaGroup.add(stoneRing);

    const logGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6);
    for (let l = 0; l < 4; l++) {
      const log = new THREE.Mesh(logGeo, darkWoodMat);
      log.rotation.x = Math.PI / 2;
      log.rotation.z = (l * Math.PI) / 4;
      log.position.set(0, 0.35, 0);
      plazaGroup.add(log);
    }

    const fireGeo = new THREE.DodecahedronGeometry(0.85, 0);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xFF4500 });
    const fire = new THREE.Mesh(fireGeo, fireMat);
    fire.position.set(0, 0.9, 0);
    plazaGroup.add(fire);
    this.sambaFire = fire;

    const fireInner = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: 0xFFD700 }));
    fireInner.position.set(0, 0.9, 0);
    plazaGroup.add(fireInner);
    this.sambaFireInner = fireInner;

    const sambaLight = new THREE.PointLight(0xFFA200, 3.8, 28);
    sambaLight.position.set(0, 2.5, 0);
    plazaGroup.add(sambaLight);

    // 8. Bancos de Madeira Maciça com Encosto ao Redor da Roda de Samba
    this.sambaBenches = [];
    for (let b = 0; b < 10; b++) {
      const angle = (b / 10) * Math.PI * 2;
      // Ângulo voltado diretamente para a fogueira central
      const rotFacingFire = Math.atan2(-Math.cos(angle), -Math.sin(angle));

      const bGroup = new THREE.Group();
      bGroup.position.set(Math.cos(angle) * 4.6, 0.24, Math.sin(angle) * 4.6);
      bGroup.rotation.y = rotFacingFire;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 0.6), darkWoodMat);
      seat.position.set(0, 0.38, 0.02);
      bGroup.add(seat);

      [-0.85, 0.85].forEach(px => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.52), porticoMat);
        leg.position.set(px, 0.19, 0);
        bGroup.add(leg);
      });

      // O encosto fica no lado exterior (Z = -0.26 local, oposto ao fogo)
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.38, 0.08), darkWoodMat);
      backrest.position.set(0, 0.72, -0.26);
      bGroup.add(backrest);

      plazaGroup.add(bGroup);

      // Assento do morador: posicionado no estofamento à frente do encosto, olhando para a fogueira
      const seatRadius = 4.54;
      this.sambaBenches.push({
        id: `samba_bench_${b}`,
        x: pos.x + Math.cos(angle) * seatRadius,
        y: y + 0.24 + 0.38,
        z: pos.z + Math.sin(angle) * seatRadius,
        rotY: rotFacingFire,
        seatY: y + 0.24 + 0.38
      });
    }

    // 9. Mastros e Gambiarras (Luzes e Bandeirinhas Festivas no Perímetro)
    // Deixa o arco NORTE livre para a chegada da Alameda do Samba
    const postAngles = [
      Math.PI * 1.70, // Nordeste
      Math.PI * 1.95, // Leste
      Math.PI * 0.25, // Sudeste
      Math.PI * 0.50, // Sul (Mirante)
      Math.PI * 0.75, // Sudoeste
      Math.PI * 1.05, // Oeste
      Math.PI * 1.30  // Noroeste
    ];
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const colors = [0xFF0000, 0x00FF00, 0xFFFF00, 0x00FFFF, 0xFF00FF];

    for (let p = 0; p < postAngles.length; p++) {
      const angle1 = postAngles[p];
      const px1 = Math.cos(angle1) * 8.6;
      const pz1 = Math.sin(angle1) * 8.6;

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.6, 6), porticoMat);
      post.position.set(px1, 2.3, pz1);
      plazaGroup.add(post);

      const topBulb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), new THREE.MeshBasicMaterial({ color: 0xFFD54F }));
      topBulb.position.set(px1, 4.6, pz1);
      plazaGroup.add(topBulb);

      if (p < postAngles.length - 1) {
        const angle2 = postAngles[p + 1];
        const px2 = Math.cos(angle2) * 8.6;
        const pz2 = Math.sin(angle2) * 8.6;

        const wireLen = Math.hypot(px2 - px1, pz2 - pz1);
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, wireLen, 3), wireMat);
        wire.position.set((px1 + px2) / 2, 4.4, (pz1 + pz2) / 2);
        wire.rotation.y = -Math.atan2(pz2 - pz1, px2 - px1);
        wire.rotation.z = Math.PI / 2;
        plazaGroup.add(wire);

        for (let f = 1; f <= 4; f++) {
          const flagGeo = new THREE.DodecahedronGeometry(0.18, 0);
          const flagMat = new THREE.MeshLambertMaterial({ color: colors[(p * 4 + f) % colors.length] });
          const flag = new THREE.Mesh(flagGeo, flagMat);
          const frac = f / 5;
          const fx = px1 + (px2 - px1) * frac;
          const fz = pz1 + (pz2 - pz1) * frac;
          flag.position.set(fx, 4.25, fz);
          plazaGroup.add(flag);
        }
      }
    }

    this.group.add(plazaGroup);
    this.sambaPlaza = plazaGroup;
  },

  createSolarPark(pos = { x: -18, z: -72 }) {
    const parkGroup = new THREE.Group();
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 15.0;
    // Eleva o patamar técnico de forma limpa e integrada sobre o terraço da serra
    parkGroup.position.set(pos.x, y + 0.38, pos.z);

    // 1. Fundação Escalonada em Pedra de Granito & Concreto Armado (sem paredões cegos que pareçam caixas!)
    const stoneBaseMat = new THREE.MeshLambertMaterial({ color: 0x64748B, flatShading: true });
    const concreteDeckMat = new THREE.MeshLambertMaterial({ color: 0xCBD5E1, flatShading: true });
    const curbMat = new THREE.MeshLambertMaterial({ color: 0xE2E8F0, flatShading: true });

    const deepStonePlinth = new THREE.Mesh(new THREE.BoxGeometry(18.0, 4.2, 12.8), stoneBaseMat);
    deepStonePlinth.position.y = -2.1;
    deepStonePlinth.receiveShadow = true;
    parkGroup.add(deepStonePlinth);

    const upperConcreteSlab = new THREE.Mesh(new THREE.BoxGeometry(17.2, 0.36, 12.0), concreteDeckMat);
    upperConcreteSlab.position.y = -0.05;
    upperConcreteSlab.receiveShadow = true;
    parkGroup.add(upperConcreteSlab);

    // Piso drenante de brita clara emoldurado por meio-fio de concreto
    const gravelGeo = new THREE.BoxGeometry(16.0, 0.16, 10.8);
    const gravelMat = new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: true });
    const gravel = new THREE.Mesh(gravelGeo, gravelMat);
    gravel.position.y = 0.16;
    gravel.receiveShadow = true;
    parkGroup.add(gravel);

    // Mureta baixa de borda (meio-fio técnico de 0.32m) preservando a vista panorâmica aberta
    const curbNorth = new THREE.Mesh(new THREE.BoxGeometry(17.0, 0.32, 0.45), curbMat);
    curbNorth.position.set(0, 0.26, -5.7);
    parkGroup.add(curbNorth);

    const curbWest = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 11.8), curbMat);
    curbWest.position.set(-8.3, 0.26, 0);
    parkGroup.add(curbWest);

    const curbEast = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 11.8), curbMat);
    curbEast.position.set(8.3, 0.26, 0);
    parkGroup.add(curbEast);

    // Escadaria frontal e pátio de acesso ao sul (+Z) conectando suavemente à trilha da serra
    for (let st = 0; st < 4; st++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.24, 0.72), concreteDeckMat);
      step.position.set(-1.2, -st * 0.22, 6.1 + st * 0.65);
      step.receiveShadow = true;
      parkGroup.add(step);
    }

    // Guarda-corpo tubular aberto ao redor do perímetro (Norte, Oeste, Leste e laterais Sul)
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const fencePosts = [
      { x: -8.1, z: -5.5 }, { x: -4.0, z: -5.5 }, { x: 0, z: -5.5 }, { x: 4.0, z: -5.5 }, { x: 8.1, z: -5.5 },
      { x: -8.1, z: 0 },    { x: 8.1, z: 0 },
      { x: -8.1, z: 5.5 },  { x: -3.6, z: 5.5 },  { x: 1.2, z: 5.5 }, { x: 8.1, z: 5.5 }
    ];
    fencePosts.forEach(fp => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.15, 5), fenceMat);
      p.position.set(fp.x, 0.75, fp.z);
      parkGroup.add(p);
    });

    const railNorth = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.07, 0.07), fenceMat);
    railNorth.position.set(0, 1.25, -5.5);
    parkGroup.add(railNorth);

    const railWest = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 11.2), fenceMat);
    railWest.position.set(-8.1, 1.25, 0);
    parkGroup.add(railWest);

    const railEast = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 11.2), fenceMat);
    railEast.position.set(8.1, 1.25, 0);
    parkGroup.add(railEast);

    // Pórtico & Placa Comunitária na entrada sul: "USINA ECO-SOLAR DA SERRA"
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 0.10), new THREE.MeshLambertMaterial({ color: 0x0284C7 }));
    signBoard.position.set(-5.8, 1.45, 5.5);
    parkGroup.add(signBoard);

    // 2. Módulos Fotovoltaicos de Alta Eficiência (3 fileiras x 3 colunas bem espaçadas no pátio oeste/central)
    const cellMat = new THREE.MeshLambertMaterial({ color: 0x1E3A8A });
    const standMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const arrayGroup = new THREE.Group();
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.35, 4), standMat);
        leg.position.y = 0.68;
        arrayGroup.add(leg);

        const frame = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 1.85), standMat);
        frame.position.y = 1.35;
        frame.rotation.x = 0.35;
        arrayGroup.add(frame);

        const panel = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.06, 1.68), cellMat);
        panel.position.set(0, 1.40, 0);
        panel.rotation.x = 0.35;
        arrayGroup.add(panel);

        arrayGroup.position.set(c * 3.8 - 5.2, 0.2, r * 3.1 - 3.0);
        parkGroup.add(arrayGroup);
      }
    }

    // 3. Cabine Técnica de Controle & Subestação (Arquitetura de alvenaria caiada com telhado cerâmico)
    const cabinWalls = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 2.2, 2.4),
      new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true })
    );
    cabinWalls.position.set(6.0, 1.25, 2.8);
    cabinWalls.castShadow = true;
    parkGroup.add(cabinWalls);

    const cabinRoof = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.22, 2.8),
      new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: true })
    );
    cabinRoof.position.set(6.0, 2.45, 2.8);
    cabinRoof.castShadow = true;
    parkGroup.add(cabinRoof);

    // Status LED do Inversor (Verde pulsante de energia limpa ativa)
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10B981 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), ledMat);
    led.position.set(6.0, 1.5, 4.02);
    parkGroup.add(led);

    // 4. Reservatório e Caixa d'Água Central da Serra sobre base elevada
    const tankPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 2.0, 0.8, 8),
      concreteDeckMat
    );
    tankPedestal.position.set(6.0, 0.55, -2.8);
    parkGroup.add(tankPedestal);

    const tankGeo = new THREE.CylinderGeometry(1.75, 1.65, 2.8, 10);
    const tankMat = new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: true });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(6.0, 2.35, -2.8);
    tank.castShadow = true;
    parkGroup.add(tank);

    this.group.add(parkGroup);
    this.solarPark = parkGroup;
  }
};
