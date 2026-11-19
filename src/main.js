import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { Terrain } from './world/Terrain.js';
import { Environment } from './world/Environment.js';
import { Architecture } from './world/Architecture.js';
import { NPCManager } from './world/NPCs.js';
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

const simulation = new SimulationEngine(architecture, npcs, savedGameData);
const soundtrack = new AmbientSoundtrack();
soundtrack.setCamera(camera, controls);
architecture.setSoundtrack(soundtrack);
npcs.setSoundtrack(soundtrack);
npcs.setSimulation(simulation);

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

// Fast BVH + Sphere Pre-filtered Raycaster for instant object picking (< 0.1ms)
const fastPicker = new FastPicker(camera, architecture, npcs);
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
  // Ignore clicks on UI elements
  if (event.target.closest('#ui-overlay') && !event.target.closest('#canvas-container')) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  const hit = fastPicker.pick(mouse);
  if (!hit) return;

  if (hit.type === 'npc') {
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
    <div style="margin-top: 0.8rem; display: flex; flex-direction: column; gap: 0.42rem;">
      <button id="btn-focus-house" class="btn-icon" style="width: 100%; justify-content: center; background: rgba(42, 157, 143, 0.35); border-color: rgba(72, 202, 228, 0.45);">
        🎥 Enquadrar esta Moradia
      </button>
      <button id="btn-upgrade-this" class="btn-icon" style="width: 100%; justify-content: center; background: ${canUpgrade ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'};">
        ${canUpgrade ? `🏗️ Financiar Novo Andar (Custo: R$ ${cost})` : '✅ Altura Máxima Atingida (3 Andares)'}
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
        simulation.globalMetrics.wealth += cost; // Reembolsa caso já em obra
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
    <h3 style="font-family: var(--font-title); font-size: 1.15rem; color: #FFF; margin-bottom: 0.4rem;">
      👤 ${npc.citizenName}
    </h3>
    <div style="font-size: 0.8rem; color: var(--color-gold); margin-bottom: 0.6rem; font-weight: 700;">
      Função: ${npc.role} ${teamLabel}
    </div>
    <div style="font-size: 0.82rem; line-height: 1.6; color: var(--color-text-dim);">
      <div>• <strong>Ocupação Atual:</strong> ${npc.currentAction}</div>
      <div>• <strong>Rotina:</strong> ${statusLabel}</div>
      <div>• <strong>Corrente Ideológica:</strong> <span style="color: ${ideoInfo.color}; font-weight: 700;">${ideoInfo.icon} ${ideoInfo.shortName}</span></div>
      <div>• <strong>Voto para Gestor(a):</strong> <strong style="color: #FDE047;">🗳️ ${votedName}</strong></div>
      <div>• <strong>Disposição & Alegria:</strong> 98%</div>
    </div>
    <div style="margin-top: 0.8rem; display: flex; gap: 0.45rem;">
      <button id="btn-focus-citizen" class="btn-icon" style="flex: 1; justify-content: center; background: var(--color-primary);">
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

function showMobilityInspector(mob) {
  const isBonde = mob.type === 'cableCar';
  const isBoat = mob.type === 'fishingBoat';
  const icon = isBonde ? '🚡' : isBoat ? '⛵' : '🛵';
  const subtitle = isBonde
    ? 'Teleférico Carioca (3 Estações • Cabo Duplo)'
    : isBoat
    ? `Colônia de Pescadores (${mob.captainName || 'Mestre Caiçara'})`
    : `Cooperativa de Mototáxi (${mob.driverName})`;

  const boatStatusMap = {
    DOCKED: 'Atacado no Cais — Descarregando Pescado & Preparando Redes',
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
    <h3 style="font-family: var(--font-title); font-size: 1.12rem; color: #FFF; margin-bottom: 0.35rem;">
      ${icon} ${mob.name}
    </h3>
    <div style="font-size: 0.78rem; color: var(--color-gold); margin-bottom: 0.55rem; font-weight: 700;">
      ${subtitle}
    </div>
    <div style="font-size: 0.8rem; line-height: 1.55; color: var(--color-text-dim);">
      <div>• <strong>Linha / Trajeto:</strong> ${mob.routeDesc}</div>
      ${detailLine}
      <div>• <strong>Status:</strong> <span style="color: #4ADE80; font-weight: 700;">${statusText}</span></div>
    </div>
    <div style="margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem;">
      <button id="btn-focus-mobility" class="btn-icon" style="width: 100%; justify-content: center; background: var(--color-primary);">
        🎥 Acompanhar ${isBonde ? 'Cabine (Drone)' : isBoat ? 'Barco Pesqueiro' : 'Mototáxi'}
      </button>
      ${isBonde ? `
      <div style="display: flex; gap: 0.4rem;">
        <button id="btn-bonde-window" class="btn-icon" style="flex: 1; justify-content: center; background: rgba(42, 157, 143, 0.35); border-color: rgba(72, 202, 228, 0.45);">
          🪟 Vista Panorâmica
        </button>
        <button id="btn-bonde-next" class="btn-icon" style="flex: 1; justify-content: center;">
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
  if (!summary || !summary.politics || !modalPolitics || modalPolitics.style.display === 'none') return;
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
  modalPolitics.style.display = 'flex';
  renderPoliticsModal(simulation.getSummary(), true);
}

function closePoliticsModal() {
  if (!modalPolitics) return;
  modalPolitics.style.display = 'none';
}

if (btnPolitics) btnPolitics.onclick = openPoliticsModal;
if (btnOpenPoliticsPanel) btnOpenPoliticsPanel.onclick = openPoliticsModal;
if (btnPoliticsClose) btnPoliticsClose.onclick = closePoliticsModal;

if (modalPolitics) {
  modalPolitics.onclick = (e) => {
    if (e.target === modalPolitics) closePoliticsModal();
  };
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
    tickerText.innerText = summary.feed[0].text;
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
    modalNewWorld.style.display = 'flex';
  };

  modalCancelReset.onclick = () => {
    modalNewWorld.style.display = 'none';
  };

  modalConfirmReset.onclick = () => {
    simulation.resetToNewWorld();
    setGameSpeed(1);
    modalNewWorld.style.display = 'none';
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
      { pos: new THREE.Vector3(0, 74, 155), target: new THREE.Vector3(0, 15, -30), label: 'Grande Maquete Continental' }
    ]
  },
  prainha: {
    name: 'Porto & Cais Pesqueiro',
    angles: [
      { pos: new THREE.Vector3(-46, 20, 114), target: new THREE.Vector3(-80, 2.2, 84), label: 'Píer dos Pescadores, Farol & Frota no Mar' },
      { pos: new THREE.Vector3(-114, 23, 120), target: new THREE.Vector3(-76, 1.8, 92), label: 'Baía dos Cardumes, Canoas & Cais do Poente' },
      { pos: new THREE.Vector3(-82, 14, 62), target: new THREE.Vector3(-78, 1.5, 112), label: 'Vista do Píer para o Mar Fundo & Cardumes' }
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
      { pos: new THREE.Vector3(42, 30, 14), target: new THREE.Vector3(13.5, 15, -22), label: 'Corredor do Teleférico & Ladeiras' },
      { pos: new THREE.Vector3(28, 26, -8), target: new THREE.Vector3(13.5, 14, -28), label: 'A Bordo do Bondinho (Seguindo Cabine)', followCabin: true },
      { pos: new THREE.Vector3(32, 32, -36), target: new THREE.Vector3(13.5, 19, -58), label: 'Estação Alta da Serra & Torres' }
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
      { pos: new THREE.Vector3(48, 46, -68), target: new THREE.Vector3(-12, 25, -96), label: 'Pipódromo dos Ventos & Crista Norte' }
    ]
  },
  varzea: {
    name: 'Polo da Várzea',
    angles: [
      { pos: new THREE.Vector3(82, 26, 44), target: new THREE.Vector3(60, 6, 4), label: 'Campinho da Pelada & Feira Cultural' },
      { pos: new THREE.Vector3(42, 18, 28), target: new THREE.Vector3(62, 5.5, 4), label: 'Arquibancada da Pelada & Mototáxis' },
      { pos: new THREE.Vector3(138, 24, 82), target: new THREE.Vector3(105, 5, 28), label: 'Escola de Surfe & Orla Leste' }
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
    camButtons[key].onclick = () => selectCameraPreset(key);
  }
});

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

// Soundtrack Audio Toggle
const btnAudio = document.getElementById('btn-audio');
const audioLabel = document.getElementById('audio-label');
const syncAudioBtnUI = (isPlaying) => {
  if (!btnAudio || !audioLabel) return;
  if (isPlaying) {
    btnAudio.classList.add('active');
    audioLabel.innerText = 'Boom-Bap: ON';
  } else {
    btnAudio.classList.remove('active');
    audioLabel.innerText = 'Boom-Bap: OFF';
  }
};
soundtrack.onPlayStateChange = syncAudioBtnUI;
btnAudio.onclick = () => {
  const isPlaying = soundtrack.toggle();
  syncAudioBtnUI(isPlaying);
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
    }
  });
}

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

if (btnMixerReset) {
  btnMixerReset.onclick = () => {
    const defaults = { master: 80, music: 65, samba: 75, construction: 45, soccer: 18, sea: 65, sfx: 55 };
    Object.keys(defaults).forEach(ch => {
      soundtrack.setVolume(ch, defaults[ch]);
    });
    syncMixerUI();
    simulation.addEvent('🎚️ Volumes da Trilha Boom-Bap, Roda de Samba e Efeitos restaurados para o padrão.', 'culture');
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

env.onPhaseChange((cur) => {
  const phaseKey = (typeof cur === 'string') ? cur : (cur.phase || 'day');
  const info = phaseLabels[phaseKey] || phaseLabels.day;
  if (timeIcon) timeIcon.innerText = info.icon;
  if (timeLabel) timeLabel.innerText = info.name;
  if (phaseKey === 'night') {
    simulation.addEvent('🌙 A Noite Carioca começou! Postes, bondinhos e a fogueira do samba brilham na encosta!', 'culture');
  } else if (phaseKey === 'sunset') {
    simulation.addEvent('🌅 Pôr do sol dourado sobre a baía! Pescadores retornam com suas redes.', 'diplomacy');
  } else if (phaseKey === 'dawn') {
    simulation.addEvent('🌄 O alvorecer desponta na colina com céu radiante e ar fresco.', 'info');
  }
});

// Post-Processing Effects (Tilt-Shift Miniature + Night Bloom + lil-gui)
const urlParams = new URLSearchParams(location.search);
const postFX = new PostEffects(renderer, scene, camera, env, {
  initialMode: urlParams.has('nofx') ? 'off' : 'maquete',
  debug: urlParams.has('debug')
});

const btnFxToggle = document.getElementById('btn-fx-toggle');
const fxLabel = document.getElementById('fx-label');

function updateFxButtonUI() {
  if (!btnFxToggle || !fxLabel) return;
  fxLabel.innerText = postFX.getModeLabel();
  btnFxToggle.classList.toggle('active', postFX.mode !== 'off');
}
updateFxButtonUI();

if (btnFxToggle) {
  btnFxToggle.onclick = () => {
    postFX.cycleMode();
    updateFxButtonUI();
    simulation.addEvent(`✨ Modo Visual alterado para: ${postFX.getModeLabel()}!`, 'culture');
  };
}

// Collapsible Side Drawers (Left: Bairros & Gestores, Right: Obras & Intervenções)
const drawerLeft = document.getElementById('drawer-left');
const toggleDrawerLeft = document.getElementById('toggle-drawer-left');
const drawerRight = document.getElementById('drawer-right');
const toggleDrawerRight = document.getElementById('toggle-drawer-right');

if (toggleDrawerLeft && drawerLeft) {
  toggleDrawerLeft.onclick = () => {
    drawerLeft.classList.toggle('collapsed');
  };
}

if (toggleDrawerRight && drawerRight) {
  toggleDrawerRight.onclick = () => {
    drawerRight.classList.toggle('collapsed');
  };
}

// Global Keyboard Shortcuts (C = Cinema, P = Politics, B = Tilt-Shift/Bloom, D = Bairros Menu, I = Obras Menu, G = lil-gui Debug, Esc = Close Modals)
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === 'c' || e.key === 'C') {
    toggleCinematicMode();
  } else if (e.key === 'p' || e.key === 'P') {
    if (modalPolitics && modalPolitics.style.display === 'flex') closePoliticsModal();
    else openPoliticsModal();
  } else if (e.key === 'd' || e.key === 'D') {
    if (drawerLeft) drawerLeft.classList.toggle('collapsed');
  } else if (e.key === 'i' || e.key === 'I') {
    if (drawerRight) drawerRight.classList.toggle('collapsed');
  } else if (e.key === 'b' || e.key === 'B') {
    postFX.cycleMode();
    updateFxButtonUI();
  } else if (e.key === 'g' || e.key === 'G') {
    postFX.initDebugGUI();
  } else if (e.key === 'Escape') {
    closeMixer();
    closePoliticsModal();
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
  enabled: !urlParams.has('nobatch'),
  // Casas, moradores e veículos de mobilidade (bondinho/mototáxi) ficam fora do agrupamento estático
  getExcludedRoots: () => [
    ...npcs.npcs.map((n) => n.group),
    ...architecture.houses.map((h) => h.meshGroup),
    ...(architecture.mobilityDynamicGroups || [])
  ].filter(Boolean)
});
perf.extra = () => `Lotes ${batcher.stats.merged} meshes em ${batcher.stats.chunks} (${batcher.stats.state})\nDinâmicas ${batcher.stats.dynamic} | Pick ${fastPicker.lastPickMs.toFixed(2)}ms\nCulling ${culler.stats.culledMeshes}/${culler.stats.totalMeshes} meshes\nResolução x${quality.ratio} | FX: ${postFX.mode}`;

function animate() {
  requestAnimationFrame(animate);

  timer.update();
  const rawDelta = Math.min(timer.getDelta(), 0.1);
  const simSpeed = simulation.speed || 1;
  const gameDelta = rawDelta * simSpeed;

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
    } catch (npcErr) {
      console.warn('NPCs update error:', npcErr);
    }
  });

  // Update camera system: follow target (NPC/Bondinho/Mototáxi), cinematic drone, or user orbit controls
  if (followTargetGroup) {
    const tp = followTargetGroup.position;
    controls.target.lerp(new THREE.Vector3(tp.x, tp.y + 1.2, tp.z), Math.min(1, rawDelta * 6));
    const desiredFollowX = tp.x + followOffset.x;
    const desiredFollowZ = tp.z + followOffset.z;
    const groundFollowY = terrain ? terrain.getElevation(desiredFollowX, desiredFollowZ) : tp.y;
    const desiredFollowY = Math.max(tp.y + followOffset.y, groundFollowY + 5.5);
    camera.position.lerp(
      new THREE.Vector3(desiredFollowX, desiredFollowY, desiredFollowZ),
      Math.min(1, rawDelta * 4.5)
    );
    controls.update();
  } else if (cinematicCam.enabled) {
    cinematicCam.update(rawDelta);
  } else {
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
  architecture,
  perf,
  culler,
  quality,
  batcher,
  fastPicker,
  postFX,
  env
};

// Initial simulation notification
simulation.notifyUpdate();

// Start render loop
animate();
