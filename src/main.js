import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { Terrain } from './world/Terrain.js';
import { Environment } from './world/Environment.js';
import { Architecture } from './world/Architecture.js';
import { NPCManager } from './world/NPCs.js';
import { PetManager } from './world/Pets.js';
import { SimulationEngine, ACTION_COSTS } from './simulation/Simulation.js';
import { IDEOLOGIES } from './simulation/PoliticsEngine.js';
import { AmbientSoundtrack } from './audio/Soundtrack.js';
import { SaveSystem } from './simulation/SaveSystem.js';
import { CinematicCamera } from './camera/CinematicCamera.js';
import { PerfMonitor } from './debug/PerfMonitor.js';
import { ContributionCuller } from './render/ContributionCuller.js';
import { AdaptiveQuality } from './render/AdaptiveQuality.js';
import { StaticBatcher } from './render/StaticBatcher.js';
import { FastPicker } from './render/FastPicker.js';
import { PostEffects } from './render/PostEffects.js';
import { updateSharedShaderUniforms } from './render/StylizedMaterials.js';

// Setup Three.js WebGL Scene
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.5,
  2600
);

// Initial cinematic camera framing the whole continental territory
camera.position.set(-60, 55, 125);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
// Shadow map em 20 Hz reduz ~65% dos draw calls de sombra sem impacto visual ao orbitar/mover a câmera!
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 10;
controls.maxDistance = 620;
controls.target.set(0, 10, -15);

// Cinematic Camera Controller
const cinematicCam = new CinematicCamera(camera, controls);

// Check for persistent save data
const savedGameData = SaveSystem.load();

// Initialize Game Systems
const env = new Environment(scene);
env.initIBL(renderer);
const terrain = new Terrain(scene);
env.setTerrain(terrain);
cinematicCam.setTerrain(terrain);
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

const pets = new PetManager(scene, terrain, architecture, npcs);
pets.setEnvironment(env);

const simulation = new SimulationEngine(architecture, npcs, savedGameData);
const soundtrack = new AmbientSoundtrack();
soundtrack.setCamera(camera, controls);
soundtrack.setEnvironment(env);
architecture.setSoundtrack(soundtrack);
npcs.setSoundtrack(soundtrack);
npcs.setSimulation(simulation);
pets.setSoundtrack(soundtrack);
pets.spawnInitialPets();

// Unblock browser Web Audio autoplay policy on any user interaction
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

// Live target tracking state (for following NPCs, Bondinhos, or Mototáxis)
let followTargetGroup = null;
let followOffset = new THREE.Vector3(-6, 5.5, 9);

controls.addEventListener('start', () => {
  // User manually grabbed the camera: release lock on followed target
  followTargetGroup = null;
});

// =========================================================================
// CONTROLE DE CÂMERA PELO TECLADO (W A S D / Setas + Q/E girar + Shift turbo)
// =========================================================================
const camKeys = new Set();
const camVel = new THREE.Vector3();
let camYawVel = 0;
const _camFwd = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3(0, 1, 0);
const _camMove = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _followTargetTmp = new THREE.Vector3();
const _followPosTmp = new THREE.Vector3();

const CAM_KEY_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'
]);

function isTypingInUI(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (isTypingInUI(document.activeElement)) return;
  if (!CAM_KEY_CODES.has(e.code)) return;

  camKeys.add(e.code);
  if (e.code.startsWith('Arrow')) e.preventDefault();

  // Ao mover com teclado, solta trava de follow/cinema imediatamente
  if (e.code !== 'ShiftLeft' && e.code !== 'ShiftRight') {
    followTargetGroup = null;
    if (cinematicCam.enabled && typeof toggleCinematicMode === 'function') {
      toggleCinematicMode();
    }
  }
});

window.addEventListener('keyup', (e) => {
  camKeys.delete(e.code);
});

window.addEventListener('blur', () => {
  camKeys.clear();
  camVel.set(0, 0, 0);
  camYawVel = 0;
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    camKeys.clear();
    camVel.set(0, 0, 0);
    camYawVel = 0;
  }
});

function updateKeyboardCamera(dt) {
  const fwdInput = (camKeys.has('KeyW') || camKeys.has('ArrowUp') ? 1 : 0)
    - (camKeys.has('KeyS') || camKeys.has('ArrowDown') ? 1 : 0);
  const sideInput = (camKeys.has('KeyD') || camKeys.has('ArrowRight') ? 1 : 0)
    - (camKeys.has('KeyA') || camKeys.has('ArrowLeft') ? 1 : 0);
  const yawInput = (camKeys.has('KeyQ') ? 1 : 0) - (camKeys.has('KeyE') ? 1 : 0);

  const hasInput = fwdInput !== 0 || sideInput !== 0 || yawInput !== 0;
  if (!hasInput && camVel.lengthSq() < 1e-4 && Math.abs(camYawVel) < 1e-4) return;

  // Velocidade adaptativa à distância de zoom (precisa no close-up, rápida na panorâmica!)
  const camDist = camera.position.distanceTo(controls.target);
  const boost = (camKeys.has('ShiftLeft') || camKeys.has('ShiftRight')) ? 2.15 : 1.0;
  const maxSpeed = THREE.MathUtils.clamp(camDist * 0.72, 22, 165) * boost;

  camera.getWorldDirection(_camFwd);
  _camFwd.y = 0;
  if (_camFwd.lengthSq() < 1e-6) _camFwd.set(0, 0, -1);
  _camFwd.normalize();
  _camRight.crossVectors(_camFwd, _camUp).normalize();

  _camMove.set(0, 0, 0);
  if (fwdInput !== 0) _camMove.addScaledVector(_camFwd, fwdInput);
  if (sideInput !== 0) _camMove.addScaledVector(_camRight, sideInput);
  if (_camMove.lengthSq() > 1e-6) _camMove.normalize().multiplyScalar(maxSpeed);

  // Inércia suave (acelera e freia como seda)
  const dampLambda = hasInput ? 11.0 : 9.0;
  camVel.x = THREE.MathUtils.damp(camVel.x, _camMove.x, dampLambda, dt);
  camVel.z = THREE.MathUtils.damp(camVel.z, _camMove.z, dampLambda, dt);
  camYawVel = THREE.MathUtils.damp(camYawVel, yawInput * 1.25 * (boost > 1 ? 1.35 : 1.0), 10.0, dt);

  if (Math.abs(camVel.x) > 1e-4 || Math.abs(camVel.z) > 1e-4) {
    const dx = camVel.x * dt;
    const dz = camVel.z * dt;

    const prevX = controls.target.x;
    const prevZ = controls.target.z;
    const nextX = THREE.MathUtils.clamp(prevX + dx, -315, 315);
    const nextZ = THREE.MathUtils.clamp(prevZ + dz, -195, 165);
    const appliedDx = nextX - prevX;
    const appliedDz = nextZ - prevZ;

    controls.target.x = nextX;
    controls.target.z = nextZ;
    camera.position.x += appliedDx;
    camera.position.z += appliedDz;

    // Acompanha suavemente o relevo sob o alvo ao subir/descer entre praia e serra
    if (terrain && typeof terrain.getElevation === 'function') {
      const groundTargetY = Math.max(2.0, terrain.getElevation(nextX, nextZ) + 4.0);
      const nextTargetY = THREE.MathUtils.damp(controls.target.y, groundTargetY, 4.5, dt);
      const dy = nextTargetY - controls.target.y;
      controls.target.y = nextTargetY;
      camera.position.y += dy;
    }
  }

  // Rotação horizontal suave com Q / E em torno do ponto alvo
  if (Math.abs(camYawVel) > 1e-4) {
    _camOffset.subVectors(camera.position, controls.target);
    _camOffset.applyAxisAngle(_camUp, camYawVel * dt);
    camera.position.copy(controls.target).add(_camOffset);
  }
}

// Top-layer dialog/popover animation & light-dismiss helpers (modern-web-guidance)
let _supportsDisplayTransition;
function canTransitionDisplay() {
  if (_supportsDisplayTransition !== undefined) return _supportsDisplayTransition;
  if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  _supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return _supportsDisplayTransition;
}

function supportsTopLayerExit() {
  return Boolean(window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay());
}

async function closeTopLayer(dialogEl) {
  if (!dialogEl || !dialogEl.open) return;
  if (!supportsTopLayerExit()) {
    dialogEl.setAttribute('data-closing', '');
    const animations = dialogEl.getAnimations ? dialogEl.getAnimations({ subtree: true }) : [];
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 400))
      ]);
    }
    if (!dialogEl.hasAttribute('data-closing')) return;
    dialogEl.removeAttribute('data-closing');
  }
  if (dialogEl.open) dialogEl.close();
}

function isPopoverOpen(popEl) {
  if (!popEl) return false;
  try {
    return popEl.matches(':popover-open') || popEl.classList.contains(':popover-open');
  } catch {
    return popEl.classList.contains(':popover-open');
  }
}

function hidePopoverSafe(popEl) {
  if (!popEl) return;
  if (typeof popEl.hidePopover === 'function') {
    if (isPopoverOpen(popEl)) popEl.hidePopover();
  } else {
    popEl.classList.remove(':popover-open');
  }
}

function togglePopoverSafe(popEl) {
  if (!popEl) return;
  if (typeof popEl.togglePopover === 'function') {
    popEl.togglePopover();
  } else {
    popEl.classList.toggle(':popover-open');
  }
}

function syncSliderVisual(slider) {
  if (!slider) return;
  slider.style.setProperty('--attr-min', slider.min || '0');
  slider.style.setProperty('--attr-max', slider.max || '100');
  slider.style.setProperty('--control-value', slider.value);
  slider.setAttribute('aria-valuetext', `${slider.value}%`);
}

