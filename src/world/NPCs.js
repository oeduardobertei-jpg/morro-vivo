import * as THREE from 'three';
import { RoadGraphMixin } from './npcs/roadGraph.js';
import { PopulationMixin } from './npcs/population.js';
import { WorkersMixin } from './npcs/workers.js';
import { KiteMixin } from './npcs/kite.js';
import { SambaMixin } from './npcs/sambaSound.js';
import { EconomyBehaviors } from './npcs/economyBehaviors.js';
import { BeachBehaviorsMixin } from './npcs/beachBehaviors.js';

const TORSO_BASE_Y = 0.85;
const ARM_BASE_Y = 1.06;
const HEAD_BASE_Y = 1.37;

function dampLimb(current, target, lambda, delta) {
  return THREE.MathUtils.damp(current, target, lambda, delta);
}

function smoothAngle(current, target, lambda, delta) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1.0 - Math.exp(-lambda * delta));
}

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

  // Reserva exclusiva de vagas na Roda de Samba (10 bancos + 14 de pé): impede vários NPCs no mesmo assento
  _claimSambaSlot(npc) {
    if (!this._sambaSlots) this._sambaSlots = new Array(24).fill(null);
    const st = npc.sambaState;
    if (st._claimed !== undefined && this._sambaSlots[st._claimed] === npc) return st._claimed;
    // Limpa vagas de NPCs removidos do mundo
    for (let s = 0; s < 24; s++) {
      const o = this._sambaSlots[s];
      if (o && (!this.npcs.includes(o) || !o.group.parent)) this._sambaSlots[s] = null;
    }
    const free = this._sambaSlots.indexOf(null);
    if (free < 0) return -1;
    this._sambaSlots[free] = npc;
    st._claimed = free;
    st.slotIndex = free;
    npc.sambaRoutingActive = false;
    return free;
  }

  _releaseSambaSlot(npc) {
    const st = npc.sambaState;
    if (this._sambaSlots && st && st._claimed !== undefined && this._sambaSlots[st._claimed] === npc) {
      this._sambaSlots[st._claimed] = null;
    }
    if (st) st._claimed = undefined;
    if (npc.pandeiroItem) npc.pandeiroItem.visible = false;
    // Restaura postura de pé ao sair do banco
    if (npc.group) {
      npc.group.rotation.x = 0;
      npc.group.rotation.z = 0;
    }
    if (npc.torso) {
      npc.torso.rotation.set(0, 0, 0);
      npc.torso.position.y = TORSO_BASE_Y;
    }
    if (npc.head) {
      npc.head.rotation.set(0, 0, 0);
      npc.head.position.y = HEAD_BASE_Y;
    }
    if (npc.leftArm) {
      npc.leftArm.rotation.set(0, 0, 0);
      npc.leftArm.position.y = ARM_BASE_Y;
    }
    if (npc.rightArm) {
      npc.rightArm.rotation.set(0, 0, 0);
      npc.rightArm.position.y = ARM_BASE_Y;
    }
    if (npc.leftLeg) npc.leftLeg.rotation.x = 0;
    if (npc.rightLeg) npc.rightLeg.rotation.x = 0;
  }

  /**
   * Colisão global unificada (OBB real das casas + props/estruturas + barreiras de segurança).
   * Empurra pelo menor eixo de penetração com deslize tangencial em direção ao destino.
   */
  resolveHouseAndWorldObstacles(npc, delta) {
    const pos = npc.group.position;
    const tx = npc.targetPos ? npc.targetPos.x : pos.x;
    const tz = npc.targetPos ? npc.targetPos.z : pos.z;

    // 1. OBB exata contra todas as casas da colina (incluindo degraus frontais em +Z local)
    if (this.arch && this.arch.houses) {
      const halfW = 2.52;
      const halfD = 2.42;
      const effHalfD = halfD + 0.25; // cobre +0.50 em +Z local com centro deslocado +0.25
      const maxCheckR = halfW + effHalfD + 0.6;

      for (let h = 0; h < this.arch.houses.length; h++) {
        const house = this.arch.houses[h];
        if (!house || !house.position) continue;
        if (npc.isBuilder && npc.builderState === 'working' && npc.assignedSite &&
          (npc.assignedSite.house === house || npc.assignedSite.plateau === house.plateau)) {
          continue;
        }

        const hx = house.position.x;
        const hz = house.position.z;
        const dx = pos.x - hx;
        if (Math.abs(dx) > maxCheckR) continue;
        const dz = pos.z - hz;
        if (Math.abs(dz) > maxCheckR) continue;
        const dy = pos.y - house.position.y;
        if (dy > 4.5 || dy < -6.8) continue;

        const rotY = house.meshGroup ? house.meshGroup.rotation.y : 0;
        const c = rotY ? Math.cos(rotY) : 1.0;
        const s = rotY ? Math.sin(rotY) : 0.0;
        const lx = dx * c - dz * s;
        const lz = (dx * s + dz * c) - 0.25;

        const penX = halfW - Math.abs(lx);
        const penZ = effHalfD - Math.abs(lz);
        if (penX > 0 && penZ > 0) {
          let nlx = lx;
          let nlz = lz;
          let lnx = 0;
          let lnz = 0;
          if (penX < penZ) {
            lnx = lx >= 0 ? 1 : -1;
            nlx = lnx * halfW;
          } else {
            lnz = lz >= 0 ? 1 : -1;
            nlz = lnz * effHalfD;
          }

          const localZ = nlz + 0.25;
          pos.x = hx + nlx * c + localZ * s;
          pos.z = hz - nlx * s + localZ * c;

          const wnx = lnx * c + lnz * s;
          const wnz = -lnx * s + lnz * c;
          const tanX = -wnz;
          const tanZ = wnx;
          const dot = (tx - pos.x) * tanX + (tz - pos.z) * tanZ;
          const slideSign = dot >= 0 ? 1 : -1;
          const slideDist = (npc.speed || 1.8) * (delta || 0.016) * 1.35;
          pos.x += tanX * slideSign * slideDist;
          pos.z += tanZ * slideSign * slideDist;
        }
      }
    }

    // 2. Obstáculos de estruturas, pedras, barracas, píer, fornos e mobiliário
    if (this.resolvePropObstacles) {
      this.resolvePropObstacles(npc, tx, tz, delta);
    }

    // 3. Barreira do penhasco frontal do Morro do Sol
    if (!npc.isScenicMirante && pos.x >= -12.5 && pos.x <= 12.5 && pos.z >= 2.2 && pos.z <= 16.8) {
      if (pos.z < 9.5) {
        pos.z = 1.4;
        if (npc.targetPos && npc.targetPos.z > 2.5 && this.roadNodesMap) {
          const exitNode = this.roadNodesMap.get('sol_plaza_portico') || this.roadNodesMap.get('alameda_crossroads');
          if (exitNode) {
            npc.targetPos.copy(exitNode.position);
            if (npc.pathQueue) npc.pathQueue.unshift('alameda_crossroads');
          }
        }
      } else {
        pos.z = 17.6;
      }
    }

    // 4. Barreira rígida do Campinho de Várzea (apenas jogadores entram no gramado)
    if (npc.role !== 'Jogador da Pelada') {
      if (pos.x >= 40.0 && pos.x <= 70.0 && pos.z >= -5.5 && pos.z <= 13.5) {
        if (pos.z < 3.5) {
          pos.x = pos.x < 55.0 ? 37.0 : 73.0;
        } else {
          pos.z = 14.5;
        }
      } else if (pos.x > 43.2 && pos.x < 66.8 && pos.z > -3.6 && pos.z < 11.6) {
        const dLeft = pos.x - 43.2;
        const dRight = 66.8 - pos.x;
        const dTop = pos.z - (-3.6);
        const dBottom = 11.6 - pos.z;
        const minD = Math.min(dLeft, dRight, dTop, dBottom);
        if (minD === dLeft) pos.x = 43.2;
        else if (minD === dRight) pos.x = 66.8;
        else if (minD === dTop) pos.z = -3.6;
        else pos.z = 11.6;
      }
    }

    // 5. Zona de Santuário Exclusiva do Seu Agenor (Mirante Sul: x = 1.4, z = 2.8)
    if (npc.citizenName !== 'Seu Agenor') {
      const dAgenor = Math.hypot(pos.x - 1.4, pos.z - 2.8);
      if (dAgenor < 1.75 && dAgenor > 0.001) {
        const ang = Math.atan2(pos.z - 2.8, pos.x - 1.4);
        pos.x = 1.4 + Math.cos(ang) * 1.75;
        pos.z = 2.8 + Math.sin(ang) * 1.75;
      }
    }

    // 6. Guarda-corpo e resgate do Píer dos Pescadores
    if (pos.z >= 60.5 && pos.z <= 96.0 && Math.abs(pos.x - (-78.0)) < 3.2) {
      pos.x = -78.0 + Math.max(-0.45, Math.min(0.45, pos.x - (-78.0)));
    }
    if (!npc.isDedicatedBeachgoer && !npc.isFisherman && Math.abs(pos.x - (-78.0)) <= 6.5 && pos.z >= 64.0 && pos.z <= 98.0) {
      if (Math.abs(pos.x - (-78.0)) > 1.2 || pos.y < 1.0) {
        pos.x = -78.0;
        pos.z = 54.0;
        npc.targetPos = new THREE.Vector3(-78.0, this.getFloorElevation(-78.0, 54.0), 54.0);
      }
    }
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
    // Clamping defensivo em passe único por frame (evita espiral de duplo update em alta população!)
    const clampedDelta = Math.min(delta, 0.08);
    this.updateStep(clampedDelta);
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

    if (this.festivalTimer > 0) {
      this.festivalTimer -= delta;
      if (this.festivalTimer <= 0) {
        this.festivalActive = false;
      }
    }

    this.npcs.forEach(npc => {
      // 1. Manter pés firmemente apoiados no piso/lajes/deck (exceto sentados, cênicos e banhistas/atletas)
      if (npc.builderState !== 'celebrating' && !npc.isScenicMirante && !npc.isSitting && !npc.isBeachCustomY && !npc.isBeachSeated && !npc.isBarraqueiro && !npc.isAthlete && !npc.isCalistenia) {
        const groundY = this.getFloorElevation(npc.group.position.x, npc.group.position.z);
        npc.group.position.y = groundY;
      }

      // 1b2. MICRO-ECONOMIA COMUNITÁRIA ORGÂNICA (Vendas e Trocas Solidárias)
      EconomyBehaviors.updateNPCEconomy(npc, delta, this.arch, this.simulation, this.soundtrack);

      // 1c. MORADOR SENTADO (Boteco de Calçada ou Banco da Alameda)
      if (npc.isSitting) {
        if (npc.sittingSpot) {
          const seatElevation = npc.sittingSpot.seatY || (this.getFloorElevation(npc.sittingSpot.x, npc.sittingSpot.z) + 0.38);
          npc.group.position.set(npc.sittingSpot.x, seatElevation - 0.50, npc.sittingSpot.z);
          npc.group.rotation.y = (npc.sittingSpot.rotY !== undefined ? npc.sittingSpot.rotY : npc.sittingSpot.rot) || 0;
        }
        npc.sittingTimer = (npc.sittingTimer !== undefined ? npc.sittingTimer : 15.0) - delta;
        if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, -1.45, 11.0, delta);
        if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, -1.45, 11.0, delta);
        if (npc.leftArm) {
          npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.38 + Math.sin(time * 1.4 + npc.walkCycle) * 0.05, 10.0, delta);
          npc.leftArm.position.y = dampLimb(npc.leftArm.position.y, ARM_BASE_Y, 10.0, delta);
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.38 + Math.cos(time * 1.6 + npc.walkCycle) * 0.06, 10.0, delta);
          npc.rightArm.position.y = dampLimb(npc.rightArm.position.y, ARM_BASE_Y, 10.0, delta);
        }
        if (npc.torso) {
          npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.05, 10.0, delta);
          npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 0.9 + npc.walkCycle) * 0.06, 10.0, delta);
          npc.torso.rotation.z = dampLimb(npc.torso.rotation.z, 0, 10.0, delta);
          npc.torso.position.y = dampLimb(npc.torso.position.y, TORSO_BASE_Y, 10.0, delta);
        }
        if (npc.head) {
          npc.head.position.y = dampLimb(npc.head.position.y, HEAD_BASE_Y, 10.0, delta);
        }

        if (npc.sittingTimer <= 0) {
          if (npc.sittingSpot) {
            npc.sittingSpot.isOccupied = false;
            npc.sittingSpot.occupant = null;
          }
          npc.isSitting = false;
          npc.sittingSpot = null;
          npc.sittingTimer = 0;
          npc.waitTimer = 0.65;
          npc.currentAction = 'Retomando a caminhada pelas ruas da colina';
        }
        return;
      }

      // 1d. MORADOR EMPINANDO PIPA NA LAJE/CRISTA (puxões rítmicos alternados na linha)
      if (npc.isFlyingKite) {
        const pullWave = Math.sin(time * 3.6 + (npc.seed || 0));
        if (npc.rightArm) {
          npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -1.28 + pullWave * 0.22, 10.0, delta);
          npc.rightArm.rotation.z = dampLimb(npc.rightArm.rotation.z, -0.08 + Math.cos(time * 2.2) * 0.06, 10.0, delta);
          npc.rightArm.position.y = dampLimb(npc.rightArm.position.y, ARM_BASE_Y, 10.0, delta);
        }
        if (npc.leftArm) {
          npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.78 - pullWave * 0.24, 10.0, delta);
          npc.leftArm.position.y = dampLimb(npc.leftArm.position.y, ARM_BASE_Y, 10.0, delta);
        }
        if (npc.torso) {
          npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, -0.10 + Math.sin(time * 1.8) * 0.04, 8.0, delta);
          npc.torso.rotation.z = dampLimb(npc.torso.rotation.z, Math.cos(time * 2.4) * 0.05, 8.0, delta);
        }
        if (npc.head) {
          npc.head.rotation.x = dampLimb(npc.head.rotation.x, -0.42 + Math.sin(time * 1.5) * 0.06, 8.0, delta);
          npc.head.rotation.y = dampLimb(npc.head.rotation.y, Math.sin(time * 1.2) * 0.14, 8.0, delta);
        }
        if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, 0.06, 10.0, delta);
        if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, -0.08, 10.0, delta);
        npc.currentAction = '🪁 Empinando pipa no céu da colina aproveitando a brisa favorável';
        return;
      }

      // 2. BARRAQUEIRO BEHAVIOR (Comércio nas Barracas da Praia — gestos fluidos sobre o deck!)
      if (npc.isBarraqueiro) {
        if (npc.assignedStall && npc.assignedStall.vendorSpot) {
          npc.group.position.copy(npc.assignedStall.vendorSpot);
          npc.group.rotation.y = 0;
        }
        const ph = npc.walkCycle || 0;
        let customer = null;
        if (npc.assignedStall) {
          const cSpot = npc.assignedStall.customerSpot;
          customer = this.npcs.find(other =>
            other !== npc && !other.isBarraqueiro &&
            Math.hypot(other.group.position.x - cSpot.x, other.group.position.z - cSpot.z) < 2.8
          );
        }

        // Ciclo natural de gestos (atendendo freguês vs preparando balcão vs acenando/observando a praia)
        const gesturePhase = (time * 0.45 + ph) % 10.0;
        let targetTorsoX = 0.04;
        let targetTorsoY = Math.sin(time * 0.85 + ph) * 0.10;
        let targetTorsoZ = Math.sin(time * 1.1 + ph) * 0.03;
        let targetHeadY = Math.sin(time * 0.72 + ph) * 0.32;
        let targetHeadX = Math.sin(time * 1.4 + ph) * 0.05;
        let targetArmRX = -0.36;
        let targetArmRZ = -0.06;
        let targetArmLX = -0.28;
        let targetArmLZ = 0.06;
        const breatheY = Math.sin(time * 2.1 + ph) * 0.015;

        if (customer) {
          // Atendendo freguês: inclina de leve sobre o balcão, prepara/entrega bebida com braços alternados e acena com a cabeça
          targetTorsoX = 0.14 + Math.sin(time * 2.6 + ph) * 0.05;
          targetTorsoY = Math.sin(time * 1.7 + ph) * 0.14;
          targetHeadY = Math.sin(time * 1.9 + ph) * 0.18;
          targetHeadX = 0.08 + Math.sin(time * 3.8 + ph) * 0.08;
          targetArmRX = -0.82 + Math.sin(time * 4.2 + ph) * 0.24;
          targetArmRZ = -0.14 + Math.cos(time * 3.4 + ph) * 0.08;
          targetArmLX = -0.62 + Math.cos(time * 3.6 + ph) * 0.20;
          targetArmLZ = 0.12;
        } else if (gesturePhase < 4.5) {
          // Limpando/organizando o balcão e cortando coco/preparando mate suavemente
          targetTorsoX = 0.10 + Math.sin(time * 2.2 + ph) * 0.04;
          targetHeadX = 0.14;
          targetHeadY = Math.sin(time * 1.3 + ph) * 0.16;
          targetArmRX = -0.68 + Math.sin(time * 3.2 + ph) * 0.18;
          targetArmRZ = -0.12 + Math.sin(time * 2.4 + ph) * 0.12;
          targetArmLX = -0.48 + Math.cos(time * 2.1 + ph) * 0.10;
        } else if (gesturePhase < 6.4) {
          // Acenando amigavelmente para banhistas passando no calçadão!
          targetTorsoX = 0.02;
          targetTorsoZ = -0.05;
          targetHeadY = Math.sin(time * 1.2 + ph) * 0.28;
          targetHeadX = -0.04;
          targetArmRX = -2.05 + Math.sin(time * 5.8 + ph) * 0.16;
          targetArmRZ = -0.28 + Math.sin(time * 6.5 + ph) * 0.22;
          targetArmLX = -0.18;
        } else {
          // Relaxado observando o movimento do mar e da praia
          targetTorsoX = 0.02;
          targetHeadY = Math.sin(time * 0.65 + ph) * 0.42;
          targetArmRX = -0.26 + Math.sin(time * 1.2 + ph) * 0.06;
          targetArmLX = -0.26 - Math.sin(time * 1.2 + ph) * 0.06;
        }

        if (npc.torso) {
          npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, targetTorsoX, 6.5, delta);
          npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, targetTorsoY, 6.0, delta);
          npc.torso.rotation.z = dampLimb(npc.torso.rotation.z, targetTorsoZ, 6.5, delta);
          npc.torso.position.y = dampLimb(npc.torso.position.y, TORSO_BASE_Y + breatheY, 8.0, delta);
        }
        if (npc.head) {
          npc.head.rotation.y = dampLimb(npc.head.rotation.y, targetHeadY, 5.5, delta);
          npc.head.rotation.x = dampLimb(npc.head.rotation.x, targetHeadX, 6.5, delta);
          npc.head.position.y = dampLimb(npc.head.position.y, HEAD_BASE_Y + breatheY, 8.0, delta);
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, targetArmRX, 7.5, delta);
          npc.rightArm.rotation.z = dampLimb(npc.rightArm.rotation.z, targetArmRZ, 7.5, delta);
          npc.rightArm.position.y = dampLimb(npc.rightArm.position.y, ARM_BASE_Y + breatheY, 8.0, delta);
        }
        if (npc.leftArm) {
          npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, targetArmLX, 7.5, delta);
          npc.leftArm.rotation.z = dampLimb(npc.leftArm.rotation.z, targetArmLZ, 7.5, delta);
          npc.leftArm.position.y = dampLimb(npc.leftArm.position.y, ARM_BASE_Y + breatheY, 8.0, delta);
        }
        if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, 0, 8.0, delta);
        if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, 0, 8.0, delta);

        if (npc.assignedStall) {
          const cSpot = npc.assignedStall.customerSpot;
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

      // 2b. PERSONAGENS CÊNICOS DEDICADOS (Alameda das Flores, Terreiro de Samba, Mirante Sul & Botecos da Expansão)
      if (npc.isScenicMirante) {
        if (npc.isMusician) {
          // Tião do Cavaco: ginga e palhetada sincopada no cavaquinho
          const strum = Math.sin(time * 9.5) * 0.22 + Math.sin(time * 19.0) * 0.08;
          if (npc.torso) {
            npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.08 + Math.sin(time * 3.0) * 0.04, 10.0, delta);
            npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 3.6) * 0.08, 10.0, delta);
            npc.torso.rotation.z = dampLimb(npc.torso.rotation.z, Math.cos(time * 3.6) * 0.03, 10.0, delta);
          }
          if (npc.leftArm) {
            npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.62 + Math.sin(time * 4.2) * 0.10, 12.0, delta);
            npc.leftArm.rotation.z = dampLimb(npc.leftArm.rotation.z, -0.14, 10.0, delta);
          }
          if (npc.rightArm) {
            npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.45 + strum, 16.0, delta);
            npc.rightArm.rotation.z = dampLimb(npc.rightArm.rotation.z, 0.16, 10.0, delta);
          }
          if (npc.head) {
            npc.head.rotation.x = dampLimb(npc.head.rotation.x, Math.sin(time * 3.6) * 0.09, 10.0, delta);
            npc.head.rotation.y = dampLimb(npc.head.rotation.y, Math.cos(time * 1.8) * 0.14, 8.0, delta);
          }
          npc.currentAction = '🎶 Tocando cavaquinho com harmonia e ginga na roda de samba';
        } else if (npc.citizenName === 'Dona Teresa' || (typeof npc.role === 'string' && npc.role.includes('Florista'))) {
          // Dona Teresa cuidando dos canteiros de flores da Alameda
          if (npc.torso) {
            npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.12 + Math.sin(time * 1.4) * 0.05, 8.0, delta);
            npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 1.6) * 0.22, 8.0, delta);
          }
          if (npc.leftArm) npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.42 + Math.sin(time * 2.4) * 0.18, 10.0, delta);
          if (npc.rightArm) npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.36 + Math.cos(time * 2.6) * 0.20, 10.0, delta);
          if (npc.head) npc.head.rotation.x = dampLimb(npc.head.rotation.x, 0.16, 8.0, delta);
          npc.currentAction = '🌺 Cuidando com carinho dos canteiros floridos da Alameda';
        } else if (npc.citizenName === 'Seu Agenor' || (typeof npc.role === 'string' && npc.role.includes('Mirante Sul'))) {
          // APENAS Seu Agenor fica sentado no banco do Mirante Sul (sem jamais empilhar outros NPCs cênicos aqui!)
          const plazaBaseY = this.terrain ? this.terrain.getElevation(-2.0, -4.0) + 0.1 : 14.1;
          const seatY = plazaBaseY + 0.24 + 0.35;
          npc.group.position.set(1.4, seatY - 0.50, 2.80);
          npc.group.rotation.y = 0.0;
          if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, -1.45, 10.0, delta);
          if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, -1.45, 10.0, delta);
          if (npc.torso) {
            npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.06, 8.0, delta);
            npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 0.7) * 0.05, 8.0, delta);
          }
          if (npc.leftArm) npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.45, 8.0, delta);
          if (npc.rightArm) npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.45 + Math.sin(time * 1.4) * 0.08, 8.0, delta);
          if (npc.head) {
            npc.head.rotation.x = dampLimb(npc.head.rotation.x, -0.04 + Math.sin(time * 0.8) * 0.04, 6.0, delta);
            npc.head.rotation.y = dampLimb(npc.head.rotation.y, Math.sin(time * 0.55) * 0.18, 5.0, delta);
          }
          npc.currentAction = '🌊 Sentado no banco do Mirante Sul apreciando a vista panorâmica do oceano';
        } else {
          // Anfitriões dos Botecos e Vendas das Vilas Expandidas permanecem em seus balcões acolhendo fregueses
          const ph = npc.walkCycle || 0;
          if (npc.torso) {
            npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 1.4 + ph) * 0.14, 8.0, delta);
            npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.04 + Math.sin(time * 2.0 + ph) * 0.04, 8.0, delta);
          }
          if (npc.leftArm) npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.28 + Math.sin(time * 2.2 + ph) * 0.14, 9.0, delta);
          if (npc.rightArm) npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.32 + Math.cos(time * 2.4 + ph) * 0.18, 9.0, delta);
          if (npc.head) npc.head.rotation.y = dampLimb(npc.head.rotation.y, Math.sin(time * 1.0 + ph) * 0.20, 7.0, delta);
        }
        return;
      }

      // 2c. SEU ZÉ DO COVO - PESCADOR DO PÍER (vara presa à mão direita com fisgada orgânica)
      if (npc.isFisherman) {
        const tug = Math.sin(time * 6.5) > 0.84 ? -0.18 : 0.0;
        if (npc.torso) {
          npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.06 + tug * 0.35 + Math.sin(time * 1.4) * 0.025, 8.0, delta);
          npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 0.7) * 0.06, 6.0, delta);
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.52 + tug + Math.sin(time * 1.8) * 0.05, 10.0, delta);
          npc.rightArm.rotation.z = dampLimb(npc.rightArm.rotation.z, 0.06, 8.0, delta);
        }
        if (npc.leftArm) {
          npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.35 + tug * 0.5, 8.0, delta);
        }
        if (npc.head) {
          npc.head.rotation.x = dampLimb(npc.head.rotation.x, 0.06, 6.0, delta);
          npc.head.rotation.y = dampLimb(npc.head.rotation.y, Math.sin(time * 0.5) * 0.22, 5.0, delta);
        }
        npc.currentAction = '🎣 Pescando pacientemente no extremo do píer sentindo o puxão das marés';
        return;
      }

      // 2d. ATLETAS DE AREIA - FUTEVÔLEI & VÔLEI DE PRAIA (aterrados no piso + salto parabólico suave)
      if (npc.isAthlete) {
        const baseY = this.getFloorElevation(npc.group.position.x, npc.group.position.z);
        if (npc.athleteType === 'futevolei') {
          const s = Math.sin(time * 3.5);
          const isMyTurn = (npc.group.position.x < 78.0) ? (s < -0.25) : (s > 0.25);
          const hop = isMyTurn ? Math.abs(Math.sin(time * 7.0)) * 0.28 : Math.abs(Math.sin(time * 5.2 + npc.walkCycle)) * 0.04;
          npc.group.position.y = baseY + hop;
          if (npc.torso) npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, isMyTurn ? -0.22 : 0.06, 14.0, delta);
          if (npc.leftArm) {
            npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, isMyTurn ? 0.55 : -0.15, 14.0, delta);
            npc.leftArm.rotation.z = dampLimb(npc.leftArm.rotation.z, isMyTurn ? -0.45 : -0.15, 14.0, delta);
          }
          if (npc.rightArm) {
            npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, isMyTurn ? -0.55 : -0.15, 14.0, delta);
            npc.rightArm.rotation.z = dampLimb(npc.rightArm.rotation.z, isMyTurn ? 0.45 : 0.15, 14.0, delta);
          }
          if (npc.head) npc.head.rotation.x = dampLimb(npc.head.rotation.x, isMyTurn ? -0.35 : -0.12, 12.0, delta);
          npc.currentAction = '⚽ Disputando peitadas e cabeceios plásticos na arena de futevôlei';
        } else if (npc.athleteType === 'volei') {
          const s = Math.sin(time * 2.8);
          const isMyTurn = (npc.group.position.x < 98.0) ? (s < -0.25) : (s > 0.25);
          const hop = isMyTurn ? Math.abs(Math.sin(time * 5.6)) * 0.30 : Math.abs(Math.sin(time * 4.5 + npc.walkCycle)) * 0.04;
          npc.group.position.y = baseY + hop;
          if (npc.leftArm) npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, isMyTurn ? -0.90 : -0.26, 14.0, delta);
          if (npc.rightArm) npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, isMyTurn ? -0.90 : -0.26, 14.0, delta);
          if (npc.torso) npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, isMyTurn ? 0.18 : 0.05, 12.0, delta);
          if (npc.head) npc.head.rotation.x = dampLimb(npc.head.rotation.x, -0.22, 10.0, delta);
          npc.currentAction = '🏐 Treinando recepção e saques rápidos na quadra de vôlei de praia';
        }
        return;
      }

      // 2e. BETO DO MATE - AMBULANTE ICÔNICO DE PRAIA (rotação e gestos suavizados)
      if (npc.isMateiro) {
        if (npc.waitTimer > 0) {
          npc.waitTimer -= delta;
          if (npc.torso) {
            npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 2.4) * 0.18, 10.0, delta);
            npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.04, 10.0, delta);
            npc.torso.position.y = dampLimb(npc.torso.position.y, TORSO_BASE_Y, 12.0, delta);
          }
          if (npc.leftArm) npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.25 + Math.sin(time * 2.2) * 0.12, 10.0, delta);
          if (npc.rightArm) npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.62 + Math.sin(time * 3.6) * 0.20, 12.0, delta);
          if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, 0, 12.0, delta);
          if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, 0, 12.0, delta);
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
          npc.group.rotation.y = smoothAngle(npc.group.rotation.y, Math.atan2(normX, normZ), 8.5, delta);

          npc.walkCycle += delta * 8;
          const swing = Math.sin(npc.walkCycle) * 0.55;
          const mBob = Math.abs(Math.sin(npc.walkCycle)) * 0.036;
          if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, swing, 15.0, delta);
          if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, -swing, 15.0, delta);
          if (npc.leftArm) {
            npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -swing * 0.55, 14.0, delta);
            npc.leftArm.position.y = dampLimb(npc.leftArm.position.y, ARM_BASE_Y + mBob, 15.0, delta);
          }
          if (npc.rightArm) {
            npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.42 + swing * 0.16, 14.0, delta);
            npc.rightArm.position.y = dampLimb(npc.rightArm.position.y, ARM_BASE_Y + mBob, 15.0, delta);
          }
          if (npc.torso) {
            npc.torso.position.y = dampLimb(npc.torso.position.y, TORSO_BASE_Y + mBob, 15.0, delta);
            npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, -swing * 0.12, 12.0, delta);
          }
          if (npc.head) npc.head.position.y = dampLimb(npc.head.position.y, HEAD_BASE_Y + mBob, 15.0, delta);
          if (npc.canisterGroup) {
            npc.canisterGroup.rotation.z = Math.sin(npc.walkCycle) * 0.04;
          }
          npc.currentAction = '🚶 Caminhando pelas areias oferecendo Mate Leão e biscoito';
        }
        return;
      }

      // 2f. MESTRE BIMBA - GINGA AUTÊNTICA DE CAPOEIRA (esquiva, base atrás e guarda)
      if (npc.isCapoeira) {
        const gCycle = time * 2.55;
        const s = Math.sin(gCycle);
        const c = Math.cos(gCycle);
        const drop = Math.abs(c) * 0.08;
        const baseY = this.getFloorElevation(npc.group.position.x, npc.group.position.z);
        npc.group.position.y = baseY - drop;
        if (npc.torso) {
          npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.20 + Math.abs(c) * 0.10, 12.0, delta);
          npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, s * 0.34, 12.0, delta);
          npc.torso.rotation.z = dampLimb(npc.torso.rotation.z, -s * 0.18, 12.0, delta);
        }
        if (npc.leftLeg) {
          npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, s > 0 ? (0.58 * s) : (0.28 * s), 12.0, delta);
          npc.leftLeg.rotation.z = dampLimb(npc.leftLeg.rotation.z, -0.14, 10.0, delta);
        }
        if (npc.rightLeg) {
          npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, s < 0 ? (-0.58 * s) : (-0.28 * s), 12.0, delta);
          npc.rightLeg.rotation.z = dampLimb(npc.rightLeg.rotation.z, 0.14, 10.0, delta);
        }
        // Braço de guarda na frente do rosto alternando com o balanço da esquiva
        if (npc.leftArm) {
          npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, s > 0 ? (-1.05 * s - 0.35) : -0.35, 12.0, delta);
          npc.leftArm.rotation.z = dampLimb(npc.leftArm.rotation.z, s > 0 ? 0.32 : -0.25, 12.0, delta);
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, s < 0 ? (1.05 * s - 0.35) : -0.35, 12.0, delta);
          npc.rightArm.rotation.z = dampLimb(npc.rightArm.rotation.z, s < 0 ? -0.32 : 0.25, 12.0, delta);
        }
        if (npc.head) {
          npc.head.rotation.x = dampLimb(npc.head.rotation.x, -0.12, 10.0, delta);
          npc.head.rotation.y = dampLimb(npc.head.rotation.y, -s * 0.22, 10.0, delta);
        }
        npc.currentAction = '🥋 Praticando a ginga e ensinando cantigas de capoeira com o berimbau';
        return;
      }

      // 2g. DONA NAIR - HORTA COMUNITÁRIA EM SOCALCOS (ciclo agacha-colhe-ergue suave)
      if (npc.isHorta) {
        const tendPhase = (time * 0.8 + 1.1) % 6.0;
        const bend = tendPhase < 3.6 ? Math.sin((tendPhase / 3.6) * Math.PI) : 0;
        if (npc.torso) {
          npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.12 + bend * 0.32, 8.0, delta);
          npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 1.1) * 0.24, 7.0, delta);
        }
        if (npc.leftArm) npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.35 - bend * 0.42 + Math.sin(time * 3.0) * 0.15, 10.0, delta);
        if (npc.rightArm) npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.30 - bend * 0.38 + Math.cos(time * 3.2) * 0.16, 10.0, delta);
        if (npc.head) npc.head.rotation.x = dampLimb(npc.head.rotation.x, 0.18 * bend, 8.0, delta);
        npc.currentAction = '🌱 Cuidando dos canteiros de couve, hortelã e tomate orgânico na encosta';
        return;
      }

      // 2h. TIAGO MOTOTÁXI - PONTO OFICIAL DE MOTOTÁXI (chama passageiros e ajusta viseira)
      if (npc.isMototaxi) {
        const motoPhase = (time * 0.55) % 8.0;
        const waving = motoPhase < 2.2;
        if (npc.torso) npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 1.3) * 0.22, 7.0, delta);
        if (npc.rightArm) {
          npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, waving ? (-1.85 + Math.sin(time * 6.0) * 0.22) : -0.18, 9.0, delta);
          npc.rightArm.rotation.z = dampLimb(npc.rightArm.rotation.z, waving ? 0.22 : 0.04, 8.0, delta);
        }
        if (npc.leftArm) npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.22 + Math.sin(time * 2.0) * 0.08, 8.0, delta);
        if (npc.head) npc.head.rotation.y = dampLimb(npc.head.rotation.y, Math.sin(time * 1.4) * 0.32, 6.0, delta);
        npc.currentAction = '🛵 Pronto no ponto de mototáxi para subir o morro com passageiros';
        return;
      }

      // 2i. GUGA DO SURFE - ESCOLA DE SURFE & PRANCHÁRIO (encerando prancha e olhando as ondas)
      if (npc.isSurfer) {
        const waxCycle = time * 4.5;
        if (npc.torso) {
          npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.14, 8.0, delta);
          npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 1.2) * 0.16, 7.0, delta);
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.68 + Math.sin(waxCycle) * 0.24, 12.0, delta);
          npc.rightArm.rotation.z = dampLimb(npc.rightArm.rotation.z, 0.14 + Math.cos(waxCycle) * 0.16, 12.0, delta);
        }
        if (npc.leftArm) npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.35 + Math.sin(time * 1.5) * 0.06, 9.0, delta);
        if (npc.head) npc.head.rotation.y = dampLimb(npc.head.rotation.y, Math.sin(time * 0.7) * 0.28, 5.0, delta);
        npc.currentAction = '🏄 Checando a ondulação e preparando pranchas de surfe para os alunos';
        return;
      }

      // 2j. JONAS DA CALISTENIA - MERGULHOS REAIS NAS BARRAS PARALELAS
      if (npc.isCalistenia) {
        const baseY = this.getFloorElevation(114.4, -10.8);
        const repCycle = (Math.sin(time * 2.1) * 0.5 + 0.5);
        const press = repCycle * repCycle * (3 - 2 * repCycle); // curva suave com respiro no topo e fundo
        npc.group.position.set(114.4, baseY + 0.20 + press * 0.24, -10.8);
        if (npc.torso) npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.18 + (1 - press) * 0.10, 12.0, delta);
        if (npc.leftArm) {
          npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.45 - (1 - press) * 0.42, 12.0, delta);
          npc.leftArm.rotation.z = dampLimb(npc.leftArm.rotation.z, -0.22, 10.0, delta);
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.45 - (1 - press) * 0.42, 12.0, delta);
          npc.rightArm.rotation.z = dampLimb(npc.rightArm.rotation.z, 0.22, 10.0, delta);
        }
        if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, 0.42, 10.0, delta);
        if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, 0.42, 10.0, delta);
        npc.currentAction = '💪 Treinando barras paralelas e exercícios de calistenia ao ar livre';
        return;
      }

      // 2k. BANHISTA DEDICADO DA PRAIA (Cadeiras, Beira d'Água, Mergulho até o Peito & Luau Noturno)
      if (npc.isDedicatedBeachgoer) {
        const bTime = this.env ? this.env.getTimeOfDay() : 'day';
        const bPhase = (typeof bTime === 'string') ? bTime : (bTime.phase || 'day');
        const bIsNightOrSunset = (bPhase === 'night' || bPhase === 'sunset');
        this.updateBeachgoerBehavior(npc, delta, time, bIsNightOrSunset);
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
          // Watchdog anti-travamento para carreteiros (nunca fica bloqueado em barreiras ou esquinas!)
          npc.courierStuckTimer = (npc.courierStuckTimer || 0) + delta;
          if (npc.courierStuckTimer >= 2.6) {
            npc.courierStuckTimer = 0;
            if (npc.courierLastPos) {
              const moved = Math.hypot(npc.group.position.x - npc.courierLastPos.x, npc.group.position.z - npc.courierLastPos.z);
              if (moved < 0.45 && npc.courierSite) {
                // Redireciona pela via pavimentada mais próxima evitando a Praça do Samba
                const avoidPlaza = new Set(['plaza', 'mirante', 'portico', 'alameda']);
                const curNode = this.getNearestRoadNode(npc.group.position.x, npc.group.position.z, null, (n) => !avoidPlaza.has(n.type));
                const dstNode = this.getNearestRoadNode(npc.courierSite.plateau.x, npc.courierSite.plateau.z, null, (n) => !avoidPlaza.has(n.type));
                if (curNode && dstNode) {
                  const newPath = this.findRoadPath(curNode.id, dstNode.id, avoidPlaza);
                  npc.pathQueue = newPath.slice(1);
                  const nextNd = npc.pathQueue.length > 0 ? this.roadNodesMap.get(npc.pathQueue.shift()) : dstNode;
                  if (nextNd) npc.targetPos = nextNd.position.clone();
                } else {
                  const onDelivered = npc.onDelivered;
                  this.releaseCourier(npc);
                  if (onDelivered) onDelivered();
                  return;
                }
              }
            }
            npc.courierLastPos = { x: npc.group.position.x, z: npc.group.position.z };
          }

          const normX = dirX / dist;
          const normZ = dirZ / dist;
          npc.group.position.x += normX * npc.speed * delta;
          npc.group.position.z += normZ * npc.speed * delta;

          npc.group.rotation.y = smoothAngle(npc.group.rotation.y, Math.atan2(normX, normZ), 10.0, delta);

          npc.walkCycle += delta * 9;
          const swing = Math.sin(npc.walkCycle) * 0.48;
          const cBob = Math.abs(Math.sin(npc.walkCycle)) * 0.03;
          if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, swing, 14.0, delta);
          if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, -swing, 14.0, delta);
          if (npc.leftArm) {
            npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.82, 14.0, delta);
            npc.leftArm.position.y = ARM_BASE_Y + cBob;
          }
          if (npc.rightArm) {
            npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.82, 14.0, delta);
            npc.rightArm.position.y = ARM_BASE_Y + cBob;
          }
          if (npc.torso) {
            npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.16, 12.0, delta);
            npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, -swing * 0.08, 12.0, delta);
            npc.torso.position.y = TORSO_BASE_Y + cBob;
          }
          if (npc.head) {
            npc.head.position.y = HEAD_BASE_Y + cBob * 0.85;
          }
        }
        return;
      }

      // 3. JOGADOR DA PELADA (Pelada Tática no Campinho de Várzea com Bola Rolando e Sem Amontoamento)
      if (npc.role === 'Jogador da Pelada') {
        if (this.arch && this.arch.soccerBall) {
          const ball = this.arch.soccerBall;
          const pitchBaseY = (this.arch && this.arch.soccerBallBaseY) ? this.arch.soccerBallBaseY - 0.28 : 3.7;
          npc.group.position.y = pitchBaseY;

          // Goal celebration if goal was recently scored
          if (this.arch.soccerGoalCooldown > 1.2) {
            const celPhase = time * 14 + (npc.walkCycle || 0);
            npc.group.position.y = pitchBaseY + Math.abs(Math.sin(celPhase)) * 0.34;
            if (npc.leftArm) npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -2.35 + Math.sin(celPhase) * 0.25, 16.0, delta);
            if (npc.rightArm) npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -2.35 - Math.sin(celPhase) * 0.25, 16.0, delta);
            if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, Math.sin(celPhase) * 0.35, 16.0, delta);
            if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, -Math.sin(celPhase) * 0.35, 16.0, delta);
            if (npc.torso) {
              npc.torso.position.y = TORSO_BASE_Y;
              npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, -0.08, 12.0, delta);
            }
            npc.currentAction = `🎉 Comemorando o golaço no campinho pelo time ${npc.team === 'yellow' ? 'Amarelo' : 'Azul'}!`;
            return;
          }

          if (npc.kickTimer > 0) npc.kickTimer -= delta;
          if (npc.kickAnimTimer > 0) npc.kickAnimTimer -= delta;

          const distToBall = Math.hypot(ball.position.x - npc.group.position.x, ball.position.z - npc.group.position.z);
          const isYellow = (npc.team === 'yellow');
          const targetGoalX = isYellow ? 65.0 : 45.0; // Amarelo chuta no gol leste (65), Azul no oeste (45)
          const role = npc.tacticalRole || 'atacante';

          // Raio de chute: se a bola estiver perto e o jogador puder chutar
          if (distToBall < 1.85 && npc.kickTimer <= 0) {
            npc.kickTimer = 0.75 + Math.random() * 0.45;
            npc.kickAnimTimer = 0.28;

            let kx = targetGoalX - ball.position.x;
            let kz = (4.0 + (Math.random() - 0.5) * 3.4) - ball.position.z;
            const kLen = Math.hypot(kx, kz) || 1;
            kx /= kLen;
            kz /= kLen;

            const kickForce = (role === 'goleiro') ? 9.2 : (7.0 + Math.random() * 4.0);
            this.arch.kickSoccerBall(kx, kz, kickForce);

            if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, -1.25, 22.0, delta);
            if (npc.leftArm) npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.55, 18.0, delta);
            if (npc.rightArm) npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, 0.45, 18.0, delta);
            npc.currentAction = (role === 'goleiro')
              ? `🧤 Defesa e reposição de bola do goleiro (${isYellow ? 'Amarelo' : 'Azul'})!`
              : `⚽ Chute a gol do time ${isYellow ? 'Amarelo Canário' : 'Azul Guanabara'}!`;
          } else {
            // Posicionamento Tático Inteligente
            let targetX, targetZ;

            if (role === 'goleiro') {
              targetX = isYellow ? 46.2 : 63.8;
              targetZ = Math.max(1.8, Math.min(6.2, ball.position.z));
              npc.currentAction = `🧤 Guardando a meta do time ${isYellow ? 'Amarelo' : 'Azul'}`;
            } else if (role === 'zagueiro') {
              const ballInOwnHalf = isYellow ? (ball.position.x < 56.0) : (ball.position.x > 54.0);
              if (ballInOwnHalf) {
                targetX = ball.position.x + (isYellow ? -0.4 : 0.4);
                targetZ = ball.position.z;
                npc.currentAction = `🛡️ Desarmando na zaga (${isYellow ? 'Amarelo' : 'Azul'})`;
              } else {
                targetX = isYellow ? 51.0 : 59.0;
                targetZ = ball.position.z * 0.6 + 1.6;
                npc.currentAction = `🛡️ Posicionado na linha defensiva (${isYellow ? 'Amarelo' : 'Azul'})`;
              }
            } else {
              targetX = ball.position.x + (isYellow ? -0.3 : 0.3);
              targetZ = ball.position.z + (npc.id.endsWith('1') ? 0.4 : -0.4);
              npc.currentAction = `⚽ Partindo pro drible e ataque (${isYellow ? 'Amarelo' : 'Azul'})`;
            }

            // Movimento suave em direção ao alvo tático
            const dx = targetX - npc.group.position.x;
            const dz = targetZ - npc.group.position.z;
            const d = Math.hypot(dx, dz);

            if (d > 0.08) {
              const nx = dx / d;
              const nz = dz / d;
              const speed = (role === 'atacante' || (role === 'zagueiro' && distToBall < 5.0)) ? 3.6 : 2.5;
              npc.group.position.x += nx * speed * delta;
              npc.group.position.z += nz * speed * delta;
              npc.group.rotation.y = smoothAngle(npc.group.rotation.y, Math.atan2(nx, nz), 12.0, delta);

              npc.walkCycle += delta * 14;
              const swing = Math.sin(npc.walkCycle) * 0.70;
              const pBob = Math.abs(Math.sin(npc.walkCycle)) * 0.045;
              if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, swing, 16.0, delta);
              if (npc.rightLeg) {
                npc.rightLeg.rotation.x = (npc.kickAnimTimer > 0)
                  ? dampLimb(npc.rightLeg.rotation.x, -1.15, 22.0, delta)
                  : dampLimb(npc.rightLeg.rotation.x, -swing, 16.0, delta);
              }
              if (npc.leftArm) {
                npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -swing * 0.82, 16.0, delta);
                npc.leftArm.rotation.z = dampLimb(npc.leftArm.rotation.z, 0, 12.0, delta);
                npc.leftArm.position.y = ARM_BASE_Y + pBob;
              }
              if (npc.rightArm) {
                npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, swing * 0.82, 16.0, delta);
                npc.rightArm.rotation.z = dampLimb(npc.rightArm.rotation.z, 0, 12.0, delta);
                npc.rightArm.position.y = ARM_BASE_Y + pBob;
              }
              if (npc.torso) {
                npc.torso.position.y = TORSO_BASE_Y + pBob;
                npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.10, 12.0, delta);
                npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, -swing * 0.14, 14.0, delta);
              }
              if (npc.head) npc.head.position.y = HEAD_BASE_Y + pBob * 0.85;
            } else {
              // Quando parado, encara a bola (goleiro em guarda pronta!)
              const faceAngle = Math.atan2(ball.position.x - npc.group.position.x, ball.position.z - npc.group.position.z);
              npc.group.rotation.y = smoothAngle(npc.group.rotation.y, faceAngle, 12.0, delta);
              if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, 0, 12.0, delta);
              if (npc.rightLeg) {
                npc.rightLeg.rotation.x = (npc.kickAnimTimer > 0)
                  ? dampLimb(npc.rightLeg.rotation.x, -1.10, 20.0, delta)
                  : dampLimb(npc.rightLeg.rotation.x, 0, 12.0, delta);
              }
              if (role === 'goleiro') {
                if (npc.leftArm) {
                  npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.62, 10.0, delta);
                  npc.leftArm.rotation.z = dampLimb(npc.leftArm.rotation.z, 0.42, 10.0, delta);
                }
                if (npc.rightArm) {
                  npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.62, 10.0, delta);
                  npc.rightArm.rotation.z = dampLimb(npc.rightArm.rotation.z, -0.42, 10.0, delta);
                }
                if (npc.torso) npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.12, 10.0, delta);
              } else {
                if (npc.leftArm) {
                  npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, 0, 10.0, delta);
                  npc.leftArm.rotation.z = dampLimb(npc.leftArm.rotation.z, 0, 10.0, delta);
                }
                if (npc.rightArm) {
                  npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, 0, 10.0, delta);
                  npc.rightArm.rotation.z = dampLimb(npc.rightArm.rotation.z, 0, 10.0, delta);
                }
                if (npc.torso) npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0, 10.0, delta);
              }
              if (npc.torso) npc.torso.position.y = TORSO_BASE_Y;
              if (npc.leftArm) npc.leftArm.position.y = ARM_BASE_Y;
              if (npc.rightArm) npc.rightArm.position.y = ARM_BASE_Y;
              if (npc.head) npc.head.position.y = HEAD_BASE_Y;
            }

            // Força de Separação Mútua (impede 100% o amontoamento de jogadores)
            for (let j = 0; j < this.npcs.length; j++) {
              const other = this.npcs[j];
              if (other === npc || other.role !== 'Jogador da Pelada') continue;
              const sepX = npc.group.position.x - other.group.position.x;
              const sepZ = npc.group.position.z - other.group.position.z;
              const sepDist = Math.hypot(sepX, sepZ);
              if (sepDist > 0.01 && sepDist < 1.75) {
                const push = (1.75 - sepDist) * 1.8 * delta;
                npc.group.position.x += (sepX / sepDist) * push;
                npc.group.position.z += (sepZ / sepDist) * push;
              }
            }

            // Limites rígidos das quatro linhas do campinho
            npc.group.position.x = Math.max(45.5, Math.min(64.5, npc.group.position.x));
            npc.group.position.z = Math.max(-1.8, Math.min(9.8, npc.group.position.z));
          }
          return;
        }
      }

      // 4. RODA DE SAMBA NA PRAÇA CENTRAL (Noites Cariocas & Pôr do Sol Festivo!)
      const curTime = this.env ? this.env.getTimeOfDay() : 'day';
      const curPhase = (typeof curTime === 'string') ? curTime : (curTime.phase || 'day');
      const isNightOrSunset = (curPhase === 'night' || curPhase === 'sunset') || Boolean(this.festivalActive);

      if (isNightOrSunset && npc.sambaState && npc.sambaState.isParticipant && !npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && !npc.isScenicMirante && !npc.isFisherman && !npc.isAthlete && !npc.isMateiro && !npc.isCapoeira && !npc.isHorta && !npc.isMototaxi && !npc.isSurfer && !npc.isCalistenia && npc.role !== 'Jogador da Pelada' && this._claimSambaSlot(npc) >= 0) {
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
          if (npc.pandeiroItem) npc.pandeiroItem.visible = false;
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
          const sambaArriveDist = (npc.targetNodeId === 'sol_plaza_center') ? 2.1 : 1.2;
          if (dToTarget < sambaArriveDist) {
            if (npc.pathQueue && npc.pathQueue.length > 0) {
              npc.currentNodeId = npc.targetNodeId;
              npc.targetNodeId = npc.pathQueue.shift();
              const nxt = this.roadNodesMap.get(npc.targetNodeId);
              if (nxt) npc.targetPos = nxt.position.clone();
            } else {
              npc.targetNodeId = null;
              npc.targetPos.set(plazaX, plazaY, plazaZ);
            }
          }

          const dirX = npc.targetPos.x - npc.group.position.x;
          const dirZ = npc.targetPos.z - npc.group.position.z;
          const norm = Math.hypot(dirX, dirZ) || 1;
          const sambaSpeed = 2.8;
          npc.group.position.x += (dirX / norm) * sambaSpeed * delta;
          npc.group.position.z += (dirZ / norm) * sambaSpeed * delta;
          npc.group.rotation.y = smoothAngle(npc.group.rotation.y, Math.atan2(dirX, dirZ), 10.0, delta);

          npc.walkCycle += delta * 12;
          const swing = Math.sin(npc.walkCycle) * 0.55;
          const sBob = Math.abs(Math.sin(npc.walkCycle)) * 0.04;
          if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, swing, 16.0, delta);
          if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, -swing, 16.0, delta);
          if (npc.leftArm) {
            npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -swing * 0.65, 16.0, delta);
            npc.leftArm.position.y = ARM_BASE_Y + sBob;
          }
          if (npc.rightArm) {
            npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, swing * 0.65, 16.0, delta);
            npc.rightArm.position.y = ARM_BASE_Y + sBob;
          }
          if (npc.torso) {
            npc.torso.position.y = TORSO_BASE_Y + sBob;
            npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, -swing * 0.14, 14.0, delta);
          }
          if (npc.head) npc.head.position.y = HEAD_BASE_Y + sBob * 0.85;
          npc.currentAction = (npc.currentNodeId && npc.currentNodeId.startsWith('alameda'))
            ? 'Descendo a Alameda do Samba em direção à festa'
            : 'Subindo as ruas do morro a caminho da roda de samba';
        } else {
          npc.sambaState.isActive = true;
          const toFireX = -2.0 - npc.group.position.x;
          const toFireZ = -4.0 - npc.group.position.z;

          if (isInner) {
            if (npc.pandeiroItem) npc.pandeiroItem.visible = (slot < 4);
            if (this.arch && this.arch.sambaBenches && this.arch.sambaBenches[slot]) {
              const bench = this.arch.sambaBenches[slot];
              npc.group.position.set(bench.x, bench.seatY - 0.50, bench.z);
              npc.group.rotation.y = smoothAngle(npc.group.rotation.y, bench.rotY, 10.0, delta);
            } else {
              npc.group.position.y = plazaY + 0.12;
              npc.group.rotation.y = smoothAngle(npc.group.rotation.y, Math.atan2(toFireX, toFireZ), 10.0, delta);
            }
            const beat = Math.sin(time * 8.2 + slot);
            if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, -1.45, 12.0, delta);
            if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, -1.45, 12.0, delta);
            if (npc.torso) {
              npc.torso.position.y = TORSO_BASE_Y;
              npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.08, 10.0, delta);
              npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 3.8 + slot) * 0.12, 10.0, delta);
            }
            if (npc.leftArm) {
              npc.leftArm.position.y = ARM_BASE_Y;
              npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.58 - beat * 0.28, 16.0, delta);
            }
            if (npc.rightArm) {
              npc.rightArm.position.y = ARM_BASE_Y;
              npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.42 + beat * 0.36, 16.0, delta);
            }
            if (npc.head) {
              npc.head.position.y = HEAD_BASE_Y;
              npc.head.rotation.x = dampLimb(npc.head.rotation.x, Math.sin(time * 4.0 + slot) * 0.10, 10.0, delta);
            }
            npc.currentAction = (slot < 4)
              ? '🪘 Batendo pandeiro firme na roda de samba'
              : '🎶 Tocando e cantando na roda de samba ao redor da fogueira';
          } else {
            if (npc.pandeiroItem) npc.pandeiroItem.visible = false;
            npc.group.rotation.y = smoothAngle(npc.group.rotation.y, Math.atan2(toFireX, toFireZ), 10.0, delta);
            const bounce = Math.abs(Math.sin(time * 7.8 + slot)) * 0.07;
            const sambaStep = Math.sin(time * 7.8 + slot);
            npc.group.position.y = plazaY + bounce;
            if (npc.torso) {
              npc.torso.position.y = TORSO_BASE_Y;
              npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, Math.sin(time * 3.2 + slot) * 0.10, 12.0, delta);
              npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 4.2 + slot) * 0.24, 12.0, delta);
              npc.torso.rotation.z = dampLimb(npc.torso.rotation.z, Math.cos(time * 3.9 + slot) * 0.07, 12.0, delta);
            }
            if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, sambaStep * 0.30, 14.0, delta);
            if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, -sambaStep * 0.30, 14.0, delta);
            if (npc.leftArm) {
              npc.leftArm.position.y = ARM_BASE_Y;
              npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.45 + sambaStep * 0.40, 14.0, delta);
            }
            if (npc.rightArm) {
              npc.rightArm.position.y = ARM_BASE_Y;
              npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -0.45 - sambaStep * 0.40, 14.0, delta);
            }
            if (npc.head) {
              npc.head.position.y = HEAD_BASE_Y;
              npc.head.rotation.y = dampLimb(npc.head.rotation.y, Math.sin(time * 2.5 + slot) * 0.18, 10.0, delta);
            }
            npc.currentAction = '💃 Sambando e batendo palmas em volta da praça iluminada';
          }

          if (Math.random() < 0.18) {
            this.spawnSambaSpark({ x: -2.0, y: plazaY + 0.8, z: -4.0 });
          }
        }
        return;
      } else if (!isNightOrSunset && npc.sambaState && (npc.sambaState.isActive || npc.sambaRoutingActive)) {
        npc.sambaState.isActive = false;
        this._releaseSambaSlot(npc);
        npc.sambaRoutingActive = false;
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
        if (npc.chatPartner) {
          const partner = npc.chatPartner;
          if (!partner || !partner.group) {
            npc.chatPartner = null;
            return;
          }
          if (npc.pandeiroItem) npc.pandeiroItem.visible = false;

          const partnerName = partner.citizenName || 'vizinho';
          const npcName = npc.citizenName || 'morador';
          npc.chatTimer = (npc.chatTimer || 0) + delta;

          const dx = partner.group.position.x - npc.group.position.x;
          const dz = partner.group.position.z - npc.group.position.z;
          npc.group.rotation.y = smoothAngle(npc.group.rotation.y, Math.atan2(dx, dz), 10.0, delta);

          if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, 0, 12.0, delta);
          if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, 0, 12.0, delta);

          const animOffset = (npc.citizenName ? npc.citizenName.length : 1);
          if (npc.torso) {
            npc.torso.position.y = TORSO_BASE_Y;
            npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0, 10.0, delta);
            npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, Math.sin(time * 3.0 + animOffset) * 0.14, 12.0, delta);
          }
          if (npc.leftArm) {
            npc.leftArm.position.y = ARM_BASE_Y;
            npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.35 + Math.sin(time * 2.8 + animOffset) * 0.28, 12.0, delta);
          }
          if (npc.rightArm) {
            npc.rightArm.position.y = ARM_BASE_Y;
            npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, 0.25 - Math.cos(time * 2.5 + animOffset) * 0.22, 12.0, delta);
          }
          if (npc.head) {
            npc.head.position.y = HEAD_BASE_Y;
            npc.head.rotation.x = dampLimb(npc.head.rotation.x, Math.sin(time * 3.5 + animOffset) * 0.12, 10.0, delta);
          }

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

              // Vira o corpo em direção ao centro da construção
              if (npc.assignedSite && npc.assignedSite.plateau) {
                const toCenterX = npc.assignedSite.plateau.x - npc.group.position.x;
                const toCenterZ = npc.assignedSite.plateau.z - npc.group.position.z;
                npc.group.rotation.y = smoothAngle(npc.group.rotation.y, Math.atan2(toCenterX, toCenterZ), 12.0, delta);
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

            npc.group.rotation.y = smoothAngle(npc.group.rotation.y, Math.atan2(normX, normZ), 10.0, delta);

            npc.walkCycle += delta * 9;
            const swing = Math.sin(npc.walkCycle) * 0.58;
            const bBob = Math.abs(Math.sin(npc.walkCycle)) * 0.036;
            if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, swing, 14.0, delta);
            if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, -swing, 14.0, delta);
            if (npc.leftArm) {
              npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -swing * 0.65, 14.0, delta);
              npc.leftArm.position.y = ARM_BASE_Y + bBob;
            }
            if (npc.toolArm) {
              npc.toolArm.rotation.x = dampLimb(npc.toolArm.rotation.x, swing * 0.35, 14.0, delta);
              npc.toolArm.rotation.z = dampLimb(npc.toolArm.rotation.z, 0, 12.0, delta);
              npc.toolArm.position.y = ARM_BASE_Y + bBob;
            }
            if (npc.torso) {
              npc.torso.position.y = TORSO_BASE_Y + bBob;
              npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.06, 12.0, delta);
              npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, -swing * 0.12, 12.0, delta);
            }
            if (npc.head) npc.head.position.y = HEAD_BASE_Y + bBob * 0.85;
          }
          return;
        }

        if (npc.builderState === 'working') {
          const timeInfo = this.arch && this.arch.env ? this.arch.env.getTimeOfDay() : 'day';
          const phase = (typeof timeInfo === 'string') ? timeInfo : (timeInfo.phase || 'day');
          const isWorkHours = (phase === 'day' || phase === 'sunset');

          if (!isWorkHours) {
            this.releaseWorker(npc);
            return;
          }

          if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, 0, 12.0, delta);
          if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, 0, 12.0, delta);
          if (npc.leftArm) {
            npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -0.30, 10.0, delta);
            npc.leftArm.position.y = ARM_BASE_Y;
          }

          const swingCycle = Math.sin(time * 9 + npc.walkCycle);
          if (npc.toolArm) {
            npc.toolArm.position.y = ARM_BASE_Y;
            npc.toolArm.rotation.x = dampLimb(npc.toolArm.rotation.x, swingCycle * 0.85, 18.0, delta);
            npc.toolArm.rotation.z = dampLimb(npc.toolArm.rotation.z, Math.sin(time * 4.5) * 0.15, 14.0, delta);
          }
          if (npc.torso) {
            npc.torso.position.y = TORSO_BASE_Y;
            npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, Math.max(0, swingCycle * 0.15), 14.0, delta);
            npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, 0, 10.0, delta);
          }
          if (npc.head) {
            npc.head.position.y = HEAD_BASE_Y;
            npc.head.rotation.x = dampLimb(npc.head.rotation.x, 0.12, 10.0, delta);
          }
          npc.currentAction = 'Modelando o terreno e assentando vigas e fiadas';
          return;
        }

        if (npc.builderState === 'celebrating') {
          npc.cheerTimer -= delta;
          const baseGroundY = this.getFloorElevation(npc.group.position.x, npc.group.position.z);
          npc.group.position.y = baseGroundY + Math.abs(Math.sin(time * 14 + npc.walkCycle)) * 0.38;

          if (npc.toolArm) npc.toolArm.rotation.x = dampLimb(npc.toolArm.rotation.x, -Math.PI * 0.75 + Math.sin(time * 8) * 0.25, 16.0, delta);
          if (npc.leftArm) npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, -Math.PI * 0.72 - Math.sin(time * 8) * 0.25, 16.0, delta);
          if (npc.torso) {
            npc.torso.position.y = TORSO_BASE_Y;
            npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, -0.1, 12.0, delta);
          }
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
        const idleBreath = Math.sin(time * 2.1 + (npc.seed || 0)) * 0.014;
        const carryingLeftIdle = Boolean(npc.handItem && npc.handItem.visible);
        if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, 0, 12.0, delta);
        if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, 0, 12.0, delta);
        if (npc.leftArm) {
          npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, carryingLeftIdle ? -0.50 : 0, 10.0, delta);
          npc.leftArm.position.y = dampLimb(npc.leftArm.position.y, ARM_BASE_Y + idleBreath, 12.0, delta);
        }
        if (npc.rightArm) {
          npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, 0, 10.0, delta);
          npc.rightArm.position.y = dampLimb(npc.rightArm.position.y, ARM_BASE_Y + idleBreath, 12.0, delta);
        }
        if (npc.torso) {
          npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0, 10.0, delta);
          npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, 0, 10.0, delta);
          npc.torso.rotation.z = dampLimb(npc.torso.rotation.z, 0, 10.0, delta);
          npc.torso.position.y = dampLimb(npc.torso.position.y, TORSO_BASE_Y + idleBreath, 12.0, delta);
        }
        if (npc.head) {
          npc.head.position.y = dampLimb(npc.head.position.y, HEAD_BASE_Y + idleBreath, 12.0, delta);
        }
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
              // Atingiu o calçadão na entrada da praia! Transiciona para a rotina viva da praia (cadeiras, mar, barraquinhas, luau)
              npc.beachTrip.state = 'at_beach';
              npc.beachTrip.beachTimer = 12.0 + Math.random() * 8.0;
              this.setNPCBeachOutfit(npc, true);
              this.chooseNextBeachDecision(npc, isNightOrSunset);
              return;
            }
          }
        } else if (npc.beachTrip.state === 'at_beach') {
          this.updateBeachgoerBehavior(npc, delta, time, isNightOrSunset);
          return;
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
      const arriveDist = (npc.targetNodeId === 'sol_plaza_center') ? 2.1 : 1.2;
      if (dist < arriveDist && (!npc.beachTrip || npc.beachTrip.state === 'idle')) {
        // Se estiver em rota direta por fila de nós, não pausa a cada metro; pausas só ocorrem esporadicamente
        npc.waitTimer = (npc.pathQueue && npc.pathQueue.length > 0) ? 0 : (Math.random() < 0.20 ? (0.6 + Math.random() * 0.8) : 0);

        // Oportunidade Orgânica e Esporádica de Sentar (Chance 5% em cadeiras de boteco ou bancos da Alameda)
        if (!npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && !npc.isScenicMirante && !npc.isFisherman && !npc.isAthlete && !npc.isMateiro && !npc.isCapoeira && !npc.isHorta && !npc.isMototaxi && !npc.isSurfer && !npc.isCalistenia && npc.role !== 'Jogador da Pelada' && Math.random() < 0.05) {
          const isSeatFree = (s) => !s.isOccupied && !this.npcs.some(o => o !== npc && Math.hypot(o.group.position.x - s.x, o.group.position.z - s.z) < 1.35);
          let candidateSpot = null;
          if (this.arch && this.arch.botecoSpots) {
            candidateSpot = this.arch.botecoSpots.find(s => isSeatFree(s) && Math.hypot(s.x - npc.group.position.x, s.z - npc.group.position.z) < 3.2);
          }
          if (!candidateSpot && this.arch && this.arch.alamedaBenches) {
            candidateSpot = this.arch.alamedaBenches.find(s => isSeatFree(s) && Math.hypot(s.x - npc.group.position.x, s.z - npc.group.position.z) < 3.5);
          }
          // Jamais sentar sobre ou próximo ao banco exclusivo do Seu Agenor no Mirante Sul (-2, -4 / 1.4, 2.8)
          if (candidateSpot && Math.hypot(candidateSpot.x - 1.4, candidateSpot.z - 2.8) < 2.2) {
            candidateSpot = null;
          }
          if (candidateSpot) {
            candidateSpot.isOccupied = true;
            candidateSpot.occupant = npc;
            npc.isSitting = true;
            npc.sittingSpot = candidateSpot;
            npc.sittingTimer = 14.0 + Math.random() * 18.0;
            const seatElevation = candidateSpot.seatY || (candidateSpot.y + 0.38);
            npc.group.position.set(candidateSpot.x, seatElevation - 0.50, candidateSpot.z);
            npc.group.rotation.y = (candidateSpot.rotY !== undefined ? candidateSpot.rotY : candidateSpot.rot) || 0;
            npc.currentAction = candidateSpot.botecoName
              ? `🥤 Tomando um guaraná gelado no ${candidateSpot.botecoName}`
              : '🌳 Descansando no banco da Alameda sob os pergolados floridos';
            return;
          }
        }

        // Desejo esporádico e controlado de ir à praia:
        // A imensa maioria dos moradores (85%+) deve permanecer vivendo, conversando e circulando no Morro Central e bairros!
        const currentBeachgoers = this.npcs.filter(n => n.beachTrip && n.beachTrip.state !== 'idle').length;
        const maxConcurrentBeachTrips = 4; // No máximo 4 civis em passeio simultâneo à praia!

        if (currentBeachgoers < maxConcurrentBeachTrips && npc.beachTrip && !npc.isBuilder && !npc.isCourier && !npc.isBarraqueiro && !npc.isScenicMirante && !npc.isFisherman && !npc.isAthlete && !npc.isMateiro && !npc.isCapoeira && !npc.isHorta && !npc.isMototaxi && !npc.isSurfer && !npc.isCalistenia && npc.role !== 'Jogador da Pelada') {
          // Apenas moradores que já estejam na faixa baixa próxima à areia (z >= 18) e em pleno dia têm pequena chance (3.5%) de dar um pulo na praia
          const nearCoast = (npc.group.position.z >= 18.0 && Math.abs(npc.group.position.x) < 90.0);
          const rollBeach = nearCoast && !isNightOrSunset && (Math.random() < 0.035);

          if (rollBeach) {
            const curId = npc.currentNodeId || (this.getNearestRoadNode(npc.group.position.x, npc.group.position.z) ? this.getNearestRoadNode(npc.group.position.x, npc.group.position.z).id : 'coast_w_3');
            // Cidadãos usam rotas seguras de encosta
            const pxNow = npc.group.position.x;
            const chosenEntranceId = pxNow < -150 ? 'coast_exp_w_2' : (pxNow < -50 ? 'coast_w_2' : (pxNow < 30 ? 'coast_w_3' : (pxNow < 150 ? 'coast_e_2' : 'coast_exp_e_2')));
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

        // Atualiza nó atual e escolhe próximo destino com IA de exploração orgânica
        if (npc.targetNodeId) {
          npc.currentNodeId = npc.targetNodeId;
        } else {
          npc.currentNodeId = (this.getNearestRoadNode(npc.group.position.x, npc.group.position.z) ? this.getNearestRoadNode(npc.group.position.x, npc.group.position.z).id : 'alameda_crossroads');
        }
        const currNode = (this.roadNodesMap && this.roadNodesMap.get(npc.currentNodeId)) || (this.roadNodes ? this.roadNodes[0] : null);

        if (npc.pathQueue && npc.pathQueue.length > 0) {
          npc.lastNodeId = npc.currentNodeId;
          npc.targetNodeId = npc.pathQueue.shift();
        } else if (currNode && currNode.neighbors && currNode.neighbors.length > 0) {
          // 70% das vezes, o cidadão traça uma rota completa para explorar vilas, botecos, mirantes e praias das áreas expandidas!
          let planned = false;
          if (this.roadNodes && this.roadNodes.length > 0 && Math.random() < 0.70) {
            const expandedNodes = this.roadNodes.filter(n =>
              n.id !== npc.currentNodeId &&
              (n.id.startsWith('exp_') || n.id.startsWith('coast_exp_') || Math.abs(n.x) >= 110 || n.z <= -105)
            );
            const allDestNodes = this.roadNodes.filter(n => n.id !== npc.currentNodeId);
            const destPool = (expandedNodes.length > 0 && Math.random() < 0.68) ? expandedNodes : allDestNodes;
            if (destPool.length > 0) {
              const destNode = destPool[Math.floor(Math.random() * destPool.length)];
              const fullPath = this.findRoadPath(npc.currentNodeId, destNode.id);
              if (fullPath && fullPath.length > 1) {
                npc.lastNodeId = npc.currentNodeId;
                npc.pathQueue = fullPath.slice(1);
                npc.targetNodeId = npc.pathQueue.shift();
                planned = true;
              }
            }
          }
          if (!planned) {
            const nonBacktrack = currNode.neighbors.filter(nid => nid !== npc.lastNodeId);
            const pool = (nonBacktrack.length > 0) ? nonBacktrack : currNode.neighbors;
            npc.lastNodeId = npc.currentNodeId;
            npc.targetNodeId = pool[Math.floor(Math.random() * pool.length)];
          }
        } else {
          npc.targetNodeId = npc.currentNodeId;
        }

        const targetNode = (this.roadNodesMap && this.roadNodesMap.get(npc.targetNodeId)) || currNode;
        if (targetNode) {
          const nextWp = targetNode.position.clone();
          const isPierSegment = (
            targetNode.id === 'beach_west_pier' ||
            targetNode.id === 'beach_west_pier_entry' ||
            (currNode && (currNode.id === 'beach_west_pier' || currNode.id === 'beach_west_pier_entry'))
          );
          if (isPierSegment) {
            // Mantém quem sobe/desce a rampa e o tablado do píer rigorosamente alinhado entre os guarda-corpos (x = -78.0 ± 0.55m)
            const pierLane = Math.max(-0.55, Math.min(0.55, (npc.laneOffset || 0) * 0.4));
            if (targetNode.id === 'beach_west_pier' || targetNode.id === 'beach_west_pier_entry') {
              nextWp.x = -78.0 + pierLane;
            }
          } else if (npc.role !== 'Jogador da Pelada') {
            if (npc.laneOffset === undefined) {
              npc.laneOffset = ((Math.sin(npc.seed || 1.0) * 0.85)) + (Math.random() - 0.5) * 0.35;
            }
            // Deslocamento lateral perpendicular à direção da via para que cidadãos caminhem lado a lado e nunca em fila indiana robótica
            const segDx = targetNode.x - (currNode ? currNode.x : npc.group.position.x);
            const segDz = targetNode.z - (currNode ? currNode.z : npc.group.position.z);
            const segLen = Math.hypot(segDx, segDz) || 1.0;
            const perpX = -segDz / segLen;
            const perpZ = segDx / segLen;
            nextWp.x += perpX * npc.laneOffset + (Math.random() - 0.5) * 0.55;
            nextWp.z += perpZ * npc.laneOffset + (Math.random() - 0.5) * 0.55;
          }
          nextWp.y = this.getFloorElevation(nextWp.x, nextWp.z);
          npc.targetPos = nextWp;

          // Descrições contextuais vivas e paradas orgânicas nas vilas expandidas
          if (targetNode.id.startsWith('alameda')) {
            npc.currentAction = 'Caminhando pela Alameda do Samba sob os pergolados floridos';
          } else if (targetNode.id === 'sol_mirante') {
            npc.waitTimer = 4.0 + Math.random() * 4.0;
            npc.group.rotation.y = 0.0;
            npc.currentAction = 'Apreciando a vista panorâmica do oceano no Mirante Sul da Praça';
          } else if (targetNode.id === 'sol_plaza_center') {
            npc.currentAction = 'Cruzando o tablado central da Praça do Samba';
          } else if (targetNode.id.startsWith('exp_w')) {
            if (targetNode.id === 'exp_w_2' || targetNode.id === 'exp_w_4') {
              npc.waitTimer = 2.2 + Math.random() * 3.5;
            }
            npc.currentAction = `Explorando a vila e ladeiras do Vale do Poente (${targetNode.desc || 'Expansão Oeste'})`;
          } else if (targetNode.id.startsWith('exp_e')) {
            if (targetNode.id === 'exp_e_2' || targetNode.id === 'exp_e_4') {
              npc.waitTimer = 2.2 + Math.random() * 3.5;
            }
            npc.currentAction = `Passeando pela vila e curvas do Vale do Levante (${targetNode.desc || 'Expansão Leste'})`;
          } else if (targetNode.id.startsWith('exp_n')) {
            if (targetNode.id === 'exp_n_center') {
              npc.waitTimer = 2.8 + Math.random() * 3.8;
            }
            npc.currentAction = `Caminhando pela Vila da Sela da Serra no Alto Norte`;
          } else if (targetNode.id.startsWith('coast_exp_')) {
            npc.currentAction = 'Caminhando pela orla das praias expandidas do continente';
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
            npc.currentAction = 'Caminhando pelas ruas da comunidade';
          }
        }
      } else if (dist >= arriveDist) {
        const normX = dirX / dist;
        const normZ = dirZ / dist;

        // Cadência orgânica de caminhada humana com leve ondulação natural de trajetória
        const paceWave = 0.90 + 0.14 * Math.sin(time * 0.65 + (npc.seed || 0));
        const swayAngle = Math.sin(time * 1.4 + (npc.seed || 0) * 2.3) * 0.045;
        const moveX = normX * Math.cos(swayAngle) - normZ * Math.sin(swayAngle);
        const moveZ = normX * Math.sin(swayAngle) + normZ * Math.cos(swayAngle);

        const moveStep = Math.min(dist, npc.speed * paceWave * delta);
        npc.group.position.x += moveX * moveStep;
        npc.group.position.z += moveZ * moveStep;

        const angle = Math.atan2(moveX, moveZ);
        let rotDiff = angle - npc.group.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        npc.group.rotation.y += rotDiff * (1.0 - Math.exp(-9.5 * delta));

        npc.walkCycle += delta * (7.5 * (npc.speedMult || 1.0));
        const swing = Math.sin(npc.walkCycle) * 0.55;
        const strideBob = Math.abs(Math.sin(npc.walkCycle)) * 0.042;
        const turnBank = THREE.MathUtils.clamp(rotDiff * 0.24, -0.09, 0.09);

        if (npc.leftLeg) npc.leftLeg.rotation.x = dampLimb(npc.leftLeg.rotation.x, swing, 16.0, delta);
        if (npc.rightLeg) npc.rightLeg.rotation.x = dampLimb(npc.rightLeg.rotation.x, -swing, 16.0, delta);

        // Balanço orgânico de ombros/tronco + stride bob + inclinação natural em curvas
        if (npc.torso) {
          npc.torso.position.y = dampLimb(npc.torso.position.y, TORSO_BASE_Y + strideBob, 18.0, delta);
          npc.torso.rotation.x = dampLimb(npc.torso.rotation.x, 0.045, 10.0, delta);
          npc.torso.rotation.y = dampLimb(npc.torso.rotation.y, -swing * 0.14, 14.0, delta);
          npc.torso.rotation.z = dampLimb(npc.torso.rotation.z, Math.cos(npc.walkCycle) * 0.04 + turnBank, 12.0, delta);
        }

        // Aceno e gestos comunitários orgânicos (respeitando quem carrega cesto/bebida na mão esquerda)
        const carryingLeft = Boolean(npc.handItem && npc.handItem.visible);
        if (npc.greetingTimer > 0) {
          npc.greetingTimer -= delta;
          if (npc.rightArm) {
            npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, -1.15 * Math.sin(npc.greetingTimer * Math.PI / 1.2), 18.0, delta);
            npc.rightArm.position.y = ARM_BASE_Y + strideBob;
          }
          if (npc.leftArm) {
            npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, carryingLeft ? -0.55 : -swing * 0.45, 16.0, delta);
            npc.leftArm.position.y = ARM_BASE_Y + strideBob;
          }
        } else {
          if (npc.leftArm) {
            npc.leftArm.rotation.x = dampLimb(npc.leftArm.rotation.x, carryingLeft ? (-0.52 + Math.sin(npc.walkCycle) * 0.08) : -swing * 0.65, 16.0, delta);
            npc.leftArm.position.y = ARM_BASE_Y + strideBob;
          }
          if (npc.rightArm) {
            npc.rightArm.rotation.x = dampLimb(npc.rightArm.rotation.x, swing * 0.65, 16.0, delta);
            npc.rightArm.position.y = ARM_BASE_Y + strideBob;
          }
        }

        // Rotação orgânica do olhar e leve acompanhamento da cabeça
        if (npc.head) {
          npc.head.position.y = dampLimb(npc.head.position.y, HEAD_BASE_Y + strideBob * 0.85, 18.0, delta);
          npc.glanceTimer = (npc.glanceTimer || 3.0) - delta;
          if (npc.glanceTimer <= 0) {
            npc.glanceTimer = 2.5 + Math.random() * 4.5;
            npc.targetHeadRotY = (Math.random() - 0.5) * 0.45;
          }
          npc.head.rotation.y = dampLimb(npc.head.rotation.y, (npc.targetHeadRotY || 0) + THREE.MathUtils.clamp(rotDiff * 0.25, -0.22, 0.22), 5.0, delta);
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
              const curY = npc.group.position.y || (this.terrain ? this.terrain.getElevation(npc.group.position.x, npc.group.position.z) : 0);
              const safeRoad = this.getNearestRoadNode(npc.group.position.x, npc.group.position.z, curY);
              if (safeRoad) {
                npc.group.position.set(safeRoad.x, this.getFloorElevation(safeRoad.x, safeRoad.z), safeRoad.z);
              }
            }
          }
          if (!npc.stuckLastPos) npc.stuckLastPos = new THREE.Vector3();
          npc.stuckLastPos.copy(npc.group.position);
        }
      }
    });

    // Physics Spatial Separation: Otimizado com bounding check Manhattan rápido antes de Math.sqrt (60 FPS fluidos em 1x a 5x)
    const minDist = 0.88;
    const minDistSq = minDist * minDist;
    for (let i = 0; i < this.npcs.length; i++) {
      const n1 = this.npcs[i];
      const p1 = n1.group.position;
      const n1Static = n1.isSitting || n1.isScenicMirante || n1.isBeachSeated || n1.isBarraqueiro || n1.isAthlete || n1.isCalistenia || n1.isCapoeira || n1.isHorta || n1.isMototaxi || n1.isSurfer || n1.isFisherman;

      for (let j = i + 1; j < this.npcs.length; j++) {
        const n2 = this.npcs[j];
        const p2 = n2.group.position;
        const n2Static = n2.isSitting || n2.isScenicMirante || n2.isBeachSeated || n2.isBarraqueiro || n2.isAthlete || n2.isCalistenia || n2.isCapoeira || n2.isHorta || n2.isMototaxi || n2.isSurfer || n2.isFisherman;
        if (n1Static && n2Static) {
          if (n1.citizenName === 'Seu Agenor' && Math.hypot(p2.x - 1.4, p2.z - 2.8) < 2.0) {
            n2.isSitting = false;
            if (n2.sittingSpot) n2.sittingSpot.isOccupied = false;
            n2.sittingSpot = null;
            p2.set(-1.0, this.getFloorElevation(-1.0, 5.6), 5.6);
            n2.targetPos = new THREE.Vector3(-1.0, p2.y, 5.6);
          } else if (n2.citizenName === 'Seu Agenor' && Math.hypot(p1.x - 1.4, p1.z - 2.8) < 2.0) {
            n1.isSitting = false;
            if (n1.sittingSpot) n1.sittingSpot.isOccupied = false;
            n1.sittingSpot = null;
            p1.set(-1.0, this.getFloorElevation(-1.0, 5.6), 5.6);
            n1.targetPos = new THREE.Vector3(-1.0, p1.y, 5.6);
          }
          continue;
        }

        const dx = p2.x - p1.x;
        if (Math.abs(dx) > minDist) continue;
        const dz = p2.z - p1.z;
        if (Math.abs(dz) > minDist) continue;
        const dSq = dx * dx + dz * dz;
        if (dSq < minDistSq && dSq > 0.0001) {
          const d = Math.sqrt(dSq);
          const push = (minDist - d);
          const nx = dx / d;
          const nz = dz / d;

          if (n1Static) {
            p2.x += nx * push;
            p2.z += nz * push;
          } else if (n2Static) {
            p1.x -= nx * push;
            p1.z -= nz * push;
          } else {
            p1.x -= nx * push * 0.5;
            p1.z -= nz * push * 0.5;
            p2.x += nx * push * 0.5;
            p2.z += nz * push * 0.5;
          }

          if ((!n1.greetingTimer || n1.greetingTimer <= 0) && (!n2.greetingTimer || n2.greetingTimer <= 0) && Math.random() < 0.20) {
            n1.greetingTimer = 1.2;
            n2.greetingTimer = 1.2;
          }
        }
      }
    }

    // PASSO FINAL DE COLISÕES, BARREIRAS E ATERRAMENTO EXATO:
    // Garante que caminhantes, carreteiros, construtores e sambistas em trânsito nunca atravessem paredes/estruturas nem flutuem!
    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];
      const pos = npc.group.position;

      if (npc.isBarraqueiro && npc.assignedStall && npc.assignedStall.vendorSpot) {
        pos.copy(npc.assignedStall.vendorSpot);
        npc.group.rotation.y = 0;
        continue;
      }

      const isMovableLandNPC =
        !npc.isSitting &&
        !npc.isBeachSeated &&
        !npc.isScenicMirante &&
        !npc.isBarraqueiro &&
        !npc.isFisherman &&
        !npc.isAthlete &&
        !npc.isCapoeira &&
        !npc.isHorta &&
        !npc.isMototaxi &&
        !npc.isSurfer &&
        !npc.isCalistenia &&
        npc.role !== 'Jogador da Pelada' &&
        !(npc.sambaState && npc.sambaState.isActive) &&
        !(npc.beachState && (npc.beachState.mode === 'swimming_chest' || npc.beachState.mode === 'to_swimming' || npc.beachState.mode === 'exiting_water'));

      if (isMovableLandNPC) {
        this.resolveHouseAndWorldObstacles(npc, delta);
      }

      // Aterramento exato final no piso triangulado (exceto poses especiais que controlam o próprio Y)
      if (npc.builderState !== 'celebrating' && !npc.isScenicMirante && !npc.isSitting && !npc.isBeachCustomY && !npc.isBeachSeated && !npc.isBarraqueiro && !npc.isAthlete && !npc.isCalistenia && !(npc.sambaState && npc.sambaState.isActive && npc.sambaState.slotIndex < 10)) {
        pos.y = this.getFloorElevation(pos.x, pos.z);
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
    this._sambaSlots = null;
    this.cleanKite();
    if (this.arch && this.arch.botecoSpots) {
      this.arch.botecoSpots.forEach(s => s.isOccupied = false);
    }
    if (this.arch && this.arch.alamedaBenches) {
      this.arch.alamedaBenches.forEach(b => b.isOccupied = false);
    }
    if (this.arch && this.arch.beachChairSpots) {
      this.arch.beachChairSpots.forEach(c => { c.isOccupied = false; c.occupant = null; });
    }
    if (this.arch && this.arch.beachBonfires) {
      this.arch.beachBonfires.forEach(bf => {
        if (bf.seats) bf.seats.forEach(s => { s.isOccupied = false; s.occupant = null; });
      });
    }

    // Limpar moradores
    this.npcs.forEach(n => {
      if (n.swimRing) {
        this.group.remove(n.swimRing);
      }
      this.group.remove(n.group);
      if (n.group.geometry) n.group.geometry.dispose();
    });
    this.npcs = [];
    
    // Purga completa de quaisquer malhas filhas residuais no grupo
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    this.civCount = 1000;
    this.playerCount = 0;
    this.sambaSparks = [];
  }
}

Object.assign(NPCManager.prototype, RoadGraphMixin, PopulationMixin, WorkersMixin, KiteMixin, SambaMixin, BeachBehaviorsMixin);
