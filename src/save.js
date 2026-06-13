const SAVE_KEY = 'blackTideTrader_save';

export function saveGame(player) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(player));
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;

    if (!data.cargo || typeof data.cargo !== 'object' || Array.isArray(data.cargo)) {
      data.cargo = {};
    }

    // Ensure cargo has only positive whole item counts.
    for (const k in data.cargo) {
      const qty = Math.floor(Number(data.cargo[k]));
      if (!Number.isFinite(qty) || qty <= 0) {
        delete data.cargo[k];
      } else {
        data.cargo[k] = qty;
      }
    }

    if (!data.upgradeLevel || typeof data.upgradeLevel !== 'object' || Array.isArray(data.upgradeLevel)) {
      data.upgradeLevel = {};
    }

    // Crew-Erfahrung & Skills (ab Version 4)
    if (typeof data.crewXP !== 'number') data.crewXP = 0;
    if (typeof data.crewLevel !== 'number' || data.crewLevel < 1) data.crewLevel = 1;
    if (typeof data.skillPoints !== 'number') data.skillPoints = 0;
    if (!data.skills || typeof data.skills !== 'object' || Array.isArray(data.skills)) {
      data.skills = { gunneryLead: 0, gunneryGrouping: 0, reload: 0, plunder: 0 };
    }
    for (const k of ['gunneryLead', 'gunneryGrouping', 'reload', 'plunder']) {
      if (typeof data.skills[k] !== 'number' || data.skills[k] < 0) data.skills[k] = 0;
    }

    if (!Array.isArray(data.ownedPorts)) data.ownedPorts = ['port_haven'];
    if (!data.portUpgrades || typeof data.portUpgrades !== 'object') data.portUpgrades = {};
    if (!data.portWarehouse || typeof data.portWarehouse !== 'object') data.portWarehouse = {};
    if (typeof data.teleportLastDay !== 'number') data.teleportLastDay = 0;

    // Migrate from old map coordinate system (old map was 2400×1600)
    if (data.x < 1000 || data.y < 1000) { data.x = 2500; data.y = 2420; }

    return data;
  } catch (e) {
    return null;
  }
}

export function hasSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' && data.day !== undefined;
  } catch (e) {
    return false;
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.warn('Delete save failed:', e);
  }
}
