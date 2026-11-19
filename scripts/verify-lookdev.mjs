import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.resolve(process.cwd(), 'package.json'));
const puppeteer = require('puppeteer-core');

function parseArgs(argv) {
  const opts = {
    url: 'http://localhost:5173/?debug',
    out: path.resolve(process.cwd(), 'scripts/out/lookdev')
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) opts.url = argv[++i];
    else if (argv[i] === '--out' && argv[i + 1]) opts.out = path.resolve(argv[++i]);
    else if (!argv[i].startsWith('--') && i === 0) opts.url = argv[i];
    else if (!argv[i].startsWith('--') && i === 1) opts.out = path.resolve(argv[i]);
  }
  return opts;
}

const { url, out: outDir } = parseArgs(process.argv.slice(2));
fs.mkdirSync(outDir, { recursive: true });

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);

const chromePath = chromeCandidates.find((p) => fs.existsSync(p));
if (!chromePath) {
  console.error('[verify-lookdev] Chrome/Edge executable not found. Set CHROME_PATH.');
  process.exit(1);
}

console.error('[verify-lookdev] browser:', chromePath);
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  args: [
    '--enable-webgl',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--ignore-gpu-blocklist',
    '--disable-gpu-sandbox',
    '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required',
    '--window-size=1280,720'
  ],
  defaultViewport: { width: 1280, height: 720 }
});

const errors = [];
const warnings = [];

