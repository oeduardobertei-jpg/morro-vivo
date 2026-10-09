// Perfil da cena: draw calls, triângulos, CPU por subsistema e contagem de objetos.
// Uso: node scripts/profile.mjs [url]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const url = process.argv[2] || 'http://localhost:5173/?debug';
const chromePath = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find((p) => fs.existsSync(p));

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1280,720'],
  defaultViewport: { width: 1280, height: 720 }
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`[${m.type()}] ${m.text()}`); });
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await new Promise((r) => setTimeout(r, 8000));
// Espera o agrupamento estático terminar (em renderização por software isso demora)
const t0 = Date.now();
while (Date.now() - t0 < 120000) {
  const s = await page.evaluate(() => {
    const b = window.__morro?.batcher;
    return b ? { state: b.state, enabled: b.enabled, t: b._t } : null;
  });
  if (!s || !s.enabled || s.state === 'active') break;
  await new Promise((r) => setTimeout(r, 2000));
}
console.error(`[profile] espera do batcher: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await new Promise((r) => setTimeout(r, 4000));
const tag = process.argv[3];
if (tag) { fs.mkdirSync('scripts/out', { recursive: true }); await page.screenshot({ path: `scripts/out/${tag}.png` }); }

const result = await page.evaluate(() => {
  const m = window.__morro;
  const geos = new Set(); const mats = new Set();
  let meshes = 0, instanced = 0, visible = 0, shadowCasters = 0, groups = 0, total = 0, lights = 0, lightsWithShadow = 0;
  m.scene.traverse((o) => {
    total++;
    if (o.isLight) { lights++; if (o.castShadow) lightsWithShadow++; }
    if (o.isGroup) groups++;
    if (o.isMesh) {
      meshes++;
      if (o.isInstancedMesh) instanced++;
      if (o.visible) visible++;
      if (o.castShadow) shadowCasters++;
      geos.add(o.geometry.uuid);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((x) => mats.add(x.uuid));
    }
  });
  return {
    perf: m.perf.snapshot(),
    cull: m.culler.stats,
    batch: m.batcher.stats,
    scene: { objects: total, meshes, instanced, visible, shadowCasters, uniqueGeometries: geos.size, uniqueMaterials: mats.size, lights, lightsWithShadow },
    npcs: m.npcs.npcs.length,
    population: m.simulation.globalMetrics.population,
    houses: (m.architecture.activeHouses || m.architecture.houses || []).length
  };
});
console.log(JSON.stringify({ result, errors: errors.slice(0, 10) }, null, 2));
await browser.close();
