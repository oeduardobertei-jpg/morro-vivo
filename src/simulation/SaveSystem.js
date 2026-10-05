// Professional Save & Persistence Engine for Morro Vivo
// Manages auto-save to localStorage, state rehydration, and new world initialization

const SAVE_KEY = 'MORRO_VIVO_SAVE_DATA_V1';

export class SaveSystem {
  static save(data) {
    try {
      const payload = {
        timestamp: Date.now(),
        day: data.day,
        speed: data.speed,
        metrics: data.metrics,
        factions: data.factions,
        diplomacy: data.diplomacy,
        feed: data.feed ? data.feed.slice(0, 20) : [],
        activeHouses: (data.activeHouses || []).filter(h => !(Math.abs(h.x) <= 32 && h.z <= -65))
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('Failed to save game data:', e);
      return false;
    }
  }

  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.activeHouses && parsed.metrics) {
        parsed.activeHouses = parsed.activeHouses.filter(h => !(Math.abs(h.x) <= 32 && h.z <= -65));
        return parsed;
      }
      return null;
    } catch (e) {
      console.warn('Failed to load game data:', e);
      return null;
    }
  }

  static reset() {
    try {
      localStorage.removeItem(SAVE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  static hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }
}
