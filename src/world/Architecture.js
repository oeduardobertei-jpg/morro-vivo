import * as THREE from 'three';
import { HousesMixin } from './architecture/houses.js';
import { RoadsMixin } from './architecture/roads.js';
import { WestCoastMixin } from './architecture/westCoast.js';
import { BeachLifeMixin } from './architecture/beachLife.js';
import { HillsidesMixin } from './architecture/hillsides.js';
import { CommunityMixin } from './architecture/community.js';
import { HighlandsMixin } from './architecture/highlands.js';
import { UpdatesMixin } from './architecture/updates.js';

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

    // Construction Particles Palette (Authentic carioca brick & mortar v1.2.4)
    this.sharedPuffGeo = new THREE.DodecahedronGeometry(0.24, 0); // Visible & impactful from isometric orbit
    this.puffMatBrick = new THREE.MeshBasicMaterial({ color: 0xC2410C, transparent: true, opacity: 0.85, depthWrite: false });
    this.puffMatCement = new THREE.MeshBasicMaterial({ color: 0xE2E8F0, transparent: true, opacity: 0.85, depthWrite: false });
    this.puffMatWood = new THREE.MeshBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.85, depthWrite: false });

    // Thematic Beach Stall Materials & Geometries
    this.stallMatCoco = new THREE.MeshBasicMaterial({ color: 0x38BDF8, transparent: true, opacity: 0.85, depthWrite: false });
    this.stallMatMate = new THREE.MeshBasicMaterial({ color: 0xD97706, transparent: true, opacity: 0.85, depthWrite: false });
    this.stallMatLemon = new THREE.MeshBasicMaterial({ color: 0xFEF08A, transparent: true, opacity: 0.85, depthWrite: false });
    this.stallMatAcai = new THREE.MeshBasicMaterial({ color: 0x7E22CE, transparent: true, opacity: 0.85, depthWrite: false });
    this.stallMatSteam = new THREE.MeshBasicMaterial({ color: 0xFEF3C7, transparent: true, opacity: 0.70, depthWrite: false });
    this.stallMatCoin = new THREE.MeshBasicMaterial({ color: 0x10B981, transparent: true, opacity: 0.90, depthWrite: false });
    
    this.stallDropletGeo = new THREE.DodecahedronGeometry(0.14, 0);
    this.stallCoinGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 8);
    this.stallCoinGeo.rotateX(Math.PI / 2);
    
    this.sharedSmokeGeo = new THREE.DodecahedronGeometry(0.16, 0);
    this.sharedSmokeMat = new THREE.MeshBasicMaterial({ color: 0xE2E8F0, transparent: true, opacity: 0.20, depthWrite: false });

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

}

Object.assign(Architecture.prototype, HousesMixin, RoadsMixin, WestCoastMixin, BeachLifeMixin, HillsidesMixin, CommunityMixin, HighlandsMixin, UpdatesMixin);
