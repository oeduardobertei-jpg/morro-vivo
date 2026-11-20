// Professional Multi-Slot Save & Persistence Engine for Morro Vivo
// Manages up to 4 save slots in localStorage, migrates legacy v1 saves, and handles rehydration

const SAVE_KEY_V2 = 'MORRO_VIVO_SAVES_V2';
const LEGACY_SAVE_KEY = 'MORRO_VIVO_SAVE_DATA_V1';
export const SLOT_IDS = ['slot-1', 'slot-2', 'slot-3', 'slot-4'];

function sanitizeHouses(activeHouses, legacySanitize = false) {
  const list = Array.isArray(activeHouses) ? activeHouses.filter(Boolean) : [];
  if (!legacySanitize) return list;
  return list.filter((h) => !(Math.abs(h.x) <= 32 && h.z <= -65));
}

function createEmptyStore() {
  return { version: 2, activeSlotId: null, slots: {} };
}

function readStore() {
  try {
    const rawV2 = localStorage.getItem(SAVE_KEY_V2);
    if (rawV2 !== null) {
      const parsed = JSON.parse(rawV2);
      if (parsed && typeof parsed === 'object' && parsed.slots && typeof parsed.slots === 'object') {
        return {
          version: 2,
          activeSlotId: SLOT_IDS.includes(parsed.activeSlotId) ? parsed.activeSlotId : null,
          slots: parsed.slots
        };
      }
      return createEmptyStore();
    }

    // One-time migration from legacy v1 key
    const rawV1 = localStorage.getItem(LEGACY_SAVE_KEY);
    if (rawV1) {
      const legacy = JSON.parse(rawV1);
      if (legacy && legacy.activeHouses && legacy.metrics) {
        const store = {
          version: 2,
          activeSlotId: 'slot-1',
          slots: {
            'slot-1': {
              schemaVersion: 1,
              migratedFromV1: true,
              id: 'slot-1',
              name: legacy.name || 'Morro do Sol',
              timestamp: legacy.timestamp || Date.now(),
              day: legacy.day || 1,
              phase: legacy.phase || 'day',
              cycleProgress: typeof legacy.cycleProgress === 'number' ? legacy.cycleProgress : null,
              speed: 1,
              metrics: legacy.metrics,
              lastIncomeBreakdown: legacy.lastIncomeBreakdown || null,
              factions: legacy.factions || {},
              diplomacy: legacy.diplomacy || {},
              politics: legacy.politics || null,
              economy: legacy.economy || null,
              feed: Array.isArray(legacy.feed) ? legacy.feed.slice(0, 20) : [],
              activeHouses: sanitizeHouses(legacy.activeHouses, true)
            }
          }
        };
        writeStore(store);
        return store;
      }
    }
  } catch (e) {
    console.warn('Failed to read save store:', e);
  }
  return createEmptyStore();
}

function writeStore(store) {
  try {
    localStorage.setItem(SAVE_KEY_V2, JSON.stringify(store));
    return true;
  } catch (e) {
    console.warn('Failed to write save store:', e);
    return false;
  }
}

export class SaveSystem {
  static listSlots() {
    const store = readStore();
    const activeId = store.activeSlotId;
    return SLOT_IDS.map((id, idx) => {
      const entry = store.slots[id];
      if (!entry || !entry.metrics) {
        return {
          id,
          index: idx + 1,
          empty: true,
          name: `Espaço ${idx + 1}`,
          day: 0,
          population: 0,
          wealth: 0,
          housesCount: 0,
          timestamp: 0,
          phase: 'day',
          isActive: activeId === id
        };
      }
      return {
        id,
        index: idx + 1,
        empty: false,
        name: entry.name || 'Morro do Sol',
        day: entry.day || 1,
        population: entry.metrics.population || 0,
        wealth: entry.metrics.wealth || 0,
        housesCount: Array.isArray(entry.activeHouses) ? entry.activeHouses.length : 0,
        timestamp: entry.timestamp || 0,
        phase: entry.phase || 'day',
        isActive: activeId === id
      };
    });
  }

  static getActiveSlotId() {
    const store = readStore();
    return store.activeSlotId;
  }

