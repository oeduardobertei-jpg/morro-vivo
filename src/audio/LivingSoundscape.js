// LivingSoundscape.js
// Paisagem Sonora Natural & Viva de Morro Vivo:
// - Mar estéreo de duas camadas (respiração profunda assimétrica + quebras individuais de ondas recuando na areia)
// - Fauna carioca autêntica e serena: Sabiá-laranjeira, Bem-te-vi distante, Gaivotas sobre a baía e Grilos de noite tropical
// - Resposta espacial orgânica à posição da câmera (praia vs encosta vs serra) e à fase do dia!

export class LivingSoundscape {
  constructor(core, seaBus, reverbBus = null) {
    this.core = core;
    this.ctx = core.ctx;
    this.dest = seaBus;
    this.reverbBus = reverbBus || core.reverbInput;

    this.active = false;
    this.phase = 'day';
    this.beachProximity = 0.45; // 0 = serra/alto, 1 = beira da água
    this.zoomProximity = 1.0;

    // Nós contínuos do mar estéreo
    this._surfSrc = null;
    this._lfoL = null;
    this._lfoR = null;
    this._surfFilterL = null;
    this._surfFilterR = null;
    this._surfGain = null;

    // Temporizadores orgânicos (em segundos) para eventos naturais
    this._waveTimer = 2.4;
    this._birdTimer = 4.5;
    this._gullTimer = 9.0;
    this._cricketTimer = 2.0;
  }

  start() {
    if (this.active || !this.ctx) return;
    this.active = true;

    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.core.pinkNoiseStereo;
    src.loop = true;

    // Separa os 2 canais decorrelacionados para criar mar estéreo largo (cada lado respira em frequência diferente!)
    const splitter = this.ctx.createChannelSplitter(2);
    const merger = this.ctx.createChannelMerger(2);

    const filterL = this.ctx.createBiquadFilter();
    filterL.type = 'lowpass';
    filterL.frequency.setValueAtTime(290, t);
    filterL.Q.value = 0.65;

    const filterR = this.ctx.createBiquadFilter();
    filterR.type = 'lowpass';
    filterR.frequency.setValueAtTime(310, t);
    filterR.Q.value = 0.65;

    // LFOs com razão irracional (0.083 Hz e 0.111 Hz): as ondas NUNCA soam repetitivas ou mecânicas!
    const lfoL = this.ctx.createOscillator();
    lfoL.frequency.value = 0.083;
    const lfoLGain = this.ctx.createGain();
    lfoLGain.gain.value = 115;
    lfoL.connect(lfoLGain);
    lfoLGain.connect(filterL.frequency);

    const lfoR = this.ctx.createOscillator();
    lfoR.frequency.value = 0.111;
    const lfoRGain = this.ctx.createGain();
    lfoRGain.gain.value = 125;
    lfoR.connect(lfoRGain);
    lfoRGain.connect(filterR.frequency);

    const surfGain = this.ctx.createGain();
    surfGain.gain.setValueAtTime(0.001, t);
    surfGain.gain.linearRampToValueAtTime(0.24, t + 1.8);

    src.connect(splitter);
    splitter.connect(filterL, 0);
    splitter.connect(filterR, 1);
    filterL.connect(merger, 0, 0);
    filterR.connect(merger, 0, 1);
    merger.connect(surfGain);
    surfGain.connect(this.dest);

    src.start(t);
    lfoL.start(t);
    lfoR.start(t);

    this._surfSrc = src;
    this._lfoL = lfoL;
    this._lfoR = lfoR;
    this._surfFilterL = filterL;
    this._surfFilterR = filterR;
    this._surfGain = surfGain;
  }

  stop() {
    this.active = false;
    [this._surfSrc, this._lfoL, this._lfoR].forEach(n => {
      if (!n) return;
      try { n.stop(); n.disconnect(); } catch (e) {}
    });
    this._surfSrc = null;
    this._lfoL = null;
    this._lfoR = null;
  }

