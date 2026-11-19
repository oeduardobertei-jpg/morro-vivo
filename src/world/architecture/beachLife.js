import * as THREE from 'three';
import { createStylizedFigure } from '../npcs/population.js';

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

    // Western boardwalk: conecta da orla (z: 20.4) exatamente até a cabeceira de pedra e rampa do Píer (x: -78, z: 61.2)
    addPlankRun({ x: -78, z: 20.4 }, { x: -78, z: 61.2 }, 3.2, 0.8);

    // Eastern boardwalk: starts at z: 20.4 down to altinha & leisure zone (x: 55, z: 66)
    addPlankRun({ x: 55, z: 20.4 }, { x: 55, z: 66 }, 2.8, 0.8);

    // Passarela central ligando as 4 barracas históricas do centro (z: 47.0, de X = -78 a X = 55)
    addPlankRun({ x: -78, z: 47.0 }, { x: 55, z: 47.0 }, 2.6, 0.85);

    // Rampas rústicas curtas e orgânicas de acesso às barracas das enseadas Oeste e Leste
    // (Deixando a faixa de areia livre e natural sem grade matemática de tábuas!)
    addPlankRun({ x: -222, z: 20.4 }, { x: -215, z: 41.5 }, 2.2, 0.9);
    addPlankRun({ x: -162, z: 20.4 }, { x: -155, z: 41.5 }, 2.2, 0.9);
    addPlankRun({ x: 154,  z: 20.4 }, { x: 160,  z: 41.5 }, 2.2, 0.9);
    addPlankRun({ x: 218,  z: 20.4 }, { x: 225,  z: 41.5 }, 2.2, 0.9);

    this.group.add(boardwalkGroup);
  },

  // 2. BARRACAS TRADICIONAIS DA PRAIA (Beach Stalls — Orla Central + Expansão Oeste & Leste)
  createBeachStalls() {
    this.beachStalls = [
      {
        id: 'caldo',
        name: 'Barraca do Caldo de Cana & Pastel',
        x: -215,
        z: 44.0,
        colorA: 0x15803D,
        colorB: 0xFEF08A,
        icon: '🎋',
        product: 'Caldo de Cana com Limão & Pastel',
        customerSpot: new THREE.Vector3(-215, 0, 46.2),
        vendorSpot: new THREE.Vector3(-215, 0, 42.8)
      },
      {
        id: 'caipirinha',
        name: 'Barraca Tropical do Poente',
        x: -155,
        z: 44.0,
        colorA: 0x0284C7,
        colorB: 0xFDE047,
        icon: '🍹',
        product: 'Água de Coco & Suco de Abacaxi com Hortelã',
        customerSpot: new THREE.Vector3(-155, 0, 46.2),
        vendorSpot: new THREE.Vector3(-155, 0, 42.8)
      },
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
      },
      {
        id: 'milho',
        name: 'Barraca do Milho Verde & Coco',
        x: 160,
        z: 44.0,
        colorA: 0xEA580C,
        colorB: 0xFEF08A,
        icon: '🌽',
        product: 'Milho Verde Cozido na Manteiga & Coco',
        customerSpot: new THREE.Vector3(160, 0, 46.2),
        vendorSpot: new THREE.Vector3(160, 0, 42.8)
      },
      {
        id: 'sorvete',
        name: 'Barraca de Picolé & Açaí do Levante',
        x: 225,
        z: 44.0,
        colorA: 0x0D9488,
        colorB: 0xFFFFFF,
        icon: '🍦',
        product: 'Picolé Artesanal de Frutas Tropicais',
        customerSpot: new THREE.Vector3(225, 0, 46.2),
        vendorSpot: new THREE.Vector3(225, 0, 42.8)
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
      if (st.id === 'coco' || st.id === 'caldo') {
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
      } else if (st.id === 'mate' || st.id === 'caipirinha') {
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
      } else if (st.id === 'acai' || st.id === 'sorvete') {
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
      } else if (st.id === 'petiscos' || st.id === 'milho') {
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
      this.propObstacles = this.propObstacles || [];
      this.propObstacles.push({ x: st.x, z: st.z, r: 2.35 });
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
    // Strictly AWAY from all boardwalk entrances!
    const kioskLocations = [
      { x: -235, z: 23.5, roofColor: 0x10B981, name: 'Quiosque Brisa do Poente' },
      { x: -172, z: 23.5, roofColor: 0xF97316, name: 'Quiosque Pôr do Sol' },
      { x: -118, z: 23.5, roofColor: 0x06B6D4, name: 'Quiosque Farol Velho' },
      { x: -48,  z: 23.5, roofColor: 0xD4A373, name: 'Quiosque da Praia da Prainha' },
      { x: -22,  z: 24.0, roofColor: 0x38BDF8, name: 'Quiosque Onda Azul' },
      { x: 24,   z: 24.0, roofColor: 0xFACC15, name: 'Quiosque Sol Carioca' },
      { x: 76,   z: 22.5, roofColor: 0xFB923C, name: 'Quiosque Vista da Várzea' },
      { x: 152,  z: 23.5, roofColor: 0x38BDF8, name: 'Quiosque Recanto do Surfe' },
      { x: 208,  z: 23.5, roofColor: 0xEAB308, name: 'Quiosque Maré Mansa' },
      { x: 265,  z: 23.5, roofColor: 0xEC4899, name: 'Quiosque Mirante do Levante' }
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
      this.propObstacles = this.propObstacles || [];
      this.propObstacles.push({ x: loc.x, z: loc.z, r: 2.3 });
    });

    this.group.add(kioskGroup);
  },

  // 3. GUARDA-SÓIS, CADEIRAS DE PRAIA INTERATIVAS & RODINHAS DE LUAU (Dynamic Umbrellas, Chairs & Bonfires)
  createBeachLeisureZones() {
    this.beachUmbrellas = [];
    this.beachChairSpots = [];
    const leisureGroup = new THREE.Group();

    // Agrupamentos orgânicos de guarda-sóis + 2 cadeiras reclináveis + cooler + canga (Sem linhas retas matemáticas!)
    const stations = [
      // Bolsões Orgânicos da Enseada do Poente (Oeste: profundidades e distâncias variadas entre z: 31 e z: 63)
      { x: -258, z: 41, colorA: 0x2A9D8F, colorB: 0xFFFFFF },
      { x: -246, z: 57, colorA: 0x0284C7, colorB: 0xFDE047 },
      { x: -224, z: 51, colorA: 0xF97316, colorB: 0xFDE047 },
      { x: -206, z: 34, colorA: 0x2A75D3, colorB: 0xFFFFFF },
      { x: -194, z: 61, colorA: 0x10B981, colorB: 0xFDE047 },
      { x: -178, z: 46, colorA: 0xE76F51, colorB: 0xFFFFFF },
      { x: -162, z: 56, colorA: 0x2A75D3, colorB: 0xFFFFFF },
      { x: -146, z: 33, colorA: 0x06B6D4, colorB: 0xFFFFFF },
      { x: -134, z: 59, colorA: 0xF97316, colorB: 0xFDE047 },
      { x: -121, z: 39, colorA: 0x10B981, colorB: 0xFDE047 },

      // Faixa Superior / Média da Areia — Orla Central (z: 33..40)
      { x: -54, z: 35, colorA: 0x2A75D3, colorB: 0xFFFFFF },
      { x: -44, z: 38, colorA: 0xE76F51, colorB: 0xFDE047 },
      { x: -32, z: 34, colorA: 0x2A9D8F, colorB: 0xF97316 },
      { x: -20, z: 36, colorA: 0xF43F5E, colorB: 0xFFFFFF },
      { x: -6,  z: 35, colorA: 0x2A9D8F, colorB: 0xFFFFFF },
      { x: 12,  z: 36, colorA: 0x2A75D3, colorB: 0xFDE047 },
      { x: 28,  z: 35, colorA: 0xF97316, colorB: 0xFFFFFF },
      { x: 40,  z: 36, colorA: 0x8B5CF6, colorB: 0xFDE047 },

      // Faixa Inferior da Areia — Próxima à Beira d'Água Central (z: 52..64)
      { x: -64, z: 55, colorA: 0x06B6D4, colorB: 0xFFFFFF },
      { x: -50, z: 58, colorA: 0x2A75D3, colorB: 0xFDE047 },
      { x: -28, z: 54, colorA: 0xE76F51, colorB: 0xFFFFFF },
      { x: -22, z: 62, colorA: 0x10B981, colorB: 0xFDE047 },
      { x: -12, z: 55, colorA: 0x06B6D4, colorB: 0xFDE047 },
      { x: -4,  z: 63, colorA: 0xF43F5E, colorB: 0xFFFFFF },
      { x: 15,  z: 55, colorA: 0xE76F51, colorB: 0xFDE047 },
      { x: 22,  z: 63, colorA: 0x2A75D3, colorB: 0xFFFFFF },
      { x: 31,  z: 53, colorA: 0xF97316, colorB: 0xFDE047 },
      { x: 49,  z: 62, colorA: 0x2A9D8F, colorB: 0xFFFFFF },
      { x: 63,  z: 58, colorA: 0xF43F5E, colorB: 0xFDE047 },
      { x: 84,  z: 58, colorA: 0x0284C7, colorB: 0xFFFFFF },

      // Bolsões Orgânicos da Praia do Levante (Leste: profundidades e distâncias variadas entre z: 32 e z: 63)
      { x: 118, z: 52, colorA: 0x2A9D8F, colorB: 0xFDE047 },
      { x: 148, z: 34, colorA: 0xE76F51, colorB: 0xFDE047 },
      { x: 156, z: 58, colorA: 0x2A75D3, colorB: 0xFFFFFF },
      { x: 172, z: 49, colorA: 0xF43F5E, colorB: 0xFDE047 },
      { x: 186, z: 36, colorA: 0x2A9D8F, colorB: 0xFFFFFF },
      { x: 201, z: 61, colorA: 0x06B6D4, colorB: 0xFFFFFF },
      { x: 216, z: 33, colorA: 0xF97316, colorB: 0xFDE047 },
      { x: 232, z: 52, colorA: 0xF97316, colorB: 0xFDE047 },
      { x: 248, z: 39, colorA: 0x2A75D3, colorB: 0xFFFFFF },
      { x: 259, z: 59, colorA: 0x10B981, colorB: 0xFFFFFF }
    ];

    const poleMat = new THREE.MeshLambertMaterial({ color: 0xD1D5DB });
    const chairAlumMat = new THREE.MeshLambertMaterial({ color: 0xCBD5E1 });
    const woodArmMat = new THREE.MeshLambertMaterial({ color: 0x8C5A32, flatShading: true });
    const coolerWhiteMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC });

    stations.forEach((st, idx) => {
      const y = this.terrain ? this.terrain.getElevation(st.x, st.z) : 0.45;
      const stationGroup = new THREE.Group();
      stationGroup.position.set(st.x, y, st.z);

      // Guarda-Sol Carioca Grande (Hastes + Gomos Listrados)
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.65, 6), poleMat);
      pole.position.y = 1.32;
      stationGroup.add(pole);

      const canopy = new THREE.Group();
      canopy.position.y = 2.45;
      canopy.rotation.x = 0.08;

      for (let s = 0; s < 8; s++) {
        const segGeo = new THREE.ConeGeometry(2.15, 0.78, 4);
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

      // Mesinha baixa / Cooler térmico entre as duas cadeiras
      const coolerMat = new THREE.MeshLambertMaterial({ color: st.colorA, flatShading: true });
      const cooler = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.34), coolerMat);
      cooler.position.set(0, 0.16, 0.42);
      stationGroup.add(cooler);
      const coolerLid = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.06, 0.36), coolerWhiteMat);
      coolerLid.position.set(0, 0.34, 0.42);
      stationGroup.add(coolerLid);

      // 2 Cadeiras de Praia Reclináveis (com braços e encosto anatômico para os NPCs sentarem)
      [-0.84, 0.84].forEach((cx, cIdx) => {
        const chair = new THREE.Group();
        const cz = 0.48;
        const chairRotY = (cIdx === 0 ? 0.20 : -0.20);
        chair.position.set(cx, 0.12, cz);
        chair.rotation.y = chairRotY;

        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.68), chairAlumMat);
        chair.add(frame);

        const seatFabricMat = new THREE.MeshLambertMaterial({ color: cIdx === 0 ? st.colorA : st.colorB, flatShading: true });
        const seatFabric = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.07, 0.60), seatFabricMat);
        seatFabric.position.set(0, 0.02, 0.02);
        chair.add(seatFabric);

        [-0.28, 0.28].forEach(lx => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.56), chairAlumMat);
          leg.position.set(lx, -0.06, 0);
          chair.add(leg);

          const armRest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.54), woodArmMat);
          armRest.position.set(lx, 0.22, 0.02);
          chair.add(armRest);
        });

        const backMat = new THREE.MeshLambertMaterial({ color: st.colorA, flatShading: true });
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.68, 0.05), backMat);
        back.position.set(0, 0.31, -0.28);
        back.rotation.x = -0.34;
        chair.add(back);

        stationGroup.add(chair);

        const worldChairX = st.x + cx;
        const worldChairZ = st.z + cz;
        const worldChairY = this.terrain ? this.terrain.getElevation(worldChairX, worldChairZ) : y;
        this.beachChairSpots.push({
          id: `chair_${idx}_${cIdx}`,
          stationIdx: idx,
          x: worldChairX,
          y: worldChairY,
          z: worldChairZ,
          seatY: worldChairY + 0.24,
          frontX: worldChairX + Math.sin(chairRotY) * 0.72,
          frontZ: worldChairZ + Math.cos(chairRotY) * 0.72,
          rotY: chairRotY,
          isOccupied: false,
          occupant: null
        });
      });

      // Canga estampada estendida na areia ao lado do guarda-sol
      const cangaMat = new THREE.MeshLambertMaterial({ color: st.colorB, side: THREE.DoubleSide });
      const cangaBorderMat = new THREE.MeshLambertMaterial({ color: st.colorA, side: THREE.DoubleSide });
      const canga = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.90), cangaBorderMat);
      canga.rotateX(-Math.PI / 2);
      canga.position.set(0, 0.03, -0.68);
      stationGroup.add(canga);

      const cangaInner = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.68), cangaMat);
      cangaInner.rotateX(-Math.PI / 2);
      cangaInner.position.set(0, 0.035, -0.68);
      stationGroup.add(cangaInner);

      const initialActive = true;
      stationGroup.scale.set(1, 1, 1);
      stationGroup.visible = initialActive;

      leisureGroup.add(stationGroup);

      this.beachUmbrellas.push({
        group: stationGroup,
        order: idx,
        targetScale: 1.0,
        currentScale: 1.0,
        pos: { x: st.x, y, z: st.z }
      });
      this.propObstacles = this.propObstacles || [];
      this.propObstacles.push({ x: st.x, z: st.z, r: 0.72 }); // Haste central do guarda-sol e cooler
    });

    // Castelos de areia artesanais distribuídos na beira d'água (z: 66..68)
    const sandcastleMat = new THREE.MeshLambertMaterial({ color: 0xD8B365, flatShading: true });
    [-245, -180, -125, -55, -26, -9, 18, 52, 130, 185, 245].forEach((scX, scIdx) => {
      const scZ = 67.2 + (scIdx % 2) * 1.1;
      const scY = this.terrain ? this.terrain.getElevation(scX, scZ) : 0.22;
      const castle = new THREE.Group();
      castle.position.set(scX, scY, scZ);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.88, 0.42, 6), sandcastleMat);
      base.position.y = 0.21;
      castle.add(base);

      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.38, 0.58, 6), sandcastleMat);
      tower.position.y = 0.62;
      castle.add(tower);

      const flagColors = [0xEF4444, 0x3B82F6, 0x10B981, 0xF59E0B, 0xEC4899];
      const flag = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.12, 0.02),
        new THREE.MeshLambertMaterial({ color: flagColors[scIdx % flagColors.length] })
      );
      flag.position.set(0.11, 1.0, 0);
      castle.add(flag);

      leisureGroup.add(castle);
      this.propObstacles = this.propObstacles || [];
      this.propObstacles.push({ x: scX, z: scZ, r: 1.25 });
    });

    // Pranchas de Surfe e Stand-Up Paddle fincadas/apoiadas na areia próxima às ondas
    const boardColors = [0x38BDF8, 0xF43F5E, 0xFACC15, 0x10B981];
    [-255, -195, -140, -60, -16, 26, 58, 145, 200, 255].forEach((bx, bIdx) => {
      const bz = 64.5;
      const by = this.terrain ? this.terrain.getElevation(bx, bz) : 0.28;
      const boardMat = new THREE.MeshLambertMaterial({ color: boardColors[bIdx % boardColors.length], flatShading: true });
      const stripeMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
      const bGroup = new THREE.Group();
      bGroup.position.set(bx, by, bz);
      bGroup.rotation.y = (bIdx % 2 === 0 ? 0.35 : -0.35);

      const board = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 1.75), boardMat);
      board.position.set(0, 0.06, 0);
      board.rotation.x = 0.08;
      bGroup.add(board);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 1.65), stripeMat);
      stripe.position.set(0, 0.065, 0);
      stripe.rotation.x = 0.08;
      bGroup.add(stripe);

      leisureGroup.add(bGroup);
      this.propObstacles = this.propObstacles || [];
      this.propObstacles.push({ x: bx, z: bz, r: 1.15 });
    });

    this.group.add(leisureGroup);

    // 4. Rodinhas Noturnas de Luau & Fogueiras na Praia
    this.createBeachBonfireCircles();
  },

  // 4. RODINHAS NA PRAIA DE NOITE COM FOGUEIRAS (Luau & Beach Bonfire Circles)
  createBeachBonfireCircles() {
    this.beachBonfires = [];
    const bonfireRoot = new THREE.Group();

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x64748B, flatShading: true });
    const emberMat = new THREE.MeshLambertMaterial({ color: 0x451A03, flatShading: true });
    const logMat = new THREE.MeshLambertMaterial({ color: 0x5C3A21, flatShading: true });
    const benchWoodMat = new THREE.MeshLambertMaterial({ color: 0x7C5333, flatShading: true });
    const guitarBodyMat = new THREE.MeshLambertMaterial({ color: 0xB45309, flatShading: true });
    const guitarNeckMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });

    const fireOuterMat = new THREE.MeshBasicMaterial({
      color: 0xFF5500,
      transparent: true,
      opacity: 0.90
    });
    const fireInnerMat = new THREE.MeshBasicMaterial({
      color: 0xFDE047,
      transparent: true,
      opacity: 0.94
    });

    const circleConfigs = [
      { id: 'luau_far_west', x: -180.0, z: 60.5, name: 'Rodinha do Luau do Poente', cangaColor: 0xF97316 },
      { id: 'luau_west',     x: -38.0,  z: 60.5, name: 'Rodinha do Luau da Prainha', cangaColor: 0x38BDF8 },
      { id: 'luau_center',   x: 5.0,    z: 60.5, name: 'Rodinha de Violão & Fogueira da Orla', cangaColor: 0xF43F5E },
      { id: 'luau_east',     x: 42.0,   z: 60.0, name: 'Rodinha do Luau das Dunas', cangaColor: 0x10B981 },
      { id: 'luau_far_east', x: 185.0,  z: 60.5, name: 'Rodinha do Luau do Levante', cangaColor: 0x38BDF8 }
    ];

    circleConfigs.forEach((cfg, cIdx) => {
      const cy = this.terrain ? this.terrain.getElevation(cfg.x, cfg.z) : 0.34;
      const circleGroup = new THREE.Group();
      circleGroup.position.set(cfg.x, cy, cfg.z);
      this.propObstacles = this.propObstacles || [];
      this.propObstacles.push({ x: cfg.x, z: cfg.z, r: 1.38 }); // Fogueira central de pedras

      // Base circular de brasas e cinzas na areia
      const ashBed = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.10, 0.08, 8), emberMat);
      ashBed.position.y = 0.04;
      circleGroup.add(ashBed);

      // Anel de 10 pedras costeiras ao redor da fogueira
      for (let s = 0; s < 10; s++) {
        const ang = (s / 10) * Math.PI * 2;
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + (s % 2) * 0.05, 0), stoneMat);
        stone.position.set(Math.cos(ang) * 0.92, 0.14, Math.sin(ang) * 0.92);
        stone.rotation.set(s * 0.4, ang, 0);
        circleGroup.add(stone);
      }

      // Toras de lenha cruzadas no centro
      for (let l = 0; l < 4; l++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.25, 5), logMat);
        log.position.y = 0.22;
        log.rotation.z = Math.PI / 2.5;
        log.rotation.y = (l / 4) * Math.PI;
        circleGroup.add(log);
      }

      // Grupo dinâmico das chamas + luz quente noturna (aceso no pôr do sol e à noite)
      const fireGroup = new THREE.Group();
      const fireOuter = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.35, 6), fireOuterMat);
      fireOuter.position.y = 0.68;
      fireGroup.add(fireOuter);

      const fireInner = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.95, 5), fireInnerMat);
      fireInner.position.y = 0.56;
      fireGroup.add(fireInner);

      const fireLight = new THREE.PointLight(0xFF6B00, 0.0, 18.0);
      fireLight.position.set(0, 1.35, 0);
      fireGroup.add(fireLight);

      circleGroup.add(fireGroup);

      // Violão acústico apoiado junto ao tronco do músico da roda
      const guitarGroup = new THREE.Group();
      guitarGroup.position.set(1.85, 0.26, -1.15);
      guitarGroup.rotation.set(-0.35, 0.6, 0.25);
      const gBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.10, 8), guitarBodyMat);
      gBody.rotation.x = Math.PI / 2;
      guitarGroup.add(gBody);
      const gNeck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.04), guitarNeckMat);
      gNeck.position.set(0, 0.34, 0);
      guitarGroup.add(gNeck);
      circleGroup.add(guitarGroup);

      // 8 lugares na rodinha ao redor da fogueira (5 sentados em troncos/esteiras + 3 em pé batendo papo)
      const seats = [];
      const totalSlots = 8;
      for (let i = 0; i < totalSlots; i++) {
        const ang = (i / totalSlots) * Math.PI * 2 + (cIdx * 0.25);
        const isSeatedSpot = (i % 2 === 0 || i === 1); // 5 sentados, 3 de pé
        const radius = isSeatedSpot ? 2.45 : 3.05;
        const lx = Math.cos(ang) * radius;
        const lz = Math.sin(ang) * radius;
        const wx = cfg.x + lx;
        const wz = cfg.z + lz;
        const wy = this.terrain ? this.terrain.getElevation(wx, wz) : cy;
        const faceCenterRotY = Math.atan2(-lx, -lz);

        if (isSeatedSpot) {
          if (i % 4 === 0) {
            // Tronco de coqueiro rústico como banco de praia
            const logBench = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.15, 6), benchWoodMat);
            logBench.rotation.z = Math.PI / 2;
            logBench.rotation.y = faceCenterRotY;
            logBench.position.set(lx, (wy - cy) + 0.18, lz);
            circleGroup.add(logBench);
          } else {
            // Esteira / canga de praia para sentar na areia pertinho do fogo
            const matMesh = new THREE.Mesh(
              new THREE.PlaneGeometry(0.95, 0.75),
              new THREE.MeshLambertMaterial({ color: cfg.cangaColor, side: THREE.DoubleSide })
            );
            matMesh.rotateX(-Math.PI / 2);
            matMesh.rotation.z = -faceCenterRotY;
            matMesh.position.set(lx, (wy - cy) + 0.03, lz);
            circleGroup.add(matMesh);
          }
        }

        seats.push({
          slotIndex: i,
          bonfireId: cfg.id,
          bonfireName: cfg.name,
          centerX: cfg.x,
          centerZ: cfg.z,
          x: wx,
          y: wy,
          z: wz,
          seatY: isSeatedSpot ? (wy + (i % 4 === 0 ? 0.28 : 0.12)) : wy,
          rotY: faceCenterRotY,
          isSeatedSpot,
          isGuitarSpot: (i === 0),
          isOccupied: false,
          occupant: null
        });
      }

      bonfireRoot.add(circleGroup);

      this.beachBonfires.push({
        id: cfg.id,
        name: cfg.name,
        x: cfg.x,
        y: cy,
        z: cfg.z,
        group: circleGroup,
        fireGroup,
        fireOuter,
        fireInner,
        fireLight,
        seats
      });
    });

    this.group.add(bonfireRoot);
  },

  // Efeito de gotículas de água do mar quando banhistas chutam água ou nadam
  spawnWaterSplash(pos, count = 4) {
    if (!this.particles || this.particles.length > 50) return;
    if (!this.waterSplashMat) {
      this.waterSplashMat = new THREE.MeshBasicMaterial({
        color: 0xBAE6FD,
        transparent: true,
        opacity: 0.82,
        depthWrite: false
      });
    }
    const geo = this.stallDropletGeo || new THREE.DodecahedronGeometry(0.11, 0);
    for (let i = 0; i < count; i++) {
      const drop = new THREE.Mesh(geo, this.waterSplashMat);
      drop.position.set(
        pos.x + (Math.random() - 0.5) * 0.55,
        Math.max(0.05, (pos.y || 0.05) + 0.15 + Math.random() * 0.20),
        pos.z + (Math.random() - 0.5) * 0.55
      );
      drop.scale.setScalar(0.55 + Math.random() * 0.35);
      this.group.add(drop);
      const maxLife = 0.45 + Math.random() * 0.25;
      this.particles.push({
        mesh: drop,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.4,
          1.35 + Math.random() * 1.1,
          (Math.random() - 0.5) * 1.4
        ),
        gravity: 4.8,
        life: maxLife,
        maxLife
      });
    }
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
    const netWhiteMat = new THREE.MeshLambertMaterial({ color: 0xE2E8F0, transparent: true, opacity: 0.55, wireframe: true });
    const tapeBlueMat = new THREE.MeshLambertMaterial({ color: 0x1D4ED8, flatShading: true });
    const tapeRedMat = new THREE.MeshLambertMaterial({ color: 0xB91C1C, flatShading: true });
    const ballMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true });
    const thatchMat = new THREE.MeshLambertMaterial({ color: 0xB48C56, flatShading: true });
    const counterWoodMat = new THREE.MeshLambertMaterial({ color: 0x5C381E, flatShading: true });

    // Helper: Fitas de demarcação esportiva na areia (4 linhas planas e contínuas sem brilho unlit)
    const buildCourtBoundary = (w, l, mat) => {
      const g = new THREE.Group();
      const tw = 0.12;
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, tw), mat);
      top.position.set(0, 0.01, -l / 2);
      g.add(top);
      const btm = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, tw), mat);
      btm.position.set(0, 0.01, l / 2);
      g.add(btm);
      const left = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.015, l), mat);
      left.position.set(-w / 2, 0.01, 0);
      g.add(left);
      const right = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.015, l), mat);
      right.position.set(w / 2, 0.01, 0);
      g.add(right);
      return g;
    };

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

    const topTape = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.08, 0.04), new THREE.MeshLambertMaterial({ color: 0xFACC15 }));
    topTape.position.set(0, 2.12, 0);
    fvGroup.add(topTape);

    const fvBoundary = buildCourtBoundary(9.0, 16.0, tapeBlueMat);
    fvGroup.add(fvBoundary);

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

      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.8, 4), new THREE.MeshLambertMaterial({ color: 0xEF4444 }));
      antenna.position.set(px * 0.88, 2.5, 0);
      vbGroup.add(antenna);
    });

    const vbNet = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.9, 0.02), netWhiteMat);
    vbNet.position.set(0, 2.0, 0);
    vbGroup.add(vbNet);

    const vbTopTape = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.09, 0.04), new THREE.MeshLambertMaterial({ color: 0xE2E8F0 }));
    vbTopTape.position.set(0, 2.45, 0);
    vbGroup.add(vbTopTape);

    const vbBoundary = buildCourtBoundary(8.6, 16.0, tapeRedMat);
    vbGroup.add(vbBoundary);

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
        const flipFlop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.26), new THREE.MeshLambertMaterial({ color: 0x1E293B }));
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

    // Player 1 (Boardshorts, sunglasses, facing +X — Anatomia Esculpida Claude Opus)
    const p1Fig = createStylizedFigure({
      skinColor: 0x8D5524,
      pantsColor: 0x06B6D4,
      hairColor: 0x1F1917,
      bareChest: true,
      wearsShorts: true,
      hasShades: true,
      includeShoes: false
    });
    const p1 = p1Fig.group;
    p1.position.copy(p1Pos);
    p1.rotation.y = Math.PI / 2;
    const p1Torso = p1Fig.torso;
    const p1Head = p1Fig.head;
    const p1LegL = p1Fig.leftLeg;
    const p1LegR = p1Fig.rightLeg;
    const p1ArmL = p1Fig.leftArm;
    const p1ArmR = p1Fig.rightArm;
    altinhaGroup.add(p1);

    // Player 2 (Classic Sunga Carioca, sunglasses, facing -X — Anatomia Esculpida Claude Opus)
    const p2Fig = createStylizedFigure({
      skinColor: 0x70411B,
      hairColor: 0x141416,
      bareChest: true,
      bareLegs: true,
      sungaColor: 0xF43F5E,
      hasShades: true,
      includeShoes: false
    });
    const p2 = p2Fig.group;
    p2.position.copy(p2Pos);
    p2.rotation.y = -Math.PI / 2;
    const p2Torso = p2Fig.torso;
    const p2Head = p2Fig.head;
    const p2LegL = p2Fig.leftLeg;
    const p2LegR = p2Fig.rightLeg;
    const p2ArmL = p2Fig.leftArm;
    const p2ArmR = p2Fig.rightArm;
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
  },

  // Centelha Econômica para qualquer ponto de comércio ou feira da colina
  spawnCoinFeedback(pos) {
    if (!this.stallCoinGeo || !this.stallMatCoin) return;
    const coinMesh = new THREE.Mesh(this.stallCoinGeo, this.stallMatCoin);
    coinMesh.position.set(pos.x, pos.y + 0.8, pos.z);
    this.group.add(coinMesh);
    this.particles.push({
      mesh: coinMesh,
      vel: new THREE.Vector3(0, 0.95, 0),
      gravity: 0,
      life: 1.2,
      maxLife: 1.2,
      isCoin: true
    });
  },

  // =========================================================================
  // REVITALIZAÇÃO DA PRAIA SUDESTE (DECK LOUNGE, FRESCOBOL & QUEBRA-MAR COM FAROLETE)
  // =========================================================================
  createSoutheastDunesLounge() {
    const southeastGroup = new THREE.Group();

    // 1. DECK & LOUNGE DAS DUNAS (x: 86, z: 40)
    const lx = 86.0, lz = 40.0;
    const ly = this.terrain ? this.terrain.getElevation(lx, lz) : 0.55;
    const loungeGroup = new THREE.Group();
    loungeGroup.position.set(lx, ly, lz);

    const deckMat = new THREE.MeshLambertMaterial({ color: 0x8C7456, flatShading: true });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.22, 5.2), deckMat);
    deck.position.y = 0.11;
    deck.receiveShadow = true;
    loungeGroup.add(deck);

    // Pergolado de toras com teto de palha de piaçava
    const timberMat = new THREE.MeshLambertMaterial({ color: 0x5C3D28, flatShading: true });
    const thatchMat = new THREE.MeshLambertMaterial({ color: 0xB48C56, flatShading: true });
    const postGeo = new THREE.CylinderGeometry(0.08, 0.10, 2.8, 6);

    [[-2.7, -2.2], [2.7, -2.2], [-2.7, 2.2], [2.7, 2.2]].forEach(([px, pz]) => {
      const p = new THREE.Mesh(postGeo, timberMat);
      p.position.set(px, 1.4, pz);
      p.castShadow = true;
      loungeGroup.add(p);
    });

    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.1, 4), thatchMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 3.1, 0);
    loungeGroup.add(roof);

    // 3 Espreguiçadeiras de madeira com almofadas listradas
    const loungerMat = new THREE.MeshLambertMaterial({ color: 0x6D4C41 });
    const cushionColors = [0x06B6D4, 0xF97316, 0x10B981];
    [-1.8, 0, 1.8].forEach((lxPos, idx) => {
      const lounger = new THREE.Group();
      lounger.position.set(lxPos, 0.18, 0.4);
      lounger.rotation.y = 0.15;

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.15, 1.8), loungerMat);
      lounger.add(base);

      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.08, 1.7), new THREE.MeshLambertMaterial({ color: cushionColors[idx] }));
      cushion.position.y = 0.11;
      lounger.add(cushion);

      // Encosto reclinado
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.08, 0.65), new THREE.MeshLambertMaterial({ color: cushionColors[idx] }));
      back.position.set(0, 0.32, -0.65);
      back.rotation.x = -0.55;
      lounger.add(back);

      loungeGroup.add(lounger);
    });

    // Mesinha de apoio com cocos gelados
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.40, 0.45, 8), timberMat);
    table.position.set(0, 0.33, -1.5);
    loungeGroup.add(table);

    const cocoMat = new THREE.MeshLambertMaterial({ color: 0x2D6A4F });
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), cocoMat);
    coco.position.set(0, 0.62, -1.5);
    loungeGroup.add(coco);

    southeastGroup.add(loungeGroup);

    // 2. ARENA DE FRESCOBOL CARIOCA (x: 96, z: 54)
    const fx = 96.0, fz = 54.0;
    const fy = this.terrain ? this.terrain.getElevation(fx, fz) : 0.35;
    const frescobolGroup = new THREE.Group();
    frescobolGroup.position.set(fx, fy, fz);

    // Linha divisória de fita na areia (MeshLambertMaterial: iluminação natural dia/noite)
    const fbTapeMat = new THREE.MeshLambertMaterial({ color: 0xD97706, flatShading: true });
    const tw = 0.10;
    const fbTop = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.015, tw), fbTapeMat);
    fbTop.position.set(0, 0.01, -5.0);
    frescobolGroup.add(fbTop);
    const fbBtm = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.015, tw), fbTapeMat);
    fbBtm.position.set(0, 0.01, 5.0);
    frescobolGroup.add(fbBtm);
    const fbLeft = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.015, 10.0), fbTapeMat);
    fbLeft.position.set(-3.0, 0.01, 0);
    frescobolGroup.add(fbLeft);
    const fbRight = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.015, 10.0), fbTapeMat);
    fbRight.position.set(3.0, 0.01, 0);
    frescobolGroup.add(fbRight);

    // Dois atletas jogando Frescobol com anatomia esculpida Claude Opus
    const paddleMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: false });
    const ballMat = new THREE.MeshLambertMaterial({ color: 0xF97316, flatShading: false });

    // Player 1 (x: 0, z: -3.5)
    const fb1 = createStylizedFigure({
      skinColor: 0xA06236,
      pantsColor: 0x2563EB,
      hairColor: 0x2D1E18,
      bareChest: true,
      wearsShorts: true,
      hasShades: true,
      includeShoes: false
    });
    const p1 = fb1.group;
    p1.position.set(0, 0, -3.5);
    const p1Paddle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), paddleMat);
    p1Paddle.position.set(0.32, 0.95, 0.35);
    p1Paddle.rotation.x = Math.PI / 2;
    p1.add(p1Paddle);
    frescobolGroup.add(p1);

    // Player 2 (x: 0, z: 3.5)
    const fb2 = createStylizedFigure({
      skinColor: 0xC68642,
      shirtColor: 0xDC2626,
      pantsColor: 0xDC2626,
      hairColor: 0x1F1917,
      isFemale: true,
      wearsShorts: true,
      hasShades: true,
      includeShoes: false
    });
    const p2 = fb2.group;
    p2.position.set(0, 0, 3.5);
    p2.rotation.y = Math.PI;
    const p2Paddle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), paddleMat);
    p2Paddle.position.set(0.32, 0.95, 0.35);
    p2Paddle.rotation.x = Math.PI / 2;
    p2.add(p2Paddle);
    frescobolGroup.add(p2);

    // Bolinha de Frescobol laranja
    const frescoball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), ballMat);
    frescoball.position.set(0, 1.1, 0);
    frescobolGroup.add(frescoball);

    // Cooler / Caixa térmica de bebidas
    const cooler = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.45), new THREE.MeshLambertMaterial({ color: 0x0284C7 }));
    cooler.position.set(2.2, 0.22, 0);
    frescobolGroup.add(cooler);

    southeastGroup.add(frescobolGroup);

    this.frescobolMatch = {
      p1,
      p2,
      ball: frescoball,
      progress: 0.0,
      direction: 1
    };

    // 3. QUEBRA-MAR DE PEDRA & FAROLETE SOLAR (x: 108, z: 66)
    const bx = 108.0, bz = 66.0;
    const by = this.terrain ? this.terrain.getElevation(bx, bz) : 0.25;
    const breakwaterGroup = new THREE.Group();
    breakwaterGroup.position.set(bx, by, bz);

    // Grandes blocos de granito sobrepostos formando o quebra-mar
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
    for (let r = 0; r < 8; r++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.2 + Math.random() * 0.6, 0),
        rockMat
      );
      rock.position.set((r - 3.5) * 1.5, 0.6 + Math.sin(r * 0.8) * 0.2, (r - 3.5) * 0.8);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.receiveShadow = true;
      breakwaterGroup.add(rock);
    }

    // Farolete solar verde na ponta mais avançada do quebra-mar
    const beaconPostMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC });
    const beaconPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 3.4, 6), beaconPostMat);
    beaconPost.position.set(3.2, 1.7, 2.0);
    beaconPost.castShadow = true;
    breakwaterGroup.add(beaconPost);

    // Luz de sinalização marítima verde
    const beaconGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.35, 8),
      new THREE.MeshBasicMaterial({ color: 0x22C55E })
    );
    beaconGlass.position.set(3.2, 3.45, 2.0);
    breakwaterGroup.add(beaconGlass);

    const greenLight = new THREE.PointLight(0x22C55E, 1.5, 18);
    greenLight.position.set(3.2, 3.5, 2.0);
    breakwaterGroup.add(greenLight);

    southeastGroup.add(breakwaterGroup);

    this.group.add(southeastGroup);
  }
};
