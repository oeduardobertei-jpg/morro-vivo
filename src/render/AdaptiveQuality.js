/**
 * Qualidade adaptativa: ajusta o pixel ratio para manter o FPS estável.
 * IMPORTANTE: Deve sempre ser atualizado ANTES do render() do frame, pois
 * renderer.setPixelRatio() redimensiona o canvas WebGL (o que limpa o buffer se chamado após o render).
 */
export class AdaptiveQuality {
  constructor(renderer, opts = {}) {
    this.renderer = renderer;
    this.enabled = opts.enabled !== false;
    this.onRatioChange = opts.onRatioChange || null;
    this.maxRatio = Math.min(window.devicePixelRatio || 1, opts.maxRatio ?? 1.5);
    this.minRatio = opts.minRatio ?? 0.85;
    this.lowFps = opts.lowFps ?? 28;
    this.highFps = opts.highFps ?? 57;
    this.window = opts.window ?? 4.0; // janela de 4s evita qualquer oscilação de buffer
    this.ratio = this.maxRatio;
    this._appliedRatio = -1;
    this._t = 0;
    this._frames = 0;
    this._goodWindows = 0;
    this._upNeeded = 4;
    this.apply();
  }

  apply() {
    if (this._appliedRatio === this.ratio) return;
    this._appliedRatio = this.ratio;
    this.renderer.setPixelRatio(this.ratio);
    if (this.onRatioChange) {
      this.onRatioChange(this.ratio);
    }
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
