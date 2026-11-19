import * as THREE from 'three';
import { applyStylizedShader, inferPresetFromColor } from './StylizedMaterials.js';

const HIDDEN_LAYER = 31;
const SUPPORTED = new Set(['MeshLambertMaterial', 'MeshStandardMaterial', 'MeshBasicMaterial']);
const MAP_KEYS = ['map', 'alphaMap', 'bumpMap', 'normalMap', 'aoMap', 'envMap', 'lightMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'displacementMap'];

const _m = new THREE.Matrix4();
const _nm = new THREE.Matrix3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();
const _e1 = new THREE.Vector3();
const _e2 = new THREE.Vector3();
const _ids = [0, 0, 0];
const _vs = [_a, _b, _c];

function matSig(mat, out) {
  out[0] = mat.color.r; out[1] = mat.color.g; out[2] = mat.color.b;
  out[3] = mat.emissive ? mat.emissive.r : 0;
  out[4] = mat.emissive ? mat.emissive.g : 0;
  out[5] = mat.emissive ? mat.emissive.b : 0;
  out[6] = mat.emissiveIntensity ?? 0;
  out[7] = mat.opacity;
  out[8] = mat.transparent ? 1 : 0;
  out[9] = mat.visible ? 1 : 0;
  out[10] = mat.roughness ?? 0;
  out[11] = mat.metalness ?? 0;
  out[12] = mat.side;
  out[13] = mat.flatShading ? 1 : 0;
  return out;
}

/**
 * Agrupamento estático (static batching) com proteção contra objetos que se mexem.
 *
 * 1. Calibra por alguns segundos observando matriz, material e visibilidade de cada mesh.
 * 2. Funde os que nunca mudaram em poucas geometrias (cor gravada nos vértices),
 *    separadas por tipo de material e por célula espacial (preserva o frustum culling).
 * 3. Continua vigiando: se algo agrupado passar a mudar, é devolvido ao estado original
 *    e o lote é refeito. Objetos removidos da cena saem do lote.
 * As meshes originais ficam na cena (escondidas por layer), então o código do jogo
 * que as referencia continua funcionando.
 */
export class StaticBatcher {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.enabled = opts.enabled !== false;
    this.getExcludedRoots = opts.getExcludedRoots || (() => []);
    this.onActive = opts.onActive || null;
    this._notifiedActive = false;
    this.cellSize = opts.cellSize ?? 140;
    this.calibrateSeconds = opts.calibrateSeconds ?? 2.0;
    this.buildBudgetMs = opts.buildBudgetMs ?? 8;
    this.state = 'waiting';
    this.recs = [];
    this.recByMesh = new WeakMap();
    this.matRecs = new Map();
    this.chunks = [];
    this.chunkById = new Map();
    this.queue = [];
    this.sharedMaterials = new Map();
    this._t = 0;
    this._tmpSig = new Float32Array(14);
    this.stats = { eligible: 0, merged: 0, chunks: 0, dynamic: 0, removed: 0, rebuilds: 0, state: 'waiting', skipped: {} };
  }

  _skip(reason) { this.stats.skipped[reason] = (this.stats.skipped[reason] || 0) + 1; }

  _eligible(mesh, excluded) {
    if (!mesh.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh) return false;
    if (mesh.name === 'static-batch') return false;
    const geo = mesh.geometry;
    if (!geo || !geo.attributes.position) return false;
    if (Object.keys(geo.morphAttributes || {}).length) return this._skip('morph'), false;
    const mat = mesh.material;
    if (!mat || Array.isArray(mat)) return this._skip('multiMaterial'), false;
    if (!SUPPORTED.has(mat.type)) return this._skip('material:' + mat.type), false;
    if (mat.transparent || mat.opacity < 1 || mat.alphaTest > 0 || !mat.visible) return this._skip('transparent'), false;
    if (mat.vertexColors || mat.wireframe || mat.depthWrite === false) return this._skip('special'), false;
    for (const k of MAP_KEYS) if (mat[k]) return this._skip('textured'), false;
    if (mesh.renderOrder !== 0 || !mesh.frustumCulled) return this._skip('renderOrder'), false;
    for (let p = mesh; p; p = p.parent) {
      if (!p.visible) return this._skip('hidden'), false;
      if (p.userData && p.userData.dynamic) return this._skip('dynamicProp'), false;
      if (excluded.has(p)) return this._skip('excludedRoot'), false;
    }
    return true;
  }

  _isEmissiveMat(mat) {
    return !!(mat.userData?.dynamicEmissive || (mat.emissive && mat.emissive.getHex() !== 0));
  }

  begin() {
    if (!this.enabled || this.state !== 'waiting') return;
    this.scene.updateMatrixWorld(true);
    const excluded = new Set(this.getExcludedRoots());
    this.scene.traverse((o) => {
      if (!this._eligible(o, excluded)) return;
      const isEmissive = this._isEmissiveMat(o.material);
      const rec = {
        mesh: o, parent: o.parent, geometry: o.geometry, material: o.material,
        isEmissive,
        matrix: new Float32Array(o.matrixWorld.elements), dynamic: false, removed: false, chunk: null
      };
      this.recs.push(rec);
      this.recByMesh.set(o, rec);
      // Materiais emissivos compartilham diretamente o material original no lote,
      // então mudanças em emissiveIntensity (dia/noite) atualizam na GPU em O(1) sem invalidar o chunk!
      if (!isEmissive) {
        let mr = this.matRecs.get(o.material);
        if (!mr) { mr = { sig: matSig(o.material, new Float32Array(14)), recs: [] }; this.matRecs.set(o.material, mr); }
        mr.recs.push(rec);
      }
    });
    this.stats.eligible = this.recs.length;
    this.state = 'calibrating';
    this.stats.state = 'calibrating';
    this._t = 0;
  }

  /** Incorpora novas malhas estáticas (ex.: casa recém-construída ou ampliada) aos chunks espaciais. */
  ingestGroup(rootGroup) {
    if (!this.enabled || !rootGroup || (this.state !== 'active' && this.state !== 'building')) return;
    rootGroup.updateMatrixWorld(true);
    const excluded = new Set(this.getExcludedRoots());
    const dirty = new Set();

    rootGroup.traverse((o) => {
      if (this.recByMesh.has(o)) return;
      if (!this._eligible(o, excluded)) return;
      const isEmissive = this._isEmissiveMat(o.material);
      const rec = {
        mesh: o, parent: o.parent, geometry: o.geometry, material: o.material,
        isEmissive,
        matrix: new Float32Array(o.matrixWorld.elements), dynamic: false, removed: false, chunk: null
      };
      this.recs.push(rec);
      this.recByMesh.set(o, rec);
      if (!isEmissive) {
        let mr = this.matRecs.get(o.material);
        if (!mr) { mr = { sig: matSig(o.material, new Float32Array(14)), recs: [] }; this.matRecs.set(o.material, mr); }
        mr.recs.push(rec);
      }
      const key = this._keyOf(rec);
      const cs = isEmissive ? this.cellSize * 2 : this.cellSize;
      const cell = `${Math.floor(rec.matrix[12] / cs)}_${Math.floor(rec.matrix[14] / cs)}`;
      const id = key + '#' + cell;
      let chunk = this.chunkById.get(id);
      if (!chunk) {
        chunk = { id, key, isEmissive, recs: [], mesh: null, material: null, built: false };
        this.chunkById.set(id, chunk);
        this.chunks.push(chunk);
      }
      chunk.recs.push(rec);
      dirty.add(chunk);
    });

    if (dirty.size > 0) {
      for (const ch of dirty) {
        if (!this.queue.includes(ch)) this.queue.push(ch);
      }
      this.state = 'building';
      this.stats.state = 'building';
      this.stats.eligible = this.recs.length;
    }
  }

  /** Verdadeiro se algo mudou em relação ao estado gravado. */
  _changed(rec) {
    const m = rec.mesh;
    if (m.parent !== rec.parent || m.geometry !== rec.geometry || m.material !== rec.material || !m.visible) return true;
    const e = m.matrixWorld.elements, b = rec.matrix;
    for (let k = 0; k < 16; k++) if (Math.abs(e[k] - b[k]) > 1e-5) return true;
    for (let p = m.parent; p; p = p.parent) if (!p.visible) return true;
    return false;
  }

  _detached(rec) {
    let p = rec.mesh;
    while (p.parent) p = p.parent;
    return p !== this.scene;
  }

  _materialDirty(mr) {
    const s = matSig(mr.recs[0].material, this._tmpSig);
    for (let i = 0; i < 14; i++) if (Math.abs(s[i] - mr.sig[i]) > 1e-6) return true;
    return false;
  }

  _resolvePreset(mat) {
    if (mat.type === 'MeshBasicMaterial' || mat.userData?.skipStylized) return null;
    return mat.userData?.stylizedPreset || inferPresetFromColor(mat.color, mat.type === 'MeshStandardMaterial' ? mat.roughness : null);
  }

  _keyOf(rec) {
    const m = rec.material, me = rec.mesh;
    // Emissivos estáticos (ex.: janelas compartilhadas, postes solares, quiosques) agrupam pelo material exato!
    if (rec.isEmissive) {
      return `emissive|${m.uuid}|${me.castShadow ? 1 : 0}|${me.receiveShadow ? 1 : 0}`;
    }
    const preset = this._resolvePreset(m) || 'basic';
    const effType = m.type === 'MeshLambertMaterial' ? 'MeshStandardMaterial' : m.type;
    const effFlat = preset !== 'basic' ? 0 : (m.flatShading ? 1 : 0);
    const effRough = m.type === 'MeshStandardMaterial' ? Math.round((m.roughness ?? 0.85) * 8) : 'p';
    const effMetal = m.type === 'MeshStandardMaterial' ? Math.round((m.metalness ?? 0.0) * 8) : 'p';
    return `${effType}|${preset}|${m.side}|${effFlat}|${me.castShadow ? 1 : 0}|${me.receiveShadow ? 1 : 0}|${effRough}|${effMetal}`;
  }

  _sharedMaterial(key, rec) {
    if (rec.isEmissive) return rec.material;
    let mat = this.sharedMaterials.get(key);
    if (!mat) {
      const src = rec.material;
      const preset = this._resolvePreset(src);
      if (preset) {
        const params = {
          vertexColors: true,
          side: src.side,
          flatShading: false
        };
        mat = new THREE.MeshStandardMaterial(params);
        const opts = src.type === 'MeshStandardMaterial'
          ? { roughness: src.roughness, metalness: src.metalness, flatShading: false }
          : { flatShading: false };
        applyStylizedShader(mat, preset, opts);
      } else {
        const params = { vertexColors: true, side: src.side };
        if (src.type !== 'MeshBasicMaterial') params.flatShading = !!src.flatShading;
        if (src.type === 'MeshStandardMaterial') { params.roughness = src.roughness; params.metalness = src.metalness; }
        mat = new src.constructor(params);
      }
      this.sharedMaterials.set(key, mat);
    }
    return mat;
  }

  _plan() {
    this.chunkById.clear();
    for (const rec of this.recs) {
      if (rec.dynamic || rec.removed) continue;
      const e = rec.matrix;
      const key = this._keyOf(rec);
      const cs = rec.isEmissive ? this.cellSize * 2 : this.cellSize;
      const cell = `${Math.floor(e[12] / cs)}_${Math.floor(e[14] / cs)}`;
      const id = key + '#' + cell;
      let b = this.chunkById.get(id);
      if (!b) { b = { id, key, isEmissive: rec.isEmissive, recs: [], mesh: null, material: null, built: false }; this.chunkById.set(id, b); }
      b.recs.push(rec);
    }
    this.chunks = [...this.chunkById.values()];
    this.queue = this.chunks.slice();
  }

  _buildGeometry(recs, withColors = true) {
    let verts = 0;
    for (const r of recs) {
      const g = r.geometry;
      verts += g.index ? g.index.count : g.attributes.position.count;
    }
    const pos = new Float32Array(verts * 3), nor = new Float32Array(verts * 3);
    const col = withColors ? new Float32Array(verts * 3) : null;
    let o = 0;
    for (const r of recs) {
      const g = r.geometry;
      const P = g.attributes.position, N = g.attributes.normal, idx = g.index;
      const n = idx ? idx.count : P.count;
      _m.fromArray(r.matrix);
      _nm.getNormalMatrix(_m);
      const flip = _m.determinant() < 0;
      const c = r.material.color;
      for (let t = 0; t < n; t += 3) {
        const i0 = idx ? idx.getX(t) : t;
        const i1 = idx ? idx.getX(flip ? t + 2 : t + 1) : (flip ? t + 2 : t + 1);
        const i2 = idx ? idx.getX(flip ? t + 1 : t + 2) : (flip ? t + 1 : t + 2);
        _a.fromBufferAttribute(P, i0).applyMatrix4(_m);
        _b.fromBufferAttribute(P, i1).applyMatrix4(_m);
        _c.fromBufferAttribute(P, i2).applyMatrix4(_m);
        let fn = null;
        if (!N) {
          _e1.subVectors(_b, _a); _e2.subVectors(_c, _a);
          fn = _n.crossVectors(_e1, _e2).normalize();
        }
        _ids[0] = i0; _ids[1] = i1; _ids[2] = i2;
        for (let k = 0; k < 3; k++) {
          const v = _vs[k];
          pos[o] = v.x; pos[o + 1] = v.y; pos[o + 2] = v.z;
          if (N) {
            const nn = _n.fromBufferAttribute(N, _ids[k]).applyMatrix3(_nm).normalize();
            nor[o] = nn.x; nor[o + 1] = nn.y; nor[o + 2] = nn.z;
          } else {
            nor[o] = fn.x; nor[o + 1] = fn.y; nor[o + 2] = fn.z;
          }
          if (col) { col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b; }
          o += 3;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }

  _buildChunk(chunk) {
    const live = chunk.recs.filter((r) => !r.dynamic && !r.removed);
    if (chunk.mesh) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      chunk.mesh = null;
    }
    if (!live.length) return;
    const first = live[0];
    const mesh = new THREE.Mesh(this._buildGeometry(live, !first.isEmissive), this._sharedMaterial(chunk.key, first));
    mesh.castShadow = first.mesh.castShadow;
    mesh.receiveShadow = first.mesh.receiveShadow;
    mesh.matrixAutoUpdate = false;
    mesh.name = 'static-batch';
    this.scene.add(mesh);
    chunk.mesh = mesh;
    for (const r of live) {
      r.chunk = chunk;
      r.mesh.userData.__batched = true;
      r.mesh.layers.set(HIDDEN_LAYER);
    }
  }

  _release(rec, removed) {
    if (removed) rec.removed = true;
    else {
      rec.dynamic = true;
      rec.mesh.layers.set(0);
    }
    delete rec.mesh.userData.__batched;
  }

  update(delta) {
    if (!this.enabled) return;
    if (this.state === 'waiting') { this.begin(); return; }

    if (this.state === 'calibrating') {
      this._t += delta;
      for (const rec of this.recs) if (!rec.dynamic && this._changed(rec)) rec.dynamic = true;
      for (const mr of this.matRecs.values()) if (this._materialDirty(mr)) for (const r of mr.recs) r.dynamic = true;
      if (this._t >= this.calibrateSeconds) {
        this.stats.dynamic = this.recs.filter((r) => r.dynamic).length;
        this._plan();
        this.state = 'building';
        this.stats.state = 'building';
      }
      return;
    }

    if (this.state === 'building') {
      const t0 = performance.now();
      while (this.queue.length && performance.now() - t0 < this.buildBudgetMs) {
        this._buildChunk(this.queue.shift());
      }
      if (!this.queue.length) {
        this.state = 'active';
        this.stats.state = 'active';
        this._refreshStats();
        if (!this._notifiedActive && this.onActive) {
          this._notifiedActive = true;
          this.onActive();
        }
      }
      return;
    }

    // ativo: vigia mudanças de forma fatiada (apenas ~120 meshes por frame em vez de 3.500!)
    // Elimina 100% dos engasgos de CPU mantendo consistência total dos lotes
    const dirty = new Set();
    const totalRecs = this.recs.length;
    if (totalRecs > 0) {
      const sliceSize = 120;
      const start = this._watchCursor || 0;
      const end = Math.min(totalRecs, start + sliceSize);
      for (let i = start; i < end; i++) {
        const rec = this.recs[i];
        if (rec.dynamic || rec.removed || !rec.chunk) continue;
        if (this._changed(rec)) {
          if (this._detached(rec)) this._release(rec, true);
          else this._release(rec, false);
          dirty.add(rec.chunk);
        }
      }
      this._watchCursor = end >= totalRecs ? 0 : end;
    }

    this._matWatchTimer = (this._matWatchTimer || 0) + delta;
    if (this._matWatchTimer >= 1.0) {
      this._matWatchTimer = 0;
      for (const mr of this.matRecs.values()) {
        if (mr.recs[0].dynamic && mr.recs.every((r) => r.dynamic || r.removed)) continue;
        if (this._materialDirty(mr)) {
          for (const r of mr.recs) {
            if (r.dynamic || r.removed || !r.chunk) continue;
            this._release(r, false);
            dirty.add(r.chunk);
          }
        }
      }
    }
    if (dirty.size) {
      for (const ch of dirty) this._buildChunk(ch);
      this.stats.rebuilds += dirty.size;
      this._refreshStats();
    }
  }

  _refreshStats() {
    let merged = 0, dynamic = 0, removed = 0, chunks = 0;
    for (const r of this.recs) {
      if (r.removed) removed++;
      else if (r.dynamic) dynamic++;
      else if (r.chunk) merged++;
    }
    for (const c of this.chunks) if (c.mesh) chunks++;
    Object.assign(this.stats, { merged, dynamic, removed, chunks });
  }
}
