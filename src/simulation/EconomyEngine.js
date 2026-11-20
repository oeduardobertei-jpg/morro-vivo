// EconomyEngine.js
// Motor Econômico das Famílias e Polos Produtivos de Morro Vivo:
// Modela despensa familiar, poupança, ofícios por bairro, estoques nos 5 polos produtivos,
// preços dinâmicos suaves, compras reais dos moradores e gatilhos de obras orgânicas.

export const RESOURCE_META = {
  food:  { key: 'food',  label: 'Alimentos', unit: 'kg', icon: '🐟', minPrice: 2, basePrice: 4, maxPrice: 8 },
  wood:  { key: 'wood',  label: 'Madeira',   unit: 'm³', icon: '🪵', minPrice: 3, basePrice: 6, maxPrice: 12 },
  stone: { key: 'stone', label: 'Alvenaria', unit: 'un', icon: '🧱', minPrice: 4, basePrice: 7, maxPrice: 14 }
};

export const ECONOMY_HUBS = [
  { id: 'pedreira', name: 'Pedreira da Serra',       district: 'serra',   resource: 'stone', x: -46, z: -86, nodeId: 'hub_pedreira', initialStock: 50, cap: 100, baseProd: 12 },
  { id: 'serraria', name: 'Serraria Sustentável',    district: 'varzea',  resource: 'wood',  x: 118, z: -48, nodeId: 'hub_serraria', initialStock: 52, cap: 100, baseProd: 13 },
  { id: 'olaria',   name: 'Olaria da Colina',        district: 'sol',     resource: 'stone', x: -22, z: -14, nodeId: 'olaria_dock',  initialStock: 54, cap: 100, baseProd: 10 },
  { id: 'pier',     name: 'Píer & Cais Pesqueiro',   district: 'prainha', resource: 'food',  x: -78, z: 74,  nodeId: 'coast_w_3',    initialStock: 72, cap: 130, baseProd: 26 },
  { id: 'horta',    name: 'Criação Caipira & Feira', district: 'varzea',  resource: 'food',  x: 64,  z: -31, nodeId: 'hub_criacao',  initialStock: 76, cap: 140, baseProd: 28 }
];

const BRAZILIAN_SURNAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Ferreira', 'Almeida',
  'Nascimento', 'Lima', 'Gomes', 'Ribeiro', 'Carvalho', 'Lopes', 'Araújo', 'Barbosa',
  'Rocha', 'Martins', 'Dias', 'Cavalcanti', 'Cardoso', 'Teixeira', 'Mendes', 'Nunes',
  'Monteiro', 'Moreira', 'Pinto', 'Batista', 'Ramos', 'Machado', 'Santana', 'Azevedo'
];

const DISTRICT_TRADES = {
  sol:     ['Mestre de Obras', 'Ceramista da Olaria', 'Pasteleira', 'Sambista', 'Marceneiro', 'Azulejista'],
  prainha: ['Pescador Artesanal', 'Barraqueira da Orla', 'Mestre de Saveiro', 'Vendedora de Açaí', 'Trançadeira'],
  serra:   ['Técnica Solar', 'Canteiro da Pedreira', 'Horticultora da Serra', 'Operador de Eólica', 'Violeiro'],
  varzea:  ['Serrador Sustentável', 'Feirante', 'Criador Caipira', 'Açougueiro Artesanal', 'Mototaxista']
};

const GOAL_DEFS = {
  1: { type: 'upgrade_l2', label: 'Subir 2º Andar (Puxadinho)', food: 4, wood: 5, stone: 6, money: 45 },
  2: { type: 'upgrade_l3', label: 'Bater Laje Completa',       food: 4, wood: 6, stone: 8, money: 65 },
  3: { type: 'new_house',  label: 'Apoiar Nova Moradia',       food: 6, wood: 8, stone: 9, money: 90 }
};