if (!('closedBy' in HTMLDialogElement.prototype)) {
  const outsideDialog = (e, dialog) => {
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = outsideDialog(e, dialog);
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && outsideDialog(e, dialog)) closeTopLayer(dialog);
    });
  }
}

// Fast BVH + Sphere Pre-filtered Raycaster for instant object picking (< 0.1ms)
const fastPicker = new FastPicker(camera, architecture, npcs, pets);
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
  // Ignore clicks on UI elements, popovers, dialogs or debug controls
  if (event.target.closest('#ui-overlay, [popover], dialog, .lil-gui')) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  const hit = fastPicker.pick(mouse);
  if (!hit) return;

  if (soundtrack && soundtrack.playUiSelect) {
    soundtrack.playUiSelect(hit.type);
  }
  if (hit.type === 'pet') {
    pets.greetOnSelect(hit.data);
    showPetInspector(hit.data);
  } else if (hit.type === 'npc') {
    showCitizenInspector(hit.data);
  } else if (hit.type === 'mobility') {
    showMobilityInspector(hit.data);
  } else if (hit.type === 'house') {
    showInspector(hit.data);
  }
});

// Inspector UI logic
const inspectorCard = document.getElementById('inspector-card');
const inspectorContent = document.getElementById('inspector-content');
const inspectorClose = document.getElementById('inspector-close');

const factionNames = {
  prainha: 'Porto & Prainha (Oeste)',
  sol: 'Morro do Sol (Centro)',
  serra: 'Alto da Serra (Norte)',
  varzea: 'Polo da Várzea (Leste)'
};

function showInspector(house) {
  const levelLabels = {
    1: 'Pavimento Térreo (Início)',
    2: 'Sobrado com Puxadinho',
    3: 'Laje Completa com Caixa D\'Água & Churrasqueira'
  };

  const canUpgrade = house.level < 3;
  const cost = ACTION_COSTS.houseUpgrade;

  inspectorContent.innerHTML = `
    <h3 class="insp-title">🏠 Casa na Encosta (${house.colorName})</h3>
    <div class="insp-sub">Bairro: ${factionNames[house.faction] || 'Comunidade'}</div>
    <div class="insp-meta">
      <div>• <strong>Estrutura:</strong> ${levelLabels[house.level] || 'Laje'}</div>
      <div>• <strong>Moradores:</strong> ${house.residents} pessoas</div>
      <div>• <strong>Economia da Casa:</strong> R$ ${house.wealth}</div>
      <div>• <strong>Água na Caixa:</strong> ${house.waterLevel}%</div>
    </div>
    <div class="insp-actions">
      <button id="btn-focus-house" type="button" class="insp-btn">
        🎥 Enquadrar esta Moradia
      </button>
      <button id="btn-upgrade-this" type="button" class="insp-btn ${canUpgrade ? 'insp-btn-accent' : ''}">
        ${canUpgrade ? `🏗️ Financiar Novo Andar (R$ ${cost})` : '✅ Altura Máxima Atingida (3 Andares)'}
      </button>
    </div>
  `;

  inspectorCard.classList.add('visible');

  const btnFocusHouse = document.getElementById('btn-focus-house');
  if (btnFocusHouse && house.position) {
    btnFocusHouse.onclick = () => {
      followTargetGroup = null;
      const hx = house.position.x;
      const hy = house.position.y;
      const hz = house.position.z;
      const camX = hx + (hx < 0 ? -14 : 14);
      const camZ = hz + 18;
      const groundH = terrain ? terrain.getElevation(camX, camZ) : hy;
      const camY = Math.max(hy + 11, groundH + 10);
      animateCameraTo(new THREE.Vector3(camX, camY, camZ), new THREE.Vector3(hx, hy + 2.2, hz));
    };
  }

  const btnUpgrade = document.getElementById('btn-upgrade-this');
  if (btnUpgrade && canUpgrade) {
    btnUpgrade.onclick = () => {
      if (!simulation.spendWealth(cost, 'Financiar Puxadinho na Casa')) return;
      const ok = architecture.upgradeHouse(house.id);
      if (ok) {
        if (simulation.politics) simulation.politics.boostIdeology('infra', 2);
        simulation.addEvent(`🎉 Investimento de R$ ${cost}: Equipe de obras iniciou puxadinho na casa em ${factionNames[house.faction]}!`, 'build');
        simulation.performAutoSave();
        showInspector(house);
      } else {
        simulation.globalMetrics.wealth += cost;
        simulation.addEvent(`A casa já está em obras ou atingiu a altura máxima permitida!`, 'info');
      }
    };
  }
}

function showCitizenInspector(npc) {
  const teamLabel = npc.team ? `(${npc.team === 'yellow' ? 'Time Amarelo Canário' : 'Time Azul Guanabara'})` : '';
  const statusLabel = npc.isCourier
    ? '🚚 Transportando tijolos da Olaria'
    : (npc.isBuilder ? '👷 Trabalhando no canteiro de obras' : '🚶 Convivência comunitária');

  const pol = simulation.politics ? simulation.politics.ensureNPCPolitics(npc) : null;
  const ideoInfo = (pol && IDEOLOGIES[pol.ideology]) ? IDEOLOGIES[pol.ideology] : IDEOLOGIES.cultura;
  const votedName = pol ? pol.votedCandidateName : 'Conselho Popular';

  inspectorContent.innerHTML = `
    <h3 class="insp-title">👤 ${npc.citizenName}</h3>
    <div class="insp-sub">Função: ${npc.role} ${teamLabel}</div>
    <div class="insp-meta">
      <div>• <strong>Ocupação:</strong> ${npc.currentAction}</div>
      <div>• <strong>Rotina:</strong> ${statusLabel}</div>
      <div>• <strong>Ideologia:</strong> <span style="color: ${ideoInfo.color}; font-weight: 700;">${ideoInfo.icon} ${ideoInfo.shortName}</span></div>
      <div>• <strong>Voto para Gestor(a):</strong> <strong style="color: var(--hud-gold);">🗳️ ${votedName}</strong></div>
      <div>• <strong>Disposição & Alegria:</strong> 98%</div>
    </div>
    <div class="insp-actions">
      <button id="btn-focus-citizen" type="button" class="insp-btn insp-btn-accent">
        🎥 Seguir Cidadão
      </button>
    </div>
  `;

  inspectorCard.classList.add('visible');

  const btnFocus = document.getElementById('btn-focus-citizen');
  if (btnFocus) {
    btnFocus.onclick = () => {
      followTargetGroup = npc.group;
      followOffset.set(-5.5, 4.8, 8.5);
      const p = npc.group.position;
      animateCameraTo(
        new THREE.Vector3(p.x - 5.5, p.y + 4.8, p.z + 8.5),
        new THREE.Vector3(p.x, p.y + 1, p.z)
      );
    };
  }
}

function showPetInspector(pet) {
  const icon = pet.species === 'dog' ? '🐕' : '🐈';
  const moodText = pet.joyTimer > 0
    ? (pet.species === 'dog' ? 'Super feliz abanando o rabo! 💛' : 'Ronronando feliz da vida! 💚')
    : (pet.isRooftop ? 'Lagarteando tranquilo no sol da laje' : 'Curioso e amigo da comunidade');

  inspectorContent.innerHTML = `
    <h3 class="insp-title">${icon} ${pet.name}</h3>
    <div class="insp-sub">${pet.role} · ${pet.coatName}</div>
    <div class="insp-meta">
      <div>• <strong>Atividade:</strong> <span id="pet-action-val">${pet.currentAction}</span></div>
      <div>• <strong>Humor:</strong> <span id="pet-mood-val">${moodText}</span></div>
      <div>• <strong>Carinhos Recebidos:</strong> <strong id="pet-cuddle-count" style="color: var(--hud-gold);">❤️ ${pet.cuddles || 0}</strong></div>
    </div>
    <div class="insp-actions">
      <div class="insp-actions-row">
        <button id="btn-pet-cuddle" type="button" class="insp-btn insp-btn-warm">
          💛 Fazer Carinho
        </button>
        <button id="btn-focus-pet" type="button" class="insp-btn insp-btn-accent">
          🎥 Seguir Pet
        </button>
      </div>
    </div>
  `;

  inspectorCard.classList.add('visible');

  const btnCuddle = document.getElementById('btn-pet-cuddle');
  if (btnCuddle) {
    btnCuddle.onclick = () => {
      const res = pets.petAnimal(pet);
      if (res && res.grantedHarmony) {
        simulation.globalMetrics.culture = Math.min(100, (simulation.globalMetrics.culture || 90) + 1);
        simulation.notifyUpdate();
        if (pet.cuddles === 1 || pet.cuddles % 3 === 0) {
          simulation.addEvent(`${icon} ${pet.name} (${pet.role}) recebeu carinho e animou a vizinhança (+1% Harmonia)!`, 'culture');
        }
      }
      const cCount = document.getElementById('pet-cuddle-count');
      const aVal = document.getElementById('pet-action-val');
      const mVal = document.getElementById('pet-mood-val');
      if (cCount) cCount.innerText = `❤️ ${pet.cuddles || 0}`;
      if (aVal) aVal.innerText = pet.currentAction;
      if (mVal) mVal.innerText = pet.species === 'dog' ? 'Super feliz abanando o rabo! 💛' : 'Ronronando feliz da vida! 💚';
    };
  }

  const btnFocus = document.getElementById('btn-focus-pet');
  if (btnFocus) {
    btnFocus.onclick = () => {
      followTargetGroup = pet.group;
      followOffset.set(-3.8, 3.2, 5.8);
      const p = pet.group.position;
      animateCameraTo(
        new THREE.Vector3(p.x - 3.8, p.y + 3.2, p.z + 5.8),
        new THREE.Vector3(p.x, p.y + 0.45, p.z)
      );
    };
  }
}

