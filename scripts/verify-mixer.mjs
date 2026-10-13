import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const url = 'http://localhost:5173/';
const outDir = 'scripts/out/verify';
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
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));

// 1. Clicar no botão Volumes para abrir o Mixer
console.log('Clicando em #btn-audio-mixer...');
await page.click('#btn-audio-mixer');
await new Promise((r) => setTimeout(r, 1000));

// Verificar se o modal está visível
const isMixerVisible = await page.evaluate(() => {
  const modal = document.getElementById('modal-audio-mixer');
  return modal && modal.style.display !== 'none' && window.getComputedStyle(modal).display !== 'none';
});

console.log('Mixer visível:', isMixerVisible);
await page.screenshot({ path: path.join(outDir, 'mixer_aberto.png') });

// 2. Fechar o modal
await page.click('#btn-mixer-close');
await new Promise((r) => setTimeout(r, 800));

const isMixerClosed = await page.evaluate(() => {
  const modal = document.getElementById('modal-audio-mixer');
  return modal && modal.style.display === 'none';
});
console.log('Mixer fechado com sucesso:', isMixerClosed);

// 3. Testar Câmera Porto / Prainha atualizada
console.log('Clicando em #cam-prainha...');
await page.click('#cam-prainha');
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: path.join(outDir, 'cam_porto_ajustada.png') });

// 4. Testar Câmera Várzea atualizada
console.log('Clicando em #cam-varzea...');
await page.click('#cam-varzea');
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: path.join(outDir, 'cam_varzea_ajustada.png') });

await browser.close();
console.log('Verificação concluída!');
