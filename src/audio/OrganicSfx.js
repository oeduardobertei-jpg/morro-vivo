// OrganicSfx.js
// Biblioteca de efeitos sonoros acústicos e Roda de Samba autêntica para Morro Vivo:
// - Roda de Samba Carioca: Cavaquinho Karplus-Strong real (palhetada pra baixo/cima), Baixaria de Violão 7 Cordas,
//   Surdo de Pele com maceta de feltro, Pandeiro em 4 articulações e Palmas humanas coletivas em estéreo.
// - Foley artesanal acolhedor: madeira/martelo de obra, coco & gelo na praia, marimba+violão de celebração,
//   chute de couro real, apito suave de madeira, carreto de tijolos, brisa nas palmeiras e micro-feedback tátil de UI.

// Progressão autêntica de 8 compassos de Samba de Raiz em Ré Maior (D6/9 -> B7(b9) -> Em7 -> A7(13) -> F#m7 -> B7 -> Em7 -> A7)
const SAMBA_BARS = [
  { cavaco: [62, 66, 69, 71], bass: [50, 45, 49, 47] }, // D6/9  (D4, F#4, A4, B4) + baixaria descendente
  { cavaco: [63, 66, 69, 72], bass: [47, 51, 54, 52] }, // B7b9  (D#4, F#4, A4, C5)
  { cavaco: [64, 67, 71, 74], bass: [52, 47, 50, 49] }, // Em7   (E4, G4, B4, D5)
  { cavaco: [61, 67, 69, 71], bass: [45, 49, 52, 50] }, // A7(13)(C#4, G4, A4, B4)
  { cavaco: [66, 69, 73, 76], bass: [54, 49, 52, 51] }, // F#m7  (F#4, A4, C#5, E5)
  { cavaco: [63, 66, 69, 71], bass: [47, 51, 54, 52] }, // B7    (D#4, F#4, A4, B4)
  { cavaco: [64, 67, 71, 74], bass: [52, 50, 49, 47] }, // Em7   (baixaria clássica descendo para Lá!)
  { cavaco: [61, 67, 69, 73], bass: [45, 47, 49, 50] }  // A7    (subida para resolver em D6/9!)
];

