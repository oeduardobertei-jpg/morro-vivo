// Web Audio Procedural Soundtrack & Spatial Audio Engine for Morro Vivo
// Generates gentle tropical ambient ocean waves, warm bossa-nova acoustic chords,
// and realistic spatial 3D procedural sound effects with per-channel mixing controls.
import * as THREE from 'three';

export class AmbientSoundtrack {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.userPausedMusic = false;
    this.chordInterval = null;
    this.beatStep = 0;
    this.barCount = 0;
    this.windNode = null;
    // Progressão Boom-Bap Funk Brasileiro & Samba-Rock (Am9 -> Dm9 -> G13 -> Cmaj9/E7#9)
    this.bossaProgression = [
      [220.00, 261.63, 329.63, 392.00, 493.88], // Am9 (Swing Carioca / Jorge Ben & D2 vibe)
      [146.83, 220.00, 261.63, 329.63, 349.23], // Dm9 (Groove de Baile Charme)
      [196.00, 246.94, 293.66, 349.23, 440.00], // G13 (Balanço Funk-Soul Brasileiro)
      [164.81, 207.65, 246.94, 293.66, 392.00]  // E7(#9) (Acorde Hendrix/Tim Maia de virada)
    ];
    this.bassProgression = [
      [55.00, 110.00, 82.41, 98.00],  // A1 -> A2 (Octave slap) -> E2 -> G2
      [73.42, 146.83, 110.00, 65.41], // D2 -> D3 (Octave slap) -> A2 -> C2
      [49.00, 98.00,  73.42, 87.31],  // G1 -> G2 (Octave slap) -> D2 -> F2
      [65.41, 82.41,  98.00, 103.83]  // C2 -> E2 -> G2 -> G#2 (Chromatic walk-up)
    ];
    this.chordIndex = 0;
    this.camera = null;
    this.controls = null;
    this.sambaProximityDuck = 1.0;

    // Per-channel mixer volumes (percentages 0 to 100)
    this.volumes = {
      master: 80,
      music: 65,
      samba: 75,
      construction: 45,
      soccer: 18, // Baixado completamente para nunca incomodar ou irritar
      sea: 65,    // Volume encorpado e refrescante da maresia
      sfx: 55
    };
    this.loadVolumes();

    // Web Audio Gain Nodes for multi-channel mixing
    this.masterGainNode = null;
    this.musicGainNode = null;
    this.sambaGainNode = null;
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

    // 2. Music Channel (Trilha Sonora Geral: Chill Lo-Fi Boom-Bap Rap)
    this.musicGainNode = this.ctx.createGain();
    this.musicGainNode.connect(this.masterGainNode);
    this.masterGain = this.musicGainNode; // Alias

