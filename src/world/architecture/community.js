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
    // Apoiado diretamente no terreno plano esculpido (sem base)
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) + 0.1 : 3.6;
    pitchGroup.position.set(pos.x, y, pos.z);

    // 2. Compacted red-clay dirt pitch surface (terra batida)
    const pitchGeo = new THREE.BoxGeometry(22.4, 0.16, 14.4);
    const pitchMat = new THREE.MeshLambertMaterial({ color: 0x8C6544, flatShading: true });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.position.set(0, 0.08, 0);
    pitch.receiveShadow = true;
    pitchGroup.add(pitch);

    // 3. Chalk pitch lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xFAFAFA });
    const midLine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 14.2), lineMat);
    midLine.position.set(0, 0.09, 0);
    pitchGroup.add(midLine);

    const circleGeo = new THREE.RingGeometry(2.4, 2.52, 16);
    circleGeo.rotateX(-Math.PI / 2);
    const centerCircle = new THREE.Mesh(circleGeo, lineMat);
    centerCircle.position.set(0, 0.18, 0);
    pitchGroup.add(centerCircle);

    const centerSpot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.18, 8), lineMat);
    centerSpot.position.set(0, 0.09, 0);
    pitchGroup.add(centerSpot);

    // 4. Sturdy boundary fence posts (alambrado)
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 4);

    for (let px = -11; px <= 11; px += 3.6) {
      const postN = new THREE.Mesh(postGeo, fenceMat);
      postN.position.set(px, 1.1, -7.1);
      pitchGroup.add(postN);
      const postS = new THREE.Mesh(postGeo, fenceMat);
      postS.position.set(px, 1.1, 7.1);
      pitchGroup.add(postS);
    }

    const railMat = new THREE.MeshLambertMaterial({ color: 0x64748B });
    const railGeo = new THREE.BoxGeometry(22.2, 0.05, 0.05);
    const railN = new THREE.Mesh(railGeo, railMat);
    railN.position.set(0, 2.1, -7.1);
    pitchGroup.add(railN);
    const railS = new THREE.Mesh(railGeo, railMat);
    railS.position.set(0, 2.1, 7.1);
    pitchGroup.add(railS);

    // 5. Goalposts with net
    const goalMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const createGoal = (gx) => {
      const gGroup = new THREE.Group();
      gGroup.position.x = gx;

      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 4), goalMat);
      p1.position.set(0, 0.9, -1.8);
      gGroup.add(p1);

      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 4), goalMat);
      p2.position.set(0, 0.9, 1.8);
      gGroup.add(p2);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.68), goalMat);
      bar.position.set(0, 1.8, 0);
      gGroup.add(bar);

      const netBox = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.7, 3.6),
        new THREE.MeshBasicMaterial({ color: 0xE2E8F0, wireframe: true, transparent: true, opacity: 0.45 })
      );
      netBox.position.set(gx > 0 ? 0.6 : -0.6, 0.85, 0);
      gGroup.add(netBox);

      return gGroup;
    };

    pitchGroup.add(createGoal(-10.6));
    pitchGroup.add(createGoal(10.6));

    // Ball (Added directly in world coordinates within this.group)
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

      const pLight = new THREE.PointLight(0xFFB74D, 1.8, 10);
      pLight.position.set(lx > 0 ? lx - 0.5 : lx + 0.5, 3.65, -8.8);
      plazaGroup.add(pLight);
    });

    // Fitinhas do Bonfim esvoaçantes suspensas na viga frontal
    const ribbonColors = [0xEF4444, 0x10B981, 0x06B6D4, 0xFBBF24, 0xEC4899, 0x8B5CF6, 0xFFFFFF];
    const ribbonGeo = new THREE.BoxGeometry(0.04, 0.75, 0.02);
    for (let r = 0; r < 24; r++) {
      const rx = -2.8 + (r / 23) * 5.6;
      const rMat = new THREE.MeshBasicMaterial({ color: ribbonColors[r % ribbonColors.length] });
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
    for (let b = 0; b < 10; b++) {
      const angle = (b / 10) * Math.PI * 2;
      const bGroup = new THREE.Group();
      bGroup.position.set(Math.cos(angle) * 4.6, 0.24, Math.sin(angle) * 4.6);
      bGroup.rotation.y = -angle + Math.PI / 2;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 0.6), darkWoodMat);
      seat.position.y = 0.38;
      bGroup.add(seat);

      [-0.85, 0.85].forEach(px => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.52), porticoMat);
        leg.position.set(px, 0.19, 0);
        bGroup.add(leg);
      });

      const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.38, 0.08), darkWoodMat);
      backrest.position.set(0, 0.72, -0.26);
      bGroup.add(backrest);

      plazaGroup.add(bGroup);
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
          const flagMat = new THREE.MeshBasicMaterial({ color: colors[(p * 4 + f) % colors.length] });
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
    // Eleva a plataforma 0.45m acima do terreno nivelado para imunidade total contra z-fighting e grama
    parkGroup.position.set(pos.x, y + 0.45, pos.z);

    // 1. Muro de Arrimo e Contenção Norte & Laterais (engenharia civil de encosta carioca)
    const retainingMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
    const retainingNorth = new THREE.Mesh(new THREE.BoxGeometry(17.6, 2.8, 1.4), retainingMat);
    retainingNorth.position.set(0, 1.4, -5.7);
    retainingNorth.castShadow = true;
    parkGroup.add(retainingNorth);

    const retainingWest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 12.2), retainingMat);
    retainingWest.position.set(-8.2, 1.1, 0);
    retainingWest.castShadow = true;
    parkGroup.add(retainingWest);

    const retainingEast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 12.2), retainingMat);
    retainingEast.position.set(8.2, 1.1, 0);
    retainingEast.castShadow = true;
    parkGroup.add(retainingEast);

    // 2. Base Estrutural de Concreto e Brita Nivelada (ancoragem profunda no relevo)
    const baseGeo = new THREE.BoxGeometry(17.4, 3.8, 12.4);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const terrace = new THREE.Mesh(baseGeo, baseMat);
    terrace.position.y = -1.6;
    terrace.receiveShadow = true;
    parkGroup.add(terrace);

    // Piso de brita/cascalho industrial elevado
    const gravelGeo = new THREE.BoxGeometry(16.8, 0.25, 11.6);
    const gravelMat = new THREE.MeshLambertMaterial({ color: 0x71717A, flatShading: true });
    const gravel = new THREE.Mesh(gravelGeo, gravelMat);
    gravel.position.y = 0.15;
    gravel.receiveShadow = true;
    parkGroup.add(gravel);

    // Escadinha de acesso frontal em alvenaria conectando à promenade
    for (let st = 0; st < 3; st++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 0.65), baseMat);
      step.position.set(0, -st * 0.25, 5.8 + st * 0.60);
      step.receiveShadow = true;
      parkGroup.add(step);
    }

    // Guarda-corpo de proteção industrial em aço escuro
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x27272A });
    const fencePosts = [
      { x: -7.8, z: -5.0 }, { x: 0, z: -5.0 }, { x: 7.8, z: -5.0 },
      { x: -7.8, z: 5.4 },  { x: 0, z: 5.4 },  { x: 7.8, z: 5.4 },
      { x: -7.8, z: 0 },    { x: 7.8, z: 0 }
    ];
    fencePosts.forEach(fp => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 4), fenceMat);
      p.position.set(fp.x, 0.75, fp.z);
      parkGroup.add(p);
    });

    const railNorth = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.08, 0.08), fenceMat);
    railNorth.position.set(0, 1.35, -5.0);
    parkGroup.add(railNorth);

    const railSouth = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.08, 0.08), fenceMat);
    railSouth.position.set(0, 1.35, 5.4);
    parkGroup.add(railSouth);

    // Placa de Aviso: ENERGIA SOLAR LIMPA
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.08), new THREE.MeshLambertMaterial({ color: 0x0284C7 }));
    signBoard.position.set(0, 1.8, 5.35);
    parkGroup.add(signBoard);

    // 2. Módulos Fotovoltaicos de Alta Eficiência (3 fileiras x 3 colunas)
    const cellMat = new THREE.MeshLambertMaterial({ color: 0x1E3A8A });
    const standMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const arrayGroup = new THREE.Group();
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 4), standMat);
        leg.position.y = 0.7;
        arrayGroup.add(leg);

        const frame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 2.0), standMat);
        frame.position.y = 1.4;
        frame.rotation.x = 0.35;
        arrayGroup.add(frame);

        const panel = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 1.8), cellMat);
        panel.position.set(0, 1.45, 0);
        panel.rotation.x = 0.35;
        arrayGroup.add(panel);

        arrayGroup.position.set(c * 4.2 - 4.2, 0.2, r * 3.2 - 2.8);
        parkGroup.add(arrayGroup);
      }
    }

    // 3. Estação Inversora e Banco de Baterias Industriais
    const inverterBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.6, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true })
    );
    inverterBox.position.set(6.4, 1.0, 3.6);
    inverterBox.castShadow = true;
    parkGroup.add(inverterBox);

    // Status LED do Inversor (Verde pulsante de energia limpa ativa)
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10B981 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), ledMat);
    led.position.set(6.4, 1.4, 4.22);
    parkGroup.add(led);

    // 4. Reservatório e Caixa d'Água Central da Serra
    const tankGeo = new THREE.CylinderGeometry(1.8, 1.7, 3.0, 8);
    const tankMat = new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: true });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(6.2, 1.7, -3.2);
    tank.castShadow = true;
    parkGroup.add(tank);

    this.group.add(parkGroup);
    this.solarPark = parkGroup;
  }
};
