import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { Terrain } from './world/Terrain.js';
import { Environment } from './world/Environment.js';
import { Architecture } from './world/Architecture.js';
import { NPCManager } from './world/NPCs.js';
import { SimulationEngine } from './simulation/Simulation.js';
import { AmbientSoundtrack } from './audio/Soundtrack.js';
import { SaveSystem } from './simulation/SaveSystem.js';
import { CinematicCamera } from './camera/CinematicCamera.js';

// Setup Three.js WebGL Scene
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.5,
  800
);

// Initial cinematic camera framing the whole continental territory
camera.position.set(-60, 55, 125);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 15;
controls.maxDistance = 550;
controls.target.set(0, 10, -15);

// Cinematic Camera Controller
const cinematicCam = new CinematicCamera(camera, controls);

// Check for persistent save data
const savedGameData = SaveSystem.load();

// Initialize Game Systems
const env = new Environment(scene);
const terrain = new Terrain(scene);
const architecture = new Architecture(scene, env, terrain);

// Rehydrate saved houses or start humble 8-house pioneer settlement
if (savedGameData && savedGameData.activeHouses && savedGameData.activeHouses.length > 0) {
  architecture.createInitialSettlements(terrain.plateaus, savedGameData.activeHouses);
} else {
  architecture.createInitialSettlements(terrain.plateaus, null);
}

const npcs = new NPCManager(scene, terrain, architecture);
npcs.setEnvironment(env);
npcs.spawnInitialPopulation();
architecture.setNPCManager(npcs);

const simulation = new SimulationEngine(architecture, npcs, savedGameData);
const soundtrack = new AmbientSoundtrack();
soundtrack.setCamera(camera, controls);
architecture.setSoundtrack(soundtrack);
npcs.setSoundtrack(soundtrack);
npcs.setSimulation(simulation);

// Unblock browser Web Audio autoplay policy on any user interaction (pointerdown, wheel, click, keydown)
const unlockAudio = () => {
  soundtrack.resumeContext();
};
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('wheel', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio, { passive: true });

// Wire soccer goal celebration callback from the pitch
architecture.onSoccerGoal = (teamName, score) => {
  simulation.addEvent(`⚽ GOLAÇO no Campinho da Várzea! O time ${teamName} balançou as redes! Placar: Amarelo ${score.yellow} x ${score.blue} Azul!`, 'culture');
  simulation.performAutoSave();
};

// Raycaster for object picking / inspecting (Houses & Citizens)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
  // Ignore clicks on UI elements
  if (event.target.closest('#ui-overlay') && !event.target.closest('#canvas-container')) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // 1. Check intersection with Citizens / NPCs
  const npcMeshes = [];
  npcs.npcs.forEach(n => {
    n.group.traverse(child => {
      if (child.isMesh) {
        child.userData.npcRef = n;
        npcMeshes.push(child);
      }
    });
  });

  const npcIntersects = raycaster.intersectObjects(npcMeshes);
  if (npcIntersects.length > 0) {
    const npc = npcIntersects[0].object.userData.npcRef;
    if (npc) {
      showCitizenInspector(npc);
      return;
    }
  }

  // 2. Check intersection with houses
  const houseMeshes = [];
  architecture.houses.forEach(h => {
    h.meshGroup.traverse(child => {
      if (child.isMesh) {
        child.userData.houseRef = h;
        houseMeshes.push(child);
      }
    });
  });

  const intersects = raycaster.intersectObjects(houseMeshes);
  if (intersects.length > 0) {
    const house = intersects[0].object.userData.houseRef;
    if (house) {
      showInspector(house);
    }
  }
});

// Inspector UI logic
const inspectorCard = document.getElementById('inspector-card');
const inspectorContent = document.getElementById('inspector-content');
const inspectorClose = document.getElementById('inspector-close');

