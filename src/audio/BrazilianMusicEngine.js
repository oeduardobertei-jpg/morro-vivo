// BrazilianMusicEngine.js
// Compositor generativo de Bossa Nova, MPB & Seresta Carioca (estilo Tom Jobim, João Gilberto & Clube da Esquina).
// Usa agendador lookahead exato pelo relógio de áudio (zero jitter de setInterval), forma musical de 32 compassos
// com 4 seções (Tema A, Tema B, Ponte do Mirante e Respiro com Mar), batida real de violão de nylon,
// micro-dinâmica humana e adaptação orgânica às 4 fases do dia (Dia, Pôr do Sol, Noite e Alvorecer).

// Progressão de 32 compassos em Dó Maior solar (voicings reais de violão brasileiro com condução suave de vozes)
// Cada compasso define:
// - bass: [raiz, quinta/passagem] (MIDI 38..50)
// - voicing: 4 cordas agudas no braço do violão (MIDI 52..69)
// - rhodes: abertura suave no teclado elétrico
// - melodyPool: notas-alvo cantáveis (3ª, 6ª, 7ª, 9ª) na região da flauta (MIDI 67..81)
// - section: 'A' | 'B' | 'C' | 'breath'
const SECTION_TITLES = {
  A: 'Sol na Varanda',
  B: 'Brisa da Baía',
  C: 'Ponte do Mirante',
  breath: 'Respiro & Mar',
  morning_a: 'Orvalho na Serra',
  morning_b: 'Café na Varanda'
};

const NIGHT_SECTION_TITLES = {
  A: 'Seresta na Encosta',
  B: 'Luar da Baía',
  C: 'Mirante Estrelado',
  breath: 'Maré Serena',
  morning_a: 'Seresta na Encosta',
  morning_b: 'Luar da Baía'
};

// Suíte Matinal Exclusiva (16 compassos — vozes abertas e luminosas estilo Tom Jobim / Clube da Esquina para o despertar!)
const MORNING_FORM = [
  // === SEÇÃO MATINAL A: "Orvalho na Serra" (8 compassos — dedilhado translúcido, zero tensões duras) ===
  { name: 'Cmaj9',    section: 'morning_a', bass: [48, 43], voicing: [55, 59, 62, 64], rhodes: [64, 67, 71, 74], melodyPool: [71, 74, 76, 79, 72] },
  { name: 'Fmaj7#11', section: 'morning_a', bass: [41, 48], voicing: [57, 60, 64, 71], rhodes: [64, 67, 69, 71], melodyPool: [76, 79, 74, 72, 71] },
  { name: 'Em9',      section: 'morning_a', bass: [40, 47], voicing: [55, 59, 62, 66], rhodes: [62, 66, 67, 71], melodyPool: [74, 76, 78, 71, 79] },
  { name: 'Am11',     section: 'morning_a', bass: [45, 40], voicing: [55, 59, 60, 62], rhodes: [60, 62, 64, 67], melodyPool: [72, 74, 76, 79, 69] },
  { name: 'Dm9',      section: 'morning_a', bass: [50, 45], voicing: [57, 60, 64, 65], rhodes: [60, 64, 65, 69], melodyPool: [74, 76, 72, 69, 77] },
  { name: 'G6/9',     section: 'morning_a', bass: [43, 50], voicing: [55, 59, 62, 64], rhodes: [59, 62, 64, 69], melodyPool: [74, 76, 71, 72, 69] },
  { name: 'Fmaj9',    section: 'morning_a', bass: [41, 48], voicing: [57, 60, 64, 67], rhodes: [64, 67, 69, 72], melodyPool: [76, 79, 74, 72, 69] },
  { name: 'G13sus4',  section: 'morning_a', bass: [43, 50], voicing: [53, 57, 60, 64], rhodes: [60, 62, 64, 69], melodyPool: [74, 72, 71, 69, 76] },

  // === SEÇÃO MATINAL B: "Café na Varanda" (8 compassos — manhã abrindo com calor e leveza) ===
  { name: 'Am9',      section: 'morning_b', bass: [45, 40], voicing: [55, 59, 60, 64], rhodes: [60, 64, 67, 71], melodyPool: [76, 74, 72, 71, 69] },
  { name: 'Fmaj9',    section: 'morning_b', bass: [41, 48], voicing: [57, 60, 64, 67], rhodes: [64, 67, 69, 72], melodyPool: [76, 79, 74, 72, 69] },
  { name: 'Cmaj9',    section: 'morning_b', bass: [48, 43], voicing: [55, 59, 62, 64], rhodes: [64, 67, 71, 74], melodyPool: [74, 76, 72, 71, 79] },
  { name: 'Dm11',     section: 'morning_b', bass: [50, 45], voicing: [55, 60, 64, 65], rhodes: [60, 64, 65, 67], melodyPool: [74, 76, 72, 69, 77] },
  { name: 'G9sus4',   section: 'morning_b', bass: [43, 50], voicing: [53, 57, 60, 62], rhodes: [60, 62, 65, 69], melodyPool: [74, 72, 71, 69, 76] },
  { name: 'Em7',      section: 'morning_b', bass: [40, 47], voicing: [55, 59, 62, 67], rhodes: [62, 67, 71, 74], melodyPool: [76, 79, 74, 71, 72] },
  { name: 'Dm9',      section: 'morning_b', bass: [50, 45], voicing: [57, 60, 64, 69], rhodes: [60, 64, 65, 69], melodyPool: [76, 74, 72, 69, 77] },
  { name: 'G13',      section: 'morning_b', bass: [43, 50], voicing: [53, 59, 62, 64], rhodes: [59, 62, 64, 69], melodyPool: [74, 76, 71, 72, 69] }
];

