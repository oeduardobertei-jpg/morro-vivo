import { SaveSystem } from './SaveSystem.js';
import { PoliticsEngine } from './PoliticsEngine.js';

export const ACTION_COSTS = {
  puxadinho: 60,
  samba: 45,
  water: 55,
  solar: 50,
  frontier: 80,
  houseUpgrade: 30
};

export class SimulationEngine {
  constructor(architecture, npcManager, savedData = null) {
    this.arch = architecture;
    this.npcs = npcManager;

    this.speed = 1;
    this.isPaused = false;
    this.tickTimer = 0;
    this.autoSaveTimer = 0;
    this.onUpdateCallbacks = [];

    // Motor de IA Política, Eleições e Ideologias
    this.politics = new PoliticsEngine(this);

    if (savedData) {
      this.rehydrate(savedData);
    } else {
      this.initNewWorld();
    }
    if (this.arch) {
      this.arch.currentPopulation = this.globalMetrics.population || 320;
      if (this.arch.resetBoatsForNewWorld) {
        this.arch.resetBoatsForNewWorld(this.arch.currentPopulation);
      }
    }

    // Densidade orgânica equilibrada nas ruas (até 115 civis ativos no Morro Central e bairros)
    const MAX_3D_CIVILIANS = 115;
    if (this.npcs && this.npcs.npcs) {
      const expectedCivilians = Math.min(MAX_3D_CIVILIANS, Math.max(45, Math.floor(this.globalMetrics.population / 10)));
      const currentCivilians = this.npcs.npcs.filter(n =>
        !n.isDedicatedBeachgoer && !n.isBarraqueiro && !n.isScenicMirante && !n.isFisherman &&
        !n.isAthlete && !n.isMateiro && !n.isCapoeira && !n.isHorta && !n.isMototaxi &&
        !n.isSurfer && !n.isCalistenia
      ).length;
      if (currentCivilians < expectedCivilians) {
        const spawnCount = expectedCivilians - Math.max(0, currentCivilians);
        for (let i = 0; i < spawnCount; i++) {
          this.npcs.spawnNewCivilian();
        }
      }
      // Inicializa perfil político de cada cidadão
      this.npcs.npcs.forEach(n => this.politics.ensureNPCPolitics(n));
    }

    // Inicia imediatamente obras ativas no Morro Central (Sol) e nas sementes das extremidades
    if (this.arch && this.arch.activeConstructions && this.arch.activeConstructions.length < 4) {
      ['sol', 'sol', 'prainha', 'varzea'].forEach(fac => {
        if (this.arch.activeConstructions.length >= 4) return;
        this.arch.spawnNewHouse(fac, (completedHouse) => {
          const actualFaction = completedHouse.faction || fac;
          if (this.factions[actualFaction]) {
            this.factions[actualFaction].wealth = Math.max(10, this.factions[actualFaction].wealth - 20);
          }
          const factionInfo = this.factions[actualFaction] || { name: 'Comunidade' };
          this.addEvent(`🎉 Nova moradia concluída em ${factionInfo.name}! Casa de tom ${completedHouse.colorName} entregue na encosta!`, 'build');
          this.performAutoSave();
        });
      });
    }
  }

  initNewWorld() {
    this.totalDays = 1;
    this.speed = 1;
    this.tickTimer = 0;

    // Initial community metrics & active strategic treasury (Caixa Comunitário)
    this.globalMetrics = {
      population: 320,
      wealth: 480,
      water: 95,
      energy: 92,
      culture: 94
    };

    this.lastIncomeBreakdown = {
      comercioPraia: 14,
      feiraVarzea: 12,
      mobilidade: 10,
      contribuicaoCasas: 12,
      total: 48
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
        leader: 'Dona Valéria',
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
        leader: 'Profª Cláudia',
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
      { day: 1, text: '🌱 Novo mundo fundado! 4 comunidades e seus gestores eleitos iniciam a jornada.', type: 'info' },
      { day: 1, text: '🚡 Bondinho da Serra e Cooperativa de Mototáxi em operação nas encostas!', type: 'diplomacy' }
    ];
  }

