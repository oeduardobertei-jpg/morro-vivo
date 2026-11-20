import * as THREE from 'three';
import { createStylizedMaterial, getSharedStylizedMaterial, SHARED_SHADER_UNIFORMS } from '../render/StylizedMaterials.js';

export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.palms = [];
    this.plateaus = [];

    // Escala Continental Integrada (1280m x 1040m):
    // Ao Sul (+Z): Oceano Atlântico aberto; ao Norte (-Z): Cordilheira contínua da Serra do Mar (sem mar atrás da serra!)
    this.sizeX = 1280;
    this.sizeZ = 1040;
    this.segsX = 300;
    this.segsZ = 260;

    // Zonas Oficiais de Expansão Contínua (Oeste, Leste e Norte) prontas para novos bairros e obras
    this.expansionZones = {
      westValley: {
        id: 'west_valley',
        name: 'Vale & Enseada do Poente',
        bounds: { xMin: -340, xMax: -148, zMin: -115, zMax: 16 }
      },
      eastValley: {
        id: 'east_valley',
        name: 'Vale Verde & Prainha do Levante',
        bounds: { xMin: 148, xMax: 340, zMin: -115, zMax: 16 }
      },
      northHighlands: {
        id: 'north_highlands',
        name: 'Chapada & Cordilheira da Serra',
        bounds: { xMin: -185, xMax: 185, zMin: -220, zMax: -138 }
      }
    };

    this.init();
    this.scene.add(this.group);
  }

  // Exact O(1) barycentric triangle interpolation on the rendered 3D terrain mesh
  // Guarantees 100% millimeter-accurate ground contact for NPCs, stairs, and props (including after terraforming!)
  getElevation(x, z) {
    if (this.terrainMesh && this.terrainMesh.geometry && this.terrainMesh.geometry.attributes.position) {
      const sizeX = this.sizeX || 960;
      const sizeZ = this.sizeZ || 840;
      const segsX = this.segsX || 280;
      const segsZ = this.segsZ || 240;
      const stride = segsX + 1;

      const u = ((x + sizeX * 0.5) / sizeX) * segsX;
      const v = ((z + sizeZ * 0.5) / sizeZ) * segsZ;

      if (u >= 0 && u <= segsX && v >= 0 && v <= segsZ) {
        const ix = Math.min(segsX - 1, Math.max(0, Math.floor(u)));
        const iz = Math.min(segsZ - 1, Math.max(0, Math.floor(v)));
        const fx = u - ix;
        const fz = v - iz;

        const pos = this.terrainMesh.geometry.attributes.position;
        const row0 = iz * stride + ix;
        const row1 = (iz + 1) * stride + ix;

        const y00 = pos.getY(row0);
        const y10 = pos.getY(row0 + 1);
        const y01 = pos.getY(row1);
        const y11 = pos.getY(row1 + 1);

        // PlaneGeometry splits each quad along the diagonal (0,1)-(1,0), i.e., fx + fz = 1
        if (fx + fz <= 1.0) {
          return y00 + fx * (y10 - y00) + fz * (y01 - y00);
        } else {
          return y11 + (1.0 - fx) * (y01 - y11) + (1.0 - fz) * (y10 - y11);
        }
      }
    }
    return this.getAnalyticalElevation(x, z);
  }

  // Smooth, gentle, rolling Rio de Janeiro coastal landscape (Analytical base formula)
  // Continental scale encompassing Western Highlands, Central Morro, Northern Serra, Eastern Highlands,
  // plus continuous Expansion Valleys (West/East) and the Northern Serra Carioca Cordillera!
  getAnalyticalElevation(x, z) {
    // Shoreline curve (grand crescent Atlantic bay with wide golden sand beach + natural headland coves at |x| > 310)
    const headlandCurve = Math.max(0.0, (Math.abs(x) - 310.0) / 130.0);
    const shoreZ = 74.0 + Math.sin(x * 0.015) * 3.5 - (headlandCurve * headlandCurve * 82.0);

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

    const smoothStep01 = (t) => {
      const c = Math.max(0.0, Math.min(1.0, t));
      return c * c * (3.0 - 2.0 * c);
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

      // Combinação orgânica dos maciços geológicos centrais
      let baseHill = Math.max(peak1, peak2 + peak1 * 0.25);

      // 3. MARGENS DE EXPANSÃO CONTÍNUA & CORDILHEIRA DE FUNDO (Ativadas suavemente além de |X| > 138 ou Z < -130)
      // Garante 100% de preservação milimétrica do mapa atual enquanto elimina o "limbo" nas extremidades!
      const outerXBlend = smoothStep01((Math.abs(nx) - 138.0) / 30.0);
      const outerZBlend = nz < -130.0 ? smoothStep01((-130.0 - nz) / 28.0) : 0.0;
      const outerBlend = Math.max(outerXBlend, outerZBlend);

      if (outerBlend > 0.0) {
        // A. Vale & Enseada do Poente (Expansão Oeste: X de -145 a -360) + Serra do Poente + Pontal Rochoso
        const dWestValley = Math.hypot((nx - (-235.0)) / 125.0, (nz - (-55.0)) / 95.0);
        const westValleyHill = Math.pow(Math.max(0.0, 1.0 - dWestValley), 1.6) * 15.5;

        const dWestSerra = Math.hypot((nx - (-255.0)) / 145.0, (nz - (-165.0)) / 120.0);
        const westSerraPeak = smoothStep01(1.0 - dWestSerra) * 38.0;

        const dWestHeadland = Math.hypot((nx - (-375.0)) / 75.0, (nz - (-20.0)) / 70.0);
        const westHeadland = smoothStep01(1.0 - dWestHeadland) * 23.0;

        // B. Vale Verde & Prainha do Levante (Expansão Leste: X de +145 a +360) + Maciço Oriental + Cabo Nascente
        const dEastValley = Math.hypot((nx - 235.0) / 125.0, (nz - (-50.0)) / 95.0);
        const eastValleyHill = Math.pow(Math.max(0.0, 1.0 - dEastValley), 1.6) * 16.5;

        const dEastSerra = Math.hypot((nx - 250.0) / 145.0, (nz - (-160.0)) / 120.0);
        const eastSerraPeak = smoothStep01(1.0 - dEastSerra) * 40.0;

        const dEastHeadland = Math.hypot((nx - 375.0) / 75.0, (nz - (-15.0)) / 70.0);
        const eastHeadland = smoothStep01(1.0 - dEastHeadland) * 24.5;

        // C. Chapada & Cordilheira da Serra Carioca (Expansão Norte: Z de -135 a -350)
        // Platô de sela edificável (Z: -138 a -215) + Picos soberanos de granito ao fundo (Z: -220 a -330)
        const dNorthSaddle = Math.hypot(nx / 210.0, (nz - (-175.0)) / 75.0);
        const northSaddle = smoothStep01(1.0 - dNorthSaddle) * 21.0;

        const dCordilleraCenter = Math.hypot((nx - 10.0) / 175.0, (nz - (-268.0)) / 95.0);
        const cordilleraCenter = smoothStep01(1.0 - dCordilleraCenter) * 52.0;

        const dCordilleraWest = Math.hypot((nx - (-145.0)) / 140.0, (nz - (-250.0)) / 90.0);
        const cordilleraWest = smoothStep01(1.0 - dCordilleraWest) * 45.0;

        const dCordilleraEast = Math.hypot((nx - 155.0) / 140.0, (nz - (-245.0)) / 90.0);
        const cordilleraEast = smoothStep01(1.0 - dCordilleraEast) * 47.0;

        const expansionMass = Math.max(
          westValleyHill,
          westSerraPeak,
          westHeadland,
          eastValleyHill,
          eastSerraPeak,
          eastHeadland,
          northSaddle,
          cordilleraCenter,
          cordilleraWest,
          cordilleraEast
        );

        baseHill = Math.max(baseHill, expansionMass * outerBlend);
      }

      // Ruído Fractal suave para textura geológica natural
      const noiseDetail = getFBM(nx, nz) * 3.6;
      
      // O Litoral: a montanha morre suavemente na areia do calçadão em Z=18.5
      // Nos cabos rochosos extremos (|X| > 335), o promontório avança um pouco mais rumo à enseada
      const headlandAdvance = smoothStep01((Math.abs(nx) - 335.0) / 60.0) * 18.0;
      let coastFade = Math.max(0, Math.min(1, ((18.5 + headlandAdvance) - nz) / 26.0)); 
      
      // Cordilheira Continental de Fundo (Serra do Mar contínua ao Norte, Z < -200 até -520):
      // Mantém uma cadeia montanhosa verde e orgânica atrás do morro, eliminando 100% o mar atrás da serra!
      let northernBackdrop = 0.0;
      if (nz < -185.0) {
        const backT = smoothStep01((-185.0 - nz) / 95.0);
        const ridgeWave = Math.sin(nx * 0.011) * 12.0 + Math.cos(nx * 0.027 + 0.8) * 7.5 + Math.sin(nz * 0.016) * 6.0;
        northernBackdrop = backT * (32.0 + ridgeWave);
      }

      let el = Math.max(0, Math.max(baseHill, northernBackdrop) + noiseDetail) * coastFade;
      el += 0.82; // Cota base continental
      return el;
    };

    let elevation = getNaturalElevation(x, z);

    // ==========================================
    // EROSÃO ORGÂNICA DE MONUMENTOS (V3.1.1)
    // ==========================================
    const smoothBlend = (t) => t * t * (3 - 2 * t);

    // A. Soccer Pitch Terrace at (x: 55, z: 4)
    // Platô retangular nivelado com folga de terraplanagem estendida para impedir que o morro invada o campo
    const dxPitch = Math.abs(x - 55);
    const dzPitch = Math.abs(z - 4);
    if (dxPitch < 17.5 && dzPitch < 12.5) {
      const flatExtentX = 13.5; // Folga além da linha de fundo (11.2m)
      const flatExtentZ = 9.5;  // Folga além da linha lateral (7.2m)
      let tX = Math.max(0, Math.min(1, (dxPitch - flatExtentX) / 4.0));
      let tZ = Math.max(0, Math.min(1, (dzPitch - flatExtentZ) / 3.0));
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
    const dPipas = Math.hypot(x - (-78), z - (-50));
    if (dPipas < 12.0) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dPipas - 8.5) / 3.5)));
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

    // Q. Pipódromo do Alto do Levante at (x: 88, z: -48)
    const dPip = Math.hypot(x - 88, z - (-48));
    if (dPip < 9.5) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dPip - 6.8) / 2.7)));
      elevation = elevation * t + getNaturalElevation(88, -48) * (1 - t);
    }

    // R. Mesa de Dominó do Poente at (x: -64, z: -44)
    const dDomino = Math.hypot(x - (-64), z - (-44));
    if (dDomino < 5.8) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dDomino - 3.6) / 2.2)));
      elevation = elevation * t + getNaturalElevation(-64, -44) * (1 - t);
    }

    // S. Rancho das Canoas do Poente at (x: -100, z: -38) & Mirante das Falésias at (x: -95, z: -68)
    const dRancho = Math.hypot(x - (-100), z - (-38));
    if (dRancho < 6.8) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dRancho - 4.4) / 2.4)));
      elevation = elevation * t + getNaturalElevation(-100, -38) * (1 - t);
    }
    const dFalesias = Math.hypot(x - (-95), z - (-68));
    if (dFalesias < 6.5) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dFalesias - 4.2) / 2.3)));
      elevation = elevation * t + getNaturalElevation(-95, -68) * (1 - t);
    }

    // T. Trilha da Crista Oriental at (x: 70, z: -72) & Pomar Agroflorestal at (x: 96, z: -28)
    const dCrista = Math.hypot(x - 70, z - (-72));
    if (dCrista < 6.5) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dCrista - 4.2) / 2.3)));
      elevation = elevation * t + getNaturalElevation(70, -72) * (1 - t);
    }
    const dPomar = Math.hypot(x - 96, z - (-28));
    if (dPomar < 7.8) {
      const t = smoothBlend(Math.max(0, Math.min(1, (dPomar - 5.2) / 2.6)));
      elevation = elevation * t + getNaturalElevation(96, -28) * (1 - t);
    }

    // U. Novos Núcleos Policêntricos dos Vales, Sela Norte e Bolsões Intermediários (Sprint 8)
    const polycentricTerraces = [
      { cx: -216.0, cz: -14.0,  r: 15.0, flat: 9.0 }, // Capela Caiçara do Pontal Oeste
      { cx: 216.0,  cz: -14.0,  r: 15.0, flat: 9.0 }, // Praça do Chafariz & Bocha do Levante
      { cx: -66.0,  cz: -132.0, r: 15.0, flat: 9.0 }, // Sítio Agroecológico da Sela Oeste
      { cx: -2.0,   cz: -170.0, r: 15.0, flat: 9.0 }, // Anfiteatro de Pedra da Sela Norte
      { cx: -62.0,  cz: -66.0,  r: 9.5,  flat: 5.5 }, // Largo do Ipê Oeste
      { cx: 56.0,   cz: -64.0,  r: 9.5,  flat: 5.5 }  // Largo do Ipê Leste
    ];
    for (let u = 0; u < polycentricTerraces.length; u++) {
      const pt = polycentricTerraces[u];
      const distT = Math.hypot(x - pt.cx, z - pt.cz);
      if (distT < pt.r) {
        const t = smoothBlend(Math.max(0, Math.min(1, (distT - pt.flat) / (pt.r - pt.flat))));
        elevation = elevation * t + getNaturalElevation(pt.cx, pt.cz) * (1 - t);
      }
    }

    // Smooth sandy beach slope into the water:
    // Spans from calçadão edge (z ~ 16, y ~ 0.82m) down to the water's edge (shoreZ ~ 74, y ~ 0.0m)
    const headlandAdvance = smoothBlend(Math.max(0.0, Math.min(1.0, (Math.abs(x) - 335.0) / 60.0))) * 18.0;
    const beachStartZ = 16.0 + headlandAdvance;
    if (z > beachStartZ && z <= shoreZ) {
      const beachBlend = Math.min(1.0, Math.max(0.0, (z - beachStartZ) / Math.max(4.0, shoreZ - beachStartZ)));
      // Organic curve: spacious dry beach shelf (y ~ 0.75m .. 0.35m) with smooth slope into surf
      const targetBeachY = 0.82 * Math.pow(1.0 - beachBlend, 1.25);
      elevation = elevation * (1 - beachBlend) + targetBeachY * beachBlend;
      elevation = Math.max(0.0, elevation);
    } else {
      elevation = Math.max(0.15, elevation);
    }

    // Costas Laterais dos Cabos Extremos (Apenas nas extremidades Leste/Oeste |X| > 460 próximas ao mar):
    // Ao Norte (Z < -150), a massa continental da Serra do Mar permanece elevada sem jamais afundar no oceano!
    const coastWobbleX = Math.sin(z * 0.018) * 18.0 + Math.cos(z * 0.041) * 9.0;
    const maxLandX = 465.0 + coastWobbleX + (z < -120.0 ? (-120.0 - z) * 0.45 : 0.0);
    const edgeX = Math.max(0.0, (Math.abs(x) - maxLandX) / 68.0);
    const skirtT = Math.min(1.0, edgeX);
    if (skirtT > 0.0) {
      const s = smoothBlend(skirtT);
      elevation = elevation * (1.0 - s) + (-5.5) * s;
    }

    return elevation;
  }

  // Centralized Registry of all Protected Landmarks, Decks, Mirantes, Stations, Parks & Junctions
  // Prevents houses, terrain leveling, or road slabs from ever overlapping community monuments!
  isProtectedLandmark(x, z, margin = 0.0) {
    // 1. Praça do Samba & Alameda do Samba
    if (Math.hypot(x - (-2.0), z - (-4.0)) < 13.5 + margin) return true;
    if (Math.abs(x - (-2.0)) < 4.5 + margin && z >= -21.5 - margin && z <= -8.5 + margin) return true;
    // Encruzilhada da Alameda (impede casas de bloquearem o fluxo de pedestres na base da escadaria)
    if (Math.hypot(x - (-6.0), z - (-19.5)) < 4.8 + margin) return true;

    // 2. Campinho de Futebol & Mercado Cultural + Açougue/Peixaria da Várzea
    if (Math.abs(x - 55.0) < 16.5 + margin && Math.abs(z - 4.0) < 11.5 + margin) return true;
    if (Math.abs(x - 76.5) < 12.2 + margin && Math.abs(z - 4.0) < 8.5 + margin) return true;

    // 3. Olarias, Fazendas Agroflorestais & Polos Produtivos (Pedreira, Serraria, Criação)
    if (Math.abs(x - (-22.0)) < 9.5 + margin && Math.abs(z - (-14.0)) < 7.5 + margin) return true;
    if (Math.hypot(x - 95.0, z - (-18.0)) < 10.0 + margin) return true; // Grande Olaria Leste
    if (Math.abs(x - 82.0) < 10.5 + margin && Math.abs(z - (-8.0)) < 7.5 + margin) return true;
    if (Math.abs(x - 75.0) < 9.5 + margin && Math.abs(z - (-45.0)) < 6.8 + margin) return true; // Socalcos Leste
    if (Math.abs(x - 96.0) < 7.5 + margin && Math.abs(z - (-28.0)) < 5.8 + margin) return true; // Pomar Agroflorestal
    if (Math.hypot(x - (-46.0), z - (-86.0)) < 9.5 + margin) return true; // Pedreira da Serra
    if (Math.hypot(x - 118.0, z - (-48.0)) < 9.5 + margin) return true; // Serraria Sustentável
    if (Math.hypot(x - 64.0, z - (-31.0)) < 7.8 + margin) return true;  // Criação Caipira

    // 4. Parque Solar, Nascente, Torre de Rádio, Mirante Imperial & Turbinas Eólicas (Alto da Serra)
    if (Math.abs(x - (-18.0)) < 12.2 + margin && Math.abs(z - (-72.0)) < 9.5 + margin) return true; // Parque Solar
    if (Math.hypot(x - (-8.0), z - (-65.0)) < 5.5 + margin) return true; // Nascente da Serra
    if (Math.hypot(x - 0.0, z - (-104.0)) < 6.0 + margin) return true; // Torre de Rádio
    if (Math.hypot(x - 50.0, z - (-110.0)) < 11.5 + margin) return true; // Mirante Imperial
    if (Math.abs(x - 50.0) <= 18.0 + margin && z <= -94.0 + margin && z >= -118.0 - margin) return true;
    // Turbinas Eólicas na crista norte limpa (longe das estradas da Coroa das Alturas!)
    if (Math.hypot(x - (-42.0), z - (-116.0)) < 8.5 + margin) return true; // Turbina 1
    if (Math.hypot(x - (-16.0), z - (-120.0)) < 8.5 + margin) return true; // Turbina 2
    if (Math.hypot(x - 26.0, z - (-116.0)) < 8.5 + margin) return true;    // Turbina 3

    // 5. Corredor Panorâmico Dedicado do Bondinho (Eixo X = 32.0, Z = 15 até -64 — proteção contínua!)
    if (Math.abs(x - 32.0) < 7.8 + margin && z <= 16.5 + margin && z >= -65.0 - margin) return true;

    // 5B. Núcleos Comunitários Expandidos (Jongo, Feirinha, Coreto, Basquete, Galpão, Mirante Sela + Sprint 8)
    if (Math.hypot(x - (-118.0), z - (-82.0)) < 8.5 + margin) return true; // Terreiro do Jongo
    if (Math.hypot(x - (-142.0), z - (-42.0)) < 9.0 + margin) return true; // Feirinha do Poente
    if (Math.hypot(x - (-32.0), z - (-102.0)) < 8.5 + margin) return true; // Coreto da Serra
    if (Math.hypot(x - 142.0, z - (-42.0)) < 9.5 + margin) return true;    // Quadra de Basquete
    if (Math.hypot(x - 118.0, z - (-82.0)) < 8.5 + margin) return true;    // Galpão Cultural
    if (Math.hypot(x - 28.0, z - (-136.0)) < 8.0 + margin) return true;    // Mirante Sela Norte
    if (Math.hypot(x - (-216.0), z - (-14.0)) < 9.5 + margin) return true; // Capela Caiçara do Pontal Oeste
    if (Math.hypot(x - 216.0, z - (-14.0)) < 10.0 + margin) return true;   // Praça do Chafariz & Bocha do Levante
    if (Math.hypot(x - (-66.0), z - (-132.0)) < 9.5 + margin) return true; // Sítio Agroecológico da Sela Oeste
    if (Math.hypot(x - (-2.0), z - (-170.0)) < 9.5 + margin) return true;  // Anfiteatro de Pedra da Sela Norte
    if (Math.hypot(x - (-62.0), z - (-66.0)) < 6.0 + margin) return true;  // Largo Comunitário Oeste
    if (Math.hypot(x - 56.0, z - (-64.0)) < 6.0 + margin) return true;     // Largo Comunitário Leste

    // 6. Mirantes, Decks, Capoeira, Horta, Dominó e Rancho do Flanco Oeste (Poente)
    if (Math.hypot(x - (-78.0), z - (-50.0)) < 10.5 + margin) return true; // Mirante das Pipas (14m deck)
    if (Math.hypot(x - (-64.0), z - (-44.0)) < 5.2 + margin) return true; // Mesa de Dominó do Poente
    if (Math.hypot(x - (-100.0), z - (-38.0)) < 6.2 + margin) return true; // Rancho das Canoas do Poente
    if (Math.hypot(x - (-95.0), z - (-68.0)) < 5.8 + margin) return true; // Mirante das Falésias do Poente
    if (Math.hypot(x - (-98.0), z - (-55.0)) < 6.0 + margin) return true; // Mirante do Pôr do Sol
    if (Math.hypot(x - (-95.0), z - 0.0) < 8.2 + margin) return true; // Vila dos Pescadores do Poente
    if (Math.hypot(x - (-110.0), z - (-15.0)) < 7.5 + margin) return true; // Terreiro de Capoeira
    if (Math.abs(x - (-92.0)) < 6.0 + margin && Math.abs(z - (-25.0)) < 4.8 + margin) return true; // Horta em Socalcos

    // 7. Pipódromo, Mirante do Levante, Trilha da Crista, Academia e Mototáxi (Flanco Leste)
    if (Math.hypot(x - 88.0, z - (-48.0)) < 9.0 + margin) return true; // Pipódromo do Alto do Levante
    if (Math.hypot(x - 98.0, z - (-55.0)) < 6.0 + margin) return true; // Mirante do Sol Nascente
    if (Math.hypot(x - 70.0, z - (-72.0)) < 5.5 + margin) return true; // Trilha da Crista Oriental
    if (Math.abs(x - 112.0) < 7.0 + margin && Math.abs(z - (-12.0)) < 5.2 + margin) return true; // Academia ao Ar Livre
    if (Math.abs(x - 92.0) < 4.0 + margin && Math.abs(z - 14.0) < 3.5 + margin) return true; // Ponto de Mototáxi

    return false;
  }

  init() {
    this.createCohesiveTerrainMesh();
    this.generateAllTerritoryPlateaus();
    this.createBiomeEcosystem();
  }

  createCohesiveTerrainMesh() {
    const sizeX = this.sizeX || 960;
    const sizeZ = this.sizeZ || 840;
    const segsX = this.segsX || 280;
    const segsZ = this.segsZ || 240;

    const geometry = new THREE.PlaneGeometry(sizeX, sizeZ, segsX, segsZ);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const colors = [];

    const colorMeadowGreen = new THREE.Color('#5F9B52'); // Warm sunlit hillside grass
    const colorLushGreen = new THREE.Color('#478046');   // Deep tropical lawn
    const colorRichGreen = new THREE.Color('#2E663D');   // Deep Atlantic Forest canopy green
    const colorSand = new THREE.Color('#ECD196');        // Warm golden Rio beach sand
    const colorWetSand = new THREE.Color('#C3A369');     // Wet sand near surf
    const colorShallowSand = new THREE.Color('#78B7AF'); // Transition sand-turquoise shallow floor
    const colorSeabedTurquoise = new THREE.Color('#19647E'); // Shallow clear coastal water floor
    const colorDeepAbyss = new THREE.Color('#021226');   // Deep dark ocean floor
    const colorGraniteRock = new THREE.Color('#68707A');  // Morro granite rock
    const colorDarkGranite = new THREE.Color('#4B5563');  // High cordillera granite peak
    const colorEarth = new THREE.Color('#86634F');        // Exposed reddish-brown tropical dirt

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      let h = this.getAnalyticalElevation(x, z);
      
      // Calculate local slope
      const hx = this.getAnalyticalElevation(x + 1.0, z);
      const hz = this.getAnalyticalElevation(x, z + 1.0);
      const slope = Math.hypot(hx - h, hz - h);

      // Slight organic terrain jitter on hills only (never on landmark plateaus or coastal borders)
      if (h > 0.5 && z < 16 && Math.abs(x) < 395 && z > -335 && !this.isProtectedLandmark(x, z, 2.0)) {
        h += (Math.random() - 0.5) * 0.08;
      }
      pos.setY(i, h);

      const vertexColor = new THREE.Color();
      const headlandCurve = Math.max(0.0, (Math.abs(x) - 310.0) / 130.0);
      const shoreZ = 74.0 + Math.sin(x * 0.015) * 3.5 - (headlandCurve * headlandCurve * 82.0);
      const beachStartZ = 16.0 + Math.max(0.0, Math.min(1.0, (Math.abs(x) - 335.0) / 60.0)) * 18.0;

      if (z > shoreZ) {
        // Leito marinho subaquático com degradê contínuo areia molhada -> raso turquesa -> abismo
        const dz = z - shoreZ;
        if (dz <= 6.0) {
          vertexColor.copy(colorWetSand).lerp(colorShallowSand, dz / 6.0);
        } else if (dz <= 16.0) {
          vertexColor.copy(colorShallowSand).lerp(colorSeabedTurquoise, (dz - 6.0) / 10.0);
        } else {
          const depthT = Math.min(1.0, (dz - 16.0) / 42.0);
          vertexColor.copy(colorSeabedTurquoise).lerp(colorDeepAbyss, depthT);
        }
      } else if (Math.abs(x) > 455 && z > -140) {
        // Costões rochosos nos cabos extremos poente/levante descendo ao mar
        vertexColor.copy(colorGraniteRock).lerp(colorWetSand, Math.max(0, 1.0 - h / 3.5));
      } else if (z > beachStartZ && Math.abs(x) < 385) {
        // Faixa contínua e uniforme de areia dourada da praia (Central e enseadas expandidas)
        const wetDist = shoreZ - z;
        if (wetDist < 9.5) {
          const wetT = Math.max(0.0, Math.min(1.0, 1.0 - (wetDist / 9.5)));
          vertexColor.copy(colorSand).lerp(colorWetSand, wetT);
        } else {
          vertexColor.copy(colorSand);
        }
      } else if (z <= -60 && Math.abs(x) <= 32 && z >= -130) {
        // Lush clean lawn for the Mirante
        vertexColor.copy(colorMeadowGreen).lerp(colorLushGreen, 0.4);
      } else {
        // Morro Carioca, Vales de Expansão & Cordilheira da Serra do Mar:
        // Transição 100% orgânica e contínua em 2D (sem listras diagonais matemáticas!)
        const isMorroDoSol = Math.hypot(x - (-2.0), z - (-4.0)) < 28.0;
        const organicPatch = (
          Math.sin(x * 0.037 + Math.cos(z * 0.041) * 2.2) * 0.5 +
          Math.cos(z * 0.033 - Math.sin(x * 0.029) * 2.2) * 0.5
        ); // [-1..+1] manchas orgânicas suaves

        if (!isMorroDoSol && (slope > 0.92 || (slope > 0.72 && z < -90 && z > -245))) {
          // Apenas escarpas íngremes expõem rocha granítica natural
          const rockBlend = Math.min(1.0, (slope - 0.68) / 0.45);
          vertexColor.copy(colorRichGreen).lerp(colorGraniteRock, rockBlend * 0.85);
        } else if (slope > 0.36 && z > -210) {
          // Encostas habitáveis com suave mescla de grama tropical e terra batida
          const earthBlend = Math.min(1.0, (slope - 0.36) / 0.55);
          vertexColor.copy(colorLushGreen).lerp(colorEarth, earthBlend * 0.50);
        } else {
          // Vales, colinas e Cordilheira da Serra do Mar: degradê contínuo de verdes tropicais
          const meadowMix = Math.max(0.0, Math.min(1.0, (organicPatch + 0.65) * 0.55));
          const forestDepth = Math.max(0.0, Math.min(1.0, ((-z - 95.0) / 160.0) + (Math.abs(x) > 220 ? 0.25 : 0.0)));
          vertexColor.copy(colorLushGreen).lerp(colorMeadowGreen, meadowMix * (1.0 - forestDepth * 0.65));
          if (forestDepth > 0.15) {
            vertexColor.lerp(colorRichGreen, forestDepth * 0.65);
          }
        }
      }

      colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.93,
      metalness: 0.0,
      flatShading: false
    });
    material.customProgramCacheKey = () => 'morro_terrain_splat_v2';
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uNightFactor = SHARED_SHADER_UNIFORMS.uNightFactor;
      shader.uniforms.uSunsetFactor = SHARED_SHADER_UNIFORMS.uSunsetFactor;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vTerrWorldPos;