const SONG_FORM = [
  // === SEÇÃO A: "Sol na Varanda" (8 compassos — alegria leve, luminosa e acolhedora) ===
  { name: 'Cmaj9',   section: 'A', bass: [48, 43], voicing: [55, 59, 62, 64], rhodes: [64, 67, 71, 74], melodyPool: [71, 74, 76, 79, 72] },
  { name: 'A7(13)',  section: 'A', bass: [45, 40], voicing: [55, 61, 64, 66], rhodes: [61, 64, 66, 69], melodyPool: [73, 76, 78, 74, 71] },
  { name: 'Dm9',     section: 'A', bass: [50, 45], voicing: [57, 60, 64, 65], rhodes: [60, 64, 65, 69], melodyPool: [76, 74, 72, 69, 77] },
  { name: 'G13',     section: 'A', bass: [43, 50], voicing: [53, 59, 62, 64], rhodes: [59, 62, 64, 69], melodyPool: [74, 76, 71, 72, 69] },
  { name: 'Em7',     section: 'A', bass: [40, 47], voicing: [55, 59, 62, 67], rhodes: [62, 67, 71, 74], melodyPool: [76, 79, 74, 71, 72] },
  { name: 'Ebdim7',  section: 'A', bass: [51, 45], voicing: [57, 60, 63, 66], rhodes: [60, 63, 66, 69], melodyPool: [75, 78, 72, 74, 69] },
  { name: 'Dm9',     section: 'A', bass: [50, 45], voicing: [57, 60, 64, 69], rhodes: [60, 64, 65, 69], melodyPool: [76, 72, 74, 69, 77] },
  { name: 'G13b9',   section: 'A', bass: [43, 50], voicing: [53, 59, 64, 68], rhodes: [59, 62, 64, 68], melodyPool: [76, 74, 71, 72, 69] },

  // === SEÇÃO B: "Brisa da Baía" (8 compassos — abre para Fmaj9 -> Fm6, ternura brasileira!) ===
  { name: 'Fmaj9',   section: 'B', bass: [41, 48], voicing: [57, 60, 64, 67], rhodes: [64, 67, 69, 72], melodyPool: [76, 79, 81, 74, 72] },
  { name: 'Fm6',     section: 'B', bass: [41, 48], voicing: [56, 60, 62, 67], rhodes: [62, 65, 68, 72], melodyPool: [74, 77, 79, 72, 68] },
  { name: 'Em7',     section: 'B', bass: [40, 47], voicing: [55, 59, 62, 67], rhodes: [62, 67, 71, 74], melodyPool: [76, 74, 71, 79, 72] },
  { name: 'A7(b13)', section: 'B', bass: [45, 40], voicing: [55, 61, 65, 69], rhodes: [61, 65, 67, 71], melodyPool: [77, 76, 73, 71, 69] },
  { name: 'Dm9',     section: 'B', bass: [50, 45], voicing: [57, 60, 64, 69], rhodes: [60, 64, 65, 69], melodyPool: [76, 74, 72, 77, 69] },
  { name: 'G13',     section: 'B', bass: [43, 50], voicing: [53, 59, 62, 64], rhodes: [59, 62, 64, 69], melodyPool: [76, 74, 71, 72, 79] },
  { name: 'Cmaj9',   section: 'B', bass: [48, 43], voicing: [55, 59, 62, 64], rhodes: [64, 67, 71, 74], melodyPool: [76, 74, 72, 71, 79] },
  { name: 'C7(9)',   section: 'B', bass: [48, 43], voicing: [55, 58, 62, 64], rhodes: [62, 64, 67, 70], melodyPool: [76, 74, 72, 70, 79] },

  // === SEÇÃO C: "Ponte do Mirante" (8 compassos — horizonte largo estilo Clube da Esquina) ===
  { name: 'Fmaj7#11',section: 'C', bass: [41, 48], voicing: [57, 60, 64, 71], rhodes: [64, 67, 69, 71], melodyPool: [81, 79, 76, 74, 71] },
  { name: 'G6/F',    section: 'C', bass: [43, 50], voicing: [53, 59, 62, 64], rhodes: [62, 64, 67, 71], melodyPool: [79, 76, 74, 71, 72] },
  { name: 'Em9',     section: 'C', bass: [40, 47], voicing: [55, 59, 62, 66], rhodes: [62, 66, 67, 71], melodyPool: [78, 76, 74, 71, 79] },
  { name: 'Am9',     section: 'C', bass: [45, 52], voicing: [55, 59, 60, 64], rhodes: [60, 64, 67, 71], melodyPool: [76, 74, 72, 71, 69] },
  { name: 'Dm9',     section: 'C', bass: [50, 45], voicing: [57, 60, 64, 69], rhodes: [60, 64, 65, 69], melodyPool: [76, 74, 72, 69, 77] },
  { name: 'D7(9)',   section: 'C', bass: [50, 45], voicing: [54, 60, 64, 66], rhodes: [60, 64, 66, 69], melodyPool: [78, 76, 74, 72, 69] },
  { name: 'Dm9',     section: 'C', bass: [50, 45], voicing: [57, 60, 64, 67], rhodes: [60, 64, 65, 69], melodyPool: [76, 74, 72, 69, 74] },
  { name: 'G13sus4', section: 'C', bass: [43, 50], voicing: [53, 57, 60, 64], rhodes: [60, 62, 64, 69], melodyPool: [74, 72, 71, 69, 76] },

  // === SEÇÃO D: "Respiro & Mar" (8 compassos — calmaria serena: só violão dedilhado, leve Rhodes e o mar!) ===
  { name: 'Cmaj9',   section: 'breath', bass: [48, 43], voicing: [55, 59, 62, 64], rhodes: [64, 67, 71, 74], melodyPool: [74, 76, 72] },
  { name: 'Fmaj9',   section: 'breath', bass: [41, 48], voicing: [57, 60, 64, 67], rhodes: [64, 67, 69, 72], melodyPool: [76, 74, 72] },
  { name: 'Cmaj9',   section: 'breath', bass: [48, 43], voicing: [55, 59, 62, 64], rhodes: [64, 67, 71, 74], melodyPool: [72, 74, 76] },
  { name: 'Fmaj9',   section: 'breath', bass: [41, 48], voicing: [57, 60, 64, 67], rhodes: [64, 67, 69, 72], melodyPool: [76, 79, 74] },
  { name: 'Am9',     section: 'breath', bass: [45, 40], voicing: [55, 59, 60, 64], rhodes: [60, 64, 67, 71], melodyPool: [74, 72, 71] },
  { name: 'Fm6',     section: 'breath', bass: [41, 48], voicing: [56, 60, 62, 67], rhodes: [62, 65, 68, 72], melodyPool: [74, 72, 68] },
  { name: 'Dm9',     section: 'breath', bass: [50, 45], voicing: [57, 60, 64, 69], rhodes: [60, 64, 65, 69], melodyPool: [74, 72, 69] },
  { name: 'G13',     section: 'breath', bass: [43, 50], voicing: [53, 59, 62, 64], rhodes: [59, 62, 64, 69], melodyPool: [74, 71, 72] }
];

