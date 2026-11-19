// AudioEngineCore.js
// Núcleo acústico de alta fidelidade para Morro Vivo:
// - Barramento master com calor analógico, saturação suave de fita, compressor transparente e reverb estéreo de ar livre.
// - Bancos de instrumentos pré-sintetizados por modelagem física (Karplus-Strong):
//   * Violão de Nylon Carioca (corda dedilhada + posição na boca + ressonância de tampo de madeira)
//   * Cavaquinho Acústico de Madeira (palhetada brilhante + caixa acústica ressonante)
//   * Marimba de Madeira / Kalimbaphone (para sinos de celebração e feedback tátil acolhedor)
// - Sintetizadores acústicos expressivos em tempo real: Rhodes quente, Contrabaixo Acústico, Flauta de Bambu com vibrato e percussão brasileira orgânica.

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Cria curva suave de saturação de fita analógica (calor sem distorção audível). */
function createWarmTapeCurve(samples = 1024) {
  const curve = new Float32Array(samples);
  const norm = Math.tanh(1.18);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(x * 1.18) / norm;
  }
  return curve;
}

/** Gera resposta ao impulso (IR) estéreo de pátio/encosta ao ar livre (quente, arejada e natural). */
function createCoastalAirImpulse(ctx, duration = 1.95) {
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * duration);
  const ir = ctx.createBuffer(2, length, sr);

  // Reflexões iniciais suaves (paredes de casa, varanda e ar aberto da baía)
  const earlyTaps = [
    { ms: 16, l: 0.34, r: 0.18 },
    { ms: 29, l: 0.16, r: 0.30 },
    { ms: 46, l: 0.24, r: 0.20 },
    { ms: 67, l: 0.14, r: 0.22 },
    { ms: 92, l: 0.16, r: 0.13 },
    { ms: 121, l: 0.10, r: 0.14 }
  ];

  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    let lp = 0;
    let lp2 = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sr;
      // Decaimento suave com amortecimento progressivo de agudos (ar úmido costeiro)
      const decay = Math.pow(1 - t / duration, 2.3) * Math.exp(-t * 2.65);
      const white = Math.random() * 2 - 1;
      const damp = 0.22 + 0.58 * Math.exp(-t * 2.2);
      lp = lp + damp * (white - lp);
      lp2 = lp2 + (damp * 0.85) * (lp - lp2);
      // Fade-in curto nos primeiros 12ms para nunca embolar transientes
      const onset = Math.min(1, t / 0.012);
      data[i] = lp2 * decay * onset * 0.42;
    }

    for (const tap of earlyTaps) {
      const idx = Math.floor((tap.ms / 1000) * sr);
      const amp = (ch === 0 ? tap.l : tap.r) * 0.35;
      for (let k = 0; k < 24 && idx + k < length; k++) {
        const w = Math.sin((k / 24) * Math.PI);
        data[idx + k] += (Math.random() * 2 - 1) * amp * w * 0.25;
      }
    }
  }
  return ir;
}

/** Gera ruído rosa estéreo perfeitamente contínuo (crossfade de borda = zero clique no loop). */
function createSeamlessPinkNoise(ctx, seconds = 10) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const fadeLen = Math.floor(sr * 1.2);
  const buf = ctx.createBuffer(2, len, sr);

  for (let ch = 0; ch < 2; ch++) {
    const raw = new Float32Array(len + fadeLen);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.055;
      b6 = w * 0.115926;
    }
    const out = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) out[i] = raw[i];
    // Crossfade de energia constante entre o final e o início
    for (let i = 0; i < fadeLen; i++) {
      const u = i / fadeLen;
      const gIn = Math.sin(u * Math.PI * 0.5);
      const gOut = Math.cos(u * Math.PI * 0.5);
      out[i] = raw[i] * gIn + raw[len + i] * gOut;
    }
  }
  return buf;
}

/** Gera ruído branco reutilizável de 2 segundos para transientes curtos de percussão. */
function createShortWhiteNoise(ctx, seconds = 2.0) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/**
 * Filtro biquad simples em CPU (usado apenas 1 vez ao gerar bancos de amostras no init).
 * Permite moldar a ressonância de madeira do tampo do violão e do cavaquinho!
 */
