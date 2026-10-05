import * as THREE from 'three';

export class Architecture {
  constructor(scene, environment, terrain) {
    this.scene = scene;
    this.env = environment;
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.houses = [];
    this.allPlateaus = [];
    this.infrastructure = [];
    this.particles = [];
    this.clotheslines = [];
    this.boats = [];
    this.activeConstructions = [];
    this.activeUpgrades = [];
    this.npcManager = null;
    this.soundtrack = null;

    // Interactive Pelada Soccer Physics & Match State
    this.soccerBall = null;
    this.soccerBallPos = new THREE.Vector3(55, 3.82, 4);
    this.soccerBallVel = new THREE.Vector3(0, 0, 0);
    this.soccerScore = { yellow: 0, blue: 0 };
    this.soccerGoalCooldown = 0;
    this.soccerBallIdleTimer = 0;

    // Cinturão das Alturas Dynamic Landmarks:
    this.windTurbines = [];
    this.kites = [];
    this.beaconLight = null;
    this.kilnFire = null;

    // A Grande Beira da Praia expansion state:
    this.beachStalls = [];
    this.beachUmbrellas = [];
    this.beachPalms = [];
    this.altinhaMatch = null;
    this.maresiaAudioTimer = 0;

    // Night illumination, Lajes Vivas & Fishing Expedition state:
    this.windowMeshes = [];
    this.lajeBBQs = [];
    this.smokeParticles = [];
    this.solarLamps = [];
    this.kioskLamps = [];
    this.expeditionBoats = [];
    this.jumpingFish = [];
    this.lhBeamGroup = null;
    this.natureObstacles = [];

    // Shared Geometries & Materials (Memory Optimization)
    this.sharedPuffGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    this.sharedPuffMat1 = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95 });
    this.sharedPuffMat2 = new THREE.MeshBasicMaterial({ color: 0xE6AF2E, transparent: true, opacity: 0.95 });
    
    this.sharedSmokeGeo = new THREE.DodecahedronGeometry(0.18, 0);
    this.sharedSmokeMat = new THREE.MeshBasicMaterial({ color: 0xE2E8F0, transparent: true, opacity: 0.35, depthWrite: false });

    this.sharedFishGeo = new THREE.ConeGeometry(0.10, 0.34, 4);
    this.sharedFishGeo.rotateZ(Math.PI / 2);
    this.sharedFishMat = new THREE.MeshLambertMaterial({ color: 0xE2E8F0, flatShading: true });

    // Shared Water Tank Geometries & Material (v1.1 Performance Optimization)
    this.sharedWaterTankGeo = new THREE.CylinderGeometry(0.65, 0.55, 1.1, 7);
    this.sharedWaterTankLidGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.14, 7);
    this.sharedWaterTankMat = new THREE.MeshLambertMaterial({ color: 0x0284C7, flatShading: true });

    // Zonas de Permanência Orgânica (Bancos & Botecos)
    this.botecoSpots = [];
    this.alamedaBenches = [];

    // Global map of all roads and pathways to prevent houses from spawning on top of them
    this.infrastructureNodes = [];

    // Distinct vibrant Brazilian colors
    this.palette = [
      { name: 'Coral Tropical', color: 0xE76F51 },
      { name: 'Amarelo Canário', color: 0xF4A261 },
      { name: 'Azul Guanabara', color: 0x2A75D3 },
      { name: 'Verde Tropical', color: 0x2A9D8F },
      { name: 'Rosa Queimado', color: 0xD84A75 },
      { name: 'Tijolo Aparente', color: 0xB55338 },
      { name: 'Branco Caiado', color: 0xEAEAEA },
      { name: 'Turquesa Suave', color: 0x48CAE4 },
      { name: 'Terracota Solar', color: 0xCC5A36 }
    ];

    this.scene.add(this.group);
  }

  setNPCManager(npcManager) {
    this.npcManager = npcManager;
  }

  setSoundtrack(soundtrack) {
    this.soundtrack = soundtrack;
  }

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
        const inSamba = Math.abs(sh.x - -2) <= 13 && Math.abs(sh.z - -4) <= 13; // Aumentado para 13m (Limpeza Total!)
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
  }

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
  }

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
      const inSamba = Math.abs(p.x - -2) <= 8 && Math.abs(p.z - -4) <= 8;
      
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
  }

  // Spawns a new house with dynamic visual construction & terrain terraforming
  spawnNewHouse(preferredFaction = null, onComplete = null, specificPlateau = null) {
    const bestCandidate = specificPlateau || this.selectExpansionPlateau(preferredFaction);
    if (!bestCandidate) return null;

    const paletteItem = this.palette[this.houses.length % this.palette.length];

    // Start Visual Construction & Terraforming project!
    this.startHouseConstruction(bestCandidate, paletteItem, onComplete);

    return { id: bestCandidate.id, faction: bestCandidate.faction, isConstructing: true };
  }

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

        // Recruit 2 citizen builders to walk over and construct
        project.workers = this.npcManager.recruitWorkersForSite(project, 2);
      });
    } else {
      project.brickStack.visible = true;
      project.cementBags.visible = true;
      project.state = 'WAITING_WORKERS';
    }

    this.activeConstructions.push(project);
  }

  // HOUSE UPGRADE SYSTEM WITH REAL WORKERS & SCAFFOLDING
  upgradeHouse(houseId, onComplete = null) {
    const house = this.houses.find(h => h.id === houseId);
    if (!house || house.level >= 3 || house.isUpgrading) return false;

    house.isUpgrading = true;

    // Organic Upgrade: Pave the dirt path to concrete!
    if (house.dirtPath) {
      house.dirtPath.material.color.setHex(0x94A3B8); // Concrete color
    }

    // Recruit citizen workers to build the upgrade!
    const upgradeProject = {
      id: `upgrade_${house.id}`,
      house,
      plateau: {
        x: house.position.x,
        y: house.position.y,
        z: house.position.z,
        faction: house.faction
      }
    };

    const workers = this.npcManager ? this.npcManager.recruitWorkersForSite(upgradeProject, 2) : [];

    // Build temporary scaffolding around the house
    const scaffoldGroup = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8C7456, flatShading: true });
    const currentHeight = house.level * 2.5;

    const corners = [
      { x: -2.3, z: -2.1 }, { x: 2.3, z: -2.1 },
      { x: -2.3, z: 2.1 },  { x: 2.3, z: 2.1 }
    ];
    corners.forEach(c => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, currentHeight + 3.2, 4), woodMat);
      pole.position.set(c.x, (currentHeight + 3.2) / 2, c.z);
      scaffoldGroup.add(pole);
    });

    const plank = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 0.3), woodMat);
    plank.position.set(0, currentHeight + 0.15, 2.1);
    scaffoldGroup.add(plank);

    // Stacks of bricks for the new floor
    const brickMat = new THREE.MeshLambertMaterial({ color: 0xB55338, flatShading: true });
    const brickStack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.7), brickMat);
    brickStack.position.set(-1.8, currentHeight + 0.35, 0);
    scaffoldGroup.add(brickStack);

    scaffoldGroup.position.set(house.position.x, house.position.y, house.position.z);
    this.group.add(scaffoldGroup);

    this.activeUpgrades.push({
      id: house.id,
      house,
      scaffoldGroup,
      workers,
      state: 'WAITING_WORKERS',
      progress: 0.0,
      duration: 12.0, // ~12 seconds
      particleTimer: 0,
      onComplete
    });

    return true;
  }

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
  }

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
  }

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
  }

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
  }

  createContinentalRoadNetwork() {
    const roadMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, flatShading: true });
    const stoneGeo = new THREE.BoxGeometry(2.8, 1.4, 2.2);

    const routes = [
      // 1. Grand Coastal Highway (East to West along the beach promenade: z = 18.0)
      [
        { x: -135, z: 18.0 }, { x: -115, z: 18.0 }, { x: -102, z: 18.0 }, { x: -80, z: 18.0 }, { x: -58, z: 18.0 },
        { x: -35, z: 18.0 },  { x: -12, z: 18.0 },  { x: 12, z: 18.0 },
        { x: 35, z: 18.0 },   { x: 58, z: 18.0 },   { x: 80, z: 18.0 }, { x: 102, z: 18.0 }, { x: 115, z: 18.0 }, { x: 135, z: 18.0 }
      ],
      // 2. North-South Central Spine (upper portion from Alameda do Samba crossroads to Mirante da Vista Imperial)
      [
        { x: -2, z: -19.5 },
        { x: -18, z: -18 }, { x: 5, z: -32 },   { x: -12, z: -50 }, { x: 0, z: -66 }, { x: 0, z: -76 }
      ],
      // 3. West Mid-hill Arterial (Prainha to central junction)
      [
        { x: -75, z: 16 },  { x: -70, z: 4 },  { x: -65, z: -8 },
        { x: -50, z: -20 }, { x: -30, z: -32 }, { x: -3, z: -32 }
      ],
      // 4. East Mid-hill Arterial (Várzea to central junction)
      [
        { x: 75, z: 16 },   { x: 70, z: 4 },   { x: 65, z: -8 },
        { x: 50, z: -20 },  { x: 30, z: -32 },  { x: -3, z: -32 }
      ],
      // 5. ROUTE 5: WESTERN HIGHLAND HIGHWAY (Colina do Poente ao Mirante Imperial)
      [
        { x: -95, z: 18 },  { x: -95, z: 0 },  { x: -90, z: -25 },
        { x: -98, z: -55 }, { x: -78, z: -50 }, { x: -55, z: -70 }, { x: -28, z: -74 }, { x: 0, z: -72 }
      ],
      // 6. ROUTE 6: EASTERN HIGHLAND HIGHWAY (Encosta do Levante ao Mirante Imperial)
      [
        { x: 95, z: 18 },   { x: 95, z: -18 }, { x: 90, z: -25 },
        { x: 98, z: -55 },  { x: 75, z: -45 },  { x: 55, z: -70 }, { x: 28, z: -74 },  { x: 0, z: -72 }
      ],
      // 7. ROUTE 7: TRILHA PANORÂMICA DA COROA DAS ALTURAS (Contorno cênico da crista por trás do mirante)
      [
        { x: -78, z: -50 }, { x: -50, z: -75 }, { x: -24, z: -88 },
        { x: -14, z: -94 }, { x: 0, z: -98 },   { x: 14, z: -94 },
        { x: 24, z: -88 },  { x: 50, z: -75 },  { x: 75, z: -45 }
      ],
      // 8. ROUTE 8: AVENIDA DAS FALÉSIAS DO POENTE (Fronteira Extremo Oeste: X até -135)
      [
        { x: -95, z: 18 },  { x: -115, z: 8 },  { x: -125, z: -20 }, { x: -135, z: -25 },
        { x: -130, z: -45 }, { x: -135, z: -75 }, { x: -120, z: -85 }, { x: -98, z: -55 }
      ],
      // 9. ROUTE 9: AVENIDA DO VALE DO LEVANTE (Fronteira Extremo Leste: X até +135)
      [
        { x: 95, z: 18 },   { x: 115, z: 8 },   { x: 125, z: -20 }, { x: 135, z: -25 },
        { x: 130, z: -45 }, { x: 135, z: -75 }, { x: 120, z: -85 }, { x: 98, z: -55 }
      ],
      // 10. ROUTE 10: ESTRADA DAS ALTURAS DA CRISTA PROFUNDA (Cume Norte Extremo: Z até -132)
      [
        { x: -55, z: -120 }, { x: -45, z: -125 }, { x: -28, z: -115 }, { x: 0, z: -118 },
        { x: 0, z: -130 },   { x: 28, z: -115 },  { x: 45, z: -125 }, { x: 55, z: -120 }
      ]
    ];

    // Precalculate all block transformation matrices
    const blockMatrices = [];
    const dummy = new THREE.Object3D();

    routes.forEach((route, rIdx) => {
      for (let i = 0; i < route.length - 1; i++) {
        const p1 = route[i];
        const p2 = route[i + 1];
        const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        const heightDiff = Math.abs((this.terrain ? this.terrain.getElevation(p2.x, p2.z) : 0) - (this.terrain ? this.terrain.getElevation(p1.x, p1.z) : 0));
        
        // Se a montanha for um paredão, força a criação de MÚLTIPLOS blocos para não gerar escadas voadoras
        const steps = Math.max(9, Math.ceil(dist / 1.5), Math.ceil(heightDiff / 0.35));
        
        const dx = (p2.x - p1.x) / steps;
        const dz = (p2.z - p1.z) / steps;
        const roadHeading = Math.atan2(dx, dz);

        for (let s = 0; s < steps; s++) {
          const sx = p1.x + dx * s;
          const sz = p1.z + dz * s;

          // EVITAR SOBREPOSIÇÃO EM MONUMENTOS E CASAS
          const inSoccer = (Math.abs(sx - 55) < 13 && Math.abs(sz - 4) < 9);
          const inMarket = (Math.abs(sx - 75) < 10 && Math.abs(sz - 4) < 8);
          const inOlaria = (Math.abs(sx - (-22)) < 8 && Math.abs(sz - (-14)) < 6);
          const inAgro = (Math.abs(sx - 82) < 9 && Math.abs(sz - (-8)) < 6);
          const inSamba = (Math.hypot(sx - (-2), sz - (-4)) < 6);
          
          // Se a estrada passar por cima de uma casa, ela é cortada (virando um beco sem saída na porta da casa!)
          const inHouse = this.houses.some(h => Math.hypot(h.position.x - sx, h.position.z - sz) < 3.2);
          
          if (inSoccer || inMarket || inOlaria || inAgro || inSamba || inHouse) continue;

          const sy = this.terrain ? this.terrain.getElevation(sx, sz) : 2.5;

          const nY = this.terrain ? this.terrain.getElevation(sx + dx * 0.5, sz + dz * 0.5) : sy;
          const distStep = Math.hypot(dx, dz);
          const slopeAngle = -Math.atan2(nY - sy, distStep * 0.5);

          dummy.position.set(sx, sy - 0.65, sz);
          dummy.rotation.set(Math.max(-0.35, Math.min(0.35, slopeAngle)), roadHeading, 0);
          dummy.updateMatrix();

          blockMatrices.push({ matrix: dummy.matrix.clone(), routeIdx: rIdx, x: sx, y: sy, z: sz });

          // Register node to prevent houses from spawning here
          this.infrastructureNodes.push({ x: sx, z: sz });
        }
      }
    });

    // Single InstancedMesh rendering all road blocks in 1 draw call!
    const instancedRoad = new THREE.InstancedMesh(stoneGeo, roadMat, blockMatrices.length);
    instancedRoad.receiveShadow = true;

    const baseShade = new THREE.Color(0x9E978E);
    const colorVar = new THREE.Color();

    for (let i = 0; i < blockMatrices.length; i++) {
      const bm = blockMatrices[i];
      instancedRoad.setMatrixAt(i, bm.matrix);
      const tint = (Math.sin(i * 1.6) * 0.06);
      colorVar.copy(baseShade).addScalar(tint);
      instancedRoad.setColorAt(i, colorVar);
    }

    instancedRoad.instanceMatrix.needsUpdate = true;
    if (instancedRoad.instanceColor) instancedRoad.instanceColor.needsUpdate = true;

    this.group.add(instancedRoad);
    this.instancedRoad = instancedRoad;
  }

  // =========================================================================
  // ALAMEDA DO SAMBA (O Caminho Imperial dos Bambas)
  // Acesso nobre, pavimentado e decorado vindo do bairro alto (z: -19.5 a -12.8)
  // Pérgolas de buganvílias floridas, postes coloniais, floreiras e bancos
  // =========================================================================
  createAlamedaDoSamba() {
    const alamedaGroup = new THREE.Group();

    const terracotaMat = new THREE.MeshLambertMaterial({ color: 0xB85D3F, flatShading: true });
    const stoneTrimMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const stoneBaseMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2D6A4F });
    const bougPinkMat = new THREE.MeshLambertMaterial({ color: 0xEC4899 });
    const bougPurpleMat = new THREE.MeshLambertMaterial({ color: 0x8B5CF6 });
    const potMat = new THREE.MeshLambertMaterial({ color: 0x8D6E63 });
    const flowerMatRed = new THREE.MeshLambertMaterial({ color: 0xEF4444 });
    const flowerMatYellow = new THREE.MeshLambertMaterial({ color: 0xF59E0B });

    // 1. Pavimentação Escalonada em Patamares Suaves de Jardim (Z = -19.5 até Z = -13.0)
    const numSlabs = 14;
    for (let i = 0; i < numSlabs; i++) {
      const t = i / (numSlabs - 1);
      const z = -19.5 + t * 6.5; // De -19.5 a -13.0
      const x = -2.0;
      
      const yTerr = this.terrain ? this.terrain.getElevation(x, z) : 12.0;
      const targetY = 11.6 + t * 2.5; // Subida suave de 11.6m para 14.1m
      const y = Math.max(yTerr, targetY);

      // Laje de Terracota
      const slabMesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.28, 0.65), terracotaMat);
      slabMesh.position.set(x, y + 0.12, z);
      slabMesh.receiveShadow = true;
      slabMesh.castShadow = true;
      alamedaGroup.add(slabMesh);

      // Friso de Cantaria nas bordas laterais
      [-2.4, 2.4].forEach(edgeX => {
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.65), stoneTrimMat);
        kerb.position.set(x + edgeX, y + 0.14, z);
        alamedaGroup.add(kerb);
      });

      // Embasamento de Arrimo de Pedra ancorando até o solo
      const baseH = Math.max(0.4, (y - yTerr) + 0.5);
      const baseBlock = new THREE.Mesh(new THREE.BoxGeometry(4.7, baseH, 0.62), stoneBaseMat);
      baseBlock.position.set(x, y - (baseH * 0.5) + 0.05, z);
      baseBlock.receiveShadow = true;
      alamedaGroup.add(baseBlock);
    }

    // 2. Dois Grandes Pórticos de Pérgola com Buganvílias Floridas
    const pergolaZs = [-18.0, -15.0];
    pergolaZs.forEach((pZ, pIdx) => {
      const pT = (pZ - (-19.5)) / 6.5;
      const pY = 11.6 + pT * 2.5;

      // Colunas rústicas nas duas margens
      [-2.55, 2.55].forEach(colX => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.8, 6), woodMat);
        col.position.set(-2.0 + colX, pY + 1.9, pZ);
        alamedaGroup.add(col);

        // Mureta de apoio da coluna
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.45), stoneTrimMat);
        plinth.position.set(-2.0 + colX, pY + 0.3, pZ);
        alamedaGroup.add(plinth);
      });

      // Travessa Principal do Pórtico
      const beam = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.22, 0.24), woodMat);
      beam.position.set(-2.0, pY + 3.8, pZ);
      alamedaGroup.add(beam);

      // Ripas de teto
      for (let rx = -2.4; rx <= 2.4; rx += 0.8) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.2), woodMat);
        rib.position.set(-2.0 + rx, pY + 3.95, pZ);
        alamedaGroup.add(rib);
      }

      // Copa de Buganvílias Floridas
      const bColor = (pIdx === 0) ? bougPinkMat : bougPurpleMat;
      for (let bx = -2.3; bx <= 2.3; bx += 0.65) {
        const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), leafMat);
        leaf.position.set(-2.0 + bx, pY + 3.95 + Math.sin(bx * 2) * 0.1, pZ + (Math.sin(bx * 3) * 0.25));
        alamedaGroup.add(leaf);

        const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), bColor);
        flower.position.set(-2.0 + bx, pY + 4.15, pZ + (Math.sin(bx * 3) * 0.25));
        alamedaGroup.add(flower);
      }
    });

    // 3. Postes Coloniais com Iluminação Âmbar e Floreiras Laterais
    const lampZs = [-19.2, -17.0, -14.8, -13.2];
    lampZs.forEach((lZ, lIdx) => {
      const lT = (lZ - (-19.5)) / 6.5;
      const lY = 11.6 + lT * 2.5;

      [-2.65, 2.65].forEach(sideX => {
        const postX = -2.0 + sideX;

        // Poste Colonial
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.8, 6), woodMat);
        post.position.set(postX, lY + 1.4, lZ);
        alamedaGroup.add(post);

        // Luminária Dourada
        const lamp = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: 0xFFD700 }));
        lamp.position.set(postX, lY + 2.8, lZ);
        alamedaGroup.add(lamp);

        const light = new THREE.PointLight(0xFFA200, 1.8, 8);
        light.position.set(postX, lY + 2.8, lZ);
        alamedaGroup.add(light);

        // Vaso com Folhagens e Flores entre os postes
        if (lIdx % 2 === 1) {
          const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.5, 6), potMat);
          pot.position.set(postX, lY + 0.25, lZ + 0.8);
          alamedaGroup.add(pot);

          const plant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), leafMat);
          plant.position.set(postX, lY + 0.55, lZ + 0.8);
          alamedaGroup.add(plant);

          const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), (sideX > 0) ? flowerMatRed : flowerMatYellow);
          fl.position.set(postX, lY + 0.72, lZ + 0.8);
          alamedaGroup.add(fl);
        }
      });
    });

    // 4. Bancos de Madeira Rústica para Contemplação e Descanso
    this.alamedaBenches = [];
    const benchConfigs = [
      { x: -4.8, z: -17.5, rot: 1.57, yOffset: 0.2 },
      { x: 0.8,  z: -14.2, rot: -1.57, yOffset: 0.2 }
    ];
    benchConfigs.forEach((bCfg, bIdx) => {
      const bT = (bCfg.z - (-19.5)) / 6.5;
      const bY = 11.6 + bT * 2.5;

      const benchGroup = new THREE.Group();
      benchGroup.position.set(bCfg.x, bY + bCfg.yOffset, bCfg.z);
      benchGroup.rotation.y = bCfg.rot;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.45), woodMat);
      seat.position.y = 0.35;
      benchGroup.add(seat);

      [-0.65, 0.65].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.4), woodMat);
        leg.position.set(lx, 0.175, 0);
        benchGroup.add(leg);
      });

      const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.08), woodMat);
      back.position.set(0, 0.65, -0.2);
      benchGroup.add(back);

      alamedaGroup.add(benchGroup);

      this.alamedaBenches.push({
        id: `alameda_bench_${bIdx}`,
        x: bCfg.x,
        y: bY + bCfg.yOffset,
        z: bCfg.z,
        rot: bCfg.rot,
        isOccupied: false
      });
    });

    // 5. Bandeirinhas Festivas e Fios Aéreos Cruzando a Alameda
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const colors = [0xFF0000, 0x00FF00, 0xFFFF00, 0x00FFFF, 0xFF00FF, 0xF97316];
    pergolaZs.forEach((pZ, pIdx) => {
      const pT = (pZ - (-19.5)) / 6.5;
      const pY = 11.6 + pT * 2.5;

      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 5.2, 3), wireMat);
      wire.position.set(-2.0, pY + 3.4, pZ);
      wire.rotation.z = Math.PI / 2;
      alamedaGroup.add(wire);

      for (let f = 0; f < 6; f++) {
        const flag = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.14, 0),
          new THREE.MeshBasicMaterial({ color: colors[(f + pIdx * 2) % colors.length] })
        );
        flag.position.set(-4.0 + f * 0.8, pY + 3.25 - Math.sin((f / 5) * Math.PI) * 0.12, pZ);
        alamedaGroup.add(flag);
      }
    });

    // Registrar nós de infraestrutura
    this.infrastructureNodes.push({ x: -2.0, z: -19.0 });
    this.infrastructureNodes.push({ x: -2.0, z: -16.0 });
    this.infrastructureNodes.push({ x: -2.0, z: -13.0 });

    this.group.add(alamedaGroup);
    this.alamedaDoSamba = alamedaGroup;
  }

  // CANTINHOS DE BOTECO SUTIS & MESINHAS DE CALÇADA (Atualização 1.1)
  // Apenas 2 pontos orgânicos e discretos na colina para encontros e pausas
  createBotecoPockets() {
    this.botecoSpots = [];
    const botecoGroup = new THREE.Group();

    const tableMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true });
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
    const chairMatAmbev = new THREE.MeshLambertMaterial({ color: 0xFACC15, flatShading: true }); // Amarela Ambev
    const chairMatBrahma = new THREE.MeshLambertMaterial({ color: 0xDC2626, flatShading: true }); // Vermelha Brahma
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x15803D, flatShading: true }); // Garrafa de Guaraná
    const umbrellaMat = new THREE.MeshLambertMaterial({ color: 0xF59E0B, flatShading: true });

    const configs = [
      {
        id: 'boteco_varzea',
        name: 'Boteco da Várzea',
        tableX: 37.2,
        tableZ: -4.8,
        chairColor: chairMatAmbev,
        hasUmbrella: true,
        chairs: [
          { x: 36.5, z: -4.8, rotY: Math.PI / 2 },
          { x: 37.9, z: -4.8, rotY: -Math.PI / 2 }
        ]
      },
      {
        id: 'boteco_prainha',
        name: 'Venda da Subida da Prainha',
        tableX: -66.0,
        tableZ: 2.2,
        chairColor: chairMatBrahma,
        hasUmbrella: false,
        chairs: [
          { x: -66.0, z: 1.5, rotY: 0 },
          { x: -66.0, z: 2.9, rotY: Math.PI }
        ]
      }
    ];

    configs.forEach(cfg => {
      const tableY = this.terrain ? this.terrain.getElevation(cfg.tableX, cfg.tableZ) : 4.0;

      // Mesa de Boteco
      const tableMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 8), tableMat);
      tableMesh.position.set(cfg.tableX, tableY + 0.72, cfg.tableZ);
      tableMesh.castShadow = true;
      botecoGroup.add(tableMesh);

      const tablePole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6), poleMat);
      tablePole.position.set(cfg.tableX, tableY + 0.36, cfg.tableZ);
      botecoGroup.add(tablePole);

      const tableBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.48), poleMat);
      tableBase.position.set(cfg.tableX, tableY + 0.02, cfg.tableZ);
      botecoGroup.add(tableBase);

      // Garrafinha verde de refrigerante no centro da mesa
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.22, 6), glassMat);
      bottle.position.set(cfg.tableX + 0.07, tableY + 0.85, cfg.tableZ + 0.05);
      botecoGroup.add(bottle);

      // Guarda-sol clássico
      if (cfg.hasUmbrella) {
        const umbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 6), poleMat);
        umbPole.position.set(cfg.tableX, tableY + 1.05, cfg.tableZ);
        botecoGroup.add(umbPole);

        const umbTop = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.42, 8), umbrellaMat);
        umbTop.position.set(cfg.tableX, tableY + 2.2, cfg.tableZ);
        botecoGroup.add(umbTop);
      }

      // Cadeiras de plástico monobloco
      cfg.chairs.forEach((ch, idx) => {
        const chY = this.terrain ? this.terrain.getElevation(ch.x, ch.z) : tableY;
        const chairGroup = new THREE.Group();
        chairGroup.position.set(ch.x, chY, ch.z);
        chairGroup.rotation.y = ch.rotY;

        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.05, 0.40), cfg.chairColor);
        seat.position.y = 0.40;
        chairGroup.add(seat);

        const back = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.40, 0.04), cfg.chairColor);
        back.position.set(0, 0.60, -0.18);
        chairGroup.add(back);

        [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].forEach(([px, pz]) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.40, 0.04), cfg.chairColor);
          leg.position.set(px, 0.20, pz);
          chairGroup.add(leg);
        });

        botecoGroup.add(chairGroup);

        this.botecoSpots.push({
          id: `${cfg.id}_seat_${idx}`,
          botecoName: cfg.name,
          x: ch.x,
          y: chY,
          z: ch.z,
          rotY: ch.rotY,
          isOccupied: false
        });
      });
    });

    // Desabilitar auto-update de matrizes para máxima performance
    botecoGroup.traverse(child => {
      if (child.isMesh) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    this.group.add(botecoGroup);
  }


  // REDE DE ESTRADAS DE LAJES, ESCADARIAS & VIELAS DO MORRO
  // Conecta organicamente 100% dos novos lotes residenciais aos eixos principais
  // Renderizado com InstancedMesh para altíssima performance (60 FPS fluidos em 1x a 5x)
  createEstradasDeLajes() {
    const slabGeo = new THREE.BoxGeometry(2.4, 0.28, 1.8);
    const slabMat = new THREE.MeshLambertMaterial({ color: 0xF7F2EB, flatShading: true });

    const stepGeo = new THREE.BoxGeometry(2.4, 0.38, 1.1);
    const stepMat = new THREE.MeshLambertMaterial({ color: 0xE8E0D5, flatShading: true });

    const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.4, 5);
    const postMat = new THREE.MeshLambertMaterial({ color: 0x3E3832, flatShading: true });

    const lanternGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
    const lanternMat = new THREE.MeshLambertMaterial({
      color: 0xFEF3C7,
      emissive: 0xF59E0B,
      emissiveIntensity: 1.25,
      flatShading: true
    });

    const slabRoutes = [
      // 1. Viela do Poente & Encostas Ocidentais (Conecta todos os lotes oeste ao mar e à colina)
      [
        { x: -75, z: 16 }, { x: -84, z: 8 }, { x: -88, z: -2 }, { x: -76, z: -12 },
        { x: -75, z: -25 }, { x: -84, z: -32 }, { x: -94, z: -32 }, { x: -96, z: -48 },
        { x: -84, z: -56 }, { x: -72, z: -62 }, { x: -60, z: -68 }, { x: -50, z: -70 }
      ],
      // 2. Escadaria Central da Colina Poente (Subida íngreme em degraus de concreto)
      [
        { x: -55, z: 4 }, { x: -58, z: -6 }, { x: -52, z: -16 }, { x: -44, z: -28 },
        { x: -54, z: -36 }, { x: -66, z: -60 }, { x: -70, z: -72 }, { x: -60, z: -85 }
      ],
      // 3. Viela da Prainha Extrema (Borda oeste do relevo - Alcança X = -135)
      [
        { x: -95, z: 12 },  { x: -105, z: 8 },  { x: -115, z: 8 },  { x: -125, z: -20 },
        { x: -135, z: -25 }, { x: -135, z: -75 }, { x: -125, z: -60 }, { x: -120, z: -85 },
        { x: -92, z: -72 }, { x: -80, z: -88 }
      ],
      // 4. Viela do Levante & Encostas Orientais (Conecta todos os lotes leste à várzea e à colina)
      [
        { x: 75, z: 16 }, { x: 84, z: 8 }, { x: 88, z: -2 }, { x: 76, z: -12 },
        { x: 75, z: -25 }, { x: 84, z: -32 }, { x: 94, z: -32 }, { x: 96, z: -48 },
        { x: 84, z: -56 }, { x: 72, z: -62 }, { x: 60, z: -68 }, { x: 50, z: -70 }
      ],
      // 5. Escadaria Central da Colina Levante (Subida íngreme em degraus de concreto)
      [
        { x: 55, z: 4 }, { x: 58, z: -6 }, { x: 52, z: -16 }, { x: 44, z: -28 },
        { x: 54, z: -36 }, { x: 66, z: -60 }, { x: 70, z: -72 }, { x: 60, z: -85 }
      ],
      // 6. Viela da Várzea Extrema (Borda leste do relevo - Alcança X = +135)
      [
        { x: 95, z: 12 },  { x: 105, z: 8 },  { x: 115, z: 8 },  { x: 125, z: -20 },
        { x: 135, z: -25 }, { x: 135, z: -75 }, { x: 125, z: -60 }, { x: 120, z: -85 },
        { x: 92, z: -72 }, { x: 80, z: -88 }
      ],
      // 7. Transversal Central-Oeste (conecta Morro do Sol ao Poente)
      [
        { x: -15, z: -18 }, { x: -28, z: -18 }, { x: -38, z: -15 }, { x: -48, z: -28 }, { x: -65, z: -38 }
      ],
      // 8. Transversal Central-Leste (conecta Morro do Sol ao Levante)
      [
        { x: 15, z: -18 }, { x: 28, z: -18 }, { x: 38, z: -15 }, { x: 48, z: -28 }, { x: 65, z: -38 }
      ],
      // 9. Transversal Alta da Serra (conecta a Serra aos flancos laterais)
      [
        { x: -18, z: -48 }, { x: -30, z: -52 }, { x: -45, z: -50 }, { x: -60, z: -55 }
      ],
      [
        { x: 18, z: -48 }, { x: 30, z: -52 }, { x: 45, z: -50 }, { x: 60, z: -55 }
      ],
      // 10. Estrada Panorâmica do Cume & Crista das Alturas
      [
        { x: -42, z: -82 }, { x: -32, z: -92 }, { x: -20, z: -94 }, { x: -10, z: -102 },
        { x: 0, z: -104 },
        { x: 10, z: -102 }, { x: 20, z: -94 }, { x: 32, z: -92 }, { x: 42, z: -82 }
      ],
      // 11. Escadaria da Crista Profunda & Cume Norte Extremo (Z até -132)
      [
        { x: -55, z: -120 }, { x: -45, z: -125 }, { x: -35, z: -132 }, { x: -20, z: -130 },
        { x: 0, z: -130 },   { x: 20, z: -130 },  { x: 35, z: -132 }, { x: 45, z: -125 }, { x: 55, z: -120 }
      ]
    ];

    const slabMatrices = [];
    const stepMatrices = [];
    const postMatrices = [];
    const lanternMatrices = [];
    const dummy = new THREE.Object3D();

    let globalStepCount = 0;

    slabRoutes.forEach(route => {
      for (let i = 0; i < route.length - 1; i++) {
        const p1 = route[i];
        const p2 = route[i + 1];
        const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        const heightDiff = Math.abs((this.terrain ? this.terrain.getElevation(p2.x, p2.z) : 0) - (this.terrain ? this.terrain.getElevation(p1.x, p1.z) : 0));
        // O segredo para não ter escada voadora: forçar muitos degraus se o tombo (heightDiff) for grande!
        const steps = Math.max(2, Math.ceil(heightDiff / 0.25), Math.ceil(dist / 1.0));
        const dx = (p2.x - p1.x) / steps;
        const dz = (p2.z - p1.z) / steps;
        const heading = Math.atan2(dx, dz);

        for (let s = 0; s < steps; s++) {
          globalStepCount++;
          const sx = p1.x + dx * s;
          const sz = p1.z + dz * s;
          
          // EVITAR SOBREPOSIÇÃO EM MONUMENTOS (Market, Olaria, Agroforest, Soccer, Samba) E CASAS
          const inSoccer = (Math.abs(sx - 55) < 13 && Math.abs(sz - 4) < 9);
          const inMarket = (Math.abs(sx - 75) < 10 && Math.abs(sz - 4) < 8);
          const inOlaria = (Math.abs(sx - (-22)) < 8 && Math.abs(sz - (-14)) < 6);
          const inAgro = (Math.abs(sx - 82) < 9 && Math.abs(sz - (-8)) < 6);
          const inSamba = (Math.hypot(sx - (-2), sz - (-4)) < 6);
          
          const inHouse = this.houses.some(h => Math.hypot(h.position.x - sx, h.position.z - sz) < 3.2);
          
          if (inSoccer || inMarket || inOlaria || inAgro || inSamba || inHouse) continue;

          const sy = this.terrain ? this.terrain.getElevation(sx, sz) : 2.5;

          const nextX = sx + dx * 0.5;
          const nextZ = sz + dz * 0.5;
          const nextY = this.terrain ? this.terrain.getElevation(nextX, nextZ) : sy;
          const deltaY = nextY - sy;
          const stepDist = Math.hypot(dx * 0.5, dz * 0.5);
          const slopeAngle = -Math.atan2(deltaY, stepDist);

          // If slope is steep, place a staircase step, otherwise a smooth slab paver
          if (Math.abs(deltaY) > 0.22) {
            dummy.position.set(sx, sy + 0.28, sz);
            dummy.rotation.set(Math.max(-0.4, Math.min(0.4, slopeAngle)), heading, 0);
            dummy.scale.set(1.0, 1.0, 1.0);
            dummy.updateMatrix();
            stepMatrices.push(dummy.matrix.clone());
          } else {
            dummy.position.set(sx, sy + 0.15, sz); // Laje mais rente ao chão
            dummy.rotation.set(Math.max(-0.35, Math.min(0.35, slopeAngle * 0.85)), heading, 0); // Rotaciona fielmente
            dummy.scale.set(1.0, 1.0, 1.0);
            dummy.updateMatrix();
            slabMatrices.push(dummy.matrix.clone());
          }

          // Place a solar lamppost every 7 steps along the viela
          if (globalStepCount % 7 === 0) {
            const sideOffset = 1.35;
            const px = sx + sideOffset * Math.cos(heading + Math.PI / 2);
            const pz = sz + sideOffset * Math.sin(heading + Math.PI / 2);
            const py = this.terrain ? this.terrain.getElevation(px, pz) : sy;

            // Post
            dummy.position.set(px, py + 1.2, pz);
            dummy.rotation.set(0, heading, 0);
            dummy.scale.set(1.0, 1.0, 1.0);
            dummy.updateMatrix();
            postMatrices.push(dummy.matrix.clone());

            // Lantern
            dummy.position.set(px, py + 2.45, pz);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1.0, 1.0, 1.0);
            dummy.updateMatrix();
            lanternMatrices.push(dummy.matrix.clone());
          }

          // Register node to prevent houses from spawning here
          this.infrastructureNodes.push({ x: sx, z: sz });
        }
      }
    });

    // 1. Instanced Slabs
    if (slabMatrices.length > 0) {
      const instancedSlabs = new THREE.InstancedMesh(slabGeo, slabMat, slabMatrices.length);
      instancedSlabs.receiveShadow = true;
      const baseColor = new THREE.Color(0xF5EFEB);
      const varColor = new THREE.Color();
      for (let i = 0; i < slabMatrices.length; i++) {
        instancedSlabs.setMatrixAt(i, slabMatrices[i]);
        const tint = (Math.sin(i * 1.9) * 0.04);
        varColor.copy(baseColor).addScalar(tint);
        instancedSlabs.setColorAt(i, varColor);
      }
      instancedSlabs.instanceMatrix.needsUpdate = true;
      if (instancedSlabs.instanceColor) instancedSlabs.instanceColor.needsUpdate = true;
      this.group.add(instancedSlabs);
      this.instancedSlabs = instancedSlabs;
    }

    // 2. Instanced Steps
    if (stepMatrices.length > 0) {
      const instancedSteps = new THREE.InstancedMesh(stepGeo, stepMat, stepMatrices.length);
      instancedSteps.receiveShadow = true;
      const baseStepColor = new THREE.Color(0xEAE3D8);
      const varStepColor = new THREE.Color();
      for (let i = 0; i < stepMatrices.length; i++) {
        instancedSteps.setMatrixAt(i, stepMatrices[i]);
        const tint = (Math.sin(i * 2.3) * 0.04);
        varStepColor.copy(baseStepColor).addScalar(tint);
        instancedSteps.setColorAt(i, varStepColor);
      }
      instancedSteps.instanceMatrix.needsUpdate = true;
      if (instancedSteps.instanceColor) instancedSteps.instanceColor.needsUpdate = true;
      this.group.add(instancedSteps);
      this.instancedSteps = instancedSteps;
    }

    // 3. Instanced Solar Lampposts
    if (postMatrices.length > 0) {
      const instancedPosts = new THREE.InstancedMesh(postGeo, postMat, postMatrices.length);
      instancedPosts.castShadow = true;
      for (let i = 0; i < postMatrices.length; i++) {
        instancedPosts.setMatrixAt(i, postMatrices[i]);
      }
      instancedPosts.instanceMatrix.needsUpdate = true;
      this.group.add(instancedPosts);
      this.instancedPosts = instancedPosts;
    }

    // 4. Instanced Glowing Lanterns
    if (lanternMatrices.length > 0) {
      const instancedLanterns = new THREE.InstancedMesh(lanternGeo, lanternMat, lanternMatrices.length);
      for (let i = 0; i < lanternMatrices.length; i++) {
        instancedLanterns.setMatrixAt(i, lanternMatrices[i]);
      }
      instancedLanterns.instanceMatrix.needsUpdate = true;
      this.group.add(instancedLanterns);
      this.instancedLanterns = instancedLanterns;
    }
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

  createBeachLifeEdges() {
    // RIGHT CORNER (East: X ~ 95, Z ~ 60) - Volley & Leisure
    const eastGroup = new THREE.Group();
    const eastY = this.terrain ? this.terrain.getElevation(95, 60) : 0.4;
    eastGroup.position.set(95, eastY, 60);

    // Volleyball Net
    const netPostMat = new THREE.MeshLambertMaterial({ color: 0xAAAAAA });
    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4), netPostMat);
    post1.position.set(-4, 1.2, 0);
    eastGroup.add(post1);
    const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4), netPostMat);
    post2.position.set(4, 1.2, 0);
    eastGroup.add(post2);

    const netGeo = new THREE.BoxGeometry(8, 0.8, 0.02);
    const netMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5, wireframe: true });
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(0, 1.6, 0);
    eastGroup.add(net);

    // Scattered Parasols (Guarda-sóis)
    const parasolColors = [0xEF4444, 0x3B82F6, 0xFACC15, 0x10B981];
    for(let i = 0; i < 6; i++) {
      const px = -20 + Math.random() * 40;
      const pz = -10 + Math.random() * 15;
      const py = this.terrain ? this.terrain.getElevation(95 + px, 60 + pz) - eastY : 0;
      
      const parasolGroup = new THREE.Group();
      parasolGroup.position.set(px, py, pz);
      
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.0), new THREE.MeshLambertMaterial({ color: 0xE2E8F0 }));
      stick.position.y = 1.0;
      parasolGroup.add(stick);
      
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.4, 8), new THREE.MeshLambertMaterial({ color: parasolColors[i % 4], flatShading: true }));
      canopy.position.y = 2.0;
      parasolGroup.add(canopy);
      
      eastGroup.add(parasolGroup);
    }
    this.group.add(eastGroup);

    // LEFT CORNER (West: X ~ -60, Z ~ 65) - Moored Caiçara Boats & Rock Pools
    const westGroup = new THREE.Group();
    const westY = this.terrain ? this.terrain.getElevation(-60, 65) : 0.2;
    westGroup.position.set(-60, westY, 65);

    // Moored Boats on Sand
    const boatHullMat = new THREE.MeshLambertMaterial({ color: 0x3B82F6, flatShading: true });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5C4033, flatShading: true });
    
    for (let b = 0; b < 2; b++) {
      const bGroup = new THREE.Group();
      bGroup.position.set(-5 + b * 12, 0.4, -4 + b * 6);
      bGroup.rotation.y = Math.PI / 4 + b * 0.5;
      
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 4.2), boatHullMat);
      bGroup.add(hull);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.6), woodMat);
      seat.position.set(0, 0.3, 0);
      bGroup.add(seat);
      
      westGroup.add(bGroup);
    }

    // Natural Rock Pools (Piscinas Naturais)
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x69625A, flatShading: true });
    for(let r = 0; r < 8; r++) {
      const rx = -15 + Math.random() * 25;
      const rz = -5 + Math.random() * 15;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.5, 0), rockMat);
      rock.position.set(rx, -0.4, rz);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      westGroup.add(rock);
    }
    
    this.group.add(westGroup);
  }

  // CINTURÃO DA MATA ATLÂNTICA (Versão 2.2)
  // Cria a floresta impenetrável nas bordas do mapa, servindo de pano de fundo natural
  createMataAtlanticaBorders() {
    const forestGroup = new THREE.Group();
    
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x4B5052, flatShading: true });
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x1B5E20, flatShading: true });
    const waterMat = new THREE.MeshBasicMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.8 });

    // Helper: generate a dense forest patch
    const generatePatch = (startX, endX, startZ, endZ, density) => {
      for (let i = 0; i < density; i++) {
        const px = startX + Math.random() * (endX - startX);
        const pz = startZ + Math.random() * (endZ - startZ);
        
        // ZONA DE EXCLUSÃO rigorosa (Empurrando a mata muito para as bordas)
        if (Math.abs(px) < 100 && pz > -105) continue; // Protege TODA a área construível, empurrando pra fora!
        if (pz > -15) continue; // Protege a praia
        
        const py = this.terrain ? this.terrain.getElevation(px, pz) : 0;
        
        // 15% chance de rochas gigantes, 85% árvores
        if (Math.random() > 0.85) {
          const rSize = 3 + Math.random() * 4;
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rSize, 0), rockMat);
          rock.position.set(px, py - rSize * 0.2, pz);
          rock.rotation.set(Math.random(), Math.random(), Math.random());
          rock.scale.set(1, 0.6 + Math.random() * 0.8, 1);
          rock.castShadow = true;
          forestGroup.add(rock);
          this.natureObstacles.push({ x: px, z: pz, radius: rSize * 1.4 });
        } else {
          // Árvore da Floresta da Tijuca
          const treeGroup = new THREE.Group();
          treeGroup.position.set(px, py, pz);
          const tScale = 0.8 + Math.random() * 0.8; 
          
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * tScale, 0.5 * tScale, 3 * tScale, 5), trunkMat);
          trunk.position.y = 1.5 * tScale;
          trunk.castShadow = true;
          treeGroup.add(trunk);
          
          const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(2.5 * tScale, 0), leafMat);
          leaves.position.y = 3 * tScale;
          leaves.castShadow = true;
          treeGroup.add(leaves);
          
          forestGroup.add(treeGroup);
          this.natureObstacles.push({ x: px, z: pz, radius: 4.0 * tScale });
        }
      }
    };

    // 1. Fundo Profundo (Extrema borda do mapa)
    generatePatch(-160, 160, -160, -100, 200);
    // 2. Extremo Oeste Longe (Beirando o precipício)
    generatePatch(-160, -95, -100, -20, 80);
    // 3. Extremo Leste Longe (Beirando o precipício)
    generatePatch(95, 160, -100, -20, 80);

    // CACHOEIRA PROCEDURAL COLOSSAL (No Maciço Central Fundo)
    const fallGroup = new THREE.Group();
    const fallX = -25;
    const fallZ = -105;
    const fallY = this.terrain ? this.terrain.getElevation(fallX, fallZ) : 28;
    fallGroup.position.set(fallX, fallY, fallZ);
    
    // Queda d'água principal
    const stream = new THREE.Mesh(new THREE.BoxGeometry(6, 28, 1.5), waterMat);
    stream.position.set(0, -12, 1.5);
    stream.rotation.x = Math.PI / 12; // Leve inclinação acompanhando o morro
    fallGroup.add(stream);
    
    // Piscina Natural Base
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1.5, 12), waterMat);
    pool.position.set(0, -25, 4.5);
    fallGroup.add(pool);

    // Pedregulhos emoldurando a cachoeira
    for(let i=0; i<12; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(3 + Math.random()*4, 0), rockMat);
      rock.position.set(-10 + Math.random()*20, -26 + Math.random()*25, 1 + Math.random()*6);
      fallGroup.add(rock);
      this.natureObstacles.push({ x: rock.position.x, z: rock.position.z, radius: rock.geometry.parameters.radius * 1.5 });
    }
    forestGroup.add(fallGroup);

    this.group.add(forestGroup);
  }

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
  }

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
  }

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
  }

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
  }

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
  }

  createSolarPark(pos = { x: -18, z: -72 }) {
    const parkGroup = new THREE.Group();
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 15.0;
    parkGroup.position.set(pos.x, y, pos.z);

    // 1. Base Estrutural de Concreto e Brita Nivelada (ancoragem profunda no relevo)
    const baseGeo = new THREE.BoxGeometry(16.5, 2.2, 11.5);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x3F3F46, flatShading: true });
    const terrace = new THREE.Mesh(baseGeo, baseMat);
    terrace.position.y = -0.9;
    terrace.receiveShadow = true;
    parkGroup.add(terrace);

    // Piso de brita/cascalho industrial
    const gravelGeo = new THREE.BoxGeometry(16.2, 0.2, 11.2);
    const gravelMat = new THREE.MeshLambertMaterial({ color: 0x71717A, flatShading: true });
    const gravel = new THREE.Mesh(gravelGeo, gravelMat);
    gravel.position.y = 0.22;
    gravel.receiveShadow = true;
    parkGroup.add(gravel);

    // Guarda-corpo de proteção industrial em aço escuro
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x27272A });
    const fencePosts = [
      { x: -7.8, z: -5.4 }, { x: 0, z: -5.4 }, { x: 7.8, z: -5.4 },
      { x: -7.8, z: 5.4 },  { x: 0, z: 5.4 },  { x: 7.8, z: 5.4 },
      { x: -7.8, z: 0 },    { x: 7.8, z: 0 }
    ];
    fencePosts.forEach(fp => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 4), fenceMat);
      p.position.set(fp.x, 0.8, fp.z);
      parkGroup.add(p);
    });

    const railNorth = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.08, 0.08), fenceMat);
    railNorth.position.set(0, 1.35, -5.4);
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
  }

  kickSoccerBall(dirX, dirZ, force = 6.5) {
    if (!this.soccerBall) return;
    this.soccerBallVel.x = dirX * force;
    this.soccerBallVel.z = dirZ * force;
    this.soccerBallIdleTimer = 0;
    if (this.soundtrack) {
      this.soundtrack.playSoccerKick(this.soccerBall.position);
    }
  }

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

    const fireInner = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: 0xFFD700 }));
    fireInner.position.set(0, 0.9, 0);
    plazaGroup.add(fireInner);

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
  }

  // =========================================================================
  // CINTURÃO DAS ALTURAS & ENCOSTAS VIVAS (LANDMARKS, PARQUE EÓLICO, MIRANTE & HORTAS)
  // =========================================================================
  createHighlandLandmarks() {
    this.createMiranteDaVistaImperial({ x: 50, z: -110 });
    this.createWindTurbines();
    this.createMiranteDasPipas();
    this.createAgroflorestaTerraces();
    this.createNascenteDaSerra();
  }

  // 1. MIRANTE DA VISTA IMPERIAL (Ponto Turístico Nobre & Deck Panorâmico no Cume)
  // Rodeado organicamente por lajes e afloramentos de granito decorativo, sem sobreposição alguma!
  createMiranteDaVistaImperial(pos = { x: 50, z: -110 }) {
    const miranteGroup = new THREE.Group();
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 15.4;
    miranteGroup.position.set(pos.x, y, pos.z);

    // 1. Base Monumental de Granito e Pedra Aparelhada (Fundações profundas ancoradas no topo da serra)
    const foundationGeo = new THREE.CylinderGeometry(8.2, 9.0, 3.8, 16);
    const foundationMat = new THREE.MeshLambertMaterial({ color: 0x4B5563, flatShading: true });
    const foundation = new THREE.Mesh(foundationGeo, foundationMat);
    foundation.position.y = -1.8;
    foundation.receiveShadow = true;
    miranteGroup.add(foundation);

    // 2. Deck Panorâmico em Madeira Nobre (Cumaru / Peroba Rosa Carioca)
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x5C3D28, flatShading: true });
    const deckSurface = new THREE.Mesh(new THREE.CylinderGeometry(8.0, 8.0, 0.28, 16), deckMat);
    deckSurface.position.y = 0.15;
    deckSurface.receiveShadow = true;
    miranteGroup.add(deckSurface);

    // Pranchões de madeira escurecida (Texturização geométrica do piso do deck)
    const plankMat = new THREE.MeshLambertMaterial({ color: 0x784F33, flatShading: true });
    const innerRim = new THREE.Mesh(new THREE.RingGeometry(7.5, 7.95, 16), plankMat);
    innerRim.rotation.x = -Math.PI / 2;
    innerRim.position.y = 0.3;
    innerRim.receiveShadow = true;
    miranteGroup.add(innerRim);

    // Rosa dos Ventos central embutida em latão e carvalho no centro do mirante
    const compassMat = new THREE.MeshLambertMaterial({ color: 0xD4AF37, flatShading: true });
    const compassCenter = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.04, 8), compassMat);
    compassCenter.position.y = 0.31;
    miranteGroup.add(compassCenter);

    // Pontas da Rosa dos Ventos
    for (let p = 0; p < 4; p++) {
      const tipGeo = new THREE.ConeGeometry(0.3, 1.8, 3);
      tipGeo.rotateX(Math.PI / 2);
      const tip = new THREE.Mesh(tipGeo, compassMat);
      tip.position.set(0, 0.32, 0);
      tip.rotation.y = p * (Math.PI / 2);
      miranteGroup.add(tip);
    }

    // 3. Guarda-corpo Rústico e Nobre (Balaústres em madeira maciça com corrimão contínuo)
    const railMat = new THREE.MeshLambertMaterial({ color: 0x3E2718 });
    const numPosts = 16;
    for (let r = 0; r < numPosts; r++) {
      const angle = (r / numPosts) * Math.PI * 2;
      // Deixar abertura de entrada ao sul (onde a passarela conecta: ângulo em torno de Math.PI/2)
      if (Math.abs(angle - Math.PI / 2) < 0.38) continue;

      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), railMat);
      post.position.set(Math.cos(angle) * 7.7, 0.75, Math.sin(angle) * 7.7);
      post.castShadow = true;
      miranteGroup.add(post);
    }

    // Corrimão curvado superior de segurança
    const topRailGeo = new THREE.RingGeometry(7.55, 7.85, 24, 1, 0.45, Math.PI * 2 - 0.9);
    const topRail = new THREE.Mesh(topRailGeo, railMat);
    topRail.rotation.x = -Math.PI / 2;
    topRail.rotation.z = Math.PI / 2 + 0.45;
    topRail.position.y = 1.35;
    miranteGroup.add(topRail);

    // 4. Duas Lunetas Turísticas Panorâmicas de Alto Alcance em Latão Nobre
    const brassMat = new THREE.MeshLambertMaterial({ color: 0xEAB308, flatShading: true });
    const brassDarkMat = new THREE.MeshLambertMaterial({ color: 0xCA8A04, flatShading: true });

    const createBinocular = (bx, bz, rotY, rotX) => {
      const binocGroup = new THREE.Group();
      binocGroup.position.set(bx, 0.3, bz);

      // Degrau de apoio para turistas
      const step = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 0.22, 8), plankMat);
      step.position.y = 0.11;
      step.receiveShadow = true;
      binocGroup.add(step);

      // Coluna pedestal de latão
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.18, 1.25, 8), brassMat);
      pedestal.position.y = 0.72;
      pedestal.castShadow = true;
      binocGroup.add(pedestal);

      // Caixa da ótica e tubo da luneta dupla
      const scopeHead = new THREE.Group();
      scopeHead.position.set(0, 1.45, 0);
      scopeHead.rotation.y = rotY;
      scopeHead.rotation.x = rotX;

      const scopeBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.55), brassDarkMat);
      scopeHead.add(scopeBody);

      // Duas lentes objetivas
      const lensL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), brassMat);
      lensL.rotation.x = Math.PI / 2;
      lensL.position.set(-0.12, 0, 0.35);
      scopeHead.add(lensL);

      const lensR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), brassMat);
      lensR.rotation.x = Math.PI / 2;
      lensR.position.set(0.12, 0, 0.35);
      scopeHead.add(lensR);

      binocGroup.add(scopeHead);
      return binocGroup;
    };

    // Luneta Oeste (Apontada para a Prainha e Pôr do Sol)
    miranteGroup.add(createBinocular(-3.6, -2.5, 0.45, 0.18));

    // Luneta Leste (Apontada para o Centro Histórico, Morro do Sol e Baía)
    miranteGroup.add(createBinocular(3.6, -2.5, -0.45, 0.18));

    // 5. Quatro Bancos Coloniais de Jardim em Madeira Maciça e Ferro
    const benchWoodMat = new THREE.MeshLambertMaterial({ color: 0x4E342E });
    const benchLegMat = new THREE.MeshLambertMaterial({ color: 0x1F2937 });

    const createColonialBench = (x, z, rotY) => {
      const bench = new THREE.Group();
      bench.position.set(x, 0.3, z);
      bench.rotation.y = rotY;

      // Pés de ferro fundido
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.55), benchLegMat);
      leg1.position.set(-1.0, 0.22, 0);
      bench.add(leg1);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.55), benchLegMat);
      leg2.position.set(1.0, 0.22, 0);
      bench.add(leg2);

      // Assento ripado
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.52), benchWoodMat);
      seat.position.set(0, 0.46, 0);
      seat.castShadow = true;
      bench.add(seat);

      // Encosto confortável
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.42, 0.08), benchWoodMat);
      back.position.set(0, 0.74, -0.22);
      back.rotation.x = 0.15;
      bench.add(back);

      return bench;
    };

    // Bancos dispostos harmonicamente na curvatura norte do mirante
    miranteGroup.add(createColonialBench(-5.0, 2.5, 0.55));
    miranteGroup.add(createColonialBench(5.0, 2.5, -0.55));
    miranteGroup.add(createColonialBench(-2.2, 5.2, 0.2));
    miranteGroup.add(createColonialBench(2.2, 5.2, -0.2));

    // 6. Pórtico de Entrada do Mirante (Arco Monumental em Troncos Nobres)
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, 7.8);

    const logMat = new THREE.MeshLambertMaterial({ color: 0x3E2723, flatShading: true });
    const postGeo = new THREE.CylinderGeometry(0.24, 0.28, 4.6, 6);

    const postL = new THREE.Mesh(postGeo, logMat);
    postL.position.set(-2.8, 2.2, 0);
    postL.castShadow = true;
    portalGroup.add(postL);

    const postR = new THREE.Mesh(postGeo, logMat);
    postR.position.set(2.8, 2.2, 0);
    postR.castShadow = true;
    portalGroup.add(postR);

    // Viga superior entalhada
    const beam = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.45, 0.5), logMat);
    beam.position.set(0, 4.4, 0);
    beam.castShadow = true;
    portalGroup.add(beam);

    // Placa entalhada: "MIRANTE DA VISTA IMPERIAL"
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.82, 0.12),
      new THREE.MeshLambertMaterial({ color: 0xD97706, flatShading: true })
    );
    signBoard.position.set(0, 3.65, 0);
    signBoard.castShadow = true;
    portalGroup.add(signBoard);

    // Lanternas de Boas-Vindas com iluminação noturna aconchegante
    const lanternMat = new THREE.MeshLambertMaterial({
      color: 0xFEF3C7,
      emissive: 0xF59E0B,
      emissiveIntensity: 1.5,
      flatShading: true
    });
    const lanternL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.48, 0.35), lanternMat);
    lanternL.position.set(-2.8, 3.8, 0.4);
    portalGroup.add(lanternL);

    const lanternR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.48, 0.35), lanternMat);
    lanternR.position.set(2.8, 3.8, 0.4);
    portalGroup.add(lanternR);

    const miranteLight = new THREE.PointLight(0xF59E0B, 2.2, 22);
    miranteLight.position.set(0, 3.8, 0.5);
    portalGroup.add(miranteLight);

    miranteGroup.add(portalGroup);

    // 7. Escadaria Monumental de Acesso em Lajes de Granito Natural conectando à Avenida Central (Route 2)
    const rampMat = new THREE.MeshLambertMaterial({ color: 0x8D99AE, flatShading: true });
    for (let s = 1; s <= 30; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 0.85), rampMat);
      step.position.set(0, 0.15 - s * 0.35, 7.8 + s * 0.65);
      step.receiveShadow = true;
      miranteGroup.add(step);
    }

    this.group.add(miranteGroup);
    this.miranteImperial = miranteGroup;
  }

  // 2. PARQUE EÓLICO DA CHAPADA (3 Turbinas Eólicas Elegantes nos Ventos do Norte)
  createWindTurbines() {
    const turbinePositions = [
      { x: -24, z: -90 },
      { x: 0,   z: -106 },
      { x: 24,  z: -90 }
    ];

    const mastMat = new THREE.MeshLambertMaterial({ color: 0xE2E8F0, flatShading: true });
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC, flatShading: true });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xEF4444 }); // Ponta vermelha de aviação

    turbinePositions.forEach((pos, idx) => {
      const tGroup = new THREE.Group();
      const gy = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 12.0;
      tGroup.position.set(pos.x, gy, pos.z);

      // Deep foundation base ring
      const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 1.2, 8), new THREE.MeshLambertMaterial({ color: 0x475569 }));
      baseMesh.position.y = 0.4;
      tGroup.add(baseMesh);

      // Tapered tower mast (15m tall)
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.75, 14.5, 8), mastMat);
      tower.position.y = 7.6;
      tower.castShadow = true;
      tGroup.add(tower);

      // Nacelle generator pod
      const nacelle = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 2.6), mastMat);
      nacelle.position.set(0, 15.0, 0);
      nacelle.castShadow = true;
      tGroup.add(nacelle);

      // Rotating Rotor Hub & 3 Aerodynamic Blades
      const rotorGroup = new THREE.Group();
      rotorGroup.position.set(0, 15.0, 1.35);

      const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.0, 8), mastMat);
      noseCone.rotation.x = Math.PI / 2;
      rotorGroup.add(noseCone);

      // 3 Blades (120 degrees apart)
      for (let b = 0; b < 3; b++) {
        const bladeAngle = (b / 3) * Math.PI * 2;
        const bladeHolder = new THREE.Group();
        bladeHolder.rotation.z = bladeAngle;

        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 6.2, 0.08), bladeMat);
        blade.position.y = 3.2;
        blade.castShadow = true;
        bladeHolder.add(blade);

        // Red tip marker
        const redTip = new THREE.Mesh(new THREE.BoxGeometry(0.33, 1.0, 0.09), tipMat);
        redTip.position.y = 5.8;
        bladeHolder.add(redTip);

        rotorGroup.add(bladeHolder);
      }

      tGroup.add(rotorGroup);
      this.group.add(tGroup);

      // Register for smooth animation in update loop
      this.windTurbines.push({
        group: tGroup,
        rotor: rotorGroup,
        speed: 1.2 + idx * 0.25
      });
    });
  }

  // 3. MIRANTE DAS PIPAS (Noroeste / Colina do Poente: Deck de Observação & Pipas ao Vento)
  createMiranteDasPipas() {
    const miranteGroup = new THREE.Group();
    const my = this.terrain ? this.terrain.getElevation(-78, -50) : 10.4;
    miranteGroup.position.set(-78, my, -50);

    // Solid wooden cliff-mounted deck (14m diameter)
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x5C4636, flatShading: true });
    const deckMesh = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 7.5, 2.8, 14), deckMat);
    deckMesh.position.y = -1.2;
    deckMesh.receiveShadow = true;
    miranteGroup.add(deckMesh);

    // Deck plank surface
    const plankMat = new THREE.MeshLambertMaterial({ color: 0x8C6B4E, flatShading: true });
    const surface = new THREE.Mesh(new THREE.CylinderGeometry(6.9, 6.9, 0.2, 14), plankMat);
    surface.position.y = 0.1;
    surface.receiveShadow = true;
    miranteGroup.add(surface);

    // Wooden safety rail (guarda-corpo)
    const railMat = new THREE.MeshLambertMaterial({ color: 0x3E2D22 });
    for (let r = 0; r < 14; r++) {
      const angle = (r / 14) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), railMat);
      post.position.set(Math.cos(angle) * 6.6, 0.65, Math.sin(angle) * 6.6);
      miranteGroup.add(post);
    }
    const topRail = new THREE.Mesh(new THREE.RingGeometry(6.4, 6.8, 16), railMat);
    topRail.rotation.x = -Math.PI / 2;
    topRail.position.y = 1.15;
    miranteGroup.add(topRail);

    // Viewing Telescope (Luneta de Observação)
    const brassMat = new THREE.MeshLambertMaterial({ color: 0xD4AF37 });
    const scopeStand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 6), brassMat);
    scopeStand.position.set(0, 0.6, -5.2);
    miranteGroup.add(scopeStand);

    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.1, 8), brassMat);
    scopeTube.rotation.x = Math.PI / 3;
    scopeTube.position.set(0, 1.25, -5.2);
    miranteGroup.add(scopeTube);

    // Wooden benches for citizens to rest and watch the sunset
    const benchMat = new THREE.MeshLambertMaterial({ color: 0x6E4B33 });
    const bench1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.6), benchMat);
    bench1.position.set(-3.2, 0.25, 2.5);
    bench1.rotation.y = 0.4;
    miranteGroup.add(bench1);

    const bench2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.6), benchMat);
    bench2.position.set(3.2, 0.25, 2.5);
    bench2.rotation.y = -0.4;
    miranteGroup.add(bench2);

    this.group.add(miranteGroup);

    // 6 Dynamic Kites flying high above the Mirante in the brisk mountain updraft
    const kiteColors = [0xEF4444, 0x3B82F6, 0xFACC15, 0x10B981, 0x9333EA, 0xF97316];
    for (let k = 0; k < 6; k++) {
      const kGroup = new THREE.Group();
      const kx = -78 + (Math.random() - 0.5) * 18;
      const kz = -50 + (Math.random() - 0.5) * 18;
      const ky = my + 14.0 + Math.random() * 10;
      kGroup.position.set(kx, ky, kz);

      // Diamond kite sail
      const kiteGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 1.2, 0,
        -0.8, 0.2, 0,
        0, -1.0, 0,
        0, 1.2, 0,
        0, -1.0, 0,
        0.8, 0.2, 0
      ]);
      kiteGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      kiteGeo.computeVertexNormals();

      const kMat = new THREE.MeshBasicMaterial({
        color: kiteColors[k % kiteColors.length],
        side: THREE.DoubleSide
      });
      const sail = new THREE.Mesh(kiteGeo, kMat);
      kGroup.add(sail);

      // Bamboo cross sticks
      const stick = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 0.04), new THREE.MeshBasicMaterial({ color: 0xD4B886 }));
      kGroup.add(stick);

      // Fluttering tail ribbon
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.02), new THREE.MeshBasicMaterial({ color: 0xFDFDFD }));
      tail.position.y = -1.8;
      kGroup.add(tail);

      this.group.add(kGroup);

      this.kites.push({
        mesh: kGroup,
        tail: tail,
        baseY: ky,
        baseRotY: Math.random() * Math.PI,
        phase: Math.random() * 10
      });
    }
  }

  // 4. AGROFLORESTA COMUNITÁRIA EM SOCALCOS (Nordeste / Encosta do Levante)
  createAgroflorestaTerraces() {
    const farmGroup = new THREE.Group();
    const fy = this.terrain ? this.terrain.getElevation(75, -45) : 8.5;
    farmGroup.position.set(75, fy, -45);

    // Stepped timber terrace retaining walls (muros de contenção de terraços agrícolas)
    const timberMat = new THREE.MeshLambertMaterial({ color: 0x4A301D, flatShading: true });
    for (let t = -1; t <= 1; t++) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(16.0, 1.2, 0.45), timberMat);
      wall.position.set(0, t * 1.1, t * 4.5);
      wall.receiveShadow = true;
      farmGroup.add(wall);
    }

    // Banana Trees (Bananeiras de encosta com cachos)
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5C4033 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x22C55E, flatShading: true });
    const bananaMat = new THREE.MeshLambertMaterial({ color: 0xEAB308 });

    const bananaSpots = [
      { x: -5.5, z: -3.0 }, { x: -2.0, z: -3.5 }, { x: 3.5, z: -3.0 },
      { x: -4.5, z: 2.0 },  { x: 2.0, z: 2.5 },   { x: 5.5, z: 1.5 }
    ];

    bananaSpots.forEach(pt => {
      const bTree = new THREE.Group();
      bTree.position.set(pt.x, 0.2, pt.z);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.4, 5), trunkMat);
      trunk.position.y = 1.2;
      bTree.add(trunk);

      // Drooping lush leaves
      for (let l = 0; l < 5; l++) {
        const leafAngle = (l / 5) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 1.6), leafMat);
        leaf.position.set(Math.cos(leafAngle) * 0.8, 2.3, Math.sin(leafAngle) * 0.8);
        leaf.rotation.y = leafAngle;
        leaf.rotation.x = 0.45;
        bTree.add(leaf);
      }

      // Yellow banana bunch
      const bunch = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 5), bananaMat);
      bunch.position.set(0.2, 1.6, 0.2);
      bunch.rotation.z = Math.PI;
      bTree.add(bunch);

      farmGroup.add(bTree);
    });

    // Rows of green cabbages / lettuce heads
    const vegMat = new THREE.MeshLambertMaterial({ color: 0x4ADE80, flatShading: true });
    for (let row = -1; row <= 1; row++) {
      for (let col = -5; col <= 5; col += 1.8) {
        const veg = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), vegMat);
        veg.position.set(col, row * 1.1 + 0.35, row * 4.5 + 2.0);
        farmGroup.add(veg);
      }
    }

    // Friendly scarecrow (Espantalho de palha carioca)
    const strawMat = new THREE.MeshLambertMaterial({ color: 0xD97706 });
    const scarecrow = new THREE.Group();
    scarecrow.position.set(0, 0.6, 0);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 4), timberMat);
    post.position.y = 1.1;
    scarecrow.add(post);

    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), timberMat);
    crossArm.position.y = 1.7;
    scarecrow.add(crossArm);

    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.25), new THREE.MeshLambertMaterial({ color: 0xEF4444 }));
    shirt.position.y = 1.4;
    scarecrow.add(shirt);

    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.35, 6), strawMat);
    hat.position.y = 2.0;
    scarecrow.add(hat);

    farmGroup.add(scarecrow);

    // Tool shed and rainwater cistern
    const shed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.2), new THREE.MeshLambertMaterial({ color: 0x78350F }));
    shed.position.set(-6.5, 1.1, -1.0);
    farmGroup.add(shed);

    const cistern = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 8), new THREE.MeshLambertMaterial({ color: 0x0284C7 }));
    cistern.position.set(-6.5, 0.7, 1.2);
    farmGroup.add(cistern);

    this.group.add(farmGroup);
  }

  // 5. NASCENTE DA SERRA (Olho d'Água Cristalino & Aqueduto de Bambu)
  createNascenteDaSerra() {
    const springGroup = new THREE.Group();
    const sy = this.terrain ? this.terrain.getElevation(-8, -65) : 13.5;
    springGroup.position.set(-8, sy, -65);

    // Mossy rock basin
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x4D5A46, flatShading: true });
    for (let r = 0; r < 7; r++) {
      const angle = (r / 7) * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 + Math.random() * 0.4, 0), rockMat);
      rock.position.set(Math.cos(angle) * 1.8, 0.5, Math.sin(angle) * 1.8);
      springGroup.add(rock);
    }

    // Pure spring water surface (azul turquesa cristalino)
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x06B6D4,
      transparent: true,
      opacity: 0.85,
      flatShading: true
    });
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.4, 0.3, 10), waterMat);
    pool.position.y = 0.35;
    springGroup.add(pool);

    // Split-bamboo aqueduct flume carrying water downhill
    const bambooMat = new THREE.MeshLambertMaterial({ color: 0xA3E635 });
    for (let f = 0; f < 3; f++) {
      const flume = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.0, 5, 1, true, 0, Math.PI), bambooMat);
      flume.rotation.z = Math.PI / 2;
      flume.rotation.y = 0.2;
      flume.position.set(2.0 + f * 3.5, 0.2 - f * 0.4, 0.8 + f * 1.2);
      springGroup.add(flume);
    }

    this.group.add(springGroup);
  }

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
  }

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
  }

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
  }

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
  }

  // 10. A TORRE DE TRANSMISSÃO & RÁDIO COMUNITÁRIA (Crista da Serra)
  createTorreDeRadioCume(pos = { x: 0, z: -104 }) {
    const radioGroup = new THREE.Group();
    const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 15.2;
    radioGroup.position.set(pos.x, y, pos.z);

    // Hexagonal granite base plinth
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.6, 1.2, 6),
      new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true })
    );
    plinth.position.y = 0.4;
    plinth.receiveShadow = true;
    radioGroup.add(plinth);

    // Tapered Steel Lattice Tower (15m tall, alternating red & white)
    const redMat = new THREE.MeshLambertMaterial({ color: 0xDC2626 });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC });

    const totalSections = 6;
    for (let s = 0; s < totalSections; s++) {
      const mat = s % 2 === 0 ? redMat : whiteMat;
      const lowerR = 1.4 * (1 - s / (totalSections + 1));
      const upperR = 1.4 * (1 - (s + 1) / (totalSections + 1));
      const secH = 2.4;
      const sec = new THREE.Mesh(new THREE.CylinderGeometry(upperR, lowerR, secH, 4, 1, true), mat);
      sec.position.y = 1.0 + s * secH + secH * 0.5;
      sec.castShadow = true;
      radioGroup.add(sec);
    }

    // Microwave dish antennas
    const dishMat = new THREE.MeshLambertMaterial({ color: 0x94A3B8, flatShading: true });
    const dish1 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.25, 10), dishMat);
    dish1.rotation.z = Math.PI / 2;
    dish1.position.set(0.8, 10.5, 0);
    radioGroup.add(dish1);

    const dish2 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.25, 10), dishMat);
    dish2.rotation.x = Math.PI / 2;
    dish2.position.set(0, 12.0, 0.7);
    radioGroup.add(dish2);

    // Pulsing Red Aviation Beacon Light on Top
    const beaconGeo = new THREE.SphereGeometry(0.22, 6, 6);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 15.6, 0);
    radioGroup.add(beacon);

    const beaconLight = new THREE.PointLight(0xFF0000, 2.0, 24);
    beaconLight.position.set(0, 15.6, 0);
    radioGroup.add(beaconLight);
    this.beaconLight = beaconLight;

    // Technical radio hut (Cabine Técnica da Rádio)
    const hutMat = new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true });
    const hut = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 2.2), hutMat);
    hut.position.set(2.4, 1.4, 1.2);
    hut.castShadow = true;
    radioGroup.add(hut);

    // Small solar panel on hut roof
    const solarMat = new THREE.MeshLambertMaterial({ color: 0x1E3A8A });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.2), solarMat);
    panel.position.set(2.4, 2.45, 1.2);
    panel.rotation.x = 0.25;
    radioGroup.add(panel);

    this.group.add(radioGroup);
  }

  createSolarLamps() {
    this.solarLamps = [];
    const lampCoords = [
      { x: -90, z: 12 },
      { x: -50, z: 8 },
      { x: -6, z: -4 },  // Edge of Samba Plaza (cleanly away from campfire!)
      { x: 45, z: 8 },
      { x: 85, z: 6 },
      { x: 0, z: -55 },
      { x: -75, z: -45 },
      { x: 75, z: -45 },
      { x: -95, z: 0 },   // Vila dos Pescadores do Poente
      { x: -98, z: -55 }, // Mirante do Poente
      { x: 95, z: -18 },  // Grande Olaria
      { x: 98, z: -55 },  // Mirante do Levante
      { x: 0, z: -104 }   // Torre de Rádio
    ];

    lampCoords.forEach(pos => {
      const lampGroup = new THREE.Group();
      const y = this.terrain ? this.terrain.getElevation(pos.x, pos.z) : 6;
      lampGroup.position.set(pos.x, y, pos.z);

      const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 3.5, 5);
      const poleMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 1.75;
      lampGroup.add(pole);

      const solarGeo = new THREE.BoxGeometry(0.8, 0.05, 0.6);
      const solarMat = new THREE.MeshLambertMaterial({ color: 0x1E3A8A });
      const solar = new THREE.Mesh(solarGeo, solarMat);
      solar.position.set(0, 3.55, 0);
      solar.rotation.x = 0.3;
      lampGroup.add(solar);

      const bulbGeo = new THREE.SphereGeometry(0.22, 6, 6);
      const bulbMat = new THREE.MeshLambertMaterial({
        color: 0xFFE066,
        emissive: 0xFFA200,
        emissiveIntensity: 0.2
      });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(0.3, 3.25, 0);
      lampGroup.add(bulb);

      const lampLight = new THREE.PointLight(0xFFA200, 0, 14);
      lampLight.position.set(0.3, 3.1, 0);
      lampGroup.add(lampLight);

      this.group.add(lampGroup);
      this.solarLamps.push({ bulbMat, lampLight });
    });
  }

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
  }

  spawnConstructionPuff(pos) {
    const numCubes = 16;
    for (let i = 0; i < numCubes; i++) {
      const mat = Math.random() > 0.5 ? this.sharedPuffMat1 : this.sharedPuffMat2;
      const cube = new THREE.Mesh(this.sharedPuffGeo, mat);
      cube.position.set(
        pos.x + (Math.random() - 0.5) * 2.8,
        pos.y + 2.5 + Math.random() * 2.5,
        pos.z + (Math.random() - 0.5) * 2.8
      );

      this.group.add(cube);
      this.particles.push({
        mesh: cube,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 2.5,
          1.8 + Math.random() * 2.5,
          (Math.random() - 0.5) * 2.5
        ),
        life: 1.0
      });
    }
  }

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

  update(delta) {
    const time = performance.now() * 0.003;

    // 1. UPDATE ONGOING VISUAL NEW HOUSE CONSTRUCTIONS
    for (let cIdx = this.activeConstructions.length - 1; cIdx >= 0; cIdx--) {
      const c = this.activeConstructions[cIdx];

      // Phase 0: Waiting for materials to be delivered by pushcart courier from Olaria
      if (c.state === 'WAITING_SUPPLIES') {
        c.supplyWaitTimer = (c.supplyWaitTimer || 0) + delta;
        if (c.supplyWaitTimer > 8.0) {
          // Automatic timeout fallback: supplies arrive safely, recruit workers!
          c.state = 'WAITING_WORKERS';
          if (this.npcManager) {
            c.workers = this.npcManager.assignWorkersToSite(c);
          }
        }
        continue;
      }

      // Phase 1: Waiting for citizen workers to arrive at the site
      if (c.state === 'WAITING_WORKERS') {
        c.workerWaitTimer = (c.workerWaitTimer || 0) + delta;
        const anyArrived = c.workers && c.workers.some(w => w.builderState === 'working');
        if (anyArrived || (!c.workers || c.workers.length === 0)) {
          c.state = 'ACTIVE_WORK';
          this.spawnConstructionPuff({
            x: c.plateau.x,
            y: c.siteGroup.position.y + 0.3,
            z: c.plateau.z
          });
        }
        continue; // Wait until workers arrive before advancing construction progress!
      }

      // Phase 2: Active Construction & Real-Time Terraforming
      c.progress += delta / c.duration;

      // Sub-phase A: Terraforming / Excavating (0.0 to 0.28) ~ 4.5 seconds
      if (c.progress <= 0.28) {
        const terraProgress = c.progress / 0.28;
        if (c.padMesh) {
          c.padMesh.scale.set(terraProgress, Math.max(0.1, terraProgress), terraProgress);
        }
      }

      // Sub-phase B: Scaffolding & Foundation (0.28 to 0.52) ~ 4 seconds
      if (c.progress > 0.28 && c.scaffoldGroup) {
        c.scaffoldGroup.visible = true;
        const scafProgress = Math.min(1.0, (c.progress - 0.28) / 0.24);
        const steppedScaf = Math.floor(scafProgress * 4) / 4; // Andaime por andaime (25%, 50%, 75%, 100%)
        c.scaffoldGroup.scale.y = 0.1 + steppedScaf * 0.9;
      }

      // Sub-phase C: Masonry & Walls (0.50 to 0.85) ~ 5.5 seconds
      if (c.progress > 0.50 && c.housePreviewGroup) {
        c.housePreviewGroup.visible = true;
        const wallProgress = Math.min(1.0, (c.progress - 0.50) / 0.35);
        const steppedWall = Math.floor(wallProgress * 4) / 4; // Tijolo por tijolo (lajes)
        c.housePreviewGroup.scale.y = 0.05 + steppedWall * 0.95;
      }

      // Steady rhythmic masonry & hammer audio during active construction
      c.soundTimer = (c.soundTimer || 0) + delta;
      const soundInterval = 0.40 + (c.soundJitter || 0);
      if (c.soundTimer >= soundInterval && c.progress < 0.98) {
        c.soundTimer = 0;
        c.soundJitter = (Math.random() - 0.5) * 0.12; // Organic human rhythm cadence [0.34s .. 0.46s]
        const soundPos = {
          x: c.plateau.x + (Math.random() - 0.5) * 1.5,
          y: c.siteGroup.position.y + 0.5 + (c.progress > 0.5 ? 1.5 : 0),
          z: c.plateau.z + (Math.random() - 0.5) * 1.5
        };
        if (this.soundtrack) {
          this.soundtrack.playConstructionSound(soundPos);
        }
      }

      // Visual dust puffs while excavating / building
      c.particleTimer += delta;
      if (c.particleTimer >= 0.65 && c.progress < 0.95) {
        c.particleTimer = 0;
        const puffPos = {
          x: c.plateau.x + (Math.random() - 0.5) * 2.2,
          y: c.siteGroup.position.y + 0.4 + (c.progress > 0.5 ? 1.4 : 0),
          z: c.plateau.z + (Math.random() - 0.5) * 2.2
        };
        this.spawnConstructionPuff(puffPos);
      }

      // Finished!
      if (c.progress >= 1.0) {
        this.group.remove(c.siteGroup);

        // Permanently build finalized Level 1 house
        const finalHouse = this.buildHouse(c.plateau, 1, c.paletteItem);
        if (finalHouse) {
          this.houses.push(finalHouse);

          // Big celebratory dust burst & chime!
          this.spawnConstructionPuff(finalHouse.position);
          if (this.soundtrack) {
            this.soundtrack.playCelebrationChime(finalHouse.position);
          }
        }

        // Put citizen workers into celebratory cheer mode!
        if (c.workers) {
          c.workers.forEach(w => {
            w.builderState = 'celebrating';
            w.cheerTimer = 3.5;
          });
        }

        if (c.onComplete) {
          c.onComplete(finalHouse);
        }

        this.activeConstructions.splice(cIdx, 1);
      }
    }

    // 2. UPDATE ONGOING HOUSE UPGRADES (Puxadinhos & Lajes)
    for (let uIdx = this.activeUpgrades.length - 1; uIdx >= 0; uIdx--) {
      const u = this.activeUpgrades[uIdx];

      if (u.state === 'WAITING_WORKERS') {
        const anyArrived = u.workers && u.workers.some(w => w.builderState === 'working');
        if (anyArrived || !u.workers || u.workers.length === 0) {
          u.state = 'ACTIVE_WORK';
          this.spawnConstructionPuff({
            x: u.house.position.x,
            y: u.house.position.y + 2.5,
            z: u.house.position.z
          });
        }
        continue;
      }

      u.progress += delta / u.duration;

      // Steady rhythmic masonry & hammer audio during upper floor upgrade
      u.soundTimer = (u.soundTimer || 0) + delta;
      const uSoundInterval = 0.42 + (u.soundJitter || 0);
      if (u.soundTimer >= uSoundInterval && u.progress < 0.98) {
        u.soundTimer = 0;
        u.soundJitter = (Math.random() - 0.5) * 0.12;
        const soundPos = {
          x: u.house.position.x + (Math.random() - 0.5) * 1.5,
          y: u.house.position.y + u.house.level * 2.5 + 0.5,
          z: u.house.position.z + (Math.random() - 0.5) * 1.5
        };
        if (this.soundtrack) {
          this.soundtrack.playConstructionSound(soundPos);
        }
      }

      // Periodic dust puffs during upper floor masonry
      u.particleTimer += delta;
      if (u.particleTimer >= 0.70 && u.progress < 0.95) {
        u.particleTimer = 0;
        const puffPos = {
          x: u.house.position.x + (Math.random() - 0.5) * 2.0,
          y: u.house.position.y + u.house.level * 2.5 + 0.5,
          z: u.house.position.z + (Math.random() - 0.5) * 2.0
        };
        this.spawnConstructionPuff(puffPos);
      }

      // Upgrade finished!
      if (u.progress >= 1.0) {
        this.group.remove(u.scaffoldGroup);

        u.house.level++;
        if (u.house.level === 2) {
          this.buildStory(u.house, 1);
          this.buildLaje(u.house, 2);
        } else if (u.house.level === 3) {
          this.buildStory(u.house, 2);
          this.buildLaje(u.house, 3);
        }
        u.house.residents += 3;
        u.house.wealth += 25;
        u.house.isUpgrading = false;

        this.spawnConstructionPuff(u.house.position);
        if (this.soundtrack) {
          this.soundtrack.playCelebrationChime(u.house.position);
        }

        if (u.workers) {
          u.workers.forEach(w => {
            w.builderState = 'celebrating';
            w.cheerTimer = 3.5;
          });
        }

        if (u.onComplete) {
          u.onComplete(u.house);
        }

        this.activeUpgrades.splice(uIdx, 1);
      }
    }

    // 3. INTERACTIVE SOCCER MATCH PHYSICS (Pelada de Várzea no Campinho)
    if (this.soccerBall) {
      if (this.soccerGoalCooldown > 0) {
        this.soccerGoalCooldown -= delta;
      }

      this.soccerBall.position.x += this.soccerBallVel.x * delta;
      this.soccerBall.position.z += this.soccerBallVel.z * delta;
      this.soccerBallVel.multiplyScalar(0.965);

      // Roll ball rotation
      this.soccerBall.rotation.z -= this.soccerBallVel.x * delta * 5.0;
      this.soccerBall.rotation.x += this.soccerBallVel.z * delta * 5.0;

      // Pitch boundaries (Center x: 55, z: 4. Fence limits: x [45, 65], z [-2.8, 10.8])
      const minX = 45.2;
      const maxX = 64.8;
      const minZ = -2.8;
      const maxZ = 10.8;

      // Side fence bounce
      if (this.soccerBall.position.z < minZ) {
        this.soccerBall.position.z = minZ;
        this.soccerBallVel.z = -this.soccerBallVel.z * 0.7;
      } else if (this.soccerBall.position.z > maxZ) {
        this.soccerBall.position.z = maxZ;
        this.soccerBallVel.z = -this.soccerBallVel.z * 0.7;
      }

      // Goal lines & mouths (Mouth z: 2.2 to 5.8)
      const inGoalMouth = (this.soccerBall.position.z > 2.2 && this.soccerBall.position.z < 5.8);

      if (this.soccerBall.position.x > maxX) {
        if (inGoalMouth && this.soccerGoalCooldown <= 0) {
          // GOAL FOR YELLOW TEAM!
          this.soccerScore.yellow++;
          this.soccerGoalCooldown = 4.0;
          this.spawnConstructionPuff(this.soccerBall.position);
          if (this.soundtrack) this.soundtrack.playGoalWhistle(this.soccerBall.position);
          if (this.onSoccerGoal) this.onSoccerGoal('Amarelo Canário', this.soccerScore);
        } else if (!inGoalMouth) {
          this.soccerBall.position.x = maxX;
          this.soccerBallVel.x = -this.soccerBallVel.x * 0.7;
        }
      } else if (this.soccerBall.position.x < minX) {
        if (inGoalMouth && this.soccerGoalCooldown <= 0) {
          // GOAL FOR BLUE TEAM!
          this.soccerScore.blue++;
          this.soccerGoalCooldown = 4.0;
          this.spawnConstructionPuff(this.soccerBall.position);
          if (this.soundtrack) this.soundtrack.playGoalWhistle(this.soccerBall.position);
          if (this.onSoccerGoal) this.onSoccerGoal('Azul Guanabara', this.soccerScore);
        } else if (!inGoalMouth) {
          this.soccerBall.position.x = minX;
          this.soccerBallVel.x = -this.soccerBallVel.x * 0.7;
        }
      }

      // Reposition ball to center if deep in net or after cooldown
      if (this.soccerGoalCooldown > 0 && this.soccerGoalCooldown < 1.8 && Math.hypot(this.soccerBall.position.x - 55, this.soccerBall.position.z - 4) > 1.5) {
        this.soccerBall.position.set(55, this.soccerBallBaseY || 3.88, 4);
        this.soccerBallVel.set(0, 0, 0);
      }

      // Idle ball recovery watchdog (guarantees the match never stalls or deadlocks)
      const ballSpeed = Math.hypot(this.soccerBallVel.x, this.soccerBallVel.z);
      if (ballSpeed < 0.12 && this.soccerGoalCooldown <= 0) {
        this.soccerBallIdleTimer = (this.soccerBallIdleTimer || 0) + delta;
        if (this.soccerBallIdleTimer > 3.0) {
          this.soccerBallIdleTimer = 0;
          const kickDirX = (Math.random() < 0.5 ? 1 : -1) * (0.65 + Math.random() * 0.35);
          const kickDirZ = (Math.random() - 0.5) * 1.6;
          this.kickSoccerBall(kickDirX, kickDirZ, 5.2);
        }
      } else {
        this.soccerBallIdleTimer = 0;
      }
    }

    // Animate Wind Turbines in the mountain breeze
    this.windTurbines.forEach(wt => {
      wt.rotor.rotation.z += delta * wt.speed;
    });

    // Animate kites dancing above Mirante das Pipas
    this.kites.forEach(k => {
      k.mesh.position.y = k.baseY + Math.sin(time * 3 + k.phase) * 0.45;
      k.mesh.rotation.z = Math.sin(time * 2.2 + k.phase) * 0.18;
      k.mesh.rotation.y = k.baseRotY + Math.sin(time * 1.5 + k.phase) * 0.15;
      k.tail.rotation.x = Math.sin(time * 6 + k.phase) * 0.35;
    });

    // Flutter clotheslines
    this.clotheslines.forEach(item => {
      const flutter = Math.sin(time * 3 + item.phase) * 0.18;
      item.mesh.rotation.x = flutter;
    });

    // Bob boats
    this.boats.forEach(b => {
      b.group.position.y = b.baseY + Math.sin(time * 2 + b.phase) * 0.12;
      b.group.rotation.z = Math.sin(time * 1.5 + b.phase) * 0.05;
    });

    // Dynamic Beach Umbrellas: Presence scales smoothly with number of people on the beach
    if (this.beachUmbrellas && this.beachUmbrellas.length > 0) {
      let beachCrowd = 4;
      if (this.npcManager && this.npcManager.npcs) {
        beachCrowd = this.npcManager.npcs.filter(n => n.group.position.z >= 22.0 && Math.abs(n.group.position.x) <= 105).length;
      }
      // Target active umbrellas scales from 3 up to all 12
      const targetActive = Math.min(this.beachUmbrellas.length, Math.max(3, Math.floor(beachCrowd / 1.5)));

      this.beachUmbrellas.forEach(u => {
        u.targetScale = (u.order < targetActive) ? 1.0 : 0.001;
        u.currentScale += (u.targetScale - u.currentScale) * Math.min(1.0, delta * 3.2);
        u.group.scale.set(u.currentScale, u.currentScale, u.currentScale);
        u.group.visible = u.currentScale > 0.05;
      });
    }

    // Altinha Duo Match on the East Shore (Organic, Athletic & Rhythmic Beach Soccer)
    if (this.altinhaMatch) {
      const alt = this.altinhaMatch;
      alt.progress += delta * 1.35;

      const pStart = alt.direction === 1 ? alt.p1Pos : alt.p2Pos;
      const pEnd = alt.direction === 1 ? alt.p2Pos : alt.p1Pos;
      const sender = alt.direction === 1 ? alt.p1 : alt.p2;
      const receiver = alt.direction === 1 ? alt.p2 : alt.p1;
      const senderTorso = alt.direction === 1 ? alt.p1Torso : alt.p2Torso;
      const receiverTorso = alt.direction === 1 ? alt.p2Torso : alt.p1Torso;
      const senderLegR = alt.direction === 1 ? alt.p1LegR : alt.p2LegR;
      const senderLegL = alt.direction === 1 ? alt.p1LegL : alt.p2LegL;
      const receiverLegR = alt.direction === 1 ? alt.p2LegR : alt.p1LegR;
      const receiverLegL = alt.direction === 1 ? alt.p2LegL : alt.p1LegL;
      const senderHead = alt.direction === 1 ? alt.p1Head : alt.p2Head;
      const receiverHead = alt.direction === 1 ? alt.p2Head : alt.p1Head;
      const receiverArmL = alt.direction === 1 ? alt.p2ArmL : alt.p1ArmL;
      const receiverArmR = alt.direction === 1 ? alt.p2ArmR : alt.p1ArmR;

      // Both players bounce rhythmically on their toes with active beach rhythm
      const bounce1 = Math.abs(Math.sin(time * 5.5)) * 0.08;
      const bounce2 = Math.abs(Math.sin(time * 5.5 + 0.8)) * 0.08;
      alt.p1.position.y = alt.p1Pos.y + bounce1;
      alt.p2.position.y = alt.p2Pos.y + bounce2;

      // Natural torso rocking & balance micro-adjustments
      alt.p1.rotation.z = Math.sin(time * 2.8) * 0.04;
      alt.p2.rotation.z = -Math.sin(time * 2.8) * 0.04;

      if (alt.progress < 1.0) {
        const t = alt.progress;

        // Ball parabolic trajectory with dynamic lateral curving
        alt.ball.position.x = pStart.x + (pEnd.x - pStart.x) * t;
        alt.ball.position.z = pStart.z + (pEnd.z - pStart.z) * t + Math.sin(t * Math.PI) * alt.lateralDrift;
        alt.ball.position.y = (pStart.y + (pEnd.y - pStart.y) * t) + 0.90 + Math.sin(t * Math.PI) * alt.arcHeight;

        // Realistic ball spin
        alt.ball.rotation.x += delta * 12 * alt.direction;
        alt.ball.rotation.y += delta * 8;

        // Sender recovery: smoothly returns limbs to ready athletic stance
        if (t > 0.22) {
          senderLegR.rotation.x = Math.max(0, senderLegR.rotation.x - delta * 4.5);
          senderLegL.rotation.x = Math.max(0, senderLegL.rotation.x - delta * 4.5);
          senderTorso.rotation.x = Math.max(0, senderTorso.rotation.x - delta * 3.5);
          senderHead.rotation.x = Math.max(0, senderHead.rotation.x - delta * 3.5);
        }

        // Receiver active anticipation as ball approaches (t > 0.60)
        if (t > 0.60) {
          const prepT = (t - 0.60) / 0.40;
          // Open arms for balance
          receiverArmL.rotation.z = -0.35 - prepT * 0.45;
          receiverArmR.rotation.z = 0.35 + prepT * 0.45;

          if (alt.touchType === 'head') {
            // Jump off the sand into the air for athletic header!
            receiver.position.y += Math.sin(prepT * Math.PI) * 0.38;
            receiverHead.rotation.x = -prepT * 0.50;
            receiverTorso.rotation.x = -prepT * 0.15;
          } else if (alt.touchType === 'knee') {
            // Thigh lift to cushion or pop the ball up
            receiverLegR.rotation.x = -prepT * 1.25;
            receiverTorso.rotation.x = -prepT * 0.12;
          } else if (alt.touchType === 'foot_l') {
            // Left foot volley with torso lean
            receiverLegL.rotation.x = -prepT * 1.18;
            receiverTorso.rotation.x = prepT * 0.25;
          } else {
            // Right foot volley with torso lean
            receiverLegR.rotation.x = -prepT * 1.22;
            receiverTorso.rotation.x = prepT * 0.26;
          }
        }
      } else {
        // TOUCH! Ball hits player's foot, knee, or forehead!
        alt.progress = 0.0;
        alt.direction = -alt.direction;
        alt.rally = (alt.rally || 0) + 1;

        // Sand puff at touch point & spatial audio
        this.spawnConstructionPuff(alt.ball.position);
        if (this.soundtrack) {
          this.soundtrack.playAltinhaKick(alt.ball.position);
        }

        // Randomize touch type for next receiver
        const touches = ['foot_r', 'foot_l', 'knee', 'head'];
        alt.touchType = touches[Math.floor(Math.random() * touches.length)];

        // Dynamic arc height based on touch type
        if (alt.touchType === 'head') {
          alt.arcHeight = 2.8 + Math.random() * 0.5; // High floating loop
        } else if (alt.touchType === 'knee') {
          alt.arcHeight = 1.8 + Math.random() * 0.4; // Controlled pop
        } else {
          alt.arcHeight = 2.2 + Math.random() * 0.6; // Classic dipping volley
        }
        alt.lateralDrift = (Math.random() - 0.5) * 0.8; // Organic lateral curving
      }
    }

    // Leaning Coconut Palms Wind Sway & Maresia Audio
    if (this.beachPalms) {
      this.beachPalms.forEach(p => {
        const frondSway = Math.sin(time * 1.8 + p.phase) * 0.14;
        const frondBob = Math.cos(time * 1.4 + p.phase) * 0.09;
        if (p.crown) {
          p.crown.rotation.z = Math.sin(time * 1.3 + p.phase) * 0.05;
          p.crown.rotation.x = Math.cos(time * 1.1 + p.phase) * 0.04;
        }
        if (p.fronds) {
          p.fronds.forEach((f, fIdx) => {
            f.rotation.z = frondSway * (fIdx % 2 === 0 ? 1 : -0.7);
            f.rotation.x = Math.PI / 2.5 + frondBob * 0.5;
          });
        }
      });

      // Ambient Maresia coastal breeze sound
      this.maresiaAudioTimer = (this.maresiaAudioTimer || 0) + delta;
      if (this.maresiaAudioTimer > 8.5) {
        this.maresiaAudioTimer = 0;
        if (this.soundtrack && this.beachPalms.length > 0) {
          const samplePalm = this.beachPalms[Math.floor(Math.random() * this.beachPalms.length)];
          this.soundtrack.playMaresiaBreeze(samplePalm.position);
        }
      }
    }

    // Animate Radio Tower aviation beacon & Brick Kiln fires
    if (this.beaconLight) {
      this.beaconLight.intensity = Math.sin(time * 3.5) > 0.1 ? 2.5 : 0.2;
    }
    if (this.kilnFire) {
      this.kilnFire.intensity = 1.6 + Math.sin(time * 5.0) * 0.4;
    }

    // Dynamic Night Lighting (Windows, Solar Streetlamps & Rotating Lighthouse Beam)
    this.updateNightLighting(delta, time);

    // Lajes Vivas (Barbecue smoke puffs drifting up into the air)
    this.updateLajesAndSmoke(delta, time);

    // Autonomous Caiçara Fishing Expeditions (Net casting, gaivotas flocking, hauling catch)
    this.updateExpeditionBoats(delta, time);

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta * 1.3;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.rotation.x += delta * 3;
      p.mesh.rotation.y += delta * 2;
      p.mesh.material.opacity = Math.max(0, p.life);

      if (p.life <= 0) {
        this.group.remove(p.mesh);
        // Do not dispose geometry/material because they are shared!
        this.particles.splice(i, 1);
      }
    }
  }

  // =========================================================================
  // DYNAMIC NIGHT LIGHTING & ATMOSPHERE
  // =========================================================================
  updateNightLighting(delta, time) {
    const timeInfo = this.env ? this.env.getTimeOfDay() : { phase: 'day', progress: 0 };
    const phase = (typeof timeInfo === 'string') ? timeInfo : (timeInfo.phase || 'day');
    const progress = (typeof timeInfo === 'object' && timeInfo.progress !== undefined) ? timeInfo.progress : 0;

    let nightFactor = 0.0;
    if (phase === 'night') {
      nightFactor = 1.0;
    } else if (phase === 'sunset') {
      nightFactor = 0.45 + 0.55 * Math.sin(progress * Math.PI);
    } else if (phase === 'dawn') {
      nightFactor = Math.max(0.0, 0.6 * (1.0 - progress));
    } else {
      nightFactor = 0.0;
    }

    // 1. House Windows: Slate blue reflection by day -> Radiant glowing golden homes at dusk & night
    if (this.windowMeshes && this.windowMeshes.length > 0) {
      const isLit = nightFactor > 0.08;
      for (let i = 0; i < this.windowMeshes.length; i++) {
        const win = this.windowMeshes[i];
        if (win.material) {
          if (isLit) {
            win.material.color.setHex(0xFDE047);
            win.material.emissive.setHex(0xF59E0B);
            win.material.emissiveIntensity = 1.35 * nightFactor;
          } else {
            win.material.color.setHex(0x415A77);
            win.material.emissive.setHex(0x000000);
            win.material.emissiveIntensity = 0.0;
          }
        }
      }
    }

    // 2. Solar Streetlamps along highways, plazas and promenades
    if (this.solarLamps && this.solarLamps.length > 0) {
      for (let i = 0; i < this.solarLamps.length; i++) {
        const lamp = this.solarLamps[i];
        if (lamp.bulbMat) {
          lamp.bulbMat.emissiveIntensity = 0.2 + 1.2 * nightFactor;
        }
        if (lamp.lampLight) {
          lamp.lampLight.intensity = 2.4 * nightFactor;
        }
      }
    }

    // 3. Beachfront Kiosks: Warm golden lanterns lighting the sand promenade
    if (this.kioskLamps && this.kioskLamps.length > 0) {
      for (let i = 0; i < this.kioskLamps.length; i++) {
        const kl = this.kioskLamps[i];
        if (kl.light) {
          kl.light.intensity = 2.2 * nightFactor;
        }
        if (kl.mat) {
          kl.mat.emissiveIntensity = 0.2 + 1.1 * nightFactor;
        }
      }
    }

    // 4. Samba Plaza Campfire & Festive Atmosphere
    if (this.sambaPlaza) {
      const sambaLight = this.sambaPlaza.children.find(c => c.isPointLight);
      if (sambaLight) {
        const isSambaActive = (phase === 'night' || phase === 'sunset');
        sambaLight.intensity = isSambaActive
          ? (2.8 + Math.sin(time * 14.0) * 0.7 + Math.cos(time * 22.0) * 0.4)
          : 1.2;
      }
    }

    // 5. Rotating 360-degree Lighthouse Beam at night & sunset
    if (this.lhBeamGroup) {
      const isBeamActive = (phase === 'night' || phase === 'sunset');
      this.lhBeamGroup.visible = isBeamActive;
      if (isBeamActive) {
        this.lhBeamGroup.rotation.y += delta * 0.22;
      }
    }
  }

  // =========================================================================
  // LAJES VIVAS & CHURRASQUEIRA SMOKE PARTICLES
  // =========================================================================
  updateLajesAndSmoke(delta, time) {
    const timeInfo = this.env ? this.env.getTimeOfDay() : 'day';
    const phase = (typeof timeInfo === 'string') ? timeInfo : (timeInfo.phase || 'day');
    const isNight = (phase === 'night' || phase === 'sunset');

    if (this.lajeBBQs && this.lajeBBQs.length > 0) {
      for (let b = 0; b < this.lajeBBQs.length; b++) {
        const bbq = this.lajeBBQs[b];
        // Apenas algumas casas decidem fazer churrasco à noite (aprox 50%)!
        const isGrillingTonight = isNight && (b % 2 === 0);

        if (bbq.churrasqueiro) {
          bbq.churrasqueiro.visible = isGrillingTonight;
          if (isGrillingTonight) {
            // Animação realista do morador assando a carne na laje:
            // 1. Move-se suavemente de um lado para o outro em frente à churrasqueira e mesa
            bbq.churrasqueiro.position.x = 0.55 + Math.sin(time * 1.6 + b) * 0.16;
            // 2. Movimento de braço virando os espetos na brasa
            if (bbq.armR) {
              bbq.armR.rotation.x = -0.45 + Math.sin(time * 4.2 + b) * 0.32;
            }
            // 3. Rotação sutil do tronco conferindo a carne e a mesa
            if (bbq.torso) {
              bbq.torso.rotation.y = Math.sin(time * 1.6 + b) * 0.18;
            }
          }
        }

        if (bbq.coals && bbq.coals.material) {
          if (isGrillingTonight) {
            bbq.coals.material.color.setHex(0xFF4500);
          } else {
            bbq.coals.material.color.setHex(0x2B2B2B);
          }
        }

        if (isGrillingTonight) {
          bbq.timer = (bbq.timer || 0) + delta;
          if (bbq.timer > 0.48) {
            bbq.timer = 0;
            this.spawnSmokePuff(bbq.pos);
          }
        }
      }
    }

    // Update rising smoke particles
    for (let s = this.smokeParticles.length - 1; s >= 0; s--) {
      const smk = this.smokeParticles[s];
      smk.life -= delta * 0.9;
      smk.mesh.position.addScaledVector(smk.vel, delta);
      const scaleInc = 1.0 + delta * 0.65;
      smk.mesh.scale.multiplyScalar(scaleInc);
      if (smk.mesh.material) {
        smk.mesh.material.opacity = Math.max(0, smk.life * 0.32);
      }

      if (smk.life <= 0) {
        this.group.remove(smk.mesh);
        // Do not dispose because it's shared
        this.smokeParticles.splice(s, 1);
      }
    }
  }

  spawnSmokePuff(pos) {
    if (this.smokeParticles.length > 45) return; // Particle pool limit
    const puff = new THREE.Mesh(this.sharedSmokeGeo, this.sharedSmokeMat);
    puff.position.copy(pos);
    puff.position.x += (Math.random() - 0.5) * 0.2;
    puff.position.z += (Math.random() - 0.5) * 0.2;

    this.group.add(puff);
    this.smokeParticles.push({
      mesh: puff,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.12 - 0.16, // Gentle sea breeze westward drift
        0.75 + Math.random() * 0.35,         // Upward draft
        (Math.random() - 0.5) * 0.12
      ),
      life: 1.6 + Math.random() * 0.5
    });
  }

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
          this.spawnConstructionPuff(boat.currentPos);
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
  }

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
}