// Motivos melódicos cantáveis em 16 semicolcheias (passos com pausas orgânicas e ritmo sincopado brasileiro!)
// Cada evento: { step: 0..15, idx: índice no melodyPool, durSteps: duração em semicolcheias, vel: 0..1 }
const MELODY_MOTIFS = [
  [
    { step: 2,  idx: 0, durSteps: 4, vel: 0.72 },
    { step: 6,  idx: 1, durSteps: 3, vel: 0.80 },
    { step: 10, idx: 2, durSteps: 5, vel: 0.68 }
  ],
  [
    { step: 0,  idx: 1, durSteps: 6, vel: 0.78 },
    { step: 8,  idx: 0, durSteps: 3, vel: 0.66 },
    { step: 11, idx: 3, durSteps: 4, vel: 0.74 }
  ],
  [
    { step: 4,  idx: 2, durSteps: 4, vel: 0.75 },
    { step: 8,  idx: 1, durSteps: 3, vel: 0.70 },
    { step: 12, idx: 0, durSteps: 4, vel: 0.65 }
  ],
  [
    { step: 3,  idx: 0, durSteps: 5, vel: 0.74 },
    { step: 10, idx: 4, durSteps: 5, vel: 0.68 }
  ]
];

export class BrazilianMusicEngine {
  constructor(core, musicBus, musicReverbBus = null) {
    this.core = core;
    this.ctx = core.ctx;
    this.dest = musicBus;
    this.reverbBus = musicReverbBus || core.reverbInput;

    this.isPlaying = false;
    this.phase = 'day'; // 'day' | 'sunset' | 'night' | 'dawn'
    this.timerId = null;

    // Estado do agendador lookahead (sample-accurate!)
    this.scheduleAheadTime = 0.14;
    this.lookaheadMs = 35;
    this.nextStepTime = 0;
    this.stepInBar = 0;
    this.barIndex = 0;
    this.cycleCount = 0;
    this.cycleProgress = 0.11;
    this.currentBpm = 73;
    this.usingMorningForm = true;
    this.lastMelodyMidi = null;
    this.currentMotif = MELODY_MOTIFS[0];
    this.playMelodyThisBar = false;
  }