function applyBiquadInPlace(samples, sr, type, freq, Q, gainDb = 0) {
  const w0 = (2 * Math.PI * freq) / sr;
  const cosw = Math.cos(w0);
  const sinw = Math.sin(w0);
  const alpha = sinw / (2 * Q);
  const A = Math.pow(10, gainDb / 40);

  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
  if (type === 'peaking') {
    b0 = 1 + alpha * A;
    b1 = -2 * cosw;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * cosw;
    a2 = 1 - alpha / A;
  } else if (type === 'lowpass') {
    b0 = (1 - cosw) / 2;
    b1 = 1 - cosw;
    b2 = (1 - cosw) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosw;
    a2 = 1 - alpha;
  } else if (type === 'highpass') {
    b0 = (1 + cosw) / 2;
    b1 = -(1 + cosw);
    b2 = (1 + cosw) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosw;
    a2 = 1 - alpha;
  }

  const nb0 = b0 / a0, nb1 = b1 / a0, nb2 = b2 / a0;
  const na1 = a1 / a0, na2 = a2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
    samples[i] = y0;
  }
}

/**
 * Síntese Física Karplus-Strong de Violão de Nylon Carioca ou Cavaquinho de Madeira.
 * Inclui excitação macia de polpa de dedo / palheta, pente de posição de ataque na boca do instrumento,
 * atraso fracionário (afinação exata em todas as oitavas) e formantes de madeira do tampo!
 */
function synthesizePluckedStringBuffer(ctx, freq, opts = {}) {
  const {
    duration = 1.9,
    isCavaco = false,
    pluckPos = isCavaco ? 0.16 : 0.25,
    brightness = isCavaco ? 0.64 : 0.44
  } = opts;

  const sr = ctx.sampleRate;
  const totalSamples = Math.floor(sr * duration);
  const buf = ctx.createBuffer(1, totalSamples, sr);
  const out = buf.getChannelData(0);

  // Comprimento exato da linha de atraso (com compensação de fase do filtro de amortecimento)
  const delayExact = Math.max(8, sr / freq - 0.5);
  const N = Math.floor(delayExact);
  const frac = delayExact - N;
  const ring = new Float32Array(N + 2);

  // 1. Excitação inicial realista: mistura de deslocamento macio de corda + ruído filtrado de dedo/palheta
  let lp = 0;
  const excAlpha = isCavaco ? 0.52 : 0.24;
  for (let i = 0; i < N; i++) {
    const w = Math.random() * 2 - 1;
    lp = lp + excAlpha * (w - lp);
    // Componente de deslocamento triangular suave (dá corpo fundamental redondo, típico de nylon)
    const phase = i / N;
    const tri = phase < pluckPos ? (phase / pluckPos) : ((1 - phase) / (1 - pluckPos));
    const triCentered = (tri * 2 - 1) * (isCavaco ? 0.18 : 0.36);
    ring[i] = lp * (isCavaco ? 0.92 : 0.72) + triCentered;
  }

  // Filtro pente da posição do dedo na corda (gera os harmônicos exatos da boca do violão!)
  const combShift = Math.max(1, Math.round(N * pluckPos));
  const rawExc = ring.slice(0, N);
  const combMix = isCavaco ? 0.62 : 0.74;
  for (let i = 0; i < N; i++) {
    const j = (i - combShift + N) % N;
    ring[i] = rawExc[i] - rawExc[j] * combMix;
  }

  // Remove offset DC da excitação
  let mean = 0;
  for (let i = 0; i < N; i++) mean += ring[i];
  mean /= N;
  for (let i = 0; i < N; i++) ring[i] -= mean;

  // 2. Loop Karplus-Strong com interpolação fracionária e amortecimento orgânico
  // Cordas graves sustentam mais que agudas, exatamente como nylon real!
  const regFactor = Math.min(1, Math.max(0, (freq - 82) / 700));
  const baseDecay = isCavaco
    ? (0.9934 - regFactor * 0.0034)
    : (0.9974 - regFactor * 0.0028);

  // Coeficientes do filtro de corda (mais macio no nylon, mais brilhante no aço do cavaco)
  const c0 = brightness;
  const c1 = (1 - brightness) * 0.72;
  const c2 = (1 - brightness) * 0.28;

  let idx = 0;
  let prev1 = 0;
  let prev2 = 0;
  const fadeStart = Math.floor(totalSamples * 0.78);

  for (let s = 0; s < totalSamples; s++) {
    const idxNext = (idx + 1) % N;
    // Interpolação linear de atraso fracionário (afinação cristalina!)
    const cur = ring[idx] * (1 - frac) + ring[idxNext] * frac;
    const filtered = (cur * c0 + prev1 * c1 + prev2 * c2) * baseDecay;
    prev2 = prev1;
    prev1 = cur;
    ring[idx] = filtered;

    // Suave rampa de ataque de 2.5ms para eliminar qualquer clique digital
    const attack = s < 110 ? (s / 110) : 1.0;
    const tail = s > fadeStart ? (1.0 - (s - fadeStart) / (totalSamples - fadeStart)) : 1.0;
    out[s] = filtered * attack * tail;

    idx = idxNext;
  }

  // 3. Ressonância da caixa acústica de madeira (tampo + boca Helmholtz)
  if (isCavaco) {
    applyBiquadInPlace(out, sr, 'highpass', 180, 0.7);
    applyBiquadInPlace(out, sr, 'peaking', 360, 2.0, 4.5);
    applyBiquadInPlace(out, sr, 'peaking', 840, 1.7, 3.0);
    applyBiquadInPlace(out, sr, 'lowpass', 3850, 0.75);
  } else {
    applyBiquadInPlace(out, sr, 'highpass', 72, 0.7);
    applyBiquadInPlace(out, sr, 'peaking', 110, 2.4, 4.4);   // Boca (Helmholtz)
    applyBiquadInPlace(out, sr, 'peaking', 235, 2.0, 3.2);   // Tampo de cedro
    applyBiquadInPlace(out, sr, 'peaking', 1380, 1.4, 1.2);  // Clareza suave dos dedos
    applyBiquadInPlace(out, sr, 'lowpass', 3250, 0.75);      // Aveludamento natural do nylon
  }

  // Normaliza o pico para nível consistente
  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    const a = Math.abs(out[i]);
    if (a > peak) peak = a;
  }
  if (peak > 1e-5) {
    const norm = 0.85 / peak;
    for (let i = 0; i < totalSamples; i++) out[i] *= norm;
  }
  return buf;
}