function showInspector(house) {
  const factionNames = {
    prainha: 'Porto & Prainha (Oeste)',
    sol: 'Morro do Sol (Centro)',
    serra: 'Alto da Serra (Norte)',
    varzea: 'Polo da Várzea (Leste)'
  };

  const levelLabels = {
    1: 'Pavimento Térreo (Início)',
    2: 'Sobrado com Puxadinho',
    3: 'Laje Completa com Caixa D\'Água & Churrasqueira'
  };

  inspectorContent.innerHTML = `
    <h3 style="font-family: var(--font-title); font-size: 1.15rem; color: #FFF; margin-bottom: 0.4rem;">
      🏠 Casa na Encosta (${house.colorName})
    </h3>
    <div style="font-size: 0.8rem; color: var(--color-gold); margin-bottom: 0.6rem; font-weight: 700;">
      Bairro: ${factionNames[house.faction] || 'Comunidade'}
    </div>
    <div style="font-size: 0.82rem; line-height: 1.6; color: var(--color-text-dim);">
      <div>• <strong>Estrutura:</strong> ${levelLabels[house.level] || 'Laje'}</div>
      <div>• <strong>Moradores:</strong> ${house.residents} pessoas</div>
      <div>• <strong>Economia da Casa:</strong> R$ ${house.wealth}</div>
      <div>• <strong>Água na Caixa:</strong> ${house.waterLevel}%</div>
    </div>
    <div style="margin-top: 0.8rem;">
      <button id="btn-upgrade-this" class="btn-icon" style="width: 100%; justify-content: center; background: var(--color-primary);">
        🏗️ Financiar Novo Andar (+R$ 30)
      </button>
    </div>
  `;

  inspectorCard.classList.add('visible');

  const btnUpgrade = document.getElementById('btn-upgrade-this');
  if (btnUpgrade) {
    btnUpgrade.onclick = () => {
      const ok = architecture.upgradeHouse(house.id);
      if (ok) {
        simulation.addEvent(`🎉 Obra concluída! A casa em ${factionNames[house.faction]} expandiu organicamente!`, 'build');
        simulation.performAutoSave();
        showInspector(house);
      } else {
        simulation.addEvent(`A casa já atingiu a altura máxima permitida pelas normas comunitárias!`, 'info');
      }
    };
  }
}

function showCitizenInspector(npc) {
  const teamLabel = npc.team ? `(${npc.team === 'yellow' ? 'Time Amarelo Canário' : 'Time Azul Guanabara'})` : '';
  const statusLabel = npc.isCourier
    ? '🚚 Transportando tijolos da Olaria'
    : (npc.isBuilder ? '👷 Trabalhando no canteiro de obras' : '🚶 Convivência comunitária');

  inspectorContent.innerHTML = `
    <h3 style="font-family: var(--font-title); font-size: 1.15rem; color: #FFF; margin-bottom: 0.4rem;">
      👤 ${npc.citizenName}
    </h3>
    <div style="font-size: 0.8rem; color: var(--color-gold); margin-bottom: 0.6rem; font-weight: 700;">
      Função: ${npc.role} ${teamLabel}
    </div>
    <div style="font-size: 0.82rem; line-height: 1.6; color: var(--color-text-dim);">
      <div>• <strong>Ocupação Atual:</strong> ${npc.currentAction}</div>
      <div>• <strong>Rotina:</strong> ${statusLabel}</div>
      <div>• <strong>Acesso à Água Potável:</strong> 100%</div>
      <div>• <strong>Energia Solar:</strong> 100%</div>
      <div>• <strong>Disposição & Alegria:</strong> 98%</div>
    </div>
    <div style="margin-top: 0.8rem;">
      <button id="btn-focus-citizen" class="btn-icon" style="width: 100%; justify-content: center; background: var(--color-primary);">
        🎥 Acompanhar Cidadão
      </button>
    </div>
  `;

  inspectorCard.classList.add('visible');

  const btnFocus = document.getElementById('btn-focus-citizen');
  if (btnFocus) {
    btnFocus.onclick = () => {
      const p = npc.group.position;
      animateCameraTo(
        new THREE.Vector3(p.x - 6, p.y + 6, p.z + 10),
        new THREE.Vector3(p.x, p.y + 1, p.z)
      );
    };
  }
}