  rehydrate(data) {
    this.totalDays = data.day || 1;
    this.speed = 1; // Inicializa sempre em 1x ao reabrir/reidratar para garantir ritmo normal estável
    this.tickTimer = 0;
    this.globalMetrics = data.metrics || {
      population: 320,
      wealth: 480,
      water: 95,
      energy: 92,
      culture: 94
    };
    this.lastIncomeBreakdown = data.lastIncomeBreakdown || {
      comercioPraia: 14,
      feiraVarzea: 12,
      mobilidade: 10,
      contribuicaoCasas: 12,
      total: 48
    };
    this.factions = data.factions || {};
    this.diplomacy = data.diplomacy || {};
    this.eventFeed = data.feed || [
      { day: this.totalDays, text: 'Mundo reaberto a partir do save automático.', type: 'info' }
    ];
    if (data.politics && this.politics) {
      this.politics.rehydrate(data.politics);
    }
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

  canAfford(cost) {
    return (this.globalMetrics.wealth || 0) >= cost;
  }

  spendWealth(cost, reason = '') {
    if (!this.canAfford(cost)) {
      this.addEvent(`⚠️ Caixa Comunitário insuficiente (R$ ${this.globalMetrics.wealth})! Necessário: R$ ${cost} para ${reason}.`, 'info');
      return false;
    }
    this.globalMetrics.wealth = Math.max(0, Math.round(this.globalMetrics.wealth - cost));
    this.notifyUpdate();
    return true;
  }

  update(delta) {
    if (this.isPaused) return;

    // Tempo de Simulação Equilibrado: 1 dia dura 7.5s em 1x (ritmo orgânico e legível, sem correr como se estivesse em 5x)
    this.tickTimer += delta * this.speed;
    if (this.tickTimer >= 7.5) {
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

    // 1. População & Ciclo Econômico Estratégico (Arrecadação vs Consumo)
    let totalPop = 0;
    this.arch.houses.forEach(h => {
      totalPop += h.residents;
      h.wealth += Math.floor(Math.random() * 2) + 1;
    });

    const streetPop = (this.npcs && this.npcs.npcs) ? this.npcs.npcs.length : 89;
    const prevPop = this.globalMetrics.population || 320;
    this.globalMetrics.population = totalPop + streetPop;
    if (this.arch) {
      this.arch.currentPopulation = this.globalMetrics.population;
    }

    // Desbloqueio progressivo da frota pesqueira conforme a população atinge 1.000, 1.500 e 2.000 habitantes
    [
      { threshold: 1000, boatName: 'Barco Guanabara (Mestre Bento Caiçara)', count: 2 },
      { threshold: 1500, boatName: 'Saveiro Vento Forte (Mestre Tião da Rede)', count: 3 },
      { threshold: 2000, boatName: 'Saveiro Sol da Várzea (Mestre Dito do Levante)', count: 4 }
    ].forEach(m => {
      if (prevPop < m.threshold && this.globalMetrics.population >= m.threshold) {
        this.addEvent(`⛵ População atingiu ${m.threshold} moradores! ${m.boatName} entrou no mar (${m.count}/4 barcos ativos)!`, 'build');
      }
    });

    // Receitas orgânicas do ciclo diário
    const comercioPraia = 8 + Math.floor(Math.random() * 7);
    const feiraVarzea = 7 + Math.floor(Math.random() * 6);
    const mobilidade = 6 + Math.floor(Math.random() * 5); // Bondinho + Mototáxis
    const contribuicaoCasas = Math.max(6, Math.round(this.arch.houses.length * 1.2));
    const dailyIncome = comercioPraia + feiraVarzea + mobilidade + contribuicaoCasas;

    this.lastIncomeBreakdown = {
      comercioPraia,
      feiraVarzea,
      mobilidade,
      contribuicaoCasas,
      total: dailyIncome
    };

    // Adiciona receita líquida ao Caixa Comunitário
    this.globalMetrics.wealth = Math.round((this.globalMetrics.wealth || 200) + dailyIncome * 0.45);

    // Consumo orgânico suave de Água, Energia e Harmonia conforme a população cresce
    if (this.totalDays % 2 === 0) {
      this.globalMetrics.water = Math.max(55, this.globalMetrics.water - 1);
      this.globalMetrics.energy = Math.max(55, this.globalMetrics.energy - 1);
    }
    if (this.totalDays % 3 === 0 && this.globalMetrics.culture > 75) {
      this.globalMetrics.culture = Math.max(65, this.globalMetrics.culture - 1);
    }

    // Dinâmica Orgânica: Densidade equilibrada (até 115 civis nas ruas dos bairros)
    if (this.npcs && this.npcs.npcs) {
      const expectedCivilians = Math.min(115, Math.max(45, Math.floor(this.globalMetrics.population / 10)));
      const currentCivilians = this.npcs.npcs.filter(n =>
        !n.isDedicatedBeachgoer && !n.isBarraqueiro && !n.isScenicMirante && !n.isFisherman &&
        !n.isAthlete && !n.isMateiro && !n.isCapoeira && !n.isHorta && !n.isMototaxi &&
        !n.isSurfer && !n.isCalistenia
      ).length;
      if (currentCivilians < expectedCivilians) {
        const deficit = Math.min(3, expectedCivilians - currentCivilians);
        for (let s = 0; s < deficit; s++) {
          const newNpc = this.npcs.spawnNewCivilian();
          if (newNpc && this.politics) {
            this.politics.ensureNPCPolitics(newNpc);
          }
        }
      }
    }

    // District economies grow with trade
    Object.keys(this.factions).forEach(fKey => {
      this.factions[fKey].wealth += Math.floor(Math.random() * 4) + 2;
    });

    // 2. IA POLÍTICA, OPINIÃO PÚBLICA & ELEIÇÕES DE GESTORES
    if (this.politics) {
      this.politics.updateElectorateDynamics();

      // Gestores eleitos tomam decisões autônomas a cada 3 dias
      if (this.totalDays % 3 === 0) {
        this.politics.stepGestorAI();
      }

      // Verifica se chegou o Dia de Eleição Geral nas 4 comunidades
      if (this.totalDays - this.politics.lastElectionDay >= this.politics.electionIntervalDays) {
        this.politics.runElectionNow(false);
      }
    }

    // 3. EXPANSÃO TERRITORIAL ORGÂNICA (FOCO NO MORRO CENTRAL & SEMENTES DAS EXTREMIDADES)
    const timeInfo = this.arch && this.arch.env ? this.arch.env.getTimeOfDay() : 'day';
    const phase = (typeof timeInfo === 'string') ? timeInfo : (timeInfo.phase || 'day');
    const isWorkHours = (phase === 'day' || phase === 'sunset');

    const pop = this.globalMetrics.population || 40;
    const maxConstructions = Math.min(6, Math.max(3, Math.floor(pop / 60) + 2));
    const spawnRate = 0.75;

    if (isWorkHours && Math.random() < spawnRate && this.arch.activeConstructions.length < maxConstructions) {
      // 70% das novas ordens de mutirão focam no Morro do Sol (Coração Vivo)
      const chosenFaction = Math.random() < 0.70 ? 'sol' : ['prainha', 'varzea', 'serra'][Math.floor(Math.random() * 3)];

      const buildResult = this.arch.spawnNewHouse(chosenFaction, (completedHouse) => {
        if (!completedHouse) return;
        const actualFaction = completedHouse.faction || chosenFaction;
        if (this.factions[actualFaction]) {
          this.factions[actualFaction].wealth = Math.max(10, this.factions[actualFaction].wealth - 25);
        }
        const factionInfo = this.factions[actualFaction] || { name: 'Comunidade' };
        this.addEvent(`🎉 Nova moradia concluída em ${factionInfo.name}! Casa de tom ${completedHouse.colorName} foi entregue na encosta!`, 'build');
        this.performAutoSave();
      });

      if (buildResult && buildResult.isConstructing) {
        const actualFaction = buildResult.faction || chosenFaction;
        const factionInfo = this.factions[actualFaction] || { name: 'Comunidade' };
        this.addEvent(`🚜 Mutirão de Moradia! Pedreiros e carregadores iniciam obras em ${factionInfo.name}!`, 'build');
      }
    }

    // 4. VERTICAL EXPANSION: PUXADINHOS & LAJES
    const eligibleHouses = this.arch.houses.filter(h => h.level < 3 && h.wealth >= 25 && !h.isUpgrading);
    if (isWorkHours && eligibleHouses.length > 0 && Math.random() < 0.60 && this.arch.activeUpgrades.length < 4) {
      const luckyHouse = eligibleHouses[Math.floor(Math.random() * eligibleHouses.length)];
      const faction = this.factions[luckyHouse.faction] || { name: 'Comunidade' };

      const upgraded = this.arch.upgradeHouse(luckyHouse.id, (upgradedHouse) => {
        upgradedHouse.wealth = Math.max(5, upgradedHouse.wealth - 20);
        this.addEvent(
          `🧱 Puxadinho concluído! A casa de tom ${upgradedHouse.colorName} em ${faction.name} agora possui ${upgradedHouse.level} pavimentos e caixa d'água!`,
          'build'
        );
        this.performAutoSave();
      });

      if (upgraded) {
        this.addEvent(
          `👷 Equipe de obras erguendo andaimes para bater laje na casa de tom ${luckyHouse.colorName} em ${faction.name}!`,
          'build'
        );
      }
    }

    // 5. CONTINENTAL TRADE & HARMONY EVENTS
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
          this.globalMetrics.wealth += 35;
        }
      },
      {
        text: '⛵ Frota pesqueira da Prainha retornou com farto carregamento de pescado fresco distribuído no cais.',
        type: 'resource',
        effect: () => {
          this.globalMetrics.wealth += 30;
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
        text: '🚡 Bondinho da Serra e Mototáxis bateram recorde de passageiros integrando a praia ao topo do morro!',
        type: 'economy',
        effect: () => {
          this.globalMetrics.wealth += 28;
          this.factions.serra.harmony = Math.min(100, this.factions.serra.harmony + 3);
        }
      },
      {
        text: '🔭 Mirante da Vista Imperial bateu recorde de visitantes contemplando a Baía de Guanabara pelas lunetas!',
        type: 'culture',
        effect: () => {
          this.globalMetrics.culture = Math.min(100, this.globalMetrics.culture + 6);
          this.globalMetrics.wealth += 40;
          this.factions.serra.harmony = Math.min(100, this.factions.serra.harmony + 4);
        }
      }
    ];

    const pick = events[Math.floor(Math.random() * events.length)];
    pick.effect();
    this.addEvent(pick.text, pick.type);
  }