  static setActiveSlotId(slotId) {
    const store = readStore();
    store.activeSlotId = SLOT_IDS.includes(slotId) ? slotId : null;
    writeStore(store);
  }

  static getLatestSlot() {
    const store = readStore();
    if (store.activeSlotId && store.slots[store.activeSlotId]) {
      return this.load(store.activeSlotId);
    }
    let bestId = null;
    let bestTs = -1;
    for (const id of SLOT_IDS) {
      const entry = store.slots[id];
      if (entry && entry.metrics && (entry.timestamp || 0) >= bestTs) {
        bestTs = entry.timestamp || 0;
        bestId = id;
      }
    }
    return bestId ? this.load(bestId) : null;
  }

  static findFirstEmptySlot() {
    const store = readStore();
    for (const id of SLOT_IDS) {
      if (!store.slots[id] || !store.slots[id].metrics) return id;
    }
    return store.activeSlotId || 'slot-1';
  }

  static save(data, slotId = null) {
    try {
      const store = readStore();
      const targetId = SLOT_IDS.includes(slotId)
        ? slotId
        : (SLOT_IDS.includes(store.activeSlotId) ? store.activeSlotId : 'slot-1');

      const existing = store.slots[targetId];
      const worldName = (typeof data.name === 'string' && data.name.trim())
        ? data.name.trim().slice(0, 28)
        : (existing?.name || 'Morro do Sol');

      const payload = {
        schemaVersion: 2,
        id: targetId,
        name: worldName,
        timestamp: Date.now(),
        day: data.day || 1,
        phase: data.phase || 'day',
        cycleProgress: typeof data.cycleProgress === 'number' ? data.cycleProgress : null,
        speed: 1, // Sane default: sempre persiste 1x para que reaberturas e novos mundos nunca iniciem travados em 5x
        metrics: data.metrics,
        lastIncomeBreakdown: data.lastIncomeBreakdown || null,
        factions: data.factions,
        diplomacy: data.diplomacy,
        politics: data.politics || null,
        economy: data.economy || null,
        feed: data.feed ? data.feed.slice(0, 20) : [],
        activeHouses: sanitizeHouses(data.activeHouses)
      };

      store.slots[targetId] = payload;
      store.activeSlotId = targetId;
      return writeStore(store);
    } catch (e) {
      console.warn('Failed to save game data:', e);
      return false;
    }
  }

  static load(slotId = null) {
    try {
      const store = readStore();
      let entry = null;
      if (slotId && SLOT_IDS.includes(slotId)) {
        entry = store.slots[slotId] || null;
      } else {
        const targetId = store.activeSlotId && store.slots[store.activeSlotId]
          ? store.activeSlotId
          : SLOT_IDS.find((id) => store.slots[id] && store.slots[id].metrics);
        entry = targetId ? store.slots[targetId] : null;
      }
      if (!entry || !entry.activeHouses || !entry.metrics) return null;
      const isLegacy = Boolean(entry.migratedFromV1 && (!entry.schemaVersion || entry.schemaVersion < 2));
      return {
        ...entry,
        activeHouses: sanitizeHouses(entry.activeHouses, isLegacy)
      };
    } catch (e) {
      console.warn('Failed to load game data:', e);
      return null;
    }
  }

  static deleteSlot(slotId) {
    if (!SLOT_IDS.includes(slotId)) return false;
    const store = readStore();
    delete store.slots[slotId];
    if (store.activeSlotId === slotId) {
      let fallbackId = null;
      let bestTs = -1;
      for (const id of SLOT_IDS) {
        const entry = store.slots[id];
        if (entry && entry.metrics && (entry.timestamp || 0) >= bestTs) {
          bestTs = entry.timestamp || 0;
          fallbackId = id;
        }
      }
      store.activeSlotId = fallbackId;
    }
    return writeStore(store);
  }

  static reset(slotId = null) {
    const targetId = SLOT_IDS.includes(slotId)
      ? slotId
      : (this.getActiveSlotId() || 'slot-1');
    return this.deleteSlot(targetId);
  }

  static hasSave() {
    return Boolean(this.getLatestSlot());
  }
}