function hashString(str) {
  const s = String(str || 'morro');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class EconomyEngine {
  constructor(sim = null) {
    this.sim = sim;
    this.hubs = {};
    this._resetHubs();

    this.prices = {
      food: RESOURCE_META.food.basePrice,
      wood: RESOURCE_META.wood.basePrice,
      stone: RESOURCE_META.stone.basePrice
    };
    this.priceTrend = { food: 0, wood: 0, stone: 0 };

    this.dailyStats = {
      produced: { food: 34, wood: 13, stone: 22 },
      consumed: { food: 26, wood: 9, stone: 14 },
      tradesCount: 0
    };
    this.shortages = {
      food: false,
      wood: false,
      stone: false,
      severity: { food: 0, wood: 0, stone: 0 }
    };
    this.recentTrades = [];
    this.tempHubBoosts = {};
    this._cachedHouseSummary = {
      readyForWorkCount: 0,
      restockingCount: 0,
      avgSavings: 45
    };
  }

  _resetHubs() {
    this.hubs = {};
    ECONOMY_HUBS.forEach((def) => {
      this.hubs[def.id] = {
        ...def,
        stock: def.initialStock,
        lastProd: def.baseProd
      };
    });
  }

  /** Garante que uma casa tenha `family` completa (sobrenome, ofício, despensa, meta e poupança). */
  ensureHouseFamily(house, savedFamily = null) {
    if (!house) return null;
    if (savedFamily && typeof savedFamily === 'object') {
      const baseStock = savedFamily.stock || {};
      house.family = {
        surname: savedFamily.surname || BRAZILIAN_SURNAMES[hashString(house.id) % BRAZILIAN_SURNAMES.length],
        trade: savedFamily.trade || 'Comerciante Local',
        savings: Number.isFinite(Number(savedFamily.savings)) ? Number(savedFamily.savings) : (house.wealth || 40),
        stock: {
          food: Number.isFinite(Number(baseStock.food)) ? Number(baseStock.food) : 4.5,
          wood: Number.isFinite(Number(baseStock.wood)) ? Number(baseStock.wood) : 3.5,
          stone: Number.isFinite(Number(baseStock.stone)) ? Number(baseStock.stone) : 4.0
        },
        goal: savedFamily.goal ? { ...savedFamily.goal } : null,
        happiness: Number.isFinite(Number(savedFamily.happiness)) ? Number(savedFamily.happiness) : 86,
        status: savedFamily.status || 'estocando_obra',
        readinessPct: Number.isFinite(Number(savedFamily.readinessPct)) ? Number(savedFamily.readinessPct) : 55,
        lastPurchase: savedFamily.lastPurchase || 'Sem movimentação hoje'
      };
      house.wealth = Math.round(house.family.savings);
      this._updateHouseGoalAndReadiness(house);
      return house.family;
    }

    if (house.family && house.family.stock && house.family.goal) {
      this._updateHouseGoalAndReadiness(house);
      return house.family;
    }

    const h = hashString(house.id);
    const faction = house.faction || 'sol';
    const trades = DISTRICT_TRADES[faction] || DISTRICT_TRADES.sol;
    const surname = BRAZILIAN_SURNAMES[h % BRAZILIAN_SURNAMES.length];
    const trade = trades[(h >>> 5) % trades.length];

    // Semente heterogênea e realista: algumas famílias já quase prontas para bater laje (pilha visível), outras estocando
    const tierFactor = (h % 5) === 0 ? 0.92 : ((h % 3) === 0 ? 0.72 : 0.48);
    const level = house.level || 1;
    const goalDef = GOAL_DEFS[clamp(level, 1, 3)];
    const initialSavings = Math.max(
      house.wealth || 0,
      Math.round(goalDef.money * tierFactor + ((h >>> 8) % 18))
    );

    house.family = {
      surname,
      trade,
      savings: initialSavings,
      stock: {
        food: Number((2.8 + (h % 4) * 0.9).toFixed(1)),
        wood: Number((goalDef.wood * tierFactor).toFixed(1)),
        stone: Number((goalDef.stone * tierFactor).toFixed(1))
      },
      goal: { ...goalDef },
      happiness: 84 + (h % 13),
      status: 'estocando_obra',
      readinessPct: 50,
      lastPurchase: 'Estabelecida na comunidade'
    };
    house.wealth = Math.round(house.family.savings);
    this._updateHouseGoalAndReadiness(house);
    return house.family;
  }

  ensureAllHouses(houses = []) {
    if (!Array.isArray(houses)) return;
    houses.forEach((h) => this.ensureHouseFamily(h));
    this._refreshHouseAggregates(houses);
  }

  _updateHouseGoalAndReadiness(house) {
    const fam = house?.family;
    if (!fam) return;
    const level = clamp(house.level || 1, 1, 3);
    const goalDef = GOAL_DEFS[level];
    fam.goal = { ...goalDef };

    const rFood = clamp((fam.stock.food || 0) / goalDef.food, 0, 1);
    const rWood = clamp((fam.stock.wood || 0) / goalDef.wood, 0, 1);
    const rStone = clamp((fam.stock.stone || 0) / goalDef.stone, 0, 1);
    const rMoney = clamp((fam.savings || 0) / goalDef.money, 0, 1);

    fam.readinessPct = Math.round(((rFood + rWood + rStone + rMoney) / 4) * 100);

    const ready = rFood >= 1 && rWood >= 1 && rStone >= 1 && rMoney >= 1;
    if ((fam.stock.food || 0) < 2.2) {
      fam.status = 'despensa_baixa';
    } else if (ready) {
      fam.status = 'pronta_obra';
    } else if (fam.readinessPct >= 55) {
      fam.status = 'estocando_obra';
    } else {
      fam.status = 'prosperando';
    }

    if (this.sim?.arch?.syncHouseStagingPile) {
      this.sim.arch.syncHouseStagingPile(house);
    }
  }

  _refreshHouseAggregates(houses = []) {
    let readyCount = 0;
    let restockCount = 0;
    let savingsSum = 0;
    for (let i = 0; i < houses.length; i++) {
      const fam = houses[i]?.family;
      if (!fam) continue;
      if (fam.status === 'pronta_obra') readyCount++;
      if (fam.status === 'despensa_baixa') restockCount++;
      savingsSum += fam.savings || 0;
    }
    this._cachedHouseSummary = {
      totalHouses: houses.length,
      readyForWorkCount: readyCount,
      restockingCount: restockCount,
      avgSavings: houses.length > 0 ? Math.round(savingsSum / houses.length) : 0
    };
  }

  getResourceTotals() {
    const totals = { food: 0, wood: 0, stone: 0 };
    const caps = { food: 0, wood: 0, stone: 0 };
    Object.values(this.hubs).forEach((hub) => {
      if (totals[hub.resource] !== undefined) {
        totals[hub.resource] += hub.stock;
        caps[hub.resource] += hub.cap;
      }
    });
    return { totals, caps };
  }

  _consumeFromHubs(resource, amount) {
    let remaining = amount;
    const matching = Object.values(this.hubs)
      .filter((h) => h.resource === resource && h.stock > 0)
      .sort((a, b) => b.stock - a.stock);

    for (let i = 0; i < matching.length && remaining > 0; i++) {
      const hub = matching[i];
      const take = Math.min(hub.stock, remaining);
      hub.stock = Number((hub.stock - take).toFixed(2));
      remaining = Number((remaining - take).toFixed(2));
    }
    return Number((amount - remaining).toFixed(2));
  }

  boostHubProduction(hubId, amount = 10) {
    const hub = this.hubs[hubId];
    if (!hub) return 0;
    const before = hub.stock;
    hub.stock = Math.min(hub.cap, Math.round((hub.stock + amount) * 10) / 10);
    this.tempHubBoosts[hubId] = (this.tempHubBoosts[hubId] || 0) + Math.max(2, Math.round(amount * 0.25));
    return Number((hub.stock - before).toFixed(1));
  }

  _updatePrices(totals, caps) {
    Object.keys(RESOURCE_META).forEach((res) => {
      const meta = RESOURCE_META[res];
      const ratio = caps[res] > 0 ? (totals[res] / caps[res]) : 0.55;
      // Escassez (<0.55) sobe suavemente; fartura (>0.55) barateia suavemente
      const targetPrice = clamp(
        Math.round(meta.basePrice * (1.28 - ratio * 0.55)),
        meta.minPrice,
        meta.maxPrice
      );
      const prev = this.prices[res];
      this.prices[res] = clamp(
        targetPrice === prev ? prev : (prev + Math.sign(targetPrice - prev)),
        meta.minPrice,
        meta.maxPrice
      );
      this.priceTrend[res] = Math.sign(this.prices[res] - prev);

      const lowRatio = clamp((0.28 - ratio) / 0.28, 0, 1);
      this.shortages[res] = ratio < 0.24;
      this.shortages.severity[res] = Number(lowRatio.toFixed(2));
    });
  }

  stepDay(houses = [], factions = {}, day = 1) {
    const produced = { food: 0, wood: 0, stone: 0 };
    const consumed = { food: 0, wood: 0, stone: 0 };
    let tradesCount = 0;

    // 1. Produção diária nos 5 polos produtivos
    const factionCounts = { prainha: 0, sol: 0, serra: 0, varzea: 0 };
    houses.forEach((h) => {
      const fk = h.faction || 'sol';
      if (factionCounts[fk] !== undefined) factionCounts[fk]++;
    });

    Object.values(this.hubs).forEach((hub) => {
      const districtWorkersBonus = Math.min(5, Math.floor((factionCounts[hub.district] || 4) / 5));
      const tempBonus = this.tempHubBoosts[hub.id] || 0;
      if (tempBonus > 0) {
        this.tempHubBoosts[hub.id] = Math.max(0, tempBonus - 1);
      }
      const deltaProd = hub.baseProd + districtWorkersBonus + (tempBonus > 0 ? 3 : 0);
      const actualAdded = Math.min(hub.cap - hub.stock, deltaProd);
      hub.stock = Number((hub.stock + actualAdded).toFixed(1));
      hub.lastProd = Math.round(actualAdded);
      produced[hub.resource] += deltaProd;
    });

    // 2. Ciclo de renda, consumo diário e compras de cada família
    const { totals: currentTotals } = this.getResourceTotals();

    for (let i = 0; i < houses.length; i++) {
      const house = houses[i];
      const fam = this.ensureHouseFamily(house);
      const fk = house.faction || 'sol';

      // Renda diária do ofício familiar + repasse pequeno ao bairro
      const dailyEarned = 7 + ((hashString(house.id + day) % 6));
      fam.savings += dailyEarned;

      // Consumo alimentar proporcional aos moradores
      const residents = house.residents || 4;
      const foodNeed = Math.max(0.4, Math.min(1.1, Number((0.10 * residents).toFixed(1))));
      const eaten = Math.min(fam.stock.food, foodNeed);
      fam.stock.food = Number((fam.stock.food - eaten).toFixed(1));
      consumed.food += eaten;

      // Penalidade leve de humor se faltar alimento na despensa
      if (eaten < foodNeed * 0.65 && currentTotals.food < 18) {
        fam.happiness = clamp(fam.happiness - 2, 55, 100);
      } else {
        fam.happiness = clamp(fam.happiness + 1, 55, 100);
      }

      // Compra diária orgânica de reposição na despensa (até 1.2kg por dia)
      if (fam.stock.food < 4.5 && fam.savings >= this.prices.food) {
        const bought = this._consumeFromHubs('food', 1.2);
        if (bought > 0) {
          const spend = Math.round((bought / 2.0) * this.prices.food);
          fam.savings = Math.max(0, fam.savings - spend);
          fam.stock.food = Number((fam.stock.food + bought).toFixed(1));
          fam.lastPurchase = `Comprou ${bought.toFixed(1)}kg na feira/cais (-R$ ${spend})`;
          if (factions[fk]) factions[fk].wealth += Math.max(1, Math.round(spend * 0.25));
          tradesCount++;
        }
      }

      // Compra direcionada para a meta construtiva da casa (Madeira / Alvenaria)
      const goal = fam.goal;
      if (goal && fam.stock.food >= 2.2) {
        const needWood = Math.max(0, goal.wood - fam.stock.wood);
        const needStone = Math.max(0, goal.stone - fam.stock.stone);
        const targetRes = needStone >= needWood ? (needStone > 0.2 ? 'stone' : null) : (needWood > 0.2 ? 'wood' : null);
        if (targetRes && fam.savings >= this.prices[targetRes] + 6) {
          const boughtMat = this._consumeFromHubs(targetRes, 1.5);
          if (boughtMat > 0) {
            const spend = Math.round((boughtMat / 1.5) * this.prices[targetRes]);
            fam.savings = Math.max(0, fam.savings - spend);
            fam.stock[targetRes] = Number((fam.stock[targetRes] + boughtMat).toFixed(1));
            consumed[targetRes] += boughtMat;
            const matLabel = targetRes === 'wood' ? 'tábuas da Serraria' : 'tijolos/pedra';
            fam.lastPurchase = `Estocou ${boughtMat.toFixed(1)} de ${matLabel}`;
            if (factions[fk]) factions[fk].wealth += Math.max(1, Math.round(spend * 0.3));
            tradesCount++;
          }
        }
      }

      house.wealth = Math.round(fam.savings);
      this._updateHouseGoalAndReadiness(house);
    }

    const { totals, caps } = this.getResourceTotals();
    this._updatePrices(totals, caps);
    this.dailyStats = {
      produced: {
        food: Math.round(produced.food),
        wood: Math.round(produced.wood),
        stone: Math.round(produced.stone)
      },
      consumed: {
        food: Math.round(consumed.food),
        wood: Math.round(consumed.wood),
        stone: Math.round(consumed.stone)
      },
      tradesCount: tradesCount + this.recentTrades.filter((t) => t.day === day).length
    };
    this._refreshHouseAggregates(houses);

    return {
      totals,
      caps,
      prices: { ...this.prices },
      shortages: { ...this.shortages, severity: { ...this.shortages.severity } },
      dailyStats: this.dailyStats
    };
  }

  /** Seleciona casa pronta para puxadinho cujos estoques/poupança atingiram a meta e consome os insumos. */
  pickHouseReadyForUpgrade(eligibleHouses = []) {
    if (!Array.isArray(eligibleHouses) || eligibleHouses.length === 0) return null;
    const ready = eligibleHouses.filter((h) => {
      const fam = this.ensureHouseFamily(h);
      const g = fam.goal;
      return fam.stock.wood >= g.wood && fam.stock.stone >= g.stone && fam.stock.food >= g.food && fam.savings >= g.money;
    });
    const pool = ready.length > 0 ? ready : eligibleHouses.filter((h) => {
      const fam = this.ensureHouseFamily(h);
      return fam.readinessPct >= 82 && fam.savings >= 28;
    });
    if (pool.length === 0) return null;

    pool.sort((a, b) => (b.family?.readinessPct || 0) - (a.family?.readinessPct || 0));
    const chosen = pool[0];
    this.consumeUpgradeResources(chosen);
    return chosen;
  }

  consumeUpgradeResources(house) {
    const fam = this.ensureHouseFamily(house);
    const g = fam.goal;
    fam.stock.wood = Number(Math.max(1.0, fam.stock.wood - g.wood * 0.75).toFixed(1));
    fam.stock.stone = Number(Math.max(1.0, fam.stock.stone - g.stone * 0.75).toFixed(1));
    fam.stock.food = Number(Math.max(1.5, fam.stock.food - 1.5).toFixed(1));
    fam.savings = Math.max(10, Math.round(fam.savings - Math.min(fam.savings * 0.65, g.money * 0.6)));
    house.wealth = fam.savings;
    fam.lastPurchase = `Aplicou estoque na ampliação da casa`;
    this._updateHouseGoalAndReadiness(house);
  }

  /** Verifica e consome madeira, alvenaria e víveres reais para fundar uma nova moradia. */
  consumeNewHouseResources(houses = [], preferredFaction = null) {
    // 1. Tenta patrocínio direto de família nível 3 com poupança & materiais completos
    const sponsor = houses.find((h) => {
      if ((h.level || 1) < 3) return false;
      if (preferredFaction && h.faction !== preferredFaction) return false;
      const fam = this.ensureHouseFamily(h);
      return fam.status === 'pronta_obra' && fam.savings >= 75;
    });
    if (sponsor) {
      const fam = sponsor.family;
      fam.stock.wood = Number(Math.max(1.5, fam.stock.wood - 6).toFixed(1));
      fam.stock.stone = Number(Math.max(1.5, fam.stock.stone - 6).toFixed(1));
      fam.stock.food = Number(Math.max(2.0, fam.stock.food - 3).toFixed(1));
      fam.savings = Math.max(18, fam.savings - 55);
      sponsor.wealth = fam.savings;
      fam.lastPurchase = `Apoiou nova moradia da família`;
      this._updateHouseGoalAndReadiness(sponsor);
      return { ok: true, sponsorSurname: fam.surname };
    }

    // 2. Caso contrário, utiliza excedentes comunitários dos polos (Serraria + Pedreira/Olaria + Cais/Criação)
    const { totals } = this.getResourceTotals();
    if (totals.wood >= 5 && totals.stone >= 5 && totals.food >= 4) {
      this._consumeFromHubs('wood', 5);
      this._consumeFromHubs('stone', 5);
      this._consumeFromHubs('food', 4);
      return { ok: true, sponsorSurname: null };
    }

    // Mutirão pioneiro nos 2 primeiros dias mantém crescimento inicial mesmo sob estoque baixo
    if (this.sim && this.sim.totalDays <= 2) {
      return { ok: true, sponsorSurname: null };
    }

    return { ok: false, missing: totals.wood < 5 ? 'Madeira' : (totals.stone < 5 ? 'Alvenaria' : 'Alimentos') };
  }

  /** Compra real em campo quando o NPC se aproxima de um ponto comercial ou polo. */
  executeNpcHouseholdPurchase(npc, spot) {
    if (!spot || !npc) return { ok: false };
    const houses = this.sim?.arch?.houses || [];
    let house = npc.homeHouseId ? houses.find((h) => h.id === npc.homeHouseId) : null;
    if (!house && houses.length > 0 && npc.group) {
      let bestDist = Infinity;
      for (let i = 0; i < houses.length; i++) {
        const d = Math.hypot(houses[i].position.x - npc.group.position.x, houses[i].position.z - npc.group.position.z);
        if (d < bestDist) {
          bestDist = d;
          house = houses[i];
        }
      }
      if (house) {
        npc.homeHouseId = house.id;
        npc.familySurname = house.family?.surname || null;
      }
    }

    const res = spot.resource || (spot.type === 'masonry' ? 'stone' : (spot.type === 'wood' ? 'wood' : 'food'));
    const hubId = spot.hubId || (res === 'wood' ? 'serraria' : (res === 'stone' ? 'olaria' : (spot.district === 'prainha' ? 'pier' : 'horta')));
    const hub = this.hubs[hubId] || Object.values(this.hubs).find((h) => h.resource === res);

    const fam = house ? this.ensureHouseFamily(house) : null;
    const unitPrice = this.prices[res] || 4;
    const qty = res === 'food' ? 0.8 : 1.0;

    if (fam) {
      const capRes = res === 'food' ? (fam.goal.food + 4.0) : (fam.goal[res] + 2.0);
      // Evita desperdiçar dinheiro caso a família já tenha estoque de sobra desse item
      if (fam.stock[res] >= capRes && res !== 'food') {
        return { ok: false };
      }
      if (fam.savings < unitPrice) {
        return { ok: false };
      }
    }

    if (hub && hub.stock >= qty) {
      hub.stock = Number((hub.stock - qty).toFixed(1));
    } else if (this._consumeFromHubs(res, qty) <= 0) {
      return { ok: false };
    }

    const value = Math.max(2, Math.round(unitPrice * (res === 'food' ? 0.75 : 1.0)));
    if (fam) {
      fam.savings = Math.max(0, fam.savings - value);
      fam.stock[res] = Number((fam.stock[res] + qty).toFixed(1));
      fam.lastPurchase = `${spot.itemName} (-R$ ${value})`;
      house.wealth = Math.round(fam.savings);
      this._updateHouseGoalAndReadiness(house);
    }

    this._recordTrade({
      day: this.sim?.totalDays || 1,
      text: `${npc.citizenName}${fam ? ` (Fam. ${fam.surname})` : ''} adquiriu ${spot.itemName}`,
      resource: res,
      amount: value
    });

    return {
      ok: true,
      value,
      resource: res,
      familySurname: fam?.surname || null
    };
  }

  /** Seleciona rota de carreto real entre polos produtores e destinos de consumo/obra. */
  pickSupplyTransferRoute() {
    const candidates = [];
    const ped = this.hubs.pedreira;
    const olaria = this.hubs.olaria;
    const serraria = this.hubs.serraria;
    const pier = this.hubs.pier;
    const horta = this.hubs.horta;

    if (ped && olaria && ped.stock >= 22 && olaria.stock < olaria.cap - 8) {
      candidates.push({
        id: 'pedreira_olaria',
        fromHubId: 'pedreira',
        toHubId: 'olaria',
        fromNodeId: 'hub_pedreira',
        toNodeId: 'olaria_dock',
        resource: 'stone',
        qty: 6,
        district: 'sol',
        actionLabel: '🪨 Carreto real: levando pedra bruta da Pedreira para a Olaria'
      });
    }

    if (serraria && serraria.stock >= 20) {
      candidates.push({
        id: 'serraria_obra',
        fromHubId: 'serraria',
        toHubId: 'olaria',
        fromNodeId: 'hub_serraria',
        toNodeId: 'varzea_market',
        resource: 'wood',
        qty: 6,
        district: 'varzea',
        actionLabel: '🪵 Carreto real: levando vigas da Serraria para o Mercado & Obras'
      });
    }

    if (pier && horta && pier.stock >= 22 && horta.stock < horta.cap - 8) {
      candidates.push({
        id: 'pier_feira',
        fromHubId: 'pier',
        toHubId: 'horta',
        fromNodeId: 'coast_w_3',
        toNodeId: 'varzea_market',
        resource: 'food',
        qty: 6,
        district: 'varzea',
        actionLabel: '🐟 Carreto real: levando pescado fresco do Píer para a Feira da Várzea'
      });
    }

    if (candidates.length === 0) return null;
    const route = candidates[Math.floor(Math.random() * candidates.length)];
    const src = this.hubs[route.fromHubId];
    if (src) {
      src.stock = Number(Math.max(0, src.stock - route.qty).toFixed(1));
    }
    return route;
  }

  completeSupplyTransfer(route) {
    if (!route) return '';
    const dst = this.hubs[route.toHubId];
    if (dst) {
      dst.stock = Number(Math.min(dst.cap, dst.stock + route.qty).toFixed(1));
    }
    const labelMap = {
      pedreira_olaria: `🪨 Carreto entregue: +${route.qty} blocos da Pedreira da Serra reforçaram a Olaria!`,
      serraria_obra: `🪵 Carreto entregue: +${route.qty} vigas da Serraria Sustentável abasteceram as obras!`,
      pier_feira: `🐟 Carreto entregue: +${route.qty}kg de pescado do Píer chegaram ao Açougue & Feira!`
    };
    const msg = labelMap[route.id] || `🚚 Carreto comunitário concluído!`;
    this._recordTrade({
      day: this.sim?.totalDays || 1,
      text: msg.replace(/^[^\s]+\s/, ''),
      resource: route.resource,
      amount: route.qty
    });
    return msg;
  }

  _recordTrade(entry) {
    this.recentTrades.unshift(entry);
    if (this.recentTrades.length > 8) {
      this.recentTrades.pop();
    }
  }

  getSummary() {
    const { totals, caps } = this.getResourceTotals();
    return {
      hubs: Object.values(this.hubs).map((h) => ({ ...h })),
      totals,
      caps,
      prices: { ...this.prices },
      priceTrend: { ...this.priceTrend },
      dailyStats: {
        produced: { ...this.dailyStats.produced },
        consumed: { ...this.dailyStats.consumed },
        tradesCount: this.dailyStats.tradesCount
      },
      shortages: {
        ...this.shortages,
        severity: { ...this.shortages.severity }
      },
      houseSummary: { ...this._cachedHouseSummary },
      recentTrades: this.recentTrades.slice(0, 5)
    };
  }

  serialize() {
    const hubsStock = {};
    Object.keys(this.hubs).forEach((id) => {
      hubsStock[id] = this.hubs[id].stock;
    });
    return {
      hubsStock,
      prices: { ...this.prices },
      priceTrend: { ...this.priceTrend },
      dailyStats: this.dailyStats,
      shortages: this.shortages,
      recentTrades: this.recentTrades.slice(0, 8)
    };
  }

  rehydrate(saved) {
    if (!saved || typeof saved !== 'object') return;
    if (saved.hubsStock && typeof saved.hubsStock === 'object') {
      Object.keys(saved.hubsStock).forEach((id) => {
        if (this.hubs[id] && Number.isFinite(Number(saved.hubsStock[id]))) {
          this.hubs[id].stock = clamp(Number(saved.hubsStock[id]), 0, this.hubs[id].cap);
        }
      });
    }
    if (saved.prices) this.prices = { ...this.prices, ...saved.prices };
    if (saved.priceTrend) this.priceTrend = { ...this.priceTrend, ...saved.priceTrend };
    if (saved.dailyStats) this.dailyStats = { ...this.dailyStats, ...saved.dailyStats };
    if (saved.shortages) this.shortages = { ...this.shortages, ...saved.shortages };
    if (Array.isArray(saved.recentTrades)) this.recentTrades = saved.recentTrades.slice(0, 8);
  }
}