  update(delta, camera, controls, phase = 'day') {
    this.phase = phase || 'day';
    if (!this.active || !this.ctx || this.ctx.state !== 'running') return;

    // Calcula proximidade da praia (z ~ 45+ = areia/mar; z ~ -60 = serra) e altura do zoom
    let targetZ = 12;
    if (controls && controls.target) targetZ = controls.target.z;
    const beachProx = Math.max(0.0, Math.min(1.0, (targetZ + 25) / 80.0));
    this.beachProximity = beachProx;

    const camY = camera ? Math.max(10, camera.position.y) : 55;
    const zoomFactor = Math.max(0.68, Math.min(1.85, 48.0 / camY));
    this.zoomProximity = zoomFactor;

    const t = this.ctx.currentTime;
    const nightCalm = (this.phase === 'night') ? 0.80 : 1.0;

    if (this._surfGain) {
      const surfTarget = (0.14 + beachProx * 0.36) * zoomFactor * nightCalm;
      this._surfGain.gain.setTargetAtTime(surfTarget, t, 0.45);
    }
    if (this._surfFilterL && this._surfFilterR) {
      const baseCut = (240 + beachProx * 240) * (this.phase === 'night' ? 0.88 : 1.0);
      this._surfFilterL.frequency.setTargetAtTime(baseCut, t, 0.55);
      this._surfFilterR.frequency.setTargetAtTime(baseCut * 1.07, t, 0.55);
    }

    // 1. Quebra orgânica de onda individual com espuma recuando na areia
    this._waveTimer -= delta;
    if (this._waveTimer <= 0) {
      this._waveTimer = 5.5 + Math.random() * 5.2;
      if (beachProx > 0.22) {
        this._triggerWaveWash(beachProx * zoomFactor * nightCalm);
      }
    }

    // 2. Pássaros brasileiros na encosta (Sabiá-laranjeira e Bem-te-vi suave — Dia e Alvorecer)
    if (this.phase === 'day' || this.phase === 'dawn') {
      this._birdTimer -= delta;
      if (this._birdTimer <= 0) {
        const freqMult = (this.phase === 'dawn') ? 0.72 : 1.0;
        this._birdTimer = (9.5 + Math.random() * 11.5) * freqMult;
        // Mais presente nas encostas/serra, mas ouve-se suavemente de todo o morro
        const hillPresence = 0.45 + (1.0 - beachProx) * 0.55;
        if (Math.random() < 0.72) {
          this._playSabiaSong(hillPresence * Math.min(1.3, zoomFactor));
        } else {
          this._playBemTeViCall(hillPresence * Math.min(1.2, zoomFactor));
        }
      }
    }

    // 3. Gaivotas distantes sobre a baía (Dia e Pôr do Sol quando perto da orla)
    if (this.phase === 'day' || this.phase === 'sunset') {
      this._gullTimer -= delta;
      if (this._gullTimer <= 0) {
        this._gullTimer = 14.0 + Math.random() * 14.0;
        if (beachProx > 0.35) {
          this._playDistantSeagull(beachProx * Math.min(1.25, zoomFactor));
        }
      }
    }

    // 4. Grilos suaves de noite carioca (Pôr do Sol e Noite — profundamente relaxante!)
    if (this.phase === 'night' || this.phase === 'sunset') {
      this._cricketTimer -= delta;
      if (this._cricketTimer <= 0) {
        this._cricketTimer = (this.phase === 'night')
          ? (2.4 + Math.random() * 2.8)
          : (4.8 + Math.random() * 4.2);
        const nightPresence = (this.phase === 'night' ? 0.85 : 0.45) * (0.45 + (1.0 - beachProx) * 0.55);
        this._playNightCricketChirp(nightPresence * Math.min(1.3, zoomFactor));
      }
    }
  }