  _getActiveForm() {
    return this.usingMorningForm ? MORNING_FORM : SONG_FORM;
  }

  _wantsMorningForm() {
    return this.phase === 'dawn' || (this.phase === 'day' && this.cycleProgress < 0.16);
  }

  setPhase(phase, cycleProgress = null) {
    const prevProgress = this.cycleProgress;
    const prevPhase = this.phase;
    if (phase && phase !== this.phase) {
      this.phase = phase;
    }
    if (typeof cycleProgress === 'number' && !Number.isNaN(cycleProgress)) {
      this.cycleProgress = ((cycleProgress % 1) + 1) % 1;
    }
    const progressDelta = Math.abs(this.cycleProgress - prevProgress);
    const wrappedDelta = Math.min(progressDelta, 1 - progressDelta);
    // Salto manual no horário (ex.: botão Horário): alinha imediatamente o repertório sem aguardar 8 compassos
    if (phase !== prevPhase && wrappedDelta > 0.10) {
      const wantsMorning = this._wantsMorningForm();
      if (wantsMorning !== this.usingMorningForm) {
        this.usingMorningForm = wantsMorning;
        this.barIndex = 0;
        this.stepInBar = 0;
      }
      this.currentBpm = this._getTargetBpm();
    }
  }

  getNowPlaying() {
    const form = this._getActiveForm();
    const chord = form[this.barIndex % form.length] || form[0];
    let title = SECTION_TITLES[chord.section] || 'Sol na Varanda';
    if (this.phase === 'night') {
      title = NIGHT_SECTION_TITLES[chord.section] || 'Seresta na Encosta';
    } else if (this.usingMorningForm) {
      title = chord.section === 'morning_b' ? 'Café na Varanda' : 'Orvalho na Serra';
    }
    return {
      isPlaying: this.isPlaying,
      section: chord.section,
      title,
      chord: chord.name,
      bpm: Math.round(this.currentBpm || this._getTargetBpm()),
      phase: this.phase,
      barIndex: this.barIndex
    };
  }

  nextSection() {
    const wantsMorning = this._wantsMorningForm();
    if (wantsMorning !== this.usingMorningForm) {
      this.usingMorningForm = wantsMorning;
      this.barIndex = 0;
    } else {
      const form = this._getActiveForm();
      this.barIndex = (Math.floor(this.barIndex / 8) + 1) * 8 % form.length;
    }
    this.stepInBar = 0;
    if (this.ctx) this.nextStepTime = this.ctx.currentTime + 0.05;
    return this.getNowPlaying();
  }

