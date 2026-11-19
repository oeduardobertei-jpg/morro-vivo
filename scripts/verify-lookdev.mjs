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

  // 7. Telemetria estabilizada (Panorâmica Dia em ambos os modos)
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

    return {
      fpsMaquete: Number(fpsMaquete.toFixed(1)),
      fpsStudioFX: Number(fpsStudioFX.toFixed(1)),
      maqueteRenderInfo,
      perf: m.perf.snapshot(),
      cull: m.culler.stats,
      batch: m.batcher.stats,
      memory: m.renderer.info.memory,
      fxMode: m.postFX.mode,
      qualityRatio: m.quality.ratio,
      phase: m.env.currentPhase
    };
  });

  console.log(JSON.stringify({ outDir, metrics, errors, warningCount: warnings.length }, null, 2));
  if (errors.length > 0) process.exitCode = 1;
} finally {
  await browser.close();
}

