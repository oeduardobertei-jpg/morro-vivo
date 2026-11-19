import * as THREE from 'three';

/**
 * Comportamentos Orgânicos da Beira da Praia e do Mar (Banhistas, Cadeiras, Raso, Fundo e Luau Noturno)
 * Governa tanto os banhistas dedicados quanto os moradores que descem do morro para curtir a praia.
 */
export const BeachBehaviorsMixin = {
  spawnDedicatedBeachgoers() {
    const beachNames = [
      'Lucas da Prainha', 'Mariana Sol', 'Thiago Maré', 'Bruna Carioca',
      'Felipe Arpoador', 'Camila Verão', 'Rafael Onda', 'Larissa Leme',
      'Gustavo Coral', 'Amanda Brisa', 'Diego Guanabara', 'Natália Areia',
      'Vitor Sal', 'Beatriz Duna', 'Caio Litoral', 'Juliana Coqueiral',
      'Pedro Maresia', 'Letícia Espuma', 'André Píer', 'Carolina Luau',
      'Gabriel Sol', 'Fernanda Mar', 'Rodrigo Poente', 'Bianca Levante'
    ];

    const beachRole = this.roles.find(r => r.title === 'Banhista da Praia') || {
      title: 'Banhista da Praia',
      action: 'Curtindo a praia e o mar carioca',
      color: 0x06B6D4
    };

    const organicBeachZones = [
      -238, -210, -182, -152, -125, -62, -38, -18,
      0, 18, 38, 62, 118, 152, 182, 212, 238
    ];

    // Equilíbrio populacional: 10 banhistas dedicados espalhados organicamente pelo litoral
    const maxDedicated = 10;
    for (let i = 0; i < maxDedicated; i++) {
      const zoneX = organicBeachZones[i % organicBeachZones.length];
      const startX = zoneX + (Math.random() - 0.5) * 18.0;
      const startZ = 36.0 + Math.random() * 28.0;
      const startY = this.terrain ? this.terrain.getElevation(startX, startZ) : 0.4;
      const startPos = new THREE.Vector3(startX, startY, startZ);

      const npc = this.createNPCMesh(
        beachNames[i],
        beachRole,
        startPos,
        [startPos],
        400 + i
      );

      npc.isDedicatedBeachgoer = true;
      this.setNPCBeachOutfit(npc, true);
      this.npcs.push(npc);

      // Distribui os 10 banhistas entre cadeiras, beira d'água, fundo e calçadão
      if (i < 3) {
        this.assignBeachChairDecision(npc, true);
      } else if (i < 6) {
        this.assignWadingDecision(npc, true);
      } else if (i < 8) {
        this.assignSwimmingDecision(npc, true);
      } else {
        this.assignSandStrollDecision(npc);
      }
    }
  },

  getShorelineZ(x) {
    const headlandCurve = Math.max(0.0, (Math.abs(x) - 310.0) / 130.0);
    return 74.0 + Math.sin(x * 0.015) * 3.5 - (headlandCurve * headlandCurve * 82.0);
  },

  getWaveHeightAt(x, z) {
    const t = this.env ? this.env.time : (performance.now() * 0.001);
    const shoreZ = this.getShorelineZ(x);
    const distFromShore = Math.max(0, z - shoreZ);
    const shoreFactor = Math.min(1.0, distFromShore / 20.0);
    return (
      Math.sin(x * 0.05 + t * 1.3) * 0.16 +
      Math.cos(z * 0.06 + t * 1.0) * 0.12
    ) * (0.25 + 0.75 * shoreFactor);
  },

  resetBeachLimbs(npc, delta = 0.05) {
    const lerpSpeed = Math.min(1.0, delta * 8.0);
    if (npc.group) {
      npc.group.rotation.x += (0 - (npc.group.rotation.x || 0)) * lerpSpeed;
      npc.group.rotation.z += (0 - (npc.group.rotation.z || 0)) * lerpSpeed;
    }
    if (npc.swimRing) {
      npc.swimRing.visible = false;
    }
    if (npc.torso) {
      npc.torso.rotation.x += (0 - npc.torso.rotation.x) * lerpSpeed;
      npc.torso.rotation.y += (0 - npc.torso.rotation.y) * lerpSpeed;
      npc.torso.rotation.z += (0 - npc.torso.rotation.z) * lerpSpeed;
    }
    if (npc.head) {
      npc.head.rotation.x += (0 - npc.head.rotation.x) * lerpSpeed;
      npc.head.rotation.y += (0 - npc.head.rotation.y) * lerpSpeed;
    }
    if (npc.leftArm) {
      npc.leftArm.rotation.x += (0 - npc.leftArm.rotation.x) * lerpSpeed;
      npc.leftArm.rotation.z += (0 - npc.leftArm.rotation.z) * lerpSpeed;
    }
    if (npc.rightArm) {
      npc.rightArm.rotation.x += (0 - npc.rightArm.rotation.x) * lerpSpeed;
      npc.rightArm.rotation.z += (0 - npc.rightArm.rotation.z) * lerpSpeed;
    }
    if (npc.leftLeg) {
      npc.leftLeg.rotation.x += (0 - npc.leftLeg.rotation.x) * lerpSpeed;
      npc.leftLeg.rotation.z += (0 - (npc.leftLeg.rotation.z || 0)) * lerpSpeed;
    }
    if (npc.rightLeg) {
      npc.rightLeg.rotation.x += (0 - npc.rightLeg.rotation.x) * lerpSpeed;
      npc.rightLeg.rotation.z += (0 - (npc.rightLeg.rotation.z || 0)) * lerpSpeed;
    }
  },

  /**
   * Anel de espuma e marola individual ao redor do corpo do banhista na superfície da água.
   * Compartilha geometria e material entre todos os NPCs para custo zero de memória/GPU.
   */
  updateSwimRing(npc, time, active, waveBob = 0, scaleBoost = 1.0) {
    if (!active) {
      if (npc.swimRing) npc.swimRing.visible = false;
      return;
    }
    if (!this._sharedSwimRingGeo) {
      this._sharedSwimRingGeo = new THREE.RingGeometry(0.28, 0.56, 16);
      this._sharedSwimRingGeo.rotateX(-Math.PI / 2);
      this._sharedSwimRingOuterGeo = new THREE.RingGeometry(0.64, 0.78, 16);
      this._sharedSwimRingOuterGeo.rotateX(-Math.PI / 2);
      this._sharedSwimRingMat = new THREE.MeshBasicMaterial({
        color: 0xE0F2FE,
        transparent: true,
        opacity: 0.62,
        side: THREE.DoubleSide,
        depthWrite: false
      });
    }
    if (!npc.swimRing) {
      const ringGroup = new THREE.Group();
      const inner = new THREE.Mesh(this._sharedSwimRingGeo, this._sharedSwimRingMat);
      const outer = new THREE.Mesh(this._sharedSwimRingOuterGeo, this._sharedSwimRingMat);
      ringGroup.add(inner);
      ringGroup.add(outer);
      npc.swimRing = ringGroup;
      // Adiciona na cena principal (grupo de NPCs) para permanecer sempre horizontal na lâmina d'água!
      this.group.add(ringGroup);
    }

    npc.swimRing.visible = true;
    const pulse = (0.92 + Math.sin(time * 3.4 + (npc.walkCycle || 0)) * 0.14) * scaleBoost;
    npc.swimRing.position.set(
      npc.group.position.x,
      0.04 + waveBob * 0.85,
      npc.group.position.z
    );
    npc.swimRing.scale.set(pulse, 1.0, pulse * (npc.isHorizontalSwim ? 1.35 : 1.0));
    npc.swimRing.rotation.y = npc.group.rotation.y;
  },

  /**
   * Desvio físico em tempo real de pedras costeiras, canoas, barracas, quiosques, castelos de areia e pilares do píer.
   */
  resolvePropObstacles(npc, targetX, targetZ, delta) {
    const pos = npc.group.position;

    // 1. Píer de Pesca e Rampa de Madeira (x ~ -78.0, z: 59.8..96.0):
    // Distingue quem está trafegando sobre o tablado/rampa do píer de quem está caminhando na areia ou na beira d'água.
    const isOnPierRoute = Boolean(
      npc.isFisherman ||
      npc.targetNodeId === 'beach_west_pier' ||
      npc.currentNodeId === 'beach_west_pier' ||
      (npc.targetNodeId === 'beach_west_pier_entry' && pos.z > 58.2 && Math.abs(pos.x - (-78.0)) < 2.2)
    );

    if (isOnPierRoute) {
      // Mantém o cidadão centralizado entre os guarda-corpos da rampa e do píer para nunca cair pelas laterais
      if (pos.z >= 58.5 && pos.z <= 96.2) {
        const laneTargetX = -78.0 + Math.max(-0.60, Math.min(0.60, (npc.laneOffset || 0) * 0.35));
        pos.x += (laneTargetX - pos.x) * Math.min(1.0, (delta || 0.016) * 5.5);
        pos.x = Math.max(-79.10, Math.min(-76.90, pos.x));
      }
    } else if (pos.z > 59.8 && pos.z < 96.0 && Math.abs(pos.x - (-78.0)) < 2.65) {
      // Banhista ou pedestre na areia/água encostando na lateral da rampa ou nos pilares do píer:
      // afasta lateralmente e desliza em direção à areia seca (z = 57.0) para contornar a entrada do píer sem travar!
      pos.x = pos.x >= -78.0 ? -75.35 : -80.65;
      const tx = targetX ?? pos.x;
      const wantsCrossPier = (pos.x < -78.0 && tx > -77.5) || (pos.x >= -78.0 && tx < -78.5) || Math.abs(tx - (-78.0)) < 2.65;
      if (wantsCrossPier) {
        pos.z -= (npc.speed || 1.9) * (delta || 0.016) * 1.65;
      }
    }

    // 2. Evita pedras costeiras, farol, canoas, barracas, quiosques, fogueiras e castelos de areia
    if (this.arch && this.arch.propObstacles) {
      const obstacles = this.arch.propObstacles;
      for (let i = 0; i < obstacles.length; i++) {
        const ob = obstacles[i];
        const dx = pos.x - ob.x;
        if (Math.abs(dx) > ob.r + 0.5) continue;
        const dz = pos.z - ob.z;
        if (Math.abs(dz) > ob.r + 0.5) continue;

        const distSq = dx * dx + dz * dz;
        if (distSq < ob.r * ob.r && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;
          pos.x = ob.x + nx * ob.r;
          pos.z = ob.z + nz * ob.r;

          // Deslize tangencial suave contornando a pedra/prop em direção ao destino
          const tanX = -nz;
          const tanZ = nx;
          const toTargetX = (targetX ?? pos.x) - pos.x;
          const toTargetZ = (targetZ ?? pos.z) - pos.z;
          const slideSign = (toTargetX * tanX + toTargetZ * tanZ) >= 0 ? 1 : -1;
          const slideStep = (npc.speed || 1.8) * delta * 1.15;
          pos.x += tanX * slideSign * slideStep;
          pos.z += tanZ * slideSign * slideStep;
        }
      }
    }
  },

  releaseBeachReservations(npc) {
    if (!npc.beachState) return;
    if (npc.beachState.chairSpot) {
      npc.beachState.chairSpot.isOccupied = false;
      npc.beachState.chairSpot.occupant = null;
      npc.beachState.chairSpot = null;
    }
    if (npc.beachState.bonfireSeat) {
      npc.beachState.bonfireSeat.isOccupied = false;
      npc.beachState.bonfireSeat.occupant = null;
      npc.beachState.bonfireSeat = null;
    }
    npc.isBeachSeated = false;
    npc.isBeachCustomY = false;
  },

  assignBeachChairDecision(npc, instant = false) {
    this.releaseBeachReservations(npc);
    if (!this.arch || !this.arch.beachChairSpots || this.arch.beachChairSpots.length === 0) {
      return this.assignSandStrollDecision(npc);
    }

    // Procura cadeira livre (prefere uma relativamente próxima ou sorteia entre as livres)
    const freeChairs = this.arch.beachChairSpots.filter(c => !c.isOccupied);
    if (freeChairs.length === 0) {
      return this.assignWadingDecision(npc, false);
    }

    const spot = freeChairs[Math.floor(Math.random() * freeChairs.length)];
    spot.isOccupied = true;
    spot.occupant = npc;

    const moodPool = ['sunbathing', 'sipping', 'people_watching', 'adjusting_shades'];
    npc.beachState = {
      mode: instant ? 'lounging_chair' : 'to_chair',
      chairSpot: spot,
      animProgress: instant ? 1.0 : 0.0,
      timer: 14.0 + Math.random() * 16.0,
      mood: moodPool[Math.floor(Math.random() * moodPool.length)],
      moodTimer: 3.0 + Math.random() * 3.5,
      lookTargetY: (Math.random() - 0.5) * 0.55
    };

    if (instant) {
      npc.isBeachSeated = true;
      npc.isBeachCustomY = true;
      npc.group.position.set(spot.x, spot.seatY - 0.48, spot.z);
      npc.group.rotation.y = spot.rotY;
      npc.currentAction = '🏖️ Relaxando na cadeira de praia sob o guarda-sol e curtindo a brisa';
    } else {
      npc.targetPos = new THREE.Vector3(spot.frontX, spot.y, spot.frontZ);
      npc.currentAction = '🚶 Caminhando pela areia para sentar na cadeira sob o guarda-sol';
    }
  },

  assignWadingDecision(npc, instant = false) {
    this.releaseBeachReservations(npc);
    // Escolhe um ponto na beira d'água ao longo de toda a praia (X: -255 a +255, evitando o píer x: -78 e o quebra-mar x: 108)
    let wx = -255 + Math.random() * 510;
    if (Math.abs(wx - (-78)) < 9) wx = -64;
    if (Math.abs(wx - 108) < 9) wx = 122;
    const shoreZ = this.getShorelineZ(wx);
    const wz = shoreZ - 0.6 + (Math.random() - 0.5) * 1.4;
    const wy = this.terrain ? this.terrain.getElevation(wx, wz) : -0.08;

    const subStates = ['stroll_surf', 'wave_hop', 'touch_water', 'kick_splash'];
    npc.beachState = {
      mode: instant ? 'wading_feet' : 'to_wading',
      targetX: wx,
      targetZ: wz,
      timer: 13.0 + Math.random() * 12.0,
      subState: subStates[Math.floor(Math.random() * subStates.length)],
      subTimer: 3.2 + Math.random() * 2.8,
      strollDir: Math.random() < 0.5 ? 1 : -1,
      splashCooldown: 0.5 + Math.random()
    };

    if (instant) {
      npc.isBeachCustomY = true;
      npc.group.position.set(wx, wy, wz);
      npc.group.rotation.y = (Math.random() - 0.5) * 0.4;
      npc.currentAction = '🌊 Molhando os pés na espuma da beira-mar e sentindo as ondas';
    } else {
      npc.targetPos = new THREE.Vector3(wx, Math.max(-0.15, wy), wz);
      npc.currentAction = '🚶 Indo até a beirinha da água para molhar os pés no mar';
    }
  },

  assignSwimmingDecision(npc, instant = false) {
    this.releaseBeachReservations(npc);
    // Escolhe um ponto na zona de banho/nado de toda a baía (X: -250 a +250, shoreZ + 6.5 a shoreZ + 16.0: mais fundo, porém longe dos barcos!)
    let sx = -250 + Math.random() * 500;
    if (Math.abs(sx - (-78)) < 11) sx = -62;
    if (Math.abs(sx - 108) < 11) sx = 124;
    const shoreZ = this.getShorelineZ(sx);
    const sz = shoreZ + 6.8 + Math.random() * 9.2;

    const swimSubs = ['back_float', 'freestyle_swim', 'breaststroke', 'treading_swell', 'wave_friend'];
    npc.beachState = {
      mode: instant ? 'swimming_chest' : 'to_swimming',
      targetX: sx,
      targetZ: sz,
      swimGoalX: Math.max(-255, Math.min(255, sx + (Math.random() - 0.5) * 14.0)),
      swimGoalZ: shoreZ + 6.5 + Math.random() * 9.5,
      timer: 18.0 + Math.random() * 16.0,
      subState: swimSubs[Math.floor(Math.random() * swimSubs.length)],
      subTimer: 4.2 + Math.random() * 3.8,
      strokePhase: Math.random() * Math.PI * 2,
      splashCooldown: 0.7
    };

    if (instant) {
      npc.isBeachCustomY = true;
      npc.group.position.set(sx, -0.78, sz);
      npc.group.rotation.y = Math.PI + (Math.random() - 0.5) * 0.8;
      npc.currentAction = '🏊 Nadando e boiando nas águas cristalinas da baía';
    } else {
      npc.targetPos = new THREE.Vector3(sx, -0.78, sz);
      npc.currentAction = '🌊 Entrando no mar para nadar e boiar nas ondas';
    }
  },

  assignStallDecision(npc) {
    this.releaseBeachReservations(npc);
    const stalls = [
      { id: 'caldo', x: -215, z: 46.4, name: 'Barraca do Caldo de Cana', drink: '🎋 Tomando caldo de cana com limão' },
      { id: 'caipirinha', x: -155, z: 46.4, name: 'Barraca Tropical do Poente', drink: '🍹 Tomando suco tropical gelado' },
      { id: 'coco', x: -40, z: 46.4, name: 'Barraca do Coco Verde', drink: '🥥 Tomando água de coco geladinha' },
      { id: 'mate', x: -10, z: 46.4, name: 'Barraca do Mate & Globo', drink: '🥤 Tomando mate gelado com biscoito Globo' },
      { id: 'acai', x: 20,  z: 46.4, name: 'Barraca do Açaí Tropical', drink: '🍧 Saboreando açaí gelado na praia' },
      { id: 'petiscos', x: 50, z: 46.4, name: 'Barraca de Petiscos', drink: '🦐 Comendo pastel de camarão crocante' },
      { id: 'milho', x: 160, z: 46.4, name: 'Barraca do Milho Verde', drink: '🌽 Saboreando milho verde quentinho na praia' },
      { id: 'sorvete', x: 225, z: 46.4, name: 'Barraca de Picolé do Levante', drink: '🍦 Refrescando-se com picolé de frutas tropicais' }
    ];
    const st = stalls[Math.floor(Math.random() * stalls.length)];
    const tx = st.x + (Math.random() - 0.5) * 2.2;
    const tz = st.z + (Math.random() - 0.5) * 1.2;
    const ty = this.terrain ? this.terrain.getElevation(tx, tz) : 0.45;

    npc.beachState = {
      mode: 'to_stall',
      stall: st,
      timer: 4.5 + Math.random() * 2.5
    };
    npc.targetPos = new THREE.Vector3(tx, ty, tz);
    npc.currentAction = `🚶 Indo até a ${st.name} buscar algo refrescante`;
  },

  assignSandStrollDecision(npc) {
    this.releaseBeachReservations(npc);
    const spots = [
      { x: -230, z: 54, desc: '🌴 Passeando pelas areias largas da praia do Poente' },
      { x: -165, z: 58, desc: '🐚 Caminhando pela beira-mar da enseada oeste' },
      { x: 35, z: 59, desc: '⚽ Assistindo de perto à roda de altinha na beira da praia' },
      { x: 78, z: 47, desc: '🏐 Assistindo à partida de futevôlei na areia' },
      { x: -24, z: 65, desc: '🐚 Caminhando pela areia úmida observando as conchas e castelos' },
      { x: 16, z: 65, desc: '🌴 Passeando pela orla e curtindo o sol carioca' },
      { x: -46, z: 52, desc: '🏖️ Caminhando entre os guarda-sóis coloridos da Prainha' },
      { x: 175, z: 56, desc: '🏖️ Caminhando entre os guarda-sóis da praia do Levante' },
      { x: 235, z: 54, desc: '🌊 Apreciando a brisa do mar nas dunas do extremo leste' }
    ];
    const sp = spots[Math.floor(Math.random() * spots.length)];
    const tx = sp.x + (Math.random() - 0.5) * 3.5;
    const tz = sp.z + (Math.random() - 0.5) * 2.5;
    const ty = this.terrain ? this.terrain.getElevation(tx, tz) : 0.35;

    npc.beachState = {
      mode: 'strolling_sand',
      desc: sp.desc,
      timer: 7.0 + Math.random() * 6.0
    };
    npc.targetPos = new THREE.Vector3(tx, ty, tz);
    npc.currentAction = sp.desc;
  },

  assignBonfireDecision(npc) {
    this.releaseBeachReservations(npc);
    if (!this.arch || !this.arch.beachBonfires || this.arch.beachBonfires.length === 0) {
      return this.assignBeachChairDecision(npc, false);
    }

    // Reúne todos os assentos/lugares disponíveis nas 3 fogueiras da praia
    const freeSeats = [];
    for (let b = 0; b < this.arch.beachBonfires.length; b++) {
      const bf = this.arch.beachBonfires[b];
      if (!bf.seats) continue;
      for (let s = 0; s < bf.seats.length; s++) {
        if (!bf.seats[s].isOccupied) {
          freeSeats.push(bf.seats[s]);
        }
      }
    }

    if (freeSeats.length === 0) {
      return this.assignBeachChairDecision(npc, false);
    }

    const seat = freeSeats[Math.floor(Math.random() * freeSeats.length)];
    seat.isOccupied = true;
    seat.occupant = npc;

    npc.beachState = {
      mode: 'to_bonfire',
      bonfireSeat: seat,
      animProgress: 0.0,
      timer: 20.0 + Math.random() * 18.0
    };
    npc.targetPos = new THREE.Vector3(seat.x, seat.y, seat.z);
    npc.currentAction = `🔥 Caminhando pela areia até a ${seat.bonfireName}`;
  },

  chooseNextBeachDecision(npc, isNightOrSunset) {
    // Se for morador do morro visitando a praia e o tempo acabou, inicia volta para casa
    if (!npc.isDedicatedBeachgoer && npc.beachTrip && npc.beachTrip.beachTimer <= 0) {
      this.releaseBeachReservations(npc);
      this.resetBeachLimbs(npc, 1.0);
      if (npc.handItem) npc.handItem.visible = false;
      const pxExit = npc.group.position.x;
      const chosenExitId = pxExit < -160 ? 'coast_exp_w_2' : (pxExit < -50 ? 'coast_w_2' : (pxExit < 30 ? 'coast_w_3' : (pxExit < 150 ? 'coast_e_2' : 'coast_exp_e_2')));
      const hillDestinations = ['spine_1', 'mid_w_3', 'mid_e_3', 'transv_w_2', 'transv_e_2', 'viela_w_2', 'viela_e_2', 'exp_w_2', 'exp_e_2', 'exp_n_center'];
      const targetHillId = hillDestinations[Math.floor(Math.random() * hillDestinations.length)];
      const path = this.findRoadPath(chosenExitId, targetHillId);
      npc.beachTrip.state = 'returning';
      npc.beachState = null;
      npc.pathQueue = path;
      npc.targetNodeId = npc.pathQueue.shift();
      const nxt = this.roadNodesMap.get(npc.targetNodeId);
      if (nxt) npc.targetPos = nxt.position.clone();
      npc.currentAction = 'Subindo as ruas do morro de volta para a comunidade após curtir a praia';
      return;
    }

    const prevMode = npc.beachState ? npc.beachState.mode : '';

    // À noite ou no pôr do sol: prioriza as rodinhas de luau com fogueira, cadeiras ou barraquinhas
    if (isNightOrSunset) {
      const r = Math.random();
      if (r < 0.62 && prevMode !== 'at_bonfire') {
        this.assignBonfireDecision(npc);
      } else if (r < 0.82 && prevMode !== 'lounging_chair') {
        this.assignBeachChairDecision(npc, false);
      } else if (r < 0.93) {
        this.assignStallDecision(npc);
      } else {
        this.assignWadingDecision(npc, false);
      }
      return;
    }

    // Durante o dia: ciclo rico entre cadeira + guarda-sol, molhar os pés, mergulhar até o peito, barraca e passeio
    const r = Math.random();
    if (r < 0.32 && prevMode !== 'lounging_chair') {
      this.assignBeachChairDecision(npc, false);
    } else if (r < 0.58 && prevMode !== 'wading_feet') {
      this.assignWadingDecision(npc, false);
    } else if (r < 0.78 && prevMode !== 'swimming_chest') {
      this.assignSwimmingDecision(npc, false);
    } else if (r < 0.92 && prevMode !== 'buying_drink') {
      this.assignStallDecision(npc);
    } else {
      this.assignSandStrollDecision(npc);
    }
  },

  walkBeachTowards(npc, targetX, targetZ, speed, delta, isWater = false) {
    npc.isHorizontalSwim = false;
    if (npc.group) {
      npc.group.rotation.x += (0 - (npc.group.rotation.x || 0)) * Math.min(1.0, delta * 8.0);
      npc.group.rotation.z += (0 - (npc.group.rotation.z || 0)) * Math.min(1.0, delta * 8.0);
    }

    const pos = npc.group.position;
    const finalDx = targetX - pos.x;
    const finalDz = targetZ - pos.z;
    const finalDist = Math.hypot(finalDx, finalDz);
    if (finalDist < 0.45) return true;

    // Roteamento inteligente ao redor do Píer dos Pescadores (x ~ -78.0, z: 59.8..96.0):
    // Se o banhista está de um lado do píer e seu destino fica do outro lado (com z > 58.2),
    // contorna suavemente pela cabeceira de areia seca (z = 56.8) antes de cruzar x = -78.0!
    let steerX = targetX;
    let steerZ = targetZ;
    const crossesPierX =
      (pos.x < -75.2 && targetX > -80.8 && targetX > pos.x) ||
      (pos.x > -80.8 && targetX < -75.2 && targetX < pos.x) ||
      Math.abs(targetX - (-78.0)) < 2.75;

    if (crossesPierX && Math.max(pos.z, targetZ) > 58.2) {
      if (pos.z > 58.2 && Math.abs(pos.x - (-78.0)) < 12.0) {
        // Passo 1: recua pela areia até a cabeceira livre da rampa (z = 56.8) mantendo distância lateral segura dos pilares
        steerX = pos.x < -78.0 ? Math.min(pos.x, -81.0) : Math.max(pos.x, -75.0);
        steerZ = 56.8;
      } else if (Math.abs(pos.x - (-78.0)) < 3.2 && targetZ > 58.2) {
        // Passo 2: atravessa a linha x = -78.0 na faixa seca (z = 56.8) antes de descer de volta para a beira-mar
        steerX = targetX >= -78.0 ? Math.max(targetX, -74.5) : Math.min(targetX, -81.5);
        steerZ = 56.8;
      }
    }

    const dx = steerX - pos.x;
    const dz = steerZ - pos.z;
    const dist = Math.hypot(dx, dz) || 1;

    const nx = dx / dist;
    const nz = dz / dist;
    const step = Math.min(finalDist, speed * delta);
    pos.x += nx * step;
    pos.z += nz * step;

    // Desvia fisicamente de pedras costeiras, canoas, barracas, quiosques, fogueiras e estacas do píer
    this.resolvePropObstacles(npc, steerX, steerZ, delta);

    // Suaviza rotação do corpo na direção da caminhada
    const targetAngle = Math.atan2(nx, nz);
    let diff = targetAngle - npc.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    npc.group.rotation.y += diff * Math.min(1.0, delta * 8.0);

    // Passo natural (na água levanta mais os joelhos e abre os braços para equilíbrio)
    npc.walkCycle += delta * (isWater ? 6.5 : 8.2);
    const legAmp = isWater ? 0.65 : 0.52;
    const swing = Math.sin(npc.walkCycle) * legAmp;
    if (npc.leftLeg) npc.leftLeg.rotation.x = swing;
    if (npc.rightLeg) npc.rightLeg.rotation.x = -swing;

    if (isWater) {
      if (npc.leftArm) {
        npc.leftArm.rotation.x = -swing * 0.45;
        npc.leftArm.rotation.z = -0.24 - Math.abs(swing) * 0.15;
      }
      if (npc.rightArm) {
        npc.rightArm.rotation.x = swing * 0.45;
        npc.rightArm.rotation.z = 0.24 + Math.abs(swing) * 0.15;
      }
      if (npc.torso) {
        npc.torso.rotation.x = 0.08;
        npc.torso.rotation.z = Math.sin(npc.walkCycle) * 0.06;
      }
    } else {
      if (npc.leftArm) {
        npc.leftArm.rotation.x = -swing * 0.6;
        npc.leftArm.rotation.z = 0;
      }
      if (npc.rightArm) {
        npc.rightArm.rotation.x = (npc.handItem && npc.handItem.visible) ? -0.55 : swing * 0.6;
        npc.rightArm.rotation.z = 0;
      }
      if (npc.torso) {
        npc.torso.rotation.x = 0;
        npc.torso.rotation.z = 0;
      }
    }
    return false;
  },

  updateBeachgoerBehavior(npc, delta, time, isNightOrSunset) {
    if (!npc.beachState) {
      this.chooseNextBeachDecision(npc, isNightOrSunset);
      if (!npc.beachState) return;
    }

    const st = npc.beachState;
    if (!npc.isDedicatedBeachgoer && npc.beachTrip) {
      npc.beachTrip.beachTimer -= delta;
    }

    // Se anoiteceu e o banhista estava no fundo do mar, sai da água para curtir o luau ou a areia
    if (isNightOrSunset && (st.mode === 'swimming_chest' || st.mode === 'to_swimming')) {
      this.chooseNextBeachDecision(npc, true);
      return;
    }
    // Se amanheceu e estava na fogueira noturna, levanta para curtir o sol na praia
    if (!isNightOrSunset && (st.mode === 'at_bonfire' || st.mode === 'to_bonfire')) {
      this.chooseNextBeachDecision(npc, false);
      return;
    }

    // =========================================================================
    // 1. USO DAS CADEIRAS E GUARDA-SÓIS (Caminhar -> Sentar -> Relaxar -> Levantar)
    // =========================================================================
    if (st.mode === 'to_chair') {
      npc.isBeachSeated = false;
      npc.isBeachCustomY = false;
      const spot = st.chairSpot;
      if (!spot) {
        this.chooseNextBeachDecision(npc, isNightOrSunset);
        return;
      }
      const arrived = this.walkBeachTowards(npc, spot.frontX, spot.frontZ, 1.85, delta, false);
      if (arrived) {
        st.mode = 'sitting_down';
        st.animProgress = 0.0;
        npc.isBeachSeated = true;
        npc.isBeachCustomY = true;
      }
      return;
    }

    if (st.mode === 'sitting_down') {
      const spot = st.chairSpot;
      st.animProgress = Math.min(1.0, st.animProgress + delta / 0.90);
      const t = st.animProgress;
      const smoothT = t * t * (3 - 2 * t);

      // Posiciona dos pés em frente à cadeira para o assento reclinado
      npc.group.position.x = spot.frontX + (spot.x - spot.frontX) * smoothT;
      npc.group.position.z = spot.frontZ + (spot.z - spot.frontZ) * smoothT;
      npc.group.position.y = spot.y + ((spot.seatY - 0.48) - spot.y) * smoothT;
      npc.group.rotation.y = spot.rotY;

      // Cinemática natural de sentar: primeiro inclina o tronco à frente flexionando joelhos, depois reclina no encosto
      const forwardLean = Math.sin(t * Math.PI) * 0.28;
      const reclineBack = -0.26 * smoothT;
      if (npc.torso) {
        npc.torso.rotation.x = forwardLean + reclineBack;
        npc.torso.rotation.y = 0;
        npc.torso.rotation.z = 0;
      }
      if (npc.leftLeg) npc.leftLeg.rotation.x = -1.32 * smoothT;
      if (npc.rightLeg) npc.rightLeg.rotation.x = -1.32 * smoothT;
      // Mãos apoiam nos braços de madeira da cadeira ao sentar
      if (npc.leftArm) {
        npc.leftArm.rotation.x = -0.38 * smoothT;
        npc.leftArm.rotation.z = -0.14 * smoothT;
      }
      if (npc.rightArm) {
        npc.rightArm.rotation.x = -0.38 * smoothT;
        npc.rightArm.rotation.z = 0.14 * smoothT;
      }
      npc.currentAction = '🏖️ Sentando-se confortavelmente na cadeira de praia sob o guarda-sol';

      if (st.animProgress >= 1.0) {
        st.mode = 'lounging_chair';
      }
      return;
    }

    if (st.mode === 'lounging_chair') {
      const spot = st.chairSpot;
      npc.isBeachSeated = true;
      npc.isBeachCustomY = true;
      npc.group.position.set(spot.x, spot.seatY - 0.48, spot.z);
      npc.group.rotation.y = spot.rotY;

      st.timer -= delta;
      st.moodTimer -= delta;
      if (st.moodTimer <= 0) {
        const moods = ['sunbathing', 'sipping', 'people_watching', 'adjusting_shades'];
        st.mood = moods[Math.floor(Math.random() * moods.length)];
        st.moodTimer = 3.5 + Math.random() * 4.0;
        st.lookTargetY = (Math.random() - 0.5) * 0.65;
      }

      // Postura base reclinada na cadeira de praia
      if (npc.torso) {
        npc.torso.rotation.x = -0.25 + Math.sin(time * 0.7) * 0.02;
        npc.torso.rotation.y = 0;
      }

      if (st.mood === 'sipping') {
        if (npc.handItem) npc.handItem.visible = true;
        if (npc.leftLeg) npc.leftLeg.rotation.x = -1.32;
        if (npc.rightLeg) npc.rightLeg.rotation.x = -1.32;
        if (npc.leftArm) {
          npc.leftArm.rotation.x = -0.35;
          npc.leftArm.rotation.z = -0.14;
        }
        // Leva a água de coco / mate até a boca para beber um gole e depois repousa no braço da cadeira
        const sipLift = st.moodTimer > 1.8 ? 1.0 : 0.0;
        if (npc.rightArm) {
          npc.rightArm.rotation.x += ((-0.38 - sipLift * 0.78) - npc.rightArm.rotation.x) * Math.min(1, delta * 5);
          npc.rightArm.rotation.z = 0.10;
        }
        if (npc.head) {
          npc.head.rotation.x += ((0.12 - sipLift * 0.22) - npc.head.rotation.x) * Math.min(1, delta * 5);
          npc.head.rotation.y += (0 - npc.head.rotation.y) * Math.min(1, delta * 4);
        }
        npc.currentAction = '🥥 Tomando água de coco gelada na sombra do guarda-sol';
      } else if (st.mood === 'sunbathing') {
        // Estica as pernas relaxado e inclina a cabeça sentindo a brisa do mar
        if (npc.leftLeg) npc.leftLeg.rotation.x = -1.18;
        if (npc.rightLeg) npc.rightLeg.rotation.x = -1.36;
        if (npc.leftArm) {
          npc.leftArm.rotation.x = -0.36;
          npc.leftArm.rotation.z = -0.16;
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = -0.36;
          npc.rightArm.rotation.z = 0.16;
        }
        if (npc.head) {
          npc.head.rotation.x += (-0.22 - npc.head.rotation.x) * Math.min(1, delta * 4);
          npc.head.rotation.y += (0 - npc.head.rotation.y) * Math.min(1, delta * 4);
        }
        npc.currentAction = '☀️ Relaxando na cadeira reclinada e aproveitando a brisa da praia';
      } else if (st.mood === 'adjusting_shades') {
        // Leva a mão aos óculos de sol / testa observando as ondas
        if (npc.leftLeg) npc.leftLeg.rotation.x = -1.30;
        if (npc.rightLeg) npc.rightLeg.rotation.x = -1.30;
        const shadeLift = st.moodTimer > 2.0 ? 1.0 : 0.0;
        if (npc.leftArm) {
          npc.leftArm.rotation.x += ((-0.38 - shadeLift * 0.95) - npc.leftArm.rotation.x) * Math.min(1, delta * 6);
          npc.leftArm.rotation.z = -0.08;
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = -0.38;
          npc.rightArm.rotation.z = 0.14;
        }
        if (npc.head) {
          npc.head.rotation.x += (0.05 - npc.head.rotation.x) * Math.min(1, delta * 4);
          npc.head.rotation.y += ((st.lookTargetY * 0.5) - npc.head.rotation.y) * Math.min(1, delta * 4);
        }
        npc.currentAction = '😎 Ajeitando os óculos de sol e admirando o movimento das ondas';
      } else {
        // People watching: olha suavemente para os lados acompanhando o movimento da areia
        if (npc.leftLeg) npc.leftLeg.rotation.x = -1.32;
        if (npc.rightLeg) npc.rightLeg.rotation.x = -1.32;
        if (npc.leftArm) {
          npc.leftArm.rotation.x = -0.38;
          npc.leftArm.rotation.z = -0.14;
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = -0.38;
          npc.rightArm.rotation.z = 0.14;
        }
        if (npc.head) {
          npc.head.rotation.x += (0.08 - npc.head.rotation.x) * Math.min(1, delta * 4);
          npc.head.rotation.y += (st.lookTargetY - npc.head.rotation.y) * Math.min(1, delta * 3.5);
        }
        npc.currentAction = '🏖️ Curtindo a sombra do guarda-sol e observando o movimento da orla';
      }

      if (st.timer <= 0) {
        st.mode = 'standing_up';
        st.animProgress = 0.0;
      }
      return;
    }

    if (st.mode === 'standing_up') {
      const spot = st.chairSpot;
      st.animProgress = Math.min(1.0, st.animProgress + delta / 0.85);
      const t = st.animProgress;
      const smoothT = t * t * (3 - 2 * t);

      // Para levantar de uma cadeira baixa de praia: projeta o tronco à frente apoiando nos braços e estende as pernas
      npc.group.position.x = spot.x + (spot.frontX - spot.x) * smoothT;
      npc.group.position.z = spot.z + (spot.frontZ - spot.z) * smoothT;
      npc.group.position.y = (spot.seatY - 0.48) + (spot.y - (spot.seatY - 0.48)) * smoothT;
      npc.group.rotation.y = spot.rotY;

      const pushForwardLean = Math.sin(t * Math.PI) * 0.36;
      if (npc.torso) {
        npc.torso.rotation.x = -0.25 * (1 - smoothT) + pushForwardLean;
        npc.torso.rotation.y = 0;
      }
      if (npc.leftLeg) npc.leftLeg.rotation.x = -1.32 * (1 - smoothT);
      if (npc.rightLeg) npc.rightLeg.rotation.x = -1.32 * (1 - smoothT);
      if (npc.leftArm) {
        npc.leftArm.rotation.x = -0.35 * (1 - smoothT);
        npc.leftArm.rotation.z = 0;
      }
      if (npc.rightArm) {
        npc.rightArm.rotation.x = -0.35 * (1 - smoothT);
        npc.rightArm.rotation.z = 0;
      }
      if (npc.head) {
        npc.head.rotation.x = 0;
        npc.head.rotation.y = 0;
      }
      npc.currentAction = '🚶 Levantando-se da cadeira de praia';

      if (st.animProgress >= 1.0) {
        this.releaseBeachReservations(npc);
        this.chooseNextBeachDecision(npc, isNightOrSunset);
      }
      return;
    }

    // =========================================================================
    // 2. MOLHANDO OS PÉS NA BEIRA D'ÁGUA (Caminhar até a espuma -> Reagir às ondas)
    // =========================================================================
    if (st.mode === 'to_wading') {
      npc.isBeachSeated = false;
      npc.isBeachCustomY = false;
      this.updateSwimRing(npc, time, false);
      const arrived = this.walkBeachTowards(npc, st.targetX, st.targetZ, 1.9, delta, false);
      if (arrived) {
        st.mode = 'wading_feet';
        npc.isBeachCustomY = true;
      }
      return;
    }

    if (st.mode === 'wading_feet') {
      npc.isBeachSeated = false;
      npc.isBeachCustomY = true;
      npc.isHorizontalSwim = false;
      st.timer -= delta;
      st.subTimer -= delta;
      st.splashCooldown = (st.splashCooldown || 0) - delta;

      if (st.subTimer <= 0) {
        const subStates = ['stroll_surf', 'wave_hop', 'touch_water', 'kick_splash', 'wave_duck'];
        st.subState = subStates[Math.floor(Math.random() * subStates.length)];
        st.subTimer = 3.2 + Math.random() * 3.2;
        st.strollDir = Math.random() < 0.5 ? 1 : -1;
      }

      const px = npc.group.position.x;
      const pz = npc.group.position.z;
      const shoreZ = this.getShorelineZ(px);
      const groundY = this.terrain ? this.terrain.getElevation(px, pz) : -0.12;
      const envTime = this.env ? this.env.time : (performance.now() * 0.001);
      const surfWave = Math.sin(envTime * 1.4 + px * 0.04); // -1 a +1 quando a espuma sobe na areia
      const waveBob = this.getWaveHeightAt(px, pz);

      // Exibe anel suave de espuma nos tornozelos/joelhos quando na água rasa
      this.updateSwimRing(npc, time, pz > shoreZ - 0.6, waveBob * 0.4, 0.72);

      if (st.subState === 'stroll_surf') {
        // Caminha lateralmente com água nos tornozelos/panturrilhas acompanhando a curva da praia
        // Se aproximar das estacas do Píer (-78) ou do Quebra-Mar (108), inverte suavemente a direção do passeio!
        let candidateX = px + st.strollDir * 4.5;
        if (Math.abs(candidateX - (-78.0)) < 5.2 || Math.abs(candidateX - 108.0) < 5.2) {
          st.strollDir *= -1;
          candidateX = px + st.strollDir * 4.5;
        }
        const nextX = Math.max(-255, Math.min(255, candidateX));
        const nextZ = this.getShorelineZ(nextX) + 0.15;
        this.walkBeachTowards(npc, nextX, nextZ, 0.95, delta, true);
        npc.group.position.y = Math.min(0.02, Math.max(-0.24, groundY));
        if (st.splashCooldown <= 0 && this.arch && this.arch.spawnWaterSplash) {
          st.splashCooldown = 0.85 + Math.random() * 0.6;
          this.arch.spawnWaterSplash(npc.group.position, 2);
        }
        npc.currentAction = '🌊 Caminhando devagar na beirinha do mar molhando os pés na espuma';
      } else if (st.subState === 'wave_hop') {
        // Olha para o mar (+Z) e dá um pulinho natural abrindo os braços quando a onda quebra!
        npc.group.rotation.y += (0 - npc.group.rotation.y) * Math.min(1, delta * 6);
        npc.group.rotation.x += (0 - (npc.group.rotation.x || 0)) * Math.min(1, delta * 8);
        const waveCrest = Math.max(0, surfWave);
        const hopHeight = waveCrest > 0.30 ? Math.sin(((waveCrest - 0.30) / 0.70) * Math.PI) * 0.28 : 0;
        npc.group.position.y = Math.min(0.02, Math.max(-0.22, groundY)) + hopHeight;
        if (npc.leftLeg) npc.leftLeg.rotation.x = hopHeight > 0.04 ? -0.55 : 0;
        if (npc.rightLeg) npc.rightLeg.rotation.x = hopHeight > 0.04 ? 0.42 : 0;
        if (npc.leftArm) {
          npc.leftArm.rotation.x = -0.25 - hopHeight * 2.1;
          npc.leftArm.rotation.z = -0.25 - hopHeight * 0.95;
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = -0.25 - hopHeight * 2.1;
          npc.rightArm.rotation.z = 0.25 + hopHeight * 0.95;
        }
        if (npc.torso) npc.torso.rotation.x = -hopHeight * 0.38;
        if (hopHeight > 0.14 && st.splashCooldown <= 0 && this.arch && this.arch.spawnWaterSplash) {
          st.splashCooldown = 1.0;
          this.arch.spawnWaterSplash(npc.group.position, 5);
        }
        npc.currentAction = '🌊 Pulando a marolinha e sentindo a água fresca na beira da praia';
      } else if (st.subState === 'wave_duck') {
        // Mergulho rápido ("jacaré" / furando a onda) na arrebentação rasa!
        npc.group.rotation.y += (0 - npc.group.rotation.y) * Math.min(1, delta * 6);
        const diveCycle = Math.max(0, Math.sin(time * 2.4 + px * 0.1));
        npc.group.position.y = Math.min(0.0, Math.max(-0.28, groundY)) - diveCycle * 0.32;
        npc.group.rotation.x += ((diveCycle * 0.65) - (npc.group.rotation.x || 0)) * Math.min(1, delta * 6);
        if (npc.leftArm) {
          npc.leftArm.rotation.x = -diveCycle * 2.4;
          npc.leftArm.rotation.z = -0.18;
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = -diveCycle * 2.4;
          npc.rightArm.rotation.z = 0.18;
        }
        if (npc.leftLeg) npc.leftLeg.rotation.x = diveCycle * 0.45;
        if (npc.rightLeg) npc.rightLeg.rotation.x = -diveCycle * 0.35;
        if (diveCycle > 0.75 && st.splashCooldown <= 0 && this.arch && this.arch.spawnWaterSplash) {
          st.splashCooldown = 1.1;
          this.arch.spawnWaterSplash(npc.group.position, 6);
        }
        npc.currentAction = '🌊 Furando a onda na arrebentação e se refrescando no mar!';
      } else if (st.subState === 'touch_water') {
        // Abaixa o tronco e os joelhos para tocar a espuma do mar com as mãos e jogar água nos ombros
        npc.group.rotation.y += (0 - npc.group.rotation.y) * Math.min(1, delta * 6);
        npc.group.rotation.x += (0 - (npc.group.rotation.x || 0)) * Math.min(1, delta * 8);
        npc.group.position.y = Math.min(0.02, Math.max(-0.20, groundY)) - 0.14;
        if (npc.torso) npc.torso.rotation.x += (0.50 - npc.torso.rotation.x) * Math.min(1, delta * 5);
        if (npc.leftLeg) npc.leftLeg.rotation.x += (-0.58 - npc.leftLeg.rotation.x) * Math.min(1, delta * 5);
        if (npc.rightLeg) npc.rightLeg.rotation.x += (-0.58 - npc.rightLeg.rotation.x) * Math.min(1, delta * 5);
        if (npc.rightArm) npc.rightArm.rotation.x = -0.88 + Math.sin(time * 4.8) * 0.32;
        if (npc.leftArm) npc.leftArm.rotation.x = -0.52 - Math.cos(time * 4.8) * 0.25;
        if (npc.head) npc.head.rotation.x = 0.20;
        npc.currentAction = '🌊 Abaixando para sentir a temperatura da água e jogar água fresca nos ombros';
      } else {
        // kick_splash: Chuta água de forma divertida fazendo respingos
        npc.group.rotation.y += (0 - npc.group.rotation.y) * Math.min(1, delta * 6);
        npc.group.rotation.x += (0 - (npc.group.rotation.x || 0)) * Math.min(1, delta * 8);
        npc.group.position.y = Math.min(0.02, Math.max(-0.20, groundY));
        const kickPhase = Math.max(0, Math.sin(time * 4.4));
        if (npc.rightLeg) npc.rightLeg.rotation.x = -kickPhase * 0.92;
        if (npc.leftLeg) npc.leftLeg.rotation.x = 0;
        if (npc.torso) npc.torso.rotation.x = -kickPhase * 0.16;
        if (npc.leftArm) npc.leftArm.rotation.z = -0.28;
        if (npc.rightArm) npc.rightArm.rotation.z = 0.28;
        if (kickPhase > 0.72 && st.splashCooldown <= 0 && this.arch && this.arch.spawnWaterSplash) {
          st.splashCooldown = 0.90;
          this.arch.spawnWaterSplash(npc.group.position, 5);
        }
        npc.currentAction = '💦 Chutando água na beira-mar e se refrescando nas ondas';
      }

      // Mantém na faixa rasa da arrebentação (shoreZ - 1.2 até shoreZ + 1.8)
      npc.group.position.z = Math.max(shoreZ - 1.2, Math.min(shoreZ + 1.8, npc.group.position.z));

      if (st.timer <= 0) {
        this.updateSwimRing(npc, time, false);
        this.resetBeachLimbs(npc, 1.0);
        this.chooseNextBeachDecision(npc, isNightOrSunset);
      }
      return;
    }

    // =========================================================================
    // 3. BANHO DE MAR PROFUNDO: BOIAR DE COSTAS (ESTRELA), NADO CRAWL, NADO PEITO & ACENAR
    // =========================================================================
    if (st.mode === 'to_swimming') {
      npc.isBeachSeated = false;
      npc.isBeachCustomY = true;
      const shoreZ = this.getShorelineZ(npc.group.position.x);
      const inWater = npc.group.position.z > shoreZ - 0.8;
      const speed = inWater ? 1.20 : 1.85;
      const arrived = this.walkBeachTowards(npc, st.targetX, st.targetZ, speed, delta, inWater);

      // Afunda gradualmente conforme o fundo do mar desce até a zona de nado (~ -0.86m)
      const seaFloorY = this.terrain ? this.terrain.getElevation(npc.group.position.x, npc.group.position.z) : -0.80;
      const waveBob = inWater ? this.getWaveHeightAt(npc.group.position.x, npc.group.position.z) : 0;
      npc.group.position.y = Math.max(-0.88, seaFloorY) + waveBob * 0.55;
      this.updateSwimRing(npc, time, inWater, waveBob, 0.90);

      if (inWater && Math.random() < 0.09 && this.arch && this.arch.spawnWaterSplash) {
        this.arch.spawnWaterSplash({ x: npc.group.position.x, y: 0.02, z: npc.group.position.z }, 2);
      }

      if (arrived) {
        st.mode = 'swimming_chest';
      }
      return;
    }

    if (st.mode === 'swimming_chest') {
      npc.isBeachSeated = false;
      npc.isBeachCustomY = true;
      st.timer -= delta;
      st.subTimer -= delta;
      st.splashCooldown = (st.splashCooldown || 0) - delta;
      if (npc.handItem) npc.handItem.visible = false;

      const px = npc.group.position.x;
      const pz = npc.group.position.z;
      const shoreZ = this.getShorelineZ(px);

      if (st.subTimer <= 0) {
        const swimSubs = ['back_float', 'freestyle_swim', 'breaststroke', 'treading_swell', 'wave_friend'];
        st.subState = swimSubs[Math.floor(Math.random() * swimSubs.length)];
        st.subTimer = 4.5 + Math.random() * 4.2;
        let nextSwimX = Math.max(-255, Math.min(255, px + (Math.random() - 0.5) * 15.0));
        if (Math.abs(nextSwimX - (-78.0)) < 6.5) {
          nextSwimX = px < -78.0 ? -85.5 : -70.5;
        }
        st.swimGoalX = nextSwimX;
        st.swimGoalZ = shoreZ + 6.5 + Math.random() * 9.8;
      }

      const waveBob = this.getWaveHeightAt(px, pz);
      const waveRoll = Math.sin(time * 1.5 + px * 0.08) * 0.07;

      if (st.subState === 'back_float') {
        // =====================================================================
        // BOIANDO DE COSTAS ("ESTRELA DO MAR") NA SUPERFÍCIE DA ÁGUA!
        // Corpo deitado horizontalmente de barriga para cima (rotation.x = -83°),
        // braços e pernas abertos relaxados acompanhando o balanço da marola!
        // =====================================================================
        npc.isHorizontalSwim = true;
        const targetY = 0.03 + waveBob * 0.95;
        npc.group.position.y += (targetY - npc.group.position.y) * Math.min(1, delta * 6);

        // Deriva suavemente com a correnteza
        npc.group.position.x += Math.sin(time * 0.5 + px) * 0.12 * delta;
        npc.group.rotation.x += ((-Math.PI * 0.46 + waveRoll * 0.5) - (npc.group.rotation.x || 0)) * Math.min(1, delta * 5.5);
        npc.group.rotation.z += (waveRoll - (npc.group.rotation.z || 0)) * Math.min(1, delta * 5);

        const gentleBreathe = Math.sin(time * 2.1) * 0.08;
        if (npc.torso) {
          npc.torso.rotation.x = -0.06;
          npc.torso.rotation.y = 0;
          npc.torso.rotation.z = 0;
        }
        if (npc.head) {
          npc.head.rotation.x = 0.14; // Rosto voltado para o céu azul
          npc.head.rotation.y = Math.sin(time * 0.8) * 0.18;
        }
        if (npc.leftArm) {
          npc.leftArm.rotation.x = -0.15 + gentleBreathe;
          npc.leftArm.rotation.z = -0.95 - gentleBreathe * 0.8;
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = -0.15 - gentleBreathe;
          npc.rightArm.rotation.z = 0.95 + gentleBreathe * 0.8;
        }
        if (npc.leftLeg) {
          npc.leftLeg.rotation.x = 0.08 + gentleBreathe * 0.5;
          npc.leftLeg.rotation.z = -0.28;
        }
        if (npc.rightLeg) {
          npc.rightLeg.rotation.x = 0.08 - gentleBreathe * 0.5;
          npc.rightLeg.rotation.z = 0.28;
        }

        this.updateSwimRing(npc, time, true, waveBob, 1.25);
        npc.currentAction = '🌊 Boiando de costas ("estrela") relaxado na superfície cristalina do mar';
      } else if (st.subState === 'freestyle_swim') {
        // =====================================================================
        // NADO CRAWL (FREESTYLE) HORIZONTAL NA SUPERFÍCIE COM PERNADA E ESPUMA!
        // Corpo alinhado horizontalmente de bruços na lâmina d'água (rotation.x = +79°),
        // braçadas alternadas em moinho e batida rápida de pernas levantando espuma!
        // =====================================================================
        npc.isHorizontalSwim = true;
        const targetY = -0.04 + waveBob * 0.90;
        npc.group.position.y += (targetY - npc.group.position.y) * Math.min(1, delta * 6);

        const dx = st.swimGoalX - px;
        const dz = st.swimGoalZ - pz;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.5) {
          const nx = dx / dist;
          const nz = dz / dist;
          const swimSpeed = 1.28;
          npc.group.position.x += nx * swimSpeed * delta;
          npc.group.position.z += nz * swimSpeed * delta;

          let diff = Math.atan2(nx, nz) - npc.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          npc.group.rotation.y += diff * Math.min(1, delta * 5.5);
        } else {
          st.swimGoalX = Math.max(-255, Math.min(255, px + (Math.random() - 0.5) * 15.0));
          st.swimGoalZ = shoreZ + 6.5 + Math.random() * 9.5;
        }

        st.strokePhase += delta * 5.2;
        const crawlSin = Math.sin(st.strokePhase);
        const crawlCos = Math.cos(st.strokePhase);

        npc.group.rotation.x += ((Math.PI * 0.44) - (npc.group.rotation.x || 0)) * Math.min(1, delta * 6);
        npc.group.rotation.z += ((crawlSin * 0.18) - (npc.group.rotation.z || 0)) * Math.min(1, delta * 6);

        if (npc.torso) {
          npc.torso.rotation.x = 0;
          npc.torso.rotation.y = crawlSin * 0.22; // Rolamento natural de ombros do nado crawl
          npc.torso.rotation.z = 0;
        }
        if (npc.head) {
          npc.head.rotation.x = -0.58; // Cabeça erguida/girando para respirar fora d'água
          npc.head.rotation.y = crawlSin > 0.35 ? 0.52 : 0;
        }
        // Braçadas alternadas amplas cortando a água
        if (npc.leftArm) {
          npc.leftArm.rotation.x = -1.45 + crawlSin * 1.45;
          npc.leftArm.rotation.z = -0.22 - Math.max(0, crawlCos) * 0.35;
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = -1.45 - crawlSin * 1.45;
          npc.rightArm.rotation.z = 0.22 + Math.max(0, -crawlCos) * 0.35;
        }
        // Batida rápida de pernas (flutter kick)
        const flutter = Math.sin(time * 13.5);
        if (npc.leftLeg) {
          npc.leftLeg.rotation.x = flutter * 0.48;
          npc.leftLeg.rotation.z = -0.06;
        }
        if (npc.rightLeg) {
          npc.rightLeg.rotation.x = -flutter * 0.48;
          npc.rightLeg.rotation.z = 0.06;
        }

        this.updateSwimRing(npc, time, true, waveBob, 1.30);
        if (st.splashCooldown <= 0 && this.arch && this.arch.spawnWaterSplash) {
          st.splashCooldown = 0.55;
          this.arch.spawnWaterSplash({ x: npc.group.position.x, y: 0.03, z: npc.group.position.z }, 4);
        }
        npc.currentAction = '🏊 Nadando crawl pelas águas mais fundas e cristalinas da baía!';
      } else if (st.subState === 'breaststroke') {
        // =====================================================================
        // NADO PEITO COM IMPULSO E DESLIZE HORIZONTAL NA ÁGUA!
        // Corpo inclinado na superfície (rotation.x = +64°) com cabeça fora d'água,
        // abertura simétrica dos braços e pernada de rã!
        // =====================================================================
        npc.isHorizontalSwim = true;
        const targetY = -0.15 + waveBob * 0.90;
        npc.group.position.y += (targetY - npc.group.position.y) * Math.min(1, delta * 6);

        const dx = st.swimGoalX - px;
        const dz = st.swimGoalZ - pz;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.4) {
          const nx = dx / dist;
          const nz = dz / dist;
          st.strokePhase += delta * 3.4;
          // Impulso não-linear de braçada de nado peito (desliza mais rápido após puxar a água)
          const glideBoost = 0.45 + Math.max(0, Math.sin(st.strokePhase)) * 0.72;
          npc.group.position.x += nx * glideBoost * delta;
          npc.group.position.z += nz * glideBoost * delta;

          let diff = Math.atan2(nx, nz) - npc.group.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          npc.group.rotation.y += diff * Math.min(1, delta * 5);
        } else {
          st.swimGoalX = Math.max(-255, Math.min(255, px + (Math.random() - 0.5) * 14.0));
          st.swimGoalZ = shoreZ + 6.5 + Math.random() * 9.2;
        }

        const strokeSin = Math.sin(st.strokePhase);
        const strokeCos = Math.cos(st.strokePhase);
        npc.group.rotation.x += ((Math.PI * 0.35 + strokeSin * 0.08) - (npc.group.rotation.x || 0)) * Math.min(1, delta * 6);
        npc.group.rotation.z += (0 - (npc.group.rotation.z || 0)) * Math.min(1, delta * 6);

        if (npc.torso) {
          npc.torso.rotation.x = 0.08;
          npc.torso.rotation.y = 0;
          npc.torso.rotation.z = 0;
        }
        // Braços esticam à frente na água e abrem lateralmente puxando
        if (npc.leftArm) {
          npc.leftArm.rotation.x = -1.35 + strokeSin * 0.55;
          npc.leftArm.rotation.z = -0.35 - Math.max(0, strokeCos) * 0.85;
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = -1.35 + strokeSin * 0.55;
          npc.rightArm.rotation.z = 0.35 + Math.max(0, strokeCos) * 0.85;
        }
        // Pernada simétrica de nado peito
        if (npc.leftLeg) {
          npc.leftLeg.rotation.x = strokeCos * 0.42;
          npc.leftLeg.rotation.z = -Math.max(0, -strokeSin) * 0.28;
        }
        if (npc.rightLeg) {
          npc.rightLeg.rotation.x = strokeCos * 0.42;
          npc.rightLeg.rotation.z = Math.max(0, -strokeSin) * 0.28;
        }
        if (npc.head) {
          npc.head.rotation.x = -0.68; // Mantém a cabeça erguida acima da linha d'água
          npc.head.rotation.y = 0;
        }

        this.updateSwimRing(npc, time, true, waveBob, 1.18);
        if (st.splashCooldown <= 0 && this.arch && this.arch.spawnWaterSplash) {
          st.splashCooldown = 0.85;
          this.arch.spawnWaterSplash({ x: px, y: 0.02, z: pz }, 3);
        }
        npc.currentAction = '🏊 Nadando de peito e deslizando pelas águas calmas da baía';
      } else if (st.subState === 'wave_friend') {
        // Vira de frente para a areia (-Z -> rotY ~ PI) com água nos ombros e acena para os amigos na praia
        npc.isHorizontalSwim = false;
        const targetY = -0.84 + waveBob * 0.85;
        npc.group.position.y += (targetY - npc.group.position.y) * Math.min(1, delta * 6);
        npc.group.rotation.x += (0 - (npc.group.rotation.x || 0)) * Math.min(1, delta * 6);
        npc.group.rotation.z += (0 - (npc.group.rotation.z || 0)) * Math.min(1, delta * 6);

        const toBeachAngle = Math.PI + Math.sin(px * 0.05) * 0.25;
        let diff = toBeachAngle - npc.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        npc.group.rotation.y += diff * Math.min(1, delta * 4);

        if (npc.torso) {
          npc.torso.rotation.x = 0.05;
          npc.torso.rotation.z = Math.sin(time * 2.2) * 0.06;
        }
        if (npc.leftArm) {
          npc.leftArm.rotation.x = -0.78;
          npc.leftArm.rotation.z = -0.48 + Math.sin(time * 2.5) * 0.25;
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = -2.35;
          npc.rightArm.rotation.z = 0.25 + Math.sin(time * 6.5) * 0.32;
        }
        if (npc.leftLeg) {
          npc.leftLeg.rotation.x = Math.sin(time * 3.2) * 0.28;
          npc.leftLeg.rotation.z = 0;
        }
        if (npc.rightLeg) {
          npc.rightLeg.rotation.x = -Math.sin(time * 3.2) * 0.28;
          npc.rightLeg.rotation.z = 0;
        }
        this.updateSwimRing(npc, time, true, waveBob, 0.95);
        npc.currentAction = '🌊 No mar fundo acenando para a galera na areia!';
      } else {
        // treading_swell: Sustentando-se na água ("cachorrinho"/remada circular de mãos) sentindo a marola
        npc.isHorizontalSwim = false;
        const targetY = -0.84 + waveBob * 0.85;
        npc.group.position.y += (targetY - npc.group.position.y) * Math.min(1, delta * 6);
        npc.group.rotation.x += (0.06 - (npc.group.rotation.x || 0)) * Math.min(1, delta * 6);
        npc.group.rotation.z += (waveRoll * 0.5 - (npc.group.rotation.z || 0)) * Math.min(1, delta * 6);

        st.strokePhase += delta * 2.4;
        const scull = Math.sin(st.strokePhase);
        if (npc.torso) {
          npc.torso.rotation.x = 0.06 + scull * 0.04;
          npc.torso.rotation.y = Math.cos(st.strokePhase * 0.6) * 0.14;
        }
        if (npc.leftArm) {
          npc.leftArm.rotation.x = -0.82 + scull * 0.22;
          npc.leftArm.rotation.z = -0.52 - Math.cos(st.strokePhase) * 0.32;
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = -0.82 - scull * 0.22;
          npc.rightArm.rotation.z = 0.52 + Math.cos(st.strokePhase) * 0.32;
        }
        if (npc.leftLeg) {
          npc.leftLeg.rotation.x = scull * 0.28;
          npc.leftLeg.rotation.z = 0;
        }
        if (npc.rightLeg) {
          npc.rightLeg.rotation.x = -scull * 0.28;
          npc.rightLeg.rotation.z = 0;
        }
        if (npc.head) {
          npc.head.rotation.x = -0.06;
          npc.head.rotation.y = Math.sin(st.strokePhase * 0.5) * 0.28;
        }
        this.updateSwimRing(npc, time, true, waveBob, 0.95);
        npc.currentAction = '🌊 Boiando em pé no mar fundo sentindo o balanço suave das ondas';
      }

      // Garante que o banhista permaneça na zona segura de banho (shoreZ + 5.5 .. shoreZ + 17.5)
      npc.group.position.z = Math.max(shoreZ + 5.5, Math.min(shoreZ + 17.5, npc.group.position.z));

      if (st.timer <= 0) {
        // Sai caminhando/nadando do fundo de volta até a areia rasa antes da próxima decisão
        st.mode = 'exiting_water';
        st.exitX = px + (Math.random() - 0.5) * 3.0;
        st.exitZ = shoreZ - 2.2;
      }
      return;
    }

    if (st.mode === 'exiting_water') {
      npc.isBeachSeated = false;
      npc.isBeachCustomY = true;
      const shoreZ = this.getShorelineZ(npc.group.position.x);
      const inWater = npc.group.position.z > shoreZ - 0.8;
      const arrived = this.walkBeachTowards(npc, st.exitX, st.exitZ, inWater ? 1.25 : 1.85, delta, inWater);
      const seaFloorY = this.terrain ? this.terrain.getElevation(npc.group.position.x, npc.group.position.z) : 0.0;
      const waveBob = inWater ? this.getWaveHeightAt(npc.group.position.x, npc.group.position.z) : 0;
      npc.group.position.y = Math.max(-0.84, seaFloorY);
      this.updateSwimRing(npc, time, inWater, waveBob, 0.85);
      npc.currentAction = '🌊 Saindo do banho de mar de volta para a areia';
      if (arrived) {
        npc.isBeachCustomY = false;
        this.updateSwimRing(npc, time, false);
        this.resetBeachLimbs(npc, 1.0);
        this.chooseNextBeachDecision(npc, isNightOrSunset);
      }
      return;
    }

    // =========================================================================
    // 4. BARRAQUINHAS DA PRAIA & PASSEIO NA AREIA
    // =========================================================================
    if (st.mode === 'to_stall') {
      npc.isBeachSeated = false;
      npc.isBeachCustomY = false;
      const arrived = this.walkBeachTowards(npc, npc.targetPos.x, npc.targetPos.z, 1.95, delta, false);
      if (arrived) {
        st.mode = 'buying_drink';
        if (npc.handItem) npc.handItem.visible = true;
        if (this.simulation && this.simulation.addEconomy) {
          this.simulation.addEconomy(5, `Venda na ${st.stall.name}`);
        }
        if (this.arch && this.arch.spawnBeachStallParticles) {
          this.arch.spawnBeachStallParticles(st.stall.id, npc.group.position);
        }
        if (this.soundtrack && this.soundtrack.playBeachCommerceSound) {
          this.soundtrack.playBeachCommerceSound(npc.group.position);
        }
      }
      return;
    }

    if (st.mode === 'buying_drink') {
      st.timer -= delta;
      // Vira para o balcão da barraca (-Z -> rotY ~ PI)
      npc.group.rotation.y += (Math.PI - npc.group.rotation.y) * Math.min(1, delta * 6);
      if (npc.leftLeg) npc.leftLeg.rotation.x = 0;
      if (npc.rightLeg) npc.rightLeg.rotation.x = 0;
      if (npc.rightArm) npc.rightArm.rotation.x = -0.85 + Math.sin(time * 3.5) * 0.15;
      if (npc.leftArm) npc.leftArm.rotation.x = -0.25;
      if (npc.torso) npc.torso.rotation.y = Math.sin(time * 2.2) * 0.10;
      npc.currentAction = st.stall ? st.stall.drink : '🥥 Comprando água de coco fresca na barraca';

      if (st.timer <= 0) {
        this.resetBeachLimbs(npc, 1.0);
        this.chooseNextBeachDecision(npc, isNightOrSunset);
      }
      return;
    }

    if (st.mode === 'strolling_sand') {
      npc.isBeachSeated = false;
      npc.isBeachCustomY = false;
      const arrived = this.walkBeachTowards(npc, npc.targetPos.x, npc.targetPos.z, 1.85, delta, false);
      if (arrived) {
        st.timer -= delta;
        if (npc.leftLeg) npc.leftLeg.rotation.x = 0;
        if (npc.rightLeg) npc.rightLeg.rotation.x = 0;
        if (npc.torso) npc.torso.rotation.y = Math.sin(time * 1.6) * 0.14;
        if (npc.head) npc.head.rotation.y = Math.cos(time * 1.2) * 0.25;
        if (st.timer <= 0) {
          this.chooseNextBeachDecision(npc, isNightOrSunset);
        }
      }
      return;
    }

    // =========================================================================
    // 5. RODINHAS DE LUAU & FOGUEIRAS NA PRAIA À NOITE (to_bonfire -> at_bonfire)
    // =========================================================================
    if (st.mode === 'to_bonfire') {
      npc.isBeachSeated = false;
      npc.isBeachCustomY = false;
      const seat = st.bonfireSeat;
      if (!seat) {
        this.chooseNextBeachDecision(npc, isNightOrSunset);
        return;
      }
      const arrived = this.walkBeachTowards(npc, seat.x, seat.z, 1.95, delta, false);
      if (arrived) {
        st.mode = 'at_bonfire';
        st.animProgress = 0.0;
        npc.isBeachSeated = true;
        npc.isBeachCustomY = true;
      }
      return;
    }

    if (st.mode === 'at_bonfire') {
      const seat = st.bonfireSeat;
      if (!seat) {
        this.chooseNextBeachDecision(npc, isNightOrSunset);
        return;
      }
      npc.isBeachSeated = true;
      npc.isBeachCustomY = true;
      st.timer -= delta;
      st.animProgress = Math.min(1.0, (st.animProgress || 0) + delta / 0.80);
      const smoothT = st.animProgress * st.animProgress * (3 - 2 * st.animProgress);

      npc.group.position.x = seat.x;
      npc.group.position.z = seat.z;
      npc.group.rotation.y = seat.rotY;

      const phaseOffset = seat.slotIndex * 1.3;

      if (seat.isSeatedSpot) {
        // Sentado no tronco de coqueiro ou esteira ao redor da fogueira na areia
        npc.group.position.y = seat.y + ((seat.seatY - 0.48) - seat.y) * smoothT;
        if (npc.leftLeg) npc.leftLeg.rotation.x = -1.38 * smoothT;
        if (npc.rightLeg) npc.rightLeg.rotation.x = -1.38 * smoothT;

        if (seat.isGuitarSpot) {
          // Tocando violão acústico na roda de luau
          if (npc.torso) {
            npc.torso.rotation.x = 0.10;
            npc.torso.rotation.z = Math.sin(time * 2.8) * 0.08;
          }
          if (npc.leftArm) {
            npc.leftArm.rotation.x = -0.65;
            npc.leftArm.rotation.z = -0.18;
          }
          if (npc.rightArm) {
            npc.rightArm.rotation.x = -0.58 + Math.sin(time * 9.5) * 0.24;
            npc.rightArm.rotation.z = 0.12;
          }
          if (npc.head) npc.head.rotation.x = 0.12 + Math.sin(time * 2.8) * 0.08;
          npc.currentAction = `🎸 Tocando violão à luz da fogueira na ${seat.bonfireName}`;
        } else {
          // Aquecendo as mãos / batendo palmas no ritmo do violão na areia
          if (npc.torso) {
            npc.torso.rotation.x = 0.08 + Math.sin(time * 1.8 + phaseOffset) * 0.04;
            npc.torso.rotation.y = Math.sin(time * 2.2 + phaseOffset) * 0.10;
          }
          const clapBeat = Math.sin(time * 5.6 + phaseOffset);
          if (npc.leftArm) {
            npc.leftArm.rotation.x = -0.62 + clapBeat * 0.16;
            npc.leftArm.rotation.z = -0.12 + Math.max(0, clapBeat) * 0.10;
          }
          if (npc.rightArm) {
            npc.rightArm.rotation.x = -0.62 - clapBeat * 0.16;
            npc.rightArm.rotation.z = 0.12 - Math.max(0, clapBeat) * 0.10;
          }
          if (npc.head) npc.head.rotation.y = Math.sin(time * 1.5 + phaseOffset) * 0.18;
          npc.currentAction = `🔥 Sentado na roda de fogueira curtindo o som e o calor na ${seat.bonfireName}`;
        }
      } else {
        // Em pé na rodinha da fogueira balançando no ritmo e conversando
        const sway = Math.sin(time * 3.2 + phaseOffset);
        npc.group.position.y = seat.y + Math.abs(sway) * 0.06;
        if (npc.leftLeg) npc.leftLeg.rotation.x = sway * 0.15;
        if (npc.rightLeg) npc.rightLeg.rotation.x = -sway * 0.15;
        if (npc.torso) {
          npc.torso.rotation.y = sway * 0.16;
          npc.torso.rotation.x = 0.04;
        }
        if (npc.leftArm) npc.leftArm.rotation.x = -0.45 + sway * 0.22;
        if (npc.rightArm) npc.rightArm.rotation.x = -0.55 - sway * 0.22;
        npc.currentAction = `🔥 Conversando e cantando em volta da fogueira na ${seat.bonfireName}`;
      }

      // Faíscas douradas subindo da fogueira da praia
      if (Math.random() < 0.05 && this.spawnSambaSpark) {
        this.spawnSambaSpark({ x: seat.centerX, y: seat.y + 0.75, z: seat.centerZ });
      }

      if (st.timer <= 0) {
        this.releaseBeachReservations(npc);
        this.resetBeachLimbs(npc, 1.0);
        this.chooseNextBeachDecision(npc, isNightOrSunset);
      }
      return;
    }
  }
};