/** Sintetiza barra acústica de Marimba / Kalimbaphone de madeira nobre (para celebrações & UI). */
function synthesizeMarimbaBuffer(ctx, freq, duration = 1.25) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * duration);
  const buf = ctx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);

  const w1 = 2 * Math.PI * freq;
  const w2 = 2 * Math.PI * freq * 3.98;  // 4º harmônico real de marimba afinada
  const w3 = 2 * Math.PI * freq * 9.2;   // Brilho instantâneo da baqueta de feltro

  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const attack = Math.min(1, t / 0.0035);
    const e1 = Math.exp(-t * 4.4);
    const e2 = Math.exp(-t * 19.5) * 0.24;
    const e3 = Math.exp(-t * 68.0) * 0.08;
    const mallet = Math.exp(-t * 140.0) * (Math.random() * 2 - 1) * 0.06;
    out[i] = (Math.sin(w1 * t) * e1 + Math.sin(w2 * t) * e2 + Math.sin(w3 * t) * e3 + mallet) * attack * 0.72;
  }
  return buf;
}

export class AudioEngineCore {
  constructor(ctx) {
    this.ctx = ctx;

    // Barramento Master com calor analógico, saturação de fita e compressão suave
    this.masterInput = ctx.createGain();
    this.masterInput.gain.value = 1.0;

    this.warmthLow = ctx.createBiquadFilter();
    this.warmthLow.type = 'lowshelf';
    this.warmthLow.frequency.value = 115;
    this.warmthLow.gain.value = 1.8;

    this.silkHigh = ctx.createBiquadFilter();
    this.silkHigh.type = 'highshelf';
    this.silkHigh.frequency.value = 6600;
    this.silkHigh.gain.value = -2.8;

    this.tapeWarmth = ctx.createWaveShaper();
    this.tapeWarmth.curve = createWarmTapeCurve(1024);
    this.tapeWarmth.oversample = '2x';

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -15;
    this.compressor.knee.value = 20;
    this.compressor.ratio.value = 2.8;
    this.compressor.attack.value = 0.018;
    this.compressor.release.value = 0.20;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.78;

    this.masterInput.connect(this.warmthLow);
    this.warmthLow.connect(this.silkHigh);
    this.silkHigh.connect(this.tapeWarmth);
    this.tapeWarmth.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    // Barramento de Reverb Estéreo ao Ar Livre (ar quente da baía e encosta)
    this.reverbInput = ctx.createGain();
    this.reverbInput.gain.value = 1.0;

    this.reverbConvolver = ctx.createConvolver();
    this.reverbConvolver.buffer = createCoastalAirImpulse(ctx, 1.95);

    this.reverbHighCut = ctx.createBiquadFilter();
    this.reverbHighCut.type = 'lowpass';
    this.reverbHighCut.frequency.value = 4200;

    this.reverbReturn = ctx.createGain();
    this.reverbReturn.gain.value = 0.36;

    this.reverbInput.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbHighCut);
    this.reverbHighCut.connect(this.reverbReturn);
    this.reverbReturn.connect(this.masterInput);

