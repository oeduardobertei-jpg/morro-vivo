/**
 * Monitor de desempenho (F3 ou ?debug na URL).
 * Mostra FPS, draw calls, triângulos e o tempo de CPU de cada subsistema por frame.
 */
export class PerfMonitor {
  constructor(renderer) {
    this.renderer = renderer;
    this.visible = new URLSearchParams(location.search).has('debug');
    this.times = {};
    this.avg = {};
    this.frames = 0;
    this.acc = 0;
    this.fps = 0;
    this.el = document.createElement('div');
    this.el.id = 'perf-monitor';
    this.el.style.cssText = 'position:fixed;left:12px;bottom:76px;z-index:9999;padding:8px 10px;border-radius:10px;' +
      'background:rgba(8,16,28,.82);color:#9ef0c4;font:11px/1.45 ui-monospace,Consolas,monospace;' +
      'pointer-events:none;white-space:pre;display:none;backdrop-filter:blur(6px)';
    document.body.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') { e.preventDefault(); this.visible = !this.visible; this.render(); }
    });
    this.render();
  }

  /** Mede a duração de um trecho do frame. */
  measure(label, fn) {
    const t = performance.now();
    fn();
    this.times[label] = (this.times[label] || 0) + (performance.now() - t);
  }

  /** Chamar no fim de cada frame. */
  endFrame(delta) {
    this.frames++;
    this.acc += delta;
    if (this.acc >= 0.5) {
      this.fps = this.frames / this.acc;
      for (const k in this.times) this.avg[k] = this.times[k] / this.frames;
      this.times = {};
      this.frames = 0;
      this.acc = 0;
      this.render();
    }
  }

  snapshot() {
    const i = this.renderer.info;
    return {
      fps: +this.fps.toFixed(1),
      drawCalls: i.render.calls,
      triangles: i.render.triangles,
      geometries: i.memory.geometries,
      textures: i.memory.textures,
      cpuMs: Object.fromEntries(Object.entries(this.avg).map(([k, v]) => [k, +v.toFixed(2)]))
    };
  }

  render() {
    this.el.style.display = this.visible ? 'block' : 'none';
    if (!this.visible) return;
    const s = this.snapshot();
    const cpu = Object.entries(s.cpuMs).map(([k, v]) => `  ${k.padEnd(8)} ${v.toFixed(2)} ms`).join('\n');
    this.el.textContent =
      `FPS ${s.fps}\nDraw calls ${s.drawCalls}\nTriângulos ${s.triangles.toLocaleString('pt-BR')}\n` +
      `Geometrias ${s.geometries}\nCPU/frame\n${cpu}` + (this.extra ? `\n${this.extra()}` : '');
  }
}
