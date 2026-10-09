// Diagnóstico headless do Morro Vivo: console, erros, FPS e screenshots.
// Uso: node scripts/diagnose.mjs [url] [pastaSaida]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:5173/';
const outDir = process.argv[3] || 'scripts/out';
const chromePath = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find((p) => fs.existsSync(p));

fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--window-size=1280,720'],
  defaultViewport: { width: 1280, height: 720 }
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()}`));

await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await new Promise((r) => setTimeout(r, 8000));
await page.screenshot({ path: path.join(outDir, 'inicial.png') });

const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0; const t = performance.now();
  (function f() { n++; if (performance.now() - t < 5000) requestAnimationFrame(f); else res(n / 5); })();
}));

const ui = await page.evaluate(() => ({
  canvas: !!document.querySelector('canvas'),
  buttons: [...document.querySelectorAll('button')].map((b) => ({ id: b.id, text: b.innerText.trim().slice(0, 40) })),
  title: document.title
}));

console.log(JSON.stringify({ chromePath, fps, ui, logs: logs.slice(0, 60) }, null, 2));
await browser.close();