    // Buffers compartilhados (zero alocação durante o gameplay!)
    this.pinkNoiseStereo = createSeamlessPinkNoise(ctx, 10.0);
    this.whiteNoiseMono = createShortWhiteNoise(ctx, 2.0);

    // Bancos de instrumentos acústicos pré-sintetizados por modelagem física
    this.nylonBank = [];
    this.cavacoBank = [];
    this.marimbaBank = [];
    this._buildInstrumentBanks();
  }

  _buildInstrumentBanks() {
    // 1. Violão de Nylon Carioca: E2 (40) até A5 (81) a cada 2 semitons (21 cordas reais!)
    for (let midi = 40; midi <= 82; midi += 2) {
      this.nylonBank.push({
        midi,
        buffer: synthesizePluckedStringBuffer(this.ctx, midiToFreq(midi), {
          duration: midi < 56 ? 2.15 : 1.75,
          isCavaco: false
        })
      });
    }

    // 2. Cavaquinho Acústico de Madeira: A3 (57) até D6 (86) a cada 2 semitons
    for (let midi = 57; midi <= 86; midi += 2) {
      this.cavacoBank.push({
        midi,
        buffer: synthesizePluckedStringBuffer(this.ctx, midiToFreq(midi), {
          duration: 1.05,
          isCavaco: true
        })
      });
    }

    // 3. Marimba de Madeira Nobre: C4 (60) até E6 (88) a cada 2 semitons
    for (let midi = 60; midi <= 88; midi += 2) {
      this.marimbaBank.push({
        midi,
        buffer: synthesizeMarimbaBuffer(this.ctx, midiToFreq(midi), 1.15)
      });
    }
  }

  _pickBankSample(bank, targetMidi) {
    let best = bank[0];
    let bestDiff = Math.abs(targetMidi - best.midi);
    for (let i = 1; i < bank.length; i++) {
      const diff = Math.abs(targetMidi - bank[i].midi);
      if (diff < bestDiff) {
        best = bank[i];
        bestDiff = diff;
      }
    }
    const rate = Math.pow(2, (targetMidi - best.midi) / 12);
    return { buffer: best.buffer, rate };
  }

  /** Roteia uma voz acústica com panorama estéreo + send opcional para reverb de ar livre. */
  _routeVoice(node, dest, pan = 0, reverbAmt = 0.25, reverbBus = null) {
    let out = node;
    if (this.ctx.createStereoPanner && Math.abs(pan) > 0.005) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.9, Math.min(0.9, pan));
      out.connect(panner);
      out = panner;
    }
    out.connect(dest);
    if (reverbAmt > 0.005) {
      const send = this.ctx.createGain();
      send.gain.value = reverbAmt;
      out.connect(send);
      send.connect(reverbBus || this.reverbInput);
    }
  }

  /** Toca 1 nota de Violão de Nylon Carioca (Karplus-Strong real). */
  playNylonNote(midi, time, vel = 0.7, dur = 1.4, pan = -0.15, dest, reverbAmt = 0.28, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);
    const { buffer, rate } = this._pickBankSample(this.nylonBank, midi);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    // Micro-desafinação orgânica humana (±2.5 cents) para acordes respirarem naturalmente
    const humanDetune = (Math.random() - 0.5) * 5.0;
    src.playbackRate.setValueAtTime(rate * Math.pow(2, humanDetune / 1200), t);

    // Filtro sensível à dinâmica do toque (notas suaves soam mais aveludadas!)
    const tone = this.ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(1400 + Math.min(1, vel) * 2300, t);

    const gain = this.ctx.createGain();
    const peak = Math.max(0.001, 0.26 * vel);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.006);
    const releaseAt = t + Math.min(dur, buffer.duration - 0.12);
    gain.gain.linearRampToValueAtTime(peak * 0.82, Math.max(t + 0.04, releaseAt));
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseAt + 0.14);

    src.connect(tone);
    tone.connect(gain);
    this._routeVoice(gain, dest, pan, reverbAmt, reverbBus);

    src.start(t);
    src.stop(releaseAt + 0.16);
  }

  /** Toque abafado suave na corda de nylon (ghost strum da mão direita — dá balanço humano real ao violão!). */
  playNylonGhostStrum(time, vel = 0.35, pan = -0.20, dest, reverbAmt = 0.22, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);
    const src = this.ctx.createBufferSource();
    src.buffer = this.pinkNoiseStereo;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(520 + Math.random() * 140, t);
    bp.Q.value = 2.4;

    const gain = this.ctx.createGain();
    const peak = Math.max(0.0005, 0.055 * vel);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.036);

    src.connect(bp);
    bp.connect(gain);
    this._routeVoice(gain, dest, pan, reverbAmt, reverbBus);
    src.start(t, Math.random() * 6.0, 0.045);
  }

  /** Toca 1 corda de Cavaquinho Acústico de Madeira (Karplus-Strong real). */
  playCavacoNote(midi, time, vel = 0.7, dur = 0.45, pan = 0, dest, reverbAmt = 0.22, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);
    const { buffer, rate } = this._pickBankSample(this.cavacoBank, midi);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const humanDetune = (Math.random() - 0.5) * 6.0;
    src.playbackRate.setValueAtTime(rate * Math.pow(2, humanDetune / 1200), t);

    const tone = this.ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(2400 + Math.min(1, vel) * 2400, t);

    const gain = this.ctx.createGain();
    const peak = Math.max(0.001, 0.17 * vel);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.003);
    const releaseAt = t + Math.min(dur, buffer.duration - 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(t + 0.06, releaseAt + 0.06));

    src.connect(tone);
    tone.connect(gain);
    this._routeVoice(gain, dest, pan, reverbAmt, reverbBus);

    src.start(t);
    src.stop(Math.max(t + 0.08, releaseAt + 0.09));
  }

  /** Toca 1 barra de Marimba de Madeira (quente e cristalina para celebrações e UI). */
  playMarimbaNote(midi, time, vel = 0.7, pan = 0, dest, reverbAmt = 0.34, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);
    const { buffer, rate } = this._pickBankSample(this.marimbaBank, midi);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.setValueAtTime(rate, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.001, 0.24 * vel), t);

    src.connect(gain);
    this._routeVoice(gain, dest, pan, reverbAmt, reverbBus);
    src.start(t);
    src.stop(t + buffer.duration + 0.02);
  }

  /** Piano Elétrico Vintage Rhodes (quente, aveludado e sonhador com leve brilho FM de haste). */
  playWarmRhodesNote(midi, time, vel = 0.55, dur = 1.8, pan = 0.18, dest, reverbAmt = 0.38, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);
    const freq = midiToFreq(midi);

    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, t);

    // Haste metálica suave (tine FM) que aparece só no ataque e logo derrete no corpo redondo
    const tine = this.ctx.createOscillator();
    tine.type = 'sine';
    tine.frequency.setValueAtTime(freq * 7.0, t);
    const tineGain = this.ctx.createGain();
    const tineDepth = freq * 0.22 * Math.pow(vel, 1.4);
    tineGain.gain.setValueAtTime(tineDepth, t);
    tineGain.gain.exponentialRampToValueAtTime(0.01, t + 0.095);
    tine.connect(tineGain);
    tineGain.connect(carrier.frequency);

    // Calor do 2º harmônico suave
    const body2 = this.ctx.createOscillator();
    body2.type = 'sine';
    body2.frequency.setValueAtTime(freq * 2.0, t);
    const body2Gain = this.ctx.createGain();
    body2Gain.gain.setValueAtTime(0.14 * vel, t);
    body2Gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.65));

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1600 + vel * 1200, t);
    lp.frequency.exponentialRampToValueAtTime(780, t + dur);

    const gain = this.ctx.createGain();
    const peak = Math.max(0.001, 0.115 * vel);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.016);
    gain.gain.exponentialRampToValueAtTime(peak * 0.42, t + Math.min(dur * 0.55, 0.7));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.28);

    carrier.connect(lp);
    body2.connect(body2Gain);
    body2Gain.connect(lp);
    lp.connect(gain);
    this._routeVoice(gain, dest, pan, reverbAmt, reverbBus);

    carrier.start(t);
    tine.start(t);
    body2.start(t);
    const stopAt = t + dur + 0.32;
    carrier.stop(stopAt);
    tine.stop(t + 0.12);
    body2.stop(stopAt);
  }

  /** Contrabaixo Acústico / Baixaria de Violão 7 Cordas (quente, encorpado, sem sub sintético duro). */
  playAcousticBassNote(midi, time, vel = 0.75, dur = 0.68, pan = -0.04, dest, reverbAmt = 0.14, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);
    const freq = midiToFreq(midi);

    const fund = this.ctx.createOscillator();
    fund.type = 'sine';
    // Levíssima acomodação natural de tensão da corda (+3 cents -> 0)
    fund.frequency.setValueAtTime(freq * 1.003, t);
    fund.frequency.exponentialRampToValueAtTime(freq, t + 0.045);

    const wood = this.ctx.createOscillator();
    wood.type = 'triangle';
    wood.frequency.setValueAtTime(freq * 2.0, t);
    const woodGain = this.ctx.createGain();
    woodGain.gain.setValueAtTime(0.24 * vel, t);
    woodGain.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur * 0.7, 0.38));

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(480 + vel * 260, t);
    lp.frequency.exponentialRampToValueAtTime(195, t + dur);

    const gain = this.ctx.createGain();
    const peak = Math.max(0.001, 0.27 * vel);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.014);
    gain.gain.exponentialRampToValueAtTime(peak * 0.52, t + dur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);

    fund.connect(lp);
    wood.connect(woodGain);
    woodGain.connect(lp);
    lp.connect(gain);
    this._routeVoice(gain, dest, pan, reverbAmt, reverbBus);

    const stopAt = t + dur + 0.15;
    fund.start(t);
    wood.start(t);
    fund.stop(stopAt);
    wood.stop(stopAt);
  }

  /** Flauta de Bambu / Pífano Suave (respiração aérea + vibrato natural atrasado + legato). */
  playBambooFluteNote(midi, time, vel = 0.55, dur = 0.85, pan = 0.22, dest, reverbAmt = 0.45, prevMidi = null, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);
    const freq = midiToFreq(midi);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    if (prevMidi !== null && Math.abs(prevMidi - midi) <= 5) {
      osc.frequency.setValueAtTime(midiToFreq(prevMidi), t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.055);
    } else {
      osc.frequency.setValueAtTime(freq * 0.992, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.045);
    }

    // 2º harmônico suave de madeira
    const overtone = this.ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2.0, t);
    const overGain = this.ctx.createGain();
    overGain.gain.value = 0.11;
    overtone.connect(overGain);

    // Vibrato humano natural (entra suavemente após 0.22s da nota sustentada!)
    const vib = this.ctx.createOscillator();
    vib.frequency.value = 4.9 + Math.random() * 0.5;
    const vibGain = this.ctx.createGain();
    vibGain.gain.setValueAtTime(0.0001, t);
    vibGain.gain.linearRampToValueAtTime(freq * 0.0055, t + Math.min(dur * 0.65, 0.36));
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);

    // Sopro delicado na embocadura (chiff aéreo)
    const breath = this.ctx.createBufferSource();
    breath.buffer = this.pinkNoiseStereo;
    const breathOffset = Math.random() * 6.0;
    const breathBp = this.ctx.createBiquadFilter();
    breathBp.type = 'bandpass';
    breathBp.frequency.value = Math.min(3600, freq * 1.8);
    breathBp.Q.value = 3.2;
    const breathGain = this.ctx.createGain();
    breathGain.gain.setValueAtTime(0.0001, t);
    breathGain.gain.linearRampToValueAtTime(0.045 * vel, t + 0.05);
    breathGain.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.45));
    breath.connect(breathBp);
    breathBp.connect(breathGain);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1950;

    const gain = this.ctx.createGain();
    const peak = Math.max(0.001, 0.068 * vel);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.115);
    gain.gain.linearRampToValueAtTime(peak * 0.85, Math.max(t + 0.13, t + dur - 0.14));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.20);

    osc.connect(lp);
    overGain.connect(lp);
    breathGain.connect(lp);
    lp.connect(gain);
    this._routeVoice(gain, dest, pan, reverbAmt, reverbBus);

    const stopAt = t + dur + 0.20;
    osc.start(t);
    overtone.start(t);
    vib.start(t);
    breath.start(t, breathOffset, Math.min(dur + 0.1, 1.5));
    osc.stop(stopAt);
    overtone.stop(stopAt);
    vib.stop(stopAt);
  }

  /** Baqueta no aro de madeira (Cross-Stick clássico da Bossa Nova — seco, quente e orgânico). */
  playBossaRimClick(time, vel = 0.6, pan = -0.18, dest, reverbAmt = 0.18, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);

    // Corpo oco de madeira nobre
    const wood = this.ctx.createOscillator();
    wood.type = 'triangle';
    const base = 370 + (Math.random() - 0.5) * 24;
    wood.frequency.setValueAtTime(base, t);
    wood.frequency.exponentialRampToValueAtTime(base * 0.62, t + 0.024);

    const woodBp = this.ctx.createBiquadFilter();
    woodBp.type = 'bandpass';
    woodBp.frequency.value = 720;
    woodBp.Q.value = 2.4;

    const woodGain = this.ctx.createGain();
    woodGain.gain.setValueAtTime(0.078 * vel, t);
    woodGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.038);

    wood.connect(woodBp);
    woodBp.connect(woodGain);
    this._routeVoice(woodGain, dest, pan, reverbAmt, reverbBus);
    wood.start(t);
    wood.stop(t + 0.044);

    // Estalo curto e quente da madeira da baqueta
    const click = this.ctx.createBufferSource();
    click.buffer = this.whiteNoiseMono;
    const clickBp = this.ctx.createBiquadFilter();
    clickBp.type = 'bandpass';
    clickBp.frequency.value = 1480 + Math.random() * 200;
    clickBp.Q.value = 3.2;

    const clickGain = this.ctx.createGain();
    clickGain.gain.setValueAtTime(0.046 * vel, t);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

    click.connect(clickBp);
    clickBp.connect(clickGain);
    this._routeVoice(clickGain, dest, pan, reverbAmt * 0.8, reverbBus);
    click.start(t, Math.random() * 1.5, 0.024);
  }

  /** Ganzá / Caxixi de cesta trançada (sussurro rítmico suave — nunca chiado agressivo). */
  playGanzaBrush(time, vel = 0.45, isAccent = false, pan = 0.28, dest, reverbAmt = 0.14, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);
    const dur = isAccent ? 0.075 : 0.048;

    const src = this.ctx.createBufferSource();
    src.buffer = this.whiteNoiseMono;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(isAccent ? 5600 : 4700, t);
    bp.Q.value = 1.9;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 8200;

    const gain = this.ctx.createGain();
    const peak = Math.max(0.0005, (isAccent ? 0.042 : 0.026) * vel);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(bp);
    bp.connect(lp);
    lp.connect(gain);
    this._routeVoice(gain, dest, pan, reverbAmt, reverbBus);
    src.start(t, Math.random() * 1.4, dur + 0.02);
  }

  /** Vassourinha de jazz/bossa (sussurro aveludado na pele da caixa). */
  playBrushSweep(time, vel = 0.45, dur = 0.24, pan = 0.12, dest, reverbAmt = 0.20, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);
    const src = this.ctx.createBufferSource();
    src.buffer = this.pinkNoiseStereo;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2800, t);
    bp.frequency.linearRampToValueAtTime(4200, t + dur * 0.5);
    bp.frequency.linearRampToValueAtTime(2400, t + dur);
    bp.Q.value = 1.2;

    const gain = this.ctx.createGain();
    const peak = Math.max(0.0005, 0.048 * vel);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + dur * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(bp);
    bp.connect(gain);
    this._routeVoice(gain, dest, pan, reverbAmt, reverbBus);
    src.start(t, Math.random() * 6.0, dur + 0.04);
  }

  /** Surdo de Pele Acústico (maceta de feltro quente — mudo na cabeça, aberto no contratempo!). */
  playWarmSurdo(time, vel = 0.75, isOpen = true, pan = 0, dest, reverbAmt = 0.18, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    const gain = this.ctx.createGain();

    if (isOpen) {
      osc.frequency.setValueAtTime(64, t);
      osc.frequency.exponentialRampToValueAtTime(48, t + 0.28);
      lp.frequency.setValueAtTime(165, t);
      const peak = Math.max(0.001, 0.34 * vel);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.010);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.connect(lp);
      lp.connect(gain);
      this._routeVoice(gain, dest, pan, reverbAmt, reverbBus);
      osc.start(t);
      osc.stop(t + 0.45);
    } else {
      osc.frequency.setValueAtTime(84, t);
      osc.frequency.exponentialRampToValueAtTime(58, t + 0.11);
      lp.frequency.setValueAtTime(135, t);
      const peak = Math.max(0.001, 0.20 * vel);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.007);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(lp);
      lp.connect(gain);
      this._routeVoice(gain, dest, pan, reverbAmt * 0.6, reverbBus);
      osc.start(t);
      osc.stop(t + 0.18);
    }

    // Toque macio da maceta de feltro no couro
    const felt = this.ctx.createBufferSource();
    felt.buffer = this.pinkNoiseStereo;
    const feltLp = this.ctx.createBiquadFilter();
    feltLp.type = 'lowpass';
    feltLp.frequency.value = 380;
    const feltGain = this.ctx.createGain();
    feltGain.gain.setValueAtTime(0.08 * vel, t);
    feltGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);
    felt.connect(feltLp);
    feltLp.connect(feltGain);
    this._routeVoice(feltGain, dest, pan, reverbAmt * 0.4, reverbBus);
    felt.start(t, Math.random() * 5.0, 0.04);
  }

  /** Pandeiro Carioca com 4 articulações reais: 'thumb' (polegar), 'tip' (ponta), 'slap' (tapa) e 'jingle' (platinela). */
  playPandeiro(time, type = 'tip', vel = 0.7, pan = 0, dest, reverbAmt = 0.20, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);

    // 1. Componente de couro (polegar grave ou tapa seco)
    if (type === 'thumb' || type === 'slap') {
      const skin = this.ctx.createOscillator();
      skin.type = 'triangle';
      const f0 = type === 'thumb' ? 148 : 310;
      const f1 = type === 'thumb' ? 98 : 165;
      skin.frequency.setValueAtTime(f0, t);
      skin.frequency.exponentialRampToValueAtTime(f1, t + (type === 'thumb' ? 0.085 : 0.032));

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = type === 'thumb' ? 320 : 1200;

      const sGain = this.ctx.createGain();
      sGain.gain.setValueAtTime(0.0001, t);
      sGain.gain.linearRampToValueAtTime((type === 'thumb' ? 0.22 : 0.14) * vel, t + 0.004);
      sGain.gain.exponentialRampToValueAtTime(0.0001, t + (type === 'thumb' ? 0.11 : 0.045));

      skin.connect(lp);
      lp.connect(sGain);
      this._routeVoice(sGain, dest, pan, reverbAmt * 0.7, reverbBus);
      skin.start(t);
      skin.stop(t + 0.13);
    }

    // 2. Platinelas metálicas (cintilância leve e musical de latão, filtrada sem chiado branco)
    const jingleDur = type === 'jingle' ? 0.052 : (type === 'slap' ? 0.028 : 0.038);
    const jingleSrc = this.ctx.createBufferSource();
    jingleSrc.buffer = this.pinkNoiseStereo;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(type === 'slap' ? 3200 : 5200, t);
    bp.Q.value = 3.6;

    const jGain = this.ctx.createGain();
    const jAmp = (type === 'slap' ? 0.055 : (type === 'tip' ? 0.042 : 0.048)) * vel;
    jGain.gain.setValueAtTime(0.0001, t);
    jGain.gain.linearRampToValueAtTime(jAmp, t + 0.005);
    jGain.gain.exponentialRampToValueAtTime(0.0001, t + jingleDur);

    jingleSrc.connect(bp);
    bp.connect(jGain);
    this._routeVoice(jGain, dest, pan, reverbAmt, reverbBus);
    jingleSrc.start(t, Math.random() * 6.0, jingleDur + 0.02);
  }

  /** Palmas coletivas humanas (duplo formante de palma+dedos com micro-atraso estéreo, calor comunitário real!). */
  playHumanClaps(time, vel = 0.65, people = 4, basePan = 0, dest, reverbAmt = 0.28, reverbBus = null) {
    const t = Math.max(this.ctx.currentTime, time);
    for (let i = 0; i < people; i++) {
      const offset = i * 0.009 + Math.random() * 0.014;
      const ct = t + offset;
      const src = this.ctx.createBufferSource();
      src.buffer = this.pinkNoiseStereo;

      // Cavidade da palma (quente ~860Hz) + brilho suave dos dedos (~1750Hz)
      const palmBp = this.ctx.createBiquadFilter();
      palmBp.type = 'bandpass';
      palmBp.frequency.value = 780 + Math.random() * 340;
      palmBp.Q.value = 2.4;

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2600;

      const gain = this.ctx.createGain();
      const peak = (0.095 / Math.sqrt(people)) * vel * (0.78 + Math.random() * 0.38);
      gain.gain.setValueAtTime(0.0001, ct);
      gain.gain.linearRampToValueAtTime(peak, ct + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, ct + 0.055);

      src.connect(palmBp);
      palmBp.connect(lp);
      lp.connect(gain);
      const handPan = Math.max(-0.85, Math.min(0.85, basePan + (Math.random() - 0.5) * 0.48));
      this._routeVoice(gain, dest, handPan, reverbAmt, reverbBus);
      src.start(ct, Math.random() * 6.0, 0.07);
    }
  }
}