  _getTargetBpm() {
    switch (this.phase) {
      case 'night':  return 70; // Seresta noturna íntima e serena
      case 'dawn':   return 71; // Despertar suave saindo da noite
      case 'sunset': return 74; // Golden hour dourada e acolhedora
      default:       return (this.cycleProgress < 0.16) ? 73 : 76; // Manhã serena / Bossa solar equilibrada
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.stepInBar = 0;
    this.barIndex = 0;
    this.usingMorningForm = this._wantsMorningForm();
    this.currentBpm = this._getTargetBpm();
    this.nextStepTime = this.ctx.currentTime + 0.08;
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => this._schedulerTick(), this.lookaheadMs);
    this._schedulerTick();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  _schedulerTick() {
    if (!this.isPlaying || !this.ctx || this.ctx.state !== 'running') return;

    // Se a aba ficou em segundo plano, realinha o relógio sem despejar notas acumuladas
    if (this.nextStepTime < this.ctx.currentTime - 0.45) {
      this.nextStepTime = this.ctx.currentTime + 0.06;
    }

    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this._scheduleStep(this.stepInBar, this.nextStepTime);
      this._advanceStep();
    }
  }

  _advanceStep() {
    const sixteenthDur = (60.0 / this.currentBpm) / 4.0;
    this.nextStepTime += sixteenthDur;
    this.stepInBar++;
    if (this.stepInBar >= 16) {
      this.stepInBar = 0;
      const formLen = this._getActiveForm().length;
      this.barIndex = (this.barIndex + 1) % formLen;
      if (this.barIndex === 0) this.cycleCount++;
    }
  }

  _scheduleStep(step, baseTime) {
    if (step === 0) {
      if (this.barIndex % 8 === 0) {
        const wantsMorning = this._wantsMorningForm();
        if (wantsMorning !== this.usingMorningForm) {
          this.usingMorningForm = wantsMorning;
          this.barIndex = wantsMorning ? 0 : (this.phase === 'day' ? 8 : 0);
        }
      }
      const targetBpm = this._getTargetBpm();
      this.currentBpm += (targetBpm - this.currentBpm) * 0.20;
    }

    const form = this._getActiveForm();
    const chord = form[this.barIndex % form.length];
    const nextChord = form[(this.barIndex + 1) % form.length];

    const stepDur = (60.0 / this.currentBpm) / 4.0;

    // Swing brasileiro sutil nas semicolcheias pares/ímpares (+9ms de balanço humano)
    const swing = (step % 2 === 1) ? 0.009 : 0.0;
    const t = baseTime + swing;

    const isBreath = chord.section === 'breath';
    const isNight = this.phase === 'night';
    const isDawn = this.phase === 'dawn';
    const isSunset = this.phase === 'sunset';
    const isEarlyMorning = (this.phase === 'day' && this.cycleProgress < 0.16);
    const useFingerpicking = isBreath || isNight || isDawn || (isEarlyMorning && (chord.section === 'A' || chord.section === 'morning_a'));

    // No início de cada compasso decide se haverá frase melódica cantável (respiração orgânica entre frases)
    if (step === 0) {
      const barInPhrase = this.barIndex % 4;
      const melodyAllowed = !isBreath && (
        isNight ? (barInPhrase === 0 && (this.barIndex % 8 === 0))
          : (isDawn ? (barInPhrase === 0) : (barInPhrase === 0 || barInPhrase === 1))
      );
      this.playMelodyThisBar = melodyAllowed;
      if (melodyAllowed) {
        const motifIdx = (this.barIndex + this.cycleCount) % MELODY_MOTIFS.length;
        this.currentMotif = MELODY_MOTIFS[motifIdx];
      } else {
        this.lastMelodyMidi = null;
      }
    }

    // 1. VIOLÃO DE NYLON CARIOCA (O coração acolhedor de Morro Vivo!)
    this._scheduleNylonGuitar(step, t, stepDur, chord, nextChord, useFingerpicking, isBreath, isEarlyMorning);

    // 2. CONTRABAIXO ACÚSTICO (Pulso quente e macio nas cabeças e síncopes)
    this._scheduleAcousticBass(step, t, stepDur, chord, nextChord, isBreath, isNight, isDawn, isEarlyMorning);

    // 3. PIANO ELÉTRICO RHODES AVELUDADO (Nuvem harmônica cálida e espaçada)
    this._scheduleWarmRhodes(step, t, stepDur, chord, isBreath, isSunset, isNight, isDawn);

    // 4. PERCUSSÃO ACÚSTICA LEVE DE BOSSA NOVA & GOTÍCULAS DE ORVALHO NO COMEÇO DO DIA
    if (!isBreath && !isNight) {
      this._scheduleBossaPercussion(step, t, stepDur, chord.section, isSunset, isDawn, isEarlyMorning);
    } else if (isNight && !isBreath && step === 4 && (this.barIndex % 2 === 0)) {
      // Um sussurro ultra-sutil de vassourinha a cada 2 compassos na seresta noturna
      this.core.playBrushSweep(t + 0.01, 0.22, stepDur * 2.2, 0.14, this.dest, 0.25, this.reverbBus);
    }

    // Gotículas raras e muito macias de marimba de madeira no orvalho da manhã (step 10 de compassos pares)
    if (isEarlyMorning && chord.section === 'morning_a' && step === 10 && (this.barIndex % 2 === 0)) {
      const dewNote = chord.melodyPool[this.barIndex % chord.melodyPool.length];
      this.core.playMarimbaNote(dewNote, t + 0.012, 0.14, 0.30, this.dest, 0.45, this.reverbBus);
    }

    // 5. MELODIA LÍRICA ESPARSA (Flauta aérea no Alvorecer, Violão solista macio no Dia/Pôr do Sol/Noite)
    if (this.playMelodyThisBar) {
      this._scheduleMelodyVoice(step, t, stepDur, chord, isNight, isSunset, isDawn);
    }
  }