varying vec3 vTerrWorldNorm;`
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
vTerrWorldPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
vTerrWorldNorm = normalize( mat3( modelMatrix ) * objectNormal );`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uSunsetFactor;
varying vec3 vTerrWorldPos;
varying vec3 vTerrWorldNorm;

float trHash2(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.5);
  return fract(p.x * p.y);
}
float trNoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(trHash2(i), trHash2(i + vec2(1.0, 0.0)), f.x),
    mix(trHash2(i + vec2(0.0, 1.0)), trHash2(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
float trMacro = trNoise2(vTerrWorldPos.xz * 0.09);
float trMid = trNoise2(vTerrWorldPos.xz * 0.42 + vec2(11.3, 5.7));
float trFine = trNoise2(vTerrWorldPos.xz * 1.85);
float trSlope = 1.0 - clamp(vTerrWorldNorm.y, 0.0, 1.0);
float trSandZone = (1.0 - smoothstep(1.2, 2.8, vTerrWorldPos.y)) * smoothstep(12.0, 22.0, vTerrWorldPos.z);

// Micro-detalhe + variação orgânica pictórica entre grama quente e esmeralda nas encostas
float trDetail = (trMacro * 0.45 + trMid * 0.35 + trFine * 0.20) - 0.5;
diffuseColor.rgb *= (1.0 + trDetail * 0.16);
float trMeadowShift = clamp(trMacro * 0.65 + trMid * 0.35, 0.0, 1.0);
float trGrassMask = (1.0 - trSandZone) * smoothstep(0.6, 2.5, vTerrWorldPos.y);
vec3 trSunlitGrass = diffuseColor.rgb * vec3(1.10, 1.06, 0.88);
vec3 trEmeraldGrass = diffuseColor.rgb * vec3(0.88, 1.02, 0.96);
diffuseColor.rgb = mix(diffuseColor.rgb, mix(trEmeraldGrass, trSunlitGrass, trMeadowShift), trGrassMask * 0.55);

// Banho suave de luz dourada nas encostas inclinadas ao entardecer
float trGoldenRim = smoothstep(0.06, 0.36, trSlope) * smoothstep(2.0, 18.0, vTerrWorldPos.y);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.16, 0.98, 0.80), trGoldenRim * uSunsetFactor * 0.45);

