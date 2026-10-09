/**
 * Qualidade adaptativa: ajusta o pixel ratio para manter o FPS estável.
 * Desce rápido quando o FPS cai e sobe devagar (com recuo exponencial) quando sobra folga.
 */
export class AdaptiveQuality {
  constructor(renderer, opts = {}) {
    this.renderer = renderer;
    this.enabled = opts.enabled !== false;
    this.maxRatio = Math.min(window.devicePixelRatio || 1, opts.maxRatio ?? 2);
    this.minRatio = opts.minRatio ?? 0.6;
    this.lowFps = opts.lowFps ?? 38;
    this.highFps = opts.highFps ?? 56;
    this.window = opts.window ?? 2; // segundos por janela de medição
    this.ratio = this.maxRatio;
    this._t = 0;
    this._frames = 0;
    this._goodWindows = 0;
    this._upNeeded = 3;
    this.apply();
  }

  apply() {
    this.renderer.setPixelRatio(this.ratio);
  }

  update(delta) {
    if (!this.enabled || document.hidden) return;
    this._t += delta;
    this._frames++;
    if (this._t < this.window) return;
    const fps = this._frames / this._t;
    this._t = 0;
    this._frames = 0;

    if (fps < this.lowFps && this.ratio > this.minRatio) {
      if (this._lastWasUp) this._upNeeded = Math.min(this._upNeeded * 2, 24);
      this._lastWasUp = false;
      this.ratio = Math.max(this.minRatio, +(this.ratio - 0.25).toFixed(2));
      this._goodWindows = 0;
      this.apply();
    } else if (fps > this.highFps && this.ratio < this.maxRatio) {
      if (++this._goodWindows >= this._upNeeded) {
        this._lastWasUp = true;
        this._goodWindows = 0;
        this.ratio = Math.min(this.maxRatio, +(this.ratio + 0.25).toFixed(2));
        this.apply();
      }
    } else {
      this._goodWindows = 0;
    }
  }
}
