import * as THREE from 'three';
import { RoadGraphMixin } from './npcs/roadGraph.js';
import { PopulationMixin } from './npcs/population.js';
import { WorkersMixin } from './npcs/workers.js';
import { KiteMixin } from './npcs/kite.js';
import { SambaMixin } from './npcs/sambaSound.js';

export class NPCManager {
  constructor(scene, terrain, architecture) {
    this.scene = scene;
    this.terrain = terrain;
    this.arch = architecture;
    this.group = new THREE.Group();
    this.npcs = [];
    this.soundtrack = null;

    this.firstNames = [
      'Mateus', 'Tiago', 'Camila', 'Luan', 'Dona Rita', 'Seu Jorge',
      'Lucas', 'Beatriz', 'Rafael', 'Iara', 'Valéria', 'Manoel',
      'Gabriel', 'Júlia', 'Rodrigo', 'Larissa', 'Bruno', 'Aline',
      'Seu Zeca', 'Dona Cláudia', 'Beto', 'Mariana', 'Vinícius', 'Renata',
      'Fabiano', 'Letícia', 'Danilo', 'Priscila', 'Otávio', 'Juliana'
    ];

    this.roles = [
      { title: 'Guardião do Farol', action: 'Inspecionando a costa e o farol', color: 0xD83A3A },
      { title: 'Pescador da Prainha', action: 'Subindo com peixe fresco da baía', color: 0x0077B6 },
      { title: 'Operador Solar da Serra', action: 'Monitorando os painéis da chapada', color: 0x38BDF8 },
      { title: 'Feirante da Várzea', action: 'Levando artesanato para a feira', color: 0x2A9D8F },
      { title: 'Jogador da Pelada', action: 'Jogando bola no campinho de várzea', color: 0xE76F51 },
      { title: 'Músico de Roda', action: 'Tocando cavaquinho pelas praças', color: 0xF4A261 },
      { title: 'Mestre de Obras', action: 'Avaliando novas lajes e reformas', color: 0xB55338 },
      { title: 'Líder Comunitária', action: 'Caminhando entre as vilas e dialogando', color: 0x9B5DE5 },
      // Papéis do Cinturão das Alturas e Cantos das Encostas:
      { title: 'Menino da Pipa', action: 'Empinando pipa nos ventos do Mirante', color: 0xF43F5E },
      { title: 'Agricultora da Horta', action: 'Cuidando dos socalcos de agrofloresta', color: 0x10B981 },
      { title: 'Trilheiro do Cume', action: 'Subindo para o Mirante da Vista Imperial', color: 0x6366F1 },
      { title: 'Técnico da Usina Eólica', action: 'Monitorando as turbinas de vento na chapada', color: 0x06B6D4 },
      { title: 'Barqueiro do Poente', action: 'Costurando redes e cuidando dos botes no cais', color: 0x0EA5E9 },
      { title: 'Mestre Oleiro', action: 'Queimando tijolos e telhas nos fornos da olaria', color: 0xEA580C },
      { title: 'Turista Encantado', action: 'Admirando a Guanabara com a luneta no Mirante Imperial', color: 0xF59E0B },
      { title: 'Fotógrafo da Serra', action: 'Registrando a Vista Imperial entre os granitos', color: 0x10B981 },
      { title: 'Vigia do Mirante do Levante', action: 'Apreciando a vista da baía no deck leste', color: 0xD97706 },
      { title: 'Técnico da Rádio Comunitária', action: 'Ajustando as antenas da torre na crista', color: 0xDC2626 },
      // Papéis Especializados da Beira da Praia:
      { title: 'Barraqueiro do Coco', action: 'Cortando cocos verdes na bancada com facão', color: 0x2D6A4F, stallId: 'coco' },
      { title: 'Barraqueiro do Mate', action: 'Servindo mate gelado e biscoito Globo', color: 0xF97316, stallId: 'mate' },
      { title: 'Barraqueiro do Açaí', action: 'Montando tigelas de açaí com banana e granola', color: 0x7E22CE, stallId: 'acai' },
      { title: 'Barraqueiro de Petiscos', action: 'Fritando pasteis de camarão e peixe fresco', color: 0xDC2626, stallId: 'petiscos' },
      { title: 'Banhista da Praia', action: 'Tomando sol e curtindo o mar carioca', color: 0x06B6D4 }
    ];

    this.sambaAudioTimer = 0;
    this.sambaSparks = [];

    // Materiais Compartilhados (Otimização de RAM)
    this.sharedSparkGeo = new THREE.DodecahedronGeometry(0.08, 0);
    this.sharedSparkMat = new THREE.MeshBasicMaterial({ color: 0xFBBF24, transparent: true, opacity: 0.85 });

    // Sistema Autônomo e Ocasional do Menino da Pipa (Atualização 1.1)
    this.kiteSystem = {
      activeKite: false,
      timer: 0,
      cooldown: 25.0,
      flyerNPC: null,
      kiteMesh: null,
      lineMesh: null
    };

    this.scene.add(this.group);
  }

  setEnvironment(env) {
    this.env = env;
  }

  setSoundtrack(soundtrack) {
    this.soundtrack = soundtrack;
  }

  setSimulation(simulation) {
    this.simulation = simulation;
  }

  update(delta) {
    // Clamping defensivo de delta-time para garantir 60 FPS fluidos em 1x, 2x e 5x
    const clampedDelta = Math.min(delta, 0.20);
    const subSteps = clampedDelta > 0.07 ? 2 : 1;
    const subDelta = clampedDelta / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.updateStep(subDelta);
    }