function showMobilityInspector(mob) {
  const isBonde = mob.type === 'cableCar';
  const isBoat = mob.type === 'fishingBoat';
  const icon = isBonde ? '🚡' : isBoat ? '⛵' : '🛵';
  const subtitle = isBonde
    ? 'Teleférico Carioca (3 Estações · Cabo Duplo)'
    : isBoat
    ? `Colônia de Pescadores (${mob.captainName || 'Mestre Caiçara'})`
    : `Cooperativa de Mototáxi (${mob.driverName})`;

  const boatStatusMap = {
    DOCKED: 'Atracado no Cais — Descarregando Pescado & Preparando Redes',
    SAILING_OUT: 'Navegando rumo ao Cardume Avistado em Alto-Mar',
    CASTING_NETS: 'Lançando Rede de Cerco sobre o Cardume',
    FISHING_WAIT: 'Cerco Fechado — Cardume na Rede de Cortiça',
    HAULING_NETS: 'Puxando a Rede Cheia de Peixes Prateados!',
    RETURNING: 'Retornando ao Porto com Caixa de Pescado Cheia'
  };

  const statusText = isBonde
    ? (mob.pauseTimer > 0
        ? 'Portas Abertas — Embarque na Estação'
        : (mob.direction > 0 ? 'Subindo para o Alto da Serra' : 'Descendo para a Orla Carioca'))
    : isBoat
    ? (boatStatusMap[mob.state] || 'Em Expedição Pesqueira na Baía')
    : (mob.pauseTimer > 0 ? 'Parada Rápida — Embarque/Desembarque' : 'Subindo Ladeiras em Trânsito Suave');

  const detailLine = isBonde
    ? `<div>• <strong>Passageiros a Bordo:</strong> ${mob.passengers} moradores (Teto Solar)</div>
       <div>• <strong>Estações:</strong> Orla ↔ Morro do Sol ↔ Alto da Serra</div>`
    : isBoat
    ? `<div>• <strong>Mestre & Tripulação:</strong> ${mob.captainName} (Caiçara Tradicional)</div>
       <div>• <strong>Pescado Acumulado:</strong> ${mob.totalCatches || 0} caixas entregues ao Porto</div>`
    : `<div>• <strong>Piloto Credenciado:</strong> ${mob.driverName} + Passageiro</div>
       <div>• <strong>Velocidade & Inclinação:</strong> Pilotagem Orgânica nas Curvas</div>`;

  inspectorContent.innerHTML = `
    <h3 class="insp-title">${icon} ${mob.name}</h3>
    <div class="insp-sub">${subtitle}</div>
    <div class="insp-meta">
      <div>• <strong>Linha / Trajeto:</strong> ${mob.routeDesc}</div>
      ${detailLine}
      <div>• <strong>Status:</strong> <strong style="color: var(--hud-live);">${statusText}</strong></div>
    </div>
    <div class="insp-actions">
      <button id="btn-focus-mobility" type="button" class="insp-btn insp-btn-accent">
        🎥 Acompanhar ${isBonde ? 'Cabine (Drone)' : isBoat ? 'Barco Pesqueiro' : 'Mototáxi'}
      </button>
      ${isBonde ? `
      <div class="insp-actions-row">
        <button id="btn-bonde-window" type="button" class="insp-btn">
          🪟 Vista Panorâmica
        </button>
        <button id="btn-bonde-next" type="button" class="insp-btn">
          ⏭️ Outra Cabine
        </button>
      </div>
      ` : ''}
    </div>
  `;

  inspectorCard.classList.add('visible');

  const btnFocus = document.getElementById('btn-focus-mobility');
  if (btnFocus) {
    btnFocus.onclick = () => {
      if (cinematicCam.enabled) toggleCinematicMode();
      followTargetGroup = mob.group;
      followOffset.set(10, 4.5, 11);
    };
  }

  const btnWindow = document.getElementById('btn-bonde-window');
  if (btnWindow && isBonde) {
    btnWindow.onclick = () => {
      if (cinematicCam.enabled) toggleCinematicMode();
      followTargetGroup = mob.group;
      followOffset.set(-4.2, 0.4, 4.5);
    };
  }

  const btnNext = document.getElementById('btn-bonde-next');
  if (btnNext && isBonde && architecture.cableCars && architecture.cableCars.length > 0) {
    btnNext.onclick = () => {
      const curIdx = architecture.cableCars.indexOf(mob);
      const nextCar = architecture.cableCars[(curIdx + 1) % architecture.cableCars.length];
      followTargetGroup = nextCar.group;
      showMobilityInspector(nextCar);
    };
  }
}

inspectorClose.onclick = () => {
  inspectorCard.classList.remove('visible');
  followTargetGroup = null;
};

// UI Element Bindings
const valPop = document.getElementById('val-pop');
const valWealth = document.getElementById('val-wealth');
const valWater = document.getElementById('val-water');
const valEnergy = document.getElementById('val-energy');
const valCulture = document.getElementById('val-culture');
const dayCounter = document.getElementById('day-counter');
const tickerText = document.getElementById('ticker-text');
const hudWhisper = document.getElementById('hud-whisper');
const hudFeedList = document.getElementById('hud-feed-list');
const feedUnreadDot = document.getElementById('feed-unread-dot');
const popFeed = document.getElementById('pop-feed');
const popDistricts = document.getElementById('pop-districts');
const popBuild = document.getElementById('pop-build');
const buildTreasuryHint = document.getElementById('build-treasury-hint');

let whisperTimerId = null;
let lastFeedSignature = '';
let isInitialFeedSync = true;

function showWhisper(customText = null) {
  if (!hudWhisper) return;
  if (customText && tickerText) tickerText.innerText = customText;
  hudWhisper.classList.add('visible');
  if (whisperTimerId) clearTimeout(whisperTimerId);
  whisperTimerId = setTimeout(() => {
    hudWhisper.classList.remove('visible');
  }, 6500);
}

const prainhaHarmony = document.getElementById('prainha-harmony');
const solHarmony = document.getElementById('sol-harmony');
const serraHarmony = document.getElementById('serra-harmony');
const varzeaHarmony = document.getElementById('varzea-harmony');

const prainhaLeader = document.getElementById('prainha-leader');
const solLeader = document.getElementById('sol-leader');
const serraLeader = document.getElementById('serra-leader');
const varzeaLeader = document.getElementById('varzea-leader');

const actionButtonsCostMap = [
  { id: 'act-puxadinho', cost: ACTION_COSTS.puxadinho },
  { id: 'act-samba', cost: ACTION_COSTS.samba },
  { id: 'act-water', cost: ACTION_COSTS.water },
  { id: 'act-solar', cost: ACTION_COSTS.solar },
  { id: 'act-frontier', cost: ACTION_COSTS.frontier }
];

// Political Modal Elements & Rendering
const modalPolitics = document.getElementById('modal-politics');
const btnPolitics = document.getElementById('btn-politics');
const btnOpenPoliticsPanel = document.getElementById('btn-open-politics-panel');
const btnPoliticsClose = document.getElementById('politics-modal-close');
const btnRunElectionNow = document.getElementById('btn-run-election-now');
const polMassBars = document.getElementById('pol-mass-bars');
const polTotalVoters = document.getElementById('pol-total-voters');
const polElectionCountdown = document.getElementById('pol-election-countdown');
const polEconomySummary = document.getElementById('pol-economy-summary');
const polCandidatesGrid = document.getElementById('pol-candidates-grid');
const polLogList = document.getElementById('pol-log-list');

let activePoliticsDistrictFilter = 'all';
let lastRenderedElectionCount = -1;
let politicsCardsBuiltForFilter = null;

