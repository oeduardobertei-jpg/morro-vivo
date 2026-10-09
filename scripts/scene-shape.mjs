import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  defaultViewport: { width: 1280, height: 720 }
});
const page = await browser.newPage();
await page.goto('http://localhost:5173/?debug', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 8000));
console.log(JSON.stringify(await page.evaluate(() => {
  const s = window.__morro.scene;
  const count = (o) => { let n = 0; o.traverse((x) => { if (x.isMesh) n++; }); return n; };
  const top = {};
  for (const c of s.children) {
    const k = c.type + (c.isMesh ? '' : ':' + (c.children.length > 20 ? 'big' : 'small'));
    top[k] = top[k] || { n: 0, meshes: 0 };
    top[k].n++; top[k].meshes += count(c);
  }
  const big = s.children.filter((c) => !c.isMesh && count(c) > 40).map((c) => ({ type: c.type, name: c.name, meshes: count(c), pos: c.position.toArray().map((v) => +v.toFixed(0)) }));
  return { children: s.children.length, top, big };
}), null, 1));
await browser.close();