    // 2b. Dedicated Roda de Samba Channel (Terreiro de Samba do Morro)
    this.sambaGainNode = this.ctx.createGain();
    this.sambaGainNode.connect(this.masterGainNode);

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
    if (!this.oceanBreezeActive && this.ctx && this.ctx.state === 'running') {
      this.startOceanBreeze();
    }
    // Inicia automaticamente a trilha sonora Boom-Bap tranquila na primeira interação, a menos que o jogador tenha pausado
    if (!this.isPlaying && !this.userPausedMusic && this.ctx) {
      this.play();
      if (this.onPlayStateChange) this.onPlayStateChange(true);
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
          const duck = this.sambaProximityDuck !== undefined ? this.sambaProximityDuck : 1.0;
          this.musicGainNode.gain.setTargetAtTime(fraction * 0.42 * duck, t, 0.15);
        }
        break;
      case 'samba':
        if (this.sambaGainNode) {
          this.sambaGainNode.gain.setTargetAtTime(fraction * 0.85, t, 0.1);
        }
        break;
      case 'sea':
        if (this.seaGainNode) {
          this.seaGainNode.gain.setValueAtTime(fraction * 0.78, t);
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
          this.soccerGainNode.gain.setValueAtTime(fraction * 0.15, t); // Reduzido drasticamente
        }
        break;
      case 'generalSfx':
        if (this.generalSfxGainNode) {
          this.generalSfxGainNode.gain.setValueAtTime(fraction * 0.55, t);
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
      this.ctx.resume();
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

  play() {
    if (!this.ctx) this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startOceanBreeze();
    this.beatStep = 0;
    this.barCount = 0;
    if (this.chordInterval) clearInterval(this.chordInterval);
    // Sequenciador Boom-Bap Funk Brasileiro a ~98 BPM (16 semicolcheias animadas: 153ms por step)
    this.playBoomBapStep();
    this.chordInterval = setInterval(() => {
      if (this.isPlaying) this.playBoomBapStep();
    }, 153);
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
    if (!this.ctx || this.windNode) return;
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
      data[i] = (b0 + b1 + b2 + b3 + b4) * 0.024;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter to simulate low, gentle coastal swells
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, this.ctx.currentTime);
    this.breezeFilter = filter;

    // LFO for wave swelling
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(130, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const breezeGain = this.ctx.createGain();
    breezeGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    this.breezeGainNode = breezeGain;

    noise.connect(filter);
    filter.connect(breezeGain);
    breezeGain.connect(this.seaGainNode || this.masterGainNode || this.ctx.destination);

    noise.start();
    lfo.start();
    this.windNode = noise;
    this.oceanBreezeActive = true;
  }

  // =========================================================================
  // TRILHA SONORA GERAL: BOOM-BAP FUNK BRASILEIRO & SAMBA-RAP GROOVE (~98 BPM)
  // Combina batida pesada de MPC Boom-Bap, síncope de Tamborzão/Miami Bass,
  // contrabaixo slap à la Tim Maia/Baile Charme, Clavinet/Guitarra Funky, Cuíca e Agogô!
  // =========================================================================
  playBoomBapStep() {
    if (!this.ctx || !this.isPlaying) return;
    const step = this.beatStep % 16;
    const isOddStep = (step % 2 === 1);
    // Swing brasileiro de MPC + Baile Charme nas semicolcheias ímpares (+18ms)
    const swingOffset = isOddStep ? 0.018 : 0.0;
    const t = this.ctx.currentTime + 0.01 + swingOffset;

    if (step === 0) {
      this.chordIndex = this.barCount % this.bossaProgression.length;
      this.barCount++;
    }
    const currentChord = this.bossaProgression[this.chordIndex];
    const isTurnaroundBar = (this.barCount % 2 === 0);

    // 1. CORTES DE SAMPLE MPC & CLAVINET FUNK BRASILEIRO (Stabs curtos, animados e sincopados, nada de pad lento!)
    if (step === 0) {
      this.playBoomBapRhodesChord(t, currentChord, 0.34, 1.0);
    } else if (step === 3) {
      this.playBoomBapRhodesChord(t, currentChord, 0.20, 0.82);
    } else if (step === 6) {
      this.playBoomBapRhodesChord(t, currentChord, 0.28, 0.90);
    } else if (step === 10) {
      this.playBoomBapRhodesChord(t, currentChord, 0.24, 0.85);
    } else if (step === 12 && isTurnaroundBar) {
      this.playBoomBapRhodesChord(t, currentChord, 0.22, 0.78);
    } else if (step === 14) {
      this.playBoomBapRhodesChord(t, currentChord, 0.26, 0.88);
    }

    // 2. BUMBO BOOM-BAP + SUB 808 DE FUNK CARIOCA ("TUM... tá-TUM-TUM... TUM-tá!")
    // Combina a cabeça do compasso do Boom-Bap (0, 8) com a síncope do Tamborzão/Partido Alto (3, 6, 10, 14)
    const kickHit =
      step === 0 ||
      step === 3 ||
      (step === 6 && !isTurnaroundBar) ||
      (step === 7 && isTurnaroundBar) ||
      step === 8 ||
      step === 10 ||
      (step === 11 && isTurnaroundBar) ||
      (step === 14 && (this.barCount % 4 !== 0));

    if (kickHit) {
      const kVel = (step === 0 || step === 8) ? 1.05 : (step === 3 || step === 10 ? 0.92 : 0.80);
      this.playBoomBapKick(t, kVel);
    }

    // 3. CAIXA ESTALADA DE BOOM-BAP (Beats 2 e 4: steps 4 e 12) + RIMSHOT DE TAMBORZÃO / PARTIDO ALTO
    if (step === 4 || step === 12) {
      this.playBoomBapSnare(t, 1.0);
    } else if (step === 15 && isTurnaroundBar) {
      this.playBoomBapSnare(t, 0.52);
    }

    // Rimshot / Tamborim sincopado de Funk Brasileiro ("Pá! Pá-Pá!")
    if (step === 2 || step === 6 || step === 11 || step === 14) {
      const rVel = (step === 6 || step === 14) ? 0.85 : 0.58;
      this.playFunkRimshot(t, rVel);
    }

    // 4. GANZÁ / CHIMBAL 16-STEPS ANIMADO + PRATO ABERTO NO CONTRATEMPO
    const isOpenHat = (step === 2 || step === 10 || (step === 14 && isTurnaroundBar));
    const hVel = (step % 4 === 0) ? 0.82 : (isOpenHat ? 0.76 : (isOddStep ? 0.48 : 0.64));
    this.playBoomBapHat(t, hVel, isOpenHat);

    // 5. AGOGÔ CARIOCA & CUÍCA DE MPC (Tempero autêntico de Boom-Bap / Funk Brasileiro)
    if (step === 3 || step === 7 || step === 10 || step === 15) {
      const highBell = (step === 3 || step === 10);
      this.playAgogoFunkBell(t, highBell ? 810 : 540, highBell ? 0.65 : 0.52);
    }
    if ((step === 6 && !isTurnaroundBar) || (step === 14 && isTurnaroundBar)) {
      this.playCuicaChop(t, step === 6);
    }

    // 6. CONTRABAIXO SLAP FUNK BRASILEIRO (Groove dançante com oitavas e filtro envelope)
    const bassNotes = this.bassProgression[this.chordIndex] || this.bassProgression[0];
    if (step === 0) {
      this.playBoomBapBass(t, bassNotes[0], 0.36, 1.05);
    } else if (step === 2) {
      this.playBoomBapBass(t, bassNotes[1], 0.14, 0.78); // Oitava Slap!
    } else if (step === 3) {
      this.playBoomBapBass(t, bassNotes[0], 0.22, 0.88);
    } else if (step === 6) {
      this.playBoomBapBass(t, bassNotes[2], 0.24, 0.85);
    } else if (step === 8) {
      this.playBoomBapBass(t, bassNotes[0], 0.32, 1.0);
    } else if (step === 10) {
      this.playBoomBapBass(t, bassNotes[1], 0.16, 0.82); // Oitava Slap!
    } else if (step === 11) {
      this.playBoomBapBass(t, bassNotes[2], 0.20, 0.76);
    } else if (step === 14) {
      this.playBoomBapBass(t, bassNotes[3], 0.26, 0.90); // Passagem funk para o próximo compasso
    }

    // 7. NAIPE DE METAIS (BRASS HIT) & GUITARRA WAH SAMBA-ROCK
    if (step === 6 || step === 13 || (step === 15 && isTurnaroundBar)) {
      const lickFreq = currentChord[step === 6 ? 4 : (step === 13 ? 3 : 2)] * 2.0;
      this.playBoomBapLick(t, lickFreq, step === 6);
    }

    this.beatStep = (this.beatStep + 1) % 16;
  }

  playBoomBapKick(t, velocity = 1.0) {
    const dest = this.musicGainNode || this.masterGainNode || this.ctx.destination;
    const osc = this.ctx.createOscillator();
    const clickOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const clickGain = this.ctx.createGain();

    // Sub 808 + Punch de MPC (160Hz -> 52Hz -> 36Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(52, t + 0.048);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.24);

    const peak = 0.42 * velocity;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    // Transiente de ataque do pedal no bumbo
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(340, t);
    clickOsc.frequency.exponentialRampToValueAtTime(75, t + 0.022);
    clickGain.gain.setValueAtTime(0.14 * velocity, t);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

    osc.connect(gain);
    gain.connect(dest);
    clickOsc.connect(clickGain);
    clickGain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.26);
    clickOsc.start(t);
    clickOsc.stop(t + 0.028);
  }