  _scheduleNylonGuitar(step, t, stepDur, chord, nextChord, useFingerpicking, isBreath, isEarlyMorning = false) {
    const hTime = () => (Math.random() - 0.5) * 0.010; // ±5ms humanização orgânica
    const voicing = chord.voicing;

    if (useFingerpicking) {
      // DEDILHADO CARIOCA (p - i - m - a - m - i): leveza pura, meditativo e intimista!
      if (step === 0 || step === 8) {
        const bassMidi = (step === 0) ? chord.bass[0] : chord.bass[1];
        this.core.playNylonNote(bassMidi, t + hTime(), isBreath ? 0.58 : 0.62, stepDur * 6.8, -0.22, this.dest, 0.34, this.reverbBus);
      }
      const arpMap = { 2: 0, 4: 1, 6: 2, 10: 3, 12: 2, 14: 1 };
      if (arpMap[step] !== undefined) {
        const note = voicing[arpMap[step]];
        const vel = (step === 10 ? 0.58 : 0.48) * (0.90 + Math.random() * 0.16);
        this.core.playNylonNote(note, t + hTime(), vel, stepDur * 5.2, -0.18 + arpMap[step] * 0.06, this.dest, 0.36, this.reverbBus);
      }
      return;
    }

    // BATIDA AVELUDADA DE BOSSA NOVA:
    // Polegar quente nos bordões e puxada arpejada leve das 4 cordas (equilibrada em dB com a seresta!)
    const calmFactor = isEarlyMorning ? 0.82 : 1.0;
    if (step === 0 || step === 8) {
      const rootNote = (step === 0) ? chord.bass[0] : chord.bass[1];
      this.core.playNylonNote(rootNote, t + hTime(), 0.56 * calmFactor, stepDur * 4.2, -0.24, this.dest, 0.30, this.reverbBus);
    } else if (step === 4 || step === 12) {
      const thumbNote = (step === 4) ? chord.bass[0] : chord.bass[1];
      this.core.playNylonNote(thumbNote, t + hTime(), 0.40 * calmFactor, stepDur * 3.4, -0.22, this.dest, 0.28, this.reverbBus);
    }

    const isEvenBar = (this.barIndex % 2 === 0);
    const hits = isEvenBar
      ? { 0: [0.47, 2.8], 3: [0.40, 2.6], 6: [0.44, 3.3], 10: [0.39, 2.4], 12: [0.43, 2.5] }
      : { 0: [0.43, 2.5], 3: [0.42, 2.9], 6: [0.38, 2.5], 9: [0.45, 2.9], 12: [0.41, 2.5], 15: [0.39, 2.7] };

    if (step === 5 || step === 13) {
      this.core.playNylonGhostStrum(t + hTime(), 0.26 * calmFactor, -0.20, this.dest, 0.20, this.reverbBus);
    }

    const hit = hits[step];
    if (hit) {
      const activeVoicing = (step === 15) ? nextChord.voicing : voicing;
      const [baseVel, durSteps] = hit;
      const strumSpread = 0.014 + Math.random() * 0.009; // micro-arpejo sedoso (14..23ms)
      const jitter = hTime();
      for (let i = 0; i < activeVoicing.length; i++) {
        const v = baseVel * calmFactor * (0.88 + Math.random() * 0.16) * (i === activeVoicing.length - 1 ? 1.04 : 0.94);
        const notePan = -0.22 + i * 0.07;
        this.core.playNylonNote(
          activeVoicing[i],
          t + jitter + i * strumSpread,
          v,
          stepDur * durSteps,
          notePan,
          this.dest,
          0.32,
          this.reverbBus
        );
      }
    }
  }