function renderPoliticsModal(summary, forceFullRebuild = false) {
  if (!summary || !summary.politics || !modalPolitics || !modalPolitics.open) return;
  const pol = summary.politics;
  const inc = summary.lastIncomeBreakdown || { comercioPraia: 12, feiraVarzea: 10, mobilidade: 9, contribuicaoCasas: 10, total: 41 };

  if (polTotalVoters) {
    polTotalVoters.innerText = `${pol.totalVoters} eleitores ativos`;
  }
  if (polElectionCountdown) {
    polElectionCountdown.innerText = `${pol.electionCount}ª Legislatura • Urnas em ${pol.daysUntilElection}d`;
  }

  const needsFullRebuild =
    forceFullRebuild ||
    lastRenderedElectionCount !== pol.electionCount ||
    politicsCardsBuiltForFilter !== activePoliticsDistrictFilter ||
    !polCandidatesGrid.children.length;

  // 1. Render Mass Ideologies Coalition Spectrum + Bars
  if (polMassBars && needsFullRebuild) {
    const spectrumSegments = Object.keys(pol.ideologies).map(k => {
      const info = pol.ideologies[k];
      const pct = pol.massIdeologies[k] || 0;
      return `<div class="coalition-seg" style="width: ${pct}%; background: ${info.color};" title="${info.name}: ${pct}%"></div>`;
    }).join('');

    const barsHtml = Object.keys(pol.ideologies).map(k => {
      const info = pol.ideologies[k];
      const pct = pol.massIdeologies[k] || 0;
      const votersCount = Math.round((pct / 100) * pol.totalVoters);
      return `
        <div class="ideo-bar-row" title="${info.desc}">
          <div class="ideo-bar-header">
            <span>${info.icon} <strong style="color: ${info.color};">${info.name}</strong></span>
            <span data-ideo-stat="${k}"><strong>${pct}%</strong> (${votersCount})</span>
          </div>
          <div class="ideo-bar-track">
            <div class="ideo-bar-fill" data-ideo-fill="${k}" style="width: ${pct}%; background: ${info.color};"></div>
          </div>
        </div>
      `;
    }).join('');

    polMassBars.innerHTML = `<div class="coalition-spectrum-bar">${spectrumSegments}</div>${barsHtml}`;
  } else if (polMassBars) {
    Object.keys(pol.ideologies).forEach(k => {
      const pct = pol.massIdeologies[k] || 0;
      const votersCount = Math.round((pct / 100) * pol.totalVoters);
      const statEl = polMassBars.querySelector(`[data-ideo-stat="${k}"]`);
      const fillEl = polMassBars.querySelector(`[data-ideo-fill="${k}"]`);
      if (statEl) statEl.innerHTML = `<strong>${pct}%</strong> (${votersCount})`;
      if (fillEl) fillEl.style.width = `${pct}%`;
    });
  }

  // 2. Render Economy & Treasury Breakdown
  if (polEconomySummary) {
    polEconomySummary.innerHTML = `
      <div class="treasury-hero-row">
        <span>🪙 Caixa Comunitário</span>
        <strong class="treasury-amount">R$ ${summary.metrics.wealth}</strong>
      </div>
      <div class="treasury-grid-chips">
        <div class="t-chip"><span>🏖️ Orla & Pesca</span><strong>+R$ ${inc.comercioPraia}</strong></div>
        <div class="t-chip"><span>🎪 Feira Várzea</span><strong>+R$ ${inc.feiraVarzea}</strong></div>
        <div class="t-chip"><span>🚡 Bonde & Moto</span><strong>+R$ ${inc.mobilidade}</strong></div>
        <div class="t-chip"><span>🏘️ Moradias</span><strong>+R$ ${inc.contribuicaoCasas}</strong></div>
      </div>
    `;
  }

  // 3. Render Candidate Cards (Only rebuild DOM when filter/election changes; otherwise update in-place!)
  if (polCandidatesGrid && needsFullRebuild) {
    lastRenderedElectionCount = pol.electionCount;
    politicsCardsBuiltForFilter = activePoliticsDistrictFilter;

    const filtered = activePoliticsDistrictFilter === 'all'
      ? pol.candidates
      : pol.candidates.filter(c => c.district === activePoliticsDistrictFilter);

    polCandidatesGrid.innerHTML = filtered.map(c => {
      const ideo = pol.ideologies[c.ideology] || {};
      const secIdeo = pol.ideologies[c.secondaryIdeology] || {};
      const distLabel = factionNames[c.district] || c.district;
      const alliancesStr = c.alliances && c.alliances.length ? c.alliances.join(', ') : 'Independente';
      const rivalriesStr = c.rivalries && c.rivalries.length ? c.rivalries.join(', ') : 'Sem rivais diretos';

      return `
        <div class="candidate-card ${c.isElected ? 'elected' : ''}" style="--cand-accent: ${ideo.color || '#F4A261'};">
          <div>
            <div class="cand-header">
              <div class="cand-identity">
                <div class="cand-medallion" style="border-color: ${ideo.color};">${c.avatar}</div>
                <div>
                  <div class="cand-name">${c.name}</div>
                  <div class="cand-role">${c.role}</div>
                  <div class="cand-district-tag">${distLabel}</div>
                </div>
              </div>
              ${c.isElected ? `<span class="elected-pill">👑 ${c.terms}º MANDATO</span>` : ''}
            </div>

            <div class="cand-ideo-tags">
              <span class="ideo-tag-primary" style="color: ${ideo.color}; border-color: ${ideo.color}44;">
                ${ideo.icon} ${ideo.shortName}
              </span>
              <span class="ideo-tag-sec">+ ${secIdeo.shortName || ''}</span>
            </div>

            <div class="cand-platform-quote">“${c.platform}”</div>
            <div class="cand-ai-policy">🤖 <strong>Ação Autônoma:</strong> ${c.aiPolicyDesc}</div>

            <div class="ideo-bar-row" style="margin-bottom: 0.45rem;">
              <div class="ideo-bar-header">
                <span>🗳️ Votos no Bairro</span>
                <span data-cand-stat="${c.id}" style="color: #FDE047; font-weight: 800;">${c.voteShare}% (Aprov. ${c.approval}%)</span>
              </div>
              <div class="ideo-bar-track">
                <div class="ideo-bar-fill" data-cand-bar="${c.id}" style="width: ${c.voteShare}%; background: ${c.isElected ? '#FACC15' : ideo.color};"></div>
              </div>
            </div>

            <div class="cand-relations">
              <div>🤝 <strong>Alianças:</strong> ${alliancesStr}</div>
              <div>⚡ <strong>Disputa:</strong> ${rivalriesStr}</div>
            </div>
          </div>

          <button class="btn-support-cand" data-cand-id="${c.id}">
            <span>📢 Impulsionar Campanha</span>
            <span class="support-cost-pill">R$ 35</span>
          </button>
        </div>
      `;
    }).join('');

    polCandidatesGrid.querySelectorAll('.btn-support-cand').forEach(btn => {
      btn.onclick = () => {
        const cid = btn.getAttribute('data-cand-id');
        if (simulation.politics) {
          simulation.politics.supportCandidate(cid, 35);
          renderPoliticsModal(simulation.getSummary(), true);
        }
      };
    });
  } else if (polCandidatesGrid) {
    pol.candidates.forEach(c => {
      const statEl = polCandidatesGrid.querySelector(`[data-cand-stat="${c.id}"]`);
      const barEl = polCandidatesGrid.querySelector(`[data-cand-bar="${c.id}"]`);
      if (statEl) statEl.innerText = `${c.voteShare}% (Aprov. ${c.approval}%)`;
      if (barEl) barEl.style.width = `${c.voteShare}%`;
    });
  }

  // 4. Render Political Log (only when changed)
  if (polLogList && pol.politicalLog) {
    const newLogSig = pol.politicalLog[0] || '';
    if (polLogList.dataset.lastLog !== newLogSig) {
      polLogList.dataset.lastLog = newLogSig;
      polLogList.innerHTML = pol.politicalLog.map(item => `<div class="pol-log-item">${item}</div>`).join('');
    }
  }
}

function openPoliticsModal() {
  if (!modalPolitics) return;
  hidePopoverSafe(popDistricts);
  if (!modalPolitics.open) {
    modalPolitics.showModal();
  }
  renderPoliticsModal(simulation.getSummary(), true);
}

function closePoliticsModal() {
  if (!modalPolitics || !modalPolitics.open) return;
  closeTopLayer(modalPolitics);
}

if (btnPolitics) btnPolitics.onclick = openPoliticsModal;
if (btnOpenPoliticsPanel) btnOpenPoliticsPanel.onclick = openPoliticsModal;
if (btnPoliticsClose) btnPoliticsClose.onclick = closePoliticsModal;

if (modalPolitics) {
  modalPolitics.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeTopLayer(modalPolitics);
  });
}

document.querySelectorAll('.pol-tab-btn').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.pol-tab-btn').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activePoliticsDistrictFilter = tab.getAttribute('data-dist') || 'all';
    renderPoliticsModal(simulation.getSummary(), true);
  };
});

if (btnRunElectionNow) {
  btnRunElectionNow.onclick = () => {
    if (simulation.politics) {
      simulation.politics.runElectionNow(true);
      renderPoliticsModal(simulation.getSummary(), true);
    }
  };
}

if (popFeed) {
  popFeed.addEventListener('toggle', (e) => {
    if (e.newState === 'open' && feedUnreadDot) {
      feedUnreadDot.classList.remove('has-unread');
    }
  });
}

// Hook simulation updates
simulation.onUpdate((summary) => {
  valPop.innerText = summary.metrics.population;
  valWealth.innerText = `R$ ${summary.metrics.wealth}`;
  valWater.innerText = `${summary.metrics.water}%`;
  valEnergy.innerText = `${summary.metrics.energy}%`;
  valCulture.innerText = `${summary.metrics.culture}%`;
  dayCounter.innerText = `DIA ${summary.day}`;
  if (buildTreasuryHint) buildTreasuryHint.innerText = `Caixa R$ ${summary.metrics.wealth}`;

  if (prainhaHarmony && summary.factions.prainha) prainhaHarmony.innerText = `${summary.factions.prainha.harmony}%`;
  if (solHarmony && summary.factions.sol) solHarmony.innerText = `${summary.factions.sol.harmony}%`;
  if (serraHarmony && summary.factions.serra) serraHarmony.innerText = `${summary.factions.serra.harmony}%`;
  if (varzeaHarmony && summary.factions.varzea) varzeaHarmony.innerText = `${summary.factions.varzea.harmony}%`;

  if (prainhaLeader && summary.factions.prainha) prainhaLeader.innerText = summary.factions.prainha.leader;
  if (solLeader && summary.factions.sol) solLeader.innerText = summary.factions.sol.leader;
  if (serraLeader && summary.factions.serra) serraLeader.innerText = summary.factions.serra.leader;
  if (varzeaLeader && summary.factions.varzea) varzeaLeader.innerText = summary.factions.varzea.leader;

  // Highlight affordability on strategic action buttons
  actionButtonsCostMap.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      el.classList.toggle('insufficient-funds', summary.metrics.wealth < item.cost);
    }
  });

  if (summary.feed.length > 0) {
    const newest = summary.feed[0];
    if (newest.text !== lastFeedSignature) {
      lastFeedSignature = newest.text;
      if (tickerText) tickerText.innerText = newest.text;
      if (isInitialFeedSync) {
        isInitialFeedSync = false;
      } else {
        showWhisper();
        if (feedUnreadDot && !isPopoverOpen(popFeed)) {
          feedUnreadDot.classList.add('has-unread');
        }
      }
      if (hudFeedList) {
        hudFeedList.innerHTML = summary.feed.slice(0, 14).map((ev) => `
          <div class="hud-feed-item">
            <span class="hud-feed-time">${ev.time || 'Hoje'}</span>
            <div>${ev.text}</div>
          </div>
        `).join('');
      }
    }
  }

  renderPoliticsModal(summary);
});

