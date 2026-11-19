import * as THREE from 'three';
import { CURATED_PALETTE, getSharedStylizedMaterial, createStylizedMaterial } from '../render/StylizedMaterials.js';
import { HousesMixin } from './architecture/houses.js';
import { RoadsMixin } from './architecture/roads.js';
import { WestCoastMixin } from './architecture/westCoast.js';
import { BeachLifeMixin } from './architecture/beachLife.js';
import { HillsidesMixin } from './architecture/hillsides.js';
import { CommunityMixin } from './architecture/community.js';
import { HighlandsMixin } from './architecture/highlands.js';
import { UpdatesMixin } from './architecture/updates.js';
import { MobilityMixin } from './architecture/mobility.js';

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
    this.sharedFishMat = getSharedStylizedMaterial(0xDCE4EC, 'ceramic', { flatShading: true, roughness: 0.35, metalness: 0.15 });

    // Shared Water Tank Geometries & Material (v1.1 Performance Optimization)
    this.sharedWaterTankGeo = new THREE.CylinderGeometry(0.65, 0.55, 1.1, 7);
    this.sharedWaterTankLidGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.14, 7);
    this.sharedWaterTankMat = getSharedStylizedMaterial(0x1B78B4, 'ceramic', { flatShading: true, roughness: 0.42 });

    // Janelas PBR compartilhadas (3 variantes de brilho noturno para evitar janelas idênticas e economizar draw calls)
    this.sharedWindowMats = [
      createStylizedMaterial({ color: 0x3D5570, roughness: 0.20, metalness: 0.12 }, 'ceramic', { roughness: 0.20, metalness: 0.12 }),
      createStylizedMaterial({ color: 0x45607D, roughness: 0.24, metalness: 0.10 }, 'ceramic', { roughness: 0.24, metalness: 0.10 }),
      createStylizedMaterial({ color: 0x31455A, roughness: 0.28, metalness: 0.08 }, 'ceramic', { roughness: 0.28, metalness: 0.08 })
    ];
    // Marca como emissivo dinâmico para que StaticBatcher agrupe todas as janelas compartilhando o material vivo (acendem à noite em O(1)!)
    this.sharedWindowMats.forEach(m => { m.userData.dynamicEmissive = true; });

    // Zonas de Permanência Orgânica (Bancos & Botecos)
    this.botecoSpots = [];
    this.alamedaBenches = [];

    // Global map of all roads and pathways to prevent houses from spawning on top of them
    this.infrastructureNodes = [];

    // Paleta curada com harmonia cromática ("Maquete Carioca Viva")
    this.palette = CURATED_PALETTE;

    this.scene.add(this.group);
  }

  setNPCManager(npcManager) {
    this.npcManager = npcManager;
  }

  setSoundtrack(soundtrack) {
    this.soundtrack = soundtrack;
  }

}

Object.assign(Architecture.prototype, HousesMixin, RoadsMixin, WestCoastMixin, BeachLifeMixin, HillsidesMixin, CommunityMixin, HighlandsMixin, UpdatesMixin, MobilityMixin);