  _scheduleAcousticBass(step, t, stepDur, chord, nextChord, isBreath, isNight, isDawn = false, isEarlyMorning = false) {
    // Mantém o contrabaixo acústico sempre numa região quente e coesa (MIDI 36..47: C2..B2), sem saltos bruscos de oitava!
    const smoothBass = (m) => (m > 47 ? m - 12 : (m < 36 ? m + 12 : m));
    const velScale = isBreath ? 0.56 : (isDawn ? 0.62 : (isNight ? 0.72 : (isEarlyMorning ? 0.68 : 0.74)));
    if (step === 0) {
      this.core.playAcousticBassNote(smoothBass(chord.bass[0]), t, 0.80 * velScale, stepDur * 5.6, -0.05, this.dest, 0.14, this.reverbBus);
    } else if (step === 6 && !isBreath && !isDawn) {
      this.core.playAcousticBassNote(smoothBass(chord.bass[0]), t + 0.005, 0.38 * velScale, stepDur * 1.8, -0.05, this.dest, 0.12, this.reverbBus);
    } else if (step === 8) {
      this.core.playAcousticBassNote(smoothBass(chord.bass[1]), t, 0.70 * velScale, stepDur * 5.8, -0.05, this.dest, 0.14, this.reverbBus);
    } else if (step === 14 && !isBreath && !isNight && !isDawn && !isEarlyMorning && (this.barIndex % 2 === 1)) {
      const targetRoot = smoothBass(nextChord.bass[0]);
      const approach = (targetRoot > smoothBass(chord.bass[1])) ? targetRoot - 1 : targetRoot + 1;
      this.core.playAcousticBassNote(approach, t + 0.006, 0.42 * velScale, stepDur * 1.9, -0.05, this.dest, 0.12, this.reverbBus);
    }
  }

  _scheduleWarmRhodes(step, t, stepDur, chord, isBreath, isSunset, isNight, isDawn = false) {
    // Rhodes entra como colchão luminoso e arejado em todas as fases (mais presente no Pôr do Sol e Noite!)
    const playOnZero = (step === 0) && (!isBreath || (this.barIndex % 2 === 0));
    const playSync = (step === 10) && !isBreath && !isDawn && (isSunset || chord.section === 'C');

    if (!playOnZero && !playSync) return;

    const baseVel = isSunset ? 0.50 : (isNight ? 0.46 : (isDawn ? 0.42 : (isBreath ? 0.34 : 0.38)));
    const dur = playOnZero ? stepDur * (isBreath ? 13.5 : 11.0) : stepDur * 5.4;
    const notes = chord.rhodes;

    for (let i = 0; i < notes.length; i++) {
      // Micro-arpejo elegante de pianista (24ms entre notas)
      const nt = t + i * 0.024 + (Math.random() - 0.5) * 0.006;
      const pan = 0.10 + i * 0.08;
      this.core.playWarmRhodesNote(
        notes[i],
        nt,
        baseVel * (0.90 + Math.random() * 0.14),
        dur,
        pan,
        this.dest,
        0.42,
        this.reverbBus
      );
    }
  }