    this.updateKite(clampedDelta);
  }

  updateStep(delta) {
    const time = performance.now() * 0.003;

    // Atualização dinâmica das bolas esportivas na praia (Futevôlei e Vôlei de Praia)
    if (this.futevoleiBall) {
      const s = Math.sin(time * 3.5);
      const bx = 78.0 + s * 1.6;
      const by = 2.05 + Math.cos(s * Math.PI / 2) * 0.85;
      this.futevoleiBall.position.set(bx, by, 42.0);
      this.futevoleiBall.rotation.x += delta * 6;
      this.futevoleiBall.rotation.z += delta * 8;
    }

    if (this.voleiBall) {
      const s = Math.sin(time * 2.8);
      const vx = 98.0 + s * 2.0;
      const vy = 2.45 + Math.cos(s * Math.PI / 2) * 1.1;
      this.voleiBall.position.set(vx, vy, 44.0);
      this.voleiBall.rotation.x += delta * 7;
      this.voleiBall.rotation.y += delta * 5;
    }

    this.npcs.forEach(npc => {
      // 1. Manter pés firmemente apoiados no piso/lajes/deck
      if (npc.builderState !== 'celebrating') {
        const groundY = this.getFloorElevation(npc.group.position.x, npc.group.position.z);
        npc.group.position.y = groundY;
      }

      // 1b. BARREIRA FÍSICA INCONDICIONAL DO PENHASCO FRONTAL DO MORRO DO SOL
      // Impede 100% que qualquer cidadão escorregue, caminhe ou caia na face vertical frontal
      const px = npc.group.position.x;
      const pz = npc.group.position.z;
      if (px >= -12.5 && px <= 12.5 && pz >= 3.0 && pz <= 16.8) {
        if (pz < 9.5) {
          npc.group.position.z = 2.4; // Retém no platô, dentro do Terreiro/Mirante
        } else {
          npc.group.position.z = 17.6; // Retém na base, no calçadão litorâneo
        }
      }

      // 1c. MORADOR SENTADO (Boteco de Calçada ou Banco da Alameda)
      if (npc.isSitting) {
        npc.sittingTimer = (npc.sittingTimer || 0) - delta;
        if (npc.leftLeg) npc.leftLeg.rotation.x = -1.45;
        if (npc.rightLeg) npc.rightLeg.rotation.x = -1.45;
        if (npc.leftArm) npc.leftArm.rotation.x = -0.4;
        if (npc.rightArm) npc.rightArm.rotation.x = -0.4;
        if (npc.torso) npc.torso.rotation.x = 0.05;

        if (npc.sittingTimer <= 0) {
          if (npc.sittingSpot) npc.sittingSpot.isOccupied = false;
          npc.isSitting = false;
          npc.sittingSpot = null;
          npc.waitTimer = 1.0;
          if (npc.leftLeg) npc.leftLeg.rotation.x = 0;
          if (npc.rightLeg) npc.rightLeg.rotation.x = 0;
          if (npc.leftArm) npc.leftArm.rotation.x = 0;
          if (npc.rightArm) npc.rightArm.rotation.x = 0;
          npc.currentAction = 'Retomando a caminhada pelas ruas da colina';
        }
        return;
      }

      // 1d. MORADOR EMPINANDO PIPA NA LAJE/CRISTA
      if (npc.isFlyingKite) {
        if (npc.rightArm) npc.rightArm.rotation.x = -1.25 + Math.sin(time * 3) * 0.08;
        if (npc.head) npc.head.rotation.x = -0.45;
        if (npc.leftArm) npc.leftArm.rotation.x = -0.35;
        npc.currentAction = '🪁 Empinando pipa no céu da colina aproveitando a brisa favorável';
        return;
      }

      // 2. BARRAQUEIRO BEHAVIOR (Comércio nas Barracas da Praia)
      if (npc.isBarraqueiro) {
        // Subtle food/drink prep animation behind the counter
        npc.torso.rotation.x = Math.sin(time * 3 + npc.walkCycle) * 0.06;
        npc.torso.rotation.y = Math.sin(time * 2 + npc.walkCycle) * 0.08;

        if (npc.assignedStall) {
          const cSpot = npc.assignedStall.customerSpot;
          // Check for nearby customers at customerSpot
          const customer = this.npcs.find(other => 
            other !== npc && !other.isBarraqueiro && 
            Math.hypot(other.group.position.x - cSpot.x, other.group.position.z - cSpot.z) < 2.5
          );

          if (customer) {
            npc.currentAction = `Atendendo ${customer.citizenName} com ${npc.assignedStall.product}`;
            customer.currentAction = `Aproveitando ${npc.assignedStall.product} na praia`;

            npc.saleTimer = (npc.saleTimer || 0) + delta;
            if (npc.saleTimer > 5.0) {
              npc.saleTimer = 0;
              if (this.soundtrack && this.soundtrack.playBeachCommerceSound) {
                this.soundtrack.playBeachCommerceSound(cSpot);
              }
              if (this.arch && this.arch.spawnBeachStallParticles) {
                this.arch.spawnBeachStallParticles(npc.assignedStall.id, cSpot);
              }
            }
          } else {
            npc.currentAction = `Organizando a ${npc.assignedStall.name} e aguardando fregueses`;
          }
        }
        return;
      }

      // 2b. PERSONAGENS CÊNICOS DEDICADOS (Alameda das Flores, Terreiro de Samba & Mirante Sul)
      if (npc.isScenicMirante) {
        if (npc.isMusician) {
          // Tião do Cavaco: ginga e dedilhado rítmico no cavaquinho
          if (npc.cavacoGroup) {
            npc.cavacoGroup.rotation.z = -0.65 + Math.sin(time * 6) * 0.06;
          }
          if (npc.torso) {
            npc.torso.rotation.x = 0.08 + Math.sin(time * 3) * 0.04;
            npc.torso.rotation.y = Math.sin(time * 4) * 0.06;
          }
          if (npc.leftArm) npc.leftArm.rotation.x = -0.60 + Math.sin(time * 6) * 0.14;
          if (npc.rightArm) npc.rightArm.rotation.x = 0.38 + Math.sin(time * 12) * 0.28;
          if (npc.head) npc.head.rotation.x = Math.sin(time * 3) * 0.08;
          npc.currentAction = '🎶 Tocando cavaquinho com harmonia e ginga na roda de samba';
        } else if (npc.name === 'Dona Teresa' || (npc.role && npc.role.title === 'Florista da Alameda')) {
          // Dona Teresa cuidando dos canteiros de flores da Alameda
          if (npc.torso) {
            npc.torso.rotation.y = Math.sin(time * 1.8) * 0.18;
          }
          if (npc.leftArm) npc.leftArm.rotation.x = -0.25 + Math.sin(time * 2.5) * 0.22;
          if (npc.rightArm) npc.rightArm.rotation.x = 0.20 + Math.cos(time * 2.8) * 0.20;
          npc.currentAction = '🌺 Cuidando com carinho dos canteiros floridos da Alameda';
        } else {
          // Seu Agenor no Mirante Sul com vista panorâmica pro oceano
          if (npc.torso) npc.torso.rotation.x = 0.12;
          if (npc.rightArm) npc.rightArm.rotation.x = -0.25 + Math.sin(time * 1.5) * 0.18;
          npc.currentAction = '🌊 Contemplando a brisa e a vista panorâmica do oceano no Mirante Sul';
        }
        return;
      }

      // 2c. SEU ZÉ DO COVO - PESCADOR DO PÍER (Atualização 1.2)
      if (npc.isFisherman) {
        if (npc.fishingRod) {
          const biteTug = Math.sin(time * 7.5) > 0.82 ? -0.10 : 0;
          npc.fishingRod.rotation.x = Math.PI / 3.8 + Math.sin(time * 2.2) * 0.04 + biteTug;
        }
        if (npc.torso) npc.torso.rotation.x = 0.08 + Math.sin(time * 1.5) * 0.03;
        if (npc.rightArm) npc.rightArm.rotation.x = -0.4 + Math.sin(time * 2.2) * 0.05;
        npc.currentAction = '🎣 Pescando pacientemente no extremo do píer sentindo o puxão das marés';
        return;
      }

      // 2d. ATLETAS DE AREIA - FUTEVÔLEI & VÔLEI DE PRAIA (Atualização 1.2)
      if (npc.isAthlete) {
        if (npc.athleteType === 'futevolei') {
          // Betinho (x: 76.2) e Pedrão (x: 79.8) trocando cabeceios e peitadas
          const s = Math.sin(time * 3.5);
          const isMyTurn = (npc.group.position.x < 78.0) ? (s < -0.3) : (s > 0.3);
          if (isMyTurn) {
            const hop = Math.abs(Math.sin(time * 7.0)) * 0.28;
            npc.group.position.y += hop;
            if (npc.torso) npc.torso.rotation.x = -0.22;
            if (npc.leftArm) npc.leftArm.rotation.x = 0.6;
            if (npc.rightArm) npc.rightArm.rotation.x = -0.6;
            if (npc.head) npc.head.rotation.x = -0.35;
          } else {
            if (npc.torso) npc.torso.rotation.x = 0.05;
            if (npc.leftArm) npc.leftArm.rotation.x = 0.1;
            if (npc.rightArm) npc.rightArm.rotation.x = -0.1;
            if (npc.head) npc.head.rotation.x = -0.1;
          }
          npc.currentAction = '⚽ Disputando peitadas e cabeceios plásticos na arena de futevôlei';
        } else if (npc.athleteType === 'volei') {
          // Rodrigo (x: 95.8) e Carlos (x: 100.2) na manchete e saque
          const s = Math.sin(time * 2.8);
          const isMyTurn = (npc.group.position.x < 98.0) ? (s < -0.3) : (s > 0.3);
          if (isMyTurn) {
            const hop = Math.abs(Math.sin(time * 5.6)) * 0.32;
            npc.group.position.y += hop;
            if (npc.leftArm) npc.leftArm.rotation.x = -0.85;
            if (npc.rightArm) npc.rightArm.rotation.x = -0.85;
            if (npc.torso) npc.torso.rotation.x = 0.15;
          } else {
            if (npc.leftArm) npc.leftArm.rotation.x = -0.2;
            if (npc.rightArm) npc.rightArm.rotation.x = -0.2;
            if (npc.torso) npc.torso.rotation.x = 0;
          }
          npc.currentAction = '🏐 Treinando recepção e saques rápidos na quadra de vôlei de praia';
        }
        return;
      }

      // 2e. BETO DO MATE - AMBULANTE ICÔNICO DE PRAIA (Atualização 1.2)
      if (npc.isMateiro) {
        if (npc.waitTimer > 0) {
          npc.waitTimer -= delta;
          if (npc.torso) npc.torso.rotation.y = Math.sin(time * 3) * 0.15;
          if (npc.leftArm) npc.leftArm.rotation.x = 0.2 + Math.sin(time * 2) * 0.1;
          if (npc.rightArm) npc.rightArm.rotation.x = -0.4 + Math.sin(time * 4) * 0.2;
          npc.currentAction = '🥤 "Olha o mate geladinho e o biscoito Globo fresquinho!"';
          return;
        }

        const dirX = npc.targetPos.x - npc.group.position.x;
        const dirZ = npc.targetPos.z - npc.group.position.z;
        const dist = Math.hypot(dirX, dirZ);

        if (dist < 1.4) {
          npc.waitTimer = 3.5 + Math.random() * 2.0;
          npc.patrolIndex = (npc.patrolIndex + 1) % npc.beachPatrolSpots.length;
          const nextPt = npc.beachPatrolSpots[npc.patrolIndex];
          const ny = this.terrain ? this.terrain.getElevation(nextPt.x, nextPt.z) : 0.45;
          npc.targetPos.set(nextPt.x, ny, nextPt.z);
          npc.currentAction = '🥤 "Olha o mate geladinho e o biscoito Globo fresquinho!"';
        } else {
          const normX = dirX / dist;
          const normZ = dirZ / dist;
          const mateSpeed = 1.9;
          npc.group.position.x += normX * mateSpeed * delta;
          npc.group.position.z += normZ * mateSpeed * delta;
          npc.group.rotation.y = Math.atan2(normX, normZ);

          npc.walkCycle += delta * 8;
          const swing = Math.sin(npc.walkCycle) * 0.55;
          if (npc.leftLeg) npc.leftLeg.rotation.x = swing;
          if (npc.rightLeg) npc.rightLeg.rotation.x = -swing;
          if (npc.canisterGroup) {
            npc.canisterGroup.rotation.z = Math.sin(npc.walkCycle) * 0.05;
          }
          npc.currentAction = '🚶 Caminhando pelas areias oferecendo Mate Leão e biscoito';
        }
        return;
      }

      // 2f. MESTRE BIMBA - TERREIRO DE CAPOEIRA (Atualização 1.2.2)
      if (npc.isCapoeira) {
        const s = Math.sin(time * 3.2);
        const c = Math.cos(time * 3.2);
        if (npc.torso) {
          npc.torso.rotation.z = s * 0.18;
          npc.torso.rotation.x = 0.12 + Math.abs(c) * 0.08;
        }
        if (npc.leftLeg) npc.leftLeg.rotation.x = s * 0.45;
        if (npc.rightLeg) npc.rightLeg.rotation.x = -s * 0.45;
        if (npc.leftArm) npc.leftArm.rotation.x = -0.3 + c * 0.35;
        if (npc.rightArm) npc.rightArm.rotation.x = -0.3 - c * 0.35;
        npc.currentAction = '🥋 Praticando a ginga e ensinando cantigas de capoeira com o berimbau';
        return;
      }

      // 2g. DONA NAIR - HORTA COMUNITÁRIA EM SOCALCOS (Atualização 1.2.2)
      if (npc.isHorta) {
        const s = Math.sin(time * 1.6);
        if (npc.torso) {
          npc.torso.rotation.x = 0.28 + s * 0.12;
          npc.torso.rotation.y = Math.cos(time * 0.8) * 0.2;
        }
        if (npc.leftArm) npc.leftArm.rotation.x = -0.5 + s * 0.25;
        if (npc.rightArm) npc.rightArm.rotation.x = -0.3 - s * 0.25;
        npc.currentAction = '🌱 Cuidando dos canteiros de couve, hortelã e tomate orgânico na encosta';
        return;
      }

      // 2h. TIAGO MOTOTÁXI - PONTO OFICIAL DE MOTOTÁXI (Atualização 1.2.2)
      if (npc.isMototaxi) {
        const s = Math.sin(time * 1.8);
        if (npc.torso) npc.torso.rotation.y = s * 0.25;
        if (npc.leftArm) npc.leftArm.rotation.x = -0.2 + Math.sin(time * 3.0) * 0.1;
        if (npc.rightArm) npc.rightArm.rotation.x = 0.1 + Math.cos(time * 2.0) * 0.08;
        npc.currentAction = '🛵 Pronto no ponto de mototáxi para subir o morro com passageiros';
        return;
      }

      // 2i. GUGA DO SURFE - ESCOLA DE SURFE & PRANCHÁRIO (Atualização 1.2.2)
      if (npc.isSurfer) {
        const s = Math.sin(time * 2.2);
        if (npc.torso) {
          npc.torso.rotation.y = 0.3 + s * 0.15;
          npc.torso.rotation.x = 0.1;
        }
        if (npc.rightArm) npc.rightArm.rotation.x = -0.6 + s * 0.3; // Encerando prancha
        if (npc.leftArm) npc.leftArm.rotation.x = -0.2;
        npc.currentAction = '🏄 Checando a ondulação e preparando pranchas de surfe para os alunos';
        return;
      }

      // 2j. JONAS DA CALISTENIA - ACADEMIA AO AR LIVRE (Atualização 1.2.2)
      if (npc.isCalistenia) {
        const s = Math.sin(time * 2.5);
        const dip = Math.max(0, s);
        npc.group.position.y = (this.terrain ? this.terrain.getElevation(112, -12) : 2.0) + dip * 0.35;
        if (npc.torso) npc.torso.rotation.x = 0.15;
        if (npc.leftArm) npc.leftArm.rotation.x = -0.8 + dip * 0.5;
        if (npc.rightArm) npc.rightArm.rotation.x = -0.8 + dip * 0.5;
        if (npc.leftLeg) npc.leftLeg.rotation.x = 0.3;
        if (npc.rightLeg) npc.rightLeg.rotation.x = 0.3;
        npc.currentAction = '💪 Treinando barras paralelas e exercícios de calistenia ao ar livre';
        return;
      }

      // 3. WHEELBARROW COURIER LOGISTICS (Carreto de Tijolos)
      if (npc.isCourier) {
        // Rotate wheel continuously while moving
        npc.cartWheel.rotation.x += delta * 14;

        // Periodic cart rattle sound
        npc.cartRattleTimer += delta;
        if (npc.cartRattleTimer >= 2.4) {
          npc.cartRattleTimer = 0;
          if (this.soundtrack) {
            this.soundtrack.playCartRattle(npc.group.position);
          }
        }

        const dirX = npc.targetPos.x - npc.group.position.x;
        const dirZ = npc.targetPos.z - npc.group.position.z;
        const dist = Math.hypot(dirX, dirZ);

        if (dist < 1.4) {
          if (npc.pathQueue && npc.pathQueue.length > 0) {
            npc.currentNodeId = npc.targetNodeId;
            npc.targetNodeId = npc.pathQueue.shift();
            const nxt = this.roadNodesMap.get(npc.targetNodeId);
            if (nxt) npc.targetPos = nxt.position.clone();
          } else {
            // Chegou à via mais próxima da obra, caminha os últimos metros até a laje
            const siteTarget = new THREE.Vector3(npc.courierSite.plateau.x, npc.courierSite.plateau.y, npc.courierSite.plateau.z);
            const distFinal = Math.hypot(siteTarget.x - npc.group.position.x, siteTarget.z - npc.group.position.z);
            if (distFinal < 2.2) {
              const onDelivered = npc.onDelivered;
              this.releaseCourier(npc);
              if (onDelivered) onDelivered();
              return;
            } else {
              npc.targetPos = siteTarget;
            }
          }
        } else {
          const normX = dirX / dist;
          const normZ = dirZ / dist;
          npc.group.position.x += normX * npc.speed * delta;
          npc.group.position.z += normZ * npc.speed * delta;

          npc.group.rotation.y = Math.atan2(normX, normZ);

          npc.walkCycle += delta * 9;
          const swing = Math.sin(npc.walkCycle) * 0.48;
          npc.leftLeg.rotation.x = swing;
          npc.rightLeg.rotation.x = -swing;
        }
        return;
      }

      // 3. JOGADOR DA PELADA (Pelada no Campinho de Várzea com Bola Rolando)
      if (npc.role === 'Jogador da Pelada') {
        if (this.arch && this.arch.soccerBall) {
          const ball = this.arch.soccerBall;

          // Goal celebration if goal was recently scored
          if (this.arch.soccerGoalCooldown > 1.2) {
            const baseGroundY = this.terrain ? this.terrain.getElevation(npc.group.position.x, npc.group.position.z) : 3.7;
            npc.group.position.y = baseGroundY + Math.abs(Math.sin(time * 16 + npc.walkCycle)) * 0.4;
            npc.currentAction = `🎉 Comemorando o golaço no campinho pelo time ${npc.team === 'yellow' ? 'Amarelo' : 'Azul'}!`;
            return;
          }

          if (npc.kickTimer > 0) {
            npc.kickTimer -= delta;
          }

          const distToBall = Math.hypot(ball.position.x - npc.group.position.x, ball.position.z - npc.group.position.z);

          // Dynamic Kicking (Reach expanded to 1.95m so players never get stuck outside kick distance)
          if (distToBall < 1.95 && npc.kickTimer <= 0) {
            npc.kickTimer = 0.65 + Math.random() * 0.45;

            // Yellow attacks toward East goal (x = 65), Blue attacks toward West goal (x = 45)
            const targetGoalX = (npc.team === 'yellow') ? 65.0 : 45.0;
            const targetGoalZ = 4.0 + (Math.random() - 0.5) * 3.6;

            let kx = targetGoalX - ball.position.x;
            let kz = targetGoalZ - ball.position.z;
            const kLen = Math.hypot(kx, kz) || 1;
            kx /= kLen;
            kz /= kLen;

            // Punchy kick with variable force
            const kickForce = 7.5 + Math.random() * 4.2;
            this.arch.kickSoccerBall(kx, kz, kickForce);

            // Animate kick swing
            npc.rightLeg.rotation.x = -1.25;
            npc.currentAction = `⚽ Chute a gol do time ${npc.team === 'yellow' ? 'Amarelo Canário' : 'Azul Guanabara'}!`;
          } else {
            if (npc.kickTimer > 0) {
              // Post-kick jockey / repositioning: face ball and take slight backsteps to open space
              const faceAngle = Math.atan2(ball.position.x - npc.group.position.x, ball.position.z - npc.group.position.z);
              npc.group.rotation.y = faceAngle;
              const backX = -Math.sin(faceAngle);
              const backZ = -Math.cos(faceAngle);
              npc.group.position.x += backX * 1.1 * delta;
              npc.group.position.z += backZ * 1.1 * delta;
              npc.currentAction = `⚽ Marcando posição após o passe (${npc.team === 'yellow' ? 'Amarelo' : 'Azul'})`;
            } else {
              // Run aggressively towards the ball!
              // Approach with slight tactical offset behind ball relative to attacking direction
              const attackOffsetX = (npc.team === 'yellow') ? -0.35 : 0.35;
              const lateralOffset = (npc.id.endsWith('1') || npc.id.endsWith('3')) ? 0.35 : -0.35;
              const tx = ball.position.x + attackOffsetX;
              const tz = Math.max(-1.5, Math.min(9.5, ball.position.z + lateralOffset));

              const dx = tx - npc.group.position.x;
              const dz = tz - npc.group.position.z;
              const d = Math.hypot(dx, dz);

              if (d > 0.05) {
                const nx = dx / d;
                const nz = dz / d;
                npc.group.position.x += nx * 3.4 * delta;
                npc.group.position.z += nz * 3.4 * delta;
                npc.group.rotation.y = Math.atan2(nx, nz);

                npc.walkCycle += delta * 14;
                const swing = Math.sin(npc.walkCycle) * 0.70;
                npc.leftLeg.rotation.x = swing;
                npc.rightLeg.rotation.x = -swing;
              }
              npc.currentAction = `⚽ Disputando a bola no campinho pelo time ${npc.team === 'yellow' ? 'Amarelo' : 'Azul'}`;
            }

            // Keep players strictly bounded inside pitch field limits
            npc.group.position.x = Math.max(45.5, Math.min(64.5, npc.group.position.x));
            npc.group.position.z = Math.max(-1.8, Math.min(9.8, npc.group.position.z));
          }
          return;
        }
      }

      // 4. RODA DE SAMBA NA PRAÇA CENTRAL (Noites Cariocas & Pôr do Sol Festivo!)
      const curTime = this.env ? this.env.getTimeOfDay() : 'day';
      const curPhase = (typeof curTime === 'string') ? curTime : (curTime.phase || 'day');
      const isNightOrSunset = (curPhase === 'night' || curPhase === 'sunset');

      if (isNightOrSunset && npc.sambaState && npc.sambaState.isParticipant && !npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && !npc.isScenicMirante && !npc.isFisherman && !npc.isAthlete && !npc.isMateiro && !npc.isCapoeira && !npc.isHorta && !npc.isMototaxi && !npc.isSurfer && !npc.isCalistenia && npc.role !== 'Jogador da Pelada') {
        const slot = npc.sambaState.slotIndex;
        // Primeiros 10 sentam (bancos). Próximos 14 ficam de pé.
        const isInner = slot < 10;
        const radius = isInner ? 4.5 : 6.5 + (slot % 2) * 1.2;
        const angle = isInner ? ((slot / 10) * Math.PI * 2) : ((slot / 14) * Math.PI * 2 + Math.PI/10);
        const plazaX = -2.0 + Math.cos(angle) * radius;
        const plazaZ = -4.0 + Math.sin(angle) * radius;
        const plazaY = this.getFloorElevation(-2.0, -4.0);

        // Roteamento em Grafo Viário até o Terreiro de Samba
        const distToSlot = Math.hypot(plazaX - npc.group.position.x, plazaZ - npc.group.position.z);

        if (distToSlot > 1.2) {
          if (!npc.sambaRoutingActive) {
            npc.sambaRoutingActive = true;
            const curId = npc.currentNodeId || (this.getNearestRoadNode(npc.group.position.x, npc.group.position.z) ? this.getNearestRoadNode(npc.group.position.x, npc.group.position.z).id : 'alameda_crossroads');
            const path = this.findRoadPath(curId, 'sol_plaza_center');
            npc.pathQueue = path.slice(1);
            if (npc.pathQueue.length > 0) {
              npc.targetNodeId = npc.pathQueue.shift();
              const nxt = this.roadNodesMap.get(npc.targetNodeId);
              if (nxt) npc.targetPos = nxt.position.clone();
            } else {
              npc.targetPos = new THREE.Vector3(plazaX, plazaY, plazaZ);
            }
          }

          const dToTarget = Math.hypot(npc.targetPos.x - npc.group.position.x, npc.targetPos.z - npc.group.position.z);
          if (dToTarget < 1.2) {
            if (npc.pathQueue && npc.pathQueue.length > 0) {
              npc.currentNodeId = npc.targetNodeId;
              npc.targetNodeId = npc.pathQueue.shift();
              const nxt = this.roadNodesMap.get(npc.targetNodeId);
              if (nxt) npc.targetPos = nxt.position.clone();
            } else {
              npc.targetPos.set(plazaX, plazaY, plazaZ);
            }
          }

          const dirX = npc.targetPos.x - npc.group.position.x;
          const dirZ = npc.targetPos.z - npc.group.position.z;
          const norm = Math.hypot(dirX, dirZ) || 1;
          const sambaSpeed = 2.8;
          npc.group.position.x += (dirX / norm) * sambaSpeed * delta;
          npc.group.position.z += (dirZ / norm) * sambaSpeed * delta;
          npc.group.rotation.y = Math.atan2(dirX, dirZ);

          npc.walkCycle += delta * 12;
          const swing = Math.sin(npc.walkCycle) * 0.55;
          if (npc.leftLeg) npc.leftLeg.rotation.x = swing;
          if (npc.rightLeg) npc.rightLeg.rotation.x = -swing;
          if (npc.leftArm) npc.leftArm.rotation.x = -swing * 0.65;
          if (npc.rightArm) npc.rightArm.rotation.x = swing * 0.65;
          npc.currentAction = (npc.currentNodeId && npc.currentNodeId.startsWith('alameda'))
            ? 'Descendo a Alameda do Samba em direção à festa'
            : 'Subindo as ruas do morro a caminho da roda de samba';
        } else {
          npc.sambaState.isActive = true;
          // Face the campfire center (-2, -4)
          const toFireX = -2.0 - npc.group.position.x;
          const toFireZ = -4.0 - npc.group.position.z;
          npc.group.rotation.y = Math.atan2(toFireX, toFireZ);

          // Rhythmic samba bounce & dance
          const bounce = Math.abs(Math.sin(time * 8.2 + slot)) * 0.22;
          
          if (isInner) {
            // Sentado tocando pandeiro/cavaco no banco
            npc.group.position.y = plazaY + 0.28;
            if (npc.torso) {
              npc.torso.rotation.x = Math.sin(time * 5.5) * 0.14;
              npc.torso.rotation.y = Math.sin(time * 3.8) * 0.18;
            }
            if (npc.leftArm) npc.leftArm.rotation.x = -0.40 - Math.sin(time * 8.2) * 0.40;
            if (npc.rightArm) npc.rightArm.rotation.x = 0.38 + Math.sin(time * 8.2) * 0.40;
            if (npc.head) npc.head.rotation.x = Math.sin(time * 4.0) * 0.12;
            npc.currentAction = '🎶 Tocando e cantando na roda de samba ao redor da fogueira';
          } else {
            // De pé dançando (Ginga carioca e Bounce)
            npc.group.position.y = plazaY + bounce;
            if (npc.torso) {
              npc.torso.rotation.x = Math.sin(time * 3 + slot) * 0.12;
              npc.torso.rotation.y = Math.sin(time * 4 + slot) * 0.25;
            }
            if (npc.leftLeg) npc.leftLeg.rotation.x = Math.sin(time * 8.2 + slot) * 0.32;
            if (npc.rightLeg) npc.rightLeg.rotation.x = -Math.sin(time * 8.2 + slot) * 0.32;
            if (npc.leftArm) npc.leftArm.rotation.x = 0.40 + Math.sin(time * 8.2 + slot) * 0.45;
            if (npc.rightArm) npc.rightArm.rotation.x = -0.40 - Math.sin(time * 8.2 + slot) * 0.45;
            if (npc.head) npc.head.rotation.y = Math.sin(time * 2.5 + slot) * 0.18;
            npc.currentAction = '💃 Sambando e batendo palmas em volta da praça iluminada';
          }

          if (Math.random() < 0.18) {
            this.spawnSambaSpark({ x: -2.0, y: plazaY + 0.8, z: -4.0 });
          }
        }
        return;
      } else if (!isNightOrSunset && npc.sambaState && (npc.sambaState.isActive || npc.sambaRoutingActive)) {
        npc.sambaState.isActive = false;
        npc.sambaRoutingActive = false; // Permite reagendamento e rota limpa para a próxima noite
        npc.sambaStairStep = undefined;
        npc.currentAction = npc.originalAction || 'Caminhando pelas ruas pavimentadas da comunidade';
      }

      // Limpeza de estado de conversa ao amanhecer
      if (!isNightOrSunset && npc.chatPartner) {
        npc.chatPartner = null;
        npc.chatTimer = 0;
      }

      // 4b. VIDA NOTURNA NAS RUAS & ENCONTROS NA CALÇADA
      // Moradores que não estão no samba se encontram na frente de casas/postes para bater papo breve!
      if (isNightOrSunset && !npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && !npc.isScenicMirante && !npc.isFisherman && !npc.isAthlete && !npc.isMateiro && !npc.isCapoeira && !npc.isHorta && !npc.isMototaxi && !npc.isSurfer && !npc.isCalistenia && (!npc.sambaState || !npc.sambaState.isParticipant) && npc.role !== 'Jogador da Pelada') {
        // Se já estiver em conversa ativa com um vizinho:
        if (npc.chatPartner) {
          const partner = npc.chatPartner;
          if (!partner || !partner.group) {
            npc.chatPartner = null;
            return;
          }

          const partnerName = partner.citizenName || 'vizinho';
          const npcName = npc.citizenName || 'morador';
          npc.chatTimer = (npc.chatTimer || 0) + delta;

          // Ambos olham um para o outro
          const dx = partner.group.position.x - npc.group.position.x;
          const dz = partner.group.position.z - npc.group.position.z;
          npc.group.rotation.y = Math.atan2(dx, dz);

          // Pés firmes e alinhados
          if (npc.leftLeg) npc.leftLeg.rotation.x = 0;
          if (npc.rightLeg) npc.rightLeg.rotation.x = 0;

          // Animação de conversa brasileira com gesticulação viva e cabeça acenando
          const animOffset = (npc.citizenName ? npc.citizenName.length : 1);
          if (npc.torso) npc.torso.rotation.y = Math.sin(time * 3.0 + animOffset) * 0.14;
          if (npc.leftArm) npc.leftArm.rotation.x = -0.35 + Math.sin(time * 2.8 + animOffset) * 0.28;
          if (npc.rightArm) npc.rightArm.rotation.x = 0.25 - Math.cos(time * 2.5 + animOffset) * 0.22;
          if (npc.head) npc.head.rotation.x = Math.sin(time * 3.5 + animOffset) * 0.12;

          // Conversa breve e expressiva de 3.5s - NUNCA congela ou empaca pedestres na calçada!
          if (npc.chatTimer > 3.5 || Math.hypot(dx, dz) > 2.6) {
            npc.currentAction = `Despedindo-se de ${partnerName} e seguindo caminho`;
            partner.currentAction = `Despedindo-se de ${npcName} e seguindo caminho`;
            npc.chatPartner = null;
            partner.chatPartner = null;
            npc.chatTimer = 0;
            npc.chatCooldown = 50.0;
            partner.chatCooldown = 50.0;
          }
          return;
        }

        // Tenta iniciar uma conversa espontânea com algum vizinho próximo na rua (raro e fluido)
        npc.chatCooldown = (npc.chatCooldown || 0) - delta;
        if (npc.chatCooldown <= 0 && (!npc.pathQueue || npc.pathQueue.length === 0) && Math.random() < 0.003) {
          const randomIdx = Math.floor(Math.random() * this.npcs.length);
          const other = this.npcs[randomIdx];
          if (
            other &&
            other !== npc &&
            !other.chatPartner &&
            !other.isBuilder &&
            !other.isCourier &&
            !other.isBarraqueiro &&
            !other.isScenicMirante &&
            (!other.pathQueue || other.pathQueue.length === 0) &&
            (!other.sambaState || !other.sambaState.isParticipant) &&
            other.role !== 'Jogador da Pelada' &&
            Math.abs(other.group.position.x - npc.group.position.x) < 2.2 &&
            Math.abs(other.group.position.z - npc.group.position.z) < 2.2
          ) {
            npc.chatPartner = other;
            other.chatPartner = npc;
            npc.chatTimer = 0;
            other.chatTimer = 0;
            npc.currentAction = `Cumprimentando ${other.citizenName} na calçada`;
            other.currentAction = `Batendo papo rápido com ${npc.citizenName}`;
            return;
          }
        }
      }

      // 4. SPECIALIZED BUILDER BEHAVIOR STATE MACHINE
      if (npc.isBuilder) {
        // Encerramento estrito de expediente noturno:
        // Ao anoitecer, libera o operário IMEDIATAMENTE de volta à vida civil da comunidade!
        const timeInfo = this.arch && this.arch.env ? this.arch.env.getTimeOfDay() : 'day';
        const phase = (typeof timeInfo === 'string') ? timeInfo : (timeInfo.phase || 'day');
        const isWorkHours = (phase === 'day' || phase === 'sunset');
        if (!isWorkHours) {
          this.releaseWorker(npc);
          return;
        }

        // Watchdog autônomo de encerramento de obra:
        // Verifica se a obra atribuída ainda existe em activeConstructions ou activeUpgrades
        const assignedSite = npc.assignedSite;
        let siteStillActive = false;
        if (assignedSite && this.arch) {
          if (this.arch.activeConstructions && this.arch.activeConstructions.some(c => c === assignedSite || (c.plateau && assignedSite.plateau && c.plateau.id === assignedSite.plateau.id))) {
            siteStillActive = true;
          } else if (this.arch.activeUpgrades && this.arch.activeUpgrades.some(u => u === assignedSite || u.id === assignedSite.id || (u.house && assignedSite.house && u.house.id === assignedSite.house.id))) {
            siteStillActive = true;
          }
        }

        // Se a obra foi entregue/removida ou não está mais ativa, comemora e libera o cidadão de volta às ruas!
        if (!siteStillActive) {
          if (npc.builderState !== 'celebrating') {
            npc.builderState = 'celebrating';
            npc.cheerTimer = 2.5;
            npc.currentAction = '🎉 Finalizando os últimos detalhes e celebrando a entrega da obra com a comunidade!';
          }
        }

        if (npc.builderState === 'traveling') {
          // Deslocamento estrito por vias pavimentadas até o canteiro de obras
          const target = npc.targetPos || npc.workerSpot;
          const dirX = target.x - npc.group.position.x;
          const dirZ = target.z - npc.group.position.z;
          const dist = Math.hypot(dirX, dirZ);

          // Checa se atingiu o nó intermediário do trajeto viário
          if (npc.builderPathQueue && npc.builderPathQueue.length > 0) {
            if (dist < 1.2) {
              npc.builderTargetNodeId = npc.builderPathQueue.shift();
              const nxt = this.roadNodesMap.get(npc.builderTargetNodeId);
              if (nxt) {
                npc.targetPos = nxt.position.clone();
              } else {
                npc.targetPos = npc.workerSpot.clone();
              }
            }
          } else if (npc.workerSpot) {
            // Fim da malha viária: caminha da última esquina até o workerSpot perimetral do lote
            npc.targetPos = npc.workerSpot;
            const distToSpot = Math.hypot(
              npc.workerSpot.x - npc.group.position.x,
              npc.workerSpot.z - npc.group.position.z
            );

            if (distToSpot < 1.3) {
              // Chegou fisicamente ao canteiro de obras!
              npc.builderState = 'working';
              npc.currentAction = 'Modelando o terreno e assentando vigas e fiadas';
              npc.leftLeg.rotation.x = 0;
              npc.rightLeg.rotation.x = 0;

              // Vira o corpo em direção ao centro da construção
              if (npc.assignedSite && npc.assignedSite.plateau) {
                const toCenterX = npc.assignedSite.plateau.x - npc.group.position.x;
                const toCenterZ = npc.assignedSite.plateau.z - npc.group.position.z;
                npc.group.rotation.y = Math.atan2(toCenterX, toCenterZ);
              }
              return;
            }
          }

          // Movimento em direção ao ponto-alvo atual
          if (dist > 0.05) {
            const normX = dirX / dist;
            const normZ = dirZ / dist;
            const moveStep = Math.min(dist, npc.speed * delta);
            npc.group.position.x += normX * moveStep;
            npc.group.position.z += normZ * moveStep;

            const angle = Math.atan2(normX, normZ);
            npc.group.rotation.y = angle;

            npc.walkCycle += delta * 9;
            const swing = Math.sin(npc.walkCycle) * 0.58;
            npc.leftLeg.rotation.x = swing;
            npc.rightLeg.rotation.x = -swing;
          }
          return;
        }

        if (npc.builderState === 'working') {
          // Checa horário de obras: dia e pôr do sol trabalham, noite e alvorecer descansam em silêncio
          const timeInfo = this.arch && this.arch.env ? this.arch.env.getTimeOfDay() : 'day';
          const phase = (typeof timeInfo === 'string') ? timeInfo : (timeInfo.phase || 'day');
          const isWorkHours = (phase === 'day' || phase === 'sunset');

          npc.leftLeg.rotation.x = 0;
          npc.rightLeg.rotation.x = 0;

          if (!isWorkHours) {
            this.releaseWorker(npc);
            return;
          }

          // Expediente diurno: atividade ativa de assentamento
          const swingCycle = Math.sin(time * 9 + npc.walkCycle);
          npc.toolArm.rotation.x = swingCycle * 0.85;
          npc.toolArm.rotation.z = Math.sin(time * 4.5) * 0.15;
          npc.torso.rotation.x = Math.max(0, swingCycle * 0.15);
          npc.currentAction = 'Modelando o terreno e assentando vigas e fiadas';
          return;
        }

        if (npc.builderState === 'celebrating') {
          // Celebratory jumping and cheering with arms raised!
          npc.cheerTimer -= delta;
          const baseGroundY = this.terrain ? this.terrain.getElevation(npc.group.position.x, npc.group.position.z) : 0;
          npc.group.position.y = baseGroundY + Math.abs(Math.sin(time * 14 + npc.walkCycle)) * 0.45;

          npc.toolArm.rotation.x = -Math.PI * 0.75 + Math.sin(time * 8) * 0.25;
          npc.torso.rotation.x = -0.1;
          if (!npc.currentAction || !npc.currentAction.startsWith('🎉')) {
            npc.currentAction = '🎉 Comemorando a entrega da nova casa com a comunidade!';
          }

          if (npc.cheerTimer <= 0) {
            this.releaseWorker(npc);
          }
          return;
        }
      }

      // Dynamic Beach Outfit Transition:
      // When stepping onto the sand (Z >= 22), citizens wear swimwear, shades & sun visors!
      // When returning to the morro (Z < 20), they switch back to street clothes.
      if (npc.group.position.z >= 22.0) {
        this.setNPCBeachOutfit(npc, true);
      } else if (npc.group.position.z < 20.0) {
        this.setNPCBeachOutfit(npc, false);
      }

      // 3. Pause/idle timer at waypoints (Civilian routine)
      if (npc.waitTimer > 0) {
        npc.waitTimer -= delta;
        npc.leftLeg.rotation.x = 0;
        npc.rightLeg.rotation.x = 0;
        return;
      }

      // 4. Ciclo Autônomo de Praia (Beach Trip) com Deslocamento Estrito por Ruas
      const beachStalls = [
        { x: -40, z: 46.5, action: 'Comprando água de coco fresca na barraca do Seu Baiano' },
        { x: -10, z: 46.5, action: 'Pedindo mate gelado com biscoito Globo na barraca do Leandro' },
        { x: 20, z: 46.5, action: 'Saboreando tigela de açaí geladinho com banana na barraca do Marcos' },
        { x: 50, z: 46.5, action: 'Pegando pasteis quentinhos de camarão na barraca da Dona Cida' },
        { x: 116, z: 34.0, action: 'Tomando água de coco gelada no Quiosque do Sol Nascente' }
      ];

      const beachLeisureSpots = [
        { x: 38, z: 59, action: 'Assistindo à empolgante partida de altinha na areia' },
        { x: -25, z: 56, action: 'Caminhando pela areia fofa sentindo o vento marítimo' },
        { x: 12, z: 66, action: 'Molhando os pés na beira da maré e sentindo a espuma' },
        { x: -50, z: 50, action: 'Relaxando na cadeira de praia sob o guarda-sol' },
        { x: 42, z: 49, action: 'Curtindo o visual do mar sob os guarda-sóis coloridos' },
        { x: -15, z: 65, action: 'Caminhando na beira d\'água apreciando as ondas' },
        { x: -92, z: 52, action: 'Apreciando as canoas caiçaras e a calmaria da prainha oeste' },
        { x: -115, z: 46, action: 'Caminhando entre as redes de pesca estendidas na areia da prainha' },
        { x: -78, z: 82, action: 'Passeando pelas tábuas do píer sentindo a brisa do oceano' },
        { x: 78, z: 46, action: 'Assistindo à partida disputada de futevôlei na quadra leste' },
        { x: 98, z: 48, action: 'Torcendo pela dupla na quadra de vôlei de praia' },
        { x: 88, z: 56, action: 'Descansando na canga colorida estendida sob o sol' },
        { x: 132, z: 46, action: 'Relaxando à sombra do coqueiral nas dunas do nascente' }
      ];

      const dirX = npc.targetPos.x - npc.group.position.x;
      const dirZ = npc.targetPos.z - npc.group.position.z;
      const dist = Math.hypot(dirX, dirZ);

      if (npc.beachTrip && !npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && !npc.isScenicMirante && !npc.isFisherman && !npc.isAthlete && !npc.isMateiro && !npc.isCapoeira && !npc.isHorta && !npc.isMototaxi && !npc.isSurfer && !npc.isCalistenia && npc.role !== 'Jogador da Pelada') {
        if (npc.beachTrip.state === 'going_to_beach') {
          if (dist < 1.3) {
            if (npc.pathQueue && npc.pathQueue.length > 0) {
              npc.currentNodeId = npc.targetNodeId;
              npc.targetNodeId = npc.pathQueue.shift();
              const nxt = this.roadNodesMap.get(npc.targetNodeId);
              if (nxt) npc.targetPos = nxt.position.clone();
            } else {
              // Atingiu o calçadão na entrada da praia! Transiciona para areia
              npc.beachTrip.state = 'at_beach';
              npc.beachTrip.beachTimer = 25.0 + Math.random() * 30.0;
              this.setNPCBeachOutfit(npc, true);

              const firstStall = beachStalls[Math.floor(Math.random() * beachStalls.length)];
              const nx = firstStall.x + (Math.random() - 0.5) * 2.0;
              const nz = firstStall.z + (Math.random() - 0.5) * 2.0;
              const ny = this.terrain ? this.terrain.getElevation(nx, nz) : 0.4;
              npc.targetPos = new THREE.Vector3(nx, ny, nz);
              npc.currentAction = firstStall.action;
              npc.waitTimer = 2.0;
              return;
            }
          }
        } else if (npc.beachTrip.state === 'at_beach') {
          npc.beachTrip.beachTimer -= delta;

          if (dist < 1.4) {
            if (!npc.beachTrip.hasPurchased && npc.group.position.z >= 42 && npc.group.position.z <= 50) {
              npc.beachTrip.hasPurchased = true;
              if (this.simulation && this.simulation.addEconomy) {
                this.simulation.addEconomy(5, 'Comércio na orla da praia');
              }
              // Encontra barraca mais próxima para o efeito temático
              let nearestStall = 'coco';
              let minDist = 999;
              beachStalls.forEach(st => {
                const d = Math.hypot(st.x - npc.group.position.x, st.z - npc.group.position.z);
                if (d < minDist) { minDist = d; nearestStall = st.id; }
              });
              if (this.arch && this.arch.spawnBeachStallParticles) {
                this.arch.spawnBeachStallParticles(nearestStall, npc.group.position);
              }
              if (this.soundtrack && this.soundtrack.playBeachCommerceSound) {
                this.soundtrack.playBeachCommerceSound(npc.group.position);
              }
            }

            npc.waitTimer = 3.0 + Math.random() * 4.0;

            if (npc.beachTrip.beachTimer > 8.0) {
              const nextSpot = Math.random() < 0.5 
                ? beachStalls[Math.floor(Math.random() * beachStalls.length)]
                : beachLeisureSpots[Math.floor(Math.random() * beachLeisureSpots.length)];
              const nx = nextSpot.x + (Math.random() - 0.5) * 2.5;
              const nz = Math.min(68, Math.max(30, nextSpot.z + (Math.random() - 0.5) * 2.5));
              const ny = this.terrain ? this.terrain.getElevation(nx, nz) : 0.4;
              npc.targetPos = new THREE.Vector3(nx, ny, nz);
              npc.currentAction = nextSpot.action;
            }
          }

          if (npc.beachTrip.beachTimer <= 0) {
            // Retorno da praia pelas ruas pavimentadas (Prainha ou Várzea)
            const chosenExitId = (npc.group.position.x < -50) ? 'coast_w_2' : (npc.group.position.x < 30 ? 'coast_w_3' : 'coast_e_2');
            const hillDestinations = ['spine_1', 'mid_w_3', 'mid_e_3', 'transv_w_2', 'transv_e_2', 'viela_w_2', 'viela_e_2'];
            const targetHillId = hillDestinations[Math.floor(Math.random() * hillDestinations.length)];
            const path = this.findRoadPath(chosenExitId, targetHillId);
            npc.beachTrip.state = 'returning';
            npc.pathQueue = path;
            npc.targetNodeId = npc.pathQueue.shift();
            const nxt = this.roadNodesMap.get(npc.targetNodeId);
            if (nxt) npc.targetPos = nxt.position.clone();
            npc.currentAction = 'Subindo as ruas do morro de volta para a comunidade';
          }
        } else if (npc.beachTrip.state === 'returning') {
          if (dist < 1.3) {
            if (npc.pathQueue && npc.pathQueue.length > 0) {
              npc.currentNodeId = npc.targetNodeId;
              npc.targetNodeId = npc.pathQueue.shift();
              const nxt = this.roadNodesMap.get(npc.targetNodeId);
              if (nxt) npc.targetPos = nxt.position.clone();
            } else {
              npc.beachTrip.state = 'idle';
              npc.beachTrip.hasPurchased = false;
              this.setNPCBeachOutfit(npc, false);
              npc.currentAction = 'Voltando para os afazeres no morro após um dia de praia';
              npc.waitTimer = 1.5;
            }
          }
        }
      }

      // Navegação Ordinária Guiada por Grafo Viário (Arestas Estritas de Ruas)
      if (dist < 1.2 && (!npc.beachTrip || npc.beachTrip.state === 'idle')) {
        // Se estiver em rota direta por fila de nós, não pausa a cada metro; pausas só ocorrem esporadicamente
        npc.waitTimer = (npc.pathQueue && npc.pathQueue.length > 0) ? 0 : (Math.random() < 0.20 ? (0.6 + Math.random() * 0.8) : 0);

        // Oportunidade Orgânica e Esporádica de Sentar (Chance 5% em cadeiras de boteco ou bancos da Alameda)
        if (!npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && !npc.isScenicMirante && !npc.isFisherman && !npc.isAthlete && !npc.isMateiro && !npc.isCapoeira && !npc.isHorta && !npc.isMototaxi && !npc.isSurfer && !npc.isCalistenia && npc.role !== 'Jogador da Pelada' && Math.random() < 0.05) {
          let candidateSpot = null;
          if (this.arch && this.arch.botecoSpots) {
            candidateSpot = this.arch.botecoSpots.find(s => !s.isOccupied && Math.hypot(s.x - npc.group.position.x, s.z - npc.group.position.z) < 3.2);
          }
          if (!candidateSpot && this.arch && this.arch.alamedaBenches) {
            candidateSpot = this.arch.alamedaBenches.find(s => !s.isOccupied && Math.hypot(s.x - npc.group.position.x, s.z - npc.group.position.z) < 3.5);
          }
          if (candidateSpot) {
            candidateSpot.isOccupied = true;
            npc.isSitting = true;
            npc.sittingSpot = candidateSpot;
            npc.sittingTimer = 12.0 + Math.random() * 8.0;
            npc.group.position.set(candidateSpot.x, candidateSpot.y + 0.05, candidateSpot.z);
            npc.group.rotation.y = (candidateSpot.rotY !== undefined ? candidateSpot.rotY : candidateSpot.rot) || 0;
            npc.currentAction = candidateSpot.botecoName
              ? `🥤 Tomando um guaraná gelado no ${candidateSpot.botecoName}`
              : '🌳 Descansando no banco da Alameda sob os pergolados floridos';
            return;
          }
        }

        // Desejo autônomo de ir à praia
        if (npc.beachTrip && !npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && !npc.isScenicMirante && !npc.isFisherman && !npc.isAthlete && !npc.isMateiro && !npc.isCapoeira && !npc.isHorta && !npc.isMototaxi && !npc.isSurfer && !npc.isCalistenia && npc.role !== 'Jogador da Pelada') {
          const nearCoast = (npc.group.position.z >= 12.0);
          const rollBeach = nearCoast ? (Math.random() < 0.28) : (Math.random() < 0.05);

          if (rollBeach) {
            const curId = npc.currentNodeId || (this.getNearestRoadNode(npc.group.position.x, npc.group.position.z) ? this.getNearestRoadNode(npc.group.position.x, npc.group.position.z).id : 'coast_w_3');
            // Cidadãos no alto usam rotas seguras de encosta (Prainha a oeste ou Várzea a leste)
            const chosenEntranceId = (npc.group.position.x < -50) ? 'coast_w_2' : (npc.group.position.x < 30 ? 'coast_w_3' : 'coast_e_2');
            const path = this.findRoadPath(curId, chosenEntranceId);
            npc.beachTrip.state = 'going_to_beach';
            npc.pathQueue = path.slice(1);
            if (npc.pathQueue.length > 0) {
              npc.targetNodeId = npc.pathQueue.shift();
              const nxt = this.roadNodesMap.get(npc.targetNodeId);
              if (nxt) npc.targetPos = nxt.position.clone();
            }
            npc.currentAction = 'Descendo pelas ruas urbanas em direção à praia';
            return;
          }
        }

        // Atualiza nó atual e escolhe próximo vizinho conectado
        if (npc.targetNodeId) {
          npc.currentNodeId = npc.targetNodeId;
        } else {
          npc.currentNodeId = (this.getNearestRoadNode(npc.group.position.x, npc.group.position.z) ? this.getNearestRoadNode(npc.group.position.x, npc.group.position.z).id : 'alameda_crossroads');
        }
        const currNode = (this.roadNodesMap && this.roadNodesMap.get(npc.currentNodeId)) || (this.roadNodes ? this.roadNodes[0] : null);

        if (npc.pathQueue && npc.pathQueue.length > 0) {
          npc.targetNodeId = npc.pathQueue.shift();
        } else if (currNode && currNode.neighbors && currNode.neighbors.length > 0) {
          const nonBacktrack = currNode.neighbors.filter(nid => nid !== npc.lastNodeId);
          const pool = (nonBacktrack.length > 0) ? nonBacktrack : currNode.neighbors;
          npc.lastNodeId = npc.currentNodeId;
          npc.targetNodeId = pool[Math.floor(Math.random() * pool.length)];
        } else {
          npc.targetNodeId = npc.currentNodeId;
        }

        const targetNode = (this.roadNodesMap && this.roadNodesMap.get(npc.targetNodeId)) || currNode;
        if (targetNode) {
          const nextWp = targetNode.position.clone();
          if (npc.role !== 'Jogador da Pelada') {
            nextWp.x += (Math.random() - 0.5) * 0.35;
            nextWp.z += (Math.random() - 0.5) * 0.35;
          }
          nextWp.y = this.getFloorElevation(nextWp.x, nextWp.z);
          npc.targetPos = nextWp;

          // Descrições contextuais vivas
          if (targetNode.id.startsWith('alameda')) {
            npc.currentAction = 'Caminhando pela Alameda do Samba sob os pergolados floridos';
          } else if (targetNode.id === 'sol_mirante') {
            npc.waitTimer = 4.0 + Math.random() * 4.0;
            npc.group.rotation.y = 0.0;
            npc.currentAction = 'Apreciando a vista panorâmica do oceano no Mirante Sul da Praça';
          } else if (targetNode.id === 'sol_plaza_center') {
            npc.currentAction = 'Cruzando o tablado central da Praça do Samba';
          } else if (targetNode.id.startsWith('coast')) {
            npc.currentAction = 'Caminhando pelo calçadão litorâneo sentindo a brisa';
          } else if (targetNode.id.startsWith('varzea')) {
            npc.currentAction = 'Passeando pelas ruas da Várzea próximo ao futebol';
          } else if (targetNode.id.startsWith('viela_w') || targetNode.id.startsWith('mid_w')) {
            npc.currentAction = 'Subindo as vielas e escadarias da encosta do Poente';
          } else if (targetNode.id.startsWith('viela_e') || targetNode.id.startsWith('mid_e')) {
            npc.currentAction = 'Caminhando pelas ladeiras da encosta do Levante';
          } else if (targetNode.id.startsWith('mirante_imp')) {
            npc.waitTimer = 5.0 + Math.random() * 4.0;
            npc.currentAction = 'Contemplando a paisagem espetacular no Mirante da Vista Imperial';
          } else {
            npc.currentAction = 'Caminhando pelas ruas pavimentadas da comunidade';
          }
        }
      } else if (dist >= 1.2) {
        const normX = dirX / dist;
        const normZ = dirZ / dist;

        const moveStep = Math.min(dist, npc.speed * delta);
        npc.group.position.x += normX * moveStep;
        npc.group.position.z += normZ * moveStep;

        const angle = Math.atan2(normX, normZ);
        npc.group.rotation.y = angle;

        npc.walkCycle += delta * (7.5 * (npc.speedMult || 1.0));
        const swing = Math.sin(npc.walkCycle) * 0.55;
        if (npc.leftLeg) npc.leftLeg.rotation.x = swing;
        if (npc.rightLeg) npc.rightLeg.rotation.x = -swing;
        
        // Aceno e gestos comunitários orgânicos
        if (npc.greetingTimer > 0) {
          npc.greetingTimer -= delta;
          if (npc.rightArm) npc.rightArm.rotation.x = -0.85 * Math.sin(npc.greetingTimer * Math.PI / 1.2);
          if (npc.leftArm) npc.leftArm.rotation.x = -swing * 0.45;
        } else {
          if (npc.leftArm) npc.leftArm.rotation.x = -swing * 0.65;
          if (npc.rightArm) npc.rightArm.rotation.x = swing * 0.65;
        }

        // Rotação orgânica do olhar da cabeça dos cidadãos
        if (npc.head) {
          npc.glanceTimer = (npc.glanceTimer || 3.0) - delta;
          if (npc.glanceTimer <= 0) {
            npc.glanceTimer = 2.5 + Math.random() * 4.5;
            npc.targetHeadRotY = (Math.random() - 0.5) * 0.45;
          }
          npc.head.rotation.y += ((npc.targetHeadRotY || 0) - npc.head.rotation.y) * delta * 2.5;
        }
      }

      // 4. REAL-TIME OBSTACLE AVOIDANCE & TANGENTIAL WALL SLIDING:
      // Pushes NPC away from house envelopes and glides tangentially around corners
      // Completely prevents NPCs from getting stuck against walls or walking through buildings!
      if (this.arch && this.arch.houses) {
        for (let h = 0; h < this.arch.houses.length; h++) {
          const house = this.arch.houses[h];
          const hx = house.position.x;
          const hz = house.position.z;
          const hy = house.position.y;
          const dx = npc.group.position.x - hx;
          if (Math.abs(dx) > 3.8) continue;
          const dz = npc.group.position.z - hz;
          if (Math.abs(dz) > 3.8) continue;
          const dy = npc.group.position.y - hy;
          // Cobre toda a altura da casa incluindo fundações e palafitas na encosta (-6.5m até +4.0m)
          if (dy > 4.0 || dy < -6.5) continue;

          const distSq = dx * dx + dz * dz;
          const minSafeDist = 2.45; // Raio seguro: impede 100% de entrar na parede ou passar sob palafitas

          if (distSq < minSafeDist * minSafeDist && distSq > 0.0001) {
            const distH = Math.sqrt(distSq);
            // 1. Radial push to perimeter
            const nx = dx / distH;
            const nz = dz / distH;
            npc.group.position.x = hx + nx * minSafeDist;
            npc.group.position.z = hz + nz * minSafeDist;

            // 2. Tangential wall glide around corners
            const tanX = -nz;
            const tanZ = nx;
            const targetDirX = npc.targetPos.x - npc.group.position.x;
            const targetDirZ = npc.targetPos.z - npc.group.position.z;
            const dot = targetDirX * tanX + targetDirZ * tanZ;
            const slideSign = dot >= 0 ? 1 : -1;

            const slideDist = (npc.speed || 1.8) * delta * 1.35;
            npc.group.position.x += tanX * slideSign * slideDist;
            npc.group.position.z += tanZ * slideSign * slideDist;
          }
        }
      }

      // 5. STUCK WATCHDOG SYSTEM:
      // Detects if an NPC has traveled < 0.42m in 2.2s. If stalled, immediately advances waypoint and evades!
      if (!npc.isBuilder && npc.role !== 'Jogador da Pelada') {
        npc.stuckCheckTimer = (npc.stuckCheckTimer || 0) + delta;
        if (npc.stuckCheckTimer >= 2.2) {
          npc.stuckCheckTimer = 0;
          if (npc.waitTimer <= 0 && npc.stuckLastPos) {
            const distTraveled = Math.hypot(
              npc.group.position.x - npc.stuckLastPos.x,
              npc.group.position.z - npc.stuckLastPos.z
            );
            if (distTraveled < 0.42) {
              // Preso em obstáculo: seleciona outro vizinho conectado no grafo viário
              const curId = npc.currentNodeId || (this.getNearestRoadNode(npc.group.position.x, npc.group.position.z) ? this.getNearestRoadNode(npc.group.position.x, npc.group.position.z).id : 'alameda_crossroads');
              const cNode = (this.roadNodesMap && this.roadNodesMap.get(curId)) || null;
              if (cNode && cNode.neighbors && cNode.neighbors.length > 0) {
                npc.targetNodeId = cNode.neighbors[Math.floor(Math.random() * cNode.neighbors.length)];
                const nxt = this.roadNodesMap.get(npc.targetNodeId);
                if (nxt) {
                  npc.targetPos = nxt.position.clone();
                  npc.targetPos.y = this.getFloorElevation(nxt.position.x, nxt.position.z);
                }
              }
              // Impulso sutil de desvio lateral
              npc.group.position.x += (Math.random() - 0.5) * 0.6;
              npc.group.position.z += (Math.random() - 0.5) * 0.6;
            }
          }
          if (!npc.stuckLastPos) npc.stuckLastPos = new THREE.Vector3();
          npc.stuckLastPos.copy(npc.group.position);
        }
      } else if (npc.isBuilder && npc.builderState === 'traveling') {
        npc.stuckCheckTimer = (npc.stuckCheckTimer || 0) + delta;
        if (npc.stuckCheckTimer >= 2.2) {
          npc.stuckCheckTimer = 0;
          if (npc.stuckLastPos) {
            const distTraveled = Math.hypot(
              npc.group.position.x - npc.stuckLastPos.x,
              npc.group.position.z - npc.stuckLastPos.z
            );
            if (distTraveled < 0.35) {
              // Construtor bloqueado: reposiciona suavemente no nó pavimentado mais próximo em vez de teletransporte aleatório
              const curY = npc.group.position.y || (this.terrain ? this.terrain.getElevation(npc.group.position.x, npc.group.position.z) : 0);
              const safeRoad = this.getNearestRoadNode(npc.group.position.x, npc.group.position.z, curY);
              if (safeRoad) {
                npc.group.position.set(safeRoad.x, safeRoad.y + 0.1, safeRoad.z);
              }
            }
          }
          if (!npc.stuckLastPos) npc.stuckLastPos = new THREE.Vector3();
          npc.stuckLastPos.copy(npc.group.position);
        }
      }

      // 6. SOCCER FIELD PERIMETER FENCE AVOIDANCE:
      // Non-players stay strictly outside the soccer pitch bounding box
      if (npc.role !== 'Jogador da Pelada') {
        const minX = 43.2;
        const maxX = 66.8;
        const minZ = -3.6;
        const maxZ = 11.6;
        const px = npc.group.position.x;
        const pz = npc.group.position.z;

        if (px > minX && px < maxX && pz > minZ && pz < maxZ) {
          const dLeft = px - minX;
          const dRight = maxX - px;
          const dTop = pz - minZ;
          const dBottom = maxZ - pz;
          const minD = Math.min(dLeft, dRight, dTop, dBottom);

          if (minD === dLeft) npc.group.position.x = minX;
          else if (minD === dRight) npc.group.position.x = maxX;
          else if (minD === dTop) npc.group.position.z = minZ;
          else npc.group.position.z = maxZ;
        }
      }
    });

    // Physics Spatial Separation: Otimizado com bounding check Manhattan rápido antes de Math.sqrt (60 FPS fluidos em 1x a 5x)
    const minDist = 0.84;
    const minDistSq = minDist * minDist;
    for (let i = 0; i < this.npcs.length; i++) {
      const n1 = this.npcs[i];
      if (n1.isSitting || n1.isScenicMirante) continue;
      const p1 = n1.group.position;
      for (let j = i + 1; j < this.npcs.length; j++) {
        const n2 = this.npcs[j];
        if (n2.isSitting || n2.isScenicMirante) continue;
        const p2 = n2.group.position;
        const dx = p2.x - p1.x;
        if (Math.abs(dx) > minDist) continue;
        const dz = p2.z - p1.z;
        if (Math.abs(dz) > minDist) continue;
        const dSq = dx * dx + dz * dz;
        if (dSq < minDistSq && dSq > 0.0001) {
          const d = Math.sqrt(dSq);
          const push = (minDist - d) * 0.5;
          const nx = dx / d;
          const nz = dz / d;
          p1.x -= nx * push;
          p1.z -= nz * push;
          p2.x += nx * push;
          p2.z += nz * push;

          // Cumprimento afetuoso esporádico entre vizinhos cruzando ladeiras
          if ((!n1.greetingTimer || n1.greetingTimer <= 0) && (!n2.greetingTimer || n2.greetingTimer <= 0) && Math.random() < 0.20) {
            n1.greetingTimer = 1.2;
            n2.greetingTimer = 1.2;
          }
        }
      }
    }

    // Update Samba campfire celebration sparks
    for (let s = this.sambaSparks.length - 1; s >= 0; s--) {
      const spk = this.sambaSparks[s];
      spk.life -= delta * 1.2;
      spk.mesh.position.addScaledVector(spk.vel, delta);
      if (spk.mesh.material) {
        spk.mesh.material.opacity = Math.max(0, spk.life * 0.7);
      }
      if (spk.life <= 0) {
        this.group.remove(spk.mesh);
        spk.mesh.geometry.dispose();
        spk.mesh.material.dispose();
        this.sambaSparks.splice(s, 1);
      }
    }

    // Samba soundscape & acoustic rhythm update
    this.updateSambaSoundscape(delta, time);
  }

  clearAll() {
    this.cleanKite();
    if (this.arch && this.arch.botecoSpots) {
      this.arch.botecoSpots.forEach(s => s.isOccupied = false);
    }
    if (this.arch && this.arch.alamedaBenches) {
      this.arch.alamedaBenches.forEach(b => b.isOccupied = false);
    }

    // Limpar moradores
    this.npcs.forEach(n => {
      this.group.remove(n.group);
      if (n.group.geometry) n.group.geometry.dispose();
      // Não damos dispose no material porque eles são compartilhados e genéricos (cores), mas as meshes sim
    });
    this.npcs = [];
    
    // Limpar fogueiras e faíscas
    this.sambaSparks.forEach(s => {
      this.group.remove(s.mesh);
      // Não damos dispose porque a geometria agora é compartilhada!
    });
    this.sambaSparks = [];
  }
}

Object.assign(NPCManager.prototype, RoadGraphMixin, PopulationMixin, WorkersMixin, KiteMixin, SambaMixin);
