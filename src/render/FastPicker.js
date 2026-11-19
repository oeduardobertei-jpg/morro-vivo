import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// Ativa globalmente a aceleração BVH para todos os Meshes e BufferGeometries do Three.js
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/**
 * FastPicker.js
 * Sistema de seleção (Raycasting) ultra-rápido em 2 estágios:
 * 1. Pré-filtragem por Bounding Sphere em espaço de mundo (< 0.04ms) sem alocar arrays.
 * 2. Raycast de malha acelerado por BVH (three-mesh-bvh) apenas nos candidatos cujo volume foi atingido.
 */
export class FastPicker {
  constructor(camera, architecture, npcs) {
    this.camera = camera;
    this.arch = architecture;
    this.npcs = npcs;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true;

    this._sphere = new THREE.Sphere();
    this._center = new THREE.Vector3();
    this.lastPickMs = 0;
  }

  _ensureBVH(rootObject, refKey, refVal) {
    if (!rootObject) return;
    rootObject.traverse(child => {
      if (child.isMesh && child.geometry) {
        child.userData[refKey] = refVal;
        if (!child.geometry.boundsTree) {
          try {
            child.geometry.computeBoundsTree();
          } catch (e) {}
        }
      }
    });
  }

  /**
   * Executa o picking instantâneo para as coordenadas normalizadas do mouse (NDC -1..1).
   */
  pick(ndcVec2) {
    const t0 = performance.now();
    this.raycaster.setFromCamera(ndcVec2, this.camera);
    const ray = this.raycaster.ray;
    const camPos = this.camera.position;

    // 1. Testar NPCs (esfera rápida r = 1.25m)
    const npcCandidates = [];
    if (this.npcs && this.npcs.npcs) {
      const list = this.npcs.npcs;
      for (let i = 0; i < list.length; i++) {
        const n = list[i];
        if (!n || !n.group || !n.group.visible) continue;
        const p = n.group.position;
        this._sphere.center.set(p.x, p.y + 0.9, p.z);
        this._sphere.radius = 1.25;
        if (ray.intersectsSphere(this._sphere)) {
          npcCandidates.push({ npc: n, distSq: camPos.distanceToSquared(this._sphere.center) });
        }
      }
    }

    npcCandidates.sort((a, b) => a.distSq - b.distSq);
    for (let i = 0; i < npcCandidates.length; i++) {
      const cand = npcCandidates[i].npc;
      this._ensureBVH(cand.group, 'npcRef', cand);
      const hits = this.raycaster.intersectObject(cand.group, true);
      if (hits.length > 0) {
        this.lastPickMs = performance.now() - t0;
        return { type: 'npc', data: cand };
      }
    }

    // 2. Testar Veículos de Mobilidade (Bondinhos, Mototáxis & Barcos Pesqueiros em movimento)
    const mobilityList = [
      ...(this.arch.cableCars || []),
      ...(this.arch.movingMototaxis || []),
      ...(this.arch.expeditionBoats || [])
    ];
    for (let i = 0; i < mobilityList.length; i++) {
      const mob = mobilityList[i];
      if (!mob || !mob.group) continue;
      const p = mob.group.position;
      this._sphere.center.set(p.x, p.y, p.z);
      this._sphere.radius = mob.type === 'fishingBoat' ? 3.2 : 2.2;
      if (ray.intersectsSphere(this._sphere)) {
        this._ensureBVH(mob.group, 'mobilityRef', mob);
        const hits = this.raycaster.intersectObject(mob.group, true);
        if (hits.length > 0) {
          this.lastPickMs = performance.now() - t0;
          return { type: 'mobility', data: mob };
        }
      }
    }

    // 3. Testar Casas (esfera rápida r = 4.6m)
    const houseCandidates = [];
    if (this.arch && this.arch.houses) {
      const hList = this.arch.houses;
      for (let i = 0; i < hList.length; i++) {
        const h = hList[i];
        if (!h || !h.meshGroup || !h.meshGroup.visible) continue;
        const p = h.meshGroup.position;
        this._sphere.center.set(p.x, p.y + 1.8, p.z);
        this._sphere.radius = 4.6;
        if (ray.intersectsSphere(this._sphere)) {
          houseCandidates.push({ house: h, distSq: camPos.distanceToSquared(this._sphere.center) });
        }
      }
    }

    houseCandidates.sort((a, b) => a.distSq - b.distSq);
    for (let i = 0; i < houseCandidates.length; i++) {
      const cand = houseCandidates[i].house;
      this._ensureBVH(cand.meshGroup, 'houseRef', cand);
      const hits = this.raycaster.intersectObject(cand.meshGroup, true);
      if (hits.length > 0) {
        this.lastPickMs = performance.now() - t0;
        return { type: 'house', data: cand };
      }
    }

    this.lastPickMs = performance.now() - t0;
    return null;
  }
}

