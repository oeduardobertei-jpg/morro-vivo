import * as THREE from 'three';

export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.palms = [];
    this.plateaus = [];
    this.init();
    this.scene.add(this.group);
  }

  // Smooth, gentle, rolling Rio de Janeiro coastal landscape
  // Continental scale encompassing Western Highlands, Central Morro, Northern Serra, and Eastern Highlands
  getElevation(x, z) {
    // Shoreline curve (grand crescent Atlantic bay with wide golden sand beach)
    const shoreZ = 74.0 + Math.sin(x * 0.015) * 3.5;

    // Past shoreline: smooth, natural coastal seabed shelf (no sudden jagged cliff drop!)
    if (z > shoreZ) {
      const dz = z - shoreZ;
      if (dz <= 18.0) {
        // Shallow coastal shelf (0m down to -1.6m)
        const t = dz / 18.0;
        return -1.6 * Math.pow(t, 1.2);
      } else if (dz <= 55.0) {
        // Gradual descent from -1.6m down to -6.0m
        const t = (dz - 18.0) / 37.0;
        return -1.6 * (1 - t) - 6.0 * t;
      } else {
        // Deep marine seabed floor (-10.0m)
        const t = Math.min(1.0, (dz - 55.0) / 25.0);
        return -6.0 * (1 - t) - 10.0 * t;
      }
    }

    // FBM (Fractal Brownian Motion) Pseudo-Noise Generator for natural geology
    const getFBM = (nx, nz) => {
      let value = 0;
      let amp = 1.0;
      let freq = 0.012;
      for (let i = 0; i < 4; i++) {
        value += Math.sin(nx * freq + Math.cos(nz * freq) * 1.5) * amp;
        value += Math.cos(nz * freq - Math.sin(nx * freq) * 1.5) * amp;
        amp *= 0.45;
        freq *= 2.1;
      }
      return value;
    };

    const getNaturalElevation = (nx, nz) => {
      // 1. Peak 1: Mirante da Vista Imperial (Soberano, cume nordeste: X=50, Z=-110)
      let dist1 = Math.hypot((nx - 50) / 160.0, (nz - (-110)) / 140.0);
      let peak1 = Math.max(0, 1 - dist1);
      peak1 = peak1 * peak1 * (3 - 2 * peak1) * 34.0;

      // 2. Peak 2: Morro do Sol (Colina Central onde fica a Praça do Samba)
      // Cume suave em (-2, -4) com altura ~13.8m que desce em declive suave (25°-28°) até a praia em Z=18
      let dist2 = Math.hypot((nx - (-2.0)) / 38.0, (nz - (-4.0)) / 30.0);
      let peak2 = Math.max(0, 1 - dist2);
      peak2 = peak2 * peak2 * (3 - 2 * peak2) * 13.8;

      // Combinação orgânica dos maciços geológicos
      let baseHill = Math.max(peak1, peak2 + peak1 * 0.25);

      // Ruído Fractal suave para textura geológica natural
      const noiseDetail = getFBM(nx, nz) * 3.6;
      
      // O Litoral: a montanha morre suavemente na areia do calçadão em Z=18.5
      let coastFade = Math.max(0, Math.min(1, (18.5 - nz) / 26.0)); 
      
      let el = Math.max(0, baseHill + noiseDetail) * coastFade;
      el += 0.82; // Cota base continental

      // Socalcos Naturais do Morro (Terracing orgânico suave)
      if (el > 3.0 && el < 18.5 && !(Math.abs(nx - 50) < 18 && nz < -95)) {
        const terracingFactor = 0.28;
        const steppedY = Math.round(el / 2.2) * 2.2;
        el = el * (1 - terracingFactor) + steppedY * terracingFactor;
      }
      return el;
    };

    let elevation = getNaturalElevation(x, z);

    // ==========================================
    // EROSÃO ORGÂNICA DE MONUMENTOS (V3.1.1)
    // ==========================================
    const smoothBlend = (t) => t * t * (3 - 2 * t);

    // A. Soccer Pitch Terrace at (x: 55, z: 4)
    const dxPitch = Math.abs(x - 55) + Math.sin(z * 0.8) * 1.2;
    const dzPitch = Math.abs(z - 4) + Math.sin(x * 0.8) * 1.2;
    if (dxPitch < 14 && dzPitch < 10) {
      let tX = Math.max(0, Math.min(1, (dxPitch - 10.5) / 3.5));
      let tZ = Math.max(0, Math.min(1, (dzPitch - 6.5) / 3.5));
      let blend = smoothBlend(Math.max(tX, tZ));
      elevation = elevation * blend + getNaturalElevation(55, 4) * (1 - blend);
    }

    // B. Samba Plaza Terrace at (x: -2, z: -4)
    // Acomoda o tablado perfeitamente sobre o cume natural do Morro do Sol
    const angleSamba = Math.atan2(z - (-4), x - (-2));
    const dPlaza = Math.hypot(x - (-2), z - (-4)) + Math.sin(angleSamba * 6) * 1.0;
    if (dPlaza < 12.0) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dPlaza - 9.0) / 3.0)));
      elevation = elevation * t + getNaturalElevation(-2, -4) * (1 - t);
    }

    // C. Lighthouse Terrace at (x: -105, z: 18)
    const angleLh = Math.atan2(z - 18, x - (-105));
    const dLh = Math.hypot(x - (-105), z - 18) + Math.sin(angleLh * 4) * 0.8;
    if (dLh < 6.5) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dLh - 3.5) / 3.0)));
      elevation = elevation * t + getNaturalElevation(-105, 18) * (1 - t);
    }

    // Cultural Market Terrace at (75, 4)
    const dxMarket = Math.abs(x - 75) + Math.sin(z * 0.7) * 1.0;
    const dzMarket = Math.abs(z - 4) + Math.sin(x * 0.7) * 1.0;
    if (dxMarket < 11 && dzMarket < 9) {
      let tX = Math.max(0, Math.min(1, (dxMarket - 8.5) / 2.5));
      let tZ = Math.max(0, Math.min(1, (dzMarket - 6.5) / 2.5));
      let blend = smoothBlend(Math.max(tX, tZ));
      elevation = elevation * blend + getNaturalElevation(75, 4) * (1 - blend);
    }

    // Brick Olaria Terrace at (-22, -14)
    const dxOlaria = Math.abs(x - (-22)) + Math.sin(z * 0.6) * 1.0;
    const dzOlaria = Math.abs(z - (-14)) + Math.sin(x * 0.6) * 1.0;
    if (dxOlaria < 9 && dzOlaria < 7) {
      let tX = Math.max(0, Math.min(1, (dxOlaria - 7.0) / 2.0));
      let tZ = Math.max(0, Math.min(1, (dzOlaria - 5.0) / 2.0));
      let blend = smoothBlend(Math.max(tX, tZ));
      elevation = elevation * blend + getNaturalElevation(-22, -14) * (1 - blend);
    }

    // Agroforest Farm Terrace at (82, -8)
    const dxAgro = Math.abs(x - 82) + Math.sin(z * 0.9) * 0.8;
    const dzAgro = Math.abs(z - (-8)) + Math.sin(x * 0.9) * 0.8;
    if (dxAgro < 10 && dzAgro < 7.5) {
      let tX = Math.max(0, Math.min(1, (dxAgro - 8.0) / 2.0));
      let tZ = Math.max(0, Math.min(1, (dzAgro - 5.5) / 2.0));
      let blend = smoothBlend(Math.max(tX, tZ));
      elevation = elevation * blend + getNaturalElevation(82, -8) * (1 - blend);
    }

    // D. Mirante da Vista Imperial Plateau at (x: 50, z: -110)
    // NOTE: This plateau overrides the terrain to form the perfect high peak!
    const angleImp = Math.atan2(z - (-110), x - 50);
    const dImperial = Math.hypot(x - 50, z - (-110)) + Math.sin(angleImp * 7) * 2.0;
    if (dImperial < 16.0) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dImperial - 11.0) / 5.0)));
      elevation = elevation * t + 34.0 * (1 - t);
    }

    // E. Mirante das Pipas Terrace at (x: -78, z: -50)
    const anglePipas = Math.atan2(z - (-50), x - (-78));
    const dPipas = Math.hypot(x - (-78), z - (-50)) + Math.sin(anglePipas * 5) * 1.5;
    if (dPipas < 11.0) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dPipas - 7.5) / 3.5)));
      elevation = elevation * t + getNaturalElevation(-78, -50) * (1 - t);
    }

    // F. Agrofloresta Terraces at (x: 75, z: -45)
    const angleHorta = Math.atan2(z - (-45), x - 75);
    const dHorta = Math.hypot(x - 75, z - (-45)) + Math.sin(angleHorta * 6) * 1.5;
    if (dHorta < 14.0) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dHorta - 9.5) / 4.5)));
      elevation = elevation * t + getNaturalElevation(75, -45) * (1 - t);
    }

    // G. Mirante do Pôr do Sol Terrace at (x: -98, z: -55)
    const anglePoente = Math.atan2(z - (-55), x - (-98));
    const dPoente = Math.hypot(x - (-98), z - (-55)) + Math.sin(anglePoente * 4) * 1.5;
    if (dPoente < 9.5) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dPoente - 6.5) / 3.0)));
      elevation = elevation * t + getNaturalElevation(-98, -55) * (1 - t);
    }

    // H. Mirante do Sol Nascente Terrace at (x: 98, z: -55)
    const angleLevante = Math.atan2(z - (-55), x - 98);
    const dLevante = Math.hypot(x - 98, z - (-55)) + Math.sin(angleLevante * 4) * 1.5;
    if (dLevante < 9.5) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dLevante - 6.5) / 3.0)));
      elevation = elevation * t + getNaturalElevation(98, -55) * (1 - t);
    }

    // I. Grande Olaria Imperial & Cerâmica at (x: 95, z: -18)
    const angleOlaria2 = Math.atan2(z - (-18), x - 95);
    const dOlaria2 = Math.hypot(x - 95, z - (-18)) + Math.sin(angleOlaria2 * 5) * 1.2;
    if (dOlaria2 < 11.5) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dOlaria2 - 8.0) / 3.5)));
      elevation = elevation * t + getNaturalElevation(95, -18) * (1 - t);
    }

    // J. Vila dos Pescadores do Poente at (x: -95, z: 0)
    const angleCove = Math.atan2(z, x - (-95));
    const dCove = Math.hypot(x - (-95), z) + Math.sin(angleCove * 4) * 1.2;
    if (dCove < 11.5) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dCove - 8.0) / 3.5)));
      elevation = elevation * t + getNaturalElevation(-95, 0) * (1 - t);
    }

    // K. Terraço Industrial do Parque Solar & Reservatório at (x: -18, z: -72)
    // Nivelamento do relevo da serra para assentamento da usina (elimina 100% de grama sobre painéis)
    const dxSolar = Math.abs(x - (-18));
    const dzSolar = Math.abs(z - (-72));
    if (dxSolar < 11.5 && dzSolar < 9.0) {
      const tX = Math.max(0, Math.min(1, (dxSolar - 8.5) / 3.0));
      const tZ = Math.max(0, Math.min(1, (dzSolar - 6.2) / 2.8));
      const blend = smoothBlend(Math.max(tX, tZ));
      const targetSolarY = getNaturalElevation(-18, -72) - 0.35;
      elevation = elevation * blend + targetSolarY * (1 - blend);
    }

    // L. Mirante do Poente & Terreiro de Capoeira at (x: -110, z: -15)
    const angleCapoeira = Math.atan2(z - (-15), x - (-110));
    const dCapoeira = Math.hypot(x - (-110), z - (-15)) + Math.sin(angleCapoeira * 5) * 1.0;
    if (dCapoeira < 9.0) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dCapoeira - 6.0) / 3.0)));
      elevation = elevation * t + getNaturalElevation(-110, -15) * (1 - t);
    }

    // M. Horta Comunitária em Socalcos da Encosta Oeste at (x: -92, z: -25)
    const angleHortaW = Math.atan2(z - (-25), x - (-92));
    const dHortaW = Math.hypot(x - (-92), z - (-25)) + Math.sin(angleHortaW * 4) * 0.8;
    if (dHortaW < 9.5) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dHortaW - 6.5) / 3.0)));
      elevation = elevation * t + getNaturalElevation(-92, -25) * (1 - t);
    }

    // N. Academia ao Ar Livre da Colina at (x: 112, z: -12)
    const angleAcademia = Math.atan2(z - (-12), x - 112);
    const dAcademia = Math.hypot(x - 112, z - (-12)) + Math.sin(angleAcademia * 4) * 0.8;
    if (dAcademia < 9.5) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dAcademia - 6.5) / 3.0)));
      elevation = elevation * t + getNaturalElevation(112, -12) * (1 - t);
    }

    // O. Ponto de Mototáxi do Levante at (x: 92, z: 14)
    const dMoto = Math.hypot(x - 92, z - 14);
    if (dMoto < 7.0) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dMoto - 4.5) / 2.5)));
      elevation = elevation * t + getNaturalElevation(92, 14) * (1 - t);
    }

    // P. Torre de Rádio & Telecomunicações do Cume at (x: 0, z: -104)
    const dRadio = Math.hypot(x, z - (-104));
    if (dRadio < 7.5) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dRadio - 4.5) / 3.0)));
      elevation = elevation * t + getNaturalElevation(0, -104) * (1 - t);
    }

    // Smooth sandy beach slope into the water:
    // Spans from calçadão edge (z ~ 16, y ~ 0.82m) down to the water's edge (shoreZ ~ 74, y ~ 0.0m)
    if (z > 16 && z <= shoreZ) {
      const beachBlend = Math.min(1.0, Math.max(0.0, (z - 16) / (shoreZ - 16)));
      // Organic curve: spacious dry beach shelf (y ~ 0.75m .. 0.35m) with smooth slope into surf
      const targetBeachY = 0.82 * Math.pow(1.0 - beachBlend, 1.25);
      elevation = elevation * (1 - beachBlend) + targetBeachY * beachBlend;
      return Math.max(0.0, elevation);
    }

    return Math.max(0.15, elevation);
  }

  init() {
    this.createCohesiveTerrainMesh();
    this.generateAllTerritoryPlateaus();
    this.createBiomeEcosystem();
  }

  createCohesiveTerrainMesh() {
    const sizeX = 340;
    const sizeZ = 320;
    const segsX = 110;
    const segsZ = 100;

    const geometry = new THREE.PlaneGeometry(sizeX, sizeZ, segsX, segsZ);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const colors = [];

    const colorMeadowGreen = new THREE.Color('#4CAF50'); // Bright sunny grass
    const colorLushGreen = new THREE.Color('#388E3C');   // Deep tropical lawn
    const colorRichGreen = new THREE.Color('#2E7D32');   // Valley meadow
    const colorSand = new THREE.Color('#F2D184');        // Warm golden Rio beach sand
    const colorWetSand = new THREE.Color('#D8B365');     // Wet sand near surf
    const colorSeabedTurquoise = new THREE.Color('#19647E'); // Shallow clear coastal water floor
    const colorDeepAbyss = new THREE.Color('#021226');   // Deep dark ocean floor
    const colorGraniteRock = new THREE.Color('#646E78');  // Morro granite rock
    const colorEarth = new THREE.Color('#7C5E4E');        // Exposed reddish-brown tropical dirt

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      let h = this.getElevation(x, z);
      
      // Calculate local slope
      const hx = this.getElevation(x + 1.0, z);
      const hz = this.getElevation(x, z + 1.0);
      const slope = Math.hypot(hx - h, hz - h);

      // Slight organic terrain jitter on hills only
      if (h > 0.5 && z < 16 && !(Math.abs(x - 55) < 12 && Math.abs(z - 4) < 8)) {
        h += (Math.random() - 0.5) * 0.10;
      }
      pos.setY(i, h);

      const vertexColor = new THREE.Color();
      const shoreZ = 74.0 + Math.sin(x * 0.015) * 3.5;

      if (z > shoreZ) {
        // Underwater seabed
        const dz = z - shoreZ;
        const seabedT = Math.min(1.0, dz / 45.0);
        vertexColor.copy(colorSeabedTurquoise).lerp(colorDeepAbyss, seabedT);
      } else if (z > 16) {
        // Beach sand
        const wetDist = shoreZ - z;
        if (wetDist < 9.0) {
          const wetT = 1.0 - (wetDist / 9.0);
          vertexColor.copy(colorSand).lerp(colorWetSand, wetT);
        } else {
          vertexColor.copy(colorSand);
        }
      } else if (z <= -60 && Math.abs(x) <= 32) {
        // Lush clean lawn for the Mirante
        vertexColor.copy(colorMeadowGreen).lerp(colorLushGreen, 0.4);
      } else {
        // Morro Carioca: Encostas verdejantes e terra tropical quente
        // O Morro do Sol é estritamente verdejante e acolhedor (sem pedra cinza na colina habitada)
        const isMorroDoSol = Math.hypot(x - (-2.0), z - (-4.0)) < 28.0;
        if (!isMorroDoSol && (slope > 0.95 || (slope > 0.72 && z < -85))) {
          vertexColor.copy(colorGraniteRock);
        } else if (slope > 0.32) {
          // Encostas e ladeiras habitáveis: mistura rica de grama tropical com terra batida vermelha
          const blend = Math.min(1.0, (slope - 0.32) / 0.52);
          vertexColor.copy(colorLushGreen).lerp(colorEarth, blend * 0.65);
        } else {
          // Áreas suaves e socalcos: grama viçosa
          const rnd = Math.sin(x * 0.4 + z * 0.3);
          if (rnd > 0.15) vertexColor.copy(colorMeadowGreen);
          else vertexColor.copy(colorLushGreen);
        }
      }

      colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.group.add(mesh);
    this.terrainMesh = mesh;
  }

  // DYNAMIC TERRAIN TERRAFORMING / MOLDING:
  // Smoothly levels the terrain vertices under a new construction site to create a flat pad
  levelTerrainAt(targetX, targetZ, radius = 5.2, targetY = null, strength = 1.0) {
    if (!this.terrainMesh || !this.terrainMesh.geometry) return;
    const pos = this.terrainMesh.geometry.attributes.position;
    const groundY = targetY !== null ? targetY : this.getElevation(targetX, targetZ);
    let modified = false;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      if (Math.abs(vx - targetX) > radius) continue;
      const vz = pos.getZ(i);
      if (Math.abs(vz - targetZ) > radius) continue;
      const dist = Math.hypot(vx - targetX, vz - targetZ);
      if (dist < radius) {
        const currentY = pos.getY(i);
        const spatialT = Math.pow(dist / radius, 1.8);
        const padY = currentY * spatialT + groundY * (1 - spatialT);
        const blendedY = currentY * (1 - strength) + padY * strength;
        pos.setY(i, blendedY);
        modified = true;
      }
    }
    if (modified) {
      pos.needsUpdate = true;
      this.terrainMesh.geometry.computeVertexNormals();
    }
  }

  generateAllTerritoryPlateaus() {
    this.plateaus = [];

    // 1. DISTRITO OESTE (Vila da Prainha, Cais & Colina do Poente)
    // Spans from coastal pier (-60) all the way into the vast Northwestern highlands (-105 to -35)
    const prainhaCoords = [
      // Humble Founding Starters (Prainha coastal cove)
      { x: -58, z: 12, isStarter: true },
      { x: -48, z: 11, isStarter: true },
      { x: -70, z: 12, isStarter: false },
      { x: -38, z: 12, isStarter: false },
      { x: -55, z: 4,  isStarter: false },
      { x: -75, z: -25, isStarter: false },
      { x: -88, z: -40, isStarter: false },
      // Western Frontier Lots for autonomous expansion:
      { x: -96, z: -48, isStarter: false },
      { x: -84, z: -56, isStarter: false },
      { x: -72, z: -62, isStarter: false },
      { x: -60, z: -68, isStarter: false },
      { x: -94, z: -32, isStarter: false },

      // Expansion Ring 1 (Port road neighborhood)
      { x: -45, z: 3,  isStarter: false },
      { x: -64, z: 12, isStarter: false }, { x: -50, z: 14, isStarter: false },

      // Expansion Ring 2 (Mid-slope connecting toward Morro do Sol & Lighthouse)
      { x: -30, z: 12, isStarter: false }, { x: -22, z: 12, isStarter: false },
      { x: -35, z: 4,  isStarter: false }, { x: -25, z: 3,  isStarter: false },
      { x: -80, z: 11, isStarter: false }, { x: -92, z: 10, isStarter: false },
      { x: -62, z: 4,  isStarter: false }, { x: -74, z: 3,  isStarter: false },
      { x: -84, z: 4,  isStarter: false },

      // Expansion Ring 3 (LOWER WEST HIGHLANDS & ENCOSTAS)
      { x: -58, z: -6,  isStarter: false }, { x: -46, z: -6,  isStarter: false },
      { x: -34, z: -5,  isStarter: false }, { x: -22, z: -5,  isStarter: false },
      { x: -52, z: -16, isStarter: false }, { x: -38, z: -15, isStarter: false },
      { x: -44, z: -14, isStarter: false }, { x: -68, z: -16, isStarter: false },
      { x: -76, z: -12, isStarter: false }, { x: -85, z: -5,  isStarter: false },
      { x: -40, z: -18, isStarter: false }, { x: -48, z: -28, isStarter: false },
      { x: -56, z: -42, isStarter: false },

      // Expansion Ring 4 (VAST NORTHWESTERN HIGHLANDS - Full Red Zone Utilization!)
      { x: -90, z: -25, isStarter: false },
      { x: -65, z: -38, isStarter: false }, { x: -82, z: -40, isStarter: false }, { x: -98, z: -40, isStarter: false },
      { x: -60, z: -55, isStarter: false }, { x: -78, z: -55, isStarter: false }, { x: -95, z: -58, isStarter: false },
      { x: -50, z: -70, isStarter: false }, { x: -70, z: -72, isStarter: false }, { x: -88, z: -75, isStarter: false },
      { x: -40, z: -85, isStarter: false }, { x: -60, z: -85, isStarter: false }, { x: -80, z: -88, isStarter: false },
      { x: -105, z: -15, isStarter: false }, { x: -105, z: -35, isStarter: false },
      { x: -105, z: -55, isStarter: false }, { x: -102, z: -70, isStarter: false },
      // New organic lots infilling western terraces:
      { x: -92, z: -30, isStarter: false }, { x: -82, z: -32, isStarter: false },
      { x: -74, z: -45, isStarter: false }, { x: -66, z: -60, isStarter: false },
      { x: -54, z: -62, isStarter: false }, { x: -45, z: -50, isStarter: false },
      { x: -84, z: -65, isStarter: false }, { x: -92, z: -72, isStarter: false },
      { x: -100, z: -62, isStarter: false }, { x: -95, z: -78, isStarter: false },
      // Expansion Ring 5 (CONTINENTAL FAR-WEST EXPANSION: X from -110 to -135)
      { x: -115, z: 8, isStarter: false },   { x: -125, z: 8, isStarter: false },   { x: -135, z: 6, isStarter: false },
      { x: -115, z: -20, isStarter: false }, { x: -125, z: -20, isStarter: false }, { x: -135, z: -25, isStarter: false },
      { x: -115, z: -35, isStarter: false }, { x: -130, z: -45, isStarter: false }, { x: -115, z: -70, isStarter: false },
      { x: -125, z: -60, isStarter: false }, { x: -120, z: -85, isStarter: false }, { x: -135, z: -75, isStarter: false }
    ];

    prainhaCoords.forEach((pt, i) => {
      const y = this.getElevation(pt.x, pt.z);
      this.plateaus.push({
        id: `prainha_${i + 1}`,
        faction: 'prainha',
        isStarter: !!pt.isStarter,
        order: i,
        x: pt.x,
        y: y,
        z: pt.z
      });
    });

    // 2. DISTRITO CENTRAL (Morro do Sol & Encostas Centrais - Plenamente Adensado e Respeitando o Terreiro do Samba!)
    const solCoords = [
      // Humble Founding Starters (posicionados nas encostas a distância segura de 18m+ da Praça do Samba)
      { x: -20, z: -2, isStarter: true },
      { x: 20,  z: -2, isStarter: true },
      { x: -22, z: 6,  isStarter: false },
      { x: 22, z: 6,   isStarter: false },
      { x: -15, z: -18, isStarter: false },
      { x: 15, z: -18, isStarter: false },
      { x: -24, z: -4, isStarter: false },
      { x: 16, z: -8,  isStarter: false },
      // Flank Terraces connecting outwards:
      { x: -28, z: -18, isStarter: false },
      { x: 28, z: -18, isStarter: false },
      { x: 0, z: -40, isStarter: false },

      // Expansion Ring 1 (Around Samba Plaza and Promenade)
      { x: -9,  z: 10, isStarter: false }, { x: 9,  z: 10, isStarter: false },
      { x: -5,  z: 14, isStarter: false }, { x: 5,  z: 14, isStarter: false },
      { x: -12, z: 14, isStarter: false }, { x: 12, z: 14, isStarter: false },

      // Expansion Ring 2 (Reaching West toward Prainha and East toward Várzea)
      { x: -16, z: 4,  isStarter: false }, { x: 16, z: 4,  isStarter: false },
      { x: -18, z: 11, isStarter: false }, { x: 18, z: 11, isStarter: false },
      { x: -20, z: -16, isStarter: false }, { x: 20, z: -16, isStarter: false },

      // Expansion Ring 3 (Terraced upper slopes connecting to Serra)
      { x: -8, z: -20, isStarter: false }, { x: 8,  z: -16, isStarter: false },
      { x: -12, z: -20, isStarter: false }, { x: 12, z: -20, isStarter: false },
      { x: -5, z: -22, isStarter: false }, { x: 5,  z: -22, isStarter: false },
      { x: -8, z: -25, isStarter: false }, { x: 8,  z: -25, isStarter: false },
      { x: -16, z: -26, isStarter: false }, { x: 16, z: -26, isStarter: false },
      { x: -20, z: -32, isStarter: false }, { x: 20, z: -32, isStarter: false },
      { x: -10, z: -32, isStarter: false }, { x: 10, z: -32, isStarter: false },
      { x: 0,   z: -28, isStarter: false },

      // Expansion Ring 4 (INTERMEDIATE EASTERN & WESTERN HILLSIDES)
      { x: 22, z: -2,  isStarter: false },
      { x: 28, z: -4,  isStarter: false },
      { x: 24, z: -10, isStarter: false },
      { x: 30, z: -12, isStarter: false },
      { x: 25, z: -20, isStarter: false },
      { x: 28, z: -28, isStarter: false },
      { x: 24, z: -38, isStarter: false },
      { x: 26, z: -48, isStarter: false },
      // New intermediate terraces filling the red zone gaps:
      { x: -28, z: -8,  isStarter: false }, { x: -24, z: -14, isStarter: false },
      { x: -30, z: -22, isStarter: false }, { x: -26, z: -28, isStarter: false },
      { x: -18, z: -38, isStarter: false }, { x: 18, z: -38,  isStarter: false },
      { x: -12, z: -44, isStarter: false }, { x: 12, z: -44,  isStarter: false },
      { x: -5, z: -42,  isStarter: false }, { x: 5, z: -42,   isStarter: false },
      { x: 0, z: -50,   isStarter: false }, { x: -14, z: -58, isStarter: false },
      { x: 14, z: -58,  isStarter: false }
    ];

    solCoords.filter(pt => Math.hypot(pt.x - (-2), pt.z - (-4)) >= 15.0).forEach((pt, i) => {
      const y = this.getElevation(pt.x, pt.z);
      this.plateaus.push({
        id: `sol_${i + 1}`,
        faction: 'sol',
        isStarter: !!pt.isStarter,
        order: i,
        x: pt.x,
        y: y,
        z: pt.z
      });
    });

    // 3. DISTRITO NORTE (Alto da Serra - Encostas e Sopé do Cume)
    // Zona de Exclusão Turística: O quadrilátero central do Cume (|X| <= 30 e Z <= -65) é estritamente
    // reservado para o Mirante da Vista Imperial e o Parque Solar/Eólico. Casas existem apenas no sopé e encostas!
    const serraCoords = [
      // Humble Founding Starters (Alto da Serra base - Z: -36)
      { x: -8, z: -36, isStarter: true },
      { x: 8,  z: -36, isStarter: true },
      { x: -16, z: -36, isStarter: false },
      { x: 16, z: -36, isStarter: false },

      // Encostas do Sopé (Anel 1 - Z: -42 a -48)
      { x: -8,  z: -44, isStarter: false }, { x: 8,  z: -44, isStarter: false },
      { x: -18, z: -44, isStarter: false }, { x: 18, z: -44, isStarter: false },
      { x: -26, z: -42, isStarter: false }, { x: 26, z: -42, isStarter: false },
      { x: -12, z: -48, isStarter: false }, { x: 12, z: -48, isStarter: false },

      // Encostas Médias (Anel 2 - Z: -50 a -58)
      { x: -8,  z: -52, isStarter: false }, { x: 8,  z: -52, isStarter: false },
      { x: -18, z: -52, isStarter: false }, { x: 18, z: -52, isStarter: false },
      { x: -28, z: -52, isStarter: false }, { x: 28, z: -52, isStarter: false },
      { x: -14, z: -58, isStarter: false }, { x: 14, z: -58, isStarter: false },
      { x: -24, z: -58, isStarter: false }, { x: 24, z: -58, isStarter: false },
      { x: 0,   z: -54, isStarter: false }, { x: 0,   z: -60, isStarter: false },

      // Ombros Laterais da Serra (Anel 3 - |X| >= 34, emoldurando o mirante pelas laterais)
      { x: -36, z: -52, isStarter: false }, { x: 36, z: -52, isStarter: false },
      { x: -44, z: -48, isStarter: false }, { x: 44, z: -48, isStarter: false },
      { x: -38, z: -62, isStarter: false }, { x: 38, z: -62, isStarter: false },
      { x: -46, z: -60, isStarter: false }, { x: 46, z: -60, isStarter: false },
      { x: -36, z: -70, isStarter: false }, { x: 36, z: -70, isStarter: false },
      { x: -45, z: -72, isStarter: false }, { x: 45, z: -72, isStarter: false },
      { x: -52, z: -68, isStarter: false }, { x: 52, z: -68, isStarter: false },
      { x: -38, z: -78, isStarter: false }, { x: 38, z: -78, isStarter: false },
      { x: -48, z: -78, isStarter: false }, { x: 48, z: -78, isStarter: false }
    ];


    serraCoords.forEach((pt, i) => {
      const y = this.getElevation(pt.x, pt.z);
      this.plateaus.push({
        id: `serra_${i + 1}`,
        faction: 'serra',
        isStarter: !!pt.isStarter,
        order: i,
        x: pt.x,
        y: y,
        z: pt.z
      });
    });

    // 4. DISTRITO LESTE (Polo da Várzea & Encostas do Levante)
    const varzeaCoords = [
      // Humble Founding Starters (Várzea coastal plain)
      { x: 34, z: 6,  isStarter: true },
      { x: 42, z: 12, isStarter: true },
      { x: 76, z: 6,  isStarter: false },
      { x: 50, z: 14, isStarter: false },
      { x: 75, z: -25, isStarter: false },
      { x: 88, z: -40, isStarter: false },
      // Eastern Frontier Lots for autonomous expansion:
      { x: 96, z: -48, isStarter: false },
      { x: 84, z: -56, isStarter: false },
      { x: 72, z: -62, isStarter: false },
      { x: 60, z: -68, isStarter: false },
      { x: 94, z: -32, isStarter: false },

      // Expansion Ring 1 (Flanking the coastal avenue and field perimeter)
      { x: 26, z: 12, isStarter: false }, { x: 36, z: 14, isStarter: false },
      { x: 74, z: 14, isStarter: false }, { x: 84, z: 12, isStarter: false },
      { x: 64, z: 14, isStarter: false }, { x: 70, z: 12, isStarter: false },

      // Expansion Ring 2 (Upper terrace overlooking the campinho from the north)
      { x: 36, z: -8,  isStarter: false }, { x: 48, z: -9,  isStarter: false },
      { x: 62, z: -9,  isStarter: false }, { x: 74, z: -8,  isStarter: false },
      { x: 55, z: -14, isStarter: false }, { x: 44, z: -22, isStarter: false },
      { x: 62, z: -22, isStarter: false },

      // Expansion Ring 2b (INTERMEDIATE HILLSIDE MEADOWS - Colonização da Encosta Verde)
      { x: 38, z: -2,  isStarter: false },
      { x: 44, z: -4,  isStarter: false },
      { x: 36, z: -12, isStarter: false },
      { x: 42, z: -14, isStarter: false },
      { x: 48, z: -16, isStarter: false },
      { x: 38, z: -24, isStarter: false },
      { x: 46, z: -26, isStarter: false },
      { x: 36, z: -34, isStarter: false },
      { x: 44, z: -36, isStarter: false },
      { x: 52, z: -32, isStarter: false },
      { x: 38, z: -46, isStarter: false },
      { x: 46, z: -48, isStarter: false },
      { x: 54, z: -46, isStarter: false },

      // Expansion Ring 3 (Lower East plain)
      { x: 22, z: 6,   isStarter: false }, { x: 88, z: 6,   isStarter: false },
      { x: 96, z: 10,  isStarter: false }, { x: 32, z: -16, isStarter: false },
      { x: 50, z: -18, isStarter: false }, { x: 68, z: -18, isStarter: false },
      { x: 80, z: -15, isStarter: false }, { x: 88, z: -15, isStarter: false },
      { x: 82, z: -5,  isStarter: false }, { x: 68, z: 2,   isStarter: false },
      { x: 40, z: -18, isStarter: false }, { x: 48, z: -28, isStarter: false },
      { x: 56, z: -42, isStarter: false },

      // Expansion Ring 4 (VAST NORTHEASTERN HIGHLANDS - Full Red Zone Utilization!)
      { x: 90, z: -25, isStarter: false },
      { x: 65, z: -38, isStarter: false }, { x: 82, z: -40, isStarter: false }, { x: 98, z: -40, isStarter: false },
      { x: 60, z: -55, isStarter: false }, { x: 78, z: -55, isStarter: false }, { x: 95, z: -58, isStarter: false },
      { x: 50, z: -70, isStarter: false }, { x: 70, z: -72, isStarter: false }, { x: 88, z: -75, isStarter: false },
      { x: 40, z: -85, isStarter: false }, { x: 60, z: -85, isStarter: false }, { x: 80, z: -88, isStarter: false },
      { x: 105, z: -15, isStarter: false }, { x: 105, z: -35, isStarter: false },
      { x: 105, z: -55, isStarter: false }, { x: 102, z: -70, isStarter: false },
      // New organic lots infilling eastern terraces:
      { x: 92, z: -30, isStarter: false }, { x: 82, z: -32, isStarter: false },
      { x: 74, z: -45, isStarter: false }, { x: 66, z: -60, isStarter: false },
      { x: 54, z: -62, isStarter: false }, { x: 45, z: -50, isStarter: false },
      { x: 35, z: -35, isStarter: false }, { x: 30, z: -25, isStarter: false },
      { x: 84, z: -65, isStarter: false }, { x: 92, z: -72, isStarter: false },
      { x: 100, z: -62, isStarter: false }, { x: 95, z: -78, isStarter: false },
      // Expansion Ring 5 (CONTINENTAL FAR-EAST EXPANSION: X from 110 to 135)
      { x: 115, z: 8, isStarter: false },   { x: 125, z: 8, isStarter: false },   { x: 135, z: 6, isStarter: false },
      { x: 115, z: -20, isStarter: false }, { x: 125, z: -20, isStarter: false }, { x: 135, z: -25, isStarter: false },
      { x: 115, z: -35, isStarter: false }, { x: 130, z: -45, isStarter: false }, { x: 115, z: -70, isStarter: false },
      { x: 125, z: -60, isStarter: false }, { x: 120, z: -85, isStarter: false }, { x: 135, z: -75, isStarter: false }
    ];

    varzeaCoords.forEach((pt, i) => {
      const y = this.getElevation(pt.x, pt.z);
      this.plateaus.push({
        id: `varzea_${i + 1}`,
        faction: 'varzea',
        isStarter: !!pt.isStarter,
        order: i,
        x: pt.x,
        y: y,
        z: pt.z
      });
    });
  }

  createTropicalVegetation() {
    this.createBiomeEcosystem();
  }

  // ECOSSISTEMA DOS 3 BIOMAS NATURAIS DA MATA ATLÂNTICA CARIOCA
  // Bioma 1 (Oeste): Litoral do Poente, Coqueirais inclinados, Restinga & Rochas Costeiras
  // Bioma 2 (Leste): Mata Atlântica Densa, Bananeiras de Vala, Jaqueiras & Flamboyants em Flor
  // Bioma 3 (Cume/Serra): Monólitos Monumentais de Granito Carioca & Arbustos de Altitude
  // 100% instanciado via THREE.InstancedMesh para máxima taxa de quadros (60 FPS fluidos em 1x a 5x)
  createBiomeEcosystem() {
    const dummy = new THREE.Object3D();

    // ==========================================
    // 1. BIOMA POENTE (OESTE: X < -20) — PALMEIRAS & COQUEIRAIS INCLINADOS
    // ==========================================
    const palmLocations = [
      // Orla e Areia da Prainha (Z >= 24, seguro em relação ao calçadão em Z: 18)
      { x: -110, z: 25.0 }, { x: -96, z: 25.5 }, { x: -84, z: 26.0 }, { x: -68, z: 26.5 },
      { x: -50,  z: 25.5 }, { x: -30, z: 25.0 }, { x: -2,  z: 25.5 }, { x: 30,  z: 25.0 },
      { x: 85,   z: 24.5 }, { x: 104, z: 24.0 }, { x: 112, z: 24.5 },

      // Dunas verdes e bordas da enseada dos pescadores (Z <= 14, X < -40)
      { x: -95, z: 8 },   { x: -88, z: 2 },   { x: -102, z: 6 },  { x: -108, z: -4 },
      { x: -75, z: 6 },   { x: -68, z: -14 }, { x: -82,  z: -18 }, { x: -90, z: -10 },

      // Encostas do Poente (Flanco Oeste em socalcos naturais não construíveis)
      { x: -98, z: -35 }, { x: -85, z: -36 }, { x: -76, z: -28 }, { x: -92, z: -52 },
      { x: -78, z: -50 }, { x: -65, z: -46 }, { x: -86, z: -70 }, { x: -74, z: -68 },
      { x: -95, z: -75 }, { x: -58, z: -75 }, { x: -48, z: -62 },

      // Encosta Central do Morro do Sol (Emoldurando a Escadaria e o Terreiro do Samba)
      { x: -14, z: 12 },  { x: 14, z: 12 },
      { x: -9,  z: 16 },  { x: 10, z: 16 },
      { x: -16, z: 2 },   { x: 16, z: 2 },
      { x: -12, z: -6 },  { x: 12, z: -6 }
    ];

    palmLocations.forEach(loc => {
      // Spatial safety: nunca plantar coqueiro na pista de asfalto (z: 16.0 a 20.0)
      if (Math.abs(loc.z - 18.0) < 3.2 && Math.abs(loc.x) < 110) return;

      // Spatial safety: nunca colidir com quiosques da orla (z: 20 a 23)
      const kioskXs = [-75, -45, -15, 15, 55];
      for (const kx of kioskXs) {
        if (Math.hypot(loc.x - kx, loc.z - 21.5) < 7.0) return;
      }

      const y = this.getElevation(loc.x, loc.z);
      if (y > 0.35) {
        const palm = this.createLowPolyPalm();
        palm.position.set(loc.x, y, loc.z);
        palm.rotation.y = Math.random() * Math.PI * 2;
        const scale = 0.85 + Math.random() * 0.35;
        palm.scale.set(scale, scale, scale);
        this.group.add(palm);
        this.palms.push(palm);
      }
    });

    // ==========================================
    // 2. LAJES E AFLORAMENTOS DE GRANITO NATURAL (Maciço Geológico do Cume & Costões)
    // Lajes amplas, assentadas e integradas à encosta, emoldurando a paisagem com zero aperto!
    // ==========================================
    const monolithCoords = [
      // A. AFLORAMENTOS EM DEGRAUS NATURAIS DO CUME (Flancos Exteriores da Serra)
      // Flanco Oeste da Encosta (recuado a |X| >= 22, emoldurando a vista para o mar e poente)
      { x: -22, z: -78, s: 3.2, rot: 0.4 },
      { x: -28, z: -84, s: 3.8, rot: 1.1 },
      { x: -34, z: -90, s: 4.2, rot: 2.0 },
      { x: -28, z: -98, s: 3.6, rot: 0.7 },

      // Flanco Leste da Encosta (recuado a |X| >= 22, emoldurando a vista para a várzea e baía)
      { x: 22,  z: -78, s: 3.2, rot: 1.2 },
      { x: 28,  z: -84, s: 3.8, rot: 2.2 },
      { x: 34,  z: -90, s: 4.2, rot: 0.5 },
      { x: 28,  z: -98, s: 3.6, rot: 1.8 },

      // Paredão Geológico de Fundo (Crista Norte Profunda a Z <= -105, coroando a montanha)
      { x: -16, z: -108, s: 4.2, rot: 1.3 },
      { x: 0,   z: -112, s: 4.8, rot: 0.4 },
      { x: 16,  z: -108, s: 4.2, rot: 2.1 },
      { x: -38, z: -105, s: 4.0, rot: 0.8 },
      { x: 38,  z: -105, s: 4.0, rot: 1.6 },
      { x: -52, z: -98,  s: 3.6, rot: 2.4 },
      { x: 52,  z: -98,  s: 3.6, rot: 0.7 },

      // B. Falésias e Crag Ocidental (Borda Oeste)
      { x: -122, z: -25, s: 2.2, rot: 0.3 },
      { x: -106, z: -45, s: 2.6, rot: 1.5 },
      { x: -104, z: -68, s: 2.8, rot: 2.0 },
      { x: -92,  z: -88, s: 2.5, rot: 0.7 },
      { x: -82,  z: -52, s: 2.0, rot: 1.8 },
      { x: -68,  z: -30, s: 1.8, rot: 0.9 },

      // C. Falésias e Crag Oriental (Borda Leste)
      { x: 124, z: -25, s: 2.2, rot: 0.3 },
      { x: 106, z: -45, s: 2.6, rot: 1.5 },
      { x: 104, z: -68, s: 2.8, rot: 2.0 },
      { x: 92,  z: -88, s: 2.5, rot: 0.7 },
      { x: 82,  z: -52, s: 2.0, rot: 1.8 },
      { x: 68,  z: -30, s: 1.8, rot: 0.9 },

      // D. Costão Rochoso da Prainha e Quebra-Mar
      { x: -112, z: 12, s: 2.8, rot: 0.4 },
      { x: -106, z: 28, s: 2.2, rot: 1.2 },
      { x: 106,  z: 28, s: 2.2, rot: 1.8 },
      { x: 112,  z: 12, s: 2.8, rot: 2.5 }
    ];

    const monolithMat = new THREE.MeshLambertMaterial({
      color: 0x717982,
      flatShading: true
    });
    const monolithGeo = new THREE.DodecahedronGeometry(1.2, 1);
    const monolithMesh = new THREE.InstancedMesh(monolithGeo, monolithMat, monolithCoords.length);
    monolithMesh.castShadow = true;
    monolithMesh.receiveShadow = true;

    // Assentamento orgânico em lajes naturais: aspecto amplo, baixo e profundamente integrado ao relevo
    monolithCoords.forEach((b, idx) => {
      const y = this.getElevation(b.x, b.z) - (b.s * 0.45);
      dummy.position.set(b.x, y, b.z);
      dummy.rotation.set(0.12 + (idx % 3) * 0.06, b.rot || idx * 0.7, 0.08 + (idx % 2) * 0.05);
      dummy.scale.set(b.s * 1.8, b.s * 0.42, b.s * 1.5);
      dummy.updateMatrix();
      monolithMesh.setMatrixAt(idx, dummy.matrix);
    });
    monolithMesh.instanceMatrix.needsUpdate = true;
    this.group.add(monolithMesh);

    // ==========================================
    // 3. BIOMA MATA ATLÂNTICA PURA (REMOVIDO DA ÁREA INTERNA)
    // As árvores gigantes foram removidas destas encostas (X <= -55 e X >= 55)
    // para dar espaço limpo e livre para a Expansão Orgânica das vilas!
    // A floresta pesada agora fica restrita apenas às bordas via Architecture.js
    // ==========================================

    // ==========================================
    // 4. TOUCEIRAS DE BANANEIRAS TROPICAIS (Encostas Leste e Quintais do Morro)
    // ==========================================
    const bananaCoords = [
      // Encostas Orientais
      { x: 50, z: -2 },   { x: 62, z: -6 },   { x: 74, z: -14 },  { x: 84, z: -20 },
      { x: 58, z: -28 },  { x: 70, z: -32 },  { x: 82, z: -38 },  { x: 92, z: -36 },
      { x: 64, z: -45 },  { x: 78, z: -52 },  { x: 88, z: -56 },  { x: 52, z: -60 },
      { x: 74, z: -65 },  { x: 84, z: -70 },  { x: 96, z: -66 },  { x: 40, z: -70 },
      // Quintais Verdes e Valas Centrais
      { x: -16, z: -12 }, { x: 16, z: -12 },  { x: -28, z: -8 },  { x: 28, z: -8 },
      { x: -42, z: -32 }, { x: -54, z: -50 }, { x: -62, z: -28 }, { x: -74, z: -58 },
      // Encosta Central do Morro do Sol (Casas e Escadaria)
      { x: -11, z: 8 },   { x: 12, z: 8 },    { x: -8, z: 0 },    { x: 9, z: 0 },
      { x: -15, z: -2 },  { x: 15, z: -2 }
    ];

    const bananaLeafMat = new THREE.MeshLambertMaterial({
      color: 0x43A047,
      flatShading: true,
      side: THREE.DoubleSide
    });
    const bananaLeafGeo = new THREE.ConeGeometry(0.9, 2.7, 4);
    bananaLeafGeo.translate(0, 1.25, 0);
    bananaLeafGeo.rotateX(Math.PI / 3);

    const bananaMesh = new THREE.InstancedMesh(bananaLeafGeo, bananaLeafMat, bananaCoords.length * 3);
    bananaMesh.castShadow = true;

    let bInstIdx = 0;
    bananaCoords.forEach((bc, idx) => {
      // EVITAR SOBREPOSIÇÃO EM MONUMENTOS E ESTRUTURAS ESPECIAIS (1.2.2)
      const inMarket = (Math.abs(bc.x - 75) < 10 && Math.abs(bc.z - 4) < 8);
      const inOlaria = (Math.abs(bc.x - (-22)) < 8 && Math.abs(bc.z - (-14)) < 6);
      const inAgro = (Math.abs(bc.x - 82) < 9 && Math.abs(bc.z - (-8)) < 6);
      const inSolar = (Math.abs(bc.x - (-18)) < 12 && Math.abs(bc.z - (-72)) < 10);
      const inCapoeira = (Math.hypot(bc.x - (-110), bc.z - (-15)) < 10);
      const inHorta = (Math.hypot(bc.x - (-92), bc.z - (-25)) < 10);
      const inAcademia = (Math.hypot(bc.x - 112, bc.z - (-12)) < 10);
      const inMoto = (Math.hypot(bc.x - 92, bc.z - 14) < 8);
      const inRadio = (Math.hypot(bc.x, bc.z - (-104)) < 8);
      if (inMarket || inOlaria || inAgro || inSolar || inCapoeira || inHorta || inAcademia || inMoto || inRadio) return;

      const y = this.getElevation(bc.x, bc.z);
      for (let frond = 0; frond < 3; frond++) {
        dummy.position.set(bc.x, y + 0.45, bc.z);
        dummy.rotation.set(0.18, (frond * (Math.PI * 2 / 3)) + (idx * 0.45), 0.18);
        dummy.scale.set(1.15, 1.3, 1.15);
        dummy.updateMatrix();
        bananaMesh.setMatrixAt(bInstIdx++, dummy.matrix);
      }
    });
    bananaMesh.instanceMatrix.needsUpdate = true;
    this.group.add(bananaMesh);

    // ==========================================
    // 5. RESTINGA LITORÂNEA & ARBUSTOS DE ALTITUDE (Instanced Shrub Mesh)
    // ==========================================
    const shrubCoords = [
      // Restinga (Oeste / Litoral)
      { x: -100, z: 15 }, { x: -86, z: 12 }, { x: -72, z: 14 }, { x: -56, z: 15 },
      { x: -94,  z: -2 }, { x: -84, z: -8 }, { x: -66, z: -4 }, { x: -120, z: -10 },
      // Altitude / Cume
      { x: -8,  z: -96 }, { x: 8,   z: -96 }, { x: -28, z: -82 }, { x: 28,  z: -82 },
      { x: -40, z: -90 }, { x: 40,  z: -90 }, { x: -50, z: -84 }, { x: 50,  z: -84 },
      { x: -18, z: -104 }, { x: 18, z: -104 },
      // Encosta Central do Morro do Sol (Margeando a Escadaria)
      { x: -4,  z: 14 },  { x: 6,   z: 14 },  { x: 10, z: 10 },
      { x: -6,  z: 8 },   { x: 4,   z: 6 },   { x: -4, z: 2 },
      { x: 5,   z: -2 }
    ];

    const shrubMat = new THREE.MeshLambertMaterial({
      color: 0x558B2F,
      flatShading: true
    });
    const shrubGeo = new THREE.DodecahedronGeometry(0.9, 0);
    const shrubMesh = new THREE.InstancedMesh(shrubGeo, shrubMat, shrubCoords.length);
    shrubMesh.castShadow = true;

    let sInstIdx = 0;
    shrubCoords.forEach((sc, idx) => {
      const inSolar = (Math.abs(sc.x - (-18)) < 12 && Math.abs(sc.z - (-72)) < 10);
      const inCapoeira = (Math.hypot(sc.x - (-110), sc.z - (-15)) < 10);
      const inHorta = (Math.hypot(sc.x - (-92), sc.z - (-25)) < 10);
      const inAcademia = (Math.hypot(sc.x - 112, sc.z - (-12)) < 10);
      const inMoto = (Math.hypot(sc.x - 92, sc.z - 14) < 8);
      const inRadio = (Math.hypot(sc.x, sc.z - (-104)) < 8);
      if (inSolar || inCapoeira || inHorta || inAcademia || inMoto || inRadio) return;

      const y = this.getElevation(sc.x, sc.z);
      dummy.position.set(sc.x, y + 0.4, sc.z);
      dummy.rotation.set(idx * 0.5, idx * 0.8, 0);
      dummy.scale.set(1.0 + (idx % 3) * 0.25, 0.75 + (idx % 2) * 0.2, 1.0 + (idx % 3) * 0.25);
      dummy.updateMatrix();
      shrubMesh.setMatrixAt(sInstIdx++, dummy.matrix);
    });
    shrubMesh.count = sInstIdx;
    shrubMesh.instanceMatrix.needsUpdate = true;
    this.group.add(shrubMesh);
  }

  createLowPolyPalm() {
    const palmGroup = new THREE.Group();

    const trunkMat = new THREE.MeshLambertMaterial({
      color: 0x795548,
      flatShading: true
    });

    let currentY = 0;
    let currentX = 0;
    let currentZ = 0;
    const segments = 5;
    const leanX = (Math.random() - 0.5) * 0.35;
    const leanZ = (Math.random() - 0.5) * 0.35;

    for (let i = 0; i < segments; i++) {
      const segHeight = 1.35;
      const radiusBottom = 0.42 * (1 - i * 0.08);
      const radiusTop = 0.38 * (1 - (i + 1) * 0.08);
      const segGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, segHeight, 5);
      const segMesh = new THREE.Mesh(segGeo, trunkMat);
      segMesh.castShadow = true;
      segMesh.position.set(currentX, currentY + segHeight / 2, currentZ);
      segMesh.rotation.z = leanX * (i * 0.12);
      segMesh.rotation.x = leanZ * (i * 0.12);
      palmGroup.add(segMesh);

      currentY += segHeight;
      currentX += leanX * 0.35;
      currentZ += leanZ * 0.35;
    }

    const leafMat = new THREE.MeshLambertMaterial({
      color: 0x2E7D32,
      flatShading: true,
      side: THREE.DoubleSide
    });

    const numFronds = 6;
    for (let f = 0; f < numFronds; f++) {
      const angle = (f / numFronds) * Math.PI * 2 + Math.random() * 0.2;
      const frondGeo = new THREE.ConeGeometry(0.7, 4.4, 4);
      frondGeo.translate(0, 2.2, 0);
      frondGeo.rotateX(Math.PI / 2.6);

      const frond = new THREE.Mesh(frondGeo, leafMat);
      frond.position.set(currentX, currentY, currentZ);
      frond.rotation.y = angle;
      frond.castShadow = true;
      palmGroup.add(frond);
    }

    const coconutMat = new THREE.MeshLambertMaterial({ color: 0x4E342E, flatShading: true });
    for (let c = 0; c < 3; c++) {
      const cocoGeo = new THREE.DodecahedronGeometry(0.26, 0);
      const coco = new THREE.Mesh(cocoGeo, coconutMat);
      coco.position.set(
        currentX + (Math.random() - 0.5) * 0.3,
        currentY - 0.15,
        currentZ + (Math.random() - 0.5) * 0.3
      );
      palmGroup.add(coco);
    }

    return palmGroup;
  }
}
