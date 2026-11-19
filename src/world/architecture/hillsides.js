import * as THREE from 'three';

/** Encostas leste e oeste, mata atlântica, miradouros laterais e olarias. */
export const HillsidesMixin = {
  // 5. EXPANSÃO DO FLANCO OESTE (Atualização 1.2.2)
  // Mirante do Pôr do Sol & Capoeira, Horta Comunitária em Socalcos, Trilha dos Pescadores e Rancho Caiçara
  createWestHillsideExpansion() {
    const westExpGroup = new THREE.Group();

    const woodDarkMat = new THREE.MeshLambertMaterial({ color: 0x5C3B24, flatShading: true });
    const woodWeatheredMat = new THREE.MeshLambertMaterial({ color: 0x856A52, flatShading: true });
    const stoneFloorMat = new THREE.MeshLambertMaterial({ color: 0xA89B86, flatShading: true });
    const bambooMat = new THREE.MeshLambertMaterial({ color: 0xD4A373, flatShading: true });
    const thatchMat = new THREE.MeshLambertMaterial({ color: 0xA16207, flatShading: true });
    const leafGreenMat = new THREE.MeshLambertMaterial({ color: 0x22C55E, flatShading: true });
    const darkEarthMat = new THREE.MeshLambertMaterial({ color: 0x4A3423, flatShading: true });

    // 1. MIRANTE DO PÔR DO SOL & TERREIRO DE CAPOEIRA (x: -110, z: -15)
    const capY = this.terrain ? this.terrain.getElevation(-110, -15) : 5.4;
    const capGroup = new THREE.Group();
    capGroup.position.set(-110, capY, -15);

    // Tablado circular em pedra portuguesa quente ancorado na encosta
    const stoneDeck = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.8, 1.45, 16), stoneFloorMat);
    stoneDeck.position.y = -0.35;
    stoneDeck.receiveShadow = true;
    capGroup.add(stoneDeck);

    // Anel central de madeira quente para a roda de capoeira
    const capWoodCenter = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.08, 16), woodWeatheredMat);
    capWoodCenter.position.y = 0.40;
    capWoodCenter.receiveShadow = true;
    capGroup.add(capWoodCenter);

    // Mureta de contenção curva em pedra clara voltada para o poente
    const parapetMat = new THREE.MeshLambertMaterial({ color: 0x8B8175, flatShading: true });
    for (let a = -2.2; a <= 2.2; a += 0.55) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.35), parapetMat);
      block.position.set(Math.sin(a) * 5.1, 0.75, -Math.cos(a) * 5.1);
      block.rotation.y = a;
      capGroup.add(block);
    }

    // 2 Bancos de tronco rústico
    [-2.2, 2.2].forEach((bx, idx) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 0.5), woodWeatheredMat);
      bench.position.set(bx, 0.55, 2.5);
      bench.rotation.y = (idx === 0 ? 0.35 : -0.35);
      capGroup.add(bench);
    });

    // Instrumentos Musicais da Capoeira: 2 Berimbaus apoiados
    [-0.6, 0.6].forEach((rx, idx) => {
      const berimbauGroup = new THREE.Group();
      berimbauGroup.position.set(rx, 0.45, -3.2);
      berimbauGroup.rotation.set(-0.25, (idx === 0 ? 0.2 : -0.2), 0);

      // Verga (arco de madeira flexível)
      const verga = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 2.2, 4), bambooMat);
      verga.position.y = 1.0;
      berimbauGroup.add(verga);

      // Cabaça ressoadora envernizada
      const cabaca = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.24, 1),
        new THREE.MeshLambertMaterial({ color: 0x92400E, flatShading: true })
      );
      cabaca.position.set(0, 0.55, 0.15);
      berimbauGroup.add(cabaca);

      // Arame de aço
      const arame = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 2.0, 3), new THREE.MeshBasicMaterial({ color: 0xCBD5E1 }));
      arame.position.set(0, 1.0, 0.05);
      berimbauGroup.add(arame);

      capGroup.add(berimbauGroup);
    });

    // Atabaque de madeira e couro
    const atabaque = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.16, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: 0x78350F, flatShading: true })
    );
    atabaque.position.set(0, 0.95, -3.4);
    capGroup.add(atabaque);

    // Pandeiro de couro apoiado
    const pandeiro = new THREE.Mesh(
      new THREE.CylinderGeometry(0.20, 0.20, 0.06, 8),
      new THREE.MeshLambertMaterial({ color: 0xFDE68A })
    );
    pandeiro.position.set(1.4, 0.78, 2.4);
    pandeiro.rotation.x = Math.PI / 4;
    capGroup.add(pandeiro);

    westExpGroup.add(capGroup);

    // 2. HORTA COMUNITÁRIA EM SOCALCOS (x: -92, z: -25 — com terraço de terra batida e cercado completo de bambu)
    const hortaY = this.terrain ? this.terrain.getElevation(-92, -25) : 8.2;
    const hortaGroup = new THREE.Group();
    hortaGroup.position.set(-92, hortaY, -25);

    // Base nivelada em pedra e terra batida integrando os 4 canteiros ao morro
    const hortaPad = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.5, 7.0), stoneFloorMat);
    hortaPad.position.set(0, -0.72, 0);
    hortaPad.receiveShadow = true;
    hortaGroup.add(hortaPad);

    const hortaSoilPath = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.08, 6.4), new THREE.MeshLambertMaterial({ color: 0x8F7254, flatShading: true }));
    hortaSoilPath.position.set(0, 0.05, 0);
    hortaSoilPath.receiveShadow = true;
    hortaGroup.add(hortaSoilPath);

    // Cercado de bambu nos 4 lados (com abertura frontal de portãozinho!)
    const fencePostsHorta = [
      [-4.5, -3.2], [4.5, -3.2], [-4.5, 3.2], [4.5, 3.2],
      [-4.5, 0], [4.5, 0], [0, -3.2], [-1.3, 3.2], [1.3, 3.2]
    ];
    fencePostsHorta.forEach(([fx, fz]) => {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 4), bambooMat);
      stake.position.set(fx, 0.65, fz);
      hortaGroup.add(stake);
    });
    const fenceRailN = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.07, 0.07), bambooMat);
    fenceRailN.position.set(0, 0.95, -3.2);
    hortaGroup.add(fenceRailN);
    const fenceRailW = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 6.4), bambooMat);
    fenceRailW.position.set(-4.5, 0.95, 0);
    hortaGroup.add(fenceRailW);
    const fenceRailE = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 6.4), bambooMat);
    fenceRailE.position.set(4.5, 0.95, 0);
    hortaGroup.add(fenceRailE);
    [-2.9, 2.9].forEach((fx) => {
      const fFront = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.07, 0.07), bambooMat);
      fFront.position.set(fx, 0.95, 3.2);
      hortaGroup.add(fFront);
    });

    // 4 Canteiros de cultivo elevados com terra preta adubada
    const bedConfigs = [
      { x: -2.3, z: -1.6, vegColor: 0x16A34A },
      { x: 2.3,  z: -1.6, vegColor: 0x4ADE80 },
      { x: -2.3, z: 1.6,  vegColor: 0x22C55E },
      { x: 2.3,  z: 1.6,  vegColor: 0x15803D }
    ];
    bedConfigs.forEach(bc => {
      const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 1.8), woodDarkMat);
      bedFrame.position.set(bc.x, 0.22, bc.z);
      hortaGroup.add(bedFrame);

      const soil = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 1.6), darkEarthMat);
      soil.position.set(bc.x, 0.42, bc.z);
      hortaGroup.add(soil);

      // Folhagens de hortaliças
      for (let vx = -1.2; vx <= 1.2; vx += 0.8) {
        for (let vz = -0.5; vz <= 0.5; vz += 0.5) {
          const plant = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.24, 0),
            new THREE.MeshLambertMaterial({ color: bc.vegColor, flatShading: true })
          );
          plant.position.set(bc.x + vx, 0.62, bc.z + vz);
          hortaGroup.add(plant);
        }
      }
    });

    // Espantalho artesanal carioca
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), woodWeatheredMat);
    pole.position.set(0, 1.1, 0);
    hortaGroup.add(pole);
    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06), woodWeatheredMat);
    crossArm.position.set(0, 1.6, 0);
    hortaGroup.add(crossArm);
    const scareShirt = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.25), new THREE.MeshLambertMaterial({ color: 0xDC2626 }));
    scareShirt.position.set(0, 1.45, 0);
    hortaGroup.add(scareShirt);
    const scareHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), new THREE.MeshLambertMaterial({ color: 0xD4A373 }));
    scareHead.position.set(0, 1.95, 0);
    hortaGroup.add(scareHead);
    const scareHat = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.22, 6), bambooMat);
    scareHat.position.set(0, 2.15, 0);
    hortaGroup.add(scareHat);

    westExpGroup.add(hortaGroup);

    // 3. TRILHA DOS PESCADORES EM DORMENTES (liga limpo Vila dos Pescadores (-95, 0) -> Terreiro de Capoeira (-110, -15))
    const trailStartX = -100.2, trailStartZ = -5.4;
    const trailEndX = -106.0, trailEndZ = -10.8;
    const trailYaw = Math.atan2(trailEndX - trailStartX, trailEndZ - trailStartZ);
    const stepCount = 6;
    for (let s = 0; s < stepCount; s++) {
      const t = s / (stepCount - 1);
      const sx = trailStartX + (trailEndX - trailStartX) * t;
      const sz = trailStartZ + (trailEndZ - trailStartZ) * t;
      const sy = this.terrain ? this.terrain.getElevation(sx, sz) : 2.2;

      const sleeper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.62), woodDarkMat);
      sleeper.position.set(sx, sy + 0.06, sz);
      sleeper.rotation.y = trailYaw;
      sleeper.receiveShadow = true;
      westExpGroup.add(sleeper);

      // Balizadores de madeira discretos nas extremidades da trilha
      if (s === 0 || s === stepCount - 1) {
        const perpX = Math.cos(trailYaw) * 1.15;
        const perpZ = -Math.sin(trailYaw) * 1.15;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.95, 5), woodWeatheredMat);
        post.position.set(sx + perpX, sy + 0.45, sz + perpZ);
        westExpGroup.add(post);
      }
    }

    // 4. RANCHO DOS BARCOS CAIÇARAS (x: -128, z: 46)
    const ranchoY = this.terrain ? this.terrain.getElevation(-128, 46) : 0.4;
    const ranchoGroup = new THREE.Group();
    ranchoGroup.position.set(-128, ranchoY, 46);

    // 4 Pilares de eucalipto roliço
    const shedPillars = [[-2.4, -1.8], [2.4, -1.8], [-2.4, 1.8], [2.4, 1.8]];
    shedPillars.forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.8, 6), woodWeatheredMat);
      p.position.set(px, 1.4, pz);
      ranchoGroup.add(p);
    });

    // Cobertura de sapé inclinada
    const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.22, 4.4), thatchMat);
    shedRoof.position.set(0, 2.9, 0);
    shedRoof.rotation.x = -0.15;
    ranchoGroup.add(shedRoof);

    // 2 Pares de remos em pé
    [-1.2, 1.2].forEach((rx, idx) => {
      const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 4), woodDarkMat);
      oar.position.set(rx, 1.3, -1.6);
      oar.rotation.set(0.15, idx * 0.2, 0.12 * (idx === 0 ? 1 : -1));
      ranchoGroup.add(oar);
    });

    // Carretilha manual de puxar barcos (molinete caiçara)
    const winchBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.8), woodDarkMat);
    winchBase.position.set(1.5, 0.18, 0.5);
    ranchoGroup.add(winchBase);
    const winchDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 6), woodWeatheredMat);
    winchDrum.rotation.z = Math.PI / 2;
    winchDrum.position.set(1.5, 0.45, 0.5);
    ranchoGroup.add(winchDrum);

    // Caixotes e ferramentas
    const toolBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), woodWeatheredMat);
    toolBox.position.set(-1.4, 0.25, 0);
    ranchoGroup.add(toolBox);

    // Fogueira de praia com pedras
    const fireRocks = [
      [0, -0.6], [0.6, 0], [0, 0.6], [-0.6, 0],
      [0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]
    ];
    fireRocks.forEach(([rx, rz]) => {
      const rk = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.15, 0),
        new THREE.MeshLambertMaterial({ color: 0x52525B, flatShading: true })
      );
      rk.position.set(rx, 0.08, 3.2 + rz);
      ranchoGroup.add(rk);
    });
    const logs = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.15), woodDarkMat);
    logs.position.set(0, 0.1, 3.2);
    logs.rotation.y = 0.5;
    ranchoGroup.add(logs);

    westExpGroup.add(ranchoGroup);

    westExpGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    this.propObstacles = this.propObstacles || [];
    this.propObstacles.push(
      { x: -110.0, z: -18.3, r: 1.15 },
      { x: -92.0, z: -25.0, r: 0.95 },
      { x: -94.3, z: -26.6, hw: 2.05, hd: 1.15, rotY: 0 },
      { x: -89.7, z: -26.6, hw: 2.05, hd: 1.15, rotY: 0 },
      { x: -94.3, z: -23.4, hw: 2.05, hd: 1.15, rotY: 0 },
      { x: -89.7, z: -23.4, hw: 2.05, hd: 1.15, rotY: 0 },
      { x: -128.0, z: 46.0, hw: 2.8, hd: 2.2, rotY: 0 }
    );

    this.group.add(westExpGroup);
  },

  // 6. EXPANSÃO DO FLANCO LESTE & DUNAS (Atualização 1.2.2)
  // Academia ao Ar Livre da Colina, Ponto de Mototáxi do Levante, Escola de Surfe e Passadiço
  createEastHillsideAndDuneExpansion() {
    const eastExpGroup = new THREE.Group();

    const steelDarkMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const woodDeckMat = new THREE.MeshLambertMaterial({ color: 0x854D0E, flatShading: true });
    const gravelMat = new THREE.MeshLambertMaterial({ color: 0x64748B, flatShading: true });
    const tireMat = new THREE.MeshLambertMaterial({ color: 0x1E293B, flatShading: true });
    const woodWeatheredMat = new THREE.MeshLambertMaterial({ color: 0x6B5B4D, flatShading: true });
    const bambooMat = new THREE.MeshLambertMaterial({ color: 0xD4A373, flatShading: true });

    // 1. MIRANTE DA ALVORADA & ACADEMIA AO AR LIVRE (x: 112, z: -12)
    const acadY = this.terrain ? this.terrain.getElevation(112, -12) : 6.2;
    const acadGroup = new THREE.Group();
    acadGroup.position.set(112, acadY, -12);

    // Piso de brita compactada
    const pad = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.25, 7.5), gravelMat);
    pad.position.y = 0.12;
    pad.receiveShadow = true;
    acadGroup.add(pad);

    // Bordadura de toras de madeira
    const borderN = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.35, 0.25), woodWeatheredMat);
    borderN.position.set(0, 0.18, -3.75);
    acadGroup.add(borderN);

    // Conjunto de Calistenia: Barras de tração escalonadas (Alturas: 2.3m, 2.0m, 1.7m)
    [-3.2, -1.6, 0].forEach((bx, idx) => {
      const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6 - idx * 0.3, 5), steelDarkMat);
      pL.position.set(bx - 0.7, 1.3 - idx * 0.15, -1.8);
      acadGroup.add(pL);

      const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6 - idx * 0.3, 5), steelDarkMat);
      pR.position.set(bx + 0.7, 1.3 - idx * 0.15, -1.8);
      acadGroup.add(pR);

      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.45, 5), steelDarkMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(bx, 2.5 - idx * 0.3, -1.8);
      acadGroup.add(bar);
    });

    // Barras Paralelas de Mergulho
    [-0.35, 0.35].forEach(pz => {
      [-0.8, 0.8].forEach(px => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 4), steelDarkMat);
        post.position.set(2.4 + px, 0.6, 1.2 + pz);
        acadGroup.add(post);
      });
      const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 4), steelDarkMat);
      topBar.rotation.z = Math.PI / 2;
      topBar.position.set(2.4, 1.2, 1.2 + pz);
      acadGroup.add(topBar);
    });

    // 2 Pneus pretos de caminhão para treino funcional
    [-2.2, -0.6].forEach(tx => {
      const tireGeo = new THREE.TorusGeometry(0.55, 0.22, 6, 12);
      tireGeo.rotateX(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.position.set(tx, 0.24, 1.8);
      acadGroup.add(tire);
    });

    // Prancha de abdominal inclinada
    const abBench = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.5), woodWeatheredMat);
    abBench.position.set(4.2, 0.65, -1.5);
    abBench.rotation.z = -0.32;
    acadGroup.add(abBench);

    // Bebedouro de água gelada comunitário
    const fountain = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.95, 0.4), new THREE.MeshLambertMaterial({ color: 0x94A3B8 }));
    fountain.position.set(4.6, 0.5, 2.2);
    acadGroup.add(fountain);

    eastExpGroup.add(acadGroup);

    // 2. PONTO DE MOTOTÁXI DO LEVANTE (x: 92, z: 14)
    const motoY = this.terrain ? this.terrain.getElevation(92, 14) : 1.2;
    const motoGroup = new THREE.Group();
    motoGroup.position.set(92, motoY, 14);

    // 4 Postes de madeira e cobertura de telha azul
    const motoPillars = [[-1.8, -1.2], [1.8, -1.2], [-1.8, 1.2], [1.8, 1.2]];
    motoPillars.forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 4), woodWeatheredMat);
      p.position.set(px, 1.2, pz);
      motoGroup.add(p);
    });

    const blueRoof = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.12, 3.2),
      new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: true })
    );
    blueRoof.position.set(0, 2.45, 0);
    blueRoof.rotation.x = -0.08;
    motoGroup.add(blueRoof);

    // Placa oficial do Mototáxi
    const motoSign = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.45, 0.06),
      new THREE.MeshLambertMaterial({ color: 0xFACC15 })
    );
    motoSign.position.set(0, 2.1, 1.55);
    motoGroup.add(motoSign);

    // Banco de concreto para espera
    const benchWait = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.4, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x64748B, flatShading: true })
    );
    benchWait.position.set(0, 0.22, -0.6);
    motoGroup.add(benchWait);

    // Helper: Constrói uma moto estilizada carioca
    const buildMoto = (x, z, rotY, tankColor) => {
      const m = new THREE.Group();
      m.position.set(x, 0.35, z);
      m.rotation.y = rotY;

      // Rodas
      const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 8);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelFront = new THREE.Mesh(wheelGeo, tireMat);
      wheelFront.position.set(0, 0.15, 0.7);
      m.add(wheelFront);
      const wheelBack = new THREE.Mesh(wheelGeo, tireMat);
      wheelBack.position.set(0, 0.15, -0.7);
      m.add(wheelBack);

      // Chassi e Motor
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 1.1), steelDarkMat);
      frame.position.set(0, 0.35, 0);
      m.add(frame);

      // Tanque de combustível colorido
      const tank = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.5), new THREE.MeshLambertMaterial({ color: tankColor }));
      tank.position.set(0, 0.55, 0.2);
      m.add(tank);

      // Guidão e Farol
      const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.05), steelDarkMat);
      handleBar.position.set(0, 0.75, 0.55);
      m.add(handleBar);
      const headLight = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: 0xFEF08A }));
      headLight.position.set(0, 0.68, 0.82);
      m.add(headLight);

      return m;
    };

    // 2 Motos estacionadas em 45°
    motoGroup.add(buildMoto(-1.6, 2.2, Math.PI / 3, 0xDC2626)); // Moto Vermelha
    motoGroup.add(buildMoto(0.8, 2.4, Math.PI / 3.5, 0x1E293B)); // Moto Preta

    eastExpGroup.add(motoGroup);

    // 3. ESCOLA COMUNITÁRIA DE SURFE & CAVALETE DE PRANCHAS (x: 126, z: 58)
    const surfY = this.terrain ? this.terrain.getElevation(126, 58) : 0.4;
    const surfGroup = new THREE.Group();
    surfGroup.position.set(126, surfY, 58);

    // Toldo leve de lona impermeável listrada
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.08, 3.8),
      new THREE.MeshLambertMaterial({ color: 0xFBBF24, flatShading: true })
    );
    awning.position.set(0, 2.4, 0);
    surfGroup.add(awning);

    [[-2.2, -1.7], [2.2, -1.7], [-2.2, 1.7], [2.2, 1.7]].forEach(([px, pz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 4), bambooMat);
      pole.position.set(px, 1.2, pz);
      surfGroup.add(pole);
    });

    // Cavalete de madeira de pinho para pranchas
    const rackBeam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.1), woodWeatheredMat);
    rackBeam.position.set(0, 0.95, -1.2);
    surfGroup.add(rackBeam);

    // 4 Pranchas de surfe em pé com cores vibrantes
    const boardColors = [0x0284C7, 0xFACC15, 0xEF4444, 0x8B5CF6];
    for (let b = 0; b < 4; b++) {
      const boardGroup = new THREE.Group();
      boardGroup.position.set(-1.3 + b * 0.85, 1.1, -1.05);
      boardGroup.rotation.set(-0.15, 0, (b % 2 === 0 ? 0.06 : -0.06));

      // Shape da prancha
      const boardMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 2.1, 0.08),
        new THREE.MeshLambertMaterial({ color: boardColors[b], flatShading: true })
      );
      boardGroup.add(boardMesh);

      // Quilha na parte traseira inferior
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 3), new THREE.MeshLambertMaterial({ color: 0x1E293B }));
      fin.position.set(0, -0.9, -0.06);
      fin.rotation.x = -Math.PI / 2;
      boardGroup.add(fin);

      surfGroup.add(boardGroup);
    }

    // Caixote de parafina
    const waxBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.5), woodWeatheredMat);
    waxBox.position.set(1.4, 0.2, 0.8);
    surfGroup.add(waxBox);

    eastExpGroup.add(surfGroup);

    // 4. PASSADIÇO ECOLÓGICO DE MADEIRA SOBRE A RESTINGA (x: 118 a 138, z: 36 a 55)
    const pathPlankCount = 14;
    for (let p = 0; p < pathPlankCount; p++) {
      const t = p / (pathPlankCount - 1);
      const px = 118 + t * 18;
      const pz = 36 + t * 18 + Math.sin(t * Math.PI) * 2.5; // Curva suave
      const py = this.terrain ? this.terrain.getElevation(px, pz) : 0.45;

      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.9), woodDeckMat);
      plank.position.set(px, py + 0.18, pz);
      plank.rotation.y = 0.75 + Math.cos(t * Math.PI) * 0.2;
      eastExpGroup.add(plank);

      // Mourões balizadores a cada 3 pranchas
      if (p % 3 === 0) {
        [-1.2, 1.2].forEach(ox => {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.85, 4), woodWeatheredMat);
          post.position.set(px + ox * 0.8, py + 0.45, pz);
          eastExpGroup.add(post);
        });
      }
    }

    eastExpGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    this.propObstacles = this.propObstacles || [];
    this.propObstacles.push(
      { x: 110.4, z: -13.8, hw: 2.5, hd: 0.65, rotY: 0 },
      { x: 114.4, z: -10.8, hw: 1.15, hd: 0.75, rotY: 0, ignoreRoles: ['Atleta de Calistenia'] },
      { x: 110.6, z: -10.2, hw: 1.65, hd: 0.85, rotY: 0 },
      { x: 92.0, z: 13.4, hw: 1.6, hd: 0.55, rotY: 0 },
      { x: 90.4, z: 16.2, r: 1.05 },
      { x: 92.8, z: 16.4, r: 1.05 },
      { x: 126.0, z: 56.9, hw: 2.05, hd: 0.55, rotY: 0 },
      { x: 127.4, z: 58.8, r: 0.75 }
    );

    this.group.add(eastExpGroup);
  },

  // CINTURÃO DA MATA ATLÂNTICA (Versão 3.0 — Árvores Tropicais Realistas em Camadas & Fronteira Continental)
  // Emoldura as bordas externas do continente expandido com árvores de copa multi-camadas em verdes naturais,
  // mantendo todos os vales expandidos (Oeste, Leste e Norte) 100% livres para estradas, casas e moradores!
  createMataAtlanticaBorders() {
    const forestGroup = new THREE.Group();
    this.forestGroup = forestGroup;
    
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x4B5052, flatShading: true });
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4E342E, flatShading: true });
    const leafMats = [
      new THREE.MeshLambertMaterial({ color: 0x1B4332, flatShading: true }),
      new THREE.MeshLambertMaterial({ color: 0x2D6A4F, flatShading: true }),
      new THREE.MeshLambertMaterial({ color: 0x2E7D32, flatShading: true }),
      new THREE.MeshLambertMaterial({ color: 0x386641, flatShading: true })
    ];
    const waterMat = new THREE.MeshBasicMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.8 });

    const trunkGeo = new THREE.CylinderGeometry(0.20, 0.44, 3.1, 6);
    const branchGeo = new THREE.CylinderGeometry(0.09, 0.16, 1.4, 5);
    const foliageGeo = new THREE.IcosahedronGeometry(1.75, 1);

    const generatePatch = (startX, endX, startZ, endZ, density) => {
      for (let i = 0; i < density; i++) {
        const px = startX + Math.random() * (endX - startX);
        const pz = startZ + Math.random() * (endZ - startZ);
        
        // ZONA DE EXCLUSÃO RIGOROSA: Protege 100% de toda a área urbana e vales expandidos (-285..+285, z > -192)!
        if (Math.abs(px) < 285 && pz > -192) continue;
        if (pz > 10) continue; // Protege toda a faixa costeira e praias
        
        // PRESERVAÇÃO ESTRITA: NUNCA brotar sobre casas, plateaus, vielas ou monumentos
        const nearHouse = this.houses && this.houses.some(h => Math.hypot(h.position.x - px, h.position.z - pz) < 9.5);
        if (nearHouse) continue;

        const plateaus = (this.allPlateaus || []).concat((this.terrain && this.terrain.allPlateaus) || []);
        const nearPlateau = plateaus.some(pl => Math.hypot(pl.x - px, pl.z - pz) < 9.5);
        if (nearPlateau) continue;

        const nearInfra = this.infrastructureNodes && this.infrastructureNodes.some(n => Math.hypot(n.x - px, n.z - pz) < 6.5);
        if (nearInfra) continue;

        const py = this.terrain ? this.terrain.getElevation(px, pz) : 0;
        if (py < 2.2) continue;
        
        // 15% chance de afloramentos de granito, 85% árvores tropicais realistas em camadas
        if (Math.random() > 0.85) {
          const rSize = 2.6 + Math.random() * 3.0;
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rSize, 1), rockMat);
          rock.position.set(px, py - rSize * 0.35, pz);
          rock.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
          rock.scale.set(1.3, 0.55 + Math.random() * 0.35, 1.1);
          rock.castShadow = true;
          rock.userData = { isForestRock: true, x: px, z: pz };
          forestGroup.add(rock);
          this.natureObstacles.push({ x: px, z: pz, radius: rSize * 1.2 });
        } else {
          // Árvore Tropical Realista da Mata Atlântica (Tronco + Galhos + 3 Camadas de Copa Orgânica)
          const treeGroup = new THREE.Group();
          treeGroup.position.set(px, py, pz);
          const tScale = 0.85 + Math.random() * 0.55; 
          
          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.position.y = 1.45 * tScale;
          trunk.scale.set(tScale, tScale, tScale);
          trunk.castShadow = true;
          treeGroup.add(trunk);

          [-1, 1].forEach(dir => {
            const br = new THREE.Mesh(branchGeo, trunkMat);
            br.position.set(dir * 0.38 * tScale, 2.35 * tScale, 0);
            br.rotation.z = -dir * 0.55;
            br.scale.set(tScale, tScale, tScale);
            treeGroup.add(br);
          });

          const m1 = leafMats[i % leafMats.length];
          const m2 = leafMats[(i + 1) % leafMats.length];
          const m3 = leafMats[(i + 2) % leafMats.length];

          const crownL = new THREE.Mesh(foliageGeo, m1);
          crownL.position.set(-0.85 * tScale, 2.95 * tScale, 0.25 * tScale);
          crownL.scale.set(1.15 * tScale, 0.68 * tScale, 1.10 * tScale);
          crownL.castShadow = true;
          treeGroup.add(crownL);

          const crownR = new THREE.Mesh(foliageGeo, m2);
          crownR.position.set(0.85 * tScale, 3.15 * tScale, -0.25 * tScale);
          crownR.scale.set(1.10 * tScale, 0.72 * tScale, 1.12 * tScale);
          crownR.castShadow = true;
          treeGroup.add(crownR);

          const crownTop = new THREE.Mesh(foliageGeo, m3);
          crownTop.position.set(0, 3.85 * tScale, 0);
          crownTop.scale.set(1.22 * tScale, 0.76 * tScale, 1.18 * tScale);
          crownTop.castShadow = true;
          treeGroup.add(crownTop);

          treeGroup.rotation.y = Math.random() * Math.PI * 2;
          treeGroup.userData = { isForestTree: true, x: px, z: pz };
          forestGroup.add(treeGroup);
          this.natureObstacles.push({ x: px, z: pz, radius: 3.2 * tScale });
        }
      }
    };

    // 1. Cordilheira Norte Profunda (Acima da nova área construível norte: Z de -195 a -265)
    generatePatch(-290, 290, -260, -195, 110);
    // 2. Borda Extrema Oeste (Além do Vale do Poente: X de -360 a -290)
    generatePatch(-360, -290, -195, 5, 45);
    // 3. Borda Extrema Leste (Além do Vale do Levante: X de 290 a 360)
    generatePatch(290, 360, -195, 5, 45);

    // CACHOEIRA PROCEDURAL COLOSSAL (No Paredão da Cordilheira Norte em Z = -202)
    const fallGroup = new THREE.Group();
    const fallX = -25;
    const fallZ = -202;
    const fallY = this.terrain ? this.terrain.getElevation(fallX, fallZ) : 34;
    fallGroup.position.set(fallX, fallY, fallZ);
    
    // Queda d'água principal
    const stream = new THREE.Mesh(new THREE.BoxGeometry(6, 26, 1.5), waterMat);
    stream.position.set(0, -11, 1.5);
    stream.rotation.x = Math.PI / 12;
    fallGroup.add(stream);
    
    // Piscina Natural Base
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1.5, 12), waterMat);
    pool.position.set(0, -23, 4.5);
    fallGroup.add(pool);

    // Pedregulhos emoldurando a cachoeira
    for (let i = 0; i < 10; i++) {
      const rRad = 2.5 + Math.random() * 2.5;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rRad, 0), rockMat);
      const rx = -9 + Math.random() * 18;
      const rz = 1 + Math.random() * 5;
      rock.position.set(rx, -24 + Math.random() * 20, rz);
      fallGroup.add(rock);
      this.natureObstacles.push({ x: fallX + rx, z: fallZ + rz, radius: rRad * 1.3 });
    }
    forestGroup.add(fallGroup);

    this.group.add(forestGroup);
  },

  // 7. MIRANTE DO PÔR DO SOL (Deck Panorâmico no Precipício Oeste)
  createMiranteDoPoente(pos = { x: -98, z: -55 }) {
    const deckGroup = new THREE.Group();
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 6.8;
    deckGroup.position.set(pos.x, y, pos.z);

    // Cantilevered wooden deck over cliff
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x6B4F35, flatShading: true });
    const deckPlatform = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.35, 6.0), woodMat);
    deckPlatform.position.y = 0.18;
    deckPlatform.receiveShadow = true;
    deckGroup.add(deckPlatform);

    // Support pillars digging into mountain slope
    for (let sX of [-3.0, 3.0]) {
      for (let sZ of [-2.5, 2.5]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.0, 5), woodMat);
        pillar.position.set(sX, -1.8, sZ);
        deckGroup.add(pillar);
      }
    }

    // Wooden Pergola overhead
    const pergolaMat = new THREE.MeshLambertMaterial({ color: 0x78350F });
    for (let bX of [-2.8, 2.8]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 0.2), pergolaMat);
      beam.position.set(bX, 1.6, -2.4);
      deckGroup.add(beam);
    }
    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.18, 0.3), pergolaMat);
    crossBar.position.set(0, 3.1, -2.4);
    deckGroup.add(crossBar);

    // Perimeter guardrails
    const railMat = new THREE.MeshLambertMaterial({ color: 0x8C7456 });
    const frontRail = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.95, 0.1), railMat);
    frontRail.position.set(0, 0.55, -2.9);
    deckGroup.add(frontRail);
    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.95, 5.8), railMat);
    leftRail.position.set(-3.4, 0.55, 0);
    deckGroup.add(leftRail);

    // Benches facing the open sea
    const benchMat = new THREE.MeshLambertMaterial({ color: 0x4E3524 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.6), benchMat);
    bench.position.set(1.4, 0.35, 0.8);
    deckGroup.add(bench);

    // Brass telescope on pedestal
    const brassMat = new THREE.MeshLambertMaterial({ color: 0xD97706 });
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.1, 6), brassMat);
    ped.position.set(-1.8, 0.6, -1.8);
    deckGroup.add(ped);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.85, 6), brassMat);
    scope.rotation.x = 1.35;
    scope.position.set(-1.8, 1.25, -1.8);
    deckGroup.add(scope);

    this.group.add(deckGroup);
  },

  // 9. MIRANTE DO SOL NASCENTE (Deck Panorâmico no Precipício Leste)
  createMiranteDoLevante(pos = { x: 98, z: -55 }) {
    const deckGroup = new THREE.Group();
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 6.8;
    deckGroup.position.set(pos.x, y, pos.z);

    // Sturdy wooden cantilevered deck
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x6B4F35, flatShading: true });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.35, 6.0), woodMat);
    platform.position.y = 0.18;
    platform.receiveShadow = true;
    deckGroup.add(platform);

    for (let sX of [-3.0, 3.0]) {
      for (let sZ of [-2.5, 2.5]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.0, 5), woodMat);
        pillar.position.set(sX, -1.8, sZ);
        deckGroup.add(pillar);
      }
    }

    // Railing
    const railMat = new THREE.MeshLambertMaterial({ color: 0x8C7456 });
    const frontRail = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.95, 0.1), railMat);
    frontRail.position.set(0, 0.55, -2.9);
    deckGroup.add(frontRail);
    const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.95, 5.8), railMat);
    rightRail.position.set(3.4, 0.55, 0);
    deckGroup.add(rightRail);

    // Picnic table & benches
    const tableMat = new THREE.MeshLambertMaterial({ color: 0x582F0E });
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 1.0), tableMat);
    table.position.set(-1.2, 0.45, 0.5);
    deckGroup.add(table);

    // Flagpole with Guanabara maritime pennant
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.8, 5), new THREE.MeshLambertMaterial({ color: 0xCBD5E1 }));
    pole.position.set(2.2, 2.4, -2.0);
    deckGroup.add(pole);

    const flagMat = new THREE.MeshBasicMaterial({ color: 0x2563EB });
    const flag = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.03), flagMat);
    flag.position.set(2.9, 4.2, -2.0);
    deckGroup.add(flag);

    // Telescope
    const brassMat = new THREE.MeshLambertMaterial({ color: 0xD97706 });
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.1, 6), brassMat);
    ped.position.set(1.4, 0.6, -2.2);
    deckGroup.add(ped);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.85, 6), brassMat);
    scope.rotation.x = 1.35;
    scope.position.set(1.4, 1.25, -2.2);
    deckGroup.add(scope);

    this.group.add(deckGroup);
  },

  // 8. A GRANDE OLARIA IMPERIAL & CERÂMICA COMUNITÁRIA (Fornos de Barro e Telhas)
  createGrandeOlariaCeramica(pos = { x: 95, z: -18 }) {
    const olariaGroup = new THREE.Group();
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 5.2;
    olariaGroup.position.set(pos.x, y, pos.z);

    // Terraced pad foundation
    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 9.2, 1.8, 14),
      new THREE.MeshLambertMaterial({ color: 0x6E4C33, flatShading: true })
    );
    ground.position.y = -0.7;
    ground.receiveShadow = true;
    olariaGroup.add(ground);

    const brickRedMat = new THREE.MeshLambertMaterial({ color: 0xB45309, flatShading: true });
    const darkBrickMat = new THREE.MeshLambertMaterial({ color: 0x78350F, flatShading: true });

    // 2 Traditional Dome Brick Kilns (Fornos de Barro de Queima Contínua)
    for (let k = 0; k < 2; k++) {
      const kilnX = -2.8 + k * 4.6;
      const kGroup = new THREE.Group();

      // Kiln cylinder base
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1.8, 10), brickRedMat);
      base.position.y = 0.9;
      base.castShadow = true;
      kGroup.add(base);

      // Kiln dome top
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), brickRedMat);
      dome.position.y = 1.8;
      kGroup.add(dome);

      // Chimney stack
      const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 2.2, 6), darkBrickMat);
      chim.position.set(0, 3.4, 0);
      kGroup.add(chim);

      // Glowing arched doorway
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.3), new THREE.MeshBasicMaterial({ color: 0x1E1B18 }));
      door.position.set(0, 0.5, 1.6);
      kGroup.add(door);

      // Fire ember pointlight
      const fireGlow = new THREE.PointLight(0xEA580C, 1.8, 8);
      fireGlow.position.set(0, 0.6, 1.8);
      kGroup.add(fireGlow);
      if (k === 0) this.kilnFire = fireGlow;

      kGroup.position.set(kilnX, 0, -2.5);
      olariaGroup.add(kGroup);
    }

    // Open Timber Tile Curing Shed (Barracão de Secagem de Telhas)
    const shed = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5C4033 });
    for (let pX of [-2.4, 2.4]) {
      for (let pZ of [-1.5, 1.5]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 4), woodMat);
        post.position.set(pX, 1.2, pZ);
        shed.add(post);
      }
    }
    const tileRoofMat = new THREE.MeshLambertMaterial({ color: 0xC2410C, flatShading: true });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.2, 4), tileRoofMat);
    roof.position.set(0, 2.8, 0);
    roof.rotation.y = Math.PI / 4;
    shed.add(roof);

    // Stacks of terracotta tiles inside
    for (let t = -1.6; t <= 1.6; t += 0.55) {
      const tileStack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 1.8), tileRoofMat);
      tileStack.position.set(t, 0.4, 0);
      shed.add(tileStack);
    }
    shed.position.set(0, 0, 3.0);
    olariaGroup.add(shed);

    // Finished brick pallets
    for (let p = 0; p < 3; p++) {
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.9), brickRedMat);
      pallet.position.set(4.5, 0.4, -1.0 + p * 1.5);
      pallet.castShadow = true;
      olariaGroup.add(pallet);
    }

    this.group.add(olariaGroup);
    this.propObstacles = this.propObstacles || [];
    this.propObstacles.push(
      { x: pos.x - 2.8, z: pos.z - 2.5, r: 2.15 },
      { x: pos.x + 1.8, z: pos.z - 2.5, r: 2.15 },
      { x: pos.x, z: pos.z + 3.0, hw: 2.8, hd: 1.9, rotY: 0 },
      { x: pos.x + 4.5, z: pos.z + 0.5, hw: 1.0, hd: 2.2, rotY: 0 }
    );
  },

  createBrickOlaria(pos) {
    const olariaGroup = new THREE.Group();
    // Apoiado diretamente no terreno plano esculpido (sem base)
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) + 0.1 : 6.8;
    olariaGroup.position.set(pos.x, y, pos.z);

    // Traditional red brick dome kiln (Forno de Queima de Tijolos)
    const kilnMat = new THREE.MeshLambertMaterial({ color: 0x8C2D19, flatShading: true });
    const kilnBody = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 2.6, 10), kilnMat);
    kilnBody.position.set(-3.5, 1.3, 0);
    kilnBody.castShadow = true;
    olariaGroup.add(kilnBody);

    const kilnCap = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 10), kilnMat);
    kilnCap.position.set(-3.5, 3.2, 0);
    olariaGroup.add(kilnCap);

    // Smoking chimney stack
    const chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 3.8, 6),
      new THREE.MeshLambertMaterial({ color: 0x481E14 })
    );
    chimney.position.set(-3.5, 4.6, 0);
    olariaGroup.add(chimney);

    // Fire glow from kiln door
    const fireDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.9, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xFF5400 })
    );
    fireDoor.position.set(-3.5, 0.6, 2.7);
    olariaGroup.add(fireDoor);

    const fireGlow = new THREE.PointLight(0xFF6B00, 1.8, 8);
    fireGlow.position.set(-3.5, 0.8, 3.0);
    olariaGroup.add(fireGlow);

    // Stacks of finished red clay bricks ready for transport
    const brickMat = new THREE.MeshLambertMaterial({ color: 0xB55338, flatShading: true });
    for (let bx = 0; bx < 3; bx++) {
      for (let bz = 0; bz < 2; bz++) {
        const stack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.1), brickMat);
        stack.position.set(1.5 + bx * 1.8, 0.55, -2.0 + bz * 2.2);
        stack.castShadow = true;
        olariaGroup.add(stack);
      }
    }

    // Wooden loading platform roof
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x6C4A2D });
    for (let c = 0; c < 4; c++) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 4), woodMat);
      pole.position.set(1.0 + (c % 2) * 4.2, 1.6, -3.0 + Math.floor(c / 2) * 4.5);
      olariaGroup.add(pole);
    }
    const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.15, 5.5), woodMat);
    shedRoof.position.set(3.1, 3.2, -0.75);
    olariaGroup.add(shedRoof);

    this.group.add(olariaGroup);
    this.olaria = olariaGroup;
    this.propObstacles = this.propObstacles || [];
    this.propObstacles.push(
      { x: pos.x - 3.5, z: pos.z, r: 3.15 },
      { x: pos.x + 3.2, z: pos.z - 0.9, hw: 2.75, hd: 2.15, rotY: 0 }
    );
  },

  createHillsideCommunityDetails() {
    if (this.hillsideCommunityCreated) return;
    this.hillsideCommunityCreated = true;

    const detailsGroup = new THREE.Group();

    // Shared materials for strict performance (< 5% limit):
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5D4037, flatShading: true });
    const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });
    const brickStiltMat = new THREE.MeshLambertMaterial({ color: 0xB55338, flatShading: true });
    const waterTankMat = this.sharedWaterTankMat || new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: true });
    const tankGeo = this.sharedWaterTankGeo || new THREE.CylinderGeometry(0.65, 0.55, 1.1, 7);
    const lidGeo = this.sharedWaterTankLidGeo || new THREE.CylinderGeometry(0.7, 0.7, 0.14, 7);
    const pipeMat = new THREE.MeshLambertMaterial({ color: 0x64748B, flatShading: true });
    const bananaStemMat = new THREE.MeshLambertMaterial({ color: 0x4D7C0F, flatShading: true });
    const bananaLeafMat = new THREE.MeshLambertMaterial({ color: 0x16A34A, flatShading: true });
    const bananaBlossomMat = new THREE.MeshLambertMaterial({ color: 0x86198F, flatShading: true });
    const crateYellowMat = new THREE.MeshLambertMaterial({ color: 0xF59E0B, flatShading: true });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x222222 });

    // 1. ELEVATED COMMUNITY WATER TANKS ON BRICK / TIMBER STILTS (Caixas d'Água sobre palafitas)
    // Iconic Rio hillside infrastructure supplying gravity-fed running water to the alleys
    const waterTankSpots = [
      { x: -14, z: -10, rot: 0.1 },
      { x: 14,  z: -10, rot: -0.1 },
      { x: -25, z: -25, rot: 0.2 },
      { x: 25,  z: -25, rot: -0.2 },
      { x: -6,  z: -34, rot: 0.05 },
      { x: 6,   z: -34, rot: -0.05 },
      { x: -44, z: -22, rot: 0.15 },
      { x: 44,  z: -22, rot: -0.15 },
      { x: -70, z: -44, rot: 0.3 },
      { x: 70,  z: -44, rot: -0.3 }
    ];

    waterTankSpots.forEach(spot => {
      if (this.terrain && this.terrain.isProtectedLandmark && this.terrain.isProtectedLandmark(spot.x, spot.z, 2.5)) return;
      if (this.infrastructureNodes && this.infrastructureNodes.some(n => Math.hypot(n.x - spot.x, n.z - spot.z) < 3.2)) return;

      const groundY = this.terrain ? this.terrain.getElevation(spot.x, spot.z) : 10.0;
      const tankTower = new THREE.Group();
      tankTower.position.set(spot.x, groundY, spot.z);
      tankTower.rotation.y = spot.rot;

      // 4 Pilares de sustentação (tijolo ou madeira rústica)
      const stiltGeo = new THREE.BoxGeometry(0.22, 1.9, 0.22);
      [-0.65, 0.65].forEach(sx => {
        [-0.65, 0.65].forEach(sz => {
          const stilt = new THREE.Mesh(stiltGeo, brickStiltMat);
          stilt.position.set(sx, 0.95, sz);
          tankTower.add(stilt);
        });
      });

      // Travessas transversais de madeira
      const beamGeoX = new THREE.BoxGeometry(1.5, 0.12, 0.12);
      const beam1 = new THREE.Mesh(beamGeoX, darkWoodMat);
      beam1.position.set(0, 1.4, 0.65);
      tankTower.add(beam1);
      const beam2 = new THREE.Mesh(beamGeoX, darkWoodMat);
      beam2.position.set(0, 1.4, -0.65);
      tankTower.add(beam2);

      // Deck da plataforma
      const deck = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 1.6), darkWoodMat);
      deck.position.set(0, 1.95, 0);
      tankTower.add(deck);

      // Caixa d'Água cilíndrica azul e tampa
      const tankMesh = new THREE.Mesh(tankGeo, waterTankMat);
      tankMesh.position.set(0, 2.55, 0);
      tankTower.add(tankMesh);

      const lidMesh = new THREE.Mesh(lidGeo, waterTankMat);
      lidMesh.position.set(0, 3.14, 0);
      tankTower.add(lidMesh);

      // Tubulação vertical de PVC descendo até a encosta
      const pipeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 4), pipeMat);
      pipeMesh.position.set(0.68, 1.2, 0.4);
      tankTower.add(pipeMesh);

      tankTower.matrixAutoUpdate = false;
      tankTower.updateMatrix();
      detailsGroup.add(tankTower);
    });

    // 2. VARAIS DE ROUPA COMUNITÁRIOS (Free-standing hillside clotheslines)
    // Clotheslines stretched on rustic timber posts with colorful fluttering laundry
    const clotheslineSpots = [
      { x: -18, z: -7,  rot: 0.3 },
      { x: 18,  z: -7,  rot: -0.3 },
      { x: -10, z: -19, rot: 0.1 },
      { x: 10,  z: -19, rot: -0.1 },
      { x: -22, z: -31, rot: 0.4 },
      { x: 22,  z: -31, rot: -0.4 },
      { x: -36, z: -15, rot: 0.2 },
      { x: 36,  z: -15, rot: -0.2 },
      { x: -52, z: -34, rot: 0.35 },
      { x: 52,  z: -34, rot: -0.35 }
    ];

    const clothesColors = [0xFF5964, 0x35A7FF, 0xFFE74C, 0xFFFFFF, 0x10B981, 0xEC4899];
    const stickGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.6, 4);
    const wireGeo = new THREE.BoxGeometry(2.0, 0.02, 0.02);
    const clothGeo = new THREE.BoxGeometry(0.38, 0.52, 0.03);

    clotheslineSpots.forEach((clSpot, idx) => {
      if (this.terrain && this.terrain.isProtectedLandmark && this.terrain.isProtectedLandmark(clSpot.x, clSpot.z, 2.0)) return;
      if (this.infrastructureNodes && this.infrastructureNodes.some(n => Math.hypot(n.x - clSpot.x, n.z - clSpot.z) < 2.8)) return;

      const groundY = this.terrain ? this.terrain.getElevation(clSpot.x, clSpot.z) : 10.0;
      const clGroup = new THREE.Group();
      clGroup.position.set(clSpot.x, groundY, clSpot.z);
      clGroup.rotation.y = clSpot.rot;

      [-0.95, 0.95].forEach(px => {
        const pole = new THREE.Mesh(stickGeo, darkWoodMat);
        pole.position.set(px, 0.8, 0);
        clGroup.add(pole);
      });

      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.position.set(0, 1.45, 0);
      clGroup.add(wire);

      for (let c = 0; c < 3; c++) {
        const cMat = new THREE.MeshLambertMaterial({
          color: clothesColors[(idx * 3 + c) % clothesColors.length],
          flatShading: true
        });
        const cloth = new THREE.Mesh(clothGeo, cMat);
        cloth.position.set(-0.5 + c * 0.5, 1.15, 0);
        clGroup.add(cloth);
        if (this.clotheslines) {
          this.clotheslines.push({ mesh: cloth, phase: idx * 0.7 + c * 0.9 });
        }
      }

      detailsGroup.add(clGroup);
    });

    // 3. BOSQUES DE BANANEIRAS & VEGETAÇÃO DE ENCOSTA (Banana groves & tropical greenery)
    // Banana plants with arching leaves and pendant purple banana flower clusters
    const bananaClusters = [
      { x: -8,  z: -12 }, { x: 8,   z: -12 },
      { x: -16, z: -23 }, { x: 16,  z: -23 },
      { x: -32, z: -19 }, { x: 32,  z: -19 },
      { x: -3,  z: -36 }, { x: 3,   z: -36 },
      { x: -50, z: -44 }, { x: 50,  z: -44 },
      { x: -68, z: -28 }, { x: 68,  z: -28 }
    ];

    const bLeafGeo = new THREE.BoxGeometry(0.32, 0.03, 1.35);
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 2.0, 5);
    const blossomGeo = new THREE.ConeGeometry(0.14, 0.38, 5);

    bananaClusters.forEach((cluster, cIdx) => {
      if (this.terrain && this.terrain.isProtectedLandmark && this.terrain.isProtectedLandmark(cluster.x, cluster.z, 2.5)) return;
      if (this.infrastructureNodes && this.infrastructureNodes.some(n => Math.hypot(n.x - cluster.x, n.z - cluster.z) < 3.2)) return;

      const numPlants = 2 + (cIdx % 2);
      for (let p = 0; p < numPlants; p++) {
        const px = cluster.x + Math.sin(p * 2.3 + cIdx) * 1.4;
        const pz = cluster.z + Math.cos(p * 2.3 + cIdx) * 1.4;
        const groundY = this.terrain ? this.terrain.getElevation(px, pz) : 10.0;

        const bGroup = new THREE.Group();
        bGroup.position.set(px, groundY, pz);
        bGroup.rotation.y = (cIdx + p) * 1.6;

        // Tronco levemente inclinado
        const trunk = new THREE.Mesh(trunkGeo, bananaStemMat);
        trunk.position.set(0, 1.0, 0);
        trunk.rotation.x = 0.08 * (p === 0 ? 1 : -1);
        bGroup.add(trunk);

        // 5 Folhas largas arqueadas em leque
        for (let l = 0; l < 5; l++) {
          const lAngle = (l / 5) * Math.PI * 2 + 0.3;
          const leaf = new THREE.Mesh(bLeafGeo, bananaLeafMat);
          leaf.position.set(Math.sin(lAngle) * 0.65, 1.95 - (l % 2) * 0.1, Math.cos(lAngle) * 0.65);
          leaf.rotation.y = lAngle;
          leaf.rotation.x = 0.42;
          bGroup.add(leaf);
        }

        // Cacho de bananas e flor pêndula roxa (coração da bananeira)
        if (p === 0) {
          const blossom = new THREE.Mesh(blossomGeo, bananaBlossomMat);
          blossom.position.set(0.2, 1.4, 0.3);
          blossom.rotation.x = Math.PI;
          bGroup.add(blossom);
        }

        bGroup.matrixAutoUpdate = false;
        bGroup.updateMatrix();
        detailsGroup.add(bGroup);
      }
    });

    // 4. MIRANTES DE BOLSO & PONTOS DE RESENHA NA LADEIRA (Resting spots with crates & solar lights)
    const restSpots = [
      { x: -12, z: -8,  rot: 0.15 },
      { x: 12,  z: -8,  rot: -0.15 },
      { x: -20, z: -21, rot: 0.25 },
      { x: 20,  z: -21, rot: -0.25 },
      { x: -4,  z: -30, rot: 0.0 }
    ];

    const benchSeatGeo = new THREE.BoxGeometry(1.5, 0.10, 0.45);
    const crateGeo = new THREE.BoxGeometry(0.44, 0.28, 0.35);

    restSpots.forEach(rst => {
      if (this.terrain && this.terrain.isProtectedLandmark && this.terrain.isProtectedLandmark(rst.x, rst.z, 2.0)) return;
      if (this.infrastructureNodes && this.infrastructureNodes.some(n => Math.hypot(n.x - rst.x, n.z - rst.z) < 2.5)) return;

      const groundY = this.terrain ? this.terrain.getElevation(rst.x, rst.z) : 10.0;
      const rGroup = new THREE.Group();
      rGroup.position.set(rst.x, groundY, rst.z);
      rGroup.rotation.y = rst.rot;

      const bSeat = new THREE.Mesh(benchSeatGeo, woodMat);
      bSeat.position.set(0, 0.35, 0);
      rGroup.add(bSeat);

      [-0.6, 0.6].forEach(bx => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.4), darkWoodMat);
        leg.position.set(bx, 0.175, 0);
        rGroup.add(leg);
      });

      const bBack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.06), woodMat);
      bBack.position.set(0, 0.62, -0.2);
      rGroup.add(bBack);

      // Engradado amarelo de refrigerante/cerveja ao lado do banco
      const crate = new THREE.Mesh(crateGeo, crateYellowMat);
      crate.position.set(1.05, 0.14, 0);
      rGroup.add(crate);

      // Postezinho com luminária solar
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.4, 4), darkWoodMat);
      post.position.set(-1.05, 1.2, 0);
      rGroup.add(post);

      const lamp = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: 0xFEF08A }));
      lamp.position.set(-1.05, 2.4, 0);
      rGroup.add(lamp);

      rGroup.matrixAutoUpdate = false;
      rGroup.updateMatrix();
      detailsGroup.add(rGroup);
    });

    this.group.add(detailsGroup);
    this.hillsideCommunityGroup = detailsGroup;
  }
};
