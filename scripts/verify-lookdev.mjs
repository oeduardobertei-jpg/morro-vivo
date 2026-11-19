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

  // 6B. Vista exata do Mirante Imperial -> Sol HDR no Pôr do Sol + Flanco Oeste/NO (replica screenshot #8)
  await setModeAndPhase('bloom', 'sunset');
  await setCam(84, 44, -124, -28, 18, -38);
  await snap('09_mirante_sunset_horizon.png');

  // 6C. Vista exata do Mirante Imperial -> Noite (farol volumétrico, Mirante quente, luzes nos cabos e 0 limbo; replica screenshot #9)
  await setModeAndPhase('bloom', 'night');
  await setCam(84, 44, -124, -28, 18, -38);
  await snap('10_mirante_night_horizon.png');

  // 6D. Flanco Noroeste Extremo à Noite (garante 100% vedação atrás das colinas e turbinas)
  await setCam(45, 58, -88, -140, 8, -175);
  await snap('11_northwest_ridge_night.png');

  // 6E. Close-up Praia: Barraca do Mate, Beto do Mate, Frescobol e banhistas descalços/Havaianas (Dia)
  await setModeAndPhase('bloom', 'day');
  await setCam(-4.2, 4.0, 49.5, -9.8, 2.0, 42.8);
  await snap('12_beach_stall_barraqueiro_closeup.png');

  // 6F. Close-up Expansão Oeste: Horta Agroecológica (Dona Nair + Espantalho) & Capoeira (Mestre Bimba) (Dia)
  await setCam(-84.5, 8.2, -32.5, -100.5, 3.2, -19.5);
  await snap('13_capoeira_horta_closeup.png');

  // 6G. Close-up Noturno: Roda de Samba, Tião do Cavaco, pandeiro e foliões na Praça Central (Noite)
  await setModeAndPhase('bloom', 'night');
  await new Promise((r) => setTimeout(r, 2500));
  const plazaY = await page.evaluate(() => window.__morro?.npcs?.getFloorElevation(-2, -4) ?? 26.0);
  await setCam(-12.5, plazaY + 9.5, 6.5, -1.5, plazaY + 1.0, -4.0);
  await snap('14_samba_night_npcs_closeup.png');

  // 6H. Panorâmica Aérea Continental Equilibrada — Sprint 8 (Dia)
  await setModeAndPhase('bloom', 'day');
  await setCam(0, 145, 225, 0, 10, -45);
  await snap('15_continental_aerial_balance_day.png');

  // 6I. Vale do Poente & Capela Caiçara do Pontal (Dia)
  await setCam(-182, 24, 24, -214, 7, -14);
  await snap('16_vale_poente_capela_day.png');

  // 6J. Vale do Levante & Praça da Bocha / Chafariz (Dia)
  await setCam(182, 24, 24, 214, 7, -14);
  await snap('17_vale_levante_praca_sela_day.png');

  // 6K. Sela Norte: Anfiteatro de Pedra, Sítio Agroecológico & Circuito (Pôr do Sol)
  await setModeAndPhase('bloom', 'sunset');
  await setCam(4, 42, -134, -22, 24, -162);
  await snap('18_sela_norte_anfiteatro_sunset.png');

  // 6L. Pets do Morro: Cachorro Caramelo & Gato na Laje (Dia)
  await setModeAndPhase('bloom', 'day');
  const petCamData = await page.evaluate(() => {
    const m = window.__morro;
    const pets = m?.pets?.pets || [];
    const houses = (m?.architecture || m?.arch)?.houses || [];
    const caramelo = pets[0];
    let dogCam = null;
    if (caramelo) {
      m.pets.petAnimal(caramelo);
      const p = caramelo.group.position;
      let bestOffset = { dx: 3.6, dz: 3.8 };
      for (const ang of [0.6, 1.4, -0.6, 2.3, -1.6, 3.0]) {
        const dx = Math.sin(ang) * 4.4;
        const dz = Math.cos(ang) * 4.4;
        const cx = p.x + dx;
        const cz = p.z + dz;
        const blocked = houses.some((h) => {
          const hp = h.position || h.meshGroup?.position;
          return hp && Math.hypot(cx - hp.x, cz - hp.z) < 4.5;
        });
        if (!blocked) {
          bestOffset = { dx, dz };
          break;
        }
      }
      dogCam = {
        cx: p.x + bestOffset.dx,
        cy: p.y + 2.35,
        cz: p.z + bestOffset.dz,
        tx: p.x,
        ty: p.y + 0.35,
        tz: p.z
      };
    }
    const roofCat = pets.find((pt) => pt.isRooftop) || pets.find((pt) => pt.species === 'cat');
    let catCam = null;
    if (roofCat) {
      const p = roofCat.group.position;
      const rotY = roofCat.rooftopHouse?.meshGroup?.rotation?.y || 0;
      const fx = Math.sin(rotY);
      const fz = Math.cos(rotY);
      catCam = {
        cx: p.x + fx * 3.8 + fz * 1.4,
        cy: p.y + 1.85,
        cz: p.z + fz * 3.8 - fx * 1.4,
        tx: p.x,
        ty: p.y + 0.25,
        tz: p.z
      };
    }
    return { dogCam, catCam };
  });
  if (petCamData?.dogCam) {
    const d = petCamData.dogCam;
    await setCam(d.cx, d.cy, d.cz, d.tx, d.ty, d.tz);
    await snap('19_pets_caramelo_closeup.png');
  }
  if (petCamData?.catCam) {
    const c = petCamData.catCam;
    await setCam(c.cx, c.cy, c.cz, c.tx, c.ty, c.tz);
    await snap('20_pets_cat_rooftop_closeup.png');
  }

  // 6M. Showcase Lofi Rio HUD (Dia em repouso, Pôr do Sol + Mixer ancorado, Noite + Mirantes)
  await page.evaluate(() => {
    const m = window.__morro;
    if (m.perf) {
      m.perf.visible = false;
      m.perf.render();
    }
    document.querySelectorAll('.lil-gui').forEach((g) => {
      g.dataset.prevDisplay = g.style.display;
      g.style.display = 'none';
    });
    document.getElementById('hud-whisper')?.classList.remove('visible');
    document.getElementById('inspector-card')?.classList.remove('visible');
  });

  await setModeAndPhase('bloom', 'day');
  await page.evaluate(() => {
    document.getElementById('hud-whisper')?.classList.remove('visible');
  });
  await setCam(-58, 62, 138, 0, 14, -22);
  await snap('21_hud_lofi_day_resting.png');

  await setModeAndPhase('bloom', 'sunset');
  await setCam(-55, 22, 112, -78, 1.5, 62);
  await page.evaluate(async () => {
    const m = window.__morro;
    if (m.soundtrack) {
      m.soundtrack.init();
      if (m.soundtrack.ctx?.state === 'suspended') await m.soundtrack.ctx.resume().catch(() => {});
      m.soundtrack.play();
    }
    document.getElementById('pop-mixer')?.showPopover?.();
  });
  await new Promise((r) => setTimeout(r, 550));
  await snap('22_hud_lofi_sunset_mixer.png');

  await page.evaluate(() => {
    const pmx = document.getElementById('pop-mixer');
    try { if (pmx?.matches(':popover-open')) pmx.hidePopover(); } catch {}
  });
  await setModeAndPhase('bloom', 'night');
  await setCam(-45, 42, 108, 0, 8, -10);
  await page.evaluate(() => {
    document.getElementById('pop-cameras')?.showPopover?.();
  });
  await new Promise((r) => setTimeout(r, 450));
  await snap('23_hud_lofi_night_cameras.png');

  await page.evaluate(() => {
    const m = window.__morro;
    const pcam = document.getElementById('pop-cameras');
    try { if (pcam?.matches(':popover-open')) pcam.hidePopover(); } catch {}
    if (m.perf) {
      m.perf.visible = true;
      m.perf.render();
    }
    document.querySelectorAll('.lil-gui').forEach((g) => {
      g.style.display = g.dataset.prevDisplay ?? '';
    });
  });

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
  await setModeAndPhase('maquete', 'day');
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
    const rA = { ...m.renderer.info.render };
    await new Promise((r) => requestAnimationFrame(r));
    const rB = { ...m.renderer.info.render };
    const maqueteRenderInfo = rB.calls < rA.calls ? rB : rA;

    m.postFX.setMode('bloom');
    await new Promise((r) => setTimeout(r, 1500));
    const fpsStudioFX = await countFrames(2000);

    let pointLightCount = 0;
    m.scene.traverse((o) => { if (o.isPointLight) pointLightCount++; });

    // Auditoria automática de colisão, flutuação e posicionamento especial dos NPCs
    const arch = m.architecture || m.arch;
    const houses = (arch && arch.houses) || [];
    const props = (arch && arch.propObstacles) || [];
    const npcs = (m.npcs && m.npcs.npcs) || [];
    const insideHouse = [];
    const insideProp = [];
    const floating = [];
    let maxGroundErr = 0;
    let donaNairDistToScarecrow = null;
    let jonasDistToBars = null;

    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      if (!npc || !npc.group) continue;
      const p = npc.group.position;
      const label = npc.citizenName || npc.role || `npc_${i}`;

      if (npc.isHorta) {
        donaNairDistToScarecrow = Number(Math.hypot(p.x - (-92.0), p.z - (-25.0)).toFixed(3));
      }
      if (npc.isCalistenia) {
        jonasDistToBars = Number(Math.hypot(p.x - 114.4, p.z - (-10.8)).toFixed(3));
      }

      const skipObstacleAudit =
        npc.isSitting || npc.isBeachSeated || npc.isScenicMirante || npc.isBarraqueiro ||
        npc.isFisherman || npc.isAthlete || npc.isCapoeira || npc.isHorta ||
        npc.isMototaxi || npc.isSurfer || npc.isCalistenia || npc.role === 'Jogador da Pelada' ||
        (npc.sambaState && npc.sambaState.isActive) ||
        (npc.beachState && (npc.beachState.mode === 'swimming_chest' || npc.beachState.mode === 'to_swimming' || npc.beachState.mode === 'exiting_water'));

      if (!skipObstacleAudit) {
        for (let h = 0; h < houses.length; h++) {
          const hs = houses[h];
          const dy = Math.abs(p.y - hs.position.y);
          const distH = Math.hypot(p.x - hs.position.x, p.z - hs.position.z);
          if (dy < 3.2 && distH < 1.80) {
            insideHouse.push({ label, distH: Number(distH.toFixed(2)), x: Number(p.x.toFixed(1)), z: Number(p.z.toFixed(1)) });
            break;
          }
        }

        for (let k = 0; k < props.length; k++) {
          const ob = props[k];
          if (ob.ignoreRoles && ob.ignoreRoles.includes(npc.role)) continue;
          if (ob.r !== undefined) {
            const dProp = Math.hypot(p.x - ob.x, p.z - ob.z);
            if (dProp < ob.r - 0.14) {
              insideProp.push({ label, dProp: Number(dProp.toFixed(2)), r: ob.r });
              break;
            }
          } else if (ob.hw !== undefined && ob.hd !== undefined) {
            const dx = p.x - ob.x;
            const dz = p.z - ob.z;
            const cos = Math.cos(ob.rotY || 0);
            const sin = Math.sin(ob.rotY || 0);
            const lx = dx * cos - dz * sin;
            const lz = dx * sin + dz * cos;
            if (Math.abs(lx) < ob.hw - 0.14 && Math.abs(lz) < ob.hd - 0.14) {
              insideProp.push({ label, lx: Number(lx.toFixed(2)), lz: Number(lz.toFixed(2)), hw: ob.hw, hd: ob.hd });
              break;
            }
          }
        }
      }

      const skipGroundAudit =
        npc.builderState === 'celebrating' || npc.isScenicMirante || npc.isSitting ||
        npc.isBeachCustomY || npc.isBeachSeated || npc.isBarraqueiro || npc.isAthlete ||
        npc.isCalistenia || npc.role === 'Jogador da Pelada' ||
        (npc.sambaState && npc.sambaState.isActive && npc.sambaState.slotIndex < 10) ||
        (npc.beachState && (npc.beachState.mode === 'swimming_chest' || npc.beachState.mode === 'to_swimming' || npc.beachState.mode === 'exiting_water'));

      if (!skipGroundAudit && m.npcs && m.npcs.getFloorElevation) {
        const expectedY = m.npcs.getFloorElevation(p.x, p.z);
        const err = Math.abs(p.y - expectedY);
        if (err > maxGroundErr) maxGroundErr = err;
        if (err > 0.12) {
          floating.push({ label, y: Number(p.y.toFixed(2)), expectedY: Number(expectedY.toFixed(2)), err: Number(err.toFixed(2)) });
        }
      }
    }

    const npcAudit = {
      totalNPCs: npcs.length,
      insideHouseCount: insideHouse.length,
      insidePropCount: insideProp.length,
      floatingCount: floating.length,
      maxGroundErr: Number(maxGroundErr.toFixed(3)),
      donaNairDistToScarecrow,
      jonasDistToBars,
      samples: {
        insideHouse: insideHouse.slice(0, 5),
        insideProp: insideProp.slice(0, 5),
        floating: floating.slice(0, 5)
      },
      ok: (
        insideHouse.length === 0 &&
        insideProp.length === 0 &&
        floating.length === 0 &&
        (donaNairDistToScarecrow === null || donaNairDistToScarecrow >= 1.4) &&
        (jonasDistToBars === null || jonasDistToBars <= 0.5)
      )
    };

    // Auditoria espacial de ocupação policêntrica (Sprint 8)
    let housesWestWing = 0;
    let housesEastWing = 0;
    let housesNorthSela = 0;
    let houseOverlapCount = 0;
    for (let i = 0; i < houses.length; i++) {
      const p1 = houses[i].position;
      if (p1.x < -120) housesWestWing++;
      if (p1.x > 120) housesEastWing++;
      if (p1.z < -115) housesNorthSela++;
      for (let j = i + 1; j < houses.length; j++) {
        const p2 = houses[j].position;
        if (Math.hypot(p1.x - p2.x, p1.z - p2.z) < 6.5) houseOverlapCount++;
      }
    }
    const spatialAudit = {
      housesTotal: houses.length,
      housesWestWing,
      housesEastWing,
      housesNorthSela,
      houseOverlapCount,
      ok: (
        houses.length >= 48 &&
        housesWestWing >= 8 &&
        housesEastWing >= 8 &&
        housesNorthSela >= 6 &&
        houseOverlapCount === 0
      )
    };

    const petList = m.pets?.pets || [];
    const dogs = petList.filter((p) => p.species === 'dog');
    const cats = petList.filter((p) => p.species === 'cat');
    const rooftopCats = cats.filter((p) => p.isRooftop);
    const groundPets = petList.filter((p) => !p.isRooftop);

    let floatingGroundPets = 0;
    let insideHouseGroundPets = 0;
    const petSamples = [];

    for (const pet of groundPets) {
      const px = pet.group.position.x;
      const py = pet.group.position.y;
      const pz = pet.group.position.z;
      const floorY = m.npcs?.getFloorElevation ? m.npcs.getFloorElevation(px, pz) : py;
      const dy = Math.abs(py - floorY);
      if (dy > 0.25) floatingGroundPets++;

      let insideHouse = false;
      for (const h of houses) {
        const hp = h.position || h.meshGroup?.position;
        if (!hp) continue;
        const rot = h.meshGroup ? h.meshGroup.rotation.y : 0;
        const dx = px - hp.x;
        const dz = pz - hp.z;
        const cos = Math.cos(-rot);
        const sin = Math.sin(-rot);
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;
        const hw = (h.footprintW || h.width || 3.4) * 0.5;
        const hd = (h.footprintD || h.depth || 3.4) * 0.5;
        if (Math.abs(lx) < hw - 0.25 && Math.abs(lz) < hd - 0.25) {
          insideHouse = true;
          break;
        }
      }
      if (insideHouse) insideHouseGroundPets++;

      if (petSamples.length < 5) {
        petSamples.push({
          id: pet.id,
          name: pet.name,
          species: pet.species,
          dy: Number(dy.toFixed(3)),
          insideHouse
        });
      }
    }

    for (const rCat of rooftopCats) {
      petSamples.push({
        id: rCat.id,
        name: rCat.name,
        species: rCat.species,
        isRooftop: true,
        hasHouse: Boolean(rCat.rooftopHouse),
        roofStyle: rCat.rooftopHouse?.roofStyle || null,
        y: Number(rCat.group.position.y.toFixed(2)),
        lajeTopY: rCat.rooftopHouse?.lajeTopY != null ? Number(rCat.rooftopHouse.lajeTopY.toFixed(2)) : null
      });
    }

    let petInteractOk = false;
    if (m.pets && petList.length > 0) {
      const targetPet = petList[0];
      const beforeCuddles = targetPet.cuddles || 0;
      const res = m.pets.petAnimal(targetPet);
      petInteractOk = Boolean(
        res &&
        (targetPet.cuddles || 0) > beforeCuddles &&
        (targetPet.joyTimer || 0) > 0
      );
    }

    const petAudit = {
      totalPets: petList.length,
      dogsCount: dogs.length,
      catsCount: cats.length,
      rooftopCatsCount: rooftopCats.length,
      floatingGroundPets,
      insideHouseGroundPets,
      petInteractOk,
      samples: petSamples,
      ok: (
        petList.length === 13 &&
        dogs.length === 7 &&
        cats.length === 6 &&
        rooftopCats.length === 3 &&
        floatingGroundPets === 0 &&
        insideHouseGroundPets === 0 &&
        petInteractOk
      )
    };

    // Auditoria do novo HUD Lofi Rio
    const hasLegacyBars = Boolean(document.querySelector('.top-bar, .bottom-bar, .news-ticker'));
    const dockEl = document.querySelector('.hud-dock');
    const dockRect = dockEl ? dockEl.getBoundingClientRect() : null;
    const dockFitsViewport = Boolean(
      dockRect &&
      dockRect.width > 420 &&
      dockRect.width < 940 &&
      dockRect.bottom <= 720
    );
    const dayTxt = document.getElementById('day-counter')?.innerText?.trim() || '';
    const clockTxt = document.getElementById('hud-clock')?.innerText?.trim() || '';
    const popTxt = document.getElementById('val-pop')?.innerText?.trim() || '';
    const wealthTxt = document.getElementById('val-wealth')?.innerText?.trim() || '';
    const topLeftClean = Boolean(dayTxt && clockTxt.includes(':') && popTxt && wealthTxt.includes('R$'));

    let popoversOk = false;
    try {
      const pMix = document.getElementById('pop-mixer');
      const pCam = document.getElementById('pop-cameras');
      if (pMix && pCam && typeof pMix.showPopover === 'function') {
        pMix.showPopover();
        const mixOpen = pMix.matches(':popover-open');
        pMix.hidePopover();
        pCam.showPopover();
        const camOpen = pCam.matches(':popover-open');
        pCam.hidePopover();
        popoversOk = Boolean(mixOpen && camOpen && !pCam.matches(':popover-open'));
      }
    } catch {
      popoversOk = false;
    }

    let dialogOk = false;
    try {
      const dlg = document.getElementById('modal-politics');
      if (dlg && typeof dlg.showModal === 'function') {
        dlg.showModal();
        const opened = dlg.open === true;
        dlg.close();
        dialogOk = Boolean(opened && dlg.open === false);
      }
    } catch {
      dialogOk = false;
    }

    let zenModeOk = false;
    try {
      const restoreBtn = document.getElementById('btn-zen-restore');
      document.body.classList.add('ui-off');
      const visibleWhenZen = restoreBtn ? getComputedStyle(restoreBtn).display !== 'none' : false;
      document.body.classList.remove('ui-off');
      const hiddenAfterRestore = restoreBtn ? getComputedStyle(restoreBtn).display === 'none' : false;
      zenModeOk = Boolean(visibleWhenZen && hiddenAfterRestore);
    } catch {
      zenModeOk = false;
    }

    const phaseSyncOk = document.body.dataset.phase === m.env.currentPhase;

    const hudAudit = {
      hasLegacyBars,
      dockWidth: dockRect ? Math.round(dockRect.width) : 0,
      dockFitsViewport,
      topLeftClean,
      popoversOk,
      dialogOk,
      zenModeOk,
      phaseSyncOk,
      ok: (
        !hasLegacyBars &&
        dockFitsViewport &&
        topLeftClean &&
        popoversOk &&
        dialogOk &&
        zenModeOk &&
        phaseSyncOk
      )
    };

    return {
      fpsMaquete: Number(fpsMaquete.toFixed(1)),
      fpsStudioFX: Number(fpsStudioFX.toFixed(1)),
      maqueteRenderInfo,
      pointLightCount,
      npcAudit,
      spatialAudit,
      petAudit,
      hudAudit,
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
  if (errors.length > 0 || !metrics.npcAudit?.ok || !metrics.spatialAudit?.ok || !metrics.petAudit?.ok || !metrics.hudAudit?.ok) process.exitCode = 1;
} finally {
  await browser.close();
}