inspectorClose.onclick = () => {
  inspectorCard.classList.remove('visible');
};

// UI Element Bindings
const valPop = document.getElementById('val-pop');
const valWealth = document.getElementById('val-wealth');
const valWater = document.getElementById('val-water');
const valEnergy = document.getElementById('val-energy');
const valCulture = document.getElementById('val-culture');
const dayCounter = document.getElementById('day-counter');
const tickerText = document.getElementById('ticker-text');

const prainhaHarmony = document.getElementById('prainha-harmony');
const solHarmony = document.getElementById('sol-harmony');
const serraHarmony = document.getElementById('serra-harmony');
const varzeaHarmony = document.getElementById('varzea-harmony');

// Hook simulation updates
simulation.onUpdate((summary) => {
  valPop.innerText = summary.metrics.population;
  valWealth.innerText = `R$ ${summary.metrics.wealth}`;
  valWater.innerText = `${summary.metrics.water}%`;
  valEnergy.innerText = `${summary.metrics.energy}%`;
  valCulture.innerText = `${summary.metrics.culture}%`;
  dayCounter.innerText = `DIA ${summary.day}`;

  if (prainhaHarmony && summary.factions.prainha) prainhaHarmony.innerText = `${summary.factions.prainha.harmony}%`;
  if (solHarmony && summary.factions.sol) solHarmony.innerText = `${summary.factions.sol.harmony}%`;
  if (serraHarmony && summary.factions.serra) serraHarmony.innerText = `${summary.factions.serra.harmony}%`;
  if (varzeaHarmony && summary.factions.varzea) varzeaHarmony.innerText = `${summary.factions.varzea.harmony}%`;

  if (summary.feed.length > 0) {
    tickerText.innerText = summary.feed[0].text;
  }
});

// Action Buttons
document.getElementById('act-puxadinho').onclick = () => {
  const eligible = architecture.houses.filter(h => h.level < 3);
  if (eligible.length > 0) {
    const lucky = eligible[Math.floor(Math.random() * eligible.length)];
    architecture.upgradeHouse(lucky.id);
    simulation.addEvent(`🏗️ Você incentivou a construção! Um novo puxadinho foi levantado!`, 'player');
    simulation.performAutoSave();
  }
};

document.getElementById('act-samba').onclick = () => {
  simulation.triggerPlayerSamba();
};

document.getElementById('act-water').onclick = () => {
  simulation.triggerPlayerWater();
};

document.getElementById('act-solar').onclick = () => {
  simulation.triggerPlayerSolar();
};

const actFrontier = document.getElementById('act-frontier');
if (actFrontier) {
  actFrontier.onclick = () => {
    // Spur frontier colonization: spawn a house in the red zone frontier plateaus (West, East, Ridge)
    const frontierPlateaus = architecture.allPlateaus.filter(p => Math.abs(p.x) >= 38 || p.z <= -48);
    const builtIds = new Set(architecture.houses.map(h => h.id));
    const constructingIds = new Set(architecture.activeConstructions.map(c => c.id));
    const available = frontierPlateaus.filter(p => !builtIds.has(p.id) && !constructingIds.has(p.id));

    if (available.length > 0) {
      // Prioritize the furthest unbuilt frontier lots
      const sorted = available.slice().sort((a, b) => (Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z)));
      const targetPlateau = sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
      architecture.spawnNewHouse(targetPlateau.faction, null, targetPlateau);
      const districtName = targetPlateau.faction === 'prainha' ? 'Colina do Poente (Oeste)'
                         : targetPlateau.faction === 'varzea' ? 'Encostas do Levante (Leste)'
                         : 'Crista do Cume (Norte)';
      simulation.addEvent(`⛰️ Mutirão da Fronteira! Pedreiros iniciaram terraplanagem no lote ${targetPlateau.id} em ${districtName}!`, 'player');
    } else {
      simulation.addEvent(`⛰️ Toda a fronteira do Cinturão e Cume está plenamente consolidada e povoada!`, 'culture');
    }
    simulation.performAutoSave();
  };
}

