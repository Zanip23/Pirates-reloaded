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