// Action Buttons (with active strategic costs and ideological impact)
document.getElementById('act-puxadinho').onclick = () => {
  const cost = ACTION_COSTS.puxadinho;
  const eligible = architecture.houses.filter(h => h.level < 3 && !h.isUpgrading);
  if (eligible.length === 0) {
    simulation.addEvent(`🏗️ Todas as casas atuais já estão no 3º pavimento ou em obras!`, 'info');
    return;
  }
  if (!simulation.spendWealth(cost, 'Estimular Puxadinho')) return;

  const lucky = eligible[Math.floor(Math.random() * eligible.length)];
  architecture.upgradeHouse(lucky.id);
  if (simulation.politics) simulation.politics.boostIdeology('infra', 4);
  simulation.addEvent(`🏗️ Investimento de R$ ${cost}: Mutirão iniciou ampliação de laje na encosta!`, 'player');
  simulation.performAutoSave();
};

document.getElementById('act-samba').onclick = () => {
  const ok = simulation.triggerPlayerSamba();
  if (ok && npcs) {
    npcs.festivalActive = true;
    npcs.festivalTimer = 120.0;
  }
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
    const cost = ACTION_COSTS.frontier;
    const frontierPlateaus = architecture.allPlateaus.filter(p => Math.abs(p.x) >= 38 || p.z <= -48);
    const builtIds = new Set(architecture.houses.map(h => h.id));
    const constructingIds = new Set(architecture.activeConstructions.map(c => c.id));
    const available = frontierPlateaus.filter(p => !builtIds.has(p.id) && !constructingIds.has(p.id));

    if (available.length > 0) {
      if (!simulation.spendWealth(cost, 'Desbravar Cinturão & Cume')) return;
      const sorted = available.slice().sort((a, b) => (Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z)));
      const targetPlateau = sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
      architecture.spawnNewHouse(targetPlateau.faction, null, targetPlateau);
      if (simulation.politics) simulation.politics.boostIdeology('infra', 3);
      const districtName = targetPlateau.faction === 'prainha' ? 'Colina do Poente (Oeste)'
                         : targetPlateau.faction === 'varzea' ? 'Encostas do Levante (Leste)'
                         : 'Crista do Cume (Norte)';
      simulation.addEvent(`⛰️ Investimento de R$ ${cost}: Pedreiros iniciaram terraplanagem no lote ${targetPlateau.id} em ${districtName}!`, 'player');
      simulation.performAutoSave();
    } else {
      simulation.addEvent(`⛰️ Toda a fronteira do Cinturão e Cume está plenamente consolidada e povoada!`, 'culture');
    }
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
    if (!modalNewWorld.open) modalNewWorld.showModal();
  };

  modalNewWorld.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeTopLayer(modalNewWorld);
  });

  modalCancelReset.onclick = () => {
    closeTopLayer(modalNewWorld);
  };

  modalConfirmReset.onclick = () => {
    simulation.resetToNewWorld();
    pets.resetForNewWorld();
    setGameSpeed(1);
    closeTopLayer(modalNewWorld);
  };
}

// Camera Presets & Multi-Angle Sub-Views Controller
// Clicking the same region button again cycles through curated cinematic angles of that district!
const cameraPresets = {
  pan: {
    name: 'Panorâmica Continental',
    angles: [
      { pos: new THREE.Vector3(-58, 62, 138), target: new THREE.Vector3(0, 14, -22), label: 'Baía & Anfiteatro Carioca' },
      { pos: new THREE.Vector3(72, 58, 128), target: new THREE.Vector3(-8, 14, -24), label: 'Panorama Leste-Oeste' },
      { pos: new THREE.Vector3(0, 74, 155), target: new THREE.Vector3(0, 15, -30), label: 'Grande Maquete Continental' },
      { pos: new THREE.Vector3(0, 148, 225), target: new THREE.Vector3(0, 12, -45), label: 'Vista Aérea Continental 360°' }
    ]
  },
  prainha: {
    name: 'Porto & Cais Pesqueiro',
    angles: [
      { pos: new THREE.Vector3(-46, 20, 114), target: new THREE.Vector3(-80, 2.2, 84), label: 'Píer dos Pescadores, Farol & Frota no Mar' },
      { pos: new THREE.Vector3(-114, 23, 120), target: new THREE.Vector3(-76, 1.8, 92), label: 'Baía dos Cardumes, Canoas & Cais do Poente' },
      { pos: new THREE.Vector3(-82, 14, 62), target: new THREE.Vector3(-78, 1.5, 112), label: 'Vista do Píer para o Mar Fundo & Cardumes' },
      { pos: new THREE.Vector3(-185, 36, 42), target: new THREE.Vector3(-212, 8, -16), label: 'Vale do Poente & Capela Caiçara' }
    ]
  },
  morro: {
    name: 'Morro do Sol',
    angles: [
      { pos: new THREE.Vector3(-26, 33, 30), target: new THREE.Vector3(-2, 16.5, -16), label: 'Anfiteatro do Morro do Sol & Terreiro de Samba' },
      { pos: new THREE.Vector3(16, 22, 11), target: new THREE.Vector3(-2, 15.6, -5), label: 'Roda de Samba & Pórtico das Fitinhas' },
      { pos: new THREE.Vector3(-38, 28, 8), target: new THREE.Vector3(-10, 16.0, -18), label: 'Alameda do Samba, Olaria & Lajes Vivas' }
    ]
  },
  bonde: {
    name: 'Linha do Bondinho da Serra',
    angles: [
      { pos: new THREE.Vector3(60, 30, 14), target: new THREE.Vector3(32.0, 15, -20), label: 'Corredor do Teleférico & Ladeiras' },
      { pos: new THREE.Vector3(46, 26, -8), target: new THREE.Vector3(32.0, 14, -26), label: 'A Bordo do Bondinho (Seguindo Cabine)', followCabin: true },
      { pos: new THREE.Vector3(52, 32, -34), target: new THREE.Vector3(32.0, 19, -58), label: 'Estação Alta da Serra & Torres' }
    ]
  },
  serra: {
    name: 'Alto da Serra',
    angles: [
      { pos: new THREE.Vector3(-12, 48, -22), target: new THREE.Vector3(-8, 19, -70), label: 'Parque Solar, Aqueduto & Estação Alta' },
      { pos: new THREE.Vector3(38, 52, -45), target: new THREE.Vector3(28, 24, -95), label: 'Mirante Imperial & Torre de Rádio' },
      { pos: new THREE.Vector3(-42, 44, -32), target: new THREE.Vector3(-2, 18, -68), label: 'Cinturão Verde & Eólicas do Cume' }
    ]
  },
  cume: {
    name: 'Crista do Cume & Mirante Imperial',
    angles: [
      { pos: new THREE.Vector3(24, 52, -58), target: new THREE.Vector3(48, 28, -102), label: 'Mirante da Vista Imperial & Bandeira' },
      { pos: new THREE.Vector3(-18, 50, -62), target: new THREE.Vector3(0, 29, -104), label: 'Torre de Rádio Comunitária & Eólicas' },
      { pos: new THREE.Vector3(48, 46, -68), target: new THREE.Vector3(-12, 25, -96), label: 'Pipódromo dos Ventos & Crista Norte' },
      { pos: new THREE.Vector3(4, 42, -134), target: new THREE.Vector3(-22, 24, -162), label: 'Sela da Serra, Sítio & Anfiteatro Norte' }
    ]
  },
  varzea: {
    name: 'Polo da Várzea',
    angles: [
      { pos: new THREE.Vector3(82, 26, 44), target: new THREE.Vector3(60, 6, 4), label: 'Campinho da Pelada & Feira Cultural' },
      { pos: new THREE.Vector3(42, 18, 28), target: new THREE.Vector3(62, 5.5, 4), label: 'Arquibancada da Pelada & Mototáxis' },
      { pos: new THREE.Vector3(138, 24, 82), target: new THREE.Vector3(105, 5, 28), label: 'Escola de Surfe & Orla Leste' },
      { pos: new THREE.Vector3(185, 36, 42), target: new THREE.Vector3(212, 8, -16), label: 'Vale do Levante & Praça da Bocha' }
    ]
  }
};

let activePresetKey = 'pan';
const presetAngleIndex = { pan: 0, prainha: 0, morro: 0, bonde: 0, serra: 0, cume: 0, varzea: 0 };

