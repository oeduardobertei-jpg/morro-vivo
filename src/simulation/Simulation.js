import { SaveSystem } from './SaveSystem.js';

export class SimulationEngine {
  constructor(architecture, npcManager, savedData = null) {
    this.arch = architecture;
    this.npcs = npcManager;

    this.speed = 1;
    this.isPaused = false;
    this.tickTimer = 0;
    this.autoSaveTimer = 0;
    if (savedData) {
      this.rehydrate(savedData);
    } else {
      this.initNewWorld();
    }

    // EXPLOSÃO DEMOGRÁFICA INSTANTÂNEA: Spawna a população inteira no mesmo frame ao carregar o jogo
    if (this.npcs && this.npcs.npcs) {
      const expectedCivilians = Math.floor(this.globalMetrics.population / 10);
      const currentCivilians = this.npcs.npcs.length - 4; // Subtrai os 4 barraqueiros fixos
      if (currentCivilians < expectedCivilians) {
        const spawnCount = expectedCivilians - Math.max(0, currentCivilians);
        for (let i = 0; i < spawnCount; i++) {
          this.npcs.spawnNewCivilian();
        }
      }
    }

    this.onUpdateCallbacks = [];
  }

  initNewWorld() {
    this.totalDays = 1;

    // Initial community metrics for the founding pioneer households & active residents
    this.globalMetrics = {
      population: 320,
      wealth: 480,
      water: 95,
      energy: 92,
      culture: 94
    };

    // 4 Macro-Districts starting as humble pioneering nuclei
    this.factions = {
      prainha: {
        id: 'prainha',
        name: 'Porto & Prainha (Oeste)',
        leader: 'Seu Zeca do Farol',
        specialty: 'Farol, Cais & Pesca Oceânica',
        color: '#0077B6',
        wealth: 80,
        harmony: 90,
        surplus: 'Pescados & Rotas Navais',
        deficit: 'Materiais de Construção'
      },
      sol: {
        id: 'sol',
        name: 'Morro do Sol (Centro)',
        leader: 'Dona Valéria & Tiago Mestre',
        specialty: 'Lajes, Alvenaria & Samba',
        color: '#E76F51',
        wealth: 95,
        harmony: 94,
        surplus: 'Tijolos & Cultura de Laje',
        deficit: 'Frutas & Pescado'
      },
      serra: {
        id: 'serra',
        name: 'Alto da Serra (Norte)',
        leader: 'Iara da Chapada',
        specialty: 'Usina Solar & Nascentes Puras',
        color: '#38BDF8',
        wealth: 75,
        harmony: 92,
        surplus: 'Energia Limpa & Água Pura',
        deficit: 'Provisões Marítimas'
      },
      varzea: {
        id: 'varzea',
        name: 'Polo da Várzea (Leste)',
        leader: 'Profª Cláudia & Beto do Campinho',
        specialty: 'Feira Cultural, Hortas & Futebol',
        color: '#2A9D8F',
        wealth: 90,
        harmony: 96,
        surplus: 'Feira Livre & Lazer Comunitário',
        deficit: 'Tijolos & Energia'
      }
    };

    this.diplomacy = {
      'prainha_sol': { trust: 88, pact: 'Pacto do Peixe da Laje', active: true },
      'sol_varzea': { trust: 92, pact: 'Tratado da Feira & Pelada', active: true },
      'serra_sol': { trust: 90, pact: 'Aqueduto da Serra & Energia', active: true },
      'prainha_varzea': { trust: 86, pact: 'Avenida Litoral Continental', active: true }
    };

    this.eventFeed = [
      { day: 1, text: '🌱 Novo mundo fundado! 4 comunidades pioneiras acabam de se assentar no litoral e na colina.', type: 'info' },
      { day: 1, text: '⛵ Pescadores da Prainha lançaram os primeiros barcos ao mar com ventos favoráveis.', type: 'diplomacy' }
    ];
  }

