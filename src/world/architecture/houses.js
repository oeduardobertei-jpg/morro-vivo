import * as THREE from 'three';

/** Casas, construção, upgrades e lajes. */
export const HousesMixin = {
  createInitialSettlements(plateaus, savedHouses = null) {
    this.allPlateaus = plateaus;

    // Clear any previous houses if resetting or loading
    this.clearHouses();

    // 1. CHOCQUE DE ORDEM URBANA: Construir Infraestrutura PRIMEIRO!
    if (!this.infrastructureCreated) {
      this.createContinentalRoadNetwork();
      this.createAlamedaDoSamba();
      this.createBotecoPockets();
      this.createEstradasDeLajes();
      this.createLighthouse({ x: -95, z: 50 });
      this.createFishingPier({ x: -78, z: 74 });
      this.createBeachBoardwalks();
      this.createBeachStalls();
      this.createBeachLeisureZones();
      this.createAltinhaDuo();
      this.createBeachPalms();
      this.createBeachfrontKiosks();
      this.createBeachLifeEdges();
      this.createSambaPlaza({ x: -2, z: -4 });
      this.createSoccerField({ x: 55, z: 4 });
      this.createBrickOlaria({ x: -22, z: -14 });
      this.createAgroforestFarm({ x: 82, z: -8 });
      this.createCulturalMarket({ x: 75, z: 4 });
      this.createSolarPark({ x: -18, z: -72 });
      this.createHighlandLandmarks();
      this.createWestPioneerCove({ x: -95, z: 0 });
      this.createMiranteDoPoente({ x: -98, z: -55 });
      this.createGrandeOlariaCeramica({ x: 95, z: -18 });
      this.createMiranteDoLevante({ x: 98, z: -55 });
      this.createTorreDeRadioCume({ x: 0, z: -104 });
      this.createSolarLamps();
      this.createMataAtlanticaBorders();
      this.infrastructureCreated = true;
    }

    if (savedHouses && savedHouses.length > 0) {
      // Rehydrate faithfully from Save Data, filtering out any obsolete houses inside the Mirante, Solar zone, or any Landmark footprint!
      const sanitizedHouses = savedHouses.filter(sh => {
        const inMirante = Math.abs(sh.x - 50) <= 25 && sh.z <= -95;
        const inCampinho = Math.abs(sh.x - 55) <= 16 && Math.abs(sh.z - 4) <= 12;
        const inMercado = Math.abs(sh.x - 75) <= 11 && Math.abs(sh.z - 4) <= 9;
        const inAgro = Math.abs(sh.x - 82) <= 15 && Math.abs(sh.z - -8) <= 12;
        const inOlaria = Math.abs(sh.x - -22) <= 11 && Math.abs(sh.z - -14) <= 9;
        const inSamba = Math.hypot(sh.x - (-2), sh.z - (-4)) <= 15.0; // Preservação Estrita da Praça do Samba!
        const inNascente = Math.abs(sh.x - -8) <= 12 && Math.abs(sh.z - -65) <= 12;

        let inInfra = false;
        if (this.infrastructureNodes) {
          // Retroactively demolish houses intersecting infrastructure
          inInfra = this.infrastructureNodes.some(node => Math.hypot(node.x - sh.x, node.z - sh.z) < 4.5);
        }

        return !(inMirante || inCampinho || inMercado || inAgro || inOlaria || inSamba || inNascente || inInfra);
      });
      const seenIds = new Set();
      const placedHouses = [];
      sanitizedHouses.forEach((sh, idx) => {
        if (seenIds.has(sh.id)) return;
        
        // Estrita colisão 2D para impedir casas de nascerem fundidas umas nas outras
        const tooClose = placedHouses.some(ph => Math.hypot(ph.x - sh.x, ph.z - sh.z) < 5.5);
        if (tooClose) return;

        seenIds.add(sh.id);
        placedHouses.push(sh);

        const plat = plateaus.find(p => p.id === sh.id) || {
          id: sh.id,
          faction: sh.faction || 'sol',
          order: idx,
          x: sh.x,
          y: sh.y,
          z: sh.z
        };
        const paletteItem = this.palette.find(p => p.name === sh.colorName) || this.palette[idx % this.palette.length];
        const house = this.buildHouse(plat, sh.level || 1, paletteItem);
        if (house) {
          if (sh.wealth) house.wealth = sh.wealth;
          if (sh.residents) house.residents = sh.residents;
          this.houses.push(house);
        }
      });
    } else {
      // New World: ONLY spawn the humble founding starter nuclei (8 houses total)!
      const starters = plateaus.filter(p => p.isStarter);
      starters.forEach((plat, idx) => {
        const paletteItem = this.palette[idx % this.palette.length];
        const house = this.buildHouse(plat, 1, paletteItem);
        if (house) this.houses.push(house);
      });
    }

    // 36 NÚCLEOS PIONEIROS DA ÁREA VERMELHA (12 Oeste, 12 Leste, 12 Cume Profundo)
    // Garantem vida imediata e ocupação orgânica dos confins territoriais no save Dia 673 e em novos jogos
    const continentalFrontierPioneers = [
      // 1. Distrito Poente & Falésias do Farol (12 casas no Flanco Oeste: X <= -45)
      { x: -135, z: 6, faction: 'prainha', level: 1 },
      { x: -125, z: -20, faction: 'prainha', level: 2 },
      { x: -135, z: -75, faction: 'prainha', level: 1 },
      { x: -115, z: -35, faction: 'prainha', level: 2 },
      { x: -105, z: -15, faction: 'prainha', level: 1 },
      { x: -95,  z: -40, faction: 'prainha', level: 2 },
      { x: -92,  z: -72, faction: 'prainha', level: 1 },
      { x: -80,  z: -88, faction: 'prainha', level: 1 },
      { x: -70,  z: -72, faction: 'prainha', level: 2 },
      { x: -65,  z: -38, faction: 'prainha', level: 1 },
      { x: -55,  z: -15, faction: 'prainha', level: 2 },
      { x: -48,  z: -68, faction: 'prainha', level: 1 },

      // 2. Distrito Levante & Vale Verde (12 casas no Flanco Leste: X >= 45)
      { x: 135, z: 6, faction: 'varzea', level: 1 },
      { x: 125, z: -20, faction: 'varzea', level: 2 },
      { x: 135, z: -75, faction: 'varzea', level: 1 },
      { x: 115, z: -35, faction: 'varzea', level: 2 },
      { x: 105, z: -15, faction: 'varzea', level: 1 },
      { x: 95,  z: -40, faction: 'varzea', level: 2 },
      { x: 92,  z: -72, faction: 'varzea', level: 1 },
      { x: 80,  z: -88, faction: 'varzea', level: 1 },
      { x: 70,  z: -72, faction: 'varzea', level: 2 },
      { x: 65,  z: -38, faction: 'varzea', level: 1 },
      { x: 55,  z: -15, faction: 'varzea', level: 2 },
      { x: 48,  z: -68, faction: 'varzea', level: 1 },

      // 3. Distrito Cume & Crista das Alturas (12 casas na Crista Norte Profunda: Z <= -115 ou Flancos Exteriores)
      { x: 0,   z: -130, faction: 'serra', level: 1 },
      { x: -28, z: -115, faction: 'serra', level: 2 },
      { x: 28,  z: -115, faction: 'serra', level: 2 },
      { x: -45, z: -125, faction: 'serra', level: 1 },
      { x: 45,  z: -125, faction: 'serra', level: 1 },
      { x: -20, z: -130, faction: 'serra', level: 1 },
      { x: 20,  z: -130, faction: 'serra', level: 1 },
      { x: -35, z: -132, faction: 'serra', level: 2 },
      { x: 35,  z: -132, faction: 'serra', level: 2 },
      { x: -50, z: -118, faction: 'serra', level: 1 },
      { x: 50,  z: -118, faction: 'serra', level: 1 },
      { x: 0,   z: -122, faction: 'serra', level: 2 }
    ];

    continentalFrontierPioneers.forEach((fp, i) => {
      // Check if any existing house is already near this pioneer lot (< 10 meters)
      const hasCloseHouse = this.houses.some(h => Math.hypot(h.position.x - fp.x, h.position.z - fp.z) < 10.0);
      if (!hasCloseHouse) {
        const plat = plateaus.find(p => Math.hypot(p.x - fp.x, p.z - fp.z) < 5.0) || {
          id: `frontier_${fp.faction}_${i + 1}`,
          faction: fp.faction,
          order: i,
          x: fp.x,
          y: this.terrain ? this.terrain.getElevation(fp.x, fp.z) : 4.0,
          z: fp.z
        };
        const paletteItem = this.palette[(i * 3 + 2) % this.palette.length];
        const house = this.buildHouse(plat, fp.level || 1, paletteItem);
        if (house) {
          house.residents = fp.level === 2 ? 6 : 4;
          house.wealth = fp.level === 2 ? 250 : 150;
          this.houses.push(house);
        }
      }
    });

    // Infraestrutura já foi criada no início da função!
  },

  clearHouses() {
    this.houses.forEach(h => {
      this.group.remove(h.meshGroup);
    });
    this.houses = [];
    this.windowMeshes = [];
    this.lajeBBQs = [];

    // Clear any ongoing construction sites and release workers
    this.activeConstructions.forEach(c => {
      this.group.remove(c.siteGroup);
      if (c.workers && this.npcManager) {
        c.workers.forEach(w => this.npcManager.releaseWorker(w));
      }
    });
    this.activeConstructions = [];

    // Clear any ongoing upgrades and release workers
    this.activeUpgrades.forEach(u => {
      this.group.remove(u.scaffoldGroup);
      if (u.workers && this.npcManager) {
        u.workers.forEach(w => this.npcManager.releaseWorker(w));
      }
    });
    this.activeUpgrades = [];
  },

  // ALGORITMO DE EXPANSÃO TERRITORIAL ORGÂNICA (A GRANDE FRONTEIRA DA ÁREA VERMELHA)
  // Direciona 85% de todas as novas licenças e mutirões de construção para a área demarcada
  // (Flanco Oeste: X <= -38 | Flanco Leste: X >= 38 | Crista do Cume: Z <= -48)
  // com saturação do Morro do Sol (Centro) para nunca mais superlotar o centro!
  selectExpansionPlateau(preferredFaction = null) {
    const builtIds = new Set(this.houses.map(h => h.id));
    const constructingIds = new Set(this.activeConstructions.map(c => c.id));

    // Todos os lotes vagos disponíveis (Preservação estrita do Mirante Imperial e Parque Solar!)
    const available = this.allPlateaus.filter(p => {
      if (builtIds.has(p.id) || constructingIds.has(p.id)) return false;
      // Zonas de Preservação Turística & Monumentos: nenhuma casa no Mirante, Parque Solar ou cima de estruturas especiais!
      const inMirante = Math.abs(p.x - 50) <= 25 && p.z <= -95;
      const inCampinho = Math.abs(p.x - 55) <= 15 && Math.abs(p.z - 4) <= 10;
      const inMercado = Math.abs(p.x - 75) <= 10 && Math.abs(p.z - 4) <= 8;
      const inAgro = Math.abs(p.x - 82) <= 11 && Math.abs(p.z - -8) <= 8;
      const inOlaria = Math.abs(p.x - -22) <= 10 && Math.abs(p.z - -14) <= 8;
      const inSamba = Math.hypot(p.x - (-2), p.z - (-4)) <= 15.0; // Preservação Estrita: nenhuma obra dentro de 15m do samba!
      
      if (inMirante || inCampinho || inMercado || inAgro || inOlaria || inSamba) return false;

      // Prevent physical overlap (strict 2D collision detection for dynamic spawning)
      const tooClose = this.houses.some(h => Math.hypot(h.position.x - p.x, h.position.z - p.z) < 5.5);
      const tooCloseActive = this.activeConstructions.some(c => Math.hypot(c.plateau.x - p.x, c.plateau.z - p.z) < 5.5);
      if (tooClose || tooCloseActive) return false;

      // Respeito à Natureza: Prevenir construção sobre árvores e grandes rochas
      if (this.natureObstacles) {
        const hitsNature = this.natureObstacles.some(n => Math.hypot(n.x - p.x, n.z - p.z) < n.radius);
        if (hitsNature) return false;
      }

      // Respeito à Infraestrutura Pública: Prevenir casas invadindo e bloqueando vielas e ruas de laje
      if (this.infrastructureNodes) {
        const blocksStreet = this.infrastructureNodes.some(node => Math.hypot(node.x - p.x, node.z - p.z) < 4.0);
        if (blocksStreet) return false;
      }

      return true;
    });
    if (available.length === 0) return null;

    // Checagem de saturação do centro histórico (Morro do Sol: |X| < 35 e Z > -45)
    const centerBuiltCount = this.houses.filter(h => Math.abs(h.position.x) < 35 && h.position.z > -45).length;
    const centerIsSaturated = centerBuiltCount >= 14;

    // Lotes da Grande Fronteira (Área Vermelha):
    // 1. Oeste (Prainha e Poente: X <= -38)
    // 2. Leste (Várzea e Levante: X >= 38)
    // 3. Cume e Serra Superior (Z <= -48)
    const frontierCandidates = available.filter(c => Math.abs(c.x) >= 38 || c.z <= -48);

    // Se o centro já estiver consolidado OU 85% das vezes quando houver lotes na fronteira:
    if (frontierCandidates.length > 0 && (centerIsSaturated || Math.random() < 0.85)) {
      let filteredFrontier = frontierCandidates;
      if (preferredFaction && preferredFaction !== 'sol') {
        const districtFrontier = frontierCandidates.filter(c => c.faction === preferredFaction);
        if (districtFrontier.length > 0) filteredFrontier = districtFrontier;
      }
      return filteredFrontier[Math.floor(Math.random() * filteredFrontier.length)];
    }

    // Se o centro não estiver saturado, permite crescimento local/infill (15% das vezes)
    let candidates = available;
    if (preferredFaction && (!centerIsSaturated || preferredFaction !== 'sol')) {
      const factionCandidates = candidates.filter(p => p.faction === preferredFaction);
      if (factionCandidates.length > 0) candidates = factionCandidates;
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  },

  // Spawns a new house with dynamic visual construction & terrain terraforming
  spawnNewHouse(preferredFaction = null, onComplete = null, specificPlateau = null) {
    const bestCandidate = specificPlateau || this.selectExpansionPlateau(preferredFaction);
    if (!bestCandidate) return null;

    const paletteItem = this.palette[this.houses.length % this.palette.length];

    // Start Visual Construction & Terraforming project!
    this.startHouseConstruction(bestCandidate, paletteItem, onComplete);

    return { id: bestCandidate.id, faction: bestCandidate.faction, isConstructing: true };
  },

  // VISUAL TERRAIN TERRAFORMING & STEP-BY-STEP CONSTRUCTION BY REAL CITIZEN BUILDERS
  startHouseConstruction(plateau, paletteItem, onComplete = null) {
    const siteGroup = new THREE.Group();
    const groundY = this.terrain ? this.terrain.getElevation(plateau.x, plateau.z) : plateau.y;
    siteGroup.position.set(plateau.x, groundY, plateau.z);

    // 1. Survey Stakes & Demarcation Flags (Piquetes de topografia e fita de demarcação de lote)
    const stakeMat = new THREE.MeshLambertMaterial({ color: 0x8C7456, flatShading: true });
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xFACC15 });
    const corners = [
      { x: -2.2, z: -2.0 }, { x: 2.2, z: -2.0 },
      { x: -2.2, z: 2.0 },  { x: 2.2, z: 2.0 }
    ];
    corners.forEach(c => {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 4), stakeMat);
      stake.position.set(c.x, 0.5, c.z);
      siteGroup.add(stake);

      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.02), flagMat);
      flag.position.set(c.x + 0.12, 0.95, c.z);
      siteGroup.add(flag);
    });

    // 2. Construction Logistics: Stacks of Red Clay Bricks & Cement Bags (Delivered by pushcart courier)
    const brickMat = new THREE.MeshLambertMaterial({ color: 0xB55338, flatShading: true });
    const brickStack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.7), brickMat);
    brickStack.position.set(-1.4, 0.35, 1.4);
    brickStack.visible = false; // Hidden until courier delivers them!
    siteGroup.add(brickStack);

    const cementMat = new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: true });
    const cementBags = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.55), cementMat);
    cementBags.position.set(1.4, 0.25, 1.4);
    cementBags.visible = false; // Hidden until courier delivers them!
    siteGroup.add(cementBags);

    // 3. Excavation Pad / Muro de Arrimo de Terraplanagem (emerges as workers mold terrain)
    const padMat = new THREE.MeshLambertMaterial({ color: 0x5C5348, flatShading: true });
    const padGeo = new THREE.BoxGeometry(4.4, 0.4, 4.0);
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.y = 0.2;
    padMesh.scale.set(0.01, 0.01, 0.01);
    padMesh.receiveShadow = true;
    siteGroup.add(padMesh);

    // 4. Wooden Scaffolding Poles (Andaimes de Obra - appears during scaffolding phase)
    const scaffoldGroup = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8C7456, flatShading: true });
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.6, 4);
    corners.forEach(c => {
      const pole = new THREE.Mesh(poleGeo, woodMat);
      pole.position.set(c.x, 1.8, c.z);
      scaffoldGroup.add(pole);
    });

    const plankGeo = new THREE.BoxGeometry(4.8, 0.08, 0.25);
    const plank1 = new THREE.Mesh(plankGeo, woodMat);
    plank1.position.set(0, 1.4, -2.0);
    scaffoldGroup.add(plank1);
    const plank2 = new THREE.Mesh(plankGeo, woodMat);
    plank2.position.set(0, 1.4, 2.0);
    scaffoldGroup.add(plank2);

    scaffoldGroup.visible = false;
    scaffoldGroup.scale.set(1, 0.01, 1);
    siteGroup.add(scaffoldGroup);

    // 5. Emerging House Preview (scales up during masonry phase)
    const housePreviewGroup = new THREE.Group();
    const tempBody = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 2.5, 3.5),
      new THREE.MeshLambertMaterial({ color: paletteItem.color, flatShading: true })
    );
    tempBody.position.y = 1.25;
    housePreviewGroup.add(tempBody);
    housePreviewGroup.visible = false;
    housePreviewGroup.scale.set(1, 0.01, 1);
    siteGroup.add(housePreviewGroup);

    this.group.add(siteGroup);

    // Active project tracker
    const project = {
      id: plateau.id,
      plateau,
      paletteItem,
      siteGroup,
      brickStack,
      cementBags,
      padMesh,
      scaffoldGroup,
      housePreviewGroup,
      state: 'WAITING_SUPPLIES', // Phase 0: Waiting for courier to transport bricks from Olaria
      workers: [],
      progress: 0.0,
      duration: 28.0, // Satisfying, longer duration (~28 seconds of work once arrived)
      particleTimer: 0,
      onComplete
    };

    // 6. Dispatch courier from Olaria with materials, then recruit builders upon arrival!
    if (this.npcManager) {
      this.npcManager.dispatchCourierWithSupplies(project, () => {
        // Material delivery arrived!
        project.brickStack.visible = true;
        project.cementBags.visible = true;
        project.state = 'WAITING_WORKERS';

        this.spawnConstructionPuff({
          x: project.plateau.x,
          y: project.siteGroup.position.y + 0.4,
          z: project.plateau.z
        });
        if (this.soundtrack) {
          this.soundtrack.playConstructionSound(project.plateau);
        }

        // Recruit 2 citizen builders to walk over and construct ONLY if not already recruited
        if ((!project.workers || project.workers.length === 0) && this.npcManager) {
          project.workers = this.npcManager.recruitWorkersForSite(project, 2);
        }
      });
    } else {
      project.brickStack.visible = true;
      project.cementBags.visible = true;
      project.state = 'WAITING_WORKERS';
    }

    this.activeConstructions.push(project);
  },

  upgradeHouse(houseId, visual = false) {
    const house = this.houses.find(h => h.id === houseId);
    if (!house) return false;

    if (house.level < 3) {
      house.level++;
      house.residents += 3;
      house.wealth += 35;

      this.spawnConstructionPuff(house.position);

      if (house.level === 2) {
        this.buildStory(house, 1);
        this.buildLaje(house, 2);
      } else if (house.level === 3) {
        this.buildLaje(house, 2);
      }

      return true;
    }
    return false;
  },

  buildHouse(plat, level = 1, paletteItem = null) {
    const houseGroup = new THREE.Group();
    const groundY = this.terrain ? this.terrain.getElevation(plat.x, plat.z) : (plat.y || 2.0);

    const halfW = 2.1;
    const halfD = 1.9;
    const c1 = this.terrain ? this.terrain.getElevation(plat.x - halfW, plat.z - halfD) : groundY;
    const c2 = this.terrain ? this.terrain.getElevation(plat.x + halfW, plat.z - halfD) : groundY;
    const c3 = this.terrain ? this.terrain.getElevation(plat.x - halfW, plat.z + halfD) : groundY;
    const c4 = this.terrain ? this.terrain.getElevation(plat.x + halfW, plat.z + halfD) : groundY;
    // Highest and lowest points around the 4.2x3.8m footprint
    const highestPoint = Math.max(c1, c2, c3, c4, groundY);
    const lowestPoint = Math.min(c1, c2, c3, c4, groundY);
    const slopeDelta = highestPoint - lowestPoint;

    // Risco Geológico: Se for um penhasco absurdo, a prefeitura (jogo) embarga a obra!
    if (slopeDelta > 3.2) {
      return null;
    }

    // O terreno natural (curvas de nível) agora é respeitado 100%!
    // SEM 'levelTerrainAt' para amassar a montanha, preservando a malha FBM limpa.
    
    let buildY = highestPoint;
    // Ground floor placed at the natural highest point to prevent clipping
    houseGroup.position.set(plat.x, buildY, plat.z);

    // ORGANIC TERRAIN-AWARE HOUSE ROTATION & SIDEWALK INTEGRATION:
    let naturalAngle = 0;
    
    // INTEGRAÇÃO DE CALÇADAS: Orientar a frente da casa para a estrada de laje mais próxima
    let nearestNode = null;
    let minDist = 9999;
    if (this.slabRoutes && this.slabRoutes.length > 0) {
      for (const node of this.slabRoutes) {
        const d = Math.hypot(node.x - plat.x, node.z - plat.z);
        if (d < minDist) {
          minDist = d;
          nearestNode = node;
        }
      }
    }

    if (nearestNode && minDist < 15.0) {
      const dx = nearestNode.x - plat.x;
      const dz = nearestNode.z - plat.z;
      // Angle to point +Z towards the road
      naturalAngle = Math.atan2(dx, dz);
    } else {
      const gradX = (c2 + c4) - (c1 + c3);
      const gradZ = (c3 + c4) - (c1 + c2);
      naturalAngle = Math.atan2(-gradX, gradZ);
      const seed = Math.abs(Math.sin(plat.x * 12.9898 + plat.z * 78.233));
      if (seed > 0.75) naturalAngle += Math.PI / 2;
      else if (seed > 0.50) naturalAngle -= Math.PI / 4;
      else if (seed > 0.25) naturalAngle += (Math.random() - 0.5) * 0.4;
    }
    
    houseGroup.rotation.y = naturalAngle;

    const houseColor = paletteItem ? paletteItem.color : 0xE76F51;
    const houseColorName = paletteItem ? paletteItem.name : 'Coral';

    const houseData = {
      id: plat.id,
      faction: plat.faction,
      position: { x: plat.x, y: highestPoint, z: plat.z },
      level: level,
      color: houseColor,
      colorName: houseColorName,
      meshGroup: houseGroup,
      residents: 6 + level * 3,
      wealth: 15 * level,
      waterLevel: 90,
      stories: [],
      laje: null
    };

    // Fundação da Casa (Arrimo sólido ou Pilotis reais!)
    const fDepth = Math.max(1.8, slopeDelta + 2.0); // Ancoragem segura
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x48423B, flatShading: true });
    
    // Se o desnível do terreno for maior que 1.8 metros, criamos Palafitas (Pilotis) para economizar material e estética!
    if (slopeDelta > 1.8) {
      // PILOTIS: Palafitas finas e orgânicas para encostas íngremes (Evita aquele bloco cinza monstruoso)
      const pillarGeo = new THREE.CylinderGeometry(0.18, 0.18, fDepth, 6);
      const offsets = [
        { x: -1.7, z: -1.5 }, { x: 1.7, z: -1.5 },
        { x: -1.7, z: 1.5 }, { x: 1.7, z: 1.5 },
        { x: 0, z: 0 } // Pilar central
      ];
      offsets.forEach(off => {
        // Estica o pilar até encostar no chão exato daquele ponto
        const px = plat.x + Math.cos(naturalAngle) * off.x + Math.sin(naturalAngle) * off.z;
        const pz = plat.z - Math.sin(naturalAngle) * off.x + Math.cos(naturalAngle) * off.z;
        const gy = this.terrain ? this.terrain.getElevation(px, pz) : groundY;
        const localGroundY = gy - buildY;
        const pHeight = Math.max(0.1, -0.05 - localGroundY + 0.2); // +0.2 enterra
        
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, pHeight, 6), baseMat);
        pillar.position.set(off.x, -0.05 - pHeight / 2, off.z);
        pillar.receiveShadow = true;
        pillar.castShadow = true;
        houseGroup.add(pillar);
      });
      // Laje base fina sobre os pilotis
      const baseGeo = new THREE.BoxGeometry(4.3, 0.25, 3.9);
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(0, -0.125, 0);
      base.receiveShadow = true;
      houseGroup.add(base);
    } else {
      // FUNDAÇÃO INVISÍVEL / INTEGRADA: Para terrenos planos (slopeDelta <= 1.8)
      // Substitui o Muro de Arrimo escuro e largo por uma extensão perfeita das próprias paredes da casa
      const w = 3.8 + (Math.sin(houseData.position.x * 2) * 0.3);
      const d = 3.5 + (Math.cos(houseData.position.z * 2) * 0.3);
      const foundationGeo = new THREE.BoxGeometry(w, fDepth, d);
      const foundationMat = new THREE.MeshLambertMaterial({ color: houseColor, flatShading: true });
      const foundation = new THREE.Mesh(foundationGeo, foundationMat);
      foundation.position.set(0, -fDepth / 2, 0);
      foundation.receiveShadow = true;
      houseGroup.add(foundation);
    }

    // Ground floor
    this.buildStory(houseData, 0);

    // Upper floor & laje if level >= 2
    if (level >= 2) {
      this.buildStory(houseData, 1);
      this.buildLaje(houseData, 2);
    } else {
      this.buildLaje(houseData, 1);
    }

    // Solid stone entrance steps (escadaria de acesso) leading out from the doorway
    const stepMat = new THREE.MeshLambertMaterial({ color: 0x69625A, flatShading: true });
    for (let s = 1; s <= 3; s++) {
      const sz = 1.95 + s * 0.55;
      const gx = plat.x + Math.sin(naturalAngle) * sz;
      const gz = plat.z + Math.cos(naturalAngle) * sz;
      const gy = this.terrain ? this.terrain.getElevation(gx, gz) : groundY;
      const localGroundY = gy - buildY;
      
      const stepTop = -s * 0.16;
      // Estica o degrau da altura stepTop até encostar firme no solo (-0.2 para enterrar um pouco)
      let stepHeight = Math.max(0.1, stepTop - localGroundY + 0.2);
      
      // TRAVA DE BOM SENSO: Se o degrau for > 1.2m, ele não estica até o chão, vira degrau flutuante!
      if (stepHeight > 1.2) {
        stepHeight = 0.25;
      }
      
      const stepY = stepTop - stepHeight / 2;

      const step = new THREE.Mesh(new THREE.BoxGeometry(1.5, stepHeight, 0.65), stepMat);
      step.position.set(0, stepY, sz);
      step.receiveShadow = true;
      houseGroup.add(step);
    }

    // EXTENSÃO DA CALÇADA ATÉ A RUA (Integração Orgânica)
    if (nearestNode && minDist > 3.6 && minDist < 15.0) {
      const numSlabs = Math.floor((minDist - 3.6) / 0.85);
      const slabGeo = new THREE.BoxGeometry(1.2, 0.1, 0.8);
      const slabMat = new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: true });
      for (let s = 1; s <= numSlabs; s++) {
        const distFromCenter = 3.6 + s * 0.85;
        // Convert to global to get proper terrain height
        const gx = plat.x + Math.sin(naturalAngle) * distFromCenter;
        const gz = plat.z + Math.cos(naturalAngle) * distFromCenter;
        const gy = this.terrain ? this.terrain.getElevation(gx, gz) : groundY;
        const localY = gy - buildY;
        
        const slab = new THREE.Mesh(slabGeo, slabMat);
        slab.position.set(0, localY + 0.05, distFromCenter);
        slab.receiveShadow = true;
        slab.castShadow = true;
        houseGroup.add(slab);
      }
    }

    // CONGELAR MATRIZES (PERFORMANCE OPTIMIZATION)
    // Casas nunca mudam de posição, então desabilitamos os recálculos da placa de vídeo
    houseGroup.traverse((child) => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    this.group.add(houseGroup);
    return houseData;
  },

  buildStory(houseData, storyIndex) {
    const storyGroup = new THREE.Group();
    const w = 3.8 + (Math.sin(houseData.position.x * 2 + storyIndex) * 0.3);
    const d = 3.5 + (Math.cos(houseData.position.z * 2 + storyIndex) * 0.3);
    const h = 2.5;
    const storyY = storyIndex * h + h / 2;

    const offsetX = storyIndex > 0 ? (Math.random() - 0.5) * 0.25 : 0;
    const offsetZ = storyIndex > 0 ? (Math.random() - 0.5) * 0.25 : 0;

    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const isBrick = (storyIndex === 1 && Math.random() > 0.4);
    const bodyColor = isBrick ? 0xB55338 : houseData.color;

    const bodyMat = new THREE.MeshLambertMaterial({
      color: bodyColor,
      flatShading: true
    });

    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.position.set(offsetX, storyY, offsetZ);
    storyGroup.add(bodyMesh);

    if (storyIndex === 0) {
      const doorGeo = new THREE.BoxGeometry(0.85, 1.6, 0.1);
      const doorMat = new THREE.MeshLambertMaterial({ color: 0x4A301D });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(offsetX - w * 0.22, 1.6 / 2, offsetZ + d / 2 + 0.05);
      storyGroup.add(door);

      // A calçada plana "dirtPath" antiga foi removida, 
      // as extensões de concreto agora cuidam da conexão com a rua organicamente!
    }

    // Variedade Arquitetônica 3.0: Extrusões em L para quebrar o caixote!
    if (Math.random() > 0.6) {
      const extW = w * 0.45;
      const extD = d * 0.6;
      const isRight = Math.random() > 0.5;
      const extX = isRight ? (offsetX + w/2 + extW/2 - 0.2) : (offsetX - w/2 - extW/2 + 0.2);
      
      const extBody = new THREE.Mesh(new THREE.BoxGeometry(extW, h, extD), bodyMat);
      extBody.position.set(extX, storyY, offsetZ - d/2 + extD/2);
      extBody.castShadow = true;
      extBody.receiveShadow = true;
      storyGroup.add(extBody);
      
      // Expand laje over the extrusion
      const extSlab = new THREE.Mesh(new THREE.BoxGeometry(extW + 0.2, 0.2, extD + 0.2), new THREE.MeshLambertMaterial({ color: 0x7E8B9B, flatShading: true }));
      extSlab.position.set(extX, storyY + h / 2 + 0.1, offsetZ - d/2 + extD/2);
      extSlab.castShadow = true;
      storyGroup.add(extSlab);
    }

    const winGeo = new THREE.BoxGeometry(0.75, 0.75, 0.1);
    const winMat = new THREE.MeshLambertMaterial({
      color: 0x415A77,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      flatShading: true
    });

    const winFront = new THREE.Mesh(winGeo, winMat.clone());
    winFront.position.set(offsetX + w * 0.22, storyY + 0.15, offsetZ + d / 2 + 0.06);
    storyGroup.add(winFront);
    this.windowMeshes.push(winFront);

    const winSide = new THREE.Mesh(winGeo, winMat.clone());
    winSide.rotation.y = Math.PI / 2;
    winSide.position.set(offsetX + w / 2 + 0.06, storyY + 0.15, offsetZ);
    storyGroup.add(winSide);
    this.windowMeshes.push(winSide);

    const slabGeo = new THREE.BoxGeometry(w + 0.2, 0.2, d + 0.2);
    const slabMat = new THREE.MeshLambertMaterial({ color: 0x7E8B9B, flatShading: true });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(offsetX, storyY + h / 2 + 0.1, offsetZ);
    slab.castShadow = true;
    storyGroup.add(slab);

    if (storyIndex > 0 && Math.random() > 0.5) {
      // Small balcony
      const balconyGeo = new THREE.BoxGeometry(1.6, 0.1, 0.8);
      const balconyMat = new THREE.MeshLambertMaterial({ color: 0x687584 });
      const balcony = new THREE.Mesh(balconyGeo, balconyMat);
      balcony.position.set(offsetX, storyY - h / 2 + 0.05, offsetZ + d / 2 + 0.4);
      storyGroup.add(balcony);
      
      const railMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.05), railMat);
      rail.position.set(offsetX, storyY - h / 2 + 0.3, offsetZ + d / 2 + 0.75);
      storyGroup.add(rail);
      
      if (Math.random() > 0.5) {
        const miniLine = this.createClothesline();
        miniLine.scale.set(0.5, 0.5, 0.5);
        miniLine.position.set(offsetX + 0.2, storyY - h / 2 + 0.2, offsetZ + d / 2 + 0.3);
        storyGroup.add(miniLine);
      }
    }

    // CONGELAR MATRIZES PARA PERFORMANCE
    storyGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    houseData.meshGroup.add(storyGroup);
    houseData.stories.push(storyGroup);
  },

  buildLaje(houseData, storyIndex) {
    if (houseData.laje) {
      houseData.meshGroup.remove(houseData.laje);
    }

    const lajeGroup = new THREE.Group();
    const h = 2.5;
    const lajeY = storyIndex * h + 0.2;

    const floorGeo = new THREE.BoxGeometry(4.0, 0.25, 3.6);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x687584, flatShading: true });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, lajeY, 0);
    floor.receiveShadow = true;
    lajeGroup.add(floor);

    const wallMat = new THREE.MeshLambertMaterial({ color: 0xB55338, flatShading: true });
    const frontWallGeo = new THREE.BoxGeometry(4.0, 0.55, 0.15);
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
    frontWall.position.set(0, lajeY + 0.32, 1.75);
    lajeGroup.add(frontWall);

    // Caixa d'água azul tradicional carioca (Otimizado com geometria/material compartilhados)
    if (houseData.level >= 2 || Math.random() > 0.3) {
      const tank = new THREE.Mesh(this.sharedWaterTankGeo, this.sharedWaterTankMat);
      tank.position.set(-1.1, lajeY + 0.7, -0.85);
      tank.castShadow = true;
      lajeGroup.add(tank);

      const lid = new THREE.Mesh(this.sharedWaterTankLidGeo, this.sharedWaterTankMat);
      lid.position.set(-1.1, lajeY + 1.25, -0.85);
      lajeGroup.add(lid);
    }

    // Clothesline (50% chance)
    if (Math.random() > 0.5) {
      const lineGroup = this.createClothesline();
      lineGroup.position.set(0.5, lajeY + 0.1, 0.2);
      lajeGroup.add(lineGroup);
    }
    
    // TV Antenna (50% chance)
    if (Math.random() > 0.5) {
      const antennaGroup = new THREE.Group();
      const antMat = new THREE.MeshLambertMaterial({ color: 0x94A3B8 });
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8), antMat);
      mast.position.y = 0.9;
      antennaGroup.add(mast);
      for(let i=0; i<4; i++) {
        const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8 - i*0.15), antMat);
        cross.rotation.z = Math.PI / 2;
        cross.position.y = 1.0 + i*0.2;
        antennaGroup.add(cross);
      }
      antennaGroup.position.set(1.5, lajeY + 0.1, 1.0);
      lajeGroup.add(antennaGroup);
    }

    // Churrasqueira de tijolo, mesa de boteco e churrasqueiro: APENAS NÍVEL MÁXIMO (Nível 3)!
    // Casas recém-construídas (Nível 1 ou 2) NÃO possuem churrasqueira nem morador na laje!
    if (houseData.level >= 3) {
      const bbqGroup = new THREE.Group();
      bbqGroup.position.set(1.2, lajeY + 0.5, -1.0);

      const bbqGeo = new THREE.BoxGeometry(0.65, 0.95, 0.65);
      const bbqMat = new THREE.MeshLambertMaterial({ color: 0xB55338, flatShading: true });
      const bbq = new THREE.Mesh(bbqGeo, bbqMat);
      bbqGroup.add(bbq);

      // Chaminé de tijolo
      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.5, 0.35),
        bbqMat
      );
      chimney.position.set(0, 0.7, 0);
      bbqGroup.add(chimney);

      // Brasa incandescente (desligada de dia, incandescente de noite)
      const coalsMat = new THREE.MeshBasicMaterial({ color: 0x2B2B2B });
      const coals = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.08, 0.48),
        coalsMat
      );
      coals.position.set(0, 0.46, 0.06);
      bbqGroup.add(coals);

      lajeGroup.add(bbqGroup);

      // Mesa de madeira de boteco com caipirinhas
      const tableMat = new THREE.MeshLambertMaterial({ color: 0x5C4033, flatShading: true });
      const table = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.5), tableMat);
      table.position.set(-0.25, lajeY + 0.26, -0.9);
      lajeGroup.add(table);

      // 2 Copos de Caipirinha gelada com limão verde
      const drinkMat = new THREE.MeshLambertMaterial({ color: 0x84CC16, flatShading: true });
      const cup1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 5), drinkMat);
      cup1.position.set(-0.38, lajeY + 0.58, -0.9);
      lajeGroup.add(cup1);

      const cup2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 5), drinkMat);
      cup2.position.set(-0.12, lajeY + 0.58, -0.85);
      lajeGroup.add(cup2);

      // Cadeira de praia / banqueta amarela
      const chairMat = new THREE.MeshLambertMaterial({ color: 0xFACC15, flatShading: true });
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.42), chairMat);
      chair.position.set(-0.25, lajeY + 0.22, -0.3);
      lajeGroup.add(chair);

      // Churrasqueiro da Laje (PURAMENTE DECORATIVO: aparece APENAS à noite e nas casas que assarem carne!)
      const churrasqueiroGroup = new THREE.Group();
      churrasqueiroGroup.position.set(0.55, lajeY + 0.15, -0.75);
      churrasqueiroGroup.visible = false; // Começa invisível! Só aparece à noite se a casa decidir fazer churrasco!

      const skinColors = [0x8D5524, 0xC68642, 0xE0AC69];
      const resHeadMat = new THREE.MeshLambertMaterial({ color: skinColors[Math.floor(Math.random() * skinColors.length)], flatShading: true });
      const resShirtMat = new THREE.MeshLambertMaterial({ color: houseData.color, flatShading: true });

      const resTorso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.24), resShirtMat);
      resTorso.position.y = 0.52;
      churrasqueiroGroup.add(resTorso);

      const resHead = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), resHeadMat);
      resHead.position.y = 0.92;
      churrasqueiroGroup.add(resHead);

      const resLegs = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.22), new THREE.MeshLambertMaterial({ color: 0x1E293B }));
      resLegs.position.y = 0.21;
      churrasqueiroGroup.add(resLegs);

      // Braço direito segurando espeto de carne
      const armMat = new THREE.MeshLambertMaterial({ color: skinColors[0] });
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.12), armMat);
      armR.position.set(0.24, 0.55, 0.12);
      churrasqueiroGroup.add(armR);

      const skewerMat = new THREE.MeshBasicMaterial({ color: 0xCCCCCC });
      const skewer = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), skewerMat);
      skewer.position.set(0.24, 0.65, 0.24);
      skewer.rotation.x = Math.PI / 3;
      churrasqueiroGroup.add(skewer);

      lajeGroup.add(churrasqueiroGroup);

      // Registrar posição do churrasco e componentes para animação de noite
      const bbqWorldPos = new THREE.Vector3(
        houseData.position.x + 1.2,
        houseData.position.y + lajeY + 1.85,
        houseData.position.z - 1.0
      );
      this.lajeBBQs.push({
        houseId: houseData.id,
        pos: bbqWorldPos,
        coals,
        churrasqueiro: churrasqueiroGroup,
        armR,
        torso: resTorso,
        timer: Math.random() * 0.5
      });
    }

    // CONGELAR MATRIZES PARA PERFORMANCE
    lajeGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    houseData.meshGroup.add(lajeGroup);
    houseData.laje = lajeGroup;
  },

  createClothesline() {
    const lineGroup = new THREE.Group();
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x4A301D });

    const stickGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 4);
    const pole1 = new THREE.Mesh(stickGeo, poleMat);
    pole1.position.set(-0.85, 0.75, 0);
    lineGroup.add(pole1);

    const pole2 = new THREE.Mesh(stickGeo, poleMat);
    pole2.position.set(0.85, 0.75, 0);
    lineGroup.add(pole2);

    const wireGeo = new THREE.BoxGeometry(1.7, 0.02, 0.02);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.position.set(0, 1.35, 0);
    lineGroup.add(wire);

    const clothesColors = [0xFF5964, 0x35A7FF, 0xFFE74C, 0xFFFFFF];
    for (let c = 0; c < 3; c++) {
      const clothGeo = new THREE.BoxGeometry(0.35, 0.5, 0.03);
      const clothMat = new THREE.MeshLambertMaterial({
        color: clothesColors[c % clothesColors.length],
        flatShading: true
      });
      const cloth = new THREE.Mesh(clothGeo, clothMat);
      cloth.position.set(-0.45 + c * 0.45, 1.05, 0);
      lineGroup.add(cloth);
      this.clotheslines.push({ mesh: cloth, phase: c * 0.8 });
    }

    return lineGroup;
  },

  spawnConstructionPuff(pos) {
    if (this.particles.length > 40) return; // Pool safeguard
    const numParticles = 8;
    const mats = [this.puffMatBrick, this.puffMatCement, this.puffMatWood];
    for (let i = 0; i < numParticles; i++) {
      const mat = mats[Math.floor(Math.random() * mats.length)];
      const cube = new THREE.Mesh(this.sharedPuffGeo, mat);
      cube.position.set(
        pos.x + (Math.random() - 0.5) * 1.6,
        pos.y + 1.2 + Math.random() * 1.4,
        pos.z + (Math.random() - 0.5) * 1.6
      );

      this.group.add(cube);
      this.particles.push({
        mesh: cube,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 2.2,
          1.8 + Math.random() * 2.0,
          (Math.random() - 0.5) * 2.2
        ),
        gravity: 2.4,
        life: 1.2,
        maxLife: 1.2
      });
    }
  },

  getActiveHousesData() {
    return this.houses.map(h => ({
      id: h.id,
      faction: h.faction,
      x: h.position.x,
      y: h.position.y,
      z: h.position.z,
      level: h.level,
      color: h.color,
      colorName: h.colorName,
      wealth: h.wealth,
      residents: h.residents
    }));
  }
};