  triggerPlayerSamba() {
    const cost = ACTION_COSTS.samba;
    if (!this.spendWealth(cost, 'Festa da Roda de Samba')) return false;
    this.globalMetrics.culture = Math.min(100, this.globalMetrics.culture + 15);
    if (this.politics) this.politics.boostIdeology('cultura', 4);
    this.addEvent(`🎺 Você investiu R$ ${cost} num grande festival de samba unindo os quatro distritos (+15% Harmonia)!`, 'player');
    this.notifyUpdate();
    return true;
  }

  triggerPlayerWater() {
    const cost = ACTION_COSTS.water;
    if (!this.spendWealth(cost, 'Rede de Caixas d\'Água')) return false;
    this.globalMetrics.water = Math.min(100, this.globalMetrics.water + 20);
    this.arch.houses.forEach(h => h.waterLevel = 100);
    if (this.politics) this.politics.boostIdeology('infra', 3);
    this.addEvent(`💧 Investimento de R$ ${cost}: Aqueduto da Serra e caixas d'água comunitárias 100% abastecidas!`, 'player');
    this.notifyUpdate();
    return true;
  }

  triggerPlayerSolar() {
    const cost = ACTION_COSTS.solar;
    if (!this.spendWealth(cost, 'Postes com Painéis Solares')) return false;
    this.globalMetrics.energy = Math.min(100, this.globalMetrics.energy + 16);
    if (this.politics) this.politics.boostIdeology('eco', 4);
    this.addEvent(`☀️ Investimento de R$ ${cost}: Postes solares e redes limpas ativadas em todas as avenidas (+16% Energia)!`, 'player');
    this.notifyUpdate();
    return true;
  }