try {
  const page = await browser.newPage();
  const tStart = Date.now();

  page.on('console', (m) => {
    const line = `[+${((Date.now() - tStart) / 1000).toFixed(1)}s][${m.type()}] ${m.text()}`;
    if (m.type() === 'error') {
      console.error(line);
      errors.push(line);
    } else if (m.type() === 'warning') {
      warnings.push(line);
    }
  });
  page.on('pageerror', (e) => {
    const line = `[pageerror] ${e.message}`;
    console.error(line);
    errors.push(line);
  });
  page.on('requestfailed', (r) => {
    const line = `[requestfailed] ${r.url()}`;
    console.error(line);
    errors.push(line);
  });

  console.error('[verify-lookdev] navigating:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  console.error(`[verify-lookdev] domcontentloaded (+${((Date.now() - tStart) / 1000).toFixed(1)}s)`);
  await page.waitForFunction(() => window.__morro && window.__morro.batcher, { timeout: 45000 });
  await page.waitForFunction(() => window.__morro.batcher.stats.state === 'active', { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));

  const setCam = async (px, py, pz, tx, ty, tz) => {
    await page.evaluate((px, py, pz, tx, ty, tz) => {
      const m = window.__morro;
      m.camera.position.set(px, py, pz);
      m.controls.target.set(tx, ty, tz);
      m.controls.update();
    }, px, py, pz, tx, ty, tz);
    await new Promise((r) => setTimeout(r, 700));
  };

  const setModeAndPhase = async (mode, targetPhase) => {
    await page.evaluate((mode, targetPhase) => {
      const m = window.__morro;
      if (m.postFX?.setMode) m.postFX.setMode(mode);
      if (m.env?.toggleTimeOfDay) {
        for (let i = 0; i < 6; i++) {
          const cur = m.env.getTimeOfDay();
          const p = typeof cur === 'string' ? cur : cur.phase;
          if (p === targetPhase) break;
          m.env.toggleTimeOfDay();
        }
      }
    }, mode, targetPhase);
    await new Promise((r) => setTimeout(r, 1500));
  };

  const snap = async (filename) => {
    console.error('[verify-lookdev] capture:', filename);
    await page.screenshot({ path: path.join(outDir, filename) });
  };

  // 1. Panorâmica Dia - Maquete (Leve)
  await setModeAndPhase('maquete', 'day');
  await setCam(-45, 42, 108, 0, 8, -10);
  await snap('01_day_overview_maquete.png');

  // 2. Panorâmica Dia - Studio FX (SSAO + Bloom + AgX + SMAA)
  await setModeAndPhase('bloom', 'day');
  await snap('02_day_overview_studiofx.png');

  // 2B. Corredor do Bondinho (X=32) & Morro do Sol limpo sem escadaria sem saída
  await setCam(62, 34, 34, 24, 12, -16);
  await snap('07_bondinho_and_morro_day.png');

  // 2C. Vista Flanco Oeste -> Horizonte Leste (Turbinas, Capoeira, Horta, Jongo, Cabo e Horizonte do Mar)
  await setCam(-165, 42, -8, -40, 12, -32);
  await snap('08_west_coast_horizon_day.png');

  // 3. Close-up Encosta Oeste & Olaria - Studio FX
  await setCam(-40, 24, 8, -24, 10, -20);
  await snap('03_houses_closeup_studiofx.png');

  // 4. Pôr do Sol no Píer, Praia & Espuma - Studio FX
  await setModeAndPhase('bloom', 'sunset');
  await setCam(-55, 22, 112, -78, 1.5, 62);
  await snap('04_sunset_pier_ocean_studiofx.png');

  // 5. Noite Oceânica & Horizonte (checa ausência de estouro HDR no mar)
  await setModeAndPhase('bloom', 'night');
  await setCam(-20, 48, 130, 0, 6, 15);
  await snap('05_night_ocean_bloom_studiofx.png');

  // 6. Close-up Noturno Vila Leste (janelas, telhados, postes)
  await setCam(42, 20, 12, 24, 8, -14);
  await snap('06_night_village_studiofx.png');

  // 7. Teste funcional rápido: WASD move câmera + FastPicker clica casa agrupada
  await setCam(-45, 42, 108, 0, 8, -10);
  const beforePos = await page.evaluate(() => window.__morro.controls.target.toArray());
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await new Promise((r) => setTimeout(r, 450));
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyD');
  await new Promise((r) => setTimeout(r, 150));
  const afterPos = await page.evaluate(() => window.__morro.controls.target.toArray());
  const wasdMovedDist = Number(Math.hypot(afterPos[0] - beforePos[0], afterPos[2] - beforePos[2]).toFixed(2));

  // Testa FastPicker em uma casa agrupada (layer 31)
  const pickCheck = await page.evaluate(() => {
    const m = window.__morro;
    const h = m.architecture.houses.find((x) => x && x.meshGroup && x.meshGroup.visible);
    if (!h) return { ok: false, reason: 'no-house' };
    const p = h.meshGroup.position;
    m.camera.position.set(p.x + 10, p.y + 8, p.z + 12);
    m.controls.target.set(p.x, p.y + 1.8, p.z);
    m.controls.update();
    m.camera.updateMatrixWorld(true);
    const hit = m.fastPicker.pick({ x: 0, y: 0 });
    return { ok: !!(hit && hit.type === 'house'), hitType: hit ? hit.type : null, pickMs: Number(m.fastPicker.lastPickMs.toFixed(2)) };
  });

  // 7B. Validação acústica real (Karplus-Strong banks, Bossa Nova scheduler, mar/pássaros, Roda de Samba e Foley)
  const audioCheck = await page.evaluate(async () => {
    const m = window.__morro;
    const st = m.soundtrack;
    if (!st) return { ok: false, reason: 'no-soundtrack' };

    const t0 = performance.now();
    st.init();
    const initMs = Number((performance.now() - t0).toFixed(2));
    if (st.ctx.state === 'suspended') {
      await st.ctx.resume();
    }
    st.play();

    // Conecta AnalyserNode para medir sinal real gerado na saída master
    const analyser = st.ctx.createAnalyser();
    analyser.fftSize = 2048;
    st.core.masterGain.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);

    // Exercita todos os efeitos sonoros e fauna perto da câmera
    const nearPos = m.controls.target.clone();
    st.playCelebrationChime(nearPos);
    st.playConstructionSound(nearPos);
    st.playBeachCommerceSound(nearPos);
    st.playSoccerKick(nearPos);
    st.playAltinhaKick(nearPos);
    st.playGoalWhistle(nearPos);
    st.playCartRattle(nearPos);
    st.playMaresiaBreeze(nearPos);
    st.playUiClick('cam');
    st.playUiSelect('house');
    st.playUiTimeShift('sunset');
    st.playSambaRhythm(nearPos, true);
    st.soundscape._playSabiaSong(0.9);
    st.soundscape._playBemTeViCall(0.8);
    st.soundscape._playDistantSeagull(0.8);
    st.soundscape._playNightCricketChirp(0.8);

    let maxPeak = 0;
    let sumSq = 0;
    let samplesCount = 0;
    for (let s = 0; s < 12; s++) {
      await new Promise((r) => setTimeout(r, 120));
      analyser.getFloatTimeDomainData(buf);
      for (let i = 0; i < buf.length; i++) {
        const a = Math.abs(buf[i]);
        if (a > maxPeak) maxPeak = a;
        sumSq += buf[i] * buf[i];
      }
      samplesCount += buf.length;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, samplesCount));
    st.core.masterGain.disconnect(analyser);

    return {
      ok: st.ctx.state === 'running' && rms > 0.001 && maxPeak < 0.995,
      ctxState: st.ctx.state,
      initMs,
      nylonBankSize: st.core.nylonBank.length,
      cavacoBankSize: st.core.cavacoBank.length,
      marimbaBankSize: st.core.marimbaBank.length,
      rms: Number(rms.toFixed(4)),
      peak: Number(maxPeak.toFixed(4)),
      phase: st.musicEngine ? st.musicEngine.phase : null,
      barIndex: st.musicEngine ? st.musicEngine.barIndex : -1
    };
  });

  // 8. Telemetria estabilizada (Panorâmica Dia em ambos os modos)
  await setCam(-45, 42, 108, 0, 8, -10);
  const metrics = await page.evaluate(async () => {
    const m = window.__morro;
    const countFrames = (ms) => new Promise((res) => {
      let n = 0;
      const t0 = performance.now();
      function step() {
        n++;
        if (performance.now() - t0 < ms) requestAnimationFrame(step);
        else res((n * 1000) / (performance.now() - t0));
      }
      requestAnimationFrame(step);
    });

    m.postFX.setMode('maquete');
    await new Promise((r) => setTimeout(r, 1500));
    const fpsMaquete = await countFrames(2000);
    const maqueteRenderInfo = { ...m.renderer.info.render };

    m.postFX.setMode('bloom');
    await new Promise((r) => setTimeout(r, 1500));
    const fpsStudioFX = await countFrames(2000);

    let pointLightCount = 0;
    m.scene.traverse((o) => { if (o.isPointLight) pointLightCount++; });

    return {
      fpsMaquete: Number(fpsMaquete.toFixed(1)),
      fpsStudioFX: Number(fpsStudioFX.toFixed(1)),
      maqueteRenderInfo,
      pointLightCount,
      perf: m.perf.snapshot(),
      cull: m.culler.stats,
      batch: m.batcher.stats,
      memory: m.renderer.info.memory,
      fxMode: m.postFX.mode,
      qualityRatio: m.quality.ratio,
      phase: m.env.currentPhase
    };
  });

  console.log(JSON.stringify({ outDir, wasdMovedDist, pickCheck, audioCheck, metrics, errors, warningCount: warnings.length }, null, 2));
  if (errors.length > 0) process.exitCode = 1;
} finally {
  await browser.close();
}

