// Soundtrack.js
// Orquestrador do Sistema de Áudio Orgânico & Paisagem Sonora de Morro Vivo:
// - Trilha central: Bossa Nova, MPB & Seresta Carioca generativa em violão de nylon físico (Karplus-Strong),
//   Rhodes aveludado, contrabaixo acústico, flauta de bambu e percussão leve (adapta-se ao Dia, Pôr do Sol, Noite e Alvorecer).
// - Natureza viva estéreo: ondas assimétricas, espuma na areia, Sabiá-laranjeira, Bem-te-vi, gaivotas e grilos noturnos.
// - Roda de Samba autêntica espacial (cavaquinho físico, baixaria 7 cordas, surdo de pele, pandeiro e palmas humanas)
//   + Foley artesanal + micro-feedback tátil de interface.
import * as THREE from 'three';
import { AudioEngineCore } from './AudioEngineCore.js';
import { BrazilianMusicEngine } from './BrazilianMusicEngine.js';
import { LivingSoundscape } from './LivingSoundscape.js';
import { OrganicSfxMixin } from './OrganicSfx.js';

const _spatialVec = new THREE.Vector3();

export class AmbientSoundtrack {
  constructor() {
    this.ctx = null;
    this.core = null;
    this.musicEngine = null;
    this.soundscape = null;

    this.isPlaying = false;
    this.userPausedMusic = false;
    this.oceanBreezeActive = false;

    this.camera = null;
    this.controls = null;
    this.env = null;
    this.sambaProximityDuck = 1.0;

    // Volumes por canal (0 a 100%)
    this.volumes = {
      master: 80,
      music: 70,
      samba: 78,
      construction: 42,
      soccer: 22,
      sea: 68,
      sfx: 58
    };
    this.loadVolumes();

    // Barramentos de mixagem Web Audio
    this.masterGainNode = null;
    this.musicGainNode = null;
    this.musicReverbSend = null;
    this.sambaGainNode = null;
    this.seaGainNode = null;
    this.sfxMasterNode = null;
    this.constructionGainNode = null;
    this.soccerGainNode = null;
    this.generalSfxGainNode = null;

    // Aliases legados
    this.masterGain = null;
    this.sfxMasterGain = null;

    // Limitadores de cadência para SFX orgânicos
    this.lastKickTime = 0;
    this.lastConstructionTime = 0;
    this.lastWhistleTime = 0;
    this.lastChimeTime = 0;
    this.lastCartTime = 0;
    this.lastCommerceTime = 0;
    this.lastSambaTime = 0;
    this.sambaBarIndex = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextCtor();

    // Núcleo acústico (mastering, saturação suave, compressor, reverb estéreo de ar livre e bancos físicos!)
    this.core = new AudioEngineCore(this.ctx);
    this.masterGainNode = this.core.masterGain;

    // 1. Canal Música (Bossa Nova & Violão Carioca — com send de reverb subordinado ao volume/ducking da música!)
    this.musicGainNode = this.ctx.createGain();
    this.musicGainNode.connect(this.core.masterInput);
    this.masterGain = this.musicGainNode;

    // Pré-fader para instrumentos musicais + filtro de calor analógico sincronizado com o céu!
    this.musicPreGain = this.ctx.createGain();
    this.musicPreGain.gain.value = 1.0;
    this.musicToneFilter = this.ctx.createBiquadFilter();
    this.musicToneFilter.type = 'lowpass';
    this.musicToneFilter.Q.value = 0.55;
    this.musicToneFilter.frequency.value = 3400;
    this.musicPreGain.connect(this.musicToneFilter);
    this.musicToneFilter.connect(this.musicGainNode);

    this.musicReverbPre = this.ctx.createGain();
    this.musicReverbPre.gain.value = 1.0;
    this.musicReverbOut = this.ctx.createGain();
    this.musicReverbOut.gain.value = 0.65;
    this.musicReverbPre.connect(this.musicReverbOut);
    this.musicReverbOut.connect(this.core.reverbInput);

    // 2. Canal Roda de Samba (Terreiro de Samba espacial)
    this.sambaGainNode = this.ctx.createGain();
    this.sambaGainNode.connect(this.core.masterInput);

    // 3. Canal Mar & Natureza (Ondas estéreo, pássaros brasileiros, gaivotas e grilos)
    this.seaGainNode = this.ctx.createGain();
    this.seaGainNode.connect(this.core.masterInput);

    // 4. Canal SFX Master e subcanais
    this.sfxMasterNode = this.ctx.createGain();
    this.sfxMasterNode.connect(this.core.masterInput);
    this.sfxMasterGain = this.sfxMasterNode;

    this.constructionGainNode = this.ctx.createGain();
    this.constructionGainNode.connect(this.sfxMasterNode);

    this.soccerGainNode = this.ctx.createGain();
    this.soccerGainNode.connect(this.sfxMasterNode);

    this.generalSfxGainNode = this.ctx.createGain();
    this.generalSfxGainNode.connect(this.sfxMasterNode);

    // Submotores acústicos modulares
    this.musicEngine = new BrazilianMusicEngine(this.core, this.musicPreGain, this.musicReverbPre);
    this.soundscape = new LivingSoundscape(this.core, this.seaGainNode, this.core.reverbInput);

    this.applyAllVolumes();
  }