  rehydrate(data) {
    this.totalDays = data.day || 1;
    this.speed = data.speed || 1;
    this.globalMetrics = data.metrics || {
      population: 24,
      wealth: 160,
      water: 95,
      energy: 92,
      culture: 94
    };
    this.factions = data.factions || {};
    this.diplomacy = data.diplomacy || {};
    this.eventFeed = data.feed || [
      { day: this.totalDays, text: 'Mundo reaberto a partir do save automático.', type: 'info' }
    ];
  }

  onUpdate(callback) {
    this.onUpdateCallbacks.push(callback);
  }

  notifyUpdate() {
    this.onUpdateCallbacks.forEach(cb => cb(this.getSummary()));
  }

  addEvent(text, type = 'info') {
    this.eventFeed.unshift({ day: this.totalDays, text, type });
    if (this.eventFeed.length > 25) this.eventFeed.pop();
    this.notifyUpdate();
  }

  update(delta) {
    if (this.isPaused) return;

    this.tickTimer += delta * this.speed;
    if (this.tickTimer >= 2.5) {
      this.tickTimer = 0;
      this.stepSimulation();
    }

    // Auto-save interval: every 10 seconds
    this.autoSaveTimer += delta;
    if (this.autoSaveTimer >= 10.0) {
      this.autoSaveTimer = 0;
      this.performAutoSave();
    }
  }

  stepSimulation() {
    this.totalDays++;

    // 1. Economy & Population tally
    let totalPop = 0;
    let totalWealth = 0;

    this.arch.houses.forEach(h => {
      totalPop += h.residents;
      h.wealth += Math.floor(Math.random() * 3) + 1;
      totalWealth += h.wealth;
    });

    const streetPop = (this.npcs && this.npcs.npcs) ? this.npcs.npcs.length : 89;
    this.globalMetrics.population = totalPop + streetPop;
    this.globalMetrics.wealth = totalWealth + 250;

    // Dinâmica Orgânica: Spawnar 1 NPC real caminhante para cada 10 moradores teóricos da favela
    if (this.npcs && this.npcs.npcs) {
      // barraqueiros (4 fixos) + civis (resto)
      const expectedCivilians = Math.floor(this.globalMetrics.population / 10);
      const currentCivilians = this.npcs.npcs.length - 4; // Subtrai os 4 barraqueiros
      if (currentCivilians >= 0 && currentCivilians < expectedCivilians) {
        this.npcs.spawnNewCivilian();
      }
    }

    // District economies grow with trade
    Object.keys(this.factions).forEach(fKey => {
      this.factions[fKey].wealth += Math.floor(Math.random() * 4) + 2;
    });

    // 2. AUTONOMOUS ORGANIC TERRITORIAL EXPANSION:
    // Villages start tiny and steadily recruit citizen builders to expand outward along roads!
    const factionsList = ['prainha', 'sol', 'serra', 'varzea'];
    const frontierFactions = ['prainha', 'serra', 'varzea'];

    const pop = this.globalMetrics.population || 40;
    const maxConstructions = Math.floor(pop / 40) + 1;
    const spawnRate = 0.05 + Math.min(0.20, pop / 1000);

    if (Math.random() < spawnRate && this.arch.activeConstructions.length < maxConstructions) {
      // 85% bias toward frontier factions to actively colonize West, East, and Ridge red zones
      const targetPool = Math.random() < 0.85 ? frontierFactions : factionsList;
      const candidateFactions = targetPool.filter(f => this.factions[f].wealth >= 20);
      const chosenFaction = candidateFactions.length > 0 
        ? candidateFactions[Math.floor(Math.random() * candidateFactions.length)]
        : targetPool[Math.floor(Math.random() * targetPool.length)];

      const buildResult = this.arch.spawnNewHouse(chosenFaction, (completedHouse) => {
        const actualFaction = completedHouse.faction || chosenFaction;
        this.factions[actualFaction].wealth = Math.max(10, this.factions[actualFaction].wealth - 30);
        const factionInfo = this.factions[actualFaction] || { name: 'Comunidade' };
        this.addEvent(`🎉 Nova moradia concluída em ${factionInfo.name}! Casa de tom ${completedHouse.colorName} foi entregue na encosta!`, 'build');
        this.performAutoSave();
      });

      if (buildResult && buildResult.isConstructing) {
        const actualFaction = buildResult.faction || chosenFaction;
        const factionInfo = this.factions[actualFaction] || { name: 'Fronteira' };
        this.addEvent(`🚜 Mutirão na Fronteira! Pedreiros e carregadores de tijolo estão a caminho do novo lote em ${factionInfo.name}!`, 'build');
      }
    }

    // 3. VERTICAL EXPANSION: PUXADINHOS & LAJES
    // Older houses with wealth >= 35 recruit builders for a new floor/laje
    const eligibleHouses = this.arch.houses.filter(h => h.level < 3 && h.wealth >= 35 && !h.isUpgrading);
    if (eligibleHouses.length > 0 && Math.random() < 0.45 && this.arch.activeUpgrades.length < 3) {
      const luckyHouse = eligibleHouses[Math.floor(Math.random() * eligibleHouses.length)];
      const faction = this.factions[luckyHouse.faction] || { name: 'Comunidade' };

      const upgraded = this.arch.upgradeHouse(luckyHouse.id, (upgradedHouse) => {
        upgradedHouse.wealth = Math.max(5, upgradedHouse.wealth - 25);
        this.addEvent(
          `🧱 Puxadinho concluído! A casa de tom ${upgradedHouse.colorName} em ${faction.name} agora possui ${upgradedHouse.level} pavimentos e caixa d'água!`,
          'build'
        );
        this.performAutoSave();
      });

      if (upgraded) {
        this.addEvent(
          `👷 Equipe de obras a caminho para erguer andaimes e bater laje na casa de tom ${luckyHouse.colorName} em ${faction.name}!`,
          'build'
        );
      }
    }

    // 4. CONTINENTAL TRADE & HARMONY EVENTS
    if (Math.random() < 0.42) {
      this.triggerDiplomaticEvent();
    }

    this.notifyUpdate();
  }