const camButtons = {
  pan: document.getElementById('cam-pan'),
  prainha: document.getElementById('cam-prainha'),
  morro: document.getElementById('cam-morro'),
  bonde: document.getElementById('cam-bonde'),
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

function animateCameraTo(targetPos, lookAtPos, durationMs = 950) {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();

  // Ensure destination camera height is always safely above terrain
  const safeTargetPos = targetPos.clone();
  if (terrain && typeof terrain.getElevation === 'function') {
    const gY = terrain.getElevation(safeTargetPos.x, safeTargetPos.z);
    if (safeTargetPos.y < gY + 8.0) safeTargetPos.y = gY + 8.0;
  }

  function step(now) {
    if (cinematicCam.enabled || followTargetGroup) return;
    const elapsed = Math.max(0, now - startTime);
    const t = Math.min(1.0, elapsed / durationMs);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(startPos, safeTargetPos, ease);
    controls.target.lerpVectors(startTarget, lookAtPos, ease);
    controls.update();

    if (t < 1.0) {
      requestAnimationFrame(step);
    } else {
      camera.position.copy(safeTargetPos);
      controls.target.copy(lookAtPos);
      controls.update();
    }
  }
  requestAnimationFrame(step);
}

const activeCamLabel = document.getElementById('active-cam-label');
const activeCamAngle = document.getElementById('active-cam-angle');
const hudRegionSubtitle = document.getElementById('hud-region-subtitle');
const popCameras = document.getElementById('pop-cameras');

const camShortNames = {
  pan: 'Panorâmica',
  prainha: 'Prainha',
  morro: 'Morro do Sol',
  bonde: 'Bondinho',
  serra: 'Serra',
  cume: 'Cume',
  varzea: 'Várzea'
};

function selectCameraPreset(key) {
  followTargetGroup = null;
  const config = cameraPresets[key];
  if (!config) return;

  // If clicking the already-active region button, cycle to the next curated camera angle!
  if (activePresetKey === key) {
    presetAngleIndex[key] = ((presetAngleIndex[key] || 0) + 1) % config.angles.length;
  } else {
    activePresetKey = key;
    presetAngleIndex[key] = 0;
  }

  setActiveCamBtn(key);
  cinematicCam.setPreset(key);

  const angleObj = config.angles[presetAngleIndex[key]] || config.angles[0];
  const angleNum = presetAngleIndex[key] + 1;
  const totalAngles = config.angles.length;

  if (activeCamLabel) activeCamLabel.innerText = camShortNames[key] || config.name;
  if (activeCamAngle) activeCamAngle.innerText = `${angleNum}/${totalAngles}`;
  if (hudRegionSubtitle) hudRegionSubtitle.innerText = angleObj.label || config.name;

  // Special angle: live cabin tracking on Bondinho angle #2
  if (angleObj.followCabin && architecture.cableCars && architecture.cableCars.length > 0) {
    if (cinematicCam.enabled) toggleCinematicMode();
    const targetCabin = architecture.cableCars[0];
    followTargetGroup = targetCabin.group;
    followOffset.set(11, 5.0, 12);
    showMobilityInspector(targetCabin);
    simulation.addEvent(`🚡 Câmera ${angleNum}/${totalAngles}: ${angleObj.label}!`, 'culture');
    return;
  }

  if (!cinematicCam.enabled) {
    animateCameraTo(angleObj.pos, angleObj.target);
    simulation.addEvent(`📷 Câmera ${config.name} (${angleNum}/${totalAngles}): ${angleObj.label}`, 'info');
  } else {
    simulation.addEvent(`🎬 Drone Cinema sobrevoando: ${config.name}!`, 'culture');
  }
}

Object.keys(camButtons).forEach(key => {
  if (camButtons[key]) {
    camButtons[key].onclick = () => {
      if (soundtrack && soundtrack.playUiClick) soundtrack.playUiClick('cam');
      selectCameraPreset(key);
    };
  }
});

// Clickable district items inside Bairros & Gestores popover
if (popDistricts) {
  popDistricts.querySelectorAll('.faction-item[data-cam]').forEach((card) => {
    card.addEventListener('click', () => {
      const camKey = card.getAttribute('data-cam');
      if (camKey) selectCameraPreset(camKey);
      hidePopoverSafe(popDistricts);
    });
  });
}

// Pet quick-visit shortcuts inside Mirantes popover
const btnVisitCaramelo = document.getElementById('btn-visit-caramelo');
if (btnVisitCaramelo) {
  btnVisitCaramelo.onclick = () => {
    const caramelo = pets.pets.find((p) => p.id === 'pet_caramelo') || pets.pets[0];
    if (!caramelo) return;
    if (cinematicCam.enabled) toggleCinematicMode();
    followTargetGroup = caramelo.group;
    followOffset.set(-3.8, 3.2, 5.8);
    const p = caramelo.group.position;
    animateCameraTo(
      new THREE.Vector3(p.x - 3.8, p.y + 3.2, p.z + 5.8),
      new THREE.Vector3(p.x, p.y + 0.45, p.z)
    );
    pets.greetOnSelect(caramelo);
    showPetInspector(caramelo);
    hidePopoverSafe(popCameras);
  };
}

const btnVisitMingau = document.getElementById('btn-visit-mingau');
if (btnVisitMingau) {
  btnVisitMingau.onclick = () => {
    const roofCat = pets.pets.find((p) => p.isRooftop) || pets.pets.find((p) => p.species === 'cat');
    if (!roofCat) return;
    if (cinematicCam.enabled) toggleCinematicMode();
    followTargetGroup = null;
    const p = roofCat.group.position;
    const rotY = roofCat.rooftopHouse?.meshGroup?.rotation?.y || 0;
    const fx = Math.sin(rotY);
    const fz = Math.cos(rotY);
    animateCameraTo(
      new THREE.Vector3(p.x + fx * 4.2 + fz * 1.4, p.y + 2.1, p.z + fz * 4.2 - fx * 1.4),
      new THREE.Vector3(p.x, p.y + 0.3, p.z)
    );
    pets.greetOnSelect(roofCat);
    showPetInspector(roofCat);
    hidePopoverSafe(popCameras);
  };
}

// Cinematic Drone Mode Toggle Button
const btnCinema = document.getElementById('cam-cinema-toggle');
const cinemaStatus = document.getElementById('cinema-status');

function toggleCinematicMode() {
  followTargetGroup = null;
  const isEnabled = cinematicCam.toggle();
  if (btnCinema) {
    btnCinema.classList.toggle('active', isEnabled);
  }
  if (cinemaStatus) {
    cinemaStatus.innerText = isEnabled ? 'on' : 'off';
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

// Soundtrack Audio Dock, Next Section, Inline Volumes & Mixer Popover
const btnAudio = document.getElementById('btn-audio');
const audioLabel = document.getElementById('audio-label');
const btnAudioNext = document.getElementById('btn-audio-next');
const dockTrackTitle = document.getElementById('dock-track-title');
const dockTrackMeta = document.getElementById('dock-track-meta');
const dockVolMusic = document.getElementById('dock-vol-music');
const dockVolSea = document.getElementById('dock-vol-sea');

let _lastPlayingState = null;
let _lastTrackTitle = '';
let _lastTrackMeta = '';

function syncNowPlayingUI() {
  const playing = Boolean(soundtrack && soundtrack.isPlaying);
  if (_lastPlayingState !== playing) {
    _lastPlayingState = playing;
    if (btnAudio) {
      btnAudio.classList.toggle('is-playing', playing);
      btnAudio.setAttribute('aria-pressed', String(playing));
    }
    if (audioLabel) {
      audioLabel.textContent = playing ? 'Bossa: ON' : 'Bossa: OFF';
    }
  }
  const info = soundtrack && soundtrack.getNowPlaying ? soundtrack.getNowPlaying() : null;
  if (dockTrackTitle && dockTrackMeta) {
    const nextTitle = (playing && info) ? (info.title || 'Sol na Varanda') : 'Toque para ouvir Bossa & Mar';
    const nextMeta = (playing && info) ? `Bossa Carioca · ${info.chord} · ${info.bpm} bpm` : 'trilha generativa carioca ao vivo';
    if (nextTitle !== _lastTrackTitle) {
      _lastTrackTitle = nextTitle;
      dockTrackTitle.textContent = nextTitle;
    }
    if (nextMeta !== _lastTrackMeta) {
      _lastTrackMeta = nextMeta;
      dockTrackMeta.textContent = nextMeta;
    }
  }
}

const syncAudioBtnUI = () => {
  syncNowPlayingUI();
};
soundtrack.onPlayStateChange = syncAudioBtnUI;
if (btnAudio) {
  btnAudio.onclick = () => {
    soundtrack.toggle();
    syncNowPlayingUI();
  };
}
if (btnAudioNext) {
  btnAudioNext.onclick = () => {
    if (soundtrack && soundtrack.skipSection) {
      soundtrack.skipSection();
      syncNowPlayingUI();
    }
  };
}
syncNowPlayingUI();

// Audio Mixer Popover & Inline Dock Sliders
const popMixer = document.getElementById('pop-mixer');
const btnMixerReset = document.getElementById('btn-mixer-reset');

const mixerSliders = {
  master: { input: document.getElementById('vol-master'), label: document.getElementById('label-vol-master') },
  music: { input: document.getElementById('vol-music'), label: document.getElementById('label-vol-music') },
  samba: { input: document.getElementById('vol-samba'), label: document.getElementById('label-vol-samba') },
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
      syncSliderVisual(item.input);
    }
  });
  if (dockVolMusic) {
    dockVolMusic.value = vols.music ?? 70;
    syncSliderVisual(dockVolMusic);
  }
  if (dockVolSea) {
    dockVolSea.value = vols.sea ?? 68;
    syncSliderVisual(dockVolSea);
  }
}

Object.keys(mixerSliders).forEach(ch => {
  const item = mixerSliders[ch];
  if (item.input) {
    item.input.oninput = (e) => {
      const val = Number(e.target.value);
      soundtrack.setVolume(ch, val);
      if (item.label) item.label.innerText = `${val}%`;
      syncSliderVisual(item.input);
      if (ch === 'music' && dockVolMusic) {
        dockVolMusic.value = val;
        syncSliderVisual(dockVolMusic);
      } else if (ch === 'sea' && dockVolSea) {
        dockVolSea.value = val;
        syncSliderVisual(dockVolSea);
      }
    };
  }
});