// Estrias minerais de granito em escarpas íngremes (independente da resolução da malha)
float trCliff = smoothstep(0.18, 0.42, trSlope) * smoothstep(2.5, 6.0, vTerrWorldPos.y);
float trStrata = trNoise2(vec2(vTerrWorldPos.x * 0.25 + vTerrWorldPos.z * 0.15, vTerrWorldPos.y * 0.95));
vec3 trGranite = mix(vec3(0.32, 0.36, 0.40), vec3(0.46, 0.49, 0.52), trStrata);
diffuseColor.rgb = mix(diffuseColor.rgb, trGranite, trCliff * 0.58);

// Ondulações sutis na areia da praia
float trSandRipple = sin(vTerrWorldPos.z * 3.8 + trMid * 2.2) * 0.5 + 0.5;
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.95 + 0.08 * trSandRipple), trSandZone);
diffuseColor.rgb = clamp(diffuseColor.rgb, 0.0, 1.0);`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
float trRN = trNoise2(vTerrWorldPos.xz * 1.6);
float trWetShore = (1.0 - smoothstep(-0.15, 0.45, vTerrWorldPos.y)) * smoothstep(16.0, 30.0, vTerrWorldPos.z);
roughnessFactor = clamp(mix(0.92 + (trRN - 0.5) * 0.08, 0.38, trWetShore), 0.28, 1.0);`
        );
    };

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.group.add(mesh);
    this.terrainMesh = mesh;
  }

  // DYNAMIC TERRAIN TERRAFORMING / MOLDING:
  // Smoothly levels the terrain vertices under a new construction site to create a flat pad
  levelTerrainAt(targetX, targetZ, radius = 3.8, targetY = null, strength = 1.0) {
    if (!this.terrainMesh || !this.terrainMesh.geometry) return;
    const pos = this.terrainMesh.geometry.attributes.position;
    const groundY = targetY !== null ? targetY : this.getElevation(targetX, targetZ);
    let modified = false;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      if (Math.abs(vx - targetX) > radius) continue;
      const vz = pos.getZ(i);
      if (Math.abs(vz - targetZ) > radius) continue;
      if (this.isProtectedLandmark(vx, vz, 1.0)) continue;
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

    const registerPlateauSafe = (pt, faction) => {
      // Strictly protect all 25+ landmarks, mirantes, decks, parks, stations, and junctions!
      if (this.isProtectedLandmark(pt.x, pt.z, 2.8)) return false;

      // Enforce pairwise minimum distance >= 7.5m to eliminate house overlap
      for (const p of this.plateaus) {
        if (Math.hypot(p.x - pt.x, p.z - pt.z) < 7.5) {
          return false;
        }
      }
      const y = this.getElevation(pt.x, pt.z);
      this.plateaus.push({
        id: `${faction}_${this.plateaus.length + 1}`,
        faction: faction,
        isStarter: !!pt.isStarter,
        order: this.plateaus.length,
        x: pt.x,
        y: y,
        z: pt.z
      });
      return true;
    };

    // 1. DISTRITO OESTE (Vila da Prainha, Cais & Colina do Poente)
    // Spans from coastal pier (-60) all the way into the vast Northwestern highlands (-105 to -35)
    const prainhaCoords = [
      // Humble Founding Starters (Prainha coastal cove)
      { x: -58, z: 12, isStarter: true },
      { x: -48, z: 11, isStarter: true },
      { x: -70, z: 12, isStarter: true },
      { x: -38, z: 12, isStarter: false },
      { x: -55, z: 4,  isStarter: true },
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
      { x: -125, z: -60, isStarter: false }, { x: -120, z: -85, isStarter: false }, { x: -135, z: -75, isStarter: false },
      // Expansion Ring 6 (VILAS ORGÂNICAS DO VALE DO POENTE: Agrupamentos naturais em curvas de nível, sem grade matemática!)
      // Vila Caiçara da Enseada Oeste (entorno de X: -156..-192, Z: 12..-10)
      { x: -149, z: 11,  isStarter: false }, { x: -161, z: 4,   isStarter: false }, { x: -174, z: 12,  isStarter: false },
      { x: -183, z: -3,  isStarter: false }, { x: -196, z: 7,   isStarter: false }, { x: -166, z: -11, isStarter: false },
      // Largo & Vila do Boteco do Poente (entorno de X: -175..-222, Z: -16..-44)
      { x: -176, z: -26, isStarter: false }, { x: -198, z: -14, isStarter: false }, { x: -206, z: -29, isStarter: false },
      { x: -188, z: -38, isStarter: false }, { x: -218, z: -21, isStarter: false }, { x: -224, z: -36, isStarter: false },
      // Vila do Pontal & Mirante Oeste (entorno de X: -228..-274, Z: 9..-52)
      { x: -228, z: 9,   isStarter: false }, { x: -244, z: 3,   isStarter: false }, { x: -258, z: 11,  isStarter: false },
      { x: -241, z: -14, isStarter: false }, { x: -264, z: -8,  isStarter: false }, { x: -236, z: -48, isStarter: false },
      { x: -254, z: -41, isStarter: false }, { x: -269, z: -28, isStarter: false },
      // Socalcos da Encosta Noroeste (entorno de X: -154..-238, Z: -62..-142)
      { x: -158, z: -64, isStarter: false }, { x: -174, z: -74, isStarter: false }, { x: -194, z: -66, isStarter: false },
      { x: -214, z: -78, isStarter: false }, { x: -234, z: -69, isStarter: false }, { x: -166, z: -98, isStarter: false },
      { x: -186, z: -108,isStarter: false }, { x: -208, z: -99, isStarter: false }, { x: -154, z: -128,isStarter: false },
      { x: -178, z: -136,isStarter: false }, { x: -202, z: -132,isStarter: false },
      // Preenchimento dos Bolsões Verdes do Poente (entre alças das estradas: X: -60..-245, Z: -120..5)
      { x: -138, z: -12, isStarter: false }, { x: -154, z: -18, isStarter: false }, { x: -146, z: -34, isStarter: false },
      { x: -128, z: -48, isStarter: false }, { x: -116, z: -56, isStarter: false }, { x: -136, z: -62, isStarter: false },
      { x: -152, z: -48, isStarter: false }, { x: -172, z: -52, isStarter: false }, { x: -184, z: -22, isStarter: false },
      { x: -216, z: -8,  isStarter: false }, { x: -212, z: -48, isStarter: false }, { x: -226, z: -56, isStarter: false },
      { x: -144, z: -84, isStarter: false }, { x: -128, z: -96, isStarter: false }, { x: -148, z: -108,isStarter: false },
      { x: -112, z: -104,isStarter: false }, { x: -96,  z: -98, isStarter: false }, { x: -78,  z: -104,isStarter: false },
      { x: -72,  z: -52, isStarter: false }, { x: -84,  z: -48, isStarter: false }, { x: -106, z: -24, isStarter: false }
    ];

    prainhaCoords.forEach(pt => registerPlateauSafe(pt, 'prainha'));

    // 2. DISTRITO CENTRAL (Morro do Sol & Encostas Centrais - Plenamente Adensado e Respeitando o Terreiro do Samba!)
    const solCoords = [
      // 1. Núcleo Fundador do Morro do Sol (12 moradias iniciais contornando o Terreiro a distância segura >= 17m)
      { x: -18, z: 2,   isStarter: true },
      { x: -19, z: 10,  isStarter: true },
      { x: -12, z: 14,  isStarter: true },
      { x: -5,  z: 15,  isStarter: true },
      { x: 4,   z: 15,  isStarter: true },
      { x: 19,  z: 6,   isStarter: true },
      { x: 22,  z: 13,  isStarter: true },
      { x: 23,  z: 0,   isStarter: true },
      { x: 23,  z: -8,  isStarter: true },
      { x: 25,  z: -16, isStarter: true },
      { x: 24,  z: -24, isStarter: true },
      { x: -14, z: -25, isStarter: true },
      { x: -22, z: -25, isStarter: true },

      // 2. Encostas Inferiores Leste e Oeste (Expansão contígua para os lados)
      { x: -26, z: 4,   isStarter: false },
      { x: -26, z: 12,  isStarter: false },
      { x: -18, z: 18,  isStarter: false },
      { x: -10, z: 22,  isStarter: false },
      { x: 0,   z: 22,  isStarter: false },
      { x: 10,  z: 22,  isStarter: false },
      { x: 20,  z: 18,  isStarter: false },
      { x: 28,  z: 6,   isStarter: false },
      { x: 30,  z: -2,  isStarter: false },
      { x: 30,  z: -10, isStarter: false },
      { x: 32,  z: -18, isStarter: false },
      { x: 30,  z: -26, isStarter: false },
      { x: 25,  z: -34, isStarter: false },

      // 3. Encostas Superiores Norte (Subindo contíguo em direção à Serra)
      { x: -30, z: -10, isStarter: false },
      { x: -30, z: -18, isStarter: false },
      { x: -28, z: -32, isStarter: false },
      { x: -20, z: -32, isStarter: false },
      { x: -12, z: -32, isStarter: false },
      { x: 0,   z: -32, isStarter: false },
      { x: 8,   z: -32, isStarter: false },
      { x: -24, z: -40, isStarter: false },
      { x: -16, z: -40, isStarter: false },
      { x: -8,  z: -40, isStarter: false },
      { x: 2,   z: -40, isStarter: false },
      { x: 22,  z: -42, isStarter: false },
      { x: -20, z: -48, isStarter: false },
      { x: -10, z: -48, isStarter: false },
      { x: 0,   z: -48, isStarter: false },
      { x: 8,   z: -48, isStarter: false },
      { x: 22,  z: -50, isStarter: false }
    ];

    solCoords.forEach(pt => registerPlateauSafe(pt, 'sol'));

    // 3. DISTRITO NORTE (Alto da Serra - Encostas e Sopé do Cume)
    // Zona de Exclusão Turística: O quadrilátero central do Cume (|X| <= 30 e Z <= -65) é estritamente
    // reservado para o Mirante da Vista Imperial e o Parque Solar/Eólico. Casas existem apenas no sopé e encostas!
    const serraCoords = [
      // Humble Founding Starters (Alto da Serra - Encostas do Sopé Norte)
      { x: -36, z: -60, isStarter: true },
      { x: -42, z: -68, isStarter: true },
      { x: 26,  z: -62, isStarter: true },
      { x: 34,  z: -70, isStarter: true },

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
      { x: -48, z: -78, isStarter: false }, { x: 48, z: -78, isStarter: false },

      // Vila da Sela da Serra & Chácaras do Norte (Agrupamentos orgânicos em torno da trilha sinuosa norte)
      { x: -118, z: -122, isStarter: false }, { x: -92,  z: -116, isStarter: false }, { x: -68,  z: -121, isStarter: false },
      { x: 68,   z: -119, isStarter: false }, { x: 94,   z: -115, isStarter: false }, { x: 118,  z: -123, isStarter: false },
      { x: -112, z: -141, isStarter: false }, { x: -86,  z: -148, isStarter: false }, { x: -58,  z: -143, isStarter: false },
      { x: -34,  z: -151, isStarter: false }, { x: -16,  z: -146, isStarter: false }, { x: 15,   z: -147, isStarter: false },
      { x: 35,   z: -152, isStarter: false }, { x: 59,   z: -144, isStarter: false }, { x: 88,   z: -149, isStarter: false },
      { x: 114,  z: -142, isStarter: false },
      { x: -96,  z: -166, isStarter: false }, { x: -66,  z: -171, isStarter: false }, { x: -38,  z: -168, isStarter: false },
      { x: -14,  z: -173, isStarter: false }, { x: 14,   z: -171, isStarter: false }, { x: 39,   z: -167, isStarter: false },
      { x: 68,   z: -172, isStarter: false }, { x: 96,   z: -165, isStarter: false },
      // Bolsões da Sela Central-Norte (Z: -82 a -138, X: -72 a +72)
      { x: -62,  z: -96,  isStarter: false }, { x: -44,  z: -94,  isStarter: false }, { x: -22,  z: -96,  isStarter: false },
      { x: 22,   z: -96,  isStarter: false }, { x: 44,   z: -94,  isStarter: false }, { x: 62,   z: -96,  isStarter: false },
      { x: -56,  z: -108, isStarter: false }, { x: -36,  z: -108, isStarter: false }, { x: -14,  z: -112, isStarter: false },
      { x: 14,   z: -112, isStarter: false }, { x: 36,   z: -108, isStarter: false }, { x: 56,   z: -108, isStarter: false },
      { x: -74,  z: -132, isStarter: false }, { x: 74,   z: -132, isStarter: false }
    ];


    serraCoords.forEach(pt => registerPlateauSafe(pt, 'serra'));

    // 4. DISTRITO LESTE (Polo da Várzea & Encostas do Levante)
    const varzeaCoords = [
      // Humble Founding Starters (Polo da Várzea - Arredores do Campinho & Mercado)
      { x: 42, z: 20,  isStarter: true },
      { x: 55, z: -18, isStarter: true },
      { x: 68, z: -18, isStarter: true },
      { x: 92, z: 4,   isStarter: true },
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
      { x: 125, z: -60, isStarter: false }, { x: 120, z: -85, isStarter: false }, { x: 135, z: -75, isStarter: false },
      // Expansion Ring 6 (VILAS ORGÂNICAS DO VALE DO LEVANTE: Agrupamentos naturais em curvas de nível, sem grade matemática!)
      // Vila dos Pescadores & Surfistas do Levante (entorno de X: 149..196, Z: 12..-11)
      { x: 149, z: 11,  isStarter: false }, { x: 162, z: 3,   isStarter: false }, { x: 175, z: 12,  isStarter: false },
      { x: 184, z: -4,  isStarter: false }, { x: 196, z: 8,   isStarter: false }, { x: 167, z: -11, isStarter: false },
      // Largo & Vila do Boteco do Levante (entorno de X: 176..224, Z: -14..-42)
      { x: 176, z: -25, isStarter: false }, { x: 198, z: -14, isStarter: false }, { x: 207, z: -28, isStarter: false },
      { x: 189, z: -39, isStarter: false }, { x: 218, z: -20, isStarter: false }, { x: 225, z: -35, isStarter: false },
      // Vila das Dunas & Mirante Leste (entorno de X: 228..270, Z: 10..-48)
      { x: 229, z: 9,   isStarter: false }, { x: 245, z: 3,   isStarter: false }, { x: 259, z: 11,  isStarter: false },
      { x: 242, z: -13, isStarter: false }, { x: 263, z: -7,  isStarter: false }, { x: 236, z: -47, isStarter: false },
      { x: 253, z: -40, isStarter: false }, { x: 268, z: -27, isStarter: false },
      // Socalcos da Encosta Nordeste (entorno de X: 154..234, Z: -64..-136)
      { x: 158, z: -63, isStarter: false }, { x: 175, z: -73, isStarter: false }, { x: 195, z: -65, isStarter: false },
      { x: 215, z: -77, isStarter: false }, { x: 234, z: -68, isStarter: false }, { x: 167, z: -97, isStarter: false },
      { x: 187, z: -107,isStarter: false }, { x: 209, z: -98, isStarter: false }, { x: 155, z: -127,isStarter: false },
      { x: 179, z: -135,isStarter: false }, { x: 203, z: -131,isStarter: false },
      // Preenchimento dos Bolsões Verdes do Levante (entre alças das estradas: X: 60..245, Z: -120..5)
      { x: 138, z: -12, isStarter: false }, { x: 154, z: -18, isStarter: false }, { x: 146, z: -34, isStarter: false },
      { x: 128, z: -48, isStarter: false }, { x: 116, z: -56, isStarter: false }, { x: 136, z: -62, isStarter: false },
      { x: 152, z: -48, isStarter: false }, { x: 172, z: -52, isStarter: false }, { x: 184, z: -22, isStarter: false },
      { x: 216, z: -8,  isStarter: false }, { x: 212, z: -48, isStarter: false }, { x: 226, z: -56, isStarter: false },
      { x: 144, z: -84, isStarter: false }, { x: 128, z: -96, isStarter: false }, { x: 148, z: -108,isStarter: false },
      { x: 112, z: -104,isStarter: false }, { x: 96,  z: -98, isStarter: false }, { x: 78,  z: -104,isStarter: false },
      { x: 72,  z: -52, isStarter: false }, { x: 84,  z: -48, isStarter: false }, { x: 106, z: -24, isStarter: false }
    ];

    varzeaCoords.forEach(pt => registerPlateauSafe(pt, 'varzea'));
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

      // Preservação do Campinho da Várzea e Monumentos/Mirantes Protegidos
      if (Math.abs(loc.x - 55) < 20.0 && Math.abs(loc.z - 4) < 14.0) return;
      if (this.isProtectedLandmark(loc.x, loc.z, 3.5)) return;

      // Preservação Residencial: nunca brotar sobre plateaus de casas
      if (this.allPlateaus && this.allPlateaus.some(pl => Math.hypot(pl.x - loc.x, pl.z - loc.z) < 7.5)) return;

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
      // Flanco Oeste da Encosta (recuado a |X| >= 26, emoldurando a vista para o mar e poente com passagem ampla para a via)
      { x: -28, z: -78, s: 2.8, rot: 0.4 },
      { x: -32, z: -84, s: 3.4, rot: 1.1 },
      { x: -36, z: -90, s: 3.8, rot: 2.0 },
      { x: -30, z: -98, s: 3.2, rot: 0.7 },

      // Flanco Leste da Encosta (recuado a |X| >= 26, emoldurando a vista para a várzea e baía com passagem ampla para a via)
      { x: 28,  z: -78, s: 2.8, rot: 1.2 },
      { x: 32,  z: -84, s: 3.4, rot: 2.2 },
      { x: 36,  z: -90, s: 3.8, rot: 0.5 },
      { x: 30,  z: -98, s: 3.2, rot: 1.8 },

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
      { x: 112,  z: 12, s: 2.8, rot: 2.5 },

      // E. Paredão Granítico Esculpido do Morro do Sol (lajes angulares rasas e embutidas no gnaisse central)
      { x: -12.0, z: 6.2,  s: 2.3, rot: 0.35, cliffFace: true, hMul: 0.42 },
      { x: -15.2, z: 0.8,  s: 2.6, rot: 1.25, cliffFace: true, hMul: 0.46 },
      { x: -16.8, z: -5.5, s: 2.4, rot: 2.10, cliffFace: true, hMul: 0.44 },
      { x: -8.2,  z: 10.6, s: 2.0, rot: 0.85, cliffFace: true, hMul: 0.38 },
      { x: -11.2, z: 12.6, s: 1.8, rot: 2.40, cliffFace: true, hMul: 0.36 },
      { x: 5.8,   z: 9.4,  s: 1.9, rot: 0.65, cliffFace: true, hMul: 0.40 },
      { x: 7.8,   z: 5.4,  s: 2.2, rot: 1.55, cliffFace: true, hMul: 0.44 },
      { x: 8.8,   z: 0.6,  s: 2.0, rot: 2.30, cliffFace: true, hMul: 0.42 },
      { x: -13.8, z: -11.0,s: 2.1, rot: 1.90, cliffFace: true, hMul: 0.40 }
    ];

    const safeMonoliths = monolithCoords.filter(b => {
      if (b.cliffFace) {
        const distSamba = Math.hypot(b.x - (-2.0), b.z - (-4.0));
        return distSamba > 10.5 && (!this.allPlateaus || !this.allPlateaus.some(pl => Math.hypot(pl.x - b.x, pl.z - b.z) < 5.5));
      }
      return !this.isProtectedLandmark(b.x, b.z, 4.5) &&
        (!this.allPlateaus || !this.allPlateaus.some(pl => Math.hypot(pl.x - b.x, pl.z - b.z) < 7.0));
    });
    const monolithMat = getSharedStylizedMaterial(0x747C85, 'stone', { flatShading: true });
    // Dodecaedro facetado angular (detail 0) para leitura geológica de granito em vez de pedras arredondadas
    const monolithGeo = new THREE.DodecahedronGeometry(1.2, 0);
    const monolithMesh = new THREE.InstancedMesh(monolithGeo, monolithMat, safeMonoliths.length);
    monolithMesh.castShadow = true;
    monolithMesh.receiveShadow = true;

    // Assentamento orgânico em lajes naturais: aspecto amplo, baixo e profundamente integrado ao relevo
    safeMonoliths.forEach((b, idx) => {
      const hMul = b.hMul || 0.42;
      const y = this.getElevation(b.x, b.z) - (b.s * (b.cliffFace ? 0.68 : 0.45));
      dummy.position.set(b.x, y, b.z);
      dummy.rotation.set(
        b.cliffFace ? (0.42 + (idx % 3) * 0.08) : (0.12 + (idx % 3) * 0.06),
        b.rot || idx * 0.7,
        0.08 + (idx % 2) * 0.05
      );
      dummy.scale.set(b.s * (b.cliffFace ? 1.85 : 1.8), b.s * hMul, b.s * (b.cliffFace ? 1.40 : 1.5));
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
      // Encostas Orientais (Afasta totalmente do Campinho em X=55, Z=4)
      { x: 74, z: -14 },  { x: 84, z: -20 },
      { x: 58, z: -28 },  { x: 70, z: -32 },  { x: 82, z: -38 },  { x: 92, z: -36 },
      { x: 64, z: -45 },  { x: 78, z: -52 },  { x: 88, z: -56 },  { x: 52, z: -60 },
      { x: 74, z: -65 },  { x: 84, z: -70 },  { x: 96, z: -66 },  { x: 40, z: -70 },
      // Quintais Verdes e Valas Centrais
      { x: -16, z: -12 }, { x: 16, z: -12 },  { x: -28, z: -8 },  { x: 28, z: -8 },
      { x: -42, z: -32 }, { x: -54, z: -50 }, { x: -62, z: -28 }, { x: -74, z: -58 },
      // Encosta Central do Morro do Sol (Casas e Escadaria)
      { x: -11, z: 8 },   { x: 12, z: 8 },    { x: -8, z: 0 },    { x: 9, z: 0 },
      { x: -15, z: -2 },  { x: 15, z: -2 },
      // Vales do Poente, Levante & Sela da Serra Norte (Sprint 8)
      { x: -165, z: -8 },  { x: -182, z: -34 }, { x: -202, z: -52 }, { x: -224, z: -28 },
      { x: -242, z: -12 }, { x: -252, z: -48 },
      { x: 165,  z: -8 },  { x: 182,  z: -34 }, { x: 202,  z: -52 }, { x: 224,  z: -28 },
      { x: 242,  z: -12 }, { x: 252,  z: -48 },
      { x: -96,  z: -126 },{ x: -72,  z: -148 }, { x: -28,  z: -158 }, { x: 28,   z: -158 },
      { x: 74,   z: -148 },{ x: 98,   z: -126 }
    ];

    const bananaLeafMat = getSharedStylizedMaterial(0x479948, 'foliage', {
      wind: 'frond',
      side: THREE.DoubleSide,
      flatShading: true
    });
    const bananaLeafGeo = new THREE.ConeGeometry(0.9, 2.7, 4);
    bananaLeafGeo.translate(0, 1.25, 0);
    bananaLeafGeo.rotateX(Math.PI / 3);

    const bananaMesh = new THREE.InstancedMesh(bananaLeafGeo, bananaLeafMat, bananaCoords.length * 3);
    bananaMesh.castShadow = true;

    let bInstIdx = 0;
    bananaCoords.forEach((bc, idx) => {
      // EVITAR SOBREPOSIÇÃO EM MONUMENTOS E ESTRUTURAS ESPECIAIS (1.2.2)
      const inCampinho = (Math.abs(bc.x - 55) < 20.0 && Math.abs(bc.z - 4) < 14.0);
      const inMarket = (Math.abs(bc.x - 75) < 10 && Math.abs(bc.z - 4) < 8);
      const inOlaria = (Math.abs(bc.x - (-22)) < 8 && Math.abs(bc.z - (-14)) < 6);
      const inAgro = (Math.abs(bc.x - 82) < 9 && Math.abs(bc.z - (-8)) < 6);
      const inSolar = (Math.abs(bc.x - (-18)) < 12 && Math.abs(bc.z - (-72)) < 10);
      const inCapoeira = (Math.hypot(bc.x - (-110), bc.z - (-15)) < 10);
      const inHorta = (Math.hypot(bc.x - (-92), bc.z - (-25)) < 10);
      const inAcademia = (Math.hypot(bc.x - 112, bc.z - (-12)) < 10);
      const inMoto = (Math.hypot(bc.x - 92, bc.z - 14) < 8);
      const inRadio = (Math.hypot(bc.x, bc.z - (-104)) < 8);
      const nearPlateau = this.allPlateaus && this.allPlateaus.some(pl => Math.hypot(pl.x - bc.x, pl.z - bc.z) < 7.5);
      if (inCampinho || inMarket || inOlaria || inAgro || inSolar || inCapoeira || inHorta || inAcademia || inMoto || inRadio || nearPlateau || this.isProtectedLandmark(bc.x, bc.z, 3.2)) return;

      const y = this.getElevation(bc.x, bc.z);
      for (let frond = 0; frond < 3; frond++) {
        dummy.position.set(bc.x, y + 0.45, bc.z);
        dummy.rotation.set(0.18, (frond * (Math.PI * 2 / 3)) + (idx * 0.45), 0.18);
        dummy.scale.set(1.15, 1.3, 1.15);
        dummy.updateMatrix();
        bananaMesh.setMatrixAt(bInstIdx++, dummy.matrix);
      }
    });
    bananaMesh.count = bInstIdx;
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

    const shrubMat = getSharedStylizedMaterial(0x558B34, 'foliage', {
      wind: 'crown',
      flatShading: true
    });
    const shrubGeo = new THREE.DodecahedronGeometry(0.9, 0);
    const shrubMesh = new THREE.InstancedMesh(shrubGeo, shrubMat, shrubCoords.length);
    shrubMesh.castShadow = true;

    let sInstIdx = 0;
    shrubCoords.forEach((sc, idx) => {
      const inCampinho = (Math.abs(sc.x - 55) < 20.0 && Math.abs(sc.z - 4) < 14.0);
      const inSolar = (Math.abs(sc.x - (-18)) < 12 && Math.abs(sc.z - (-72)) < 10);
      const inCapoeira = (Math.hypot(sc.x - (-110), sc.z - (-15)) < 10);
      const inHorta = (Math.hypot(sc.x - (-92), sc.z - (-25)) < 10);
      const inAcademia = (Math.hypot(sc.x - 112, sc.z - (-12)) < 10);
      const inMoto = (Math.hypot(sc.x - 92, sc.z - 14) < 8);
      const inRadio = (Math.hypot(sc.x, sc.z - (-104)) < 8);
      const nearPlateau = this.allPlateaus && this.allPlateaus.some(pl => Math.hypot(pl.x - sc.x, pl.z - sc.z) < 6.0);
      if (inCampinho || inSolar || inCapoeira || inHorta || inAcademia || inMoto || inRadio || nearPlateau || this.isProtectedLandmark(sc.x, sc.z, 3.0)) return;

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

    // ==========================================
    // 5B. CAMADA BOTÂNICA ORGÂNICA (Tufos de Capim + Buganvílias/Ipês Floridos em 3 Draw Calls!)
    // ==========================================
    this.createHillsideBotanicalLayer(dummy);

    // ==========================================
    // 6. ECOSSISTEMA CONTINENTAL DAS MARGENS DE EXPANSÃO (Oeste, Leste & Cordilheira Norte)
    // ==========================================
    this.createContinentalExpansionEcosystem(dummy);
  }

  /**
   * Quebra o aspecto liso da encosta com ~1.100 tufos de vegetação rasteira ao vento
   * e ~240 moitas floridas cariocas (buganvílias, ipês-mirins e hibiscos) em apenas 3 InstancedMeshes.
   */
  createHillsideBotanicalLayer(dummy) {
    // 1. Geometria ultraleve de tufo de capim (3 lâminas cruzadas = 6 triângulos por tufo)
    const blades = [];
    const angles = [0, Math.PI / 3, (Math.PI * 2) / 3];
    for (let a = 0; a < angles.length; a++) {
      const ang = angles[a];
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const w = 0.28;
      const h = 0.58;
      const lean = 0.14;
      // Triângulo 1 (lâmina inclinada suavemente)
      blades.push(
        -w * ca, 0.0, -w * sa,
         w * ca, 0.0,  w * sa,
         lean * sa, h, -lean * ca
      );
      // Lâmina secundária levemente cruzada
      blades.push(
        -w * 0.65 * ca, 0.0, -w * 0.65 * sa,
         w * 0.65 * ca, 0.0,  w * 0.65 * sa,
        -lean * sa, h * 0.82, lean * ca
      );
    }
    const tuftGeo = new THREE.BufferGeometry();
    tuftGeo.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3));
    tuftGeo.computeVertexNormals();

    const tuftMat = getSharedStylizedMaterial(0xFFFFFF, 'foliage', {
      wind: 'crown',
      side: THREE.DoubleSide,
      flatShading: true
    });

    const hash01 = (n) => {
      const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
      return s - Math.floor(s);
    };

    const isClearForFlora = (x, z, plateauMargin = 4.6) => {
      if (z > 15.2 || z < -184.0) return false; // Evita praia/avenida da orla e cordilheira extrema
      if (Math.abs(x) < 3.6 && z > 2.5 && z < 18.5) return false; // Faixa da Escadaria Monumental
      if (Math.abs(z - (-154.0)) < 4.5 && Math.abs(x) < 120.0) return false; // Faixa da Estrada da Sela Norte
      if (Math.abs(z - (-98.0)) < 4.2 && Math.abs(x) > 60.0 && Math.abs(x) < 142.0) return false; // Anéis médios Leste/Oeste
      if (this.isProtectedLandmark(x, z, 2.2)) return false;
      if (this.allPlateaus && this.allPlateaus.some(pl => Math.hypot(pl.x - x, pl.z - z) < plateauMargin)) return false;
      const y = this.getElevation(x, z);
      if (y < 2.2) return false;
      // Checa declive para não fincar capim em paredões verticais de granito
      const yx = this.getElevation(x + 1.0, z);
      const yz = this.getElevation(x, z + 1.0);
      const slope = Math.hypot(yx - y, yz - y);
      if (slope > 0.62) return false;
      return true;
    };

    const maxTufts = 1650;
    const tuftPositions = [];
    for (let i = 0; i < 3800 && tuftPositions.length < maxTufts; i++) {
      const rx = (hash01(i * 3.1 + 1.7) - 0.5) * 560.0;
      const rz = -180.0 + hash01(i * 5.7 + 4.3) * 195.0;
      if (!isClearForFlora(rx, rz, 4.5)) continue;
      tuftPositions.push({
        x: rx,
        y: this.getElevation(rx, rz),
        z: rz,
        rot: hash01(i * 7.3) * Math.PI * 2,
        sc: 0.72 + hash01(i * 11.1) * 0.75,
        tone: i % 4
      });
    }

    if (tuftPositions.length > 0) {
      const grassTuftMesh = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftPositions.length);
      grassTuftMesh.castShadow = false;
      grassTuftMesh.receiveShadow = true;
      const grassColors = [0x61A148, 0x4E8E3E, 0x76AA49, 0x569642];
      const col = new THREE.Color();
      for (let i = 0; i < tuftPositions.length; i++) {
        const tp = tuftPositions[i];
        dummy.position.set(tp.x, tp.y - 0.05, tp.z);
        dummy.rotation.set(0, tp.rot, 0);
        dummy.scale.set(tp.sc, tp.sc * (0.85 + (i % 3) * 0.16), tp.sc);
        dummy.updateMatrix();
        grassTuftMesh.setMatrixAt(i, dummy.matrix);
        col.setHex(grassColors[tp.tone]);
        grassTuftMesh.setColorAt(i, col);
      }
      grassTuftMesh.instanceMatrix.needsUpdate = true;
      if (grassTuftMesh.instanceColor) grassTuftMesh.instanceColor.needsUpdate = true;
      this.group.add(grassTuftMesh);
    }

    // 2. Moitas Floridas Tropicais (Buganvílias Magenta, Ipês-Mirins Amarelos, Hibiscos Coral & Jasmim)
    const bushSpots = [
      // Emoldurando o paredão central do Morro do Sol e as laterais da Escadaria Monumental
      { x: -5.2, z: 13.5, fl: 0 }, { x: 4.5, z: 14.0, fl: 1 },
      { x: -6.8, z: 9.2,  fl: 2 }, { x: 5.8, z: 9.8,  fl: 0 },
      { x: -10.2, z: 5.5, fl: 1 }, { x: 7.2, z: 4.8,  fl: 2 },
      { x: -13.2, z: -0.5, fl: 0 }, { x: 8.4, z: -1.2, fl: 1 },
      { x: -9.5, z: 14.5, fl: 3 }, { x: 8.8, z: 13.5, fl: 0 }
    ];

    const maxBushes = 320;
    for (let i = 0; i < 1400 && bushSpots.length < maxBushes; i++) {
      const rx = (hash01(i * 9.1 + 19.3) - 0.5) * 560.0;
      const rz = -178.0 + hash01(i * 13.7 + 2.9) * 193.0;
      if (!isClearForFlora(rx, rz, 5.4)) continue;
      bushSpots.push({ x: rx, z: rz, fl: i % 4 });
    }

    if (bushSpots.length > 0) {
      const leafGeo = new THREE.DodecahedronGeometry(0.68, 0);
      const bloomGeo = new THREE.DodecahedronGeometry(0.24, 0);

      // Reutiliza tuftMat (1 único shader PBR+wind+instanceColor para capim, arbustos e flores!)
      const bushLeafMesh = new THREE.InstancedMesh(leafGeo, tuftMat, bushSpots.length);
      bushLeafMesh.castShadow = false;
      bushLeafMesh.receiveShadow = true;

      const bushBloomMesh = new THREE.InstancedMesh(bloomGeo, tuftMat, bushSpots.length * 3);
      bushBloomMesh.castShadow = false;

      const leafShades = [0x3B7A36, 0x46883D, 0x316B31];
      const bloomColors = [0xD9468F, 0xF2BA38, 0xE86747, 0xF5EFE2]; // Buganvília, Ipê-mirim, Hibisco, Jasmim
      const col = new THREE.Color();

      let bIdx = 0;
      for (let i = 0; i < bushSpots.length; i++) {
        const bs = bushSpots[i];
        const by = this.getElevation(bs.x, bs.z);
        const sc = 0.78 + hash01(i * 4.3 + 0.5) * 0.58;
        const rot = hash01(i * 8.1) * Math.PI * 2;

        dummy.position.set(bs.x, by + 0.28 * sc, bs.z);
        dummy.rotation.set(0.15, rot, 0.1);
        dummy.scale.set(sc * 1.18, sc * 0.78, sc * 1.12);
        dummy.updateMatrix();
        bushLeafMesh.setMatrixAt(i, dummy.matrix);
        col.setHex(leafShades[i % leafShades.length]);
        bushLeafMesh.setColorAt(i, col);

        col.setHex(bloomColors[bs.fl]);
        for (let k = 0; k < 3; k++) {
          const ang = rot + k * 2.1;
          const r = 0.36 * sc;
          dummy.position.set(
            bs.x + Math.cos(ang) * r,
            by + (0.58 + (k % 2) * 0.14) * sc,
            bs.z + Math.sin(ang) * r
          );
          dummy.rotation.set(k * 0.5, ang, 0);
          dummy.scale.setScalar(sc * (0.85 + (k % 2) * 0.25));
          dummy.updateMatrix();
          bushBloomMesh.setMatrixAt(bIdx, dummy.matrix);
          bushBloomMesh.setColorAt(bIdx, col);
          bIdx++;
        }
      }

      bushLeafMesh.instanceMatrix.needsUpdate = true;
      if (bushLeafMesh.instanceColor) bushLeafMesh.instanceColor.needsUpdate = true;
      bushBloomMesh.instanceMatrix.needsUpdate = true;
      if (bushBloomMesh.instanceColor) bushBloomMesh.instanceColor.needsUpdate = true;

      this.group.add(bushLeafMesh);
      this.group.add(bushBloomMesh);
    }
  }

  // Preenche as margens continentais e emoldura os novos bairros expandidos com árvores realistas
  // em múltiplas camadas da Mata Atlântica (tronco cônico com galhos + 3 copas orgânicas em tons de verde natural),
  // coqueirais litorâneos nas praias estendidas e touceiras de bananeiras nos vales!
  createContinentalExpansionEcosystem(dummy) {
    // 1. Coqueirais das Novas Praias e Vales do Poente (X: -145 a -325) e do Levante (X: 145 a 325)
    const expansionPalmCoords = [
      // Orla e Areia da Enseada do Poente (Oeste)
      { x: -138, z: 25.5 }, { x: -154, z: 25.0 }, { x: -172, z: 26.5 }, { x: -190, z: 25.5 },
      { x: -208, z: 26.0 }, { x: -226, z: 27.0 }, { x: -245, z: 25.0 }, { x: -265, z: 26.0 },
      { x: -285, z: 25.5 }, { x: -305, z: 24.5 }, { x: -322, z: 24.0 },
      // Encostas e Quintais do Vale do Poente
      { x: -162, z: 2.0 },  { x: -195, z: -2.0 }, { x: -238, z: 2.0 },  { x: -275, z: -4.0 },
      { x: -168, z: -28.0 },{ x: -216, z: -28.0 },{ x: -262, z: -28.0 },{ x: -192, z: -85.0 },
      // Orla e Areia da Praia do Levante (Leste)
      { x: 148, z: 25.0 },  { x: 166, z: 26.5 },  { x: 184, z: 25.5 },  { x: 204, z: 26.0 },
      { x: 222, z: 27.0 },  { x: 242, z: 25.0 },  { x: 262, z: 26.0 },  { x: 282, z: 25.5 },
      { x: 302, z: 24.5 },  { x: 320, z: 24.0 },
      // Encostas e Quintais do Vale do Levante
      { x: 162, z: 2.0 },   { x: 195, z: -2.0 },  { x: 238, z: 2.0 },   { x: 275, z: -4.0 },
      { x: 168, z: -28.0 }, { x: 216, z: -28.0 }, { x: 262, z: -28.0 }, { x: 192, z: -85.0 }
    ];

    expansionPalmCoords.forEach((loc, idx) => {
      if (this.allPlateaus && this.allPlateaus.some(pl => Math.hypot(pl.x - loc.x, pl.z - loc.z) < 7.5)) return;
      if (Math.abs(loc.z - 18.0) < 3.5) return;
      const y = this.getElevation(loc.x, loc.z);
      if (y > 0.35) {
        const palm = this.createLowPolyPalm();
        palm.position.set(loc.x, y, loc.z);
        palm.rotation.y = (idx * 1.7) % (Math.PI * 2);
        const scale = 0.88 + (idx % 4) * 0.1;
        palm.scale.set(scale, scale, scale);
        this.group.add(palm);
        this.palms.push(palm);
      }
    });

    // 2. Árvores Tropicais Realistas em Múltiplas Camadas da Mata Atlântica (100% Verdes Naturais)
    // Posicionadas nas cristas externas (|X| > 290 ou Z < -195) e em pequenos bosques entre bairros,
    // deixando todos os vales, ruas e lotes expandidos 100% livres e jogáveis!
    const treePlacements = [];
    const isNearExpandedRoad = (tx, tz) => {
      // Protege a Rodovia Litorânea (z = 18) e todos os anéis viários dos novos bairros
      if (Math.abs(tz - 18.0) < 6.0) return true;
      if (Math.abs(tx) < 292 && tz > -192) {
        // Anéis horizontais de ruas e vielas nos vales expandidos
        const roadZs = [8, -14, -22, -40, -55, -70, -85, -104, -120, -138, -155, -170, -185];
        for (let r = 0; r < roadZs.length; r++) {
          if (Math.abs(tz - roadZs[r]) < 5.5) return true;
        }
        // Eixos arteriais subindo os vales Oeste e Leste
        const roadXs = [-278, -242, -205, -168, -135, 135, 168, 205, 242, 278];
        for (let c = 0; c < roadXs.length; c++) {
          if (Math.abs(tx - roadXs[c]) < 5.5) return true;
        }
      }
      return false;
    };

    const addForestCluster = (cx, cz, radiusX, radiusZ, count, seedOffset) => {
      for (let i = 0; i < count; i++) {
        const a = (i * 2.39996) + seedOffset;
        const r = Math.sqrt((i + 0.5) / count);
        const tx = cx + Math.cos(a) * radiusX * r;
        const tz = cz + Math.sin(a) * radiusZ * r;

        if (tz > 12.0) continue;
        if (isNearExpandedRoad(tx, tz)) continue;
        if (this.isProtectedLandmark(tx, tz, 6.0)) continue;
        if (this.allPlateaus && this.allPlateaus.some(pl => Math.hypot(pl.x - tx, pl.z - tz) < 9.5)) continue;

        const ty = this.getElevation(tx, tz);
        if (ty > 2.4 && ty < 39.5) {
          treePlacements.push({
            x: tx,
            y: ty,
            z: tz,
            scale: 0.95 + ((i * 7 + seedOffset) % 8) * 0.11,
            rot: (i * 1.37 + seedOffset) % (Math.PI * 2),
            colorIdx: (i + seedOffset) % 8
          });
        }
      }
    };

    // A. Reserva Florestal do Pontal Ocidental (Borda Extrema Oeste: X < -288)
    addForestCluster(-342, -55,  48, 65, 34, 1);
    addForestCluster(-325, -155, 55, 55, 32, 2);

    // B. Reserva Florestal do Cabo Oriental (Borda Extrema Leste: X > +288)
    addForestCluster(342,  -55,  48, 65, 34, 3);
    addForestCluster(325,  -155, 55, 55, 32, 4);

    // C. Cordilheira da Serra do Mar ao Norte (Maciço Florestal Contínuo de Z: -195 a -340)
    addForestCluster(0,    -235, 160, 55, 75, 5);
    addForestCluster(-165, -230, 110, 50, 52, 6);
    addForestCluster(165,  -230, 110, 50, 52, 7);
    addForestCluster(-285, -215, 75,  45, 36, 8);
    addForestCluster(285,  -215, 75,  45, 36, 9);
    addForestCluster(-90,  -295, 140, 55, 55, 12);
    addForestCluster(90,   -295, 140, 55, 55, 13);

    // D. Bosques Verdes Orgânicos Entre-Vilas nos Vales Expandidos (filtrados longe de lotes e ruas)
    addForestCluster(-215, -88,  42,  28, 16, 10);
    addForestCluster(215,  -88,  42,  28, 16, 11);
    addForestCluster(-155, -52,  34,  24, 14, 14);
    addForestCluster(155,  -52,  34,  24, 14, 15);
    addForestCluster(-128, -98,  36,  24, 14, 16);
    addForestCluster(128,  -98,  36,  24, 14, 17);
    addForestCluster(-68,  -108, 30,  22, 12, 18);
    addForestCluster(68,   -108, 30,  22, 12, 19);
    addForestCluster(-188, -125, 38,  24, 15, 20);
    addForestCluster(188,  -125, 38,  24, 15, 21);
    addForestCluster(-258, -78,  36,  26, 11, 22);
    addForestCluster(258,  -78,  36,  26, 11, 23);
    addForestCluster(-262, -135, 42,  28, 12, 24);
    addForestCluster(262,  -135, 42,  28, 12, 25);
    addForestCluster(-105, -172, 34,  20, 10, 26);
    addForestCluster(105,  -172, 34,  20, 10, 27);
    addForestCluster(-46,  -174, 28,  16, 10, 28);
    addForestCluster(46,   -174, 28,  16, 10, 29);

    if (treePlacements.length > 0) {
      const count = treePlacements.length;

      // Tronco principal cônico com base alargada (sapopemba tropical) + 2 galhos superiores integrados
      const trunkGeo = new THREE.CylinderGeometry(0.20, 0.44, 3.2, 6);
      trunkGeo.translate(0, 1.5, 0);
      const trunkMat = getSharedStylizedMaterial(0x5A3F37, 'wood', { flatShading: true });
      const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
      trunkInst.castShadow = true;

      // Galhos estruturais suportando as copas laterais
      const branchGeo = new THREE.CylinderGeometry(0.10, 0.18, 1.6, 5);
      branchGeo.translate(0, 0.7, 0);
      branchGeo.rotateZ(0.58);
      const branchInst = new THREE.InstancedMesh(branchGeo, trunkMat, count * 2);

      // Copas Folhosas Multi-Camadas (low-poly facetado com detail=0 para 60 FPS fluidos no Main + Shadow Pass)
      const foliageGeo = new THREE.IcosahedronGeometry(1.75, 0);
      const foliageMat = createStylizedMaterial({ color: 0xFFFFFF, flatShading: true }, 'foliage', { wind: 'crown' });
      const crownInst = new THREE.InstancedMesh(foliageGeo, foliageMat, count * 3);
      crownInst.castShadow = true;
      crownInst.receiveShadow = true;

      // Paleta 100% Realista de Verdes Tropicais da Mata Atlântica (Zero bolas roxas, amarelas ou laranjas!)
      const canopyGreens = [
        new THREE.Color('#1B4332'), // Verde mata profunda
        new THREE.Color('#2D6A4F'), // Verde copa atlântica
        new THREE.Color('#1E5631'), // Verde esmeralda escuro
        new THREE.Color('#2E7D32'), // Verde folha tropical
        new THREE.Color('#386641'), // Verde musgo serrano
        new THREE.Color('#3A5A40'), // Verde copa madura
        new THREE.Color('#245536'), // Verde floresta úmida
        new THREE.Color('#40916C')  // Verde broto solar (topo)
      ];

      let bIdx = 0;
      let cIdx = 0;

      treePlacements.forEach((t, idx) => {
        const s = t.scale;
        const cosR = Math.cos(t.rot);
        const sinR = Math.sin(t.rot);

        // 1. Tronco central
        dummy.position.set(t.x, t.y - 0.18, t.z);
        dummy.rotation.set(0, t.rot, 0);
        dummy.scale.set(s, s * 1.08, s);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(idx, dummy.matrix);

        // 2. Dois galhos abertos em V no topo do tronco
        for (let side = 0; side < 2; side++) {
          dummy.position.set(t.x, t.y + 2.1 * s, t.z);
          dummy.rotation.set(0, t.rot + side * Math.PI, 0);
          dummy.scale.set(s, s, s);
          dummy.updateMatrix();
          branchInst.setMatrixAt(bIdx++, dummy.matrix);
        }

        // 3. Camada Inferior de Folhagem 1 (Copa Lateral Achatada A)
        const off1X = cosR * 0.95 * s;
        const off1Z = sinR * 0.95 * s;
        dummy.position.set(t.x + off1X, t.y + 3.05 * s, t.z + off1Z);
        dummy.rotation.set(0.12, t.rot, 0.08);
        dummy.scale.set(s * 1.18, s * 0.68, s * 1.12);
        dummy.updateMatrix();
        crownInst.setMatrixAt(cIdx, dummy.matrix);
        crownInst.setColorAt(cIdx++, canopyGreens[t.colorIdx % canopyGreens.length]);

        // 4. Camada Média de Folhagem 2 (Copa Lateral Achatada B)
        const off2X = -cosR * 0.88 * s - sinR * 0.45 * s;
        const off2Z = -sinR * 0.88 * s + cosR * 0.45 * s;
        dummy.position.set(t.x + off2X, t.y + 3.35 * s, t.z + off2Z);
        dummy.rotation.set(-0.1, t.rot + 1.1, -0.08);
        dummy.scale.set(s * 1.12, s * 0.72, s * 1.15);
        dummy.updateMatrix();
        crownInst.setMatrixAt(cIdx, dummy.matrix);
        crownInst.setColorAt(cIdx++, canopyGreens[(t.colorIdx + 2) % canopyGreens.length]);

        // 5. Camada Superior Emergente (Copa Central Iluminada pelo Sol)
        dummy.position.set(t.x + sinR * 0.25 * s, t.y + 4.15 * s, t.z - cosR * 0.25 * s);
        dummy.rotation.set(0.05, t.rot + 2.2, 0.05);
        dummy.scale.set(s * 1.25, s * 0.78, s * 1.22);
        dummy.updateMatrix();
        crownInst.setMatrixAt(cIdx, dummy.matrix);
        crownInst.setColorAt(cIdx++, canopyGreens[(t.colorIdx + 5) % canopyGreens.length]);
      });

      trunkInst.instanceMatrix.needsUpdate = true;
      branchInst.instanceMatrix.needsUpdate = true;
      crownInst.instanceMatrix.needsUpdate = true;
      if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;

      this.group.add(trunkInst);
      this.group.add(branchInst);
      this.group.add(crownInst);
    }

    // 3. Costões Rochosos dos Cabos Costeiros Extremos (Pontal do Poente & Cabo do Sol Nascente)
    const outerRocks = [
      // Pontal Rochoso do Poente (Extremo Oeste Costeiro)
      { x: -375, z: 32, s: 3.8, r: 0.4 }, { x: -395, z: 12, s: 4.2, r: 1.1 },
      // Cabo do Sol Nascente (Extremo Leste Costeiro)
      { x: 375, z: 32, s: 3.8, r: 1.4 },  { x: 395, z: 12, s: 4.2, r: 2.1 }
    ];

    const rockGeo = new THREE.DodecahedronGeometry(1.3, 1);
    const rockMat = getSharedStylizedMaterial(0x6D757E, 'stone', { flatShading: true });
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, outerRocks.length);
    rockInst.castShadow = true;
    rockInst.receiveShadow = true;

    outerRocks.forEach((rk, idx) => {
      const y = this.getElevation(rk.x, rk.z) - rk.s * 0.35;
      dummy.position.set(rk.x, y, rk.z);
      dummy.rotation.set(0.15, rk.r, 0.1);
      dummy.scale.set(rk.s * 1.7, rk.s * 0.55, rk.s * 1.4);
      dummy.updateMatrix();
      rockInst.setMatrixAt(idx, dummy.matrix);
    });
    rockInst.instanceMatrix.needsUpdate = true;
    this.group.add(rockInst);
  }

  createLowPolyPalm() {
    const palmGroup = new THREE.Group();

    const trunkMat = getSharedStylizedMaterial(0x7B594A, 'wood', { flatShading: true });

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

    const leafMat = getSharedStylizedMaterial(0x358239, 'foliage', {
      wind: 'frond',
      side: THREE.DoubleSide,
      flatShading: true
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

    const coconutMat = getSharedStylizedMaterial(0x523931, 'wood', { flatShading: true });
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