  triggerDiplomaticEvent() {
    const events = [
      {
        text: '⚡ Usina Solar do Alto da Serra gerou excedente de energia limpa distribuída para todas as vilas!',
        type: 'resource',
        effect: () => {
          this.globalMetrics.energy = Math.min(100, this.globalMetrics.energy + 4);
          this.diplomacy['serra_sol'].trust = Math.min(100, this.diplomacy['serra_sol'].trust + 3);
        }
      },
      {
        text: '🎪 Grande Feira Cultural no Polo Leste atraiu moradores de todo o continente para compras e música!',
        type: 'culture',
        effect: () => {
          this.globalMetrics.culture = Math.min(100, this.globalMetrics.culture + 5);
          this.globalMetrics.wealth += 45;
        }
      },
      {
        text: '⛵ Frota pesqueira da Prainha retornou com farto carregamento de pescado fresco distribuído no cais.',
        type: 'resource',
        effect: () => {
          this.globalMetrics.wealth += 35;
          this.diplomacy['prainha_sol'].trust = Math.min(100, this.diplomacy['prainha_sol'].trust + 3);
        }
      },
      {
        text: '⚽ Torneio da Pelada de Várzea movimentou o campinho com torcida vinda de todas as regiões!',
        type: 'culture',
        effect: () => {
          this.factions.varzea.harmony = Math.min(100, this.factions.varzea.harmony + 3);
          this.factions.sol.harmony = Math.min(100, this.factions.sol.harmony + 3);
        }
      },
      {
        text: '🥁 Encontro musical entre os sambistas do morro e os músicos do cais animou o calçadão beira-mar.',
        type: 'culture',
        effect: () => {
          this.globalMetrics.culture = Math.min(100, this.globalMetrics.culture + 6);
        }
      },
      {
        text: '🔭 Mirante da Vista Imperial bateu recorde de visitantes contemplando a Baía de Guanabara pelas lunetas!',
        type: 'culture',
        effect: () => {
          this.globalMetrics.culture = Math.min(100, this.globalMetrics.culture + 6);
          this.globalMetrics.wealth += 50;
          this.factions.serra.harmony = Math.min(100, this.factions.serra.harmony + 4);
        }
      }
    ];

    const pick = events[Math.floor(Math.random() * events.length)];
    pick.effect();
    this.addEvent(pick.text, pick.type);
  }