// Save & New World Controls
const btnSave = document.getElementById('btn-save');
if (btnSave) {
  btnSave.onclick = () => {
    simulation.performAutoSave();
  };
}

const btnNewWorld = document.getElementById('btn-new-world');
const modalNewWorld = document.getElementById('modal-new-world');
const modalConfirmReset = document.getElementById('modal-confirm-reset');
const modalCancelReset = document.getElementById('modal-cancel-reset');

if (btnNewWorld && modalNewWorld) {
  btnNewWorld.onclick = () => {
    modalNewWorld.style.display = 'flex';
  };

  modalCancelReset.onclick = () => {
    modalNewWorld.style.display = 'none';
  };

  modalConfirmReset.onclick = () => {
    simulation.resetToNewWorld();
    modalNewWorld.style.display = 'none';
  };
}

// Camera Presets & Cinematic Mode Controller
const cameraPresets = {
  pan: { pos: new THREE.Vector3(-65, 68, 145), target: new THREE.Vector3(0, 10, -35), name: 'Panorâmica Continental' },
  prainha: { pos: new THREE.Vector3(-115, 36, 65), target: new THREE.Vector3(-85, 8, -25), name: 'Distrito Poente & Falésias' },
  morro: { pos: new THREE.Vector3(-18, 28, 35), target: new THREE.Vector3(-2, 10, -4), name: 'Morro do Sol' },
  serra: { pos: new THREE.Vector3(0, 52, -20), target: new THREE.Vector3(0, 16, -68), name: 'Alto da Serra' },
  cume: { pos: new THREE.Vector3(0, 48, -40), target: new THREE.Vector3(0, 14, -98), name: 'Distrito Cume & Alturas' },
  varzea: { pos: new THREE.Vector3(115, 36, 65), target: new THREE.Vector3(85, 8, -25), name: 'Distrito Levante & Vale Verde' }
};

let activePresetKey = 'pan';

const camButtons = {
  pan: document.getElementById('cam-pan'),
  prainha: document.getElementById('cam-prainha'),
  morro: document.getElementById('cam-morro'),
  serra: document.getElementById('cam-serra'),
  cume: document.getElementById('cam-cume'),
  varzea: document.getElementById('cam-varzea')
};

function setActiveCamBtn(activeKey) {
  Object.keys(camButtons).forEach(key => {
    if (camButtons[key]) {
      camButtons[key].classList.toggle('active', key === activeKey);
    }
  });
}

function animateCameraTo(targetPos, lookAtPos) {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  let progress = 0;

  function step() {
    if (cinematicCam.enabled) return; // Yield immediately to cinematic camera if active
    progress += 0.035;
    if (progress <= 1) {
      camera.position.lerpVectors(startPos, targetPos, progress);
      controls.target.lerpVectors(startTarget, lookAtPos, progress);
      requestAnimationFrame(step);
    } else {
      camera.position.copy(targetPos);
      controls.target.copy(lookAtPos);
    }
  }
  step();
}

function selectCameraPreset(key) {
  activePresetKey = key;
  setActiveCamBtn(key);
  cinematicCam.setPreset(key);

  const config = cameraPresets[key];
  if (!cinematicCam.enabled && config) {
    animateCameraTo(config.pos, config.target);
  }
}

Object.keys(camButtons).forEach(key => {
  if (camButtons[key]) {
    camButtons[key].onclick = () => selectCameraPreset(key);
  }
});

// Cinematic Drone Mode Toggle Button
const btnCinema = document.getElementById('cam-cinema-toggle');
const cinemaStatus = document.getElementById('cinema-status');

function toggleCinematicMode() {
  const isEnabled = cinematicCam.toggle();
  if (btnCinema) {
    btnCinema.classList.toggle('active', isEnabled);
  }
  if (cinemaStatus) {
    cinemaStatus.innerText = isEnabled ? 'Ligada' : 'Desligada';
    cinemaStatus.style.color = isEnabled ? '#4ADE80' : 'inherit';
  }

  const presetName = cameraPresets[activePresetKey]?.name || 'Região';
  if (isEnabled) {
    simulation.addEvent(`🎬 Câmera Cinema ativada! Sobrevoando suavemente a região: ${presetName}...`, 'culture');
  } else {
    simulation.addEvent(`🎬 Câmera Cinema desativada. Controle manual restabelecido.`, 'culture');
  }
}

