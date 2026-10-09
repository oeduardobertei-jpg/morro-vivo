import * as THREE from 'three';

/** Orla: calçadão, barracas, quiosques, esportes de praia e comércio. */
export const BeachLifeMixin = {
  // 1. PASSARELAS DE MADEIRA (Beach Boardwalks)
  createBeachBoardwalks() {
    const plankMat = new THREE.MeshLambertMaterial({ color: 0x8C7456, flatShading: true });
    const boardwalkGroup = new THREE.Group();

    const addPlankRun = (startPt, endPt, width = 2.4, spacing = 0.85) => {
      const dist = Math.hypot(endPt.x - startPt.x, endPt.z - startPt.z);
      const steps = Math.floor(dist / spacing);
      const dx = (endPt.x - startPt.x) / steps;
      const dz = (endPt.z - startPt.z) / steps;
      const heading = Math.atan2(dx, dz);

      for (let s = 0; s <= steps; s++) {
        const px = startPt.x + dx * s;
        const pz = startPt.z + dz * s;
        const py = this.terrain ? this.terrain.getElevation(px, pz) : 0.6;

        const plank = new THREE.Mesh(new THREE.BoxGeometry(width, 0.10, 0.48), plankMat);
        plank.position.set(px, py + 0.05, pz);
        plank.rotation.y = heading;
        plank.receiveShadow = true;
        boardwalkGroup.add(plank);
      }
    };

    // Central boardwalk: starts at z: 20.4 (cleanly on sand at the foot of the curb, never overlapping concrete stones!)
    addPlankRun({ x: 0, z: 20.4 }, { x: 0, z: 47.0 }, 2.8, 0.8);

    // Western boardwalk: starts at z: 20.4 down to fishing pier (x: -78, z: 74)
    addPlankRun({ x: -78, z: 20.4 }, { x: -78, z: 74 }, 3.0, 0.8);

    // Eastern boardwalk: starts at z: 20.4 down to altinha & leisure zone (x: 55, z: 66)
    addPlankRun({ x: 55, z: 20.4 }, { x: 55, z: 66 }, 2.8, 0.8);

    // Horizontal promenade boardwalk connecting all 4 stalls in front of their counters (z: 47.0, from west pier to east altinha)
    addPlankRun({ x: -78, z: 47.0 }, { x: 55, z: 47.0 }, 2.6, 0.85);

    this.group.add(boardwalkGroup);
  },

  // 2. AS 4 BARRACAS TRADICIONAIS DA PRAIA (Beach Stalls)
  createBeachStalls() {
    this.beachStalls = [
      {
        id: 'coco',
        name: 'Barraca do Coco Verde',
        x: -40,
        z: 44.0,
        colorA: 0x2D6A4F,
        colorB: 0xF5F5F5,
        icon: '🥥',
        product: 'Água de Coco Gelada',
        customerSpot: new THREE.Vector3(-40, 0, 46.2),
        vendorSpot: new THREE.Vector3(-40, 0, 42.8)
      },
      {
        id: 'mate',
        name: 'Barraca do Mate & Biscoito Globo',
        x: -10,
        z: 44.0,
        colorA: 0xF97316,
        colorB: 0xFDE047,
        icon: '🥤',
        product: 'Mate Gelado com Biscoito Globo',
        customerSpot: new THREE.Vector3(-10, 0, 46.2),
        vendorSpot: new THREE.Vector3(-10, 0, 42.8)
      },
      {
        id: 'acai',
        name: 'Barraca do Açaí Tropical',
        x: 20,
        z: 44.0,
        colorA: 0x7E22CE,
        colorB: 0x06B6D4,
        icon: '🍧',
        product: 'Tigela de Açaí com Banana e Granola',
        customerSpot: new THREE.Vector3(20, 0, 46.2),
        vendorSpot: new THREE.Vector3(20, 0, 42.8)
      },
      {
        id: 'petiscos',
        name: 'Barraca de Frutos do Mar & Petiscos',
        x: 50,
        z: 44.0,
        colorA: 0xDC2626,
        colorB: 0xF5F5F5,
        icon: '🦐',
        product: 'Pastel de Camarão & Isca de Peixe',
        customerSpot: new THREE.Vector3(50, 0, 46.2),
        vendorSpot: new THREE.Vector3(50, 0, 42.8)
      }
    ];

    const stallGroup = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x6B4F35, flatShading: true });
    const counterMat = new THREE.MeshLambertMaterial({ color: 0x8C7456, flatShading: true });

    this.beachStalls.forEach(st => {
      // Robust multi-point terrain sampling under the stall footprint (prevents sloping sand from swallowing the deck)
      const yBL = this.terrain ? this.terrain.getElevation(st.x - 2.1, st.z - 1.8) : 0.6;
      const yBR = this.terrain ? this.terrain.getElevation(st.x + 2.1, st.z - 1.8) : 0.6;
      const yFL = this.terrain ? this.terrain.getElevation(st.x - 2.1, st.z + 1.8) : 0.6;
      const yFR = this.terrain ? this.terrain.getElevation(st.x + 2.1, st.z + 1.8) : 0.6;
      const yCenter = this.terrain ? this.terrain.getElevation(st.x, st.z) : 0.6;
      const maxY = Math.max(yBL, yBR, yFL, yFR, yCenter);

      // Elevated foundation base: deck sits safely above highest sand crest
      const baseElev = maxY + 0.16;
      st.customerSpot.y = this.terrain ? this.terrain.getElevation(st.customerSpot.x, st.customerSpot.z) : baseElev;
      st.vendorSpot.y = baseElev + 0.24;

      const singleStall = new THREE.Group();
      singleStall.position.set(st.x, baseElev, st.z);

      // Solid elevated wooden deck platform
      const deck = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.24, 3.8), counterMat);
      deck.position.y = 0.12;
      deck.receiveShadow = true;
      singleStall.add(deck);

      // Deep foundation skirt below the deck (extends down into the sand so no gap or floating looks weird)
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.85, 3.75), woodMat);
      skirt.position.y = -0.32;
      singleStall.add(skirt);

      // 4 heavy timber foundation piles going deep into sand
      [-2.0, 2.0].forEach(fx => {
        [-1.7, 1.7].forEach(fz => {
          const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 6), woodMat);
          pile.position.set(fx, -0.65, fz);
          singleStall.add(pile);
        });
      });

      // Support corner poles
      const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.7, 4);
      [-1.8, 1.8].forEach(px => {
        [-1.5, 1.5].forEach(pz => {
          const pole = new THREE.Mesh(poleGeo, woodMat);
          pole.position.set(px, 1.35, pz);
          singleStall.add(pole);
        });
      });

      // Serving Counter
      const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.8), woodMat);
      counter.position.set(0, 0.55, 0.5);
      singleStall.add(counter);

      // Striped Canvas Awning Canopy
      const awningGeo = new THREE.BoxGeometry(4.4, 0.2, 3.8);
      const awningMat = new THREE.MeshLambertMaterial({ color: st.colorA, flatShading: true });
      const awning = new THREE.Mesh(awningGeo, awningMat);
      awning.position.set(0, 2.7, 0);
      awning.rotation.x = 0.12; // Slight sun visor slant
      singleStall.add(awning);

      // Striped fringe
      for (let s = 0; s < 5; s++) {
        const stripeGeo = new THREE.BoxGeometry(0.75, 0.22, 3.82);
        const stripeMat = new THREE.MeshLambertMaterial({
          color: s % 2 === 0 ? st.colorA : st.colorB,
          flatShading: true
        });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(-1.5 + s * 0.75, 2.71, 0);
        stripe.rotation.x = 0.12;
        singleStall.add(stripe);
      }

      // Wooden front sign
      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.45, 0.08),
        new THREE.MeshLambertMaterial({ color: 0xFEF08A })
      );
      signBoard.position.set(0, 2.3, 1.85);
      singleStall.add(signBoard);

      // Specialized Props per Stall:
      if (st.id === 'coco') {
        // Pyramids of fresh green coconuts
        const cocoMat = new THREE.MeshLambertMaterial({ color: 0x2D6A4F });
        for (let c = 0; c < 6; c++) {
          const coco = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), cocoMat);
          coco.position.set(-1.0 + (c % 3) * 0.35, 1.15 + (c > 2 ? 0.25 : 0), 0.5);
          singleStall.add(coco);
        }
        // Chopping stump & machete
        const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.7, 6), woodMat);
        stump.position.set(1.1, 0.45, 0.5);
        singleStall.add(stump);
        // Cooler box
        const cooler = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.55, 0.6),
          new THREE.MeshLambertMaterial({ color: 0x0284C7 })
        );
        cooler.position.set(-1.1, 0.38, -0.9);
        singleStall.add(cooler);
      } else if (st.id === 'mate') {
        // Classic dual stainless steel cylindrical Mate Leão canisters
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xD1D5DB, metalness: 0.7, roughness: 0.2 });
        [-0.45, 0.45].forEach(kx => {
          const keg = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.85, 8), steelMat);
          keg.position.set(kx, 1.45, 0.5);
          singleStall.add(keg);
        });
        // Biscoito Globo paper bags
        const bagMatY = new THREE.MeshLambertMaterial({ color: 0xFDE047 });
        const bagMatG = new THREE.MeshLambertMaterial({ color: 0x86EFAC });
        for (let b = 0; b < 4; b++) {
          const bag = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.15), b % 2 === 0 ? bagMatY : bagMatG);
          bag.position.set(-1.0 + b * 0.3, 1.15, 0.45);
          singleStall.add(bag);
        }
      } else if (st.id === 'acai') {
        // Blender & bowls of açaí
        const bowlMat = new THREE.MeshLambertMaterial({ color: 0x4A044E });
        for (let a = 0; a < 3; a++) {
          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.18, 6), bowlMat);
          bowl.position.set(-0.8 + a * 0.4, 1.1, 0.5);
          singleStall.add(bowl);
        }
        // Wooden fruit crate
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.6), woodMat);
        crate.position.set(0.9, 1.18, 0.45);
        singleStall.add(crate);
      } else if (st.id === 'petiscos') {
        // Charcoal grill with chimney
        const grillMat = new THREE.MeshLambertMaterial({ color: 0x1E293B });
        const grill = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.6), grillMat);
        grill.position.set(1.0, 1.35, 0.5);
        singleStall.add(grill);
        // Trays of shrimp skewers and pasteis
        const tray = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.08, 0.45),
          new THREE.MeshLambertMaterial({ color: 0x94A3B8 })
        );
        tray.position.set(-0.6, 1.05, 0.5);
        singleStall.add(tray);
      }

      // Customer wooden stools
      [-0.85, 0.85].forEach(sx => {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.48, 6), counterMat);
        stool.position.set(sx, 0.32, 1.6);
        singleStall.add(stool);
      });

      stallGroup.add(singleStall);
    });

    this.group.add(stallGroup);
  },

  // Traditional Rio Beachfront Kiosks (Quiosques Clássicos do Calçadão)
  createBeachfrontKiosks() {
    const kioskGroup = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x6B4F35, flatShading: true });
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x8C7456, flatShading: true });
    const counterMat = new THREE.MeshLambertMaterial({ color: 0x582F0E, flatShading: true });

    // Carefully chosen coordinates along upper beach edge (Z ≈ 23..24):
    // Strictly AWAY from the 3 boardwalk entrances (x: -78, 0, 55)!
    const kioskLocations = [
      { x: -48, z: 23.5, roofColor: 0xD4A373, name: 'Quiosque da Praia da Prainha' },
      { x: -22, z: 24.0, roofColor: 0x38BDF8, name: 'Quiosque Onda Azul' },
      { x: 24,  z: 24.0, roofColor: 0xFACC15, name: 'Quiosque Sol Carioca' },
      { x: 76,  z: 22.5, roofColor: 0xFB923C, name: 'Quiosque Vista da Várzea' }
    ];

    kioskLocations.forEach(loc => {
      // Multi-point terrain sampling under footprint to ensure no sinking in sand
      const yBL = this.terrain ? this.terrain.getElevation(loc.x - 1.8, loc.z - 1.6) : 0.8;
      const yBR = this.terrain ? this.terrain.getElevation(loc.x + 1.8, loc.z - 1.6) : 0.8;
      const yFL = this.terrain ? this.terrain.getElevation(loc.x - 1.8, loc.z + 1.6) : 0.8;
      const yFR = this.terrain ? this.terrain.getElevation(loc.x + 1.8, loc.z + 1.6) : 0.8;
      const yC = this.terrain ? this.terrain.getElevation(loc.x, loc.z) : 0.8;
      const maxY = Math.max(yBL, yBR, yFL, yFR, yC);
      const baseY = maxY + 0.14;

      const singleKiosk = new THREE.Group();
      singleKiosk.position.set(loc.x, baseY, loc.z);

      // Elevated wooden deck
      const deck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 3.2), deckMat);
      deck.position.y = 0.11;
      deck.receiveShadow = true;
      singleKiosk.add(deck);

      // Deep foundation skirt down into sand
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.70, 3.15), woodMat);
      skirt.position.y = -0.25;
      singleKiosk.add(skirt);

      // 4 heavy timber foundation piles
      [-1.6, 1.6].forEach(px => {
        [-1.4, 1.4].forEach(pz => {
          const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 1.6, 5), woodMat);
          pile.position.set(px, -0.6, pz);
          singleKiosk.add(pile);
        });
      });

      // 4 corner support posts
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5);
      [-1.5, 1.5].forEach(px => {
        [-1.3, 1.3].forEach(pz => {
          const post = new THREE.Mesh(postGeo, woodMat);
          post.position.set(px, 1.2, pz);
          singleKiosk.add(post);
        });
      });

      // Classic pitched 4-sided pyramid / hip canopy roof
      const roofMat = new THREE.MeshLambertMaterial({ color: loc.roofColor, flatShading: true });
      const roofGeo = new THREE.ConeGeometry(2.5, 1.15, 4);
      roofGeo.rotateY(Math.PI / 4); // Align 4 sides squarely with posts
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 2.95;
      singleKiosk.add(roof);

      // Wooden serving bar counter facing the sea (+Z)
      const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 0.65), counterMat);
      counter.position.set(0, 0.54, 0.35);
      singleKiosk.add(counter);

      // 3 customer round stools in front of counter
      [-0.7, 0, 0.7].forEach(sx => {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.46, 6), deckMat);
        stool.position.set(sx, 0.34, 1.15);
        singleKiosk.add(stool);
      });

      // Blackboard menu board
      const boardMat = new THREE.MeshLambertMaterial({ color: 0x1E293B });
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.04), boardMat);
      board.position.set(0, 2.1, 0.35);
      singleKiosk.add(board);

      // Warm overhead lantern for nighttime illumination
      const lanternMat = new THREE.MeshLambertMaterial({ color: 0xFDE047, emissive: 0xF59E0B, emissiveIntensity: 0.3 });
      const lanternMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), lanternMat);
      lanternMesh.position.set(0, 2.3, 0.45);
      singleKiosk.add(lanternMesh);

      const kioskLight = new THREE.PointLight(0xFFA200, 0, 11);
      kioskLight.position.set(0, 2.2, 0.5);
      singleKiosk.add(kioskLight);
      this.kioskLamps.push({ light: kioskLight, mat: lanternMat });

      kioskGroup.add(singleKiosk);
    });

    this.group.add(kioskGroup);
  },

  // 3. GUARDA-SÓIS & CADEIRAS DE PRAIA DINÂMICOS (Dynamic Umbrellas & Beach Chairs)
  createBeachLeisureZones() {
    this.beachUmbrellas = [];
    const leisureGroup = new THREE.Group();

    // 12 stations arranged naturally in clusters along x: [-55, 45], z: [30, 62]
    const stations = [
      // Cluster 1 (West beach)
      { x: -52, z: 34, colorA: 0x2A75D3, colorB: 0xFFFFFF },
      { x: -44, z: 38, colorA: 0xE76F51, colorB: 0xFDE047 },
      { x: -35, z: 32, colorA: 0x2A9D8F, colorB: 0xF97316 },
      { x: -48, z: 54, colorA: 0x2A75D3, colorB: 0xFFFFFF },
      // Cluster 2 (Central beach)
      { x: -22, z: 36, colorA: 0xF43F5E, colorB: 0xFFFFFF },
      { x: -14, z: 52, colorA: 0x06B6D4, colorB: 0xFDE047 },
      { x: -6,  z: 34, colorA: 0x2A9D8F, colorB: 0xFFFFFF },
      { x: 4,   z: 56, colorA: 0xE76F51, colorB: 0xFDE047 },
      // Cluster 3 (East beach)
      { x: 14,  z: 36, colorA: 0x2A75D3, colorB: 0xFFFFFF },
      { x: 26,  z: 52, colorA: 0xF97316, colorB: 0xFDE047 },
      { x: 38,  z: 35, colorA: 0x2A9D8F, colorB: 0xFFFFFF },
      { x: 46,  z: 54, colorA: 0xF43F5E, colorB: 0xFFFFFF }
    ];

    const poleMat = new THREE.MeshLambertMaterial({ color: 0xD1D5DB });
    const chairAlumMat = new THREE.MeshLambertMaterial({ color: 0x94A3B8 });

    stations.forEach((st, idx) => {
      const y = this.terrain ? this.terrain.getElevation(st.x, st.z) : 0.45;
      const stationGroup = new THREE.Group();
      stationGroup.position.set(st.x, y, st.z);

      // Large Carioca Parasol
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 5), poleMat);
      pole.position.y = 1.3;
      stationGroup.add(pole);

      const canopy = new THREE.Group();
      canopy.position.y = 2.4;

      // 8 striped cone segments
      for (let s = 0; s < 8; s++) {
        const segGeo = new THREE.ConeGeometry(2.1, 0.75, 4);
        segGeo.rotateY((s / 8) * Math.PI * 2);
        const segMat = new THREE.MeshLambertMaterial({
          color: s % 2 === 0 ? st.colorA : st.colorB,
          flatShading: true,
          side: THREE.DoubleSide
        });
        const seg = new THREE.Mesh(segGeo, segMat);
        canopy.add(seg);
      }
      stationGroup.add(canopy);

      // 2 Folding beach chairs (cadeiras de praia reclinadas)
      [-0.75, 0.75].forEach((cx, cIdx) => {
        const chair = new THREE.Group();
        chair.position.set(cx, 0.12, 0.45);
        chair.rotation.y = (cIdx === 0 ? 0.25 : -0.25);

        // Frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.65), chairAlumMat);
        chair.add(frame);
        // Fabric back
        const backMat = new THREE.MeshLambertMaterial({ color: st.colorA, flatShading: true });
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.65, 0.05), backMat);
        back.position.set(0, 0.32, -0.28);
        back.rotation.x = -0.32;
        chair.add(back);

        stationGroup.add(chair);
      });

      // Beach towel (canga) laid on the sand
      const cangaMat = new THREE.MeshLambertMaterial({ color: st.colorB, side: THREE.DoubleSide });
      const canga = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.85), cangaMat);
      canga.rotateX(-Math.PI / 2);
      canga.position.set(0, 0.03, -0.6);
      stationGroup.add(canga);

      // Initially active if index < 4 (starter beach setup), else scales dynamically
      const initialActive = idx < 4;
      stationGroup.scale.set(initialActive ? 1 : 0.001, initialActive ? 1 : 0.001, initialActive ? 1 : 0.001);
      stationGroup.visible = initialActive;

      leisureGroup.add(stationGroup);

      this.beachUmbrellas.push({
        group: stationGroup,
        order: idx,
        targetScale: initialActive ? 1.0 : 0.0,
        currentScale: initialActive ? 1.0 : 0.0,
        pos: { x: st.x, y, z: st.z }
      });
    });

    // Decorative sandcastles (Castelos de areia artesanais na beira da água)
    const sandcastleMat = new THREE.MeshLambertMaterial({ color: 0xD8B365, flatShading: true });
    [-18, 35].forEach((scX, scIdx) => {
      const scZ = 67.0;
      const scY = this.terrain ? this.terrain.getElevation(scX, scZ) : 0.25;
      const castle = new THREE.Group();
      castle.position.set(scX, scY, scZ);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.45, 6), sandcastleMat);
      base.position.y = 0.22;
      castle.add(base);

      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.6, 6), sandcastleMat);
      tower.position.y = 0.65;
      castle.add(tower);

      const flag = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.12, 0.02),
        new THREE.MeshBasicMaterial({ color: scIdx === 0 ? 0xEF4444 : 0x3B82F6 })
      );
      flag.position.set(0.12, 1.05, 0);
      castle.add(flag);

      leisureGroup.add(castle);
    });

    this.group.add(leisureGroup);
  },

  createBeachLifeEdges() {
    this.createWestFishingCove();
    this.createEastBeachSportsAndLeisure();
    this.createCoastalBromeliadsAndBushes();
    this.createCommunityShopSigns();
    this.createWestHillsideExpansion();
    this.createEastHillsideAndDuneExpansion();
  },

  // 2. PRAIA DA VÁRZEA & DUNAS DO SOL NASCENTE (Extremo Leste: X = +65 a +145)
  // Polo de lazer balneário e esportivo com quadra de Futevôlei, quadra de Vôlei de Praia, quiosque de palha e coqueiral
  createEastBeachSportsAndLeisure() {
    const eastSportsGroup = new THREE.Group();

    const netPostWoodMat = new THREE.MeshLambertMaterial({ color: 0x78350F, flatShading: true });
    const netPostSteelMat = new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: true });
    const netWhiteMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.65, wireframe: true });
    const tapeBlueMat = new THREE.MeshBasicMaterial({ color: 0x2563EB });
    const tapeRedMat = new THREE.MeshBasicMaterial({ color: 0xDC2626 });
    const ballMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true });
    const thatchMat = new THREE.MeshLambertMaterial({ color: 0xB48C56, flatShading: true });
    const counterWoodMat = new THREE.MeshLambertMaterial({ color: 0x5C381E, flatShading: true });

    // 1. QUADRA DE FUTEVÔLEI CARIOCA (x: 78, z: 42)
    const fvY = this.terrain ? this.terrain.getElevation(78, 42) : 0.45;
    const fvGroup = new THREE.Group();
    fvGroup.position.set(78, fvY, 42);

    [-4.5, 4.5].forEach(px => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 6), netPostWoodMat);
      post.position.set(px, 1.25, 0);
      fvGroup.add(post);
    });

    // Rede de Futevôlei (altura 2.15m tradicional)
    const fvNet = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.7, 0.02), netWhiteMat);
    fvNet.position.set(0, 1.75, 0);
    fvGroup.add(fvNet);

    const topTape = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.08, 0.04), new THREE.MeshBasicMaterial({ color: 0xFACC15 }));
    topTape.position.set(0, 2.12, 0);
    fvGroup.add(topTape);

    const fvTape = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.02, 16.0), tapeBlueMat);
    fvTape.position.set(0, 0.01, 0);
    fvTape.material.wireframe = true;
    fvGroup.add(fvTape);

    const soccerBall = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 1), ballMat);
    soccerBall.position.set(1.2, 0.18, 1.5);
    fvGroup.add(soccerBall);

    eastSportsGroup.add(fvGroup);

    // 2. QUADRA DE VÔLEI DE PRAIA TRADICIONAL (x: 98, z: 44)
    // Próxima à do futevôlei, cada uma no seu espaço
    const vbY = this.terrain ? this.terrain.getElevation(98, 44) : 0.45;
    const vbGroup = new THREE.Group();
    vbGroup.position.set(98, vbY, 44);

    [-4.8, 4.8].forEach(px => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.1, 8), netPostSteelMat);
      post.position.set(px, 1.5, 0);
      vbGroup.add(post);

      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8), new THREE.MeshLambertMaterial({ color: 0xF97316 }));
      pad.position.set(px, 0.7, 0);
      vbGroup.add(pad);

      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.8, 4), new THREE.MeshBasicMaterial({ color: 0xEF4444 }));
      antenna.position.set(px * 0.88, 2.5, 0);
      vbGroup.add(antenna);
    });

    const vbNet = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.9, 0.02), netWhiteMat);
    vbNet.position.set(0, 2.0, 0);
    vbGroup.add(vbNet);

    const vbTopTape = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.09, 0.04), new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
    vbTopTape.position.set(0, 2.45, 0);
    vbGroup.add(vbTopTape);

    const vbTape = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.02, 16.0), tapeRedMat);
    vbTape.position.set(0, 0.01, 0);
    vbTape.material.wireframe = true;
    vbGroup.add(vbTape);

    const volleyBall = new THREE.Mesh(new THREE.DodecahedronGeometry(0.19, 1), new THREE.MeshLambertMaterial({ color: 0xFDE047 }));
    volleyBall.position.set(-1.8, 0.19, -2.2);
    vbGroup.add(volleyBall);

    eastSportsGroup.add(vbGroup);

    // 3. QUIOSQUE DO SOL NASCENTE (x: 116, z: 32)
    const kqY = this.terrain ? this.terrain.getElevation(116, 32) : 0.6;
    const kioskGroup = new THREE.Group();
    kioskGroup.position.set(116, kqY, 32);

    const kDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 4.0), counterWoodMat);
    kDeck.position.y = 0.12;
    kioskGroup.add(kDeck);

    [[-1.8, -1.7], [1.8, -1.7], [-1.8, 1.7], [1.8, 1.7]].forEach(([px, pz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.6, 6), counterWoodMat);
      pole.position.set(px, 1.4, pz);
      kioskGroup.add(pole);
    });

    const thatchRoof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.5, 4), thatchMat);
    thatchRoof.position.y = 3.25;
    thatchRoof.rotation.y = Math.PI / 4;
    kioskGroup.add(thatchRoof);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.85, 0.6), counterWoodMat);
    counter.position.set(0, 0.55, 0.8);
    kioskGroup.add(counter);

    [-1.0, 0, 1.0].forEach(bx => {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.45, 6), counterWoodMat);
      stool.position.set(bx, 0.35, 1.6);
      kioskGroup.add(stool);
    });

    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.05), new THREE.MeshLambertMaterial({ color: 0xFACC15 }));
    sign.position.set(0, 2.2, 1.7);
    kioskGroup.add(sign);

    eastSportsGroup.add(kioskGroup);

    // 4. CANGAS ESTAMPADAS COLORIDAS ESTENDIDAS NA AREIA
    const cangaConfigs = [
      { x: 72,  z: 52, rotY: 0.2, color: 0x10B981 },
      { x: 88,  z: 56, rotY: -0.3, color: 0xF43F5E },
      { x: 106, z: 52, rotY: 0.15, color: 0x06B6D4 },
      { x: 122, z: 46, rotY: -0.25, color: 0xF59E0B }
    ];

    cangaConfigs.forEach(cg => {
      const cgY = this.terrain ? this.terrain.getElevation(cg.x, cg.z) : 0.4;
      const cangaGroup = new THREE.Group();
      cangaGroup.position.set(cg.x, cgY + 0.02, cg.z);
      cangaGroup.rotation.y = cg.rotY;

      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshLambertMaterial({ color: cg.color, side: THREE.DoubleSide }));
      cloth.rotation.x = -Math.PI / 2;
      cangaGroup.add(cloth);

      [-0.12, 0.12].forEach(hx => {
        const flipFlop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.26), new THREE.MeshBasicMaterial({ color: 0x1E293B }));
        flipFlop.position.set(0.65 + hx, 0.02, 0.2);
        cangaGroup.add(flipFlop);
      });

      const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.4, 8), new THREE.MeshLambertMaterial({ color: cg.color, flatShading: true }));
      umbrella.position.set(-0.9, 1.8, -0.4);
      cangaGroup.add(umbrella);

      const umbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 4), new THREE.MeshLambertMaterial({ color: 0xE2E8F0 }));
      umbPole.position.set(-0.9, 0.9, -0.4);
      cangaGroup.add(umbPole);

      eastSportsGroup.add(cangaGroup);
    });

    // 5. COQUEIRAL DAS DUNAS LESTE (x: 126 a 145, z: 25 a 55)
    const palmConfigs = [
      { x: 128, z: 28, rotZ: 0.15 },
      { x: 134, z: 36, rotZ: -0.12 },
      { x: 130, z: 46, rotZ: 0.18 },
      { x: 140, z: 32, rotZ: -0.22 },
      { x: 142, z: 44, rotZ: 0.14 },
      { x: 136, z: 54, rotZ: -0.16 }
    ];

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6B4226, flatShading: true });
    const palmLeafMat = new THREE.MeshLambertMaterial({ color: 0x166534, flatShading: true });

    palmConfigs.forEach(pc => {
      const pY = this.terrain ? this.terrain.getElevation(pc.x, pc.z) : 0.5;
      const palm = new THREE.Group();
      palm.position.set(pc.x, pY, pc.z);
      palm.rotation.z = pc.rotZ;

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 6.5, 6), trunkMat);
      trunk.position.y = 3.25;
      palm.add(trunk);

      for (let l = 0; l < 6; l++) {
        const leafAngle = (l / 6) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 4), palmLeafMat);
        leaf.position.set(Math.cos(leafAngle) * 0.9, 6.2, Math.sin(leafAngle) * 0.9);
        leaf.rotation.set(Math.sin(leafAngle) * 0.6, 0, -Math.cos(leafAngle) * 0.6);
        palm.add(leaf);
      }

      eastSportsGroup.add(palm);
    });

    eastSportsGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    this.group.add(eastSportsGroup);
  },

  // 3. VEGETAÇÃO NATIVA & BROMÉLIAS COSTEIRAS
  createCoastalBromeliadsAndBushes() {
    const plantsGroup = new THREE.Group();
    const bromeliadMatRed = new THREE.MeshLambertMaterial({ color: 0xDC2626 });
    const bromeliadMatGreen = new THREE.MeshLambertMaterial({ color: 0x22C55E });
    const coastalBushMat = new THREE.MeshLambertMaterial({ color: 0x15803D });

    const plantSpots = [
      { x: -135, z: 28 }, { x: -128, z: 32 }, { x: -110, z: 32 },
      { x: 125, z: 26 }, { x: 132, z: 24 }, { x: 140, z: 26 }
    ];

    plantSpots.forEach(ps => {
      const py = this.terrain ? this.terrain.getElevation(ps.x, ps.z) : 1.2;
      const bGroup = new THREE.Group();
      bGroup.position.set(ps.x, py, ps.z);

      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), coastalBushMat);
      bush.position.y = 0.45;
      bGroup.add(bush);

      for (let b = 0; b < 3; b++) {
        const bro = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 5), (b % 2 === 0 ? bromeliadMatRed : bromeliadMatGreen));
        bro.position.set((b - 1) * 0.45, 0.2, 0.3);
        bro.rotation.z = (b - 1) * 0.2;
        bGroup.add(bro);
      }

      plantsGroup.add(bGroup);
    });

    plantsGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    this.group.add(plantsGroup);
  },

  // 4. PLAQUINHAS DE COMÉRCIO COMUNITÁRIO NAS LADEIRAS
  createCommunityShopSigns() {
    const signsGroup = new THREE.Group();
    const woodBoardMat = new THREE.MeshLambertMaterial({ color: 0xD97706, flatShading: true });
    const postMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

    const shopLocations = [
      { x: 55, z: -15, label: 'Barbearia do Morro', color: 0x3B82F6 },
      { x: -65, z: -38, label: 'Salão da Jô - Tranças', color: 0xEC4899 },
      { x: 0, z: -20, label: 'Depósito de Gás & Água', color: 0x0284C7 }
    ];

    shopLocations.forEach(loc => {
      const gy = this.terrain ? this.terrain.getElevation(loc.x, loc.z) : 8.0;
      const sGroup = new THREE.Group();
      sGroup.position.set(loc.x, gy, loc.z);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), postMat);
      post.position.set(0, 1.1, 0);
      sGroup.add(post);

      const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.06), woodBoardMat);
      sign.position.set(0, 1.9, 0);
      sGroup.add(sign);

      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.08), new THREE.MeshLambertMaterial({ color: loc.color }));
      badge.position.set(0, 1.9, 0);
      sGroup.add(badge);

      signsGroup.add(sGroup);
    });

    signsGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    this.group.add(signsGroup);
  },

  // 4. DUPLA DE ALTINHA COM ANIMAÇÃO NA BEIRA D'ÁGUA (East Altinha Duo)
  createAltinhaDuo() {
    const p1Pos = new THREE.Vector3(61.5, 0, 70.0);
    const p2Pos = new THREE.Vector3(68.0, 0, 70.0);
    p1Pos.y = this.terrain ? this.terrain.getElevation(p1Pos.x, p1Pos.z) : 0.25;
    p2Pos.y = this.terrain ? this.terrain.getElevation(p2Pos.x, p2Pos.z) : 0.25;

    const altinhaGroup = new THREE.Group();

    // Player 1 (Boardshorts, sunglasses, facing +X)
    const p1 = new THREE.Group();
    p1.position.copy(p1Pos);
    p1.rotation.y = Math.PI / 2;

    const skinMat = new THREE.MeshLambertMaterial({ color: 0x8D5524 });
    const p1Torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.65, 0.3), skinMat);
    p1Torso.position.y = 0.85;
    p1.add(p1Torso);

    const p1Head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), skinMat);
    p1Head.position.y = 1.34;
    p1.add(p1Head);

    const shadesMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const shades1 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.1), shadesMat);
    shades1.position.set(0, 1.36, 0.17);
    p1.add(shades1);

    const shorts1Mat = new THREE.MeshLambertMaterial({ color: 0x06B6D4 }); // Vibrant Cyan boardshorts
    const p1LegL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.18), shorts1Mat);
    p1LegL.position.set(-0.13, 0.29, 0);
    p1.add(p1LegL);
    const p1LegR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.18), shorts1Mat);
    p1LegR.position.set(0.13, 0.29, 0);
    p1.add(p1LegR);

    // Arms for Player 1
    const p1ArmL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), skinMat);
    p1ArmL.position.set(-0.31, 0.90, 0);
    p1.add(p1ArmL);
    const p1ArmR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), skinMat);
    p1ArmR.position.set(0.31, 0.90, 0);
    p1.add(p1ArmR);

    altinhaGroup.add(p1);

    // Player 2 (Classic Sunga Carioca, sunglasses, facing -X)
    const p2 = new THREE.Group();
    p2.position.copy(p2Pos);
    p2.rotation.y = -Math.PI / 2;

    const skinMat2 = new THREE.MeshLambertMaterial({ color: 0x70411B });
    const p2Torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.65, 0.3), skinMat2);
    p2Torso.position.y = 0.85;
    p2.add(p2Torso);

    const p2Head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), skinMat2);
    p2Head.position.y = 1.34;
    p2.add(p2Head);

    const shades2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.1), shadesMat);
    shades2.position.set(0, 1.36, 0.17);
    p2.add(shades2);

    const sungaMat = new THREE.MeshLambertMaterial({ color: 0xF43F5E }); // Pink Sunga
    const p2LegL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.18), skinMat2);
    p2LegL.position.set(-0.13, 0.29, 0);
    p2.add(p2LegL);
    const p2LegR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.18), skinMat2);
    p2LegR.position.set(0.13, 0.29, 0);
    p2.add(p2LegR);

    // Sunga brief
    const sunga = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.22, 0.32), sungaMat);
    sunga.position.set(0, 0.52, 0);
    p2.add(sunga);

    // Arms for Player 2
    const p2ArmL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), skinMat2);
    p2ArmL.position.set(-0.31, 0.90, 0);
    p2.add(p2ArmL);
    const p2ArmR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), skinMat2);
    p2ArmR.position.set(0.31, 0.90, 0);
    p2.add(p2ArmR);

    altinhaGroup.add(p2);

    // Ball for Altinha
    const ballGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const ballMat = new THREE.MeshLambertMaterial({ color: 0xFACC15, flatShading: true }); // Bright Brazilian Yellow Altinha ball
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(p1Pos.x, p1Pos.y + 1.2, p1Pos.z);
    altinhaGroup.add(ball);

    this.group.add(altinhaGroup);

    this.altinhaMatch = {
      p1,
      p2,
      p1Pos: p1Pos.clone(),
      p2Pos: p2Pos.clone(),
      p1Torso,
      p2Torso,
      p1Head,
      p2Head,
      p1LegL,
      p1LegR,
      p2LegL,
      p2LegR,
      p1ArmL,
      p1ArmR,
      p2ArmL,
      p2ArmR,
      ball,
      progress: 0.0,
      direction: 1, // 1: p1 -> p2, -1: p2 -> p1
      arcHeight: 2.3,
      lateralDrift: 0.0,
      touchType: 'foot_r',
      rally: 0
    };
  },

  // Efeitos visuais e partículas temáticas para as barracas da praia (Coco, Mate, Açaí, Petiscos + Moedinha)
  spawnBeachStallParticles(stallId, pos) {
    if (this.particles.length > 45) return;
    const px = pos.x;
    const py = pos.y + 1.0;
    const pz = pos.z;

    // 1. Gotículas temáticas de cada produto
    const count = 5;
    for (let i = 0; i < count; i++) {
      let mat = this.stallMatCoco;
      let vy = 1.6 + Math.random() * 1.4;
      let grav = 2.0;

      if (stallId === 'mate') {
        mat = Math.random() < 0.65 ? this.stallMatMate : this.stallMatLemon;
      } else if (stallId === 'acai') {
        mat = this.stallMatAcai;
        vy = 1.8 + Math.random() * 1.2;
      } else if (stallId === 'petiscos') {
        mat = this.stallMatSteam;
        vy = 0.8 + Math.random() * 0.6; // vapor suave
        grav = -0.15; // empuxo térmico
      }

      const pMesh = new THREE.Mesh(this.stallDropletGeo, mat);
      pMesh.position.set(
        px + (Math.random() - 0.5) * 0.8,
        py + Math.random() * 0.4,
        pz + (Math.random() - 0.5) * 0.8
      );
      this.group.add(pMesh);
      this.particles.push({
        mesh: pMesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.9,
          vy,
          (Math.random() - 0.5) * 0.9
        ),
        gravity: grav,
        life: 1.0,
        maxLife: 1.0
      });
    }

    // 2. Centelha Econômica Flutuante "+$" (Feedback visual lúdico da venda!)
    const coinMesh = new THREE.Mesh(this.stallCoinGeo, this.stallMatCoin);
    coinMesh.position.set(px, py + 0.5, pz);
    this.group.add(coinMesh);
    this.particles.push({
      mesh: coinMesh,
      vel: new THREE.Vector3(0, 0.95, 0),
      gravity: 0,
      life: 1.2,
      maxLife: 1.2,
      isCoin: true
    });
  }
};
