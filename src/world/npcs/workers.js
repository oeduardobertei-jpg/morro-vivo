import * as THREE from 'three';

/** Obras: carreteiros e operários recrutados para os canteiros. */
export const WorkersMixin = {
  // DISPATCH WHEELBARROW COURIER FROM OLARIA WITH BRICK SUPPLIES
  dispatchCourierWithSupplies(siteData, onDelivered) {
    const candidates = this.npcs.filter(npc => !npc.isBuilder && !npc.isCourier && !npc.isScenicMirante && !npc.isBarraqueiro && !npc.isFisherman && !npc.isAthlete && !npc.isMateiro && !npc.isCapoeira && !npc.isHorta && !npc.isMototaxi && !npc.isSurfer && !npc.isCalistenia && npc.role !== 'Jogador da Pelada');
    if (candidates.length === 0) {
      if (onDelivered) onDelivered();
      return null;
    }

    const olariaPos = { x: -20, z: -14 };
    candidates.sort((a, b) => {
      const da = Math.hypot(a.group.position.x - olariaPos.x, a.group.position.z - olariaPos.z);
      const db = Math.hypot(b.group.position.x - olariaPos.x, b.group.position.z - olariaPos.z);
      return da - db;
    });

    const courier = candidates[0];
    courier.isCourier = true;
    courier.courierState = 'traveling_to_site';
    courier.courierSite = siteData;
    courier.onDelivered = onDelivered;
    courier.waitTimer = 0;
    courier.cartRattleTimer = 0;

    // Equip pushcart & hide tools
    courier.cartGroup.visible = true;
    courier.hat.visible = true;
    courier.builderHelmet.visible = false;
    courier.toolArm.visible = false;

    // Inicia no cais de carga da Olaria
    courier.group.position.set(
      olariaPos.x,
      this.getFloorElevation(olariaPos.x, olariaPos.z),
      olariaPos.z
    );
    courier.currentNodeId = 'olaria_dock';

    // Roteamento inteligente por vias pavimentadas até o lote
    const destRoadNode = this.getNearestRoadNode(siteData.plateau.x, siteData.plateau.z);
    const courierPath = this.findRoadPath('olaria_dock', destRoadNode ? destRoadNode.id : 'olaria_dock');
    courier.pathQueue = courierPath.slice(1);
    if (courier.pathQueue.length > 0) {
      courier.targetNodeId = courier.pathQueue.shift();
      const nextNd = this.roadNodesMap.get(courier.targetNodeId);
      courier.targetPos = nextNd ? nextNd.position.clone() : new THREE.Vector3(siteData.plateau.x, siteData.plateau.y, siteData.plateau.z);
    } else {
      courier.targetPos = new THREE.Vector3(siteData.plateau.x, siteData.plateau.y, siteData.plateau.z);
    }
    courier.speed = 2.6; // brisk pushing pace

    const districtName = siteData.plateau.faction ? siteData.plateau.faction.toUpperCase() : 'o canteiro';
    courier.currentAction = `🚚 Carreto comunitário: transportando tijolos da Olaria para ${districtName}`;

    if (this.soundtrack) {
      this.soundtrack.playCartRattle(courier.group.position);
    }

    return courier;
  },

  // RELEASE COURIER UPON SUPPLY DELIVERY
  releaseCourier(npc) {
    npc.isCourier = false;
    npc.courierState = 'idle';
    npc.courierSite = null;
    npc.onDelivered = null;
    npc.cartGroup.visible = false;
    npc.speed = 1.8 + Math.random() * 0.6;
    npc.currentAction = 'Retornando da entrega de tijolos';

    let nearestWpIdx = 0;
    let minDist = 9999;
    for (let i = 0; i < npc.waypoints.length; i++) {
      const wp = npc.waypoints[i];
      const d = Math.hypot(npc.group.position.x - wp.x, npc.group.position.z - wp.z);
      if (d < minDist) {
        minDist = d;
        nearestWpIdx = i;
      }
    }
    npc.currentWpIndex = nearestWpIdx;
    npc.targetPos = npc.waypoints[nearestWpIdx].clone();
    if (this.terrain) {
      npc.targetPos.y = this.terrain.getElevation(npc.targetPos.x, npc.targetPos.z);
    }
  },

  // RECRUIT REAL CITIZENS FROM THE WORKING POPULATION AS BUILDERS
  recruitWorkersForSite(siteData, count = 2) {
    const candidates = this.npcs.filter(npc => !npc.isBuilder && !npc.isCourier && !npc.isScenicMirante && !npc.isBarraqueiro && !npc.isFisherman && !npc.isAthlete && !npc.isMateiro && !npc.isCapoeira && !npc.isHorta && !npc.isMototaxi && !npc.isSurfer && !npc.isCalistenia && npc.role !== 'Jogador da Pelada');
    if (candidates.length === 0) return [];

    // Sort by proximity to site to choose nearby citizens
    candidates.sort((a, b) => {
      const da = Math.hypot(a.group.position.x - siteData.plateau.x, a.group.position.z - siteData.plateau.z);
      const db = Math.hypot(b.group.position.x - siteData.plateau.x, b.group.position.z - siteData.plateau.z);
      return da - db;
    });

    const recruited = candidates.slice(0, count);

    // 1. Identifica o nó de rua mais próximo do canteiro de obras
    const plotY = siteData.plateau.y || (this.terrain ? this.terrain.getElevation(siteData.plateau.x, siteData.plateau.z) : 2.0);
    const plotRoadNode = this.getNearestRoadNode(siteData.plateau.x, siteData.plateau.z, plotY);
    const roadX = plotRoadNode ? plotRoadNode.x : siteData.plateau.x;
    const roadZ = plotRoadNode ? plotRoadNode.z : siteData.plateau.z;

    // Ângulo do centro do lote em direção à rua pavimentada de acesso
    const toRoadAngle = Math.atan2(roadX - siteData.plateau.x, roadZ - siteData.plateau.z);

    recruited.forEach((npc, idx) => {
      npc.isBuilder = true;
      npc.builderState = 'traveling';
      npc.assignedSite = siteData;
      npc.waitTimer = 0; // Cancela qualquer pausa imediatamente

      // Equipamento do operário
      npc.builderHelmet.visible = true;
      npc.hat.visible = false;
      npc.toolArm.visible = true;
      npc.torso.material.color.setHex(0xF97316); // Colete refletivo de alta visibilidade!

      // Ponto de trabalho perimetral externo (raio 3.4m voltado para a rua de acesso - NUNCA dentro da casa ou sobre o pad de terraplanagem!)
      const angleOffset = (idx === 0 ? -0.42 : 0.42);
      const spotAngle = toRoadAngle + angleOffset;
      const radius = 3.4; // 3.4m garante que fique no calçamento/guia da rua, fora do pad de terraplanagem (4.4x4.0)
      const spotX = siteData.plateau.x + Math.sin(spotAngle) * radius;
      const spotZ = siteData.plateau.z + Math.cos(spotAngle) * radius;
      const spotY = this.terrain ? this.terrain.getElevation(spotX, spotZ) : plotY;

      npc.workerSpot = new THREE.Vector3(spotX, spotY, spotZ);
      npc.speed = 2.4; // passo firme e cadenciado

      // 2. Roteamento viário: trajeto via ruas pavimentadas até a esquina da obra
      const curY = npc.group.position.y || (this.terrain ? this.terrain.getElevation(npc.group.position.x, npc.group.position.z) : 0);
      const workerStartNode = this.getNearestRoadNode(npc.group.position.x, npc.group.position.z, curY);
      const roadPath = this.findRoadPath(workerStartNode.id, plotRoadNode ? plotRoadNode.id : workerStartNode.id);

      npc.builderPathQueue = roadPath.slice(1);
      if (npc.builderPathQueue.length > 0) {
        npc.builderTargetNodeId = npc.builderPathQueue.shift();
        const nxt = this.roadNodesMap.get(npc.builderTargetNodeId);
        npc.targetPos = nxt ? nxt.position.clone() : npc.workerSpot.clone();
      } else {
        npc.builderTargetNodeId = null;
        npc.targetPos = npc.workerSpot.clone();
      }

      const districtName = siteData.plateau.faction ? siteData.plateau.faction.toUpperCase() : 'novo lote';
      npc.currentAction = `👷 A caminho da obra em ${districtName} pelas ruas com ferramentas de alvenaria`;
    });

    return recruited;
  },

  // RELEASE WORKERS BACK TO CIVILIAN LIFE UPON PROJECT COMPLETION
  releaseWorker(npc) {
    npc.isBuilder = false;
    npc.builderState = 'idle';
    npc.assignedSite = null;
    npc.workerSpot = null;
    npc.builderPathQueue = null;
    npc.builderTargetNodeId = null;
    npc.cheerTimer = 0;

    // Unequip gear and restore civilian clothing
    if (npc.builderHelmet) npc.builderHelmet.visible = false;
    if (npc.hat) npc.hat.visible = true;
    if (npc.toolArm) {
      npc.toolArm.visible = false;
      npc.toolArm.rotation.set(0, 0, 0);
    }
    if (npc.torso) {
      npc.torso.rotation.set(0, 0, 0);
      if (npc.originalColor !== undefined) {
        npc.torso.material.color.setHex(npc.originalColor);
      }
    }

    npc.speed = 1.8 + Math.random() * 0.6;

    // Reconecta instantaneamente ao grafo viário da comunidade
    const curY = (this.terrain ? this.terrain.getElevation(npc.group.position.x, npc.group.position.z) : npc.group.position.y) || 0;
    const nearestNode = this.getNearestRoadNode(npc.group.position.x, npc.group.position.z, curY);
    if (nearestNode) {
      npc.currentNodeId = nearestNode.id;
      if (nearestNode.neighbors && nearestNode.neighbors.length > 0) {
        npc.targetNodeId = nearestNode.neighbors[Math.floor(Math.random() * nearestNode.neighbors.length)];
      } else {
        npc.targetNodeId = nearestNode.id;
      }
      const targetNode = this.roadNodesMap ? this.roadNodesMap.get(npc.targetNodeId) : null;
      npc.targetPos = targetNode ? targetNode.position.clone() : nearestNode.position.clone();
      npc.targetPos.y = this.getFloorElevation(npc.targetPos.x, npc.targetPos.z);
    } else if (npc.waypoints && npc.waypoints.length > 0) {
      npc.targetPos = npc.waypoints[0].clone();
      npc.targetPos.y = this.getFloorElevation(npc.targetPos.x, npc.targetPos.z);
    }
    npc.pathQueue = [];
    npc.waitTimer = 1.0;
    npc.currentAction = 'Retornando à rotina comunitária após entrega da obra';
  }
};