export const OrganicSfxMixin = {
  /** Cria cadeia espacial temporária (absorção de ar + panorama estéreo + canal de destino) para um som do mundo. */
  _makeSpatialBus(spatial, channel = 'sfx') {
    let dest = this.sfxMasterNode || this.masterGainNode || this.ctx.destination;
    if (channel === 'samba' && this.sambaGainNode) dest = this.sambaGainNode;
    else if (channel === 'construction' && this.constructionGainNode) dest = this.constructionGainNode;
    else if (channel === 'soccer' && this.soccerGainNode) dest = this.soccerGainNode;
    else if (channel === 'generalSfx' && this.generalSfxGainNode) dest = this.generalSfxGainNode;
    else if (channel === 'sea' && this.seaGainNode) dest = this.seaGainNode;

    const input = this.ctx.createGain();
    input.gain.value = 1.0;

    let node = input;
    if (spatial && spatial.filterFreq && spatial.filterFreq < 14500) {
      const air = this.ctx.createBiquadFilter();
      air.type = 'lowpass';
      air.frequency.value = Math.max(850, spatial.filterFreq);
      node.connect(air);
      node = air;
    }

    if (spatial && this.ctx.createStereoPanner && Math.abs(spatial.pan || 0) > 0.005) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.85, Math.min(0.85, spatial.pan));
      node.connect(panner);
      node = panner;
    }

    node.connect(dest);
    return input;
  },

  // =========================================================================
  // 1. RODA DE SAMBA CARIOCA AUTÊNTICA (Terreiro de Samba no Morro do Sol)
  // =========================================================================
  playSambaRhythm(pos, isFullRoda = true) {
    try {
      this.resumeContext();
      if (!this.ctx || !this.core || this.ctx.state !== 'running') return;

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

      const t = this.ctx.currentTime + 0.02;
      const cadence = isFullRoda ? 2.30 : 3.60;
      if (this.lastSambaTime && (t - this.lastSambaTime < (cadence - 0.16))) return;
      this.lastSambaTime = t;

      // Curva de proximidade íngreme: sussurro distante (26m..56m) -> roda viva e calorosa pertinho (< 24m)
      let proximityGain = 0.03;
      if (effectiveDist <= 26.0) {
        const closeT = Math.max(0.0, Math.min(1.0, (26.0 - effectiveDist) / 19.0));
        proximityGain = 0.09 + Math.pow(closeT, 1.75) * 0.91;
      } else {
        const farT = Math.max(0.0, Math.min(1.0, (56.0 - effectiveDist) / 30.0));
        proximityGain = farT * 0.09;
      }
      const vol = Math.min(1.0, Math.max(0.01, proximityGain));
      const bus = this._makeSpatialBus(spatial, 'samba');
      const revSend = 0.22 + (1.0 - vol) * 0.24; // Mais distante = mais ar livre da encosta!

      // Avança 2 compassos da progressão de 8 compassos de Samba de Raiz
      const barA = SAMBA_BARS[(this.sambaBarIndex || 0) % SAMBA_BARS.length];
      const barB = SAMBA_BARS[((this.sambaBarIndex || 0) + 1) % SAMBA_BARS.length];
      this.sambaBarIndex = ((this.sambaBarIndex || 0) + 2) % SAMBA_BARS.length;

      // Helper: Palhetada real de Cavaquinho Karplus-Strong (alterna baixo/cima com micro-spread orgânico!)
      const strumCavaco = (strumT, notes, strength, isUpstroke = false, dur = 0.24) => {
        const ordered = isUpstroke ? [...notes].reverse() : notes;
        const spread = isUpstroke ? 0.006 : 0.008;
        const jitter = (Math.random() - 0.5) * 0.005;
        for (let i = 0; i < ordered.length; i++) {
          this.core.playCavacoNote(
            ordered[i],
            strumT + jitter + i * spread,
            vol * strength * (0.88 + Math.random() * 0.20),
            dur,
            isUpstroke ? 0.08 : -0.06,
            bus,
            revSend
          );
        }
      };

      // --- MODO DIA: Solo intimista e relaxado do Tião do Cavaco no Terreiro ---
      if (!isFullRoda) {
        // Dedilhado + batidinha macia de cavaquinho ao sol (espaçado e gostoso!)
        const dayStrums = [
          { dt: 0.00, bar: barA, str: 0.72, up: false, dur: 0.55 },
          { dt: 0.48, bar: barA, str: 0.48, up: true,  dur: 0.35 },
          { dt: 0.82, bar: barA, str: 0.62, up: false, dur: 0.48 },
          { dt: 1.55, bar: barB, str: 0.74, up: false, dur: 0.58 },
          { dt: 2.04, bar: barB, str: 0.50, up: true,  dur: 0.36 },
          { dt: 2.38, bar: barB, str: 0.65, up: false, dur: 0.65 }
        ];
        for (const s of dayStrums) {
          strumCavaco(t + s.dt, s.bar.cavaco, s.str, s.up, s.dur);
        }
        // Pequeno arpejo melódico final nas cordas agudas do cavaquinho
        barB.cavaco.forEach((m, idx) => {
          this.core.playCavacoNote(m, t + 2.85 + idx * 0.11, vol * 0.52, 0.55, 0.05, bus, revSend + 0.08);
        });
        return;
      }

      // --- MODO NOITE / PÔR DO SOL: RODA DE SAMBA COMPLETA (2 compassos em 2.30s -> 1.15s/compasso) ---
      const barLen = 1.15;
      const step = barLen / 8.0; // 8 colcheias/semicolcheias cariocas por compasso (0.14375s)

      [barA, barB].forEach((bar, bIdx) => {
        const bt = t + bIdx * barLen;

        // 1. SURDO DE PELE (Beat 1 abafado, síncope de resposta, Beat 2 ABERTO e retumbante!)
        this.core.playWarmSurdo(bt + 0 * step, vol * 0.72, false, -0.05, bus, revSend * 0.7);
        this.core.playWarmSurdo(bt + 3 * step + 0.008, vol * 0.45, false, -0.05, bus, revSend * 0.6);
        this.core.playWarmSurdo(bt + 4 * step, vol * 0.96, true,  -0.05, bus, revSend * 0.8);

        // 2. BAIXARIA DE VIOLÃO 7 CORDAS (conduz o caminho melódico grave entre os acordes!)
        this.core.playAcousticBassNote(bar.bass[0], bt + 0 * step, vol * 0.76, step * 3.2, -0.18, bus, revSend * 0.6);
        this.core.playAcousticBassNote(bar.bass[1], bt + 4 * step, vol * 0.72, step * 2.2, -0.18, bus, revSend * 0.6);
        this.core.playAcousticBassNote(bar.bass[2], bt + 6 * step, vol * 0.58, step * 1.1, -0.18, bus, revSend * 0.5);
        this.core.playAcousticBassNote(bar.bass[3], bt + 7 * step + 0.008, vol * 0.62, step * 1.1, -0.18, bus, revSend * 0.5);

        // 3. CAVAQUINHO DE PARTIDO ALTO (palhetadas alternadas sincopadas!)
        strumCavaco(bt + 0 * step,         bar.cavaco, 0.85, false, 0.24);
        strumCavaco(bt + 2 * step + 0.006, bar.cavaco, 0.58, true,  0.18);
        strumCavaco(bt + 3 * step + 0.010, bar.cavaco, 0.72, false, 0.20);
        strumCavaco(bt + 4 * step,         bar.cavaco, 0.92, false, 0.26);
        strumCavaco(bt + 6 * step + 0.006, bar.cavaco, 0.68, true,  0.22);

        // 4. PANDEIRO CARIOCA (swing real: polegar -> ponta -> tapa -> ponta -> polegar -> ponta -> tapa -> platinela!)
        const pandPattern = [
          { s: 0, type: 'thumb',  v: 0.78 },
          { s: 1, type: 'tip',    v: 0.52 },
          { s: 2, type: 'slap',   v: 0.72 },
          { s: 3, type: 'jingle', v: 0.55 },
          { s: 4, type: 'thumb',  v: 0.84 },
          { s: 5, type: 'tip',    v: 0.50 },
          { s: 6, type: 'slap',   v: 0.78 },
          { s: 7, type: 'jingle', v: 0.58 }
        ];
        for (const p of pandPattern) {
          const swingP = (p.s % 2 === 1) ? 0.010 : 0.0;
          this.core.playPandeiro(bt + p.s * step + swingP, p.type, vol * p.v, 0.20, bus, revSend);
        }

        // 5. PALMAS HUMANAS COLETIVAS DA COMUNIDADE (no contratempo alegre da roda!)
        this.core.playHumanClaps(bt + 4 * step, vol * 0.68, 4, 0.0, bus, revSend + 0.08);
        if (bIdx === 1) {
          this.core.playHumanClaps(bt + 6 * step + 0.008, vol * 0.45, 3, 0.05, bus, revSend + 0.08);
        }
      });
    } catch (err) {
      console.warn('playSambaRhythm guarded:', err);
    }
  },

  // =========================================================================
  // 2. CONSTRUÇÃO ACÚSTICA (Martelo de Madeira & Argamassa Artesanal)
  // =========================================================================
  playConstructionSound(pos) {
    this.resumeContext();
    if (!this.ctx || !this.core || this.ctx.state !== 'running') return;

    const spatial = this.getSpatialInfo(pos, 75.0, 5.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    if (t - this.lastConstructionTime < 0.16) return;
    this.lastConstructionTime = t;

    const vol = spatial.gain;
    const bus = this._makeSpatialBus(spatial, 'construction');

    if (Math.random() < 0.68) {
      // Martelada macia em madeira (ressonância oca quente + clique orgânico, sem bleep artificial!)
      const pitch = 230 + Math.random() * 85;
      const body = this.ctx.createOscillator();
      body.type = 'sine';
      body.frequency.setValueAtTime(pitch, t);
      body.frequency.exponentialRampToValueAtTime(pitch * 0.55, t + 0.042);

      const bGain = this.ctx.createGain();
      bGain.gain.setValueAtTime(0.0001, t);
      bGain.gain.linearRampToValueAtTime(0.16 * vol, t + 0.003);
      bGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.068);
      body.connect(bGain);
      this.core._routeVoice(bGain, bus, 0, 0.22);
      body.start(t);
      body.stop(t + 0.08);

      // Transiente seco de madeira batendo
      const knock = this.ctx.createBufferSource();
      knock.buffer = this.core.whiteNoiseMono;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1150 + Math.random() * 420;
      bp.Q.value = 2.8;
      const kGain = this.ctx.createGain();
      kGain.gain.setValueAtTime(0.11 * vol, t);
      kGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.024);
      knock.connect(bp);
      bp.connect(kGain);
      this.core._routeVoice(kGain, bus, 0, 0.20);
      knock.start(t, Math.random() * 1.4, 0.032);
    } else {
      // Raspagem suave de colher de pedreiro na argamassa
      const src = this.ctx.createBufferSource();
      src.buffer = this.core.pinkNoiseStereo;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(860 + Math.random() * 240, t);
      bp.frequency.linearRampToValueAtTime(620, t + 0.11);
      bp.Q.value = 1.6;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.11 * vol, t + 0.024);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      src.connect(bp);
      bp.connect(gain);
      this.core._routeVoice(gain, bus, 0, 0.18);
      src.start(t, Math.random() * 5.0, 0.14);
    }
  },

  // =========================================================================
  // 3. CELEBRAÇÃO DE NOVA CASA / PUXADINHO (Marimba de Madeira + Violão Solar!)
  // =========================================================================
  playCelebrationChime(pos) {
    this.resumeContext();
    if (!this.ctx || !this.core || this.ctx.state !== 'running') return;

    const spatial = this.getSpatialInfo(pos, 95.0, 6.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime + 0.01;
    if (t - this.lastChimeTime < 1.0) return;
    this.lastChimeTime = t;

    const vol = Math.min(1.0, spatial.gain * 1.15);
    const bus = this._makeSpatialBus(spatial, 'generalSfx');

    // Arpejo caloroso em Cmaj9 (estilo Townscaper / Dorfromantik brasileiro: alegria pura!)
    const marimbaNotes = [64, 67, 71, 74, 79]; // E4, G4, B4, D5, G5
    marimbaNotes.forEach((midi, idx) => {
      const nt = t + idx * 0.075;
      this.core.playMarimbaNote(midi, nt, vol * (0.62 + idx * 0.05), (idx - 2) * 0.12, bus, 0.42);
    });
    // Harmônico aveludado de violão de nylon acompanhando a nota final
    this.core.playNylonNote(76, t + 0.24, vol * 0.55, 1.35, 0.10, bus, 0.46);
  },

  // =========================================================================
  // 4. COMÉRCIO NA PRAIA (Coco Verde, Gelo Refrescante & Madeira no Balcão)
  // =========================================================================
  playBeachCommerceSound(pos) {
    this.resumeContext();
    if (!this.ctx || !this.core || this.ctx.state !== 'running') return;

    const spatial = this.getSpatialInfo(pos, 50.0, 4.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    if (t - this.lastCommerceTime < 1.8) return;
    this.lastCommerceTime = t;

    const vol = spatial.gain * 0.55;
    const bus = this._makeSpatialBus(spatial, 'generalSfx');

    // 1. Toque oco de coco / copo de madeira pousando no balcão
    this.core.playMarimbaNote(62 + Math.floor(Math.random() * 5), t, vol * 0.32, 0, bus, 0.24);

    // 2. Dois tilintares ultra-delicados de gelo no copo refrescante
    [0.055, 0.115].forEach((dt, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const f = (idx === 0 ? 2950 : 3480) + Math.random() * 220;
      osc.frequency.setValueAtTime(f, t + dt);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.linearRampToValueAtTime(0.026 * vol, t + dt + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.065);
      osc.connect(g);
      this.core._routeVoice(g, bus, (idx - 0.5) * 0.15, 0.28);
      osc.start(t + dt);
      osc.stop(t + dt + 0.075);
    });
  },

  // =========================================================================
  // 5. CAMPINHO & ALTINHA NA AREIA (Bola de Couro Real & Apito Suave)
  // =========================================================================
  playSoccerKick(pos) {
    this.resumeContext();
    if (!this.ctx || !this.core || this.ctx.state !== 'running') return;

    const spatial = this.getSpatialInfo(pos, 35.0, 5.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    if (t - this.lastKickTime < 0.18) return;
    this.lastKickTime = t;

    const vol = spatial.gain * 0.55;
    const bus = this._makeSpatialBus(spatial, 'soccer');
    this._playLeatherBallThump(t, vol, bus, 1.0);
  },

  playAltinhaKick(pos) {
    this.resumeContext();
    if (!this.ctx || !this.core || this.ctx.state !== 'running') return;

    const spatial = this.getSpatialInfo(pos, 52.0, 4.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    const vol = spatial.gain * 0.52;
    const bus = this._makeSpatialBus(spatial, 'soccer');
    this._playLeatherBallThump(t, vol, bus, 1.18);
  },

  _playLeatherBallThump(t, vol, bus, pitchMult = 1.0) {
    // Ressonância oca de bola de couro cheia de ar (corpo + tapa macio)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165 * pitchMult, t);
    osc.frequency.exponentialRampToValueAtTime(58 * pitchMult, t + 0.085);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.16 * vol, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);

    osc.connect(lp);
    lp.connect(gain);
    this.core._routeVoice(gain, bus, 0, 0.18);
    osc.start(t);
    osc.stop(t + 0.12);

    // Contato macio do pé no couro
    const slap = this.ctx.createBufferSource();
    slap.buffer = this.core.pinkNoiseStereo;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 540 * pitchMult;
    bp.Q.value = 1.8;
    const sGain = this.ctx.createGain();
    sGain.gain.setValueAtTime(0.07 * vol, t);
    sGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
    slap.connect(bp);
    bp.connect(sGain);
    this.core._routeVoice(sGain, bus, 0, 0.14);
    slap.start(t, Math.random() * 5.0, 0.036);
  },

  playGoalWhistle(pos) {
    this.resumeContext();
    if (!this.ctx || !this.core || this.ctx.state !== 'running') return;

    const spatial = this.getSpatialInfo(pos, 28.0, 4.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    if (t - this.lastWhistleTime < 3.0) return;
    this.lastWhistleTime = t;

    const vol = spatial.gain;
    const bus = this._makeSpatialBus(spatial, 'soccer');

    // Apito suave com leve trinado de bolinha (sem agudo estridente!)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, t);
    osc.frequency.linearRampToValueAtTime(1260, t + 0.16);

    const trill = this.ctx.createOscillator();
    trill.frequency.value = 28;
    const trillGain = this.ctx.createGain();
    trillGain.gain.value = 38;
    trill.connect(trillGain);
    trillGain.connect(osc.frequency);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1650;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.045 * vol, t + 0.025);
    gain.gain.linearRampToValueAtTime(0.040 * vol, t + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);

    osc.connect(lp);
    lp.connect(gain);
    this.core._routeVoice(gain, bus, 0, 0.35);
    osc.start(t);
    trill.start(t);
    osc.stop(t + 0.36);
    trill.stop(t + 0.36);

    // Palmas alegres da torcida no alambrado
    this.core.playHumanClaps(t + 0.22, vol * 0.45, 5, 0, bus, 0.38);
    this.core.playHumanClaps(t + 0.44, vol * 0.38, 4, 0, bus, 0.38);
  },

  // =========================================================================
  // 6. CARRETO DE MADEIRA & BRISA NOS COQUEIROS
  // =========================================================================
  playCartRattle(pos) {
    this.resumeContext();
    if (!this.ctx || !this.core || this.ctx.state !== 'running') return;

    const spatial = this.getSpatialInfo(pos, 60.0, 5.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    if (t - this.lastCartTime < 0.42) return;
    this.lastCartTime = t;

    const vol = spatial.gain * 0.42;
    const bus = this._makeSpatialBus(spatial, 'generalSfx');

    // Rodinha de madeira rolando no calçamento (ruído grave macio, sem zumbido artificial)
    const src = this.ctx.createBufferSource();
    src.buffer = this.core.pinkNoiseStereo;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 190 + Math.random() * 65;
    bp.Q.value = 2.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.14 * vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);

    src.connect(bp);
    bp.connect(gain);
    this.core._routeVoice(gain, bus, 0, 0.16);
    src.start(t, Math.random() * 5.0, 0.11);
  },

  playMaresiaBreeze(pos) {
    this.resumeContext();
    if (!this.ctx || !this.core || this.ctx.state !== 'running') return;

    const spatial = this.getSpatialInfo(pos, 75.0, 10.0);
    if (spatial.gain <= 0.01) return;

    const t = this.ctx.currentTime;
    const vol = spatial.gain * 0.55;
    const bus = this._makeSpatialBus(spatial, 'sea');

    // Sussurro sedoso do vento passando nas folhas dos coqueiros
    const src = this.ctx.createBufferSource();
    src.buffer = this.core.pinkNoiseStereo;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(520, t);
    bp.frequency.linearRampToValueAtTime(1080, t + 0.85);
    bp.frequency.linearRampToValueAtTime(440, t + 1.85);
    bp.Q.value = 1.4;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.11 * vol, t + 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);

    src.connect(bp);
    bp.connect(gain);
    this.core._routeVoice(gain, bus, 0, 0.30);
    src.start(t, Math.random() * 5.0, 2.0);
  },

  // =========================================================================
  // 7. MICRO-FEEDBACK TÁTIL DE INTERFACE (Leveza artesanal estilo Townscaper!)
  // =========================================================================
  playUiClick(variant = 'soft') {
    if (!this.ctx || !this.core || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    if (this._lastUiClick && t - this._lastUiClick < 0.06) return;
    this._lastUiClick = t;

    const dest = this.generalSfxGainNode || this.sfxMasterNode || this.masterGainNode;
    const midi = variant === 'cam' ? 74 : (variant === 'open' ? 76 : 71);
    this.core.playMarimbaNote(midi, t, 0.24, 0, dest, 0.28);
  },

  playUiSelect(kind = 'house') {
    if (!this.ctx || !this.core || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const dest = this.generalSfxGainNode || this.sfxMasterNode || this.masterGainNode;

    if (kind === 'house') {
      // Dois toques quentes de marimba + violão (acolhedor!)
      this.core.playMarimbaNote(67, t, 0.30, -0.08, dest, 0.32);
      this.core.playMarimbaNote(74, t + 0.065, 0.28, 0.08, dest, 0.35);
    } else if (kind === 'npc') {
      // Nota simpática e leve de kalimba
      this.core.playMarimbaNote(76, t, 0.26, 0, dest, 0.32);
      this.core.playMarimbaNote(79, t + 0.055, 0.24, 0.08, dest, 0.34);
    } else if (kind === 'pet') {
      this.core.playMarimbaNote(79, t, 0.22, -0.05, dest, 0.30);
      this.core.playMarimbaNote(83, t + 0.05, 0.22, 0.05, dest, 0.32);
    } else {
      // Bondinho / Mototáxi
      this.core.playMarimbaNote(72, t, 0.28, -0.06, dest, 0.34);
      this.core.playMarimbaNote(76, t + 0.06, 0.28, 0.06, dest, 0.36);
    }
  },

  // =========================================================================
  // 8. SONS ORGÂNICOS DOS PETS (Caramelo & Gatos Cariocas)
  // =========================================================================
  playDogBark(pos) {
    try {
      this.resumeContext();
      if (!this.ctx || !this.core || this.ctx.state !== 'running') return;

      const t = this.ctx.currentTime + 0.01;
      if (this._lastPetSfxTime && t - this._lastPetSfxTime < 0.35) return;
      this._lastPetSfxTime = t;

      const spatial = this.getSpatialInfo(pos, 58.0, 5.0);
      const vol = Math.max(0.28, spatial.gain || 0.55);
      const bus = this._makeSpatialBus(spatial, 'generalSfx');

      const triggerYip = (offset, ampScale, pitchShift) => {
        const bt = t + offset;
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520 * pitchShift, bt);
        osc.frequency.exponentialRampToValueAtTime(290 * pitchShift, bt + 0.095);

        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 780;
        bp.Q.value = 1.6;

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, bt);
        g.gain.linearRampToValueAtTime(0.16 * ampScale * vol, bt + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, bt + 0.105);

        osc.connect(bp);
        bp.connect(g);
        this.core._routeVoice(g, bus, 0, 0.22);
        osc.start(bt);
        osc.stop(bt + 0.115);

        if (this.core.pinkNoiseStereo) {
          const puff = this.ctx.createBufferSource();
          puff.buffer = this.core.pinkNoiseStereo;
          const pBp = this.ctx.createBiquadFilter();
          pBp.type = 'bandpass';
          pBp.frequency.value = 900;
          pBp.Q.value = 1.5;
          const pGain = this.ctx.createGain();
          pGain.gain.setValueAtTime(0.0001, bt);
          pGain.gain.linearRampToValueAtTime(0.06 * ampScale * vol, bt + 0.01);
          pGain.gain.exponentialRampToValueAtTime(0.0001, bt + 0.05);
          puff.connect(pBp);
          pBp.connect(pGain);
          this.core._routeVoice(pGain, bus, 0, 0.18);
          puff.start(bt, Math.random() * 4.0, 0.06);
        }
      };

      triggerYip(0, 1.0, 1.0 + (Math.random() - 0.5) * 0.06);
      if (Math.random() < 0.75) {
        triggerYip(0.14, 0.82, 1.06 + (Math.random() - 0.5) * 0.05);
      }
    } catch (_) {}
  },

  playCatMeow(pos) {
    try {
      this.resumeContext();
      if (!this.ctx || !this.core || this.ctx.state !== 'running') return;

      const t = this.ctx.currentTime + 0.01;
      if (this._lastPetSfxTime && t - this._lastPetSfxTime < 0.35) return;
      this._lastPetSfxTime = t;

      const spatial = this.getSpatialInfo(pos, 52.0, 4.0);
      const vol = Math.max(0.28, spatial.gain || 0.55);
      const bus = this._makeSpatialBus(spatial, 'generalSfx');

      // Miadinho melódico doce (triangle + 2º harmônico sine)
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      const baseF = 520 + (Math.random() - 0.5) * 30;
      osc1.frequency.setValueAtTime(baseF, t);
      osc1.frequency.linearRampToValueAtTime(baseF * 1.52, t + 0.11);
      osc1.frequency.exponentialRampToValueAtTime(470, t + 0.26);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseF * 2, t);
      osc2.frequency.linearRampToValueAtTime(baseF * 3.04, t + 0.11);
      osc2.frequency.exponentialRampToValueAtTime(940, t + 0.26);

      const h2Gain = this.ctx.createGain();
      h2Gain.gain.value = 0.28;

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1150;
      bp.Q.value = 2.0;

      const meowGain = this.ctx.createGain();
      meowGain.gain.setValueAtTime(0.0001, t);
      meowGain.gain.linearRampToValueAtTime(0.14 * vol, t + 0.045);
      meowGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);

      osc1.connect(bp);
      osc2.connect(h2Gain);
      h2Gain.connect(bp);
      bp.connect(meowGain);
      this.core._routeVoice(meowGain, bus, 0, 0.25);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.27);
      osc2.stop(t + 0.27);

      // Ronronar sutil AM (28 Hz sobre seno 125 Hz)
      const pt = t + 0.20;
      const purrCarrier = this.ctx.createOscillator();
      purrCarrier.type = 'sine';
      purrCarrier.frequency.value = 125;

      const purrLfo = this.ctx.createOscillator();
      purrLfo.type = 'sine';
      purrLfo.frequency.value = 28;

      const purrLfoDepth = this.ctx.createGain();
      purrLfoDepth.gain.value = 0.055 * vol;

      const purrGain = this.ctx.createGain();
      purrGain.gain.setValueAtTime(0.0001, pt);
      purrGain.gain.linearRampToValueAtTime(0.055 * vol, pt + 0.04);
      purrGain.gain.exponentialRampToValueAtTime(0.0001, pt + 0.22);

      purrLfo.connect(purrLfoDepth);
      purrLfoDepth.connect(purrGain.gain);
      purrCarrier.connect(purrGain);
      this.core._routeVoice(purrGain, bus, 0, 0.18);

      purrCarrier.start(pt);
      purrLfo.start(pt);
      purrCarrier.stop(pt + 0.23);
      purrLfo.stop(pt + 0.23);
    } catch (_) {}
  },

  playUiTimeShift(phase = 'day') {
    if (!this.ctx || !this.core || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.01;
    const dest = this.generalSfxGainNode || this.sfxMasterNode || this.masterGainNode;

    if (phase === 'night') {
      // Acorde aveludado de Rhodes noturno (sonhador)
      [64, 67, 71].forEach((m, i) => {
        this.core.playWarmRhodesNote(m, t + i * 0.09, 0.32, 1.2, (i - 1) * 0.18, dest, 0.45);
      });
    } else if (phase === 'sunset') {
      // Dedilhado dourado em violão de nylon (Fmaj9)
      [60, 64, 67, 72].forEach((m, i) => {
        this.core.playNylonNote(m, t + i * 0.075, 0.42, 1.1, (i - 1.5) * 0.10, dest, 0.42);
      });
    } else {
      // Brisa luminosa de dia/alvorecer (marimba + violão solar)
      [67, 71, 74, 79].forEach((m, i) => {
        this.core.playMarimbaNote(m, t + i * 0.065, 0.30, (i - 1.5) * 0.10, dest, 0.40);
      });
    }
  }
};
