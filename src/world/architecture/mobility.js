import * as THREE from 'three';
import { createStylizedFigure } from '../npcs/population.js';

/**
 * MobilityMixin (mobility.js)
 * Sistemas de Mobilidade Viva do Morro:
 * 1. 🚡 Sistema Completo de Teleférico / Bondinho Carioca:
 *    - 3 Estações Arquitetônicas (Terminal Orla, Estação Central Morro do Sol, Terminal Alto da Serra)
 *    - Rodas Motrizes (Bullwheels) giratórias nas estações
 *    - Torres Treliçadas com roletes (Sheave Trains) e sinalização aérea noturna
 *    - Cabos Duplos (Portador + Trator) com curva catenária natural
 *    - 4 Cabines Panorâmicas com trolley de roldanas, passageiros 3D visíveis, faróis e portas automáticas nas estações
 * 2. 🛵 Cooperativa de Mototáxis em Movimento pelas Ladeiras (3 Motos com piloto + passageiro subindo o morro)
 */
export const MobilityMixin = {
  createMobilitySystems() {
    this.mobilityDynamicGroups = this.mobilityDynamicGroups || [];
    this.cableCars = [];
    this.stationBullwheels = [];
    this.movingMototaxis = [];

    this._createCableCarSystem();
    this._createMovingMototaxis();
  },

  // Calcula a altura exata do cabo com curvatura catenária entre dois apoios
  _sampleCablePoint(tGlobal, offsetX = 0) {
    const pts = this.cableWaypoints;
    const segCount = pts.length - 1;
    const clampedT = Math.max(0, Math.min(1, tGlobal));
    const scaled = clampedT * segCount;
    const segIdx = Math.min(segCount - 1, Math.floor(scaled));
    const localT = scaled - segIdx;

    const pA = pts[segIdx];
    const pB = pts[segIdx + 1];

    const out = new THREE.Vector3().lerpVectors(pA, pB, localT);
    out.x += offsetX;

    // Barriga catenária natural do cabo de aço entre torres (exceto dentro da estação)
    const spanDist = pA.distanceTo(pB);
    const sagAmount = Math.min(0.65, spanDist * 0.022);
    const sag = Math.sin(localT * Math.PI) * sagAmount;
    out.y -= sag;

    return { pos: out, segIdx, localT, pA, pB };
  },

  _createCableCarSystem() {
    const stationGroup = new THREE.Group();

    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x64748B, flatShading: true });
    const concreteLightMat = new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: true });
    const darkSteelMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const brushedSteelMat = new THREE.MeshLambertMaterial({ color: 0xCBD5E1, flatShading: true });
    const roofBlueMat = new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: true });
    const roofTealMat = new THREE.MeshLambertMaterial({ color: 0x0D9488, flatShading: true });
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xFACC15, flatShading: true });
    const terracottaMat = new THREE.MeshLambertMaterial({ color: 0xE76F51, flatShading: true });
    const woodDeckMat = new THREE.MeshLambertMaterial({ color: 0x78350F, flatShading: true });
    const cableMainMat = new THREE.MeshBasicMaterial({ color: 0x1E293B });
    const cableHaulMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
    const warmBulbMat = new THREE.MeshBasicMaterial({ color: 0xFEF08A });
    const redBeaconMat = new THREE.MeshBasicMaterial({ color: 0xEF4444 });

    // Coordenadas da Linha do Bondinho (Corredor Panorâmico Dedicado Leste-Central: X = 32.0, Z = 11.5 até Z = -58.0)
    // 100% livre de sobreposições com o Morro do Sol, a Ladeira do Morro do Sol, o Campinho e as casas!
    const lineX = 32.0;
    const zBase = 11.5;
    const zMid = -17.0; // Estação Intermediária Mirante da Encosta
    const zTop = -58.0; // Terminal Alto da Serra Leste

    const yBase = this.terrain ? this.terrain.getElevation(lineX, zBase) : 2.5;
    const yMid = this.terrain ? this.terrain.getElevation(lineX, zMid) : 11.5;
    const yTop = this.terrain ? this.terrain.getElevation(lineX, zTop) : 16.5;

    // Reserva todo o corredor aéreo/terrestre do bondinho contra spawn de casas
    if (this.infrastructureNodes) {
      for (let cz = zBase; cz >= zTop; cz -= 5.5) {
        this.infrastructureNodes.push({ x: lineX, z: cz, r: 7.5 });
      }
    }

    // Helper para construir Estações Terminais (Base Orla e Topo Serra)
    const buildTerminalStation = (x, y, z, accentColor, isTop) => {
      const st = new THREE.Group();
      st.position.set(x, y, z);

      // Fundação sólida que desce até o solo
      const foundation = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.6, 6.6), concreteMat);
      foundation.position.y = -0.9;
      foundation.receiveShadow = true;
      st.add(foundation);

      // Plataforma principal de embarque com piso de pedra e deck lateral
      const plat = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.45, 6.8), concreteLightMat);
      plat.position.y = 0.45;
      plat.receiveShadow = true;
      st.add(plat);

      // Faixa amarela de segurança de embarque nas plataformas Oeste e Leste
      [-2.1, 2.1].forEach(fx => {
        const safetyLine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 5.8), goldMat);
        safetyLine.position.set(fx, 0.69, 0);
        st.add(safetyLine);
      });

      // Escadaria de acesso frontal/traseira com corrimão
      const stairZDir = isTop ? -1 : 1;
      for (let s = 0; s < 5; s++) {
        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 0.55), concreteMat);
        stepMesh.position.set(0, 0.35 - s * 0.16, stairZDir * (3.6 + s * 0.48));
        st.add(stepMesh);
      }

      // 6 Colunas estruturais inclinadas (estilo arquitetura moderna carioca)
      [[-3.0, -2.6], [3.0, -2.6], [-3.0, 0], [3.0, 0], [-3.0, 2.6], [3.0, 2.6]].forEach(([px, pz]) => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.20, 4.4, 6), darkSteelMat);
        pillar.position.set(px, 2.6, pz);
        st.add(pillar);
      });

      // Cobertura em Arco Duplo (Abóbada Central + Marquises Laterais)
      const mainRoof = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.26, 7.4), roofBlueMat);
      mainRoof.position.set(0, 4.75, 0);
      mainRoof.castShadow = true;
      st.add(mainRoof);

      const upperVault = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.6, 7.2, 8, 1, false, 0, Math.PI),
        new THREE.MeshLambertMaterial({ color: accentColor, flatShading: true })
      );
      upperVault.rotation.z = Math.PI / 2;
      upperVault.rotation.y = Math.PI / 2;
      upperVault.scale.set(1, 0.42, 1);
      upperVault.position.set(0, 4.88, 0);
      st.add(upperVault);

      // Painel / Totem "TELEFÉRICO DO MORRO" na entrada
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.52, 0.18), darkSteelMat);
      signBoard.position.set(0, 4.35, stairZDir * 3.65);
      st.add(signBoard);

      const signAccent = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.28, 0.22), new THREE.MeshBasicMaterial({ color: accentColor }));
      signAccent.position.set(0, 4.35, stairZDir * 3.65);
      st.add(signAccent);

      // Guarda-corpos laterais em vidro temperado e aço
      const glassRailMat = new THREE.MeshBasicMaterial({ color: 0x7DD3FC, transparent: true, opacity: 0.35 });
      [-3.35, 3.35].forEach(rx => {
        const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 6.2), brushedSteelMat);
        railTop.position.set(rx, 1.45, 0);
        st.add(railTop);

        const glassPanel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 6.0), glassRailMat);
        glassPanel.position.set(rx, 1.06, 0);
        st.add(glassPanel);
      });

      // Bancos de espera e moradores aguardando na plataforma
      [-2.75, 2.75].forEach((bx, bIdx) => {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 2.2), woodDeckMat);
        bench.position.set(bx, 0.82, -0.8);
        st.add(bench);

        // Morador aguardando o bondinho com anatomia esculpida Claude Opus
        const waitFig = createStylizedFigure({
          skinColor: bIdx === 0 ? 0x844C21 : 0xD59B6A,
          shirtColor: bIdx === 0 ? 0x10B981 : 0xF97316,
          pantsColor: 0x1E3A8A,
          hairColor: 0x1F1917,
          isFemale: bIdx === 1
        });
        waitFig.group.scale.setScalar(0.88);
        waitFig.group.position.set(bx * 0.82, 0.44, 1.2);
        waitFig.group.rotation.y = bIdx === 0 ? 0.35 : -0.35;
        st.add(waitFig.group);
      });

      // Luminárias internas quentes da estação
      [-1.8, 1.8].forEach(lx => {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.10, 1.2), warmBulbMat);
        lamp.position.set(lx, 4.58, 0);
        st.add(lamp);
      });

      const stLight = new THREE.PointLight(0xFFE082, 1.4, 16);
      stLight.position.set(0, 3.8, 0);
      st.add(stLight);

      // Roda Motriz Gigante (Bullwheel) com raios giratórios (adicionada ao grupo dinâmico!)
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, y + 4.15, z);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.75, 0.14, 8, 20),
        new THREE.MeshLambertMaterial({ color: accentColor, flatShading: true })
      );
      rim.rotation.x = Math.PI / 2;
      wheelGroup.add(rim);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 8), darkSteelMat);
      wheelGroup.add(hub);

      for (let sp = 0; sp < 4; sp++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.10, 0.14), brushedSteelMat);
        spoke.rotation.y = (sp * Math.PI) / 4;
        wheelGroup.add(spoke);
      }

      this.group.add(wheelGroup);
      this.stationBullwheels.push(wheelGroup);
      this.mobilityDynamicGroups.push(wheelGroup);

      if (this.infrastructureNodes) {
        this.infrastructureNodes.push({ x, z });
      }

      return st;
    };

    // Helper para construir a Estação Central Intermediária (Morro do Sol)
    const buildMidStation = (x, y, z) => {
      const st = new THREE.Group();
      st.position.set(x, y, z);

      // Pilotis elevados de concreto para vencer a encosta do Morro do Sol
      [[-2.6, -2.0], [2.6, -2.0], [-2.6, 2.0], [2.6, 2.0]].forEach(([px, pz]) => {
        const foundationCol = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 4.5, 6), concreteMat);
        foundationCol.position.set(px, 0.1, pz);
        st.add(foundationCol);
      });

      // Deck de embarque intermediário (Passarela Panorâmica)
      const deck = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.42, 5.4), concreteLightMat);
      deck.position.y = 2.3;
      deck.receiveShadow = true;
      st.add(deck);

      // Escadaria lateral conectando à Alameda do Samba (Oeste)
      for (let s = 0; s < 6; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 2.2), woodDeckMat);
        step.position.set(-3.6 - s * 0.55, 2.1 - s * 0.34, 0);
        st.add(step);
      }

      // Pilares da cobertura
      [[-2.8, -2.1], [2.8, -2.1], [-2.8, 2.1], [2.8, 2.1]].forEach(([px, pz]) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 4.3, 6), darkSteelMat);
        col.position.set(px, 4.45, pz);
        st.add(col);
      });

      // Telhado verde-azulado com friso dourado
      const roof = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.25, 5.8), roofTealMat);
      roof.position.y = 6.65;
      st.add(roof);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(7.55, 0.12, 5.95), goldMat);
      trim.position.y = 6.82;
      st.add(trim);

      // Luminária da Estação Central
      const midBulb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.8), warmBulbMat);
      midBulb.position.set(0, 6.48, 0);
      st.add(midBulb);

      if (this.infrastructureNodes) {
        this.infrastructureNodes.push({ x, z });
      }
      return st;
    };

    const baseStation = buildTerminalStation(lineX, yBase, zBase, 0xFACC15, false);
    const midStation = buildMidStation(lineX, yMid, zMid);
    const topStation = buildTerminalStation(lineX, yTop, zTop, 0xE76F51, true);
    stationGroup.add(baseStation);
    stationGroup.add(midStation);
    stationGroup.add(topStation);

    // Definição das Torres Treliçadas (Pylons) e Waypoints Aéreos do Cabo
    // Torres em Z = -2.0 e Z = -44.0 deixam o cruzamento aéreo sobre a Ladeira da Várzea (Z ~ -31) 100% livre e elevado!
    const waypointSpecs = [
      { z: zBase, isStation: true, cableY: yBase + 4.15 },
      { z: -2.0,  isPylon: true,   towerH: 8.6 },
      { z: zMid,  isStation: true, cableY: yMid + 6.15 },
      { z: -44.0, isPylon: true,   towerH: 9.6 },
      { z: zTop,  isStation: true, cableY: yTop + 4.15 }
    ];

    this.cableWaypoints = [];
    const cableTrackOffset = 1.75; // Via Oeste: -1.75m, Via Leste: +1.75m

    waypointSpecs.forEach((spec, idx) => {
      if (spec.isStation) {
        this.cableWaypoints.push(new THREE.Vector3(lineX, spec.cableY, spec.z));
        return;
      }

      const pyGround = this.terrain ? this.terrain.getElevation(lineX, spec.z) : 10.0;
      const tH = spec.towerH;
      const towerGroup = new THREE.Group();
      towerGroup.position.set(lineX, pyGround, spec.z);

      // Sapata de fundação em concreto com friso de alerta
      const pad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 2.4), concreteMat);
      pad.position.y = 0.35;
      towerGroup.add(pad);

      const warnCollar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.5), goldMat);
      warnCollar.position.y = 0.85;
      towerGroup.add(warnCollar);

      // 4 Pernas metálicas inclinadas formando torre treliçada (orientação local via quaternion — sem bug de lookAt!)
      const upAxis = new THREE.Vector3(0, 1, 0);
      const legOffsets = [
        [-0.55, -0.55, -0.22, -0.22],
        [0.55, -0.55, 0.22, -0.22],
        [-0.55, 0.55, -0.22, 0.22],
        [0.55, 0.55, 0.22, 0.22]
      ];
      legOffsets.forEach(([bx, bz, tx, tz]) => {
        const pBot = new THREE.Vector3(bx, 0.7, bz);
        const pTop = new THREE.Vector3(tx, tH, tz);
        const dir = pTop.clone().sub(pBot);
        const len = dir.length();
        const mid = pBot.clone().add(pTop).multiplyScalar(0.5);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, len, 5), darkSteelMat);
        leg.position.copy(mid);
        leg.quaternion.setFromUnitVectors(upAxis, dir.normalize());
        towerGroup.add(leg);
      });

      // Anéis horizontais de travamento da treliça
      [0.35, 0.65, 0.92].forEach(frac => {
        const ringY = 0.7 + (tH - 0.7) * frac;
        const w = 1.15 * (1 - frac * 0.48);
        const brace = new THREE.Mesh(new THREE.BoxGeometry(w, 0.10, w), brushedSteelMat);
        brace.position.y = ringY;
        towerGroup.add(brace);
      });

      // Plataforma de manutenção e Braço Transversal (Crossarm) no topo
      const catwalk = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.14, 1.1), concreteLightMat);
      catwalk.position.y = tH - 0.15;
      towerGroup.add(catwalk);

      const crossArm = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.28, 0.42), darkSteelMat);
      crossArm.position.y = tH + 0.22;
      towerGroup.add(crossArm);

      // Trenós de Roldanas (Sheave Trains) nas duas pontas do braço transversal
      [-cableTrackOffset, cableTrackOffset].forEach(ox => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 1.65), terracottaMat);
        beam.position.set(ox, tH + 0.12, 0);
        towerGroup.add(beam);

        [-0.55, -0.18, 0.18, 0.55].forEach(rz => {
          const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.10, 8), brushedSteelMat);
          roller.rotation.z = Math.PI / 2;
          roller.position.set(ox, tH + 0.22, rz);
          towerGroup.add(roller);
        });
      });

      // Mastro de sinalização noturna no topo da torre
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.9, 4), brushedSteelMat);
      spire.position.y = tH + 0.75;
      towerGroup.add(spire);

      const beacon = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), idx % 2 === 0 ? redBeaconMat : warmBulbMat);
      beacon.position.y = tH + 1.25;
      towerGroup.add(beacon);

      stationGroup.add(towerGroup);
      if (this.infrastructureNodes) {
        this.infrastructureNodes.push({ x: lineX, z: spec.z });
      }

      this.cableWaypoints.push(new THREE.Vector3(lineX, pyGround + tH + 0.24, spec.z));
    });

    // Construir os Cabos Duplos com Curva Catenária (8 sub-segmentos por vão)
    const subSteps = 8;
    const totalSegments = (this.cableWaypoints.length - 1) * subSteps;

    [-cableTrackOffset, cableTrackOffset].forEach(offsetX => {
      for (let s = 0; s < totalSegments; s++) {
        const t0 = s / totalSegments;
        const t1 = (s + 1) / totalSegments;
        const p0 = this._sampleCablePoint(t0, offsetX).pos;
        const p1 = this._sampleCablePoint(t1, offsetX).pos;

        const dist = p0.distanceTo(p1);
        const mid = p0.clone().add(p1).multiplyScalar(0.5);

        // 1. Cabo Portador Principal (Superior)
        const mainGeo = new THREE.CylinderGeometry(0.036, 0.036, dist + 0.04, 5);
        mainGeo.rotateX(Math.PI / 2);
        const mainMesh = new THREE.Mesh(mainGeo, cableMainMat);
        mainMesh.position.copy(mid);
        mainMesh.lookAt(p1);
        stationGroup.add(mainMesh);

        // 2. Cabo Trator (Inferior, 0.22m abaixo do cabo portador)
        const haulGeo = new THREE.CylinderGeometry(0.022, 0.022, dist + 0.04, 4);
        haulGeo.rotateX(Math.PI / 2);
        const haulMesh = new THREE.Mesh(haulGeo, cableHaulMat);
        haulMesh.position.set(mid.x, mid.y - 0.22, mid.z);
        haulMesh.lookAt(p1.x, p1.y - 0.22, p1.z);
        stationGroup.add(haulMesh);
      }
    });

    // Congela matrizes estáticas de todas as estações, torres e cabos
    stationGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });
    this.group.add(stationGroup);

    // Criar 4 Cabines Panorâmicas Detalhadas (2 na Via Oeste, 2 na Via Leste)
    const cabinConfigs = [
      {
        id: 'bonde_sol',
        name: 'Bondinho Sol da Serra (#01)',
        routeDesc: 'Orla ↔ Morro do Sol ↔ Alto da Serra',
        color: 0xFACC15,
        stripeColor: 0x0284C7,
        offsetX: -cableTrackOffset,
        initialT: 0.12,
        direction: 1
      },
      {
        id: 'bonde_atlantico',
        name: 'Bondinho Brisa do Atlântico (#02)',
        routeDesc: 'Orla ↔ Morro do Sol ↔ Alto da Serra',
        color: 0x06B6D4,
        stripeColor: 0xFDE047,
        offsetX: -cableTrackOffset,
        initialT: 0.64,
        direction: 1
      },
      {
        id: 'bonde_guanabara',
        name: 'Bondinho Estrela da Guanabara (#03)',
        routeDesc: 'Alto da Serra ↔ Morro do Sol ↔ Orla',
        color: 0xE76F51,
        stripeColor: 0xFEF08A,
        offsetX: cableTrackOffset,
        initialT: 0.88,
        direction: -1
      },
      {
        id: 'bonde_samba',
        name: 'Bondinho Samba no Ar (#04)',
        routeDesc: 'Alto da Serra ↔ Morro do Sol ↔ Orla',
        color: 0x10B981,
        stripeColor: 0xFACC15,
        offsetX: cableTrackOffset,
        initialT: 0.36,
        direction: -1
      }
    ];

    const cabinWhiteMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true });
    const glassWindowMat = new THREE.MeshBasicMaterial({ color: 0xFEF08A, transparent: true, opacity: 0.72 });
    const solarCellMat = new THREE.MeshLambertMaterial({ color: 0x1D4ED8, flatShading: true });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xB45309, flatShading: true });

    cabinConfigs.forEach(cfg => {
      const cabinGroup = new THREE.Group();

      // 1. Trolley / Bogie Superior com 4 Roldanas apoiadas no cabo
      const bogieBeam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 1.15), terracottaMat);
      bogieBeam.position.y = 0.04;
      cabinGroup.add(bogieBeam);

      [-0.42, -0.14, 0.14, 0.42].forEach(wz => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.10, 8), brushedSteelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, 0.08, wz);
        cabinGroup.add(wheel);
      });

      // Pinça do cabo trator
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.32), darkSteelMat);
      grip.position.y = -0.18;
      cabinGroup.add(grip);

      // 2. Braço Suspensor Curvo (Swan-Neck Hanger)
      const hangerTop = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 6), brushedSteelMat);
      hangerTop.position.set(0, -0.62, 0);
      cabinGroup.add(hangerTop);

      const damper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.24, 6), darkSteelMat);
      damper.position.set(0, -0.45, 0);
      cabinGroup.add(damper);

      // 3. Teto da Cabine + Painel Solar Integrado
      const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.18, 2.65), cabinWhiteMat);
      cabinRoof.position.y = -1.12;
      cabinGroup.add(cabinRoof);

      const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.06, 1.85), solarCellMat);
      solarPanel.position.y = -1.01;
      cabinGroup.add(solarPanel);

      // 4. Corpo da Cabine Panorâmica (Saia Colorida + Faixa Carioca + Colunas)
      const bodyMat = new THREE.MeshLambertMaterial({ color: cfg.color, flatShading: true });
      const stripeMat = new THREE.MeshLambertMaterial({ color: cfg.stripeColor, flatShading: true });

      // Piso estrutural e para-choque inferior
      const floorBase = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.22, 2.72), darkSteelMat);
      floorBase.position.y = -2.62;
      cabinGroup.add(floorBase);

      // Saia inferior pintada
      const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.68, 2.58), bodyMat);
      lowerHull.position.y = -2.20;
      lowerHull.castShadow = true;
      cabinGroup.add(lowerHull);

      // Faixa decorativa na cintura da cabine
      const beltStripe = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.14, 2.62), stripeMat);
      beltStripe.position.y = -1.86;
      cabinGroup.add(beltStripe);

      // 4 Colunas de canto entre as janelas panorâmicas
      [[-0.86, -1.2], [0.86, -1.2], [-0.86, 1.2], [0.86, 1.2]].forEach(([cx, cz]) => {
        const cornerPost = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 0.14), cabinWhiteMat);
        cornerPost.position.set(cx, -1.52, cz);
        cabinGroup.add(cornerPost);
      });

      // Janelas Panorâmicas Frontais e Traseiras
      const winFront = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.66, 0.06), glassWindowMat);
      winFront.position.set(0, -1.52, 1.26);
      cabinGroup.add(winFront);

      const winBack = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.66, 0.06), glassWindowMat);
      winBack.position.set(0, -1.52, -1.26);
      cabinGroup.add(winBack);

      // Portas Laterais Deslizantes (abrem suavemente nas estações!)
      const doorLeftA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.56), glassWindowMat);
      doorLeftA.position.set(-0.91, -1.78, -0.30);
      cabinGroup.add(doorLeftA);

      const doorLeftB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.56), glassWindowMat);
      doorLeftB.position.set(-0.91, -1.78, 0.30);
      cabinGroup.add(doorLeftB);

      const doorRightA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.56), glassWindowMat);
      doorRightA.position.set(0.91, -1.78, -0.30);
      cabinGroup.add(doorRightA);

      const doorRightB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.56), glassWindowMat);
      doorRightB.position.set(0.91, -1.78, 0.30);
      cabinGroup.add(doorRightB);

      // 5. Passageiros 3D visíveis no interior da cabine com anatomia esculpida Claude Opus!
      const paxColors = [0xEF4444, 0x3B82F6, 0x10B981, 0xF59E0B];
      const paxSkins = [0x844C21, 0xD59B6A, 0x683A18, 0xECC09C];
      [
        [-0.42, -0.68],
        [0.42, -0.68],
        [-0.42, 0.68],
        [0.42, 0.68]
      ].forEach(([px, pz], pIdx) => {
        const paxFig = createStylizedFigure({
          skinColor: paxSkins[pIdx % paxSkins.length],
          shirtColor: paxColors[pIdx % paxColors.length],
          hairColor: 0x1F1917,
          isFemale: pIdx % 2 === 1,
          includeLegs: false
        });
        paxFig.group.scale.setScalar(0.84);
        paxFig.group.position.set(px, -2.52, pz);
        paxFig.group.rotation.y = pz > 0 ? Math.PI : 0;
        cabinGroup.add(paxFig.group);
      });

      // 6. Farol Dianteiro de LED e Lanterna Traseira
      const headLamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.08), warmBulbMat);
      headLamp.position.set(0, -2.42, 1.32);
      cabinGroup.add(headLamp);

      const tailLamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.08), redBeaconMat);
      tailLamp.position.set(0, -2.42, -1.32);
      cabinGroup.add(tailLamp);

      const carObj = {
        id: cfg.id,
        name: cfg.name,
        type: 'cableCar',
        routeDesc: cfg.routeDesc,
        passengers: 6 + Math.floor(Math.random() * 5),
        group: cabinGroup,
        doors: { doorLeftA, doorLeftB, doorRightA, doorRightB },
        doorOpenProgress: 0,
        offsetX: cfg.offsetX,
        t: cfg.initialT,
        direction: cfg.direction,
        pauseTimer: 0,
        stoppedAtMid: false,
        speed: 0.044
      };

      cabinGroup.traverse(c => {
        if (c.isMesh) c.userData.mobilityRef = carObj;
      });

      this.group.add(cabinGroup);
      this.cableCars.push(carObj);
      this.mobilityDynamicGroups.push(cabinGroup);
    });
  },

  _createMovingMototaxis() {
    const steelDarkMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const tireMat = new THREE.MeshLambertMaterial({ color: 0x1E293B, flatShading: true });
    const vestYellowMat = new THREE.MeshLambertMaterial({ color: 0xFACC15, flatShading: true });
    const helmetMat = new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: true });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xB45309, flatShading: true });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xFEF08A });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xEF4444 });

    // 3 Rotas Reais de Subida/Descida pelo Morro e Orla (100% alinhadas ao traçado de asfalto)
    const motoRoutes = [
      {
        id: 'moto_1',
        driverName: 'Tiago do Mototáxi',
        routeDesc: 'Expresso Levante ↔ Alto da Serra',
        tankColor: 0xDC2626,
        passengerShirt: 0x10B981,
        speed: 3.6,
        waypoints: [
          { x: 92, z: 14 },
          { x: 75, z: 18 },
          { x: 85, z: 10 },
          { x: 82, z: -2 },
          { x: 78, z: -14 },
          { x: 62, z: -22 },
          { x: 46, z: -26 },
          { x: 28, z: -32 },
          { x: 14, z: -46 },
          { x: 0, z: -66 }
        ]
      },
      {
        id: 'moto_2',
        driverName: 'Leozinho da Ladeira',
        routeDesc: 'Rota Prainha ↔ Encosta Oeste ↔ Serra ↔ Mirante Imperial',
        tankColor: 0x2563EB,
        passengerShirt: 0xF97316,
        speed: 3.4,
        waypoints: [
          { x: -78, z: 18 },
          { x: -75, z: 14 },
          { x: -70, z: 2 },
          { x: -65, z: -10 },
          { x: -52, z: -20 },
          { x: -35, z: -30 },
          { x: -20, z: -42 },
          { x: 0, z: -66 },
          { x: 16, z: -74 },
          { x: 32, z: -86 },
          { x: 50, z: -102 }
        ]
      },
      {
        id: 'moto_3',
        driverName: 'Nando do Grau',
        routeDesc: 'Corredor Orla Carioca ↔ Feira da Várzea',
        tankColor: 0xF59E0B,
        passengerShirt: 0x8B5CF6,
        speed: 4.0,
        waypoints: [
          { x: -125, z: 18 },
          { x: -78, z: 18 },
          { x: -20, z: 18 },
          { x: 15, z: 18 },
          { x: 55, z: 18 },
          { x: 75, z: 18 },
          { x: 92, z: 14 }
        ]
      }
    ];

    motoRoutes.forEach((cfg, idx) => {
      const mGroup = new THREE.Group();

      // Rodas dianteira e traseira
      const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.14, 8);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelFront = new THREE.Mesh(wheelGeo, tireMat);
      wheelFront.position.set(0, 0.32, 0.72);
      mGroup.add(wheelFront);

      const wheelBack = new THREE.Mesh(wheelGeo, tireMat);
      wheelBack.position.set(0, 0.32, -0.72);
      mGroup.add(wheelBack);

      // Chassi, Motor e Banco Duplo
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 1.25), steelDarkMat);
      frame.position.set(0, 0.52, 0);
      mGroup.add(frame);

      // Tanque colorido
      const tank = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.24, 0.52),
        new THREE.MeshLambertMaterial({ color: cfg.tankColor, flatShading: true })
      );
      tank.position.set(0, 0.74, 0.22);
      mGroup.add(tank);

      // Guidão, Farol Dianteiro Brilhante e Lanterna Traseira
      const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.06), steelDarkMat);
      handleBar.position.set(0, 0.96, 0.52);
      mGroup.add(handleBar);

      const headLight = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), headlightMat);
      headLight.position.set(0, 0.88, 0.82);
      mGroup.add(headLight);

      const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.08), taillightMat);
      tailLight.position.set(0, 0.68, -0.72);
      mGroup.add(tailLight);

      // Piloto do Mototáxi & Passageiro na Garupa com anatomia esculpida Claude Opus (capacete arredondado, viseira, rosto e mãos no guidão)
      const driverFig = createStylizedFigure({
        skinColor: [0x8D5524, 0xC68642, 0x70411B][idx % 3],
        shirtColor: 0xFACC15,
        pantsColor: 0x1E3A8A,
        shoeColor: 0x111827,
        hatType: 'helmet',
        helmetColor: 0x0284C7,
        hasVisor: true,
        hasVest: true,
        vestColor: 0xEA580C
      });
      driverFig.group.position.set(0, 0.26, 0.08);
      driverFig.torso.rotation.x = 0.20;
      driverFig.leftArm.rotation.x = -1.05;
      driverFig.rightArm.rotation.x = -1.05;
      if (driverFig.leftLeg) driverFig.leftLeg.rotation.x = -0.65;
      if (driverFig.rightLeg) driverFig.rightLeg.rotation.x = -0.65;
      mGroup.add(driverFig.group);
      const driverTorso = driverFig.torso;

      const passFig = createStylizedFigure({
        skinColor: [0xD19466, 0x8D5524, 0xEAC09E][idx % 3],
        shirtColor: cfg.passengerShirt,
        pantsColor: 0x334155,
        shoeColor: 0xF8FAFC,
        hatType: 'helmet',
        helmetColor: 0xFACC15,
        hasVisor: false,
        isFemale: idx === 1
      });
      passFig.group.position.set(0, 0.28, -0.36);
      passFig.leftArm.rotation.x = -0.55;
      passFig.rightArm.rotation.x = -0.55;
      if (passFig.leftLeg) passFig.leftLeg.rotation.x = -0.55;
      if (passFig.rightLeg) passFig.rightLeg.rotation.x = -0.55;
      mGroup.add(passFig.group);
      const passTorso = passFig.torso;

      // Constrói curva de estrada suavizada (Quadratic Fillet nos cruzamentos) parametrizada por comprimento de arco:
      // Garante movimento 100% livre de loops, com curvas arredondadas sobre o calçamento!
      const curveData = this._buildSmoothMotoCurve(cfg.waypoints, 4.0);
      const initDist = Math.min(curveData.totalLength * (0.15 + idx * 0.28), curveData.totalLength - 2.0);
      const initSample = this._sampleMotoCurve(curveData, initDist, 1);
      const startY = this.terrain ? this.terrain.getElevation(initSample.x, initSample.z) + 0.12 : 1.5;
      mGroup.position.set(initSample.x, startY, initSample.z);
      mGroup.rotation.y = initSample.yaw;

      const motoObj = {
        id: cfg.id,
        name: `Mototáxi (${cfg.driverName})`,
        driverName: cfg.driverName,
        type: 'mototaxi',
        routeDesc: cfg.routeDesc,
        group: mGroup,
        wheelFront,
        wheelBack,
        handleBar,
        driverTorso,
        passTorso,
        waypoints: cfg.waypoints,
        curveData,
        distAlong: initDist,
        direction: 1,
        speed: cfg.speed,
        currentSpeed: cfg.speed * 0.6,
        currentYaw: initSample.yaw,
        currentPitch: 0,
        currentRoll: 0,
        pauseTimer: 0,
        midStopDone: false
      };

      mGroup.traverse(c => {
        if (c.isMesh) c.userData.mobilityRef = motoObj;
      });

      this.group.add(mGroup);
      this.movingMototaxis.push(motoObj);
      this.mobilityDynamicGroups.push(mGroup);
    });
  },

  /**
   * Gera uma trajetória contínua com curvas arredondadas por Bézier quadrática em cada esquina
   * e tabela de comprimento de arco (arc-length), impedindo 100% loops ou órbitas em waypoints.
   */
  _buildSmoothMotoCurve(waypoints, filletRadius = 4.0) {
    const rawPts = [];
    const n = waypoints.length;

    rawPts.push({ x: waypoints[0].x, z: waypoints[0].z });

    for (let i = 1; i < n - 1; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      const next = waypoints[i + 1];

      const v1x = prev.x - curr.x;
      const v1z = prev.z - curr.z;
      const len1 = Math.hypot(v1x, v1z) || 1;

      const v2x = next.x - curr.x;
      const v2z = next.z - curr.z;
      const len2 = Math.hypot(v2x, v2z) || 1;

      const r = Math.min(filletRadius, len1 * 0.42, len2 * 0.42);
      const startCorner = {
        x: curr.x + (v1x / len1) * r,
        z: curr.z + (v1z / len1) * r
      };
      const endCorner = {
        x: curr.x + (v2x / len2) * r,
        z: curr.z + (v2z / len2) * r
      };

      const steps = 10;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const inv = 1 - t;
        const bx = inv * inv * startCorner.x + 2 * inv * t * curr.x + t * t * endCorner.x;
        const bz = inv * inv * startCorner.z + 2 * inv * t * curr.z + t * t * endCorner.z;
        rawPts.push({ x: bx, z: bz });
      }
    }

    rawPts.push({ x: waypoints[n - 1].x, z: waypoints[n - 1].z });

    // Subdivide trechos retos longos para amostragem uniforme de terreno e tangente
    const points = [rawPts[0]];
    const cumLengths = [0];
    let totalLength = 0;

    for (let i = 1; i < rawPts.length; i++) {
      const p0 = rawPts[i - 1];
      const p1 = rawPts[i];
      const segDist = Math.hypot(p1.x - p0.x, p1.z - p0.z);
      if (segDist < 0.05) continue;
      const subCount = Math.max(1, Math.ceil(segDist / 1.0));
      for (let k = 1; k <= subCount; k++) {
        const frac = k / subCount;
        const px = p0.x + (p1.x - p0.x) * frac;
        const pz = p0.z + (p1.z - p0.z) * frac;
        const prevPt = points[points.length - 1];
        totalLength += Math.hypot(px - prevPt.x, pz - prevPt.z);
        points.push({ x: px, z: pz });
        cumLengths.push(totalLength);
      }
    }

    return { points, cumLengths, totalLength: Math.max(1, totalLength) };
  },

  _sampleMotoCurve(curveData, dist, direction = 1) {
    const { points, cumLengths, totalLength } = curveData;
    const clampedDist = Math.max(0, Math.min(totalLength, dist));

    let idx = 0;
    while (idx < cumLengths.length - 2 && cumLengths[idx + 1] < clampedDist) {
      idx++;
    }

    const d0 = cumLengths[idx];
    const d1 = cumLengths[idx + 1];
    const segLen = Math.max(0.0001, d1 - d0);
    const t = (clampedDist - d0) / segLen;

    const p0 = points[idx];
    const p1 = points[idx + 1];
    const x = p0.x + (p1.x - p0.x) * t;
    const z = p0.z + (p1.z - p0.z) * t;

    // Tangente orientada no sentido de movimento (direction: +1 ou -1)
    const tx = (p1.x - p0.x) * direction;
    const tz = (p1.z - p0.z) * direction;
    const yaw = Math.atan2(tx, tz);

    // Curvatura à frente (1.8m adiante) para desacelerar e inclinar suavemente nas curvas
    const aheadDist = Math.max(0, Math.min(totalLength, clampedDist + direction * 1.8));
    let aIdx = 0;
    while (aIdx < cumLengths.length - 2 && cumLengths[aIdx + 1] < aheadDist) {
      aIdx++;
    }
    const ap0 = points[aIdx];
    const ap1 = points[aIdx + 1];
    const aheadYaw = Math.atan2((ap1.x - ap0.x) * direction, (ap1.z - ap0.z) * direction);

    let turnDiff = aheadYaw - yaw;
    while (turnDiff > Math.PI) turnDiff -= Math.PI * 2;
    while (turnDiff < -Math.PI) turnDiff += Math.PI * 2;

    return { x, z, yaw, turnDiff };
  },

  updateMobilitySystems(delta) {
    const time = performance.now() * 0.002;

    // 0. Girar as Rodas Motrizes (Bullwheels) nas estações do teleférico
    if (this.stationBullwheels) {
      this.stationBullwheels.forEach((wheel, wIdx) => {
        wheel.rotation.y += (wIdx % 2 === 0 ? 1 : -1) * delta * 1.15;
      });
    }

    // 1. Atualizar as 4 Cabines Panorâmicas do Bondinho ao longo da curva catenária
    if (this.cableCars && this.cableWaypoints && this.cableWaypoints.length >= 2) {
      const midStationT = 2 / (this.cableWaypoints.length - 1); // Waypoint 2 = Estação Central Morro do Sol (t = 0.4)

      this.cableCars.forEach((car, idx) => {
        const isStopped = car.pauseTimer > 0;

        // Animação suave de abertura/fechamento das portas automáticas nas estações
        const targetDoor = isStopped ? 1.0 : 0.0;
        car.doorOpenProgress += (targetDoor - car.doorOpenProgress) * Math.min(1, delta * 5.0);
        if (car.doors) {
          const slide = car.doorOpenProgress * 0.28;
          car.doors.doorLeftA.position.z = -0.30 - slide;
          car.doors.doorLeftB.position.z = 0.30 + slide;
          car.doors.doorRightA.position.z = -0.30 - slide;
          car.doors.doorRightB.position.z = 0.30 + slide;
        }

        if (isStopped) {
          car.pauseTimer -= delta;
        } else {
          const prevT = car.t;
          car.t += car.direction * car.speed * delta;

          // Parada rápida na Estação Central Morro do Sol (t ~ 0.4)
          if (!car.stoppedAtMid && ((prevT < midStationT && car.t >= midStationT) || (prevT > midStationT && car.t <= midStationT))) {
            car.t = midStationT;
            car.pauseTimer = 1.8;
            car.stoppedAtMid = true;
            car.passengers = 6 + Math.floor(Math.random() * 6);
          }

          if (car.t >= 1.0) {
            car.t = 1.0;
            car.direction = -1;
            car.offsetX = Math.abs(car.offsetX); // Troca para a Via Leste (descida) ao contornar a polia
            car.pauseTimer = 2.6;
            car.stoppedAtMid = false;
            car.passengers = 6 + Math.floor(Math.random() * 6);
          } else if (car.t <= 0.0) {
            car.t = 0.0;
            car.direction = 1;
            car.offsetX = -Math.abs(car.offsetX); // Troca para a Via Oeste (subida) ao contornar a polia
            car.pauseTimer = 2.6;
            car.stoppedAtMid = false;
            car.passengers = 6 + Math.floor(Math.random() * 6);
          }
        }

        // Posiciona a cabine exatamente na curva catenária do cabo
        const sample = this._sampleCablePoint(car.t, car.offsetX);
        car.group.position.copy(sample.pos);

        // Balanço físico suave do vento + leve oscilação ao passar pelas roldanas das torres
        const towerPassBounce = Math.exp(-Math.pow((sample.localT - 0.05) * 14, 2)) * 0.045;
        car.group.rotation.z = Math.sin(time * 1.7 + idx * 1.5) * 0.035;
        car.group.rotation.x = Math.cos(time * 1.2 + idx) * 0.025 + towerPassBounce * car.direction;
      });
    }

    // 2. Atualizar Mototáxis ao longo da Curva de Estrada Suavizada (100% livre de loops!)
    if (this.movingMototaxis) {
      this.movingMototaxis.forEach((moto, mIdx) => {
        const { totalLength } = moto.curveData;

        if (moto.pauseTimer > 0) {
          moto.pauseTimer -= delta;
          moto.currentSpeed += (0 - moto.currentSpeed) * Math.min(1, delta * 6.0);
          moto.currentRoll += (0 - moto.currentRoll) * Math.min(1, delta * 5.0);

          // Nos últimos 0.9s da parada de fim de linha, gira suavemente a moto na direção da viagem de volta
          const sampleNow = this._sampleMotoCurve(moto.curveData, moto.distAlong, moto.direction);
          let yawDiff = sampleNow.yaw - moto.currentYaw;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
          if (moto.pauseTimer < 0.95) {
            moto.currentYaw += yawDiff * Math.min(1, delta * 5.5);
          }

          moto.group.rotation.order = 'YXZ';
          moto.group.rotation.y = moto.currentYaw;
          moto.group.rotation.z = moto.currentRoll;
          if (moto.driverTorso) {
            moto.driverTorso.position.y = 1.05 + Math.sin(time * 14 + mIdx) * 0.008;
          }
          return;
        }

        // Amostra tangente e curvatura à frente na estrada
        const preSample = this._sampleMotoCurve(moto.curveData, moto.distAlong, moto.direction);
        const distToTerminal = moto.direction > 0 ? (totalLength - moto.distAlong) : moto.distAlong;

        // Velocidade orgânica: reduz nas curvas, desacelera ao chegar nos pontos finais e perde embalo nas subidas
        const turnSlowdown = Math.max(0.55, 1.0 - Math.abs(preSample.turnDiff) * 0.45);
        const terminalBrake = distToTerminal < 5.0 ? Math.max(0.28, distToTerminal / 5.0) : 1.0;
        const slopeMod = (moto.currentPitch || 0) < -0.06 ? 0.78 : ((moto.currentPitch || 0) > 0.06 ? 1.08 : 1.0);
        const targetSpeed = moto.speed * turnSlowdown * terminalBrake * slopeMod;

        moto.currentSpeed += (targetSpeed - moto.currentSpeed) * Math.min(1, delta * 3.8);
        const step = moto.currentSpeed * delta;

        const prevDist = moto.distAlong;
        moto.distAlong += moto.direction * step;

        // Parada breve ocasional no meio da subida/descida para embarque/desembarque
        const midPoint = totalLength * 0.5;
        if (!moto.midStopDone && ((prevDist < midPoint && moto.distAlong >= midPoint) || (prevDist > midPoint && moto.distAlong <= midPoint))) {
          moto.midStopDone = true;
          if (Math.random() < 0.35) {
            moto.pauseTimer = 1.5;
            moto.currentSpeed = 0;
          }
        }

        // Chegada aos terminais da linha (início ou fim da rota): inverte sentido sem nunca entrar em loop!
        if (moto.distAlong >= totalLength) {
          moto.distAlong = totalLength;
          moto.direction = -1;
          moto.midStopDone = false;
          moto.pauseTimer = 2.8 + Math.random() * 1.0;
          moto.currentSpeed = 0;
          return;
        } else if (moto.distAlong <= 0) {
          moto.distAlong = 0;
          moto.direction = 1;
          moto.midStopDone = false;
          moto.pauseTimer = 2.8 + Math.random() * 1.0;
          moto.currentSpeed = 0;
          return;
        }

        const sample = this._sampleMotoCurve(moto.curveData, moto.distAlong, moto.direction);
        const curPos = moto.group.position;
        const ny = this.terrain ? this.terrain.getElevation(sample.x, sample.z) + 0.12 : curPos.y;

        // Suaviza orientação (Yaw) ao longo da tangente da curva
        let yawDiff = sample.yaw - moto.currentYaw;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
        moto.currentYaw += yawDiff * Math.min(1, delta * 7.5);

        // Inclinação lateral (lean/banking) proporcional à curva + jogo de guidão
        const targetRoll = Math.max(-0.26, Math.min(0.26, -sample.turnDiff * 0.52));
        moto.currentRoll += (targetRoll - moto.currentRoll) * Math.min(1, delta * 5.5);
        if (moto.handleBar) {
          moto.handleBar.rotation.y = Math.max(-0.30, Math.min(0.30, sample.turnDiff * 0.60));
        }
        if (moto.driverTorso && moto.passTorso) {
          moto.driverTorso.rotation.z = moto.currentRoll * 0.45;
          moto.passTorso.rotation.z = moto.currentRoll * 0.38;
        }

        // Inclinação longitudinal (pitch) acompanhando a rampa da ladeira
        const dy = ny - curPos.y;
        const targetPitch = Math.max(-0.34, Math.min(0.34, -Math.atan2(dy, step + 0.001) * 0.62));
        moto.currentPitch += (targetPitch - moto.currentPitch) * Math.min(1, delta * 6.0);

        // Giro das rodas proporcional à distância percorrida
        if (moto.wheelFront && moto.wheelBack) {
          const wheelSpin = step * 3.1;
          moto.wheelFront.rotation.x += wheelSpin;
          moto.wheelBack.rotation.x += wheelSpin;
        }

        moto.group.position.set(sample.x, ny, sample.z);
        moto.group.rotation.order = 'YXZ';
        moto.group.rotation.y = moto.currentYaw;
        moto.group.rotation.x = moto.currentPitch;
        moto.group.rotation.z = moto.currentRoll;
      });
    }
  }
};