  playBoomBapSnare(t, velocity = 1.0) {
    const dest = this.musicGainNode || this.masterGainNode || this.ctx.destination;

    // 1. Corpo estalado de Caixa Boom-Bap (Punch em 220Hz -> 125Hz)
    const osc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(225, t);
    osc.frequency.exponentialRampToValueAtTime(122, t + 0.075);

    bodyGain.gain.setValueAtTime(0.22 * velocity, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);

    osc.connect(bodyGain);
    bodyGain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.10);

    // 2. Esteira viva e crocante de MPC + Clap de Baile Charme
    const bufLen = Math.floor(this.ctx.sampleRate * 0.15);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const env = Math.pow(1.0 - i / bufLen, 1.55);
      data[i] = (Math.random() * 2 - 1) * env * 0.45;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2150, t);
    filter.Q.setValueAtTime(0.95, t);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.24 * velocity, t);
    nGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(dest);

    noise.start(t);
    noise.stop(t + 0.15);
  }

  playFunkRimshot(t, velocity = 0.7) {
    const dest = this.musicGainNode || this.masterGainNode || this.ctx.destination;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Tamborim / Rimshot de Tamborzão Carioca
    osc.type = 'square';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(290, t + 0.032);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1450, t);
    filter.Q.setValueAtTime(2.4, t);

    gain.gain.setValueAtTime(0.09 * velocity, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.038);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.042);
  }

  playAgogoFunkBell(t, freq = 810, velocity = 0.6) {
    const dest = this.musicGainNode || this.masterGainNode || this.ctx.destination;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.055 * velocity, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  playCuicaChop(t, isHigh = true) {
    const dest = this.musicGainNode || this.masterGainNode || this.ctx.destination;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Gemido rítmico clássico de Cuíca / Vocal Chop de Samba-Rap
    osc.type = 'sawtooth';
    const startF = isHigh ? 390 : 320;
    const endF = isHigh ? 520 : 250;
    osc.frequency.setValueAtTime(startF, t);
    osc.frequency.exponentialRampToValueAtTime(endF, t + 0.085);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isHigh ? 950 : 720, t);
    filter.Q.setValueAtTime(4.2, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.065, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.10);
  }

  playBoomBapHat(t, velocity = 0.6, isOpen = false) {
    const dest = this.musicGainNode || this.masterGainNode || this.ctx.destination;
    const dur = isOpen ? 0.12 : 0.038;
    const bufLen = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const env = Math.pow(1.0 - i / bufLen, isOpen ? 1.5 : 2.8);
      data[i] = (Math.random() * 2 - 1) * env * 0.30;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(5200, t);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(10500, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.10 * velocity, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    noise.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(dest);

    noise.start(t);
    noise.stop(t + dur + 0.01);
  }

  playBoomBapBass(t, freq, duration = 0.32, velocity = 1.0) {
    const dest = this.musicGainNode || this.masterGainNode || this.ctx.destination;
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Contrabaixo Slap/Funk com harmônicos ricos (Sawtooth filtrado + Sub Sine)
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq, t);

    // Envelope Filter Funky ("Bootsy / Tim Maia" bass punch)
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(2.8, t);
    filter.frequency.setValueAtTime(640, t);
    filter.frequency.exponentialRampToValueAtTime(135, t + duration * 0.85);

    const peak = 0.24 * velocity;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.010);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    subOsc.start(t);
    osc.stop(t + duration + 0.02);
    subOsc.stop(t + duration + 0.02);
  }

  playBoomBapRhodesChord(t, chord, duration = 0.30, velocity = 1.0) {
    const dest = this.musicGainNode || this.masterGainNode || this.ctx.destination;
    // Corte percussivo de Clavinet / Wurlitzer / Sample de Samba-Soul no estilo MPC
    chord.forEach((freq, idx) => {
      const startTime = t + idx * 0.006;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      filter.type = 'bandpass';
      filter.Q.setValueAtTime(1.8, startTime);
      filter.frequency.setValueAtTime(1650, startTime);
      filter.frequency.exponentialRampToValueAtTime(620, startTime + duration);

      const peak = 0.055 * velocity;
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    });
  }

  playBoomBapLick(t, freq, isBrassStab = false) {
    const dest = this.musicGainNode || this.masterGainNode || this.ctx.destination;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Guitarra Wah-Wah Samba-Rock ou Brass Stab de Funk Brasileiro
    osc.type = isBrassStab ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq * 0.96, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.025);

    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.2, t);
    filter.frequency.setValueAtTime(isBrassStab ? 900 : 750, t);
    filter.frequency.exponentialRampToValueAtTime(isBrassStab ? 2200 : 1850, t + 0.09);
    filter.frequency.exponentialRampToValueAtTime(680, t + 0.24);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.068, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(t);
    osc.stop(t + 0.27);
  }

  // PROCEDURAL SOUND EFFECTS (SFX) SYNTHESIZERS
  setCamera(camera, controls = null) {
    this.camera = camera;
    this.controls = controls;
  }

  update(delta) {
    if (!this.ctx || !this.breezeGainNode) return;
    // Ambient sea breeze volume response to focus target & altitude (maresia gostosa, viva e responsiva ao zoom)
    let targetVol = 0.16; // Brisa suave constante em todo o morro
    if (this.controls && this.controls.target) {
      const z = this.controls.target.z;
      if (z > 40) {
        targetVol = 0.52; // Diretamente nas areias e na arrebentação da praia
      } else if (z > 15) {
        targetVol = 0.34; // Bairro litorâneo e calçadão
      } else {
        targetVol = 0.16; // Encostas e cumeada
      }
    }
    if (this.camera) {
      // Zoom proximity factor: conforme dá zoom / se aproxima do terreno, a maresia encorpa significativamente!
      const camY = Math.max(10, this.camera.position.y);
      // Zoom in (camY ~ 12-25m) => até 2.40x; Zoom out (camY ~ 75-90m) => 0.70x
      const zoomFactor = Math.max(0.70, Math.min(2.40, 52.0 / camY));
      targetVol *= zoomFactor;
    }
    this.breezeGainNode.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.4);

    // Ajuste dinâmico de brilho das ondas conforme aproximação da praia
    if (this.breezeFilter) {
      let targetFreq = 340;
      if (this.controls && this.controls.target && this.controls.target.z > 20) {
        const beachProximity = Math.min(1.0, (this.controls.target.z - 20) / 35.0);
        targetFreq = 340 + beachProximity * 190; // Até 530Hz para escutar a espuma e o arrebentar fresco das ondas
      }
      this.breezeFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.5);
    }

    // Crossfade/Ducking automático da Trilha Boom-Bap quando a câmera chega bem pertinho da Roda de Samba (-2, 15.2, -4)
    if (this.camera && this.musicGainNode) {
      const sambaX = -2.0, sambaY = 15.2, sambaZ = -4.0;
      const focusDist = (this.controls && this.controls.target)
        ? Math.hypot(this.controls.target.x - sambaX, this.controls.target.z - sambaZ)
        : 999;
      const camDist = Math.hypot(this.camera.position.x - sambaX, this.camera.position.y - sambaY, this.camera.position.z - sambaZ);
      const effDist = Math.max(focusDist, camDist * 0.62);

      let targetDuck = 1.0;
      if (effDist < 28.0) {
        // Quando chegamos bem pertinho da Roda de Samba (< 28m), reduz suavemente o Boom-Bap para o samba brilhar
        const prox = Math.max(0.0, Math.min(1.0, (28.0 - effDist) / 18.0));
        targetDuck = 1.0 - prox * 0.72; // Cai até 28% bem no meio da roda
      }
      this.sambaProximityDuck = targetDuck;
      const musicFraction = (this.volumes.music ?? 65) / 100.0;
      this.musicGainNode.gain.setTargetAtTime(musicFraction * 0.34 * targetDuck, this.ctx.currentTime, 0.35);
    }
  }

  getSpatialInfo(pos, maxDist = 70.0, minDist = 6.0) {
    if (!pos || !this.camera) return { gain: 0, pan: 0, filterFreq: 20000 };
    const px = pos.x !== undefined ? pos.x : 0;
    const py = pos.y !== undefined ? pos.y : 0;
    const pz = pos.z !== undefined ? pos.z : 0;

    // 1. Distância ao Ponto Focal do Jogador (controls.target)
    let focusDist = 0;
    if (this.controls && this.controls.target) {
      const tx = this.controls.target.x - px;
      const ty = this.controls.target.y - py;
      const tz = this.controls.target.z - pz;
      focusDist = Math.hypot(tx, ty, tz);
    } else {
      const dx = this.camera.position.x - px;
      const dy = this.camera.position.y - py;
      const dz = this.camera.position.z - pz;
      focusDist = Math.hypot(dx, dy, dz);
    }

    // Corte além do raio focal máximo
    if (focusDist >= maxDist) return { gain: 0, pan: 0, filterFreq: 1200 };

    // 2. Curva Smoothstep Cúbica Natural em relação ao foco
    let gain = 1.0;
    if (focusDist > minDist) {
      const norm = (maxDist - focusDist) / (maxDist - minDist);
      gain = norm * norm * (3.0 - 2.0 * norm);
    }

    // 3. Atenuação de Altitude/Zoom (visão panorâmica = sem poluição sonora; zoom próximo = imersão rica)
    const camY = this.camera ? Math.max(12, this.camera.position.y) : 60;
    const zoomFactor = Math.max(0.24, Math.min(1.0, 45.0 / camY));
    gain *= zoomFactor;

    // 4. Absorção do Ar
    const distRatio = Math.max(0, Math.min(1, focusDist / maxDist));
    const filterFreq = Math.round(18000 - distRatio * 14500);

    // 5. Spatial Stereo Panning por projeção NDC de tela
    let pan = 0;
    try {
      const v = new THREE.Vector3(px, py, pz);
      v.project(this.camera);
      if (v.z > 1.0 || v.z < -1.0) {
        pan = v.x < 0 ? -0.5 : 0.5;
        gain *= 0.35;
      } else {
        pan = Math.max(-0.75, Math.min(0.75, v.x * 0.85));
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
    if (channel === 'samba' && this.sambaGainNode) dest = this.sambaGainNode;
    else if (channel === 'construction' && this.constructionGainNode) dest = this.constructionGainNode;
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

    // Raio acústico de obra (80m máx, 5m min)
    const spatial = this.getSpatialInfo(pos, 80.0, 5.0);
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

  // 2. SPATIAL SOCCER BALL KICK (Chute Suave da Pelada de Várzea - Baixado e Intimista)
  playSoccerKick(pos) {
    this.resumeContext();
    if (!this.ctx) return;

    // Raio acústico focado estritamente no campinho (35m máx, 5m min)
    const spatial = this.getSpatialInfo(pos, 35.0, 5.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    if (t - this.lastKickTime < 0.18) return;
    this.lastKickTime = t;

    const gainFactor = spatial.gain;

    // Toque suave e aveludado de bola rolando
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(45, t + 0.11);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, t);

    const targetVol = gainFactor * 0.07; // Volume super baixo e sutil
    gain.gain.setValueAtTime(targetVol, t);
    gain.gain.setTargetAtTime(0.0001, t + 0.03, 0.04);

    osc.connect(filter);
    filter.connect(gain);
    this.connectSpatial(gain, spatial.pan, 'soccer', spatial.filterFreq);

    osc.start(t);
    osc.stop(t + 0.13);

    // Estalo sutil atenuado
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(480, t);
    clickOsc.frequency.linearRampToValueAtTime(140, t + 0.03);
    clickGain.gain.setValueAtTime(gainFactor * 0.03, t);
    clickGain.gain.setTargetAtTime(0.0001, t + 0.01, 0.015);

    clickOsc.connect(clickGain);
    this.connectSpatial(clickGain, spatial.pan, 'soccer', spatial.filterFreq);
    clickOsc.start(t);
    clickOsc.stop(t + 0.04);
  }

  // 3. SPATIAL GOAL WHISTLE & CROWD CHEER (Apito Suave e Apenas no Campinho)
  playGoalWhistle(pos) {
    this.resumeContext();
    if (!this.ctx) return;

    // Raio acústico restrito apenas a quem estiver olhando o campinho (28m máx, 4m min - nunca mais audível de longe)
    const spatial = this.getSpatialInfo(pos, 28.0, 4.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    if (t - this.lastWhistleTime < 3.0) return;
    this.lastWhistleTime = t;

    const gainFactor = spatial.gain;

    // Apito suave e aveludado (frequências médias macias ~950Hz, sem agudos estridentes)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, t);
    osc.frequency.setValueAtTime(1080, t + 0.07);
    osc.frequency.setValueAtTime(920, t + 0.14);
    osc.frequency.setValueAtTime(1100, t + 0.21);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1250, t);

    const targetVol = gainFactor * 0.04; // Volume ultra baixo e delicado
    gain.gain.setValueAtTime(targetVol, t);
    gain.gain.setTargetAtTime(0.0001, t + 0.24, 0.06);

    osc.connect(filter);
    filter.connect(gain);
    this.connectSpatial(gain, spatial.pan, 'soccer', spatial.filterFreq);

    osc.start(t);
    osc.stop(t + 0.38);

    // Celebração discreta no alambrado
    const cheerBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.9), this.ctx.sampleRate);
    const cheerData = cheerBuffer.getChannelData(0);
    for (let i = 0; i < cheerData.length; i++) {
      cheerData[i] = (Math.random() * 2 - 1) * 0.12;
    }
    const cheerSource = this.ctx.createBufferSource();
    cheerSource.buffer = cheerBuffer;

    const cheerFilter = this.ctx.createBiquadFilter();
    cheerFilter.type = 'bandpass';
    cheerFilter.frequency.setValueAtTime(420, t);
    cheerFilter.frequency.linearRampToValueAtTime(580, t + 0.30);
    cheerFilter.frequency.linearRampToValueAtTime(320, t + 0.9);

    const cheerGain = this.ctx.createGain();
    cheerGain.gain.setValueAtTime(0.001, t);
    cheerGain.gain.linearRampToValueAtTime(gainFactor * 0.04, t + 0.20);
    cheerGain.gain.setTargetAtTime(0.0001, t + 0.35, 0.20);

    cheerSource.connect(cheerFilter);
    cheerFilter.connect(cheerGain);
    this.connectSpatial(cheerGain, spatial.pan, 'soccer', spatial.filterFreq);

    cheerSource.start(t);
    cheerSource.stop(t + 0.95);
  }

  // 4. SPATIAL CELEBRATION CHIME (Nova Casa / Puxadinho)
  playCelebrationChime(pos) {
    this.resumeContext();
    if (!this.ctx) return;

    // Raio acústico de celebração de nova laje (85m máx, 6m min)
    const spatial = this.getSpatialInfo(pos, 85.0, 6.0);
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

    // Raio acústico do carreto de tijolos (65m máx, 5m min)
    const spatial = this.getSpatialInfo(pos, 65.0, 5.0);
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

    // Raio acústico suave da orla (50m máx, 4m min)
    const spatial = this.getSpatialInfo(pos, 50.0, 4.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    // Limitador de frequência suave
    if (t - this.lastCommerceTime < 1.8) return;
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
  playSambaRhythm(pos, isFullRoda = true) {
    try {
      this.resumeContext();
      if (!this.ctx) return;

      // Roda de Samba espacial: fica bem baixinha ao longe e encorpa/aumenta de verdade só quando chegamos bem pertinho!
      const spatial = this.getSpatialInfo(pos, 56.0, 5.0);
      if (spatial.gain <= 0.005) return;

      const px = pos.x !== undefined ? pos.x : -2;
      const py = pos.y !== undefined ? pos.y : 15.2;
      const pz = pos.z !== undefined ? pos.z : -4;
      const focusDist = (this.controls && this.controls.target)
        ? Math.hypot(this.controls.target.x - px, this.controls.target.z - pz)
        : 999;
      const camDist = this.camera
        ? Math.hypot(this.camera.position.x - px, this.camera.position.y - py, this.camera.position.z - pz)
        : 999;
      const effectiveDist = Math.max(focusDist, camDist * 0.62);
      if (effectiveDist > 56.0) return;

      const t = this.ctx.currentTime;
      // Cadência: 2.30s para roda completa, 3.60s para dedilhado acústico suave de dia
      const cadence = isFullRoda ? 2.30 : 3.60;
      if (this.lastSambaTime && (t - this.lastSambaTime < (cadence - 0.15))) return;
      this.lastSambaTime = t;

      // Curva de proximidade íngreme: de longe (26m..56m) fica um murmúrio baixinho (0.02..0.10);
      // chegando bem pertinho (< 24m até 6m), o volume sobe com tudo até 1.0!
      let proximityGain = 0.03;
      if (effectiveDist <= 26.0) {
        const closeT = Math.max(0.0, Math.min(1.0, (26.0 - effectiveDist) / 19.0));
        proximityGain = 0.08 + Math.pow(closeT, 1.85) * 0.92;
      } else {
        const farT = Math.max(0.0, Math.min(1.0, (56.0 - effectiveDist) / 30.0));
        proximityGain = farT * 0.08;
      }
      const gainFactor = Math.min(1.0, Math.max(0.008, proximityGain));

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

          const peakGain = Math.max(0.001, gainFactor * 0.42 * vol);
          gain.gain.setValueAtTime(peakGain, hitTime);
          gain.gain.setTargetAtTime(0.0001, hitTime + 0.04, 0.12);

          osc.connect(filter);
          filter.connect(gain);
          this.connectSpatial(gain, spatial.pan, 'samba', spatial.filterFreq);
          osc.start(hitTime);
          osc.stop(hitTime + 0.45);
        } else {
          // Surdo Mudo (Beat 1 - Toque abafado com a palma da mão)
          osc.frequency.setValueAtTime(74, hitTime);
          osc.frequency.linearRampToValueAtTime(52, hitTime + 0.14);

          filter.frequency.setValueAtTime(110, hitTime);

          const peakGain = Math.max(0.001, gainFactor * 0.22 * vol);
          gain.gain.setValueAtTime(peakGain, hitTime);
          gain.gain.setTargetAtTime(0.0001, hitTime + 0.02, 0.05);

          osc.connect(filter);
          filter.connect(gain);
          this.connectSpatial(gain, spatial.pan, 'samba', spatial.filterFreq);
          osc.start(hitTime);
          osc.stop(hitTime + 0.22);
        }
      };

      // 1. SURDO DE MARCAÇÃO (Apenas na Roda Completa festiva à noite e pôr do sol)
      if (isFullRoda) {
        playSurdo(t + 0.00, false);       // Compasso 1: Beat 1 mudo
        playSurdo(t + 0.45, false, 0.6);  // Síncope de resposta
        playSurdo(t + 0.60, true, 1.0);   // Compasso 1: Beat 2 ABERTO!
        playSurdo(t + 1.20, false);       // Compasso 2: Beat 1 mudo
        playSurdo(t + 1.65, false, 0.65); // Síncope de repique
        playSurdo(t + 1.80, true, 1.0);   // Compasso 2: Beat 2 ABERTO!
      }

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

          const peakGain = Math.max(0.001, gainFactor * 0.12 * intensity);
          gain.gain.setValueAtTime(peakGain, stringT);
          gain.gain.setTargetAtTime(0.0001, stringT + 0.02, 0.055);

          osc.connect(filter);
          filter.connect(gain);
          this.connectSpatial(gain, spatial.pan, 'samba', spatial.filterFreq);
          osc.start(stringT);
          osc.stop(stringT + 0.18);
        });
      };

      // Levada sincopada tradicional de Partido Alto:
      const cavacoIntensity = isFullRoda ? 1.0 : 0.70;
      // Compasso 1 (com acorde 1):
      playCavaquinhoStrum(t + 0.00, chord1, 1.0 * cavacoIntensity); // Batida cheia no tempo 1
      playCavaquinhoStrum(t + 0.30, chord1, 0.7 * cavacoIntensity); // Puxada leve
      playCavaquinhoStrum(t + 0.45, chord1, 0.8 * cavacoIntensity); // Síncope carioca
      playCavaquinhoStrum(t + 0.60, chord1, 1.1 * cavacoIntensity); // Batida forte no tempo 2 (junto ao surdo)
      playCavaquinhoStrum(t + 0.90, chord1, 0.85 * cavacoIntensity); // Fechamento do swing
      // Compasso 2 (com acorde 2):
      playCavaquinhoStrum(t + 1.20, chord2, 1.0 * cavacoIntensity);
      playCavaquinhoStrum(t + 1.50, chord2, 0.7 * cavacoIntensity);
      playCavaquinhoStrum(t + 1.65, chord2, 0.8 * cavacoIntensity);
      playCavaquinhoStrum(t + 1.80, chord2, 1.1 * cavacoIntensity);
      playCavaquinhoStrum(t + 2.10, chord2, 0.85 * cavacoIntensity);

      // 3. PANDEIRO CARIOCA & TELECOTECO SUAVE (Apenas na Roda Completa)
      if (isFullRoda) {
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
          const pGain = Math.max(0.001, gainFactor * (isAccent ? 0.16 : 0.095));
          gain.gain.setValueAtTime(pGain, hitT);
          gain.gain.setTargetAtTime(0.0001, hitT + 0.01, 0.025);

          noise.connect(filter);
          filter.connect(gain);
          this.connectSpatial(gain, spatial.pan, 'samba', spatial.filterFreq);
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
          gain.gain.setValueAtTime(Math.max(0.001, gainFactor * 0.18), palmaT);
          gain.gain.setTargetAtTime(0.0001, palmaT + 0.015, 0.03);
          src.connect(filter);
          filter.connect(gain);
          this.connectSpatial(gain, spatial.pan, 'samba', spatial.filterFreq);
          src.start(palmaT);
          src.stop(palmaT + 0.045);
        };

        playPalma(t + 0.60);
        playPalma(t + 1.80);
      }

    } catch (err) {
      console.warn('playSambaRhythm guarded:', err);
    }
  }

  // 7. SPATIAL ALTINHA BALL TOUCH (Toque Descalço / Cabeceio na Beira d'Água)
  playAltinhaKick(pos) {
    this.resumeContext();
    if (!this.ctx) return;

    // Raio acústico da altinha na areia (55m máx, 4m min)
    const spatial = this.getSpatialInfo(pos, 55.0, 4.0);
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

    // Raio costeiro suave (75m máx, 10m min)
    const spatial = this.getSpatialInfo(pos, 75.0, 10.0);
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
