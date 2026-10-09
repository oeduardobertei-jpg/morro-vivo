import * as THREE from 'three';

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

    const roofGeo = new THREE.ConeGeometry(1.3, 1.2, 8);
    const roof = new THREE.Mesh(roofGeo, redMat);
    roof.position.y = 13.1;
    lhGroup.add(roof);

    const beaconLight = new THREE.PointLight(0xFFEA88, 2.5, 35);
    beaconLight.position.y = 12.0;
    lhGroup.add(beaconLight);

    // 360-degree rotating lighthouse beam (active at sunset & night)
    const beamGroup = new THREE.Group();
    beamGroup.position.set(0, 12.0, 0);

    const beamGeo = new THREE.ConeGeometry(5.2, 54.0, 12, 1, true);
    // FIXED: Negative rotation so the tip is at the origin and the wide base extends outwards
    beamGeo.rotateX(-Math.PI / 2);
    beamGeo.translate(0, 0, 27.0);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xFFFBEB,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
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

    // Main wooden promenade deck extending 22m out to sea
    const deckGeo = new THREE.BoxGeometry(4.0, 0.35, 22.0);
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(pos.x, pierYOffset, pos.z + 10.0);
    deck.receiveShadow = true;
    pierGroup.add(deck);

    // Lateral wooden handrails with posts
    const railMat = new THREE.MeshLambertMaterial({ color: 0x6F4E37 });
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

    const pierLight = new THREE.PointLight(0xFFD54F, 1.8, 18);
    pierLight.position.set(pos.x, pierYOffset + 2.9, pos.z + 20.2);
    pierGroup.add(pierLight);

    // Autonomous Caiçara Fishing Expeditions & Pier Moored Boats
    this.expeditionBoats = [];

    const boatConfigs = [
      {
        id: 'estrela',
        name: 'Estrela do Mar',
        color: 0x0077B6,
        isExpedition: true,
        x: pos.x - 3.4,
        z: pos.z + 8.0,
        targetX: -68.0,
        targetZ: 142.0
      },
      {
        id: 'guanabara',
        name: 'Guanabara',
        color: 0x2A9D8F,
        isExpedition: true,
        x: pos.x - 3.4,
        z: pos.z + 18.0,
        targetX: -94.0,
        targetZ: 154.0
      },
      {
        id: 'vento_forte',
        name: 'Vento Forte',
        color: 0xE63946,
        isExpedition: false,
        x: pos.x + 3.4,
        z: pos.z + 14.0
      }
    ];

    boatConfigs.forEach((bd, idx) => {
      const boatGroup = new THREE.Group();

      // Sculpted hull with raised bow
      const hullGeo = new THREE.BoxGeometry(1.7, 0.7, 4.4);
      const hullMat = new THREE.MeshLambertMaterial({ color: bd.color, flatShading: true });
      const hull = new THREE.Mesh(hullGeo, hullMat);
      hull.position.y = 0.2;
      boatGroup.add(hull);

      const bowGeo = new THREE.ConeGeometry(0.85, 1.2, 4);
      bowGeo.rotateX(Math.PI / 2);
      const bow = new THREE.Mesh(bowGeo, hullMat);
      bow.position.set(0, 0.25, 2.6);
      boatGroup.add(bow);

      // Wooden seat benches
      const benchGeo = new THREE.BoxGeometry(1.5, 0.12, 0.5);
      const bench = new THREE.Mesh(benchGeo, woodMat);
      bench.position.set(0, 0.45, 0);
      boatGroup.add(bench);

      // Coiled fishing net in boat
      const netGeo = new THREE.DodecahedronGeometry(0.42, 0);
      const netMat = new THREE.MeshLambertMaterial({ color: 0x9CA3AF, flatShading: true });
      const netMeshInBoat = new THREE.Mesh(netGeo, netMat);
      netMeshInBoat.position.set(0.3, 0.42, -1.1);
      boatGroup.add(netMeshInBoat);

      // Fisherman figure in expedition boats
      if (bd.isExpedition) {
        const fishermanGroup = new THREE.Group();
        fishermanGroup.position.set(0, 0.5, -0.6);

        // Caiçara straw hat
        const hat = new THREE.Mesh(
          new THREE.ConeGeometry(0.36, 0.14, 8),
          new THREE.MeshLambertMaterial({ color: 0xFBBF24, flatShading: true })
        );
        hat.position.y = 0.88;
        fishermanGroup.add(hat);

        // Head
        const fisherHead = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.24, 0.24),
          new THREE.MeshLambertMaterial({ color: 0x8D5524, flatShading: true })
        );
        fisherHead.position.y = 0.65;
        fishermanGroup.add(fisherHead);

        // Torso
        const fisherTorso = new THREE.Mesh(
          new THREE.BoxGeometry(0.38, 0.46, 0.24),
          new THREE.MeshLambertMaterial({ color: (idx === 0 ? 0xF3F4F6 : 0xEA580C), flatShading: true })
        );
        fisherTorso.position.y = 0.35;
        fishermanGroup.add(fisherTorso);

        // Wooden steering oar / tiller
        const tiller = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 2.4, 4),
          woodMat
        );
        tiller.rotation.x = Math.PI / 4;
        tiller.position.set(0.25, 0.2, -0.8);
        fishermanGroup.add(tiller);

        boatGroup.add(fishermanGroup);
      }

      boatGroup.position.set(bd.x, 0.05, bd.z);

      if (bd.isExpedition) {
        // Deployable circular fishing net ring with floating corks
        const netGroup = new THREE.Group();
        const netRingGeo = new THREE.TorusGeometry(2.3, 0.08, 6, 18);
        netRingGeo.rotateX(Math.PI / 2);
        const netRing = new THREE.Mesh(
          netRingGeo,
          new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true })
        );
        netGroup.add(netRing);

        // Cork buoys around the net ring
        const corkMat = new THREE.MeshLambertMaterial({ color: 0xF97316 });
        for (let c = 0; c < 8; c++) {
          const cAngle = (c / 8) * Math.PI * 2;
          const cork = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), corkMat);
          cork.position.set(Math.cos(cAngle) * 2.3, 0.04, Math.sin(cAngle) * 2.3);
          netGroup.add(cork);
        }

        // Translucent sea net interior
        const seaNetInterior = new THREE.Mesh(
          new THREE.CircleGeometry(2.2, 14),
          new THREE.MeshBasicMaterial({ color: 0x0F172A, transparent: true, opacity: 0.38, side: THREE.DoubleSide })
        );
        seaNetInterior.rotation.x = -Math.PI / 2;
        seaNetInterior.position.y = -0.02;
        netGroup.add(seaNetInterior);

        netGroup.position.set(bd.targetX, 0.08, bd.targetZ);
        netGroup.visible = false;
        this.group.add(netGroup);

        // Autonomous expedition boat object
        this.expeditionBoats.push({
          id: bd.id,
          name: bd.name,
          group: boatGroup,
          netMesh: netGroup,
          dockPos: new THREE.Vector3(bd.x, 0.05, bd.z),
          targetPos: new THREE.Vector3(bd.targetX, 0.05, bd.targetZ),
          currentPos: new THREE.Vector3(bd.x, 0.05, bd.z),
          heading: 0,
          state: 'DOCKED',
          timer: idx * 12.0, // Staggered departure so both boats operate independently!
          waitDuration: 22.0 + idx * 8.0,
          speed: 3.5,
          baseY: 0.05,
          phase: idx * 1.5
        });

        // Add to main scene group so it moves independently across the ocean
        this.group.add(boatGroup);
      } else {
        // Moored harbor boat
        pierGroup.add(boatGroup);
        this.boats.push({ group: boatGroup, baseY: 0.05, phase: idx * 1.4 });
      }
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
    }

    this.group.add(pierGroup);
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

      // 1. Fundo do casco maciço
      const hullBottom = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.12, 4.4), hullColor);
      hullBottom.position.y = 0.06;
      canoeGroup.add(hullBottom);

      // 2. Bordas laterais vazadas (bordas da canoa)
      const gunwaleL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 4.4), hullColor);
      gunwaleL.position.set(-0.62, 0.25, 0);
      canoeGroup.add(gunwaleL);

      const gunwaleR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 4.4), hullColor);
      gunwaleR.position.set(0.62, 0.25, 0);
      canoeGroup.add(gunwaleR);

      // 3. Faixa decorativa externa branca (Offset radial estrito = Zero Z-Fighting!)
      const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 4.38), boatWhiteMat);
      stripeL.position.set(-0.70, 0.31, 0);
      canoeGroup.add(stripeL);

      const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 4.38), boatWhiteMat);
      stripeR.position.set(0.70, 0.31, 0);
      canoeGroup.add(stripeR);

      // 4. Bico de proa pontuda e popa tradicional levantada
      const bowGeo = new THREE.ConeGeometry(0.68, 1.15, 4);
      bowGeo.rotateX(Math.PI / 2);
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

    // 2. Canoa Vermelha & Branca (Enseada do Píer - Clearance seguro de 12.5m da base do Farol!)
    westCoveGroup.add(buildCanoe(-84, 56, -0.35, -0.06, boatRedMat));

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

    // 6. Piscinas Naturais e Granitos Costeiros
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x52525B, flatShading: true });
    const rocks = [
      { x: -130, z: 52, s: 2.2 },
      { x: -124, z: 58, s: 1.8 },
      { x: -108, z: 62, s: 2.5 },
      { x: -84,  z: 66, s: 1.9 },
      { x: -68,  z: 72, s: 2.1 }
    ];
    rocks.forEach(rk => {
      const ry = this.terrain ? this.terrain.getElevation(rk.x, rk.z) : 0.2;
      const rockMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(rk.s, 0), rockMat);
      rockMesh.position.set(rk.x, ry + rk.s * 0.25, rk.z);
      rockMesh.rotation.set(0.3, 0.5, 0.2);
      westCoveGroup.add(rockMesh);
    });

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

    // Stone terrace foundation
    const terrace = new THREE.Mesh(
      new THREE.CylinderGeometry(6.5, 7.2, 1.8, 12),
      new THREE.MeshLambertMaterial({ color: 0x524B42, flatShading: true })
    );
    terrace.position.y = -0.7;
    terrace.receiveShadow = true;
    coveGroup.add(terrace);

    // Wooden boat dry-dock stanchions & rails
    const timberMat = new THREE.MeshLambertMaterial({ color: 0x5C4033, flatShading: true });
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 5.5), timberMat);
    rail1.position.set(-0.6, 0.15, 0);
    coveGroup.add(rail1);
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 5.5), timberMat);
    rail2.position.set(0.6, 0.15, 0);
    coveGroup.add(rail2);

    // Traditional Caiçara fishing rowboat resting on slipway
    const boatGroup = new THREE.Group();
    const hullMat = new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: true });
    const boatHull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 3.8), hullMat);
    boatHull.position.y = 0.45;
    boatHull.castShadow = true;
    boatGroup.add(boatHull);

    const gunwaleMat = new THREE.MeshLambertMaterial({ color: 0x78350F });
    const gunwale = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 3.9), gunwaleMat);
    gunwale.position.y = 0.82;
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
    const palmLocations = [
      { x: -96, z: 32, lean: 0.36, rotY: 0.3 },
      { x: -65, z: 36, lean: 0.42, rotY: -0.2 },
      { x: -32, z: 32, lean: 0.32, rotY: 0.1 },
      { x: 2,   z: 35, lean: 0.38, rotY: 0.4 },
      { x: 34,  z: 33, lean: 0.34, rotY: -0.3 },
      { x: 76,  z: 36, lean: 0.40, rotY: 0.2 },
      { x: 100, z: 32, lean: 0.35, rotY: -0.1 }
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
  // AUTONOMOUS CAIÇARA FISHING EXPEDITIONS (NETS & GAIVOTAS)
  // =========================================================================
  updateExpeditionBoats(delta, time) {
    if (!this.expeditionBoats || this.expeditionBoats.length === 0) return;

    for (let i = 0; i < this.expeditionBoats.length; i++) {
      const boat = this.expeditionBoats[i];

      // Wave bobbing
      boat.group.position.y = boat.baseY + Math.sin(time * 2.0 + boat.phase) * 0.11;
      boat.group.rotation.z = Math.sin(time * 1.6 + boat.phase) * 0.04;

      if (boat.state === 'DOCKED') {
        boat.timer += delta;
        if (boat.timer >= boat.waitDuration) {
          boat.timer = 0;
          boat.state = 'SAILING_OUT';
        }
      } else if (boat.state === 'SAILING_OUT') {
        const dir = new THREE.Vector3().subVectors(boat.targetPos, boat.currentPos);
        const dist = dir.length();

        if (dist > 1.2) {
          dir.normalize();
          boat.currentPos.addScaledVector(dir, boat.speed * delta);
          boat.heading = Math.atan2(dir.x, dir.z);
          boat.group.rotation.y = boat.heading;
          boat.group.position.x = boat.currentPos.x;
          boat.group.position.z = boat.currentPos.z;
        } else {
          // Arrived at fishing grounds: Cast the net!
          boat.state = 'CASTING_NETS';
          boat.timer = 0;
          if (boat.netMesh) {
            boat.netMesh.position.set(boat.currentPos.x + 1.2, 0.08, boat.currentPos.z + 0.6);
            boat.netMesh.visible = true;
            boat.netMesh.scale.set(0.2, 0.2, 0.2);
          }
          // Set target for dynamic gaivotas to flock overhead!
          if (this.env) {
            this.env.fishingBoatTarget = boat.currentPos.clone();
          }
        }
      } else if (boat.state === 'CASTING_NETS') {
        boat.timer += delta;
        // Net ring expands onto the sea surface
        if (boat.netMesh) {
          const s = Math.min(1.0, 0.2 + boat.timer * 0.8);
          boat.netMesh.scale.set(s, s, s);
        }
        if (boat.timer >= 1.2) {
          boat.state = 'FISHING_WAIT';
          boat.timer = 0;
        }
      } else if (boat.state === 'FISHING_WAIT') {
        boat.timer += delta;
        // Net ring gently floats with the ocean waves
        if (boat.netMesh) {
          boat.netMesh.position.y = 0.08 + Math.sin(time * 2.2 + boat.phase) * 0.07;
        }
        if (boat.timer >= boat.waitDuration) {
          boat.state = 'HAULING_NETS';
          boat.timer = 0;
        }
      } else if (boat.state === 'HAULING_NETS') {
        boat.timer += delta;
        // Leaping silvery fish particles jump out of the water!
        if (Math.random() < 0.45 && boat.netMesh) {
          this.spawnJumpingFish(boat.netMesh.position);
        }
        // Net ring lifts up
        if (boat.netMesh) {
          const s = Math.max(0.01, 1.0 - boat.timer * 0.35);
          boat.netMesh.scale.set(s, s, s);
          boat.netMesh.position.y += delta * 0.4;
        }

        if (boat.timer >= 3.0) {
          if (boat.netMesh) boat.netMesh.visible = false;
          // Release gaivota tracking back to full ocean wandering
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
        const dir = new THREE.Vector3().subVectors(boat.dockPos, boat.currentPos);
        const dist = dir.length();

        if (dist > 1.0) {
          dir.normalize();
          boat.currentPos.addScaledVector(dir, (boat.speed * 0.95) * delta);
          boat.heading = Math.atan2(dir.x, dir.z);
          boat.group.rotation.y = boat.heading;
          boat.group.position.x = boat.currentPos.x;
          boat.group.position.z = boat.currentPos.z;
        } else {
          // Re-docked safely at the pier bollard
          boat.currentPos.copy(boat.dockPos);
          boat.group.position.copy(boat.dockPos);
          boat.group.rotation.y = 0;
          boat.state = 'DOCKED';
          boat.timer = 0;
        }
      }
    }

    // Update Jumping Fish physics
    for (let f = this.jumpingFish.length - 1; f >= 0; f--) {
      const fish = this.jumpingFish[f];
      fish.life -= delta * 1.4;
      fish.vel.y -= 11.0 * delta; // Gravity
      fish.mesh.position.addScaledVector(fish.vel, delta);
      fish.mesh.rotation.x += delta * 10.0;
      fish.mesh.rotation.z += delta * 8.0;

      if (fish.life <= 0 || fish.mesh.position.y < -0.2) {
        this.group.remove(fish.mesh);
        // Do not dispose shared resources
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
  }
};