if (dockVolMusic) {
  dockVolMusic.oninput = (e) => {
    const val = Number(e.target.value);
    soundtrack.setVolume('music', val);
    syncSliderVisual(dockVolMusic);
    const mItem = mixerSliders.music;
    if (mItem?.input && mItem?.label) {
      mItem.input.value = val;
      mItem.label.innerText = `${val}%`;
      syncSliderVisual(mItem.input);
    }
  };
}

if (dockVolSea) {
  dockVolSea.oninput = (e) => {
    const val = Number(e.target.value);
    soundtrack.setVolume('sea', val);
    syncSliderVisual(dockVolSea);
    const sItem = mixerSliders.sea;
    if (sItem?.input && sItem?.label) {
      sItem.input.value = val;
      sItem.label.innerText = `${val}%`;
      syncSliderVisual(sItem.input);
    }
  };
}

if (popMixer) {
  popMixer.addEventListener('toggle', (e) => {
    if (e.newState === 'open') syncMixerUI();
  });
}

if (btnMixerReset) {
  btnMixerReset.onclick = () => {
    const defaults = { master: 80, music: 70, samba: 78, construction: 42, soccer: 22, sea: 68, sfx: 58 };
    Object.keys(defaults).forEach(ch => {
      soundtrack.setVolume(ch, defaults[ch]);
    });
    syncMixerUI();
    simulation.addEvent('🎚️ Volumes da Trilha Bossa Nova, Roda de Samba, Natureza e Efeitos restaurados para o padrão.', 'culture');
  };
}

syncMixerUI();

// Speed Control (1x -> 2x -> 5x)
const btnSpeed = document.getElementById('btn-speed');
const speedLabel = document.getElementById('speed-label');
const speeds = [1, 2, 5];
let speedIdx = 0;

function setGameSpeed(newSpeed = 1) {
  const speed = speeds.includes(newSpeed) ? newSpeed : 1;
  simulation.speed = speed;
  speedIdx = speeds.indexOf(speed);
  if (speedIdx === -1) speedIdx = 0;
  if (speedLabel) {
    speedLabel.innerText = `${speed}x`;
  }
  if (btnSpeed) {
    btnSpeed.classList.toggle('active', speed > 1);
  }
}

if (btnSpeed) {
  btnSpeed.onclick = () => {
    speedIdx = (speedIdx + 1) % speeds.length;
    const targetSpeed = speeds[speedIdx];
    setGameSpeed(targetSpeed);
    simulation.addEvent(`⚡ Velocidade da simulação ajustada para ${targetSpeed}x!`, 'info');
  };
}

// Sincronização inicial: garante 1x estrito na inicialização e sincronia perfeita do HUD
setGameSpeed(1);

// Dynamic Day/Night Phase Sync, Solar Clock & Lighting Popover
const timeIcon = document.getElementById('time-icon');
const timeLabel = document.getElementById('time-label');
const hudClock = document.getElementById('hud-clock');
const popTime = document.getElementById('pop-time');

const PHASE_META = {
  day: {
    name: 'Dia Tropical',
    svg: '<svg class="hud-svg-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>'
  },
  sunset: {
    name: 'Pôr do Sol',
    svg: '<svg class="hud-svg-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>'
  },
  night: {
    name: 'Noite Carioca',
    svg: '<svg class="hud-svg-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'
  },
  dawn: {
    name: 'Alvorecer',
    svg: '<svg class="hud-svg-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>'
  }
};

