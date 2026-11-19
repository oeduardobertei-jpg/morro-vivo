import * as THREE from 'three';
import {
  BlendFunction,
  BloomEffect,
  BrightnessContrastEffect,
  EffectComposer,
  EffectPass,
  HueSaturationEffect,
  NormalPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  SSAOEffect,
  ToneMappingEffect,
  ToneMappingMode
} from 'postprocessing';
import GUI from 'lil-gui';

/**
 * PostEffects.js
 * Pipeline Híbrido Unificado (60 FPS):
 * 1. Modo 'maquete' (Padrão Leve): Renderização WebGL direta em passe único com Tone Mapping AgX
 *    nativo + Lente Óptica Tilt-Shift & Vinheta via compositor CSS (0ms extra de GPU).
 * 2. Modo 'bloom' (Maquete + Studio FX): Pipeline pmndrs/postprocessing em HalfFloatType com
 *    SSAO (Oclusão Ambiental de contato em meia resolução), Bloom mipmap HDR calibrado,
 *    Color Grading sutil, AgX Tone Mapping e SMAA antialiasing.
 * 3. Modo 'off': Renderização direta sem lente óptica nem composer.
 */
export class PostEffects {
  constructor(renderer, scene, camera, environment, options = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.env = environment;

    this.mode = options.initialMode || 'maquete';
    this.composer = null;
    this.normalPass = null;
    this.mainEffectPass = null;
    this.smaaPass = null;
    this.ssaoEffect = null;
    this.bloomEffect = null;
    this.hueSatEffect = null;
    this.bcEffect = null;
    this.gui = null;
    this._ssaoEnabled = true;
    this.onModeChange = options.onModeChange || null;

    this.params = {
      mode: this.mode,
      autoNightBloom: true,
      ssaoEnabled: true,
      ssaoIntensity: 1.35,
      ssaoRadius: 0.11,
      bloomStrengthDay: 0.16,
      bloomStrengthNight: 0.34,
      bloomThresholdDay: 0.94,
      bloomThresholdNight: 0.90,
      saturation: 0.07,
      contrast: 0.045,
      tiltBlurPx: 3.0,
      vignetteOpacity: 0.32,
      exposure: renderer.toneMappingExposure || 1.05
    };

    this._createOpticalLensOverlay();
    this._syncVisualState();

    if (options.debug) {
      this.initDebugGUI();
    }
  }

  _createOpticalLensOverlay() {
    let lens = document.getElementById('maquete-lens-overlay');
    if (!lens) {
      lens = document.createElement('div');
      lens.id = 'maquete-lens-overlay';
      lens.innerHTML = `
        <div class="tilt-band tilt-top"></div>
        <div class="tilt-band tilt-bottom"></div>
        <div class="tilt-vignette"></div>
      `;
      document.body.appendChild(lens);
    }
    this.lensEl = lens;
  }