if (btnCinema) {
  btnCinema.onclick = toggleCinematicMode;
}

// Global hotkey: press 'C' to toggle cinematic mode anywhere
window.addEventListener('keydown', (e) => {
  if (e.key === 'c' || e.key === 'C') {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      toggleCinematicMode();
    }
  }
});

// Soundtrack Audio Toggle
const btnAudio = document.getElementById('btn-audio');
const audioLabel = document.getElementById('audio-label');
btnAudio.onclick = () => {
  const isPlaying = soundtrack.toggle();
  if (isPlaying) {
    btnAudio.classList.add('active');
    audioLabel.innerText = 'Tocando';
  } else {
    btnAudio.classList.remove('active');
    audioLabel.innerText = 'Música';
  }
};

// Audio Mixer Modal & Per-Channel Volume Sliders
const btnAudioMixer = document.getElementById('btn-audio-mixer');
const modalAudioMixer = document.getElementById('modal-audio-mixer');
const btnAudioMixerClose = document.getElementById('audio-mixer-close');
const btnMixerClose = document.getElementById('btn-mixer-close');
const btnMixerReset = document.getElementById('btn-mixer-reset');

const mixerSliders = {
  master: { input: document.getElementById('vol-master'), label: document.getElementById('label-vol-master') },
  music: { input: document.getElementById('vol-music'), label: document.getElementById('label-vol-music') },
  construction: { input: document.getElementById('vol-construction'), label: document.getElementById('label-vol-construction') },
  soccer: { input: document.getElementById('vol-soccer'), label: document.getElementById('label-vol-soccer') },
  sea: { input: document.getElementById('vol-sea'), label: document.getElementById('label-vol-sea') },
  sfx: { input: document.getElementById('vol-sfx'), label: document.getElementById('label-vol-sfx') }
};

function syncMixerUI() {
  const vols = soundtrack.getVolumes();
  Object.keys(mixerSliders).forEach(ch => {
    const item = mixerSliders[ch];
    if (item.input && item.label) {
      const val = vols[ch] ?? 50;
      item.input.value = val;
      item.label.innerText = `${val}%`;
    }
  });
}

// Bind live slider input events (real-time Web Audio adjustment!)
Object.keys(mixerSliders).forEach(ch => {
  const item = mixerSliders[ch];
  if (item.input) {
    item.input.oninput = (e) => {
      const val = Number(e.target.value);
      soundtrack.setVolume(ch, val);
      if (item.label) {
        item.label.innerText = `${val}%`;
      }
    };
  }
});

// Reset volumes to balanced defaults
if (btnMixerReset) {
  btnMixerReset.onclick = () => {
    const defaults = { master: 80, music: 65, construction: 45, soccer: 50, sea: 45, sfx: 55 };
    Object.keys(defaults).forEach(ch => {
      soundtrack.setVolume(ch, defaults[ch]);
    });
    syncMixerUI();
    simulation.addEvent('🎚️ Volumes de áudio restaurados para os padrões balanceados.', 'culture');
  };
}

if (btnAudioMixer && modalAudioMixer) {
  btnAudioMixer.onclick = () => {
    syncMixerUI();
    modalAudioMixer.style.display = 'flex';
  };
}

const closeMixer = () => {
  if (modalAudioMixer) modalAudioMixer.style.display = 'none';
};

if (btnAudioMixerClose) btnAudioMixerClose.onclick = closeMixer;
if (btnMixerClose) btnMixerClose.onclick = closeMixer;

if (modalAudioMixer) {
  modalAudioMixer.onclick = (e) => {
    if (e.target === modalAudioMixer) closeMixer();
  };
}

// Close mixer on Esc
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalAudioMixer && modalAudioMixer.style.display === 'flex') {
    closeMixer();
  }
});

