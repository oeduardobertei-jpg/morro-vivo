import * as THREE from 'three';

/** Laço de atualização por frame: iluminação noturna, fumaça e animações. */
export const UpdatesMixin = {
  update(delta) {
    if (this.updateMobilitySystems) this.updateMobilitySystems(delta);
    const time = performance.now() * 0.003;
    const timeInfo = this.env ? this.env.getTimeOfDay() : 'day';
    const phase = (typeof timeInfo === 'string') ? timeInfo : (timeInfo.phase || 'day');
    const isWorkHours = (phase === 'day' || phase === 'sunset');

    // 1. UPDATE ONGOING VISUAL NEW HOUSE CONSTRUCTIONS
    for (let cIdx = this.activeConstructions.length - 1; cIdx >= 0; cIdx--) {
      const c = this.activeConstructions[cIdx];
      if (!c || c.cancelled) {
        this.activeConstructions.splice(cIdx, 1);
        continue;
      }

      // Phase 0: Waiting for materials to be delivered by pushcart courier from Olaria
      if (c.state === 'WAITING_SUPPLIES') {
        c.supplyWaitTimer = (c.supplyWaitTimer || 0) + delta;
        if (c.supplyWaitTimer > 3.5) {
          // Automatic timeout fallback: supplies arrive safely, recruit workers ONLY if not already recruited!
          c.state = 'WAITING_WORKERS';
          if ((!c.workers || c.workers.length === 0) && this.npcManager) {
            c.workers = this.npcManager.recruitWorkersForSite(c, 2);
          }
        }
        continue;
      }

      // Phase 1: Waiting for citizen workers to arrive at the site
      if (c.state === 'WAITING_WORKERS') {
        c.workerWaitTimer = (c.workerWaitTimer || 0) + delta;
        if ((!c.workers || c.workers.length === 0) && this.npcManager && isWorkHours) {
          c.workers = this.npcManager.recruitWorkersForSite(c, 2);
        }
        const anyArrived = c.workers && c.workers.length > 0 && c.workers.some(w => w.builderState === 'working');
        if (anyArrived || c.workerWaitTimer > 3.5) {
          c.state = 'ACTIVE_WORK';
          this.spawnConstructionPuff({
            x: c.plateau.x,
            y: c.siteGroup.position.y + 0.3,
            z: c.plateau.z
          });
        }
        continue;
      }

      // Regra estrita de Horário de Obras: à noite e alvorecer, expediente é encerrado e operários são liberados!
      if (!isWorkHours) {
        if (c.workers && c.workers.length > 0) {
          c.workers.forEach(w => {
            if (w && w.isBuilder && this.npcManager) {
              this.npcManager.releaseWorker(w);
            }
          });
          c.workers = [];
        }
        if (c.state === 'ACTIVE_WORK') {
          c.state = 'WAITING_WORKERS';
        }
        continue;
      }

      // Phase 2: Active Construction & Real-Time Terraforming
      // Se houver operários no local, obra opera a 100% de velocidade; se operários estão a caminho, o canteiro avança a ritmo de preparo (65%)
      const hasActiveWorker = c.workers && c.workers.some(w => w.builderState === 'working');
      const progressMult = hasActiveWorker ? 1.0 : 0.65;

      c.progress += (delta / c.duration) * progressMult;

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

      // Steady rhythmic masonry & hammer audio during active construction (ritmo humano orgânico e calmo ~1.05s)
      c.soundTimer = (c.soundTimer || 0) + delta;
      const soundInterval = 1.05 + (c.soundJitter || 0); // [0.90s .. 1.20s] sem poluição sonora
      if (c.soundTimer >= soundInterval && c.progress < 0.98) {
        c.soundTimer = 0;
        c.soundJitter = (Math.random() - 0.5) * 0.30;
        const soundPos = {
          x: c.plateau.x + (Math.random() - 0.5) * 1.5,
          y: c.siteGroup.position.y + 0.5 + (c.progress > 0.5 ? 1.5 : 0),
          z: c.plateau.z + (Math.random() - 0.5) * 1.5
        };
        if (this.soundtrack) {
          this.soundtrack.playConstructionSound(soundPos);
        }
      }

      // Visual dust puffs while excavating / building (cadência suave 1.20s)
      c.particleTimer = (c.particleTimer || 0) + delta;
      if (c.particleTimer >= 1.20 && c.progress < 0.95) {
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
          if (this.batcher && finalHouse.meshGroup) {
            this.batcher.ingestGroup(finalHouse.meshGroup);
          }

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
      if (!u || u.cancelled) {
        this.activeUpgrades.splice(uIdx, 1);
        continue;
      }

      if (u.state === 'WAITING_WORKERS') {
        if ((!u.workers || u.workers.length === 0) && this.npcManager && isWorkHours) {
          u.workers = this.npcManager.recruitWorkersForSite(u, 2);
        }
        const anyArrived = u.workers && u.workers.length > 0 && u.workers.some(w => w.builderState === 'working');
        if (anyArrived) {
          u.state = 'ACTIVE_WORK';
          this.spawnConstructionPuff({
            x: u.house.position.x,
            y: u.house.position.y + 2.5,
            z: u.house.position.z
          });
        }
        continue;
      }

      // Regra estrita de Horário de Obras: à noite e alvorecer, expediente de laje é encerrado e operários liberados!
      if (!isWorkHours) {
        if (u.workers && u.workers.length > 0) {
          u.workers.forEach(w => {
            if (w && w.isBuilder && this.npcManager) {
              this.npcManager.releaseWorker(w);
            }
          });
          u.workers = [];
        }
        if (u.state === 'ACTIVE_WORK') {
          u.state = 'WAITING_WORKERS';
        }
        continue;
      }

      const hasActiveWorker = u.workers && u.workers.some(w => w.builderState === 'working');
      if (!hasActiveWorker) {
        continue;
      }

      u.progress += delta / u.duration;

      // Steady rhythmic masonry & hammer audio during upper floor upgrade (ritmo humano calmo ~1.05s)
      u.soundTimer = (u.soundTimer || 0) + delta;
      const uSoundInterval = 1.05 + (u.soundJitter || 0);
      if (u.soundTimer >= uSoundInterval && u.progress < 0.98) {
        u.soundTimer = 0;
        u.soundJitter = (Math.random() - 0.5) * 0.30;
        const soundPos = {
          x: u.house.position.x + (Math.random() - 0.5) * 1.5,
          y: u.house.position.y + u.house.level * 2.5 + 0.5,
          z: u.house.position.z + (Math.random() - 0.5) * 1.5
        };
        if (this.soundtrack) {
          this.soundtrack.playConstructionSound(soundPos);
        }
      }

      // Periodic dust puffs during upper floor masonry (1.20s)
      u.particleTimer = (u.particleTimer || 0) + delta;
      if (u.particleTimer >= 1.20 && u.progress < 0.95) {
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
        if (this.batcher && u.house.meshGroup) {
          this.batcher.ingestGroup(u.house.meshGroup);
        }

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

    // Guarda-sóis da praia permanecem todos ativos e estáveis (evita realocação e permite uso contínuo das cadeiras)
    if (this.beachUmbrellas && this.beachUmbrellas.length > 0 && !this._beachUmbrellasInitialized) {
      this._beachUmbrellasInitialized = true;
      for (let i = 0; i < this.beachUmbrellas.length; i++) {
        const u = this.beachUmbrellas[i];
        u.group.scale.set(1, 1, 1);
        u.group.visible = true;
      }
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
          senderLegR.rotation.x = THREE.MathUtils.damp(senderLegR.rotation.x, 0, 12.0, delta);
          senderLegL.rotation.x = THREE.MathUtils.damp(senderLegL.rotation.x, 0, 12.0, delta);
          senderTorso.rotation.x = THREE.MathUtils.damp(senderTorso.rotation.x, 0, 10.0, delta);
          senderHead.rotation.x = THREE.MathUtils.damp(senderHead.rotation.x, 0, 10.0, delta);
        }

        // Receiver active anticipation as ball approaches (t > 0.60)
        if (t > 0.60) {
          const prepT = (t - 0.60) / 0.40;
          // Open arms for balance
          receiverArmL.rotation.z = THREE.MathUtils.damp(receiverArmL.rotation.z, -0.35 - prepT * 0.45, 14.0, delta);
          receiverArmR.rotation.z = THREE.MathUtils.damp(receiverArmR.rotation.z, 0.35 + prepT * 0.45, 14.0, delta);

          if (alt.touchType === 'head') {
            // Jump off the sand into the air for athletic header!
            receiver.position.y += Math.sin(prepT * Math.PI) * 0.38;
            receiverHead.rotation.x = THREE.MathUtils.damp(receiverHead.rotation.x, -prepT * 0.50, 16.0, delta);
            receiverTorso.rotation.x = THREE.MathUtils.damp(receiverTorso.rotation.x, -prepT * 0.15, 14.0, delta);
          } else if (alt.touchType === 'knee') {
            // Thigh lift to cushion or pop the ball up
            receiverLegR.rotation.x = THREE.MathUtils.damp(receiverLegR.rotation.x, -prepT * 1.25, 16.0, delta);
            receiverTorso.rotation.x = THREE.MathUtils.damp(receiverTorso.rotation.x, -prepT * 0.12, 14.0, delta);
          } else if (alt.touchType === 'foot_l') {
            // Left foot volley with torso lean
            receiverLegL.rotation.x = THREE.MathUtils.damp(receiverLegL.rotation.x, -prepT * 1.18, 16.0, delta);
            receiverTorso.rotation.x = THREE.MathUtils.damp(receiverTorso.rotation.x, prepT * 0.25, 14.0, delta);
          } else {
            // Right foot volley with torso lean
            receiverLegR.rotation.x = THREE.MathUtils.damp(receiverLegR.rotation.x, -prepT * 1.22, 16.0, delta);
            receiverTorso.rotation.x = THREE.MathUtils.damp(receiverTorso.rotation.x, prepT * 0.26, 14.0, delta);
          }
        }
      } else {
        // TOUCH! Ball hits player's foot, knee, or forehead!
        alt.progress = 0.0;
        alt.direction = -alt.direction;
        alt.rally = (alt.rally || 0) + 1;

        // Touch sound & spatial audio
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

    // Frescobol Rally in Southeast Dunes Court (jogadores animados acompanhando a bolinha!)
    if (this.frescobolMatch) {
      const f = this.frescobolMatch;
      f.progress += delta * 1.65;
      const p1Z = -3.5;
      const p2Z = 3.5;
      const startZ = f.direction === 1 ? p1Z : p2Z;
      const endZ = f.direction === 1 ? p2Z : p1Z;
      const latDrift = Math.sin(time * 0.9) * 0.75;

      if (f.progress < 1.0) {
        const t = f.progress;
        f.ball.position.z = startZ + (endZ - startZ) * t;
        f.ball.position.x = Math.sin(t * Math.PI) * latDrift;
        f.ball.position.y = 1.05 + Math.sin(t * Math.PI) * 1.15;
        f.ball.rotation.x += delta * 15 * f.direction;

        // Jogadores acompanham sutilmente a trajetória lateral da bola e gingam nas pernas
        const p1TargetX = f.direction === -1 ? latDrift * 0.65 : latDrift * 0.25;
        const p2TargetX = f.direction === 1 ? latDrift * 0.65 : latDrift * 0.25;
        f.p1.position.x = THREE.MathUtils.damp(f.p1.position.x, (f.p1BaseX || 0) + p1TargetX, 6.0, delta);
        f.p2.position.x = THREE.MathUtils.damp(f.p2.position.x, (f.p2BaseX || 0) + p2TargetX, 6.0, delta);
        f.p1.position.y = Math.abs(Math.sin(time * 5.0)) * 0.05;
        f.p2.position.y = Math.abs(Math.sin(time * 5.0 + 1.2)) * 0.05;

        const hitter = f.direction === 1 ? 'p2' : 'p1';
        const passer = f.direction === 1 ? 'p1' : 'p2';

        // Rebatida de forehand/backhand no braço com raquete sincronizada com a chegada da bolinha
        const prepSwing = t > 0.65 ? ((t - 0.65) / 0.35) : 0;
        const followThrough = t < 0.30 ? (1.0 - t / 0.30) : 0;
        const hitArmX = prepSwing > 0 ? (-0.95 - prepSwing * 0.85) : (-0.35 + Math.sin(time * 3.5) * 0.08);
        const passArmX = followThrough > 0 ? (-1.55 + (1.0 - followThrough) * 1.15) : (-0.35 - Math.sin(time * 3.5) * 0.08);

        if (f[`${hitter}ArmR`]) {
          f[`${hitter}ArmR`].rotation.x = THREE.MathUtils.damp(f[`${hitter}ArmR`].rotation.x, hitArmX, 16.0, delta);
          f[`${hitter}ArmR`].rotation.z = THREE.MathUtils.damp(f[`${hitter}ArmR`].rotation.z, 0.32 * (f.shotSide || 1) * prepSwing, 14.0, delta);
        }
        if (f[`${hitter}Torso`]) {
          f[`${hitter}Torso`].rotation.y = THREE.MathUtils.damp(f[`${hitter}Torso`].rotation.y, -0.35 * (f.shotSide || 1) * prepSwing, 12.0, delta);
          f[`${hitter}Torso`].rotation.x = THREE.MathUtils.damp(f[`${hitter}Torso`].rotation.x, 0.12 * prepSwing, 12.0, delta);
        }
        if (f[`${passer}ArmR`]) {
          f[`${passer}ArmR`].rotation.x = THREE.MathUtils.damp(f[`${passer}ArmR`].rotation.x, passArmX, 14.0, delta);
          f[`${passer}ArmR`].rotation.z = THREE.MathUtils.damp(f[`${passer}ArmR`].rotation.z, -0.25 * followThrough, 12.0, delta);
        }
        if (f[`${passer}Torso`]) {
          f[`${passer}Torso`].rotation.y = THREE.MathUtils.damp(f[`${passer}Torso`].rotation.y, 0.25 * followThrough, 10.0, delta);
          f[`${passer}Torso`].rotation.x = THREE.MathUtils.damp(f[`${passer}Torso`].rotation.x, 0.04, 10.0, delta);
        }
        ['p1', 'p2'].forEach((pk, idx) => {
          const step = Math.sin(time * 5.2 + idx * 1.4) * 0.22;
          if (f[`${pk}LegL`]) f[`${pk}LegL`].rotation.x = THREE.MathUtils.damp(f[`${pk}LegL`].rotation.x, step, 12.0, delta);
          if (f[`${pk}LegR`]) f[`${pk}LegR`].rotation.x = THREE.MathUtils.damp(f[`${pk}LegR`].rotation.x, -step, 12.0, delta);
          if (f[`${pk}ArmL`]) f[`${pk}ArmL`].rotation.z = THREE.MathUtils.damp(f[`${pk}ArmL`].rotation.z, -0.24 - Math.abs(step) * 0.35, 12.0, delta);
          if (f[`${pk}Head`]) f[`${pk}Head`].rotation.x = THREE.MathUtils.damp(f[`${pk}Head`].rotation.x, -0.14, 10.0, delta);
        });
      } else {
        f.progress = 0.0;
        f.direction = -f.direction;
        f.shotSide = Math.random() < 0.5 ? 1 : -1;
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

    // Particles (Construction, Beach Stalls, Dust - Smooth Physical Dissipation)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.gravity) {
        p.vel.y -= delta * p.gravity;
      }
      p.mesh.position.addScaledVector(p.vel, delta);
      
      if (p.isCoin) {
        p.mesh.rotation.y += delta * 6.0;
        const progress = Math.max(0, p.life / p.maxLife);
        p.mesh.scale.setScalar(Math.min(1.0, progress * 1.4));
      } else {
        p.mesh.rotation.x += delta * 2.5;
        p.mesh.rotation.y += delta * 2.0;
        const progress = Math.max(0.001, p.life / p.maxLife);
        p.mesh.scale.setScalar(progress);
      }

      if (p.life <= 0) {
        this.group.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  },

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

    // 1. House Windows: Slate blue glass by day -> Warm varied amber glow across homes at dusk & night (O(1) via sharedWindowMats)
    const isLit = nightFactor > 0.08;
    if (this.sharedWindowMats && this.sharedWindowMats.length >= 3) {
      const presets = [
        { day: 0x3D5570, col: 0xFFE082, em: 0xFF9F1C, ei: 1.42 },
        { day: 0x45607D, col: 0xFFD08A, em: 0xE67E22, ei: 0.92 },
        { day: 0x31455A, col: 0x2E435A, em: 0x3B5570, ei: 0.22 }
      ];
      for (let i = 0; i < this.sharedWindowMats.length; i++) {
        const m = this.sharedWindowMats[i];
        const p = presets[i % presets.length];
        if (isLit) {
          m.color.setHex(p.col);
          m.emissive.setHex(p.em);
          m.emissiveIntensity = p.ei * nightFactor;
        } else {
          m.color.setHex(p.day);
          m.emissive.setHex(0x000000);
          m.emissiveIntensity = 0.0;
        }
      }
    } else if (this.windowMeshes && this.windowMeshes.length > 0) {
      for (let i = 0; i < this.windowMeshes.length; i++) {
        const win = this.windowMeshes[i];
        if (win.material) {
          if (isLit) {
            win.material.color.setHex(0xFCD34D);
            win.material.emissive.setHex(0xF59E0B);
            win.material.emissiveIntensity = 1.15 * nightFactor;
          } else {
            win.material.color.setHex(0x3D5570);
            win.material.emissive.setHex(0x000000);
            win.material.emissiveIntensity = 0.0;
          }
        }
      }
    }

    // 2. Solar Streetlamps along highways, plazas and promenades (+ lanternas do Mirante Imperial)
    if (this.miranteLanternMat) {
      this.miranteLanternMat.emissiveIntensity = 0.25 + 1.85 * nightFactor;
    }
    if (this.miranteGlowMat) {
      this.miranteGlowMat.opacity = 0.04 + 0.24 * nightFactor;
    }
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
      const isSambaActive = (phase === 'night' || phase === 'sunset');
      if (sambaLight) {
        sambaLight.intensity = isSambaActive
          ? (3.4 + Math.sin(time * 14.0) * 0.8 + Math.cos(time * 22.0) * 0.4)
          : 0.8;
      }
      if (this.sambaFire && this.sambaFireInner) {
        const flicker = 1.0 + Math.sin(time * 12.0) * 0.15 + Math.cos(time * 18.0) * 0.1;
        const fireScaleY = isSambaActive ? flicker * 1.35 : flicker * 0.6;
        this.sambaFire.scale.set(flicker, fireScaleY, flicker);
        this.sambaFireInner.scale.set(flicker * 0.9, fireScaleY * 0.9, flicker * 0.9);
      }
    }

    // 4b. Rodinhas de Luau & Fogueiras na Praia (Acendem no Pôr do Sol e à Noite!)
    if (this.beachBonfires && this.beachBonfires.length > 0) {
      const isLuauActive = (phase === 'night' || phase === 'sunset');
      for (let b = 0; b < this.beachBonfires.length; b++) {
        const bf = this.beachBonfires[b];
        if (bf.fireGroup) {
          bf.fireGroup.visible = isLuauActive;
        }
        if (isLuauActive) {
          const phaseShift = b * 2.1;
          const flicker = 0.95 + Math.sin(time * 11.5 + phaseShift) * 0.16 + Math.cos(time * 17.0 + phaseShift) * 0.10;
          const scaleY = flicker * (phase === 'night' ? 1.25 : 0.92);
          if (bf.fireOuter) bf.fireOuter.scale.set(flicker, scaleY, flicker);
          if (bf.fireInner) bf.fireInner.scale.set(flicker * 0.88, scaleY * 0.90, flicker * 0.88);
          if (bf.fireLight) {
            bf.fireLight.intensity = (phase === 'night' ? 2.6 : 1.6) + Math.sin(time * 13.0 + phaseShift) * 0.55;
          }
        } else if (bf.fireLight) {
          bf.fireLight.intensity = 0.0;
        }
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
  },

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
          if (bbq.timer > 0.95) {
            bbq.timer = 0;
            this.spawnSmokePuff(bbq.pos);
          }
        }
      }
    }

    // Update rising smoke particles (Clean dissipation without mutating sharedSmokeMat opacity)
    for (let s = this.smokeParticles.length - 1; s >= 0; s--) {
      const smk = this.smokeParticles[s];
      smk.life -= delta * 0.85;
      smk.mesh.position.addScaledVector(smk.vel, delta);
      const progress = Math.max(0, smk.life / smk.maxLife); // 1.0 down to 0.0
      const currentScale = (1.0 + (1.0 - progress) * 1.6) * Math.min(1.0, progress * 2.8);
      smk.mesh.scale.setScalar(Math.max(0.01, currentScale));

      if (smk.life <= 0) {
        this.group.remove(smk.mesh);
        this.smokeParticles.splice(s, 1);
      }
    }
  },

  spawnSmokePuff(pos) {
    if (this.smokeParticles.length > 18) return; // Clean particle pool limit
    const puff = new THREE.Mesh(this.sharedSmokeGeo, this.sharedSmokeMat);
    puff.position.copy(pos);
    puff.position.x += (Math.random() - 0.5) * 0.18;
    puff.position.z += (Math.random() - 0.5) * 0.18;

    this.group.add(puff);
    const lifeSpan = 1.4 + Math.random() * 0.4;
    this.smokeParticles.push({
      mesh: puff,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.08 - 0.12, // Gentle sea breeze westward drift
        0.70 + Math.random() * 0.25,         // Soft upward draft
        (Math.random() - 0.5) * 0.08
      ),
      life: lifeSpan,
      maxLife: lifeSpan
    });
  }
};