  /** Onda orgânica crescendo suavemente, quebrando em espuma leve e recuando na areia molhada. */
  _triggerWaveWash(intensity) {
    const t = this.ctx.currentTime + 0.05;
    const dur = 4.2 + Math.random() * 1.8;
    const pan = (Math.random() - 0.5) * 1.1;

    // Corpo da onda crescendo
    const src = this.ctx.createBufferSource();
    src.buffer = this.core.pinkNoiseStereo;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(220, t);
    lp.frequency.exponentialRampToValueAtTime(760, t + dur * 0.32);
    lp.frequency.exponentialRampToValueAtTime(340, t + dur * 0.72);
    lp.frequency.exponentialRampToValueAtTime(160, t + dur);

    const gain = this.ctx.createGain();
    const peak = Math.min(0.28, 0.16 * intensity);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + dur * 0.30);
    gain.gain.exponentialRampToValueAtTime(peak * 0.42, t + dur * 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(lp);
    lp.connect(gain);
    this.core._routeVoice(gain, this.dest, pan, 0.22, this.reverbBus);
    src.start(t, Math.random() * 4.5, dur + 0.1);

    // Espuma cristalina recuando na areia (sussurro agudo bem macio!)
    const foam = this.ctx.createBufferSource();
    foam.buffer = this.core.pinkNoiseStereo;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1650, t + dur * 0.26);
    bp.frequency.exponentialRampToValueAtTime(920, t + dur * 0.92);
    bp.Q.value = 0.85;

