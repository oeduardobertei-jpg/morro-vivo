import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const url = 'http://localhost:5173/?debug';
const outDir = 'scripts/out/playtest';
const chromePath = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find((p) => fs.existsSync(p));

fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1280,720'],
  defaultViewport: { width: 1280, height: 720 }
});

const page = await browser.newPage();
const logs = [];
const errors = [];

page.on('console', (m) => {
  const t = m.text();
  if (['error', 'warning'].includes(m.type())) errors.push(`[${m.type()}] ${t}`);
  logs.push(`[${m.type()}] ${t}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

console.log('Navegando para ' + url);
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));

// Screenshot 1: Visão Geral Panorâmica
await page.screenshot({ path: path.join(outDir, '01_panoramica.png') });

// Testar Câmeras
const cameras = ['cam-prainha', 'cam-morro', 'cam-serra', 'cam-cume', 'cam-varzea'];
for (const cam of cameras) {
  console.log('Testando camera: ' + cam);
  await page.click(`#${cam}`);
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(outDir, `cam_${cam}.png`) });
}

// Voltar para Panorâmica
await page.click('#cam-pan');
await new Promise((r) => setTimeout(r, 1500));

// Testar Ações
console.log('Disparando ações...');
await page.click('#act-samba');
await new Promise((r) => setTimeout(r, 1000));

await page.click('#act-puxadinho');
await new Promise((r) => setTimeout(r, 1000));

await page.click('#act-solar');
await new Promise((r) => setTimeout(r, 1000));

await page.screenshot({ path: path.join(outDir, '02_pos_acoes.png') });

// Testar Ciclo Dia/Noite
console.log('Testando ciclo de tempo...');
await page.click('#btn-time-cycle'); // Sunset
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({ path: path.join(outDir, '03_por_do_sol.png') });

await page.click('#btn-time-cycle'); // Night
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({ path: path.join(outDir, '04_noite_carioca.png') });

// Testar Mixer de Áudio
console.log('Abrindo Mixer de Áudio...');
await page.click('#btn-audio-mixer');
await new Promise((r) => setTimeout(r, 1000));
await page.screenshot({ path: path.join(outDir, '05_mixer_audio.png') });
await page.click('#btn-mixer-close');
await new Promise((r) => setTimeout(r, 800));

// Inspecionar morador ou casa clicando programaticamente
console.log('Testando seleção de NPC e Casa...');
const inspectTest = await page.evaluate(() => {
  const m = window.__morro;
  if (!m) return { err: 'sem morro' };
  
  // Pegar primeiro morador e primeira casa
  const citizen = m.npcs.npcs[0];
  const house = m.architecture.houses[0];
  
  return {
    citizen: citizen ? { name: citizen.citizenName, role: citizen.role, action: citizen.currentAction } : null,
    house: house ? { id: house.id, faction: house.faction, level: house.level, wealth: house.wealth } : null
  };
});

// Coletar estatísticas completas
const stats = await page.evaluate(() => {
  const m = window.__morro;
  if (!m) return null;
  return {
    metrics: m.simulation.globalMetrics,
    day: m.simulation.day,
    factions: m.simulation.factions,
    eventsCount: m.simulation.history.length,
    recentEvents: m.simulation.history.slice(-5),
    housesCount: m.architecture.houses.length,
    activeConstructions: m.architecture.activeConstructions.length,
    npcCount: m.npcs.npcs.length,
    batcher: m.batcher.stats,
    culler: m.culler.stats,
    perf: m.perf.snapshot()
  };
});

console.log('Resultado do Playtest:');
console.log(JSON.stringify({ stats, inspectTest, errors }, null, 2));

await browser.close();