  _ensureComposer() {
    if (this.composer) return;
    try {
      const size = new THREE.Vector2();
      this.renderer.getSize(size);

      this.composer = new EffectComposer(this.renderer, {
        frameBufferType: THREE.HalfFloatType
      });
      this.composer.setSize(size.x, size.y, false);

      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);

      this.normalPass = new NormalPass(this.scene, this.camera, {
        resolutionScale: 0.5
      });
      this.composer.addPass(this.normalPass);

      this.ssaoEffect = new SSAOEffect(this.camera, this.normalPass.texture, {
        blendFunction: BlendFunction.MULTIPLY,
        samples: 6,
        rings: 2,
        depthAwareUpsampling: true,
        worldDistanceThreshold: 520,
        worldDistanceFalloff: 180,
        worldProximityThreshold: 2.8,
        worldProximityFalloff: 1.5,
        luminanceInfluence: 0.62,
        radius: this.params.ssaoRadius,
        intensity: this.params.ssaoIntensity,
        bias: 0.025,
        fade: 0.015,
        color: new THREE.Color('#1B2942'),
        resolutionScale: 0.5
      });

      this.bloomEffect = new BloomEffect({
        mipmapBlur: true,
        luminanceThreshold: this.params.bloomThresholdDay,
        luminanceSmoothing: 0.18,
        intensity: this.params.bloomStrengthDay,
        radius: 0.55
      });

      this.hueSatEffect = new HueSaturationEffect({
        saturation: this.params.saturation
      });

      this.bcEffect = new BrightnessContrastEffect({
        contrast: this.params.contrast
      });

      this.toneMappingEffect = new ToneMappingEffect({
        mode: ToneMappingMode.AGX
      });

      this.mainEffectPass = new EffectPass(
        this.camera,
        this.ssaoEffect,
        this.bloomEffect,
        this.toneMappingEffect,
        this.hueSatEffect,
        this.bcEffect
      );
      this.composer.addPass(this.mainEffectPass);

      this.smaaEffect = new SMAAEffect({
        preset: SMAAPreset.LOW
      });
      this.smaaPass = new EffectPass(this.camera, this.smaaEffect);
      this.composer.addPass(this.smaaPass);
    } catch (err) {
      console.warn('Studio FX composer fallback:', err);
      this.composer = null;
    }
  }

  _syncVisualState() {
    if (this.lensEl) {
      this.lensEl.style.display = (this.mode === 'maquete' || this.mode === 'bloom') ? 'block' : 'none';
      this.lensEl.style.setProperty('--tilt-blur', `${this.params.tiltBlurPx}px`);
      this.lensEl.style.setProperty('--vig-alpha', `${this.params.vignetteOpacity}`);
    }
    if (this.mode === 'bloom') {
      this._ensureComposer();
    }
    if (this.mode === 'bloom' && this.composer) {
      this.renderer.toneMapping = THREE.NoToneMapping;
    } else {
      this.renderer.toneMapping = this.mode === 'off'
        ? THREE.ACESFilmicToneMapping
        : THREE.AgXToneMapping;
    }
  }

  setSSAOEnabled(enabled) {
    this._ssaoEnabled = !!enabled;
    this.params.ssaoEnabled = this._ssaoEnabled;
    if (!this.ssaoEffect || !this.normalPass || !this.mainEffectPass) return;
    this.normalPass.enabled = this._ssaoEnabled;
    this.ssaoEffect.blendMode.blendFunction = this._ssaoEnabled
      ? BlendFunction.MULTIPLY
      : BlendFunction.SKIP;
    this.mainEffectPass.recompile();
  }

  setMode(newMode) {
    this.mode = newMode;
    this.params.mode = newMode;
    this._syncVisualState();
    if (typeof this.onModeChange === 'function') this.onModeChange(this.mode);
    return this.mode;
  }

  cycleMode() {
    const order = ['maquete', 'bloom', 'off'];
    const next = order[(order.indexOf(this.mode) + 1) % order.length];
    return this.setMode(next);
  }

  getModeLabel() {
    if (this.mode === 'maquete') return 'Maquete (Leve)';
    if (this.mode === 'bloom') return 'Maquete + Studio FX';
    return 'Original';
  }

  setSize(width, height) {
    if (!this.composer) return;
    this.composer.setSize(width, height, false);
  }

  initDebugGUI() {
    if (this.gui) {
      this.gui.show(this.gui._hidden);
      return;
    }

    this.gui = new GUI({ title: '🎨 Calibração Visual (Morro Vivo)' });
    this.gui.domElement.style.top = '74px';
    this.gui.domElement.style.right = '18px';
    this.gui.domElement.style.zIndex = '50';

    this.gui.add(this.params, 'mode', ['maquete', 'bloom', 'off'])
      .name('Modo Visual')
      .listen()
      .onChange(v => this.setMode(v));

    const fTilt = this.gui.addFolder('🔍 Lente Maquete (0ms GPU)');
    fTilt.add(this.params, 'tiltBlurPx', 0, 8, 0.5).name('Desfoque Borda (px)').onChange(() => this._syncVisualState());
    fTilt.add(this.params, 'vignetteOpacity', 0, 0.7, 0.05).name('Vinheta Cinemat.').onChange(() => this._syncVisualState());
    fTilt.add(this.params, 'exposure', 0.6, 1.8, 0.05).name('Exposição Sol').onChange(v => {
      this.renderer.toneMappingExposure = v;
    });

    const fStudio = this.gui.addFolder('🎬 Studio FX (AO + Bloom + Grade)');
    fStudio.add(this.params, 'ssaoEnabled').name('SSAO (Oclusão)').listen().onChange(v => this.setSSAOEnabled(v));
    fStudio.add(this.params, 'ssaoIntensity', 0, 2.5, 0.05).name('Força SSAO').onChange(v => {
      if (this.ssaoEffect) this.ssaoEffect.intensity = v;
    });
    fStudio.add(this.params, 'saturation', -0.3, 0.4, 0.01).name('Saturação').onChange(v => {
      if (this.hueSatEffect) this.hueSatEffect.saturation = v;
    });
    fStudio.add(this.params, 'contrast', -0.2, 0.3, 0.01).name('Contraste').onChange(v => {
      if (this.bcEffect) this.bcEffect.contrast = v;
    });
    fStudio.add(this.params, 'autoNightBloom').name('Auto-Realce Noturno');
    fStudio.add(this.params, 'bloomStrengthDay', 0, 1.2, 0.02).name('Bloom Dia');
    fStudio.add(this.params, 'bloomStrengthNight', 0, 1.5, 0.02).name('Bloom Noite');
  }

  render(delta) {
    if (this.mode !== 'bloom' || !this.composer) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.params.autoNightBloom && this.bloomEffect && this.env) {
      const timeInfo = this.env.getTimeOfDay();
      const phase = (typeof timeInfo === 'string') ? timeInfo : (timeInfo.phase || 'day');

      let targetStrength = this.params.bloomStrengthDay;
      let targetThreshold = this.params.bloomThresholdDay;

      if (phase === 'night') {
        targetStrength = this.params.bloomStrengthNight;
        targetThreshold = this.params.bloomThresholdNight;
      } else if (phase === 'sunset') {
        targetStrength = (this.params.bloomStrengthDay + this.params.bloomStrengthNight) * 0.55;
        targetThreshold = (this.params.bloomThresholdDay + this.params.bloomThresholdNight) * 0.55;
      }

      const lerpFactor = Math.min(1, delta * 3.5);
      this.bloomEffect.intensity += (targetStrength - this.bloomEffect.intensity) * lerpFactor;
      const lumMat = this.bloomEffect.luminanceMaterial;
      if (lumMat) {
        lumMat.threshold += (targetThreshold - lumMat.threshold) * lerpFactor;
      }
    }

    try {
      this.composer.render(delta);
    } catch (e) {
      this.renderer.toneMapping = THREE.AgXToneMapping;
      this.renderer.render(this.scene, this.camera);
    }
  }
}
