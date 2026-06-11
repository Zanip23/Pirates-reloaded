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

    // Ensure cargo has no 0 or negative items
    if (data.cargo) {
      for (const k in data.cargo) {
        if (data.cargo[k] <= 0) delete data.cargo[k];
      }
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
  localStorage.removeItem(SAVE_KEY);
}