  addEconomy(amount = 5, reason = 'Comércio na orla da praia') {
    this.globalMetrics.wealth += amount;
    if (Math.random() < 0.12) {
      this.addEvent(`🥥 Comércio aquecido: ${reason} rendeu +R$ ${amount} ao caixa comunitário!`, 'economy');
    }
    this.notifyUpdate();
  }

  getSavePayload() {
    return {
      day: this.totalDays,
      speed: this.speed,
      metrics: { ...this.globalMetrics },
      lastIncomeBreakdown: this.lastIncomeBreakdown,
      factions: this.factions,
      diplomacy: this.diplomacy,
      feed: this.eventFeed,
      politics: this.politics ? this.politics.serialize() : null,
      activeHouses: this.arch.getActiveHousesData()
    };
  }

  performAutoSave() {
    const payload = this.getSavePayload();
    const ok = SaveSystem.save(payload);
    if (ok) {
      const badge = document.getElementById('save-status');
      if (badge) {
        badge.innerText = '💾';
        badge.classList.add('saved-flash');
        setTimeout(() => badge.classList.remove('saved-flash'), 1200);
      }
    }
  }

  resetToNewWorld() {
    SaveSystem.reset();
    this.speed = 1;
    this.tickTimer = 0;
    this.politics = new PoliticsEngine(this);
    this.initNewWorld();
    if (this.npcs) {
      this.npcs.clearAll();
    }
    this.arch.createInitialSettlements(this.arch.allPlateaus, null);

    if (this.npcs) {
      this.npcs.spawnInitialPopulation();
      this.npcs.npcs.forEach(n => this.politics.ensureNPCPolitics(n));
    }

    if (this.arch) {
      this.arch.currentPopulation = this.globalMetrics.population || 320;
      if (this.arch.resetBoatsForNewWorld) {
        this.arch.resetBoatsForNewWorld(this.arch.currentPopulation);
      }
    }

    this.notifyUpdate();
    this.addEvent('✨ Novo Mundo fundado! Morro do Sol inicia como centro vivo com suas moradias e líderes fundadores.', 'info');
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
      lastIncomeBreakdown: this.lastIncomeBreakdown,
      factions: this.factions,
      diplomacy: this.diplomacy,
      politics: this.politics ? this.politics.getSummary() : null,
      feed: this.eventFeed,
      housesCount: this.arch.houses.length,
      factionHouses,
      maxRadius: Math.round(maxRadius),
      expansionStage: stage
    };
  }
}