// Initial sync of mixer sliders
syncMixerUI();

// Speed Control (1x -> 2x -> 5x)
const btnSpeed = document.getElementById('btn-speed');
const speedLabel = document.getElementById('speed-label');
const speeds = [1, 2, 5];
let speedIdx = 0;

btnSpeed.onclick = () => {
  speedIdx = (speedIdx + 1) % speeds.length;
  const newSpeed = speeds[speedIdx];
  simulation.speed = newSpeed;
  speedLabel.innerText = `${newSpeed}x`;
};

// Dynamic Day/Night Cycle Button & Automatic Phase Updates
const btnTimeCycle = document.getElementById('btn-time-cycle');
const timeIcon = document.getElementById('time-icon');
const timeLabel = document.getElementById('time-label');

const phaseLabels = {
  day: { name: 'Dia Tropical', icon: '☀️' },
  sunset: { name: 'Pôr do Sol', icon: '🌅' },
  night: { name: 'Noite Carioca', icon: '🌙' },
  dawn: { name: 'Alvorecer', icon: '🌄' }
};

if (btnTimeCycle) {
  btnTimeCycle.onclick = () => {
    env.toggleTimeOfDay();
    const cur = env.getTimeOfDay();
    const phaseKey = (typeof cur === 'string') ? cur : (cur.phase || 'day');
    const info = phaseLabels[phaseKey] || phaseLabels.day;
    if (timeIcon) timeIcon.innerText = info.icon;
    if (timeLabel) timeLabel.innerText = info.name;
    simulation.addEvent(`${info.icon} Horário avançado para: ${info.name}!`, 'culture');
  };
}

// Automatically sync top-bar button as continuous cycle progresses smoothly
env.onPhaseChange((cur) => {
  const phaseKey = (typeof cur === 'string') ? cur : (cur.phase || 'day');
  const info = phaseLabels[phaseKey] || phaseLabels.day;
  if (timeIcon) timeIcon.innerText = info.icon;
  if (timeLabel) timeLabel.innerText = info.name;
  if (phaseKey === 'night') {
    simulation.addEvent('🌙 A Noite Carioca começou! As janelas das casas se iluminaram e a roda de samba começou na praça!', 'culture');
  } else if (phaseKey === 'sunset') {
    simulation.addEvent('🌅 Pôr do sol dourado sobre a baía! Pescadores retornam com suas redes.', 'diplomacy');
  } else if (phaseKey === 'dawn') {
    simulation.addEvent('🌄 O alvorecer desponta na colina com céu radiante e ar fresco.', 'info');
  }
});

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Main Animation & Render Loop
const timer = new THREE.Timer();

function animate() {
  requestAnimationFrame(animate);

  timer.update();
  const rawDelta = Math.min(timer.getDelta(), 0.1);
  const simSpeed = simulation.speed || 1;
  const gameDelta = rawDelta * simSpeed;

  // Update camera system: smooth cinematic trajectories or user orbit controls
  if (cinematicCam.enabled) {
    cinematicCam.update(rawDelta);
  } else {
    controls.update();
  }

  // Update subsystems with synchronized simulation speed!
  const envSpeed = simSpeed === 1 ? 1 : Math.min(simSpeed * 0.75, 2.5);
  try {
    env.update(rawDelta * envSpeed);
  } catch (envErr) {
    console.warn('Environment update error:', envErr);
  }

  try {
    architecture.update(gameDelta);
  } catch (archErr) {
    console.warn('Architecture update error:', archErr);
  }

  try {
    npcs.update(gameDelta);
  } catch (npcErr) {
    console.warn('NPCs update error:', npcErr);
  }

  try {
    simulation.update(rawDelta);
  } catch (simErr) {
    console.warn('Simulation update error:', simErr);
  }

  try {
    if (soundtrack && soundtrack.update) {
      soundtrack.update(rawDelta);
    }
  } catch (audioErr) {}

  renderer.render(scene, camera);
}

// Initial simulation notification
simulation.notifyUpdate();

// Start render loop
animate();