  setCamera(camera, controls = null) {
    this.camera = camera;
    this.controls = controls;
  }

  setEnvironment(env) {
    this.env = env;
  }

  _getCurrentPhase() {
    if (!this.env || !this.env.getTimeOfDay) return 'day';
    const info = this.env.getTimeOfDay();
    return (typeof info === 'string') ? info : (info.phase || 'day');
  }

  resumeContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (!this.oceanBreezeActive) this.startOceanBreeze();
        if (!this.isPlaying && !this.userPausedMusic) {
          this.play();
          if (this.onPlayStateChange) this.onPlayStateChange(true);
        }
      }).catch(() => {});
    }
    if (!this.oceanBreezeActive && this.ctx && this.ctx.state === 'running') {
      this.startOceanBreeze();
    }
    if (!this.isPlaying && !this.userPausedMusic && this.ctx && this.ctx.state === 'running') {
      this.play();
      if (this.onPlayStateChange) this.onPlayStateChange(true);
    }
  }

  // CONTROLES DE MIXAGEM
  setVolume(channel, percent) {
    percent = Math.max(0, Math.min(100, Number(percent)));
    this.volumes[channel] = percent;
    this.applyVolume(channel);
    this.saveVolumes();
  }

  getVolumes() {
    return { ...this.volumes };
  }

  applyVolume(channel) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const fraction = (this.volumes[channel] ?? 100) / 100.0;

    switch (channel) {
      case 'master':
        if (this.masterGainNode) {
          this.masterGainNode.gain.setTargetAtTime(fraction * 0.92, t, 0.06);
        }
        break;
      case 'music': {
        const duck = this.sambaProximityDuck !== undefined ? this.sambaProximityDuck : 1.0;
        const phaseScale = this._getPhaseMusicScale(this._getCurrentPhase());
        const mLevel = fraction * 0.78 * duck * phaseScale;
        if (this.musicGainNode) this.musicGainNode.gain.setTargetAtTime(mLevel, t, 0.14);
        if (this.musicReverbOut) this.musicReverbOut.gain.setTargetAtTime(mLevel * 0.85, t, 0.14);
        break;
      }
      case 'samba':
        if (this.sambaGainNode) {
          this.sambaGainNode.gain.setTargetAtTime(fraction * 0.92, t, 0.10);
        }
        break;
      case 'sea':
        if (this.seaGainNode) {
          this.seaGainNode.gain.setTargetAtTime(fraction * 0.86, t, 0.10);
        }
        break;
      case 'sfx':
        if (this.sfxMasterNode) {
          this.sfxMasterNode.gain.setTargetAtTime(fraction * 0.72, t, 0.08);
        }
        break;
      case 'construction':
        if (this.constructionGainNode) {
          this.constructionGainNode.gain.setTargetAtTime(fraction * 0.62, t, 0.08);
        }
        break;
      case 'soccer':
        if (this.soccerGainNode) {
          this.soccerGainNode.gain.setTargetAtTime(fraction * 0.34, t, 0.08);
        }
        break;
      case 'generalSfx':
        if (this.generalSfxGainNode) {
          this.generalSfxGainNode.gain.setTargetAtTime(fraction * 0.75, t, 0.08);
        }
        break;
    }
  }

  applyAllVolumes() {
    ['master', 'music', 'samba', 'sea', 'sfx', 'construction', 'soccer', 'generalSfx'].forEach(ch => this.applyVolume(ch));
  }

  saveVolumes() {
    try {
      localStorage.setItem('morro_vivo_audio_volumes', JSON.stringify(this.volumes));
    } catch (e) {}
  }

  loadVolumes() {
    try {
      const saved = localStorage.getItem('morro_vivo_audio_volumes');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.volumes = { ...this.volumes, ...parsed };
      }
    } catch (e) {}
  }

  toggle() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.isPlaying) {
      this.userPausedMusic = true;
      this.stop();
      if (this.onPlayStateChange) this.onPlayStateChange(false);
      return false;
    } else {
      this.userPausedMusic = false;
      this.play();
      if (this.onPlayStateChange) this.onPlayStateChange(true);
      return true;
    }
  }

  startOceanBreeze() {
    if (!this.ctx || !this.soundscape || this.oceanBreezeActive) return;
    this.soundscape.start();
    this.oceanBreezeActive = true;
  }

  _getPhaseMusicScale(phase) {
    if (phase === 'day') return 0.84;
    if (phase === 'dawn') return 0.86;
    return 0.96;
  }

  _getPhaseToneCutoff(phase, progress = null) {
    if (phase === 'dawn') return 2600;
    if (phase === 'day') return (typeof progress === 'number' && progress < 0.16) ? 3400 : 4800;
    if (phase === 'sunset') return 3900;
    return 2900;
  }

  play() {
    if (!this.ctx) this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startOceanBreeze();
    const phase = this._getCurrentPhase();
    const progress = this.env && this.env.getCycleProgress ? this.env.getCycleProgress() : null;
    if (this.musicPreGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicPreGain.gain.cancelScheduledValues(now);
      this.musicPreGain.gain.setValueAtTime(0.05, now);
      this.musicPreGain.gain.linearRampToValueAtTime(1.0, now + 1.45);
    }
    if (this.musicToneFilter && this.ctx) {
      this.musicToneFilter.frequency.setTargetAtTime(this._getPhaseToneCutoff(phase, progress), this.ctx.currentTime, 1.1);
    }
    if (this.musicEngine) {
      this.musicEngine.setPhase(phase, progress);
      this.musicEngine.start();
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.musicEngine) this.musicEngine.stop();
    if (this.soundscape) {
      this.soundscape.stop();
      this.oceanBreezeActive = false;
    }
  }

  getNowPlaying() {
    if (this.musicEngine && typeof this.musicEngine.getNowPlaying === 'function') {
      return this.musicEngine.getNowPlaying();
    }
    return {
      isPlaying: this.isPlaying,
      section: 'A',
      title: 'Toque para ouvir Bossa & Mar',
      chord: 'Cmaj9',
      bpm: 74,
      phase: this._getCurrentPhase(),
      barIndex: 0
    };
  }

  skipSection() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.isPlaying) {
      this.userPausedMusic = false;
      this.play();
      if (this.onPlayStateChange) this.onPlayStateChange(true);
    }
    return this.musicEngine ? this.musicEngine.nextSection() : this.getNowPlaying();
  }

  update(delta) {
    if (!this.ctx || this.ctx.state !== 'running') return;

    const phase = this._getCurrentPhase();
    const progress = this.env && this.env.getCycleProgress ? this.env.getCycleProgress() : null;

    // Sincroniza fase, progresso solar e calor analógico na música (Noite -> Alvorecer -> Manhã -> Dia -> Pôr do Sol)
    if (this.musicEngine) {
      this.musicEngine.setPhase(phase, progress);
    }
    if (this.musicToneFilter) {
      this.musicToneFilter.frequency.setTargetAtTime(this._getPhaseToneCutoff(phase, progress), this.ctx.currentTime, 1.1);
    }

    // Atualiza mar estéreo, ondas individuais e fauna brasileira (sabiá, bem-te-vi, gaivotas, grilos)
    if (this.soundscape) {
      this.soundscape.update(delta, this.camera, this.controls, phase);
    }

    // Crossfade/Ducking automático da Trilha (Roda de Samba + normalização suave entre fases do dia)
    if (this.camera && this.musicGainNode) {
      const sambaX = -2.0, sambaY = 15.2, sambaZ = -4.0;
      const focusDist = (this.controls && this.controls.target)
        ? Math.hypot(this.controls.target.x - sambaX, this.controls.target.z - sambaZ)
        : 999;
      const camDist = Math.hypot(
        this.camera.position.x - sambaX,
        this.camera.position.y - sambaY,
        this.camera.position.z - sambaZ
      );
      const effDist = Math.max(focusDist, camDist * 0.62);

      let targetDuck = 1.0;
      if (effDist < 28.0) {
        const prox = Math.max(0.0, Math.min(1.0, (28.0 - effDist) / 18.0));
        targetDuck = 1.0 - prox * 0.78; // Abre espaço generoso para a Roda de Samba brilhar!
      }
      this.sambaProximityDuck = targetDuck;
      const musicFraction = (this.volumes.music ?? 70) / 100.0;
      const phaseScale = this._getPhaseMusicScale(phase);
      const targetLevel = musicFraction * 0.78 * targetDuck * phaseScale;
      this.musicGainNode.gain.setTargetAtTime(targetLevel, this.ctx.currentTime, 0.85);
      if (this.musicReverbOut) {
        this.musicReverbOut.gain.setTargetAtTime(targetLevel * 0.85, this.ctx.currentTime, 0.85);
      }
    }
  }

  getSpatialInfo(pos, maxDist = 70.0, minDist = 6.0) {
    if (!pos || !this.camera) return { gain: 0, pan: 0, filterFreq: 20000 };
    const px = pos.x !== undefined ? pos.x : 0;
    const py = pos.y !== undefined ? pos.y : 0;
    const pz = pos.z !== undefined ? pos.z : 0;

    let focusDist = 0;
    if (this.controls && this.controls.target) {
      focusDist = Math.hypot(
        this.controls.target.x - px,
        this.controls.target.y - py,
        this.controls.target.z - pz
      );
    } else {
      focusDist = Math.hypot(
        this.camera.position.x - px,
        this.camera.position.y - py,
        this.camera.position.z - pz
      );
    }

    if (focusDist >= maxDist) return { gain: 0, pan: 0, filterFreq: 1200 };

    let gain = 1.0;
    if (focusDist > minDist) {
      const norm = (maxDist - focusDist) / (maxDist - minDist);
      gain = norm * norm * (3.0 - 2.0 * norm);
    }

    const camY = Math.max(12, this.camera.position.y);
    const zoomFactor = Math.max(0.24, Math.min(1.0, 46.0 / camY));
    gain *= zoomFactor;

    const distRatio = Math.max(0, Math.min(1, focusDist / maxDist));
    const filterFreq = Math.round(18000 - distRatio * 14500);

    let pan = 0;
    try {
      _spatialVec.set(px, py, pz).project(this.camera);
      if (_spatialVec.z > 1.0 || _spatialVec.z < -1.0) {
        pan = _spatialVec.x < 0 ? -0.5 : 0.5;
        gain *= 0.35;
      } else {
        pan = Math.max(-0.75, Math.min(0.75, _spatialVec.x * 0.85));
      }
    } catch (e) {
      pan = 0;
    }

    return { gain, pan, filterFreq };
  }

  getSpatialGain(pos, maxDist = 38.0, minDist = 4.0) {
    return this.getSpatialInfo(pos, maxDist, minDist).gain;
  }
}

Object.assign(AmbientSoundtrack.prototype, OrganicSfxMixin);