  triggerPlayerSamba() {
    this.globalMetrics.culture = Math.min(100, this.globalMetrics.culture + 15);
    this.addEvent('🎺 Você patrocinou um grande festival de samba unindo os quatro distritos da colina!', 'player');
    this.notifyUpdate();
  }

  triggerPlayerWater() {
    this.globalMetrics.water = Math.min(100, this.globalMetrics.water + 20);
    this.arch.houses.forEach(h => h.waterLevel = 100);
    this.addEvent('💧 Aqueduto da Serra e caixas d\'água comunitárias abastecidas em todo o território!', 'player');
    this.notifyUpdate();
  }

  triggerPlayerSolar() {
    this.globalMetrics.energy = Math.min(100, this.globalMetrics.energy + 15);
    this.addEvent('☀️ Postes solares e redes limpas ativadas em todas as avenidas continentais!', 'player');
    this.notifyUpdate();
  }

  addEconomy(amount = 5, reason = 'Comércio na orla da praia') {
    this.globalMetrics.wealth += amount;
    if (Math.random() < 0.12) {
      this.addEvent(`🥥 Comércio da praia aquecido: ${reason} rendeu +R$ ${amount} à comunidade!`, 'economy');
    }
    this.notifyUpdate();
  }

  getSavePayload() {
    return {
      day: this.totalDays,
      speed: this.speed,
      metrics: { ...this.globalMetrics },
      factions: this.factions,
      diplomacy: this.diplomacy,
      feed: this.eventFeed,
      activeHouses: this.arch.getActiveHousesData()
    };
  }

  performAutoSave() {
    const payload = this.getSavePayload();
    const ok = SaveSystem.save(payload);
    if (ok) {
      const badge = document.getElementById('save-status');
      if (badge) {
        badge.innerText = '💾 Salvo';
        badge.classList.add('saved-flash');
        setTimeout(() => badge.classList.remove('saved-flash'), 1200);
      }
    }
  }

  resetToNewWorld() {
    SaveSystem.reset();
    this.initNewWorld();
    if (this.npcs) {
      this.npcs.clearAll();
    }
    this.arch.createInitialSettlements(this.arch.allPlateaus, null);
    
    if (this.npcs) {
      this.npcs.spawnInitialPopulation(); // Spawna barraqueiros fixos e limpa estado
    }
    
    this.notifyUpdate();
    this.addEvent('✨ Novo Mundo fundado! Morro do Sol inicia como centro vivo com suas moradias fundadoras.', 'info');
  }

  getSummary() {
    const factionHouses = { prainha: 0, sol: 0, serra: 0, varzea: 0 };
    let maxRadius = 10;
    this.arch.houses.forEach(h => {
      const f = h.faction || 'sol';
      if (factionHouses[f] !== undefined) factionHouses[f]++;
      const d = Math.hypot(h.position.x, h.position.z - (-5));
      if (d > maxRadius) maxRadius = d;
    });

    let stage = 'Centro Principal';
    if (maxRadius >= 95) stage = 'Área Vermelha';
    else if (maxRadius >= 35) stage = 'Encostas Médias';

    return {
      day: this.totalDays,
      metrics: { ...this.globalMetrics },
      factions: this.factions,
      diplomacy: this.diplomacy,
      feed: this.eventFeed,
      housesCount: this.arch.houses.length,
      factionHouses,
      maxRadius: Math.round(maxRadius),
      expansionStage: stage
    };
  }
}
