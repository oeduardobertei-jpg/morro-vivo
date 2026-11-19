import * as THREE from 'three';

/**
 * Culling por contribuição de tela.
 * Agrupa as meshes em "unidades" do tamanho de um prop (casa, palmeira, morador) e
 * esconde da câmera as unidades que ocupariam poucos pixels. Usa `layers` em vez de
 * `visible`, então não interfere com o código que já controla a visibilidade.
 * Como o shadow pass respeita as layers da câmera, as sombras também são poupadas.
 */
export class ContributionCuller {
  constructor(scene, camera, renderer, opts = {}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.enabled = opts.enabled !== false;
    this.minPixels = opts.minPixels ?? 4;          // diâmetro mínimo na tela (px)
    this.maxUnitRadius = opts.maxUnitRadius ?? 9;  // maior prop tratado como unidade
    this.interval = opts.interval ?? 0.25;         // segundos entre passes
    this.rescanEvery = opts.rescanEvery ?? 45;     // segundos entre varreduras completas da cena
    this.tinyShadowRadius = opts.tinyShadowRadius ?? 0.4;
    this.units = [];
    this.stats = { units: 0, culledUnits: 0, culledMeshes: 0, totalMeshes: 0 };
    this._acc = 0;
    this._sinceScan = Infinity;
    this._pos = new THREE.Vector3();
  }

  /** Restaura tudo e reconstrói as unidades a partir da cena atual. */
  collect() {
    for (const u of this.units) if (u.culled) this._apply(u, false);
    this.units = [];
    this.scene.updateMatrixWorld(true);

    const boxes = new Map();
    const hasInstanced = new Map();
    const build = (node) => {
      const box = new THREE.Box3();
      let inst = false;
      if (node.isMesh && node.geometry) {
        if (node.isInstancedMesh) inst = true;
        else {
          if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
          box.copy(node.geometry.boundingBox).applyMatrix4(node.matrixWorld);
        }
      }
      for (const c of node.children) {
        const r = build(c);
        if (!r.isEmpty()) box.union(r);
        if (hasInstanced.get(c)) inst = true;
      }
      boxes.set(node, box);
      hasInstanced.set(node, inst);
      return box;
    };
    build(this.scene);

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    const meshesOf = (node, out) => {
      if (node.isMesh && !node.isInstancedMesh && !node.userData.__batched) out.push(node);
      for (const c of node.children) meshesOf(c, out);
      return out;
    };
    const makeUnit = (root, box, meshes) => {
      if (!meshes.length || box.isEmpty()) return;
      box.getSize(size);
      box.getCenter(center);
      root.updateWorldMatrix(true, false);
      const rp = new THREE.Vector3().setFromMatrixPosition(root.matrixWorld);
      this.units.push({
        root, meshes, radius: size.length() / 2, offset: center.clone().sub(rp), culled: false
      });
    };
    const assign = (node) => {
      if (node === this.scene) { node.children.forEach(assign); return; }
      const box = boxes.get(node);
      if (!box || box.isEmpty() || node.isLight) return;
      box.getSize(size);
      const r = size.length() / 2;
      if (r <= this.maxUnitRadius && !hasInstanced.get(node)) {
        makeUnit(node, box, meshesOf(node, []));
        return;
      }
      if (node.isMesh && !node.isInstancedMesh && node.geometry) {
        if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
        makeUnit(node, node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld), [node]);
      }
      node.children.forEach(assign);
    };
    assign(this.scene);

    // Sombras de props minúsculos não aparecem na tela: poupa o shadow pass.
    for (const u of this.units) {
      if (u.radius < this.tinyShadowRadius) for (const m of u.meshes) m.castShadow = false;
    }

    let total = 0;
    for (const u of this.units) total += u.meshes.length;
    this.stats.units = this.units.length;
    this.stats.totalMeshes = total;
    this._sinceScan = 0;
  }

  _apply(u, cull) {
    u.culled = cull;
    for (const m of u.meshes) {
      if (m.userData.__batched) continue;
      if (cull) m.layers.disable(0);
      else m.layers.enable(0);
    }
  }

  pass() {
    const cam = this.camera;
    cam.updateMatrixWorld();
    const camPos = cam.position;
    const k = this.renderer.domElement.clientHeight / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    let culledUnits = 0, culledMeshes = 0;
    for (const u of this.units) {
      const e = u.root.matrixWorld.elements;
      const dx = e[12] + u.offset.x - camPos.x;
      const dy = e[13] + u.offset.y - camPos.y;
      const dz = e[14] + u.offset.z - camPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
      const px = (2 * u.radius / dist) * k;
      const want = u.culled ? px < this.minPixels * 1.25 : px < this.minPixels;
      if (want !== u.culled) this._apply(u, want);
      if (u.culled) { culledUnits++; culledMeshes += u.meshes.length; }
    }
    this.stats.culledUnits = culledUnits;
    this.stats.culledMeshes = culledMeshes;
  }

  update(delta) {
    if (!this.enabled) return;
    this._acc += delta;
    this._sinceScan += delta;
    if (this._sinceScan >= this.rescanEvery) {
      this.collect();
      this._acc = this.interval;
    }
    if (this._acc >= this.interval) {
      this._acc = 0;
      this.pass();
    }
  }
}