function formatSolarClock(progress) {
  let hours = 9.5;
  const p = ((progress % 1) + 1) % 1;
  if (p < 0.42) {
    hours = 8.0 + (p / 0.42) * 8.5;
  } else if (p < 0.58) {
    hours = 16.5 + ((p - 0.42) / 0.16) * 2.5;
  } else if (p < 0.88) {
    hours = 19.0 + ((p - 0.58) / 0.30) * 10.0;
  } else {
    hours = 5.0 + ((p - 0.88) / 0.12) * 3.0;
  }
  const h24 = Math.floor(hours) % 24;
  const mins = Math.floor((hours - Math.floor(hours)) * 60) % 60;
  return `${String(h24).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

let _lastClockStr = '';
function syncSolarClock(phaseKey = null) {
  const cur = phaseKey || env.currentPhase || 'day';
  const info = PHASE_META[cur] || PHASE_META.day;
  const clock = formatSolarClock(env.getCycleProgress ? env.getCycleProgress() : 0.11);
  const str = `${clock} · ${info.name}`;
  if (hudClock && str !== _lastClockStr) {
    _lastClockStr = str;
    hudClock.textContent = str;
  }
}

function syncPhaseHUD(phaseKey) {
  const key = PHASE_META[phaseKey] ? phaseKey : 'day';
  const info = PHASE_META[key];
  document.body.dataset.phase = key;
  if (timeIcon) timeIcon.innerHTML = info.svg;
  if (timeLabel) timeLabel.innerText = info.name;
  syncSolarClock(key);
  if (popTime) {
    popTime.querySelectorAll('[data-phase]').forEach((btn) => {
      btn.classList.toggle('is-selected', btn.getAttribute('data-phase') === key);
    });
  }
}

syncPhaseHUD(env.currentPhase || 'day');

if (popTime) {
  popTime.querySelectorAll('[data-phase]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetPhase = btn.getAttribute('data-phase');
      if (!targetPhase) return;
      env.setTimeOfDay(targetPhase);
      if (soundtrack && soundtrack.playUiTimeShift) soundtrack.playUiTimeShift(targetPhase);
      hidePopoverSafe(popTime);
    });
  });
}

env.onPhaseChange((cur) => {
  const phaseKey = (typeof cur === 'string') ? cur : (cur.phase || 'day');
  const info = PHASE_META[phaseKey] || PHASE_META.day;
  syncPhaseHUD(phaseKey);
  if (phaseKey === 'night') {
    simulation.addEvent(`🌙 ${info.name}: postes, bondinhos e a fogueira do samba brilham na encosta.`, 'culture');
  } else if (phaseKey === 'sunset') {
    simulation.addEvent(`🌅 ${info.name} sobre a baía! Pescadores retornam com suas redes.`, 'diplomacy');
  } else if (phaseKey === 'dawn') {
    simulation.addEvent(`🌄 ${info.name} desponta na colina com céu radiante e ar fresco.`, 'info');
  }
});

// Post-Processing Effects (Tilt-Shift Miniature + Night Bloom + Settings Popover)
const urlParams = new URLSearchParams(location.search);
const postFX = new PostEffects(renderer, scene, camera, env, {
  initialMode: urlParams.has('nofx') ? 'off' : 'maquete',
  debug: urlParams.has('debug')
});

const btnFxToggle = document.getElementById('btn-fx-toggle');
const fxLabel = document.getElementById('fx-label');
const popSettings = document.getElementById('pop-settings');

function updateFxButtonUI() {
  if (fxLabel) fxLabel.textContent = postFX.getModeLabel();
  if (btnFxToggle) btnFxToggle.classList.toggle('active', postFX.mode !== 'off');
  if (popSettings) {
    popSettings.querySelectorAll('[data-fx-mode]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-fx-mode') === postFX.mode);
    });
  }
}
updateFxButtonUI();
postFX.onModeChange = updateFxButtonUI;

if (btnFxToggle) {
  btnFxToggle.onclick = () => {
    postFX.cycleMode();
    updateFxButtonUI();
    simulation.addEvent(`✨ Modo Visual alterado para: ${postFX.getModeLabel()}!`, 'culture');
  };
}

if (popSettings) {
  popSettings.querySelectorAll('[data-fx-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-fx-mode');
      if (mode && postFX.setMode) {
        postFX.setMode(mode);
        updateFxButtonUI();
        simulation.addEvent(`✨ Modo Visual alterado para: ${postFX.getModeLabel()}!`, 'culture');
      }
    });
  });
}

// Highlight dock/chip buttons whenever their target popover is open
document.querySelectorAll('[popovertarget]').forEach((trigger) => {
  const targetId = trigger.getAttribute('popovertarget');
  const pop = targetId ? document.getElementById(targetId) : null;
  if (!pop) return;
  if (!Object.hasOwn(HTMLElement.prototype, 'popover')) {
    trigger.addEventListener('click', () => togglePopoverSafe(pop));
  }
  pop.addEventListener('toggle', (e) => {
    trigger.classList.toggle('is-open', e.newState === 'open');
  });
});

// Zen Mode (H), Auto-Idle Zen, Fullscreen (F) & Postal PNG Screenshot
const btnZen = document.getElementById('btn-zen');
const btnZenRestore = document.getElementById('btn-zen-restore');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnScreenshot = document.getElementById('btn-screenshot');
const toggleAutoZen = document.getElementById('toggle-auto-zen');

function closeAllOpenPopovers() {
  document.querySelectorAll('.hud-popover').forEach((pop) => hidePopoverSafe(pop));
}

function toggleZenMode(forceState = null) {
  const next = forceState !== null ? Boolean(forceState) : !document.body.classList.contains('ui-off');
  document.body.classList.toggle('ui-off', next);
  if (next) {
    closeAllOpenPopovers();
    document.body.classList.remove('idle');
  }
}

if (btnZen) btnZen.onclick = () => toggleZenMode(true);
if (btnZenRestore) btnZenRestore.onclick = () => toggleZenMode(false);

let autoZenEnabled = false;
try {
  autoZenEnabled = localStorage.getItem('morro_vivo_auto_zen') === '1';
} catch {}
if (toggleAutoZen) {
  toggleAutoZen.checked = autoZenEnabled;
  toggleAutoZen.addEventListener('change', () => {
    autoZenEnabled = toggleAutoZen.checked;
    try {
      localStorage.setItem('morro_vivo_auto_zen', autoZenEnabled ? '1' : '0');
    } catch {}
    if (!autoZenEnabled) document.body.classList.remove('idle');
    resetIdleZenTimer();
  });
}

let idleZenTimer = null;
function hasActiveOverlayOpen() {
  if (document.querySelector('dialog[open]')) return true;
  for (const pop of document.querySelectorAll('.hud-popover')) {
    if (isPopoverOpen(pop)) return true;
  }
  return false;
}

function resetIdleZenTimer() {
  document.body.classList.remove('idle');
  if (idleZenTimer) clearTimeout(idleZenTimer);
  if (!autoZenEnabled) return;
  idleZenTimer = setTimeout(() => {
    if (autoZenEnabled && !hasActiveOverlayOpen()) {
      document.body.classList.add('idle');
    }
  }, 22000);
}
window.addEventListener('pointermove', resetIdleZenTimer, { passive: true });
window.addEventListener('keydown', resetIdleZenTimer, { passive: true });
resetIdleZenTimer();

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}
if (btnFullscreen) {
  btnFullscreen.onclick = toggleFullscreen;
  document.addEventListener('fullscreenchange', () => {
    btnFullscreen.classList.toggle('is-active', Boolean(document.fullscreenElement));
  });
}

if (btnScreenshot) {
  btnScreenshot.onclick = () => {
    try {
      postFX.render(0);
      const dataUrl = renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `morro-vivo-dia-${simulation.day || 1}.png`;
      link.href = dataUrl;
      link.click();
      showWhisper('Postal PNG salvo da vista atual!');
    } catch (err) {
      console.warn('Screenshot capture failed:', err);
    }
  };
}

// Global Keyboard Shortcuts (WASD free! C=Tour, P=Conselho, I=Obras, M=Bairros, T=Horário, B=Lente, H=Zen, F=Fullscreen, N=Next Track, Space=Play/Pause, G=lil-gui, Esc=Close)
window.addEventListener('keydown', (e) => {
  if (isTypingInUI(document.activeElement)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.code === 'Space') {
    e.preventDefault();
    soundtrack.toggle();
    syncNowPlayingUI();
  } else if (e.key === 'n' || e.key === 'N') {
    if (soundtrack && soundtrack.skipSection) {
      soundtrack.skipSection();
      syncNowPlayingUI();
    }
  } else if (e.key === 'c' || e.key === 'C') {
    toggleCinematicMode();
  } else if (e.key === 'p' || e.key === 'P') {
    if (modalPolitics && modalPolitics.open) closePoliticsModal();
    else openPoliticsModal();
  } else if (e.key === 'm' || e.key === 'M') {
    togglePopoverSafe(popDistricts);
  } else if (e.key === 'i' || e.key === 'I') {
    togglePopoverSafe(popBuild);
  } else if (e.key === 't' || e.key === 'T') {
    const nextPhase = env.toggleTimeOfDay();
    if (soundtrack && soundtrack.playUiTimeShift) soundtrack.playUiTimeShift(nextPhase);
  } else if (e.key === 'b' || e.key === 'B') {
    postFX.cycleMode();
    updateFxButtonUI();
  } else if (e.key === 'h' || e.key === 'H') {
    toggleZenMode();
  } else if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen();
  } else if (e.key === 'g' || e.key === 'G') {
    postFX.initDebugGUI();
  } else if (e.key === 'Escape') {
    if (inspectorCard.classList.contains('visible')) {
      inspectorCard.classList.remove('visible');
      followTargetGroup = null;
    }
    if (document.body.classList.contains('ui-off')) toggleZenMode(false);
    closeAllOpenPopovers();
    closePoliticsModal();
    if (modalNewWorld && modalNewWorld.open) closeTopLayer(modalNewWorld);
  }
});

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postFX.setSize(window.innerWidth, window.innerHeight);
  quality.apply();
});

// Main Animation & Render Loop
const timer = new THREE.Timer();
const perf = new PerfMonitor(renderer);
const culler = new ContributionCuller(scene, camera, renderer, { enabled: !urlParams.has('nocull') });
let adaptiveQualityReady = false;
const quality = new AdaptiveQuality(renderer, {
  enabled: !urlParams.has('noadapt'),
  onRatioChange: () => {
    postFX.setSize(window.innerWidth, window.innerHeight);
    if (adaptiveQualityReady) {
      if (quality.ratio <= 0.72) postFX.setSSAOEnabled(false);
      else if (quality.ratio >= 0.92) postFX.setSSAOEnabled(true);
    }
  }
});
adaptiveQualityReady = true;
const batcher = new StaticBatcher(scene, {
  cellSize: 210,
  enabled: !urlParams.has('nobatch'),
  // Apenas NPCs, pets e veículos móveis ficam fora do batch estático; casas estáticas entram no batch e continuam clicáveis via FastPicker (layer 31)!
  getExcludedRoots: () => [
    ...npcs.npcs.map((n) => n.group),
    ...pets.pets.map((p) => p.group),
    ...(architecture.mobilityDynamicGroups || [])
  ].filter(Boolean),
  onActive: () => {
    if (culler && culler.enabled) culler.collect();
  }
});
architecture.batcher = batcher;
perf.extra = () => `Lotes ${batcher.stats.merged} meshes em ${batcher.stats.chunks} (${batcher.stats.state})\nDinâmicas ${batcher.stats.dynamic} | Pick ${fastPicker.lastPickMs.toFixed(2)}ms\nCulling ${culler.stats.culledMeshes}/${culler.stats.totalMeshes} meshes\nResolução x${quality.ratio} | FX: ${postFX.mode}`;

let shadowRefreshAcc = 0;
let hudRefreshAcc = 0;
env.onPhaseChange(() => {
  renderer.shadowMap.needsUpdate = true;
});

function animate() {
  requestAnimationFrame(animate);

  timer.update();
  const rawDelta = Math.min(timer.getDelta(), 0.1);
  const simSpeed = simulation.speed || 1;
  const gameDelta = rawDelta * simSpeed;

  // Atualiza shadow map a 20 Hz (50ms) para eliminar engasgos ao girar/mover a câmera mantendo sombras suaves
  shadowRefreshAcc += rawDelta;
  if (shadowRefreshAcc >= 0.05) {
    shadowRefreshAcc = 0;
    renderer.shadowMap.needsUpdate = true;
  }

  // Atualiza relógio solar e agora-tocando no dock a ~2 Hz com cache (zero layout thrash)
  hudRefreshAcc += rawDelta;
  if (hudRefreshAcc >= 0.48) {
    hudRefreshAcc = 0;
    syncSolarClock();
    syncNowPlayingUI();
  }

  // Update subsystems with synchronized simulation speed!
  const envSpeed = simSpeed === 1 ? 1 : Math.min(simSpeed * 0.75, 2.5);
  try {
    env.update(rawDelta * envSpeed);
    updateSharedShaderUniforms(rawDelta * envSpeed, env);
  } catch (envErr) {
    console.warn('Environment update error:', envErr);
  }

  perf.measure('arch', () => {
    try {
      architecture.update(gameDelta);
    } catch (archErr) {
      console.warn('Architecture update error:', archErr);
    }
  });

  perf.measure('npcs', () => {
    try {
      npcs.update(gameDelta);
      pets.update(gameDelta);
    } catch (npcErr) {
      console.warn('NPCs/Pets update error:', npcErr);
    }
  });

  // Update camera system: follow target (NPC/Bondinho/Mototáxi), cinematic drone, or user orbit + WASD controls
  if (followTargetGroup) {
    const tp = followTargetGroup.position;
    _followTargetTmp.set(tp.x, tp.y + 1.2, tp.z);
    controls.target.lerp(_followTargetTmp, Math.min(1, rawDelta * 6));
    const desiredFollowX = tp.x + followOffset.x;
    const desiredFollowZ = tp.z + followOffset.z;
    const groundFollowY = terrain ? terrain.getElevation(desiredFollowX, desiredFollowZ) : tp.y;
    const desiredFollowY = Math.max(tp.y + followOffset.y, groundFollowY + 5.5);
    _followPosTmp.set(desiredFollowX, desiredFollowY, desiredFollowZ);
    camera.position.lerp(_followPosTmp, Math.min(1, rawDelta * 4.5));
    controls.update();
  } else if (cinematicCam.enabled) {
    cinematicCam.update(rawDelta);
  } else {
    updateKeyboardCamera(rawDelta);
    controls.update();
    if (terrain && typeof terrain.getElevation === 'function') {
      const minGroundY = terrain.getElevation(camera.position.x, camera.position.z) + 2.8;
      if (camera.position.y < minGroundY) {
        camera.position.y = minGroundY;
      }
    }
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

  perf.measure('batch', () => batcher.update(rawDelta));
  perf.measure('cull', () => culler.update(rawDelta));
  // IMPORTANTE: quality.update ANTES do render para que nunca limpe o buffer do canvas após desenhar o frame!
  quality.update(rawDelta);
  perf.measure('render', () => postFX.render(rawDelta));
  perf.endFrame(rawDelta);
}

// Acesso para depuração e testes automatizados
window.__morro = {
  renderer,
  scene,
  camera,
  controls,
  simulation,
  setSpeed: setGameSpeed,
  npcs,
  pets,
  architecture,
  perf,
  culler,
  quality,
  batcher,
  fastPicker,
  postFX,
  env,
  soundtrack
};

// Initial simulation notification
simulation.notifyUpdate();

// Start render loop
animate();