    const fGain = this.ctx.createGain();
    const fPeak = peak * 0.28;
    fGain.gain.setValueAtTime(0.0001, t + dur * 0.22);
    fGain.gain.linearRampToValueAtTime(fPeak, t + dur * 0.38);
    fGain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.96);

    foam.connect(bp);
    bp.connect(fGain);
    this.core._routeVoice(fGain, this.dest, pan * 0.8, 0.18, this.reverbBus);
    foam.start(t + dur * 0.22, Math.random() * 4.5, dur * 0.8);
  }

  /** Canto poético do Sabiá-laranjeira (frases melódicas macias em flauta natural, banhadas em reverb de encosta). */
  _playSabiaSong(intensity) {
    const t = this.ctx.currentTime + 0.05;
    const pan = (Math.random() - 0.5) * 1.3;
    const transpose = 0.94 + Math.random() * 0.12;

    // Frases autênticas de sabiá: curvas suaves descendentes/ascendentes em intervalo de 3ª e 4ª
    const phrases = [
      [
        { dt: 0.00, f0: 1580, f1: 1460, dur: 0.22 },
        { dt: 0.28, f0: 1320, f1: 1410, dur: 0.26 },
        { dt: 0.62, f0: 1180, f1: 1120, dur: 0.30 }
      ],
      [
        { dt: 0.00, f0: 1480, f1: 1620, dur: 0.19 },
        { dt: 0.24, f0: 1380, f1: 1240, dur: 0.24 },
        { dt: 0.56, f0: 1480, f1: 1310, dur: 0.22 },
        { dt: 0.86, f0: 1220, f1: 1160, dur: 0.28 }
      ],
      [
        { dt: 0.00, f0: 1680, f1: 1490, dur: 0.24 },
        { dt: 0.32, f0: 1360, f1: 1290, dur: 0.32 }
      ]
    ];
    const song = phrases[Math.floor(Math.random() * phrases.length)];

    for (const note of song) {
      const nt = t + note.dt;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f0 * transpose, nt);
      osc.frequency.exponentialRampToValueAtTime(note.f1 * transpose, nt + note.dur);

      // Levíssimo 2º harmônico para timbre orgânico de siringe
      const h2 = this.ctx.createOscillator();
      h2.type = 'sine';
      h2.frequency.setValueAtTime(note.f0 * transpose * 2.0, nt);
      h2.frequency.exponentialRampToValueAtTime(note.f1 * transpose * 2.0, nt + note.dur);
      const h2Gain = this.ctx.createGain();
      h2Gain.gain.value = 0.07;
      h2.connect(h2Gain);

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2600;

      const gain = this.ctx.createGain();
      const peak = Math.min(0.055, 0.038 * intensity);
      gain.gain.setValueAtTime(0.0001, nt);
      gain.gain.linearRampToValueAtTime(peak, nt + note.dur * 0.24);
      gain.gain.linearRampToValueAtTime(peak * 0.85, nt + note.dur * 0.72);
      gain.gain.exponentialRampToValueAtTime(0.0001, nt + note.dur);

      osc.connect(lp);
      h2Gain.connect(lp);
      lp.connect(gain);
      this.core._routeVoice(gain, this.dest, pan, 0.55, this.reverbBus);

      osc.start(nt);
      h2.start(nt);
      osc.stop(nt + note.dur + 0.03);
      h2.stop(nt + note.dur + 0.03);
    }
  }

  /** Canto distante e simpático de Bem-te-vi (3 sílabas leves, suavemente filtradas pela distância!). */
  _playBemTeViCall(intensity) {
    const t = this.ctx.currentTime + 0.05;
    const pan = (Math.random() - 0.5) * 1.4;
    const tr = 0.96 + Math.random() * 0.08;

    // "Bem - te - ví!" (filtrado e suave para encantar sem jamais soar estridente)
    const syllables = [
      { dt: 0.00, f0: 2050, f1: 2180, dur: 0.09, amp: 0.72 },
      { dt: 0.14, f0: 2180, f1: 2480, dur: 0.08, amp: 0.82 },
      { dt: 0.27, f0: 2560, f1: 2120, dur: 0.22, amp: 1.00 }
    ];

    for (const s of syllables) {
      const nt = t + s.dt;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(s.f0 * tr, nt);
      osc.frequency.exponentialRampToValueAtTime(s.f1 * tr, nt + s.dur);

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400; // Distância na copa das árvores

      const gain = this.ctx.createGain();
      const peak = Math.min(0.036, 0.024 * intensity * s.amp);
      gain.gain.setValueAtTime(0.0001, nt);
      gain.gain.linearRampToValueAtTime(peak, nt + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, nt + s.dur);

      osc.connect(lp);
      lp.connect(gain);
      this.core._routeVoice(gain, this.dest, pan, 0.62, this.reverbBus);
      osc.start(nt);
      osc.stop(nt + s.dur + 0.03);
    }
  }

  /** Gaivota costeira distante planando sobre a baía. */
  _playDistantSeagull(intensity) {
    const t = this.ctx.currentTime + 0.05;
    const pan = (Math.random() - 0.5) * 1.3;
    const calls = Math.random() < 0.5 ? 2 : 1;

    for (let c = 0; c < calls; c++) {
      const nt = t + c * 0.44;
      const dur = 0.34;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      const base = 1320 + Math.random() * 180;
      osc.frequency.setValueAtTime(base * 0.92, nt);
      osc.frequency.exponentialRampToValueAtTime(base * 1.06, nt + 0.08);
      osc.frequency.exponentialRampToValueAtTime(base * 0.72, nt + dur);

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = base * 0.95;
      bp.Q.value = 3.2;

      const gain = this.ctx.createGain();
      const peak = Math.min(0.034, 0.022 * intensity);
      gain.gain.setValueAtTime(0.0001, nt);
      gain.gain.linearRampToValueAtTime(peak, nt + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, nt + dur);

      osc.connect(bp);
      bp.connect(gain);
      this.core._routeVoice(gain, this.dest, pan, 0.68, this.reverbBus);
      osc.start(nt);
      osc.stop(nt + dur + 0.03);
    }
  }

  /** Grilos suaves de noite de verão carioca (pulsos cadenciados macios, volume aconchegante). */
  _playNightCricketChirp(intensity) {
    const t = this.ctx.currentTime + 0.05;
    const pan = (Math.random() - 0.5) * 1.4;
    const freq = 3850 + Math.random() * 480;
    const pulses = 3 + (Math.random() < 0.4 ? 1 : 0);

    for (let p = 0; p < pulses; p++) {
      const pt = t + p * 0.058;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, pt);

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 4600;

      const gain = this.ctx.createGain();
      const peak = Math.min(0.016, 0.011 * intensity);
      gain.gain.setValueAtTime(0.0001, pt);
      gain.gain.linearRampToValueAtTime(peak, pt + 0.010);
      gain.gain.exponentialRampToValueAtTime(0.0001, pt + 0.042);

      osc.connect(lp);
      lp.connect(gain);
      this.core._routeVoice(gain, this.dest, pan, 0.45, this.reverbBus);
      osc.start(pt);
      osc.stop(pt + 0.048);
    }
  }
}
