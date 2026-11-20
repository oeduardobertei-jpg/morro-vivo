import * as THREE from 'three';
import { getSharedStylizedMaterial } from '../../render/StylizedMaterials.js';

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
    this.propObstacles = this.propObstacles || [];
    this.propObstacles.push(
      { x: pos.x - 6.5, z: pos.z, hw: 2.15, hd: 1.85, rotY: 0 },
      { x: pos.x + 6.0, z: pos.z, hw: 2.4, hd: 0.75, rotY: 0 }
    );
  },

  createCulturalMarket(pos) {
    const marketGroup = new THREE.Group();
    // Apoiado diretamente no terreno plano esculpido (sem base)
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) + 0.1 : 4.1;
    marketGroup.position.set(pos.x, y, pos.z);

    this.propObstacles = this.propObstacles || [];
    const stallColors = [0xE63946, 0xFFB703, 0x2A9D8F, 0x9B5DE5];
    for (let s = 0; s < 4; s++) {
      const stallGeo = new THREE.BoxGeometry(2.8, 2.2, 2.2);
      const stallMat = new THREE.MeshLambertMaterial({ color: stallColors[s], flatShading: true });
      const stall = new THREE.Mesh(stallGeo, stallMat);
      stall.position.set(-6 + s * 4, 1.1, 0);
      stall.castShadow = true;
      marketGroup.add(stall);
      this.propObstacles.push({ x: pos.x - 6 + s * 4, z: pos.z, hw: 1.75, hd: 1.45, rotY: 0 });
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
    this.propObstacles = this.propObstacles || [];
    this.propObstacles.push({ x: pos.x, z: pos.z, r: 1.75 });
  },

  createSolarPark(pos = { x: -18, z: -72 }) {
    const parkGroup = new THREE.Group();
    const getElev = (px, pz) => (this.terrain ? this.terrain.getElevation(px, pz) : 15.0);
    const yC = getElev(pos.x, pos.z);
    const yMax = Math.max(
      yC,
      getElev(pos.x - 8.5, pos.z - 6.0),
      getElev(pos.x + 8.5, pos.z - 6.0),
      getElev(pos.x - 8.5, pos.z + 6.0),
      getElev(pos.x + 8.5, pos.z + 6.0)
    );
    const yMin = Math.min(
      yC,
      getElev(pos.x - 8.5, pos.z - 6.0),
      getElev(pos.x + 8.5, pos.z - 6.0),
      getElev(pos.x - 8.5, pos.z + 6.0),
      getElev(pos.x + 8.5, pos.z + 6.0)
    );
    // Assenta o terraço em harmonia com a serra usando pedra carioca quente, tijolinho e madeira
    const anchorY = Math.max(yC, yMax - 0.04) + 0.22;
    parkGroup.position.set(pos.x, anchorY, pos.z);

    // 1. Fundação em Pedra de Mão Carioca & Pátio em Terraço Quente (elimina o aspecto de caixa cinza industrial!)
    const stoneBaseMat = getSharedStylizedMaterial(0x645E58, 'stone', { flatShading: true });
    const warmStoneDeckMat = getSharedStylizedMaterial(0x9E9488, 'stone', { flatShading: true });
    const brickTrimMat = getSharedStylizedMaterial(0xB45338, 'brick', { flatShading: true });
    const timberMat = getSharedStylizedMaterial(0x6C4A2D, 'wood', { flatShading: true });
    const foliageMat = getSharedStylizedMaterial(0x2D6A4F, 'foliage', { flatShading: true });

    const baseH = Math.max(4.5, (anchorY - yMin) + 3.4);
    const deepStonePlinth = new THREE.Mesh(new THREE.BoxGeometry(17.6, baseH, 12.4), stoneBaseMat);
    deepStonePlinth.position.y = -baseH * 0.5 + 0.04;
    deepStonePlinth.receiveShadow = true;
    deepStonePlinth.castShadow = true;
    parkGroup.add(deepStonePlinth);

    const upperStoneSlab = new THREE.Mesh(new THREE.BoxGeometry(17.2, 0.32, 12.0), warmStoneDeckMat);
    upperStoneSlab.position.y = -0.02;
    upperStoneSlab.receiveShadow = true;
    parkGroup.add(upperStoneSlab);

    // Piso drenante em areia/pedrisco quente com passarela central de madeira
    const gravel = new THREE.Mesh(
      new THREE.BoxGeometry(16.0, 0.14, 10.8),
      getSharedStylizedMaterial(0xB5A895, 'stone', { flatShading: true })
    );
    gravel.position.y = 0.15;
    gravel.receiveShadow = true;
    parkGroup.add(gravel);

    const woodWalkway = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 10.6), timberMat);
    woodWalkway.position.set(1.5, 0.17, 0);
    woodWalkway.receiveShadow = true;
    parkGroup.add(woodWalkway);

    // Muretas baixas de tijolinho cerâmico e madeira preservando a vista panorâmica
    const curbNorth = new THREE.Mesh(new THREE.BoxGeometry(17.0, 0.34, 0.42), brickTrimMat);
    curbNorth.position.set(0, 0.28, -5.7);
    parkGroup.add(curbNorth);

    const curbWest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 11.8), brickTrimMat);
    curbWest.position.set(-8.3, 0.28, 0);
    parkGroup.add(curbWest);

    const curbEast = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 11.8), brickTrimMat);
    curbEast.position.set(8.3, 0.28, 0);
    parkGroup.add(curbEast);

    // Floreiras tropicais nos cantos integrando o parque à vegetação do Alto da Serra
    [[-7.4, -4.8], [7.4, -4.8], [-7.4, 4.8]].forEach(([px, pz]) => {
      const planter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.48, 1.4), brickTrimMat);
      planter.position.set(px, 0.38, pz);
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), foliageMat);
      bush.position.set(px, 0.92, pz);
      parkGroup.add(planter, bush);
    });

    // Escadaria frontal e pórtico de madeira ao sul (+Z) encontrando o novo ramal pavimentado em (-16.5, -64.5)
    for (let st = 0; st < 4; st++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.26, 0.72), stoneBaseMat);
      step.position.set(1.5, -st * 0.20, 6.0 + st * 0.62);
      step.receiveShadow = true;
      parkGroup.add(step);
    }

    // Guarda-corpo em madeira rústica ao redor do perímetro
    const fencePosts = [
      { x: -8.1, z: -5.5 }, { x: -4.0, z: -5.5 }, { x: 0, z: -5.5 }, { x: 4.0, z: -5.5 }, { x: 8.1, z: -5.5 },
      { x: -8.1, z: 0 },    { x: 8.1, z: 0 },
      { x: -8.1, z: 5.5 },  { x: -3.2, z: 5.5 },  { x: -0.8, z: 5.5 }, { x: 3.8, z: 5.5 }, { x: 8.1, z: 5.5 }
    ];
    fencePosts.forEach(fp => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.10, 0.14), timberMat);
      p.position.set(fp.x, 0.72, fp.z);
      parkGroup.add(p);
    });

    const railNorth = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.09, 0.09), timberMat);
    railNorth.position.set(0, 1.22, -5.5);
    parkGroup.add(railNorth);

    const railWest = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 11.2), timberMat);
    railWest.position.set(-8.1, 1.22, 0);
    parkGroup.add(railWest);

    const railEast = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 11.2), timberMat);
    railEast.position.set(8.1, 1.22, 0);
    parkGroup.add(railEast);

    // Pórtico & Placa Comunitária em madeira na entrada sul: "USINA ECO-SOLAR DA SERRA"
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.62, 0.12), timberMat);
    signBoard.position.set(-3.2, 1.42, 5.5);
    parkGroup.add(signBoard);

    // 2. Módulos Fotovoltaicos de Alta Eficiência sobre cavaletes de madeira e aço
    const cellMat = new THREE.MeshLambertMaterial({ color: 0x1E3A8A });
    const standMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const arrayGroup = new THREE.Group();
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.35, 4), standMat);
        leg.position.y = 0.68;
        arrayGroup.add(leg);

        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 1.80), timberMat);
        frame.position.y = 1.35;
        frame.rotation.x = 0.35;
        arrayGroup.add(frame);

        const panel = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.06, 1.64), cellMat);
        panel.position.set(0, 1.40, 0);
        panel.rotation.x = 0.35;
        arrayGroup.add(panel);

        arrayGroup.position.set(c * 3.6 - 5.4, 0.2, r * 3.1 - 3.0);
        parkGroup.add(arrayGroup);
      }
    }

    // 3. Chalé Técnico de Controle & Subestação (Alvenaria ocre carioca com telhado cerâmico colonial)
    const cabinWalls = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 2.2, 2.4),
      getSharedStylizedMaterial(0xF3E5D0, 'plaster', { flatShading: true })
    );
    cabinWalls.position.set(5.8, 1.25, 2.6);
    cabinWalls.castShadow = true;
    parkGroup.add(cabinWalls);

    const cabinRoof = new THREE.Mesh(
      new THREE.ConeGeometry(2.3, 1.0, 4),
      brickTrimMat
    );
    cabinRoof.rotation.y = Math.PI / 4;
    cabinRoof.position.set(5.8, 2.82, 2.6);
    cabinRoof.castShadow = true;
    parkGroup.add(cabinRoof);

    // Status LED do Inversor (Verde pulsante de energia limpa ativa)
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10B981 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.05), ledMat);
    led.position.set(5.8, 1.5, 3.82);
    parkGroup.add(led);

    // 4. Reservatório e Caixa d'Água Central da Serra sobre torre de pedra e madeira
    const tankPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.85, 2.0, 0.9, 8),
      stoneBaseMat
    );
    tankPedestal.position.set(5.8, 0.58, -2.8);
    parkGroup.add(tankPedestal);

    const tankGeo = new THREE.CylinderGeometry(1.70, 1.60, 2.6, 10);
    const tankMat = new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: true });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(5.8, 2.30, -2.8);
    tank.castShadow = true;
    parkGroup.add(tank);

    this.group.add(parkGroup);
    this.solarPark = parkGroup;
    this.propObstacles = this.propObstacles || [];
    this.propObstacles.push({ x: pos.x, z: pos.z, hw: 9.0, hd: 6.4, rotY: 0 });
  },

  createStoneQuarry(pos = { x: -46, z: -86 }) {
    const x = pos.x;
    const z = pos.z;
    const getElev = (px, pz) => (this.terrain ? this.terrain.getElevation(px, pz) : 12.0);
    const yC = getElev(x, z);
    const yMin = Math.min(yC, getElev(x - 6, z - 5), getElev(x + 6, z - 5), getElev(x - 6, z + 5), getElev(x + 6, z + 5));
    const yMax = Math.max(yC, getElev(x - 6, z - 5), getElev(x + 6, z - 5), getElev(x - 6, z + 5), getElev(x + 6, z + 5));
    const gy = Math.max(yC, yMax - 0.06);

    const g = new THREE.Group();
    g.name = 'pedreira-serra';
    g.position.set(x, gy, z);

    const matStone = getSharedStylizedMaterial(0x78716C, 'stone', { flatShading: true });
    const matGranite = getSharedStylizedMaterial(0xA8A29E, 'stone', { flatShading: true });
    const matDarkRock = getSharedStylizedMaterial(0x57534E, 'stone', { flatShading: true });
    const matWood = getSharedStylizedMaterial(0x8B5A2B, 'wood', { flatShading: true });
    const matRoof = getSharedStylizedMaterial(0xC2410C, 'brick', { flatShading: true });
    const matIron = getSharedStylizedMaterial(0x334155, 'metal', { flatShading: true });

    const baseH = Math.max(4.5, (gy - yMin) + 3.5);
    const terrace = new THREE.Mesh(new THREE.BoxGeometry(11.6, baseH, 9.2), matDarkRock);
    terrace.position.set(0, -baseH * 0.5 + 0.16, 0);
    terrace.castShadow = true;
    terrace.receiveShadow = true;
    g.add(terrace);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.24, 8.8), matStone);
    deck.position.set(0, 0.12, 0);
    deck.receiveShadow = true;
    g.add(deck);

    // Paredão rochoso escavado ao norte
    const wallSpecs = [
      [-3.8, 1.5, -3.1, 3.6, 3.1, 2.2, 0.1],
      [0.1, 2.0, -3.2, 4.4, 4.0, 2.5, -0.08],
      [3.9, 1.3, -2.9, 3.2, 2.7, 2.1, 0.14]
    ];
    for (const [bx, by, bz, bw, bh, bd, ry] of wallSpecs) {
      const cliff = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), matDarkRock);
      cliff.position.set(bx, by, bz);
      cliff.rotation.y = ry;
      cliff.castShadow = true;
      cliff.receiveShadow = true;
      g.add(cliff);
    }

    // Pilhas de blocos de granito cortados e brita
    const blockCoords = [
      [-3.4, 0.58, 1.6], [-2.5, 0.58, 1.6], [-3.4, 0.58, 2.45],
      [-2.95, 1.22, 1.9], [-2.5, 0.58, 2.45], [3.6, 0.58, 2.1], [4.35, 0.58, 2.1]
    ];
    for (const [lx, ly, lz] of blockCoords) {
      const blk = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.64, 0.72), matGranite);
      blk.position.set(lx, ly, lz);
      blk.receiveShadow = true;
      g.add(blk);
    }

    const gravel = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.25, 7), matGranite);
    gravel.position.set(0.2, 0.8, 2.2);
    gravel.receiveShadow = true;
    g.add(gravel);

    // Guindaste manual de madeira (pórtico A-frame) com bloco suspenso
    for (const side of [-1, 1]) {
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.1, 0.22), matWood);
      leg1.position.set(side * 1.15, 2.0, -0.7);
      leg1.rotation.z = side * 0.24;
      leg1.castShadow = true;
      g.add(leg1);
    }
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 4.4), matWood);
    boom.position.set(0, 3.65, 0.45);
    boom.rotation.x = -0.18;
    boom.castShadow = true;
    g.add(boom);

    const hoistCable = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.35, 6), matIron);
    hoistCable.position.set(0, 2.65, 1.8);
    g.add(hoistCable);

    const slungBlock = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.68, 0.76), matGranite);
    slungBlock.position.set(0, 1.75, 1.8);
    slungBlock.castShadow = true;
    g.add(slungBlock);

    // Abrigo do canteiro de obras
    for (const [px, pz] of [[-4.7, -0.9], [-2.5, -0.9], [-4.7, 0.6], [-2.5, 0.6]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.3, 0.16), matWood);
      post.position.set(px, 1.3, pz);
      post.castShadow = true;
      g.add(post);
    }
    const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.18, 2.1), matRoof);
    shedRoof.position.set(-3.6, 2.5, -0.15);
    shedRoof.rotation.x = 0.16;
    shedRoof.castShadow = true;
    g.add(shedRoof);

    g.traverse((c) => {
      if (c.isMesh) {
        c.matrixAutoUpdate = false;
        c.updateMatrix();
      }
    });
    this.group.add(g);
    this.pedreiraGroup = g;
    this.propObstacles = this.propObstacles || [];
    this.propObstacles.push({ x, z: z - 0.5, hw: 6.0, hd: 4.8, rotY: 0 });
    if (this.infrastructureNodes) {
      this.infrastructureNodes.push({ x, z, r: 9.5, name: 'Pedreira da Serra' });
    }
  },

  createSustainableSawmill(pos = { x: 118, z: -48 }) {
    const x = pos.x;
    const z = pos.z;
    const getElev = (px, pz) => (this.terrain ? this.terrain.getElevation(px, pz) : 10.0);
    const yC = getElev(x, z);
    const yMin = Math.min(yC, getElev(x - 6, z - 5), getElev(x + 6, z - 5), getElev(x - 6, z + 5), getElev(x + 6, z + 5));
    const yMax = Math.max(yC, getElev(x - 6, z - 5), getElev(x + 6, z - 5), getElev(x - 6, z + 5), getElev(x + 6, z + 5));
    const gy = Math.max(yC, yMax - 0.06);

    const g = new THREE.Group();
    g.name = 'serraria-sustentavel';
    g.position.set(x, gy, z);

    const matStone = getSharedStylizedMaterial(0x645E58, 'stone', { flatShading: true });
    const matPlank = getSharedStylizedMaterial(0xB47B44, 'wood', { flatShading: true });
    const matTimber = getSharedStylizedMaterial(0x784922, 'wood', { flatShading: true });
    const matRoof = getSharedStylizedMaterial(0x0F766E, 'ceramic', { flatShading: true });
    const matBlade = getSharedStylizedMaterial(0xCBD5E1, 'metal', { flatShading: true });
    const matFoliage = getSharedStylizedMaterial(0x2D6A4F, 'foliage', { flatShading: true });
    const matSolar = getSharedStylizedMaterial(0x1E3A8A, 'ceramic', { flatShading: true });

    const baseH = Math.max(4.5, (gy - yMin) + 3.4);
    const base = new THREE.Mesh(new THREE.BoxGeometry(10.8, baseH, 8.8), matStone);
    base.position.set(0, -baseH * 0.5 + 0.16, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.22, 8.4), matPlank);
    deck.position.set(0, 0.11, 0);
    deck.receiveShadow = true;
    g.add(deck);

    // Galpão aberto com placas solares ecológicas no telhado
    for (const [px, pz] of [[-3.6, -2.4], [1.4, -2.4], [-3.6, 0.9], [1.4, 0.9]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.0, 0.22), matTimber);
      post.position.set(px, 1.65, pz);
      post.castShadow = true;
      g.add(post);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.22, 4.1), matRoof);
    roof.position.set(-1.1, 3.25, -0.75);
    roof.rotation.x = 0.18;
    roof.castShadow = true;
    g.add(roof);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.6), matSolar);
    panel.position.set(-1.1, 3.42, -0.75);
    panel.rotation.x = 0.18;
    g.add(panel);

    // Bancada e serra circular animada (dinâmica)
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.92, 1.15), matTimber);
    bench.position.set(-1.1, 0.68, -0.7);
    bench.castShadow = true;
    bench.receiveShadow = true;
    g.add(bench);

    const bladeGroup = new THREE.Group();
    bladeGroup.position.set(-0.7, 1.24, -0.7);
    bladeGroup.userData.dynamic = true;
    const bladeDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.06, 14), matBlade);
    bladeDisc.rotation.x = Math.PI * 0.5;
    bladeDisc.castShadow = false;
    bladeDisc.userData.dynamic = true;
    bladeGroup.add(bladeDisc);
    g.add(bladeGroup);
    this.sawmillBlade = bladeGroup;
    this.mobilityDynamicGroups = this.mobilityDynamicGroups || [];
    this.mobilityDynamicGroups.push(bladeGroup);

    // Pilhas de tábuas e toras reflorestadas
    for (let layer = 0; layer < 3; layer++) {
      const plankStack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 1.05), layer % 2 === 0 ? matPlank : matTimber);
      plankStack.position.set(-2.2, 0.36 + layer * 0.3, 2.35);
      plankStack.receiveShadow = true;
      g.add(plankStack);
    }
    for (let l = 0; l < 3; l++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 2.2, 8), matTimber);
      log.rotation.z = Math.PI * 0.5;
      log.position.set(2.4, 0.44 + (l === 2 ? 0.38 : 0), -1.8 + (l % 2) * 0.52);
      g.add(log);
    }

    // 6 mudas de reflorestamento dentro do viveiro leste/norte
    const saplingOffsets = [
      [3.4, 1.2], [4.2, 0.2], [3.6, 2.5], [4.4, 2.2], [2.2, 2.8], [4.3, -2.5]
    ];
    for (const [sx, sz] of saplingOffsets) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.9, 6), matTimber);
      trunk.position.set(sx, 0.65, sz);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.15, 7), matFoliage);
      crown.position.set(sx, 1.4, sz);
      g.add(trunk, crown);
    }

    g.traverse((c) => {
      if (c.isMesh && !(c.userData && c.userData.dynamic)) {
        c.matrixAutoUpdate = false;
        c.updateMatrix();
      }
    });
    this.group.add(g);
    this.serrariaGroup = g;
    this.propObstacles = this.propObstacles || [];
    this.propObstacles.push({ x: x + 0.3, z, hw: 5.5, hd: 4.8, rotY: 0 });
    if (this.infrastructureNodes) {
      this.infrastructureNodes.push({ x, z, r: 9.5, name: 'Serraria Sustentável' });
    }
  },

  createPoultryAndButcherHub() {
    const getElev = (px, pz) => (this.terrain ? this.terrain.getElevation(px, pz) : 6.0);
    this.propObstacles = this.propObstacles || [];
    this.mobilityDynamicGroups = this.mobilityDynamicGroups || [];

    // A) Criação Caipira (64, -31)
    const cx = 64.0;
    const cz = -31.0;
    const cYC = getElev(cx, cz);
    const cYMin = Math.min(cYC, getElev(cx - 5, cz - 4), getElev(cx + 5, cz - 4), getElev(cx - 5, cz + 4), getElev(cx + 5, cz + 4));
    const cYMax = Math.max(cYC, getElev(cx - 5, cz - 4), getElev(cx + 5, cz - 4), getElev(cx - 5, cz + 4), getElev(cx + 5, cz + 4));
    const cGy = Math.max(cYC, cYMax - 0.06);

    const cGroup = new THREE.Group();
    cGroup.name = 'criacao-caipira';
    cGroup.position.set(cx, cGy, cz);

    const matStone = getSharedStylizedMaterial(0x645E58, 'stone', { flatShading: true });
    const matDirt = getSharedStylizedMaterial(0xA17C52, 'stone', { flatShading: true });
    const matWood = getSharedStylizedMaterial(0x8B5A2B, 'wood', { flatShading: true });
    const matRoof = getSharedStylizedMaterial(0xC2410C, 'brick', { flatShading: true });
    const matRed = getSharedStylizedMaterial(0xDC2626, 'plaster', { flatShading: true });
    const matBeak = getSharedStylizedMaterial(0xF59E0B, 'plaster', { flatShading: true });
    const matCream = getSharedStylizedMaterial(0xFEF3C7, 'plaster', { flatShading: true });
    const matCaramel = getSharedStylizedMaterial(0xB45309, 'plaster', { flatShading: true });

    const baseH = Math.max(4.0, (cGy - cYMin) + 3.2);
    const cBase = new THREE.Mesh(new THREE.BoxGeometry(9.6, baseH, 8.2), matStone);
    cBase.position.set(0, -baseH * 0.5 + 0.14, 0);
    cBase.castShadow = true;
    cBase.receiveShadow = true;
    cGroup.add(cBase);

    const cYard = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.2, 7.8), matDirt);
    cYard.position.set(0, 0.1, 0);
    cYard.receiveShadow = true;
    cGroup.add(cYard);

    // Galinheiro elevado de madeira com telhado cerâmico
    const coopBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.55, 2.0), matWood);
    coopBody.position.set(-2.2, 1.15, -1.6);
    coopBody.castShadow = true;
    const coopRoof = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.22, 2.35), matRoof);
    coopRoof.position.set(-2.2, 2.02, -1.6);
    coopRoof.rotation.x = 0.2;
    coopRoof.castShadow = true;
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 1.5), matWood);
    ramp.position.set(-2.2, 0.5, -0.15);
    ramp.rotation.x = 0.45;
    cGroup.add(coopBody, coopRoof, ramp);

    // Cercado perimetral e cocho
    const fenceBars = [
      [0, 0.58, -3.55, 8.4, 0.12, 0.12],
      [0, 0.58, 3.55, 8.4, 0.12, 0.12],
      [-4.2, 0.58, 0, 0.12, 0.12, 7.1],
      [4.2, 0.58, 0, 0.12, 0.12, 7.1]
    ];
    for (const [fx, fy, fz, fw, fh, fd] of fenceBars) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), matWood);
      rail.position.set(fx, fy, fz);
      cGroup.add(rail);
    }
    const trough = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.26, 0.45), matWood);
    trough.position.set(1.6, 0.33, -1.4);
    const eggsCrate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.34, 0.48), matCream);
    eggsCrate.position.set(2.8, 0.37, 1.8);
    cGroup.add(trough, eggsCrate);

    // 5 Galinhas caipiras animadas no cercado
    this.chickens = [];
    const chickenSpots = [
      [-0.2, 0.8, 0.4, matCream],
      [1.4, 0.2, -0.9, matCaramel],
      [0.6, -1.9, 1.6, matCream],
      [2.5, -0.5, -2.1, matCaramel],
      [-1.1, 2.0, 0.9, matCream]
    ];
    const chickenBodyGeo = new THREE.BoxGeometry(0.32, 0.28, 0.46);
    chickenSpots.forEach(([chx, chz, rotY, plumMat], idx) => {
      const ch = new THREE.Group();
      ch.position.set(chx, 0.2, chz);
      ch.rotation.y = rotY;
      ch.userData.dynamic = true;

      const body = new THREE.Mesh(chickenBodyGeo, plumMat);
      body.position.y = 0.22;
      body.castShadow = false;
      body.userData.dynamic = true;

      ch.add(body);
      cGroup.add(ch);
      this.chickens.push({ group: ch, head: null, baseX: chx, baseZ: chz, baseRotY: rotY, phase: idx * 1.4 });
      this.mobilityDynamicGroups.push(ch);
    });

    cGroup.traverse((c) => {
      if (c.isMesh && !(c.userData && c.userData.dynamic)) {
        c.matrixAutoUpdate = false;
        c.updateMatrix();
      }
    });
    this.group.add(cGroup);
    this.criacaoGroup = cGroup;
    this.propObstacles.push({ x: cx, z: cz, hw: 5.0, hd: 4.4, rotY: 0 });
    if (this.infrastructureNodes) {
      this.infrastructureNodes.push({ x: cx, z: cz, r: 7.5, name: 'Criação Caipira' });
    }

    // B) Açougue & Peixaria Artesanal anexo ao Mercado Cultural (69.6, -0.2)
    const bx = 69.6;
    const bz = -0.2;
    const bGy = getElev(bx, bz);
    const bGroup = new THREE.Group();
    bGroup.name = 'acougue-peixaria-feira';
    bGroup.position.set(bx, bGy, bz);

    const matWhite = getSharedStylizedMaterial(0xF8FAFC, 'plaster', { flatShading: true });
    const matAwningRed = getSharedStylizedMaterial(0xB91C1C, 'fabric', { flatShading: true });
    const matIceBlue = getSharedStylizedMaterial(0x38BDF8, 'ceramic', { flatShading: true });

    const bPlinth = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.6, 3.0), matStone);
    bPlinth.position.set(0, -1.72, 0);
    bPlinth.castShadow = true;
    bPlinth.receiveShadow = true;
    const bFloor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 2.8), matWhite);
    bFloor.position.set(0, 0.08, 0);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.96, 0.85), matWhite);
    counter.position.set(0, 0.56, 0.55);
    counter.castShadow = true;
    const chopBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.86, 8), matWood);
    chopBlock.position.set(-1.1, 0.51, -0.55);
    const iceTray = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 0.65), matIceBlue);
    iceTray.position.set(0.65, 1.06, 0.55);

    for (const [px, pz] of [[-1.55, -1.15], [1.55, -1.15], [-1.55, 1.15], [1.55, 1.15]]) {
      const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.35, 0.14), matWood);
      pMesh.position.set(px, 1.25, pz);
      bGroup.add(pMesh);
    }
    const awning = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.18, 2.9), matAwningRed);
    awning.position.set(0, 2.5, 0);
    awning.rotation.x = 0.14;
    awning.castShadow = true;
    const meatRack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), matWood);
    meatRack.position.set(0.2, 2.1, -0.85);
    for (let s = -2; s <= 2; s++) {
      const cut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.42, 6), s % 2 === 0 ? matAwningRed : matCaramel);
      cut.position.set(0.2 + s * 0.42, 1.82, -0.85);
      bGroup.add(cut);
    }

    bGroup.add(bPlinth, bFloor, counter, chopBlock, iceTray, awning, meatRack);
    bGroup.traverse((c) => {
      if (c.isMesh) {
        c.matrixAutoUpdate = false;
        c.updateMatrix();
      }
    });
    this.group.add(bGroup);
    this.acougueGroup = bGroup;
    this.propObstacles.push({ x: bx, z: bz, hw: 2.0, hd: 1.6, rotY: 0 });
  }
};