  _scheduleBossaPercussion(step, t, stepDur, section, isSunset, isDawn, isEarlyMorning = false) {
    // No Alvorecer e na seção Orvalho na Serra: apenas um sussurro gentil de vassourinha nos tempos 2 e 4
    if (isDawn || (isEarlyMorning && section === 'morning_a')) {
      if ((step === 4 || step === 12) && (!isDawn || this.barIndex % 2 === 0)) {
        this.core.playBrushSweep(t + 0.006, isDawn ? 0.24 : 0.28, stepDur * 2.6, 0.14, this.dest, 0.22, this.reverbBus);
      }
      return;
    }

    const softScale = isEarlyMorning ? 0.34 : (isSunset ? 0.58 : 0.54);
    const jitter = (Math.random() - 0.5) * 0.007;

    // 1. Clave de Bossa Nova na baqueta de madeira (macia, sem estalos altos!)
    const isEvenBar = (this.barIndex % 2 === 0);
    const rimHit = isEvenBar
      ? (step === 0 || step === 3 || step === 6 || step === 10 || step === 12)
      : (step === 2 || step === 6 || step === 9 || step === 12);

    if (rimHit && !(isEarlyMorning && step === 0)) {
      const accent = (step === 3 || step === 6 || step === 10 || step === 9) ? 0.60 : 0.42;
      this.core.playBossaRimClick(t + jitter, accent * softScale, -0.20, this.dest, 0.18, this.reverbBus);
    }

    // 2. Ganzá em colcheias relaxadas (step par — sem corrida de semicolcheia!)
    if (step % 2 === 0) {
      const isAcc = (step === 2 || step === 6 || step === 10 || step === 14);
      const gVel = (isAcc ? 0.44 : 0.25) * softScale * (0.88 + Math.random() * 0.20);
      this.core.playGanzaBrush(t + jitter, gVel, isAcc, 0.26, this.dest, 0.14, this.reverbBus);
    }

    // 3. Vassourinha suave na seção B, Ponte e Pôr do Sol
    if ((section === 'B' || section === 'C' || isSunset) && (step === 4 || step === 12)) {
      this.core.playBrushSweep(t + 0.004, 0.34 * softScale, stepDur * 2.8, 0.12, this.dest, 0.20, this.reverbBus);
    }

    // 4. Coração baixinho de Surdo de pele (apenas após o início da manhã, nos refrões B/C)
    if (!isEarlyMorning && (section === 'B' || section === 'C')) {
      if (step === 0) {
        this.core.playWarmSurdo(t, 0.18 * softScale, false, 0, this.dest, 0.14, this.reverbBus);
      } else if (step === 8) {
        this.core.playWarmSurdo(t, 0.24 * softScale, true, 0, this.dest, 0.18, this.reverbBus);
      }
    }
  }

  _scheduleMelodyVoice(step, t, stepDur, chord, isNight, isSunset, isDawn = false) {
    for (let i = 0; i < this.currentMotif.length; i++) {
      const ev = this.currentMotif[i];
      if (ev.step !== step) continue;
      const pool = chord.melodyPool;
      const midi = pool[ev.idx % pool.length];
      const dur = stepDur * ev.durSteps;
      const vel = ev.vel * (0.90 + Math.random() * 0.14);
      const guitarMidi = midi - 12; // Região cantável das cordas primas do violão de nylon (G4..A5 -> G3..A4)

      if (isNight) {
        // À noite: duo íntimo de violão solista respondendo à direita com leve eco de Rhodes
        this.core.playNylonNote(guitarMidi, t + 0.008, vel * 0.72, dur * 1.35, 0.26, this.dest, 0.42, this.reverbBus);
      } else if (isDawn) {
        // No alvorecer: flauta aérea e suave dialogando com os sabiás da serra
        this.core.playBambooFluteNote(midi, t + 0.015, vel * 0.34, dur * 1.15, 0.28, this.dest, 0.56, this.lastMelodyMidi, this.reverbBus);
        if (i === 0) {
          this.core.playNylonNote(guitarMidi, t + 0.008, vel * 0.54, dur * 1.30, -0.18, this.dest, 0.40, this.reverbBus);
        }
      } else if (chord.section === 'C' && !isSunset) {
        // Na Ponte do Mirante: violão solista + sopro delicado de flauta de bambu dobrando suavemente!
        this.core.playNylonNote(guitarMidi, t + 0.005, vel * 0.58, dur * 1.25, 0.24, this.dest, 0.40, this.reverbBus);
        this.core.playBambooFluteNote(midi, t + 0.018, vel * 0.40, dur * 1.05, 0.32, this.dest, 0.50, this.lastMelodyMidi, this.reverbBus);
      } else if (isSunset) {
        // No Pôr do Sol: violão solista quente + brilho sutil de Rhodes na ponta da frase
        this.core.playNylonNote(guitarMidi, t + 0.006, vel * 0.72, dur * 1.30, 0.26, this.dest, 0.42, this.reverbBus);
        if (i === this.currentMotif.length - 1) {
          this.core.playWarmRhodesNote(midi, t + 0.015, vel * 0.34, dur * 1.4, 0.30, this.dest, 0.48, this.reverbBus);
        }
      } else {
        // De Dia: duo sereno de violão carioca sem volume excessivo
        this.core.playNylonNote(guitarMidi, t + 0.006, vel * 0.64, dur * 1.30, 0.26, this.dest, 0.42, this.reverbBus);
      }
      this.lastMelodyMidi = midi;
    }
  }
}
