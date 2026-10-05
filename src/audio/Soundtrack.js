// Web Audio Procedural Soundtrack & Spatial Audio Engine for Morro Vivo
// Generates gentle tropical ambient ocean waves, warm bossa-nova acoustic chords,
// and realistic spatial 3D procedural sound effects with per-channel mixing controls.
import * as THREE from 'three';

export class AmbientSoundtrack {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.chordInterval = null;
    this.windNode = null;
    this.bossaProgression = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [293.66, 349.23, 440.00, 523.25], // Dm7
      [196.00, 246.94, 293.66, 349.23, 440.00] // G7(9)
    ];
    this.chordIndex = 0;
    this.camera = null;
    this.controls = null;

    // Per-channel mixer volumes (percentages 0 to 100)
    this.volumes = {
      master: 80,
      music: 65,
      construction: 45,
      soccer: 50,
      sea: 45,
      sfx: 55
    };
    this.loadVolumes();

    // Web Audio Gain Nodes for multi-channel mixing
    this.masterGainNode = null;
    this.musicGainNode = null;
    this.seaGainNode = null;
    this.sfxMasterNode = null;
    this.constructionGainNode = null;
    this.soccerGainNode = null;
    this.generalSfxGainNode = null;

    // Backwards-compatible aliases
    this.masterGain = null;
    this.sfxMasterGain = null;

    // Rate-limiting / anti-overlap audio timers
    this.lastKickTime = 0;
    this.lastConstructionTime = 0;
    this.lastWhistleTime = 0;
    this.lastChimeTime = 0;
    this.lastCartTime = 0;
    this.lastCommerceTime = 0;
    this.lastSambaTime = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // 1. Master Output Gain Node
    this.masterGainNode = this.ctx.createGain();
    this.masterGainNode.connect(this.ctx.destination);

    // 2. Music Channel (Bossa Nova chords)
    this.musicGainNode = this.ctx.createGain();
    this.musicGainNode.connect(this.masterGainNode);
    this.masterGain = this.musicGainNode; // Alias

    // 3. Sea Breeze & Wave Swells Channel
    this.seaGainNode = this.ctx.createGain();
    this.seaGainNode.connect(this.masterGainNode);

    // 4. SFX Master Channel
    this.sfxMasterNode = this.ctx.createGain();
    this.sfxMasterNode.connect(this.masterGainNode);
    this.sfxMasterGain = this.sfxMasterNode; // Alias

    // 5. Dedicated Construction & Masonry Channel
    this.constructionGainNode = this.ctx.createGain();
    this.constructionGainNode.connect(this.sfxMasterNode);

    // 6. Dedicated Soccer Field / Campinho Channel
    this.soccerGainNode = this.ctx.createGain();
    this.soccerGainNode.connect(this.sfxMasterNode);

    // 7. General SFX Channel (Celebration chimes, wooden carts)
    this.generalSfxGainNode = this.ctx.createGain();
    this.generalSfxGainNode.connect(this.sfxMasterNode);

    // Apply all loaded volume presets
    this.applyAllVolumes();
  }

  resumeContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // VOLUME MIXING CONTROLS
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
          this.masterGainNode.gain.setValueAtTime(fraction * 0.90, t);
        }
        break;
      case 'music':
        if (this.musicGainNode) {
          this.musicGainNode.gain.setValueAtTime(fraction * 0.22, t);
        }
        break;
      case 'sea':
        if (this.seaGainNode) {
          this.seaGainNode.gain.setValueAtTime(fraction * 0.35, t);
        }
        break;
      case 'sfx':
        if (this.sfxMasterNode) {
          this.sfxMasterNode.gain.setValueAtTime(fraction * 0.65, t);
        }
        break;
      case 'construction':
        if (this.constructionGainNode) {
          this.constructionGainNode.gain.setValueAtTime(fraction * 0.55, t);
        }
        break;
      case 'soccer':
        if (this.soccerGainNode) {
          this.soccerGainNode.gain.setValueAtTime(fraction * 0.60, t);
        }
        break;
    }
  }

  applyAllVolumes() {
    ['master', 'music', 'sea', 'sfx', 'construction', 'soccer'].forEach(ch => this.applyVolume(ch));
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
      this.ctx.resume();
    }

    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  play() {
    if (!this.ctx) this.init();
    this.isPlaying = true;
    this.startOceanBreeze();
    this.playNextChord();
    this.chordInterval = setInterval(() => {
      if (this.isPlaying) this.playNextChord();
    }, 4200);
  }

  stop() {
    this.isPlaying = false;
    if (this.chordInterval) clearInterval(this.chordInterval);
    if (this.windNode) {
      try {
        this.windNode.stop();
        this.windNode.disconnect();
      } catch (e) {}
      this.windNode = null;
    }
  }

  startOceanBreeze() {
    if (!this.ctx) return;
    // Pink noise buffer for gentle ocean surf
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      data[i] = (b0 + b1 + b2 + b3 + b4) * 0.035;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter to simulate low, gentle coastal swells
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);

    // LFO for wave swelling
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const breezeGain = this.ctx.createGain();
    breezeGain.gain.setValueAtTime(0.30, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(breezeGain);
    breezeGain.connect(this.seaGainNode || this.masterGainNode || this.ctx.destination);

    noise.start();
    lfo.start();
    this.windNode = noise;
  }

  playNextChord() {
    if (!this.ctx || !this.isPlaying) return;
    const chord = this.bossaProgression[this.chordIndex];
    this.chordIndex = (this.chordIndex + 1) % this.bossaProgression.length;

    chord.forEach((freq, idx) => {
      const noteDelay = idx * 0.18 + Math.random() * 0.05;
      const startTime = this.ctx.currentTime + noteDelay;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, startTime);
      filter.frequency.exponentialRampToValueAtTime(300, startTime + 2.8);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.06, startTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 3.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGainNode || this.masterGainNode || this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 3.5);
    });
  }

  // PROCEDURAL SOUND EFFECTS (SFX) SYNTHESIZERS
  setCamera(camera, controls = null) {
    this.camera = camera;
    this.controls = controls;
  }

  getSpatialInfo(pos, maxDist = 38.0, minDist = 4.0) {
    if (!pos || !this.camera) return { gain: 0, pan: 0, filterFreq: 20000 };
    const px = pos.x !== undefined ? pos.x : 0;
    const py = pos.y !== undefined ? pos.y : 0;
    const pz = pos.z !== undefined ? pos.z : 0;

    // 1. Distância euclidiana até a lente da câmera no mundo 3D
    const dx = this.camera.position.x - px;
    const dy = this.camera.position.y - py;
    const dz = this.camera.position.z - pz;
    const camDist = Math.hypot(dx, dy, dz);

    // 2. Distância até o ponto focal de atenção do jogador no solo (controls.target)
    let focusDist = camDist;
    if (this.controls && this.controls.target) {
      const tx = this.controls.target.x - px;
      const ty = this.controls.target.y - py;
      const tz = this.controls.target.z - pz;
      focusDist = Math.hypot(tx, ty, tz);
    }

    // Distância perceptual efetiva: dá 85% do peso ao ponto de foco do jogador,
    // garantindo que focar em um quiosque ou na praça dê destaque ao som,
    // mas sem vazar quando a câmera estiver longe ou voltada para outro ponto
    const effectiveDist = Math.min(camDist, focusDist * 0.85 + camDist * 0.25);

    // Corte estrito de silêncio absoluto além do raio máximo
    if (effectiveDist >= maxDist) return { gain: 0, pan: 0, filterFreq: 1200 };

    let gain = 1.0;
    if (effectiveDist > minDist) {
      // Curva Smoothstep Cúbica (Decaimento Físico Natural):
      // norm vai de 1.0 (em minDist) até 0.0 (em maxDist)
      const norm = (maxDist - effectiveDist) / (maxDist - minDist);
      gain = norm * norm * (3.0 - 2.0 * norm);
    }

    // Air Absorption: sons mais distantes perdem agudos progressivamente (18kHz -> 2.2kHz)
    const distRatio = Math.max(0, Math.min(1, effectiveDist / maxDist));
    const filterFreq = Math.round(18000 - distRatio * 15500);

    // Spatial Stereo Panning
    let pan = 0;
    try {
      const v = new THREE.Vector3(px, py, pz);
      v.project(this.camera);
      if (v.z > 1.0) {
        gain *= 0.45;
        pan = 0;
      } else {
        pan = Math.max(-0.75, Math.min(0.75, v.x));
      }
    } catch (e) {
      pan = 0;
    }

    return { gain, pan, filterFreq };
  }

  getSpatialGain(pos, maxDist = 38.0, minDist = 4.0) {
    return this.getSpatialInfo(pos, maxDist, minDist).gain;
  }

  connectSpatial(node, pan = 0, channel = 'sfx', filterFreq = null) {
    let dest = this.sfxMasterNode || this.masterGainNode || this.ctx.destination;
    if (channel === 'construction' && this.constructionGainNode) dest = this.constructionGainNode;
    else if (channel === 'soccer' && this.soccerGainNode) dest = this.soccerGainNode;
    else if (channel === 'generalSfx' && this.generalSfxGainNode) dest = this.generalSfxGainNode;

    let sourceNode = node;
    if (filterFreq && filterFreq < 15000 && this.ctx) {
      try {
        const airFilter = this.ctx.createBiquadFilter();
        airFilter.type = 'lowpass';
        airFilter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
        sourceNode.connect(airFilter);
        sourceNode = airFilter;
      } catch (e) {}
    }

    if (this.ctx && this.ctx.createStereoPanner) {
      try {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(pan, this.ctx.currentTime);
        sourceNode.connect(panner);
        panner.connect(dest);
      } catch (e) {
        sourceNode.connect(dest);
      }
    } else {
      sourceNode.connect(dest);
    }
  }

  // 1. SPATIAL CONSTRUCTION SOUNDS (Picareta & Alvenaria Suave)
  playConstructionSound(pos) {
    this.resumeContext();
    if (!this.ctx) return;

    // Raio restrito ao quarteirão da obra (28m máx, 4m min)
    const spatial = this.getSpatialInfo(pos, 28.0, 4.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    if (t - this.lastConstructionTime < 0.12) return;
    this.lastConstructionTime = t;

    const gainFactor = spatial.gain;

    if (Math.random() < 0.70) {
      // Toque suave de colher de pedreiro / assentamento de bloco
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      const baseFreq = 480 + Math.random() * 160;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.linearRampToValueAtTime(160, t + 0.075);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq * 1.1, t);
      filter.Q.setValueAtTime(2.2, t);

      const targetVol = gainFactor * 0.22;
      gain.gain.setValueAtTime(targetVol, t);
      gain.gain.setTargetAtTime(0.0001, t + 0.02, 0.035);

      osc.connect(filter);
      filter.connect(gain);
      this.connectSpatial(gain, spatial.pan, 'construction', spatial.filterFreq);

      osc.start(t);
      osc.stop(t + 0.09);
    } else {
      // Raspagem macia de argamassa
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.28;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(740, t);
      filter.Q.setValueAtTime(2.0, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(gainFactor * 0.12, t + 0.02);
      gain.gain.setTargetAtTime(0.0001, t + 0.03, 0.03);

      noise.connect(filter);
      filter.connect(gain);
      this.connectSpatial(gain, spatial.pan, 'construction', spatial.filterFreq);

      noise.start(t);
      noise.stop(t + 0.09);
    }
  }

  // 2. SPATIAL SOCCER BALL KICK (Chute da Pelada de Várzea)
  playSoccerKick(pos) {
    this.resumeContext();
    if (!this.ctx) return;

    // Raio restrito aos arredores do campo da Várzea (38m máx, 6m min)
    const spatial = this.getSpatialInfo(pos, 38.0, 6.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    if (t - this.lastKickTime < 0.15) return;
    this.lastKickTime = t;

    const gainFactor = spatial.gain;

    // Golpe duplo: impacto macio da chuteira e ressonância da bola
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.linearRampToValueAtTime(52, t + 0.11);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, t);

    const targetVol = gainFactor * 0.32;
    gain.gain.setValueAtTime(targetVol, t);
    gain.gain.setTargetAtTime(0.0001, t + 0.03, 0.04);

    osc.connect(filter);
    filter.connect(gain);
    this.connectSpatial(gain, spatial.pan, 'soccer', spatial.filterFreq);

    osc.start(t);
    osc.stop(t + 0.13);

    // Estalo sutil de couro sintético
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(680, t);
    clickOsc.frequency.linearRampToValueAtTime(180, t + 0.035);
    clickGain.gain.setValueAtTime(gainFactor * 0.16, t);
    clickGain.gain.setTargetAtTime(0.0001, t + 0.01, 0.015);

    clickOsc.connect(clickGain);
    this.connectSpatial(clickGain, spatial.pan, 'soccer', spatial.filterFreq);
    clickOsc.start(t);
    clickOsc.stop(t + 0.05);
  }

  // 3. SPATIAL GOAL WHISTLE & CROWD CHEER (Golaço no Campinho)
  playGoalWhistle(pos) {
    this.resumeContext();
    if (!this.ctx) return;

    // Raio contido no vale leste (50m máx, 8m min)
    const spatial = this.getSpatialInfo(pos, 50.0, 8.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    if (t - this.lastWhistleTime < 2.5) return;
    this.lastWhistleTime = t;

    const gainFactor = spatial.gain;

    // Apito clássico do juiz
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.setValueAtTime(2600, t + 0.07);
    osc.frequency.setValueAtTime(2200, t + 0.14);
    osc.frequency.setValueAtTime(2650, t + 0.21);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, t);

    const targetVol = gainFactor * 0.26;
    gain.gain.setValueAtTime(targetVol, t);
    gain.gain.setTargetAtTime(0.0001, t + 0.24, 0.06);

    osc.connect(filter);
    filter.connect(gain);
    this.connectSpatial(gain, spatial.pan, 'soccer', spatial.filterFreq);

    osc.start(t);
    osc.stop(t + 0.40);

    // Celebração da torcida no alambrado
    const cheerBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 1.1), this.ctx.sampleRate);
    const cheerData = cheerBuffer.getChannelData(0);
    for (let i = 0; i < cheerData.length; i++) {
      cheerData[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const cheerSource = this.ctx.createBufferSource();
    cheerSource.buffer = cheerBuffer;

    const cheerFilter = this.ctx.createBiquadFilter();
    cheerFilter.type = 'bandpass';
    cheerFilter.frequency.setValueAtTime(450, t);
    cheerFilter.frequency.linearRampToValueAtTime(720, t + 0.35);
    cheerFilter.frequency.linearRampToValueAtTime(360, t + 1.1);

    const cheerGain = this.ctx.createGain();
    cheerGain.gain.setValueAtTime(0.001, t);
    cheerGain.gain.linearRampToValueAtTime(gainFactor * 0.18, t + 0.25);
    cheerGain.gain.setTargetAtTime(0.0001, t + 0.40, 0.25);

    cheerSource.connect(cheerFilter);
    cheerFilter.connect(cheerGain);
    this.connectSpatial(cheerGain, spatial.pan, 'soccer', spatial.filterFreq);

    cheerSource.start(t);
    cheerSource.stop(t + 1.15);
  }

  // 4. SPATIAL CELEBRATION CHIME (Nova Casa / Puxadinho)
  playCelebrationChime(pos) {
    this.resumeContext();
    if (!this.ctx) return;

    // Raio restrito aos arredores do lote (45m máx, 8m min)
    const spatial = this.getSpatialInfo(pos, 45.0, 8.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    if (t - this.lastChimeTime < 1.0) return;
    this.lastChimeTime = t;

    const gainFactor = spatial.gain;

    const notes = [440.0, 554.37, 659.25, 880.0];
    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, noteTime);

      const targetVol = gainFactor * 0.20;
      gain.gain.setValueAtTime(targetVol, noteTime);
      gain.gain.setTargetAtTime(0.0001, noteTime + 0.04, 0.10);

      osc.connect(filter);
      filter.connect(gain);
      this.connectSpatial(gain, spatial.pan, 'generalSfx', spatial.filterFreq);

      osc.start(noteTime);
      osc.stop(noteTime + 0.50);
    });
  }

  // 5. SPATIAL CART ROLLING RUMBLE (Carreto de Madeira)
  playCartRattle(pos) {
    this.resumeContext();
    if (!this.ctx) return;

    // Micro-local ao carregador de tijolos (20m máx, 3m min)
    const spatial = this.getSpatialInfo(pos, 20.0, 3.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    if (t - this.lastCartTime < 0.35) return;
    this.lastCartTime = t;

    const gainFactor = spatial.gain;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110 + Math.random() * 30, t);
    osc.frequency.linearRampToValueAtTime(45, t + 0.065);

    gain.gain.setValueAtTime(gainFactor * 0.12, t);
    gain.gain.setTargetAtTime(0.0001, t + 0.02, 0.02);

    osc.connect(gain);
    this.connectSpatial(gain, spatial.pan, 'generalSfx', spatial.filterFreq);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // 6. SPATIAL BEACH COMMERCE (Coco Verde, Mate Gelado, Atendimento Aconchegante)
  // ESTRITAMENTE MICRO-LOCAL: Raio de apenas 14 metros! Totalmente inaudível no morro e mar!
  // Timbre suave e abafado: copo de madeira pousando e gelo macio, ZERO moedas estridentes!
  playBeachCommerceSound(pos) {
    this.resumeContext();
    if (!this.ctx) return;

    // Raio estritamente micro-local: mais de 14 metros = SILÊNCIO TOTAL!
    const spatial = this.getSpatialInfo(pos, 14.0, 2.5);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    // Limitador de frequência: no máximo 1 som a cada 5 segundos por conveniência
    if (t - this.lastCommerceTime < 5.0) return;
    this.lastCommerceTime = t;

    const gainFactor = spatial.gain * 0.18;

    // 1. Toque suave e aveludado de madeira/copo pousando no balcão (sem tinidos metálicos!)
    const woodOsc = this.ctx.createOscillator();
    const woodGain = this.ctx.createGain();
    const woodFilter = this.ctx.createBiquadFilter();

    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(260, t);
    woodOsc.frequency.linearRampToValueAtTime(130, t + 0.07);

    woodFilter.type = 'lowpass';
    woodFilter.frequency.setValueAtTime(750, t);

    woodGain.gain.setValueAtTime(gainFactor * 0.20, t);
    woodGain.gain.setTargetAtTime(0.0001, t + 0.02, 0.035);

    woodOsc.connect(woodFilter);
    woodFilter.connect(woodGain);
    this.connectSpatial(woodGain, spatial.pan, 'generalSfx', spatial.filterFreq);
    woodOsc.start(t);
    woodOsc.stop(t + 0.09);

    // 2. Barulho suave e abafado de gelo no cooler de isopor (ruído filtrado suave)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.10;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, t);
    filter.Q.setValueAtTime(1.8, t);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(gainFactor * 0.08, t);
    noiseGain.gain.setTargetAtTime(0.0001, t + 0.015, 0.03);
    noise.connect(filter);
    filter.connect(noiseGain);
    this.connectSpatial(noiseGain, spatial.pan, 'generalSfx', spatial.filterFreq);
    noise.start(t);
    noise.stop(t + 0.06);
  }

  // 6b. SPATIAL RODA DE SAMBA GROOVE (Noites e Entardecer na Praça do Morro)
  // 6b. SPATIAL AUTÊNTICO SAMBA BRASILEIRO (Roda de Samba Carioca no Morro)
  // Partitura acústica e musical de Partido Alto & Samba de Raiz:
  // - Surdo de marcação: Beat 1 mudo (abafado), Beat 2 aberto retumbante (52Hz).
  // - Cavaquinho acústico: Progressão harmônica clássica em Ré Maior (D6/9 -> Bm7 -> Em7 -> A7) com palhetada sincopada.
  // - Pandeiro de couro & platinela: Telecoteco clássico carioca (ruído aveludado e suave).
  // - Palmas coletivas: Contratempo comunitário marcando a roda.
  playSambaRhythm(pos) {
    try {
      this.resumeContext();
      if (!this.ctx) return;

      // Raio estritamente local à Praça Central (38m máx, 6m min)
      // Como a praia fica a 47m de distância, o samba é 100% INAUDÍVEL na orla!
      const spatial = this.getSpatialInfo(pos, 38.0, 6.0);
      if (spatial.gain <= 0.015) return;

      const t = this.ctx.currentTime;
      // Cada compasso duplo dura 2.4s (tempo de 100 BPM no compasso 2/4 clássico)
      if (this.lastSambaTime && (t - this.lastSambaTime < 2.30)) return;
      this.lastSambaTime = t;

      const gainFactor = Math.min(1.0, Math.max(0.01, spatial.gain));

      // Contador de compasso (0, 1, 2, 3) para progressão harmônica clássica de samba
      this.sambaBarIndex = ((this.sambaBarIndex || 0) + 1) % 4;

      // 1. HARMONIA BRASILEIRA: 4 compassos clássicos do Samba de Raiz
      // Compassos 0 & 1: D6/9 -> Bm7
      // Compassos 2 & 3: Em7 -> A7(13)
      let chord1, chord2;
      if (this.sambaBarIndex % 2 === 0) {
        // D6/9 (D4, F#4, A4, B4) -> Bm7 (B3, D4, F#4, A4)
        chord1 = [293.66, 369.99, 440.00, 493.88];
        chord2 = [246.94, 293.66, 369.99, 440.00];
      } else {
        // Em7 (E4, G4, B4, D5) -> A7(13) (A3, C#4, G4, B4)
        chord1 = [329.63, 392.00, 493.88, 587.33];
        chord2 = [220.00, 277.18, 392.00, 493.88];
      }

      // Helper: Tocar batida de Surdo autêntica
      const playSurdo = (hitTime, isAberto, vol = 1.0) => {
        if (hitTime < t) hitTime = t;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        filter.type = 'lowpass';

        if (isAberto) {
          // Surdo Aberto (Beat 2 - O coração retumbante do morro!)
          osc.frequency.setValueAtTime(56, hitTime);
          osc.frequency.linearRampToValueAtTime(42, hitTime + 0.35);

          filter.frequency.setValueAtTime(140, hitTime);

          const peakGain = Math.max(0.001, gainFactor * 0.30 * vol);
          gain.gain.setValueAtTime(peakGain, hitTime);
          gain.gain.setTargetAtTime(0.0001, hitTime + 0.04, 0.12);

          osc.connect(filter);
          filter.connect(gain);
          this.connectSpatial(gain, spatial.pan, 'generalSfx', spatial.filterFreq);
          osc.start(hitTime);
          osc.stop(hitTime + 0.45);
        } else {
          // Surdo Mudo (Beat 1 - Toque abafado com a palma da mão)
          osc.frequency.setValueAtTime(74, hitTime);
          osc.frequency.linearRampToValueAtTime(52, hitTime + 0.14);

          filter.frequency.setValueAtTime(110, hitTime);

          const peakGain = Math.max(0.001, gainFactor * 0.15 * vol);
          gain.gain.setValueAtTime(peakGain, hitTime);
          gain.gain.setTargetAtTime(0.0001, hitTime + 0.02, 0.05);

          osc.connect(filter);
          filter.connect(gain);
          this.connectSpatial(gain, spatial.pan, 'generalSfx', spatial.filterFreq);
          osc.start(hitTime);
          osc.stop(hitTime + 0.22);
        }
      };

      // 1. SURDO DE MARCAÇÃO (2 compassos de 1.2s = 2.4s)
      playSurdo(t + 0.00, false);       // Compasso 1: Beat 1 mudo
      playSurdo(t + 0.45, false, 0.6);  // Síncope de resposta
      playSurdo(t + 0.60, true, 1.0);   // Compasso 1: Beat 2 ABERTO!
      playSurdo(t + 1.20, false);       // Compasso 2: Beat 1 mudo
      playSurdo(t + 1.65, false, 0.65); // Síncope de repique
      playSurdo(t + 1.80, true, 1.0);   // Compasso 2: Beat 2 ABERTO!

      // 2. CAVAQUINHO ACÚSTICO COM LEVADA DE PARTIDO ALTO
      // Toque suave e quente de cordas acústicas com ressonância de madeira nobre
      const playCavaquinhoStrum = (strumT, chord, intensity = 1.0) => {
        if (strumT < t) strumT = t;
        chord.forEach((freq, idx) => {
          const stringT = strumT + idx * 0.006;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          // Triangle wave gives warm, natural acoustic string body
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, stringT);

          // Warm resonant bandpass filter simulating wooden cavaquinho soundbox
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(Math.min(2200, freq * 2.2), stringT);
          filter.Q.setValueAtTime(1.8, stringT);

          const peakGain = Math.max(0.001, gainFactor * 0.075 * intensity);
          gain.gain.setValueAtTime(peakGain, stringT);
          gain.gain.setTargetAtTime(0.0001, stringT + 0.02, 0.055);

          osc.connect(filter);
          filter.connect(gain);
          this.connectSpatial(gain, spatial.pan, 'generalSfx', spatial.filterFreq);
          osc.start(stringT);
          osc.stop(stringT + 0.18);
        });
      };

      // Levada sincopada tradicional de Partido Alto:
      // Compasso 1 (com acorde 1):
      playCavaquinhoStrum(t + 0.00, chord1, 1.0); // Batida cheia no tempo 1
      playCavaquinhoStrum(t + 0.30, chord1, 0.7); // Puxada leve
      playCavaquinhoStrum(t + 0.45, chord1, 0.8); // Síncope carioca
      playCavaquinhoStrum(t + 0.60, chord1, 1.1); // Batida forte no tempo 2 (junto ao surdo)
      playCavaquinhoStrum(t + 0.90, chord1, 0.85); // Fechamento do swing
      // Compasso 2 (com acorde 2):
      playCavaquinhoStrum(t + 1.20, chord2, 1.0);
      playCavaquinhoStrum(t + 1.50, chord2, 0.7);
      playCavaquinhoStrum(t + 1.65, chord2, 0.8);
      playCavaquinhoStrum(t + 1.80, chord2, 1.1);
      playCavaquinhoStrum(t + 2.10, chord2, 0.85);

      // 3. PANDEIRO CARIOCA & TELECOTECO SUAVE
      // Toque aveludado de ruído filtrado simulando a pele e platinela
      const playPandeiroHit = (hitT, isAccent = false) => {
        if (hitT < t) hitT = t;
        const bufLen = Math.floor(this.ctx.sampleRate * 0.035);
        const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.28;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = isAccent ? 'bandpass' : 'highpass';
        filter.frequency.setValueAtTime(isAccent ? 1600 : 2600, hitT);
        filter.Q.setValueAtTime(2.0, hitT);

        const gain = this.ctx.createGain();
        const pGain = Math.max(0.001, gainFactor * (isAccent ? 0.12 : 0.065));
        gain.gain.setValueAtTime(pGain, hitT);
        gain.gain.setTargetAtTime(0.0001, hitT + 0.01, 0.025);

        noise.connect(filter);
        filter.connect(gain);
        this.connectSpatial(gain, spatial.pan, 'generalSfx', spatial.filterFreq);
        noise.start(hitT);
        noise.stop(hitT + 0.04);
      };

      // Balanço de 16 avos do pandeiro (telecoteco):
      const pandeiroTimes = [
        0.00, 0.15, 0.30, 0.45, 0.60, 0.75, 0.90, 1.05,
        1.20, 1.35, 1.50, 1.65, 1.80, 1.95, 2.10, 2.25
      ];
      pandeiroTimes.forEach(dt => {
        const isSlap = (Math.abs(dt - 0.60) < 0.05 || Math.abs(dt - 1.80) < 0.05);
        playPandeiroHit(t + dt, isSlap);
      });

      // 4. PALMAS COLETIVAS DA COMUNIDADE (Nos tempos fortes 2 e 4)
      const playPalma = (palmaT) => {
        if (palmaT < t) palmaT = t;
        const bufLen = Math.floor(this.ctx.sampleRate * 0.04);
        const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.30;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1300, palmaT);
        filter.Q.setValueAtTime(1.8, palmaT);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(Math.max(0.001, gainFactor * 0.14), palmaT);
        gain.gain.setTargetAtTime(0.0001, palmaT + 0.015, 0.03);
        src.connect(filter);
        filter.connect(gain);
        this.connectSpatial(gain, spatial.pan, 'generalSfx', spatial.filterFreq);
        src.start(palmaT);
        src.stop(palmaT + 0.045);
      };

      playPalma(t + 0.60);
      playPalma(t + 1.80);

    } catch (err) {
      console.warn('playSambaRhythm guarded:', err);
    }
  }

  // 7. SPATIAL ALTINHA BALL TOUCH (Toque Descalço / Cabeceio na Beira d'Água)
  playAltinhaKick(pos) {
    this.resumeContext();
    if (!this.ctx) return;

    // Micro-local à beira d'água leste da praia (22m máx, 4m min)
    const spatial = this.getSpatialInfo(pos, 22.0, 4.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    const gainFactor = spatial.gain;

    // Toque abafado do pé descalço na bola
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.linearRampToValueAtTime(65, t + 0.10);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, t);

    gain.gain.setValueAtTime(gainFactor * 0.24, t);
    gain.gain.setTargetAtTime(0.0001, t + 0.02, 0.035);

    osc.connect(filter);
    filter.connect(gain);
    this.connectSpatial(gain, spatial.pan, 'soccer', spatial.filterFreq);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // 8. SPATIAL MARESIA & COCONUT PALM BREEZE (Sonoridade de Maresia e Brisa dos Coqueiros)
  playMaresiaBreeze(pos) {
    this.resumeContext();
    if (!this.ctx) return;

    // Raio costeiro suave (45m máx, 10m min)
    const spatial = this.getSpatialInfo(pos, 45.0, 10.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    const gainFactor = spatial.gain;

    const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b = 0;
    for (let i = 0; i < bufferSize; i++) {
      b = b * 0.94 + (Math.random() * 2 - 1) * 0.06;
      data[i] = b * 0.35;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, t);
    filter.frequency.linearRampToValueAtTime(850, t + 0.7);
    filter.frequency.linearRampToValueAtTime(360, t + 1.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(gainFactor * 0.18, t + 0.5);
    gain.gain.setTargetAtTime(0.0001, t + 0.60, 0.35);

    noise.connect(filter);
    filter.connect(gain);

    // Connect to sea gain channel
    if (this.seaGainNode) {
      gain.connect(this.seaGainNode);
    } else {
      this.connectSpatial(gain, spatial.pan, 'sfx', spatial.filterFreq);
    }

    noise.start(t);
    noise.stop(t + 1.5);
  }
}
