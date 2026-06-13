// ─────────────────────────────────────────────────────────────────────────
// Entwickler-Panel (Dev-Tuning-Overlay)
//
// Ein schlichtes HTML-Overlay (bewusst KEIN Pixel-Look) das jede Stellschraube
// des Spiels live editierbar macht. Werte werden sofort angewendet — das Spiel
// liest TUNING und die Datentabellen jeden Frame neu.
//
// Workflow: im Panel Werte ausprobieren → "Export" → die Werte herüberkopieren,
// damit sie als neue Defaults im Code gesetzt werden.
//
// Änderungen werden im Browser-Speicher (localStorage) gehalten, damit sie
// einen Reload überleben. "Zurücksetzen" stellt die Code-Defaults wieder her.
// ─────────────────────────────────────────────────────────────────────────

import { TUNING } from './config.js';
import {
  PIRATE_TIERS, GOODS, UPGRADES, PORT_UPGRADES, PORTS, INITIAL_PLAYER,
} from './data.js';

const STORE_KEY = 'pirates_dev_tuning_v1';
const deepClone = (o) => JSON.parse(JSON.stringify(o));

// Alle live-editierbaren Datenquellen in einem Snapshot. Wird für Export,
// Persistenz und Reset genutzt.
function liveSnapshot() {
  return {
    tuning: TUNING,
    pirateTiers: PIRATE_TIERS,
    goods: GOODS,
    upgrades: UPGRADES,
    portUpgrades: PORT_UPGRADES,
    ports: PORTS,
    initialPlayer: INITIAL_PLAYER,
  };
}

// Kopiert Blattwerte aus src nach target, OHNE Referenzen zu ersetzen — wichtig,
// weil andere Module (und gespawnte Piraten) dieselben Objekt-/Array-Referenzen
// halten.
function assignDeep(target, src) {
  if (Array.isArray(src) && Array.isArray(target)) {
    for (let i = 0; i < src.length && i < target.length; i++) {
      if (typeof src[i] === 'object' && src[i] !== null) assignDeep(target[i], src[i]);
      else target[i] = src[i];
    }
    return;
  }
  for (const k of Object.keys(src)) {
    if (typeof src[k] === 'object' && src[k] !== null && typeof target[k] === 'object' && target[k] !== null) {
      assignDeep(target[k], src[k]);
    } else {
      target[k] = src[k];
    }
  }
}

let DEFAULTS = null; // pristine Code-Defaults, vor dem Laden persistierter Werte

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(liveSnapshot())); } catch (e) { /* ignore */ }
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) assignDeep(liveSnapshot(), JSON.parse(raw));
    return !!raw;
  } catch (e) { return false; }
}

// ── kleine DOM-Helfer ─────────────────────────────────────────────────────
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// Erzeugt eine Eingabezeile aus einem Felddeskriptor {label, desc, get, set, step}.
function fieldRow(d, onChange) {
  const row = el('div', 'dp-row');
  const head = el('div', 'dp-row-head');
  const lbl = el('label', 'dp-label', d.label);
  const input = el('input', 'dp-input');
  input.type = 'number';
  if (d.step != null) input.step = d.step;
  input.value = d.get();
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    if (!Number.isNaN(v)) { d.set(v); persist(); if (onChange) onChange(); }
  });
  d._input = input;
  head.append(lbl, input);
  const desc = el('div', 'dp-desc', d.desc);
  row.append(head, desc);
  return row;
}

function fieldGrid(fields, onChange) {
  const grid = el('div', 'dp-grid');
  fields.forEach(f => grid.append(fieldRow(f, onChange)));
  return grid;
}

function card(title, body) {
  const c = el('div', 'dp-card');
  if (title) c.append(el('div', 'dp-card-title', title));
  c.append(body);
  return c;
}

// ── Felddeskriptoren ──────────────────────────────────────────────────────
function tierFields(t) {
  return [
    { label: 'Rumpf-HP',     desc: 'Trefferpunkte — wie viel Schaden der Pirat aushält.', get: () => t.hull, set: v => t.hull = v },
    { label: 'Schaden min',  desc: 'Kleinster Schaden pro Kugel.', get: () => t.dmg[0], set: v => t.dmg[0] = v },
    { label: 'Schaden max',  desc: 'Größter Schaden pro Kugel.', get: () => t.dmg[1], set: v => t.dmg[1] = v },
    { label: 'Tempo',        desc: 'Grundgeschwindigkeit (px/s). Angriff/Patrouille multiplizieren das.', get: () => t.speed, set: v => t.speed = v },
    { label: 'Reichweite',   desc: 'Max. Schussreichweite (px). Feuert nur, wenn der Spieler näher ist.', get: () => t.range, set: v => t.range = v },
    { label: 'Ladezeit (ms)',desc: 'Pause zwischen Salven. Kleiner = feuert häufiger.', get: () => t.fireRate, set: v => t.fireRate = v },
    { label: 'Beute min',    desc: 'Kleinste Goldbeute beim Versenken.', get: () => t.loot[0], set: v => t.loot[0] = v },
    { label: 'Beute max',    desc: 'Größte Goldbeute beim Versenken.', get: () => t.loot[1], set: v => t.loot[1] = v },
    { label: 'Aggro-Radius', desc: 'Distanz (px), ab der der Pirat zum Angriff übergeht.', get: () => t.aggro, set: v => t.aggro = v },
    { label: 'Salve',        desc: 'Kugeln pro Breitseite (gleichzeitig abgefeuert).', step: 1, get: () => t.salvo, set: v => t.salvo = v },
    { label: 'Streuung',     desc: 'Zielungenauigkeit / Fächerbreite (rad). Kleiner = präziser.', step: 0.005, get: () => t.spread, set: v => t.spread = v },
    { label: 'Halte-Distanz',desc: 'Idealabstand (px), den der Pirat im Kampf umkreist.', get: () => t.standoff, set: v => t.standoff = v },
    { label: 'Vorhalten',    desc: 'Wie exakt bewegte Ziele vorgehalten werden (1 = perfekt, 0 = gar nicht). Niedriger = Umkreisen weicht aus.', step: 0.05, get: () => t.leadFactor, set: v => t.leadFactor = v },
  ];
}

// Generischer Helfer: Felder für ein TUNING-Unterobjekt aus einer Beschreibungstabelle.
function objFields(obj, rows) {
  return rows.map(([key, label, desc, step]) => ({
    label, desc, step,
    get: () => obj[key], set: v => obj[key] = v,
  }));
}

// ── Tab-Aufbau ────────────────────────────────────────────────────────────
function buildEnemiesTab() {
  const wrap = el('div');
  wrap.append(el('div', 'dp-hint', 'Werte je Piraten-Stufe. Änderungen wirken sofort, auch auf bereits gespawnte Schiffe.'));
  PIRATE_TIERS.forEach((t, i) => {
    wrap.append(card(`${i}: ${t.name}`, fieldGrid(tierFields(t))));
  });
  return wrap;
}

function buildPlayerTab() {
  const wrap = el('div');
  wrap.append(card('Startwerte (neues Spiel)', fieldGrid(objFields(INITIAL_PLAYER, [
    ['gold', 'Startgold', 'Gold zu Spielbeginn.'],
    ['hull', 'Start-Rumpf', 'Rumpf-HP zu Spielbeginn.'],
    ['crew', 'Mannschaft', 'Start-Mannschaft. Beeinflusst das Tempo (siehe Crew-Faktor).'],
    ['maxCrew', 'Max. Mannschaft', 'Obergrenze der Mannschaft.'],
    ['morale', 'Moral', 'Start-Moral (0–100).'],
  ]))));
  wrap.append(card('Schiffsbasis & Upgrade-Zugewinn', fieldGrid(objFields(TUNING.player, [
    ['baseMaxHull', 'Basis Rumpf-HP', 'Rumpf-HP ohne Upgrades.'],
    ['hullPerLevel', '+ Rumpf je Stufe', 'Zusätzliche Rumpf-HP je "Rumpfverstärkung".'],
    ['baseDamage', 'Basis Schaden', 'Schaden/Kugel ohne Upgrades.'],
    ['damagePerLevel', '+ Schaden je Stufe', 'Zusätzlicher Schaden je "Schwere Kanonen".'],
    ['baseFireRate', 'Basis Ladezeit (ms)', 'Nachladezeit ohne Upgrades.'],
    ['fireRatePerLevel', '− Ladezeit je Stufe', 'Verkürzung der Ladezeit je "Schwere Kanonen".'],
    ['baseSpeed', 'Basis Tempo', 'Schiffstempo ohne Upgrades (px/s).'],
    ['speedPerLevel', '+ Tempo je Stufe', 'Zusätzliches Tempo je "Schnelle Segel".'],
    ['baseCargo', 'Basis Frachtraum', 'Frachtkapazität ohne Upgrades.'],
    ['cargoPerLevel', '+ Fracht je Stufe', 'Zusätzliche Kapazität je "Frachtraum".'],
    ['range', 'Schussreichweite', 'Reichweite der Spielerkanonen (px).'],
  ]))));
  return wrap;
}

function buildCombatTab() {
  const wrap = el('div');
  wrap.append(card('Kampf & Bewegung', fieldGrid(objFields(TUNING.combat, [
    ['ballSpeed', 'Kugel-Tempo', 'Geschwindigkeit der Kanonenkugeln (px/s). Schneller = schwerer auszuweichen.'],
    ['playerTurnRate', 'Wenderate Spieler', 'Wie schnell der Spieler dreht (rad/s).'],
    ['playerSpeedMult', 'Tempo-Mult. Spieler', 'Multiplikator auf das Schiffstempo beim Segeln.', 0.05],
    ['crewSpeedFloor', 'Crew-Faktor (leer)', 'Tempo-Faktor bei 0 Mannschaft (1.0 = volle Crew).', 0.05],
    ['pirateChaseSpeedMult', 'Tempo-Mult. Angriff', 'Tempo-Multiplikator der Piraten im Angriff.', 0.05],
    ['pirateRoamSpeedMult', 'Tempo-Mult. Patrouille', 'Tempo-Multiplikator beim Patrouillieren.', 0.05],
    ['pirateChaseTurnRate', 'Wenderate Angriff', 'Wenderate der Piraten im Angriff (rad/s).', 0.1],
    ['pirateRoamTurnRate', 'Wenderate Patrouille', 'Wenderate beim Patrouillieren (rad/s).', 0.1],
    ['pirateOrbitFlipChance', 'Umkreis-Wechsel', 'Chance pro Frame, die Umkreis-Richtung zu wechseln (0–1).', 0.001],
    ['hitRadius', 'Trefferradius', 'Radius (px), in dem eine Kugel trifft.'],
    ['aggroLoseMult', 'Aggro-Abbruch ×', 'Verfolgung endet ab Aggro-Radius × diesem Wert.', 0.1],
  ]))));
  return wrap;
}

function buildCostTab() {
  const wrap = el('div');
  wrap.append(el('div', 'dp-hint', 'Preis einer Schiffs-Upgradestufe = Basis + Stufe × Schritt.'));
  const upgRows = el('div');
  UPGRADES.forEach(u => {
    upgRows.append(card(u.name, fieldGrid([
      { label: 'Basispreis', desc: u.desc + ' — Preis der ersten Stufe.', get: () => u.priceBase, set: v => u.priceBase = v },
      { label: 'Preis je Stufe', desc: 'Aufschlag pro bereits gekaufter Stufe.', get: () => u.priceStep, set: v => u.priceStep = v },
      { label: 'Max. Stufe', desc: 'Höchste kaufbare Stufe.', step: 1, get: () => u.maxLevel, set: v => u.maxLevel = v },
    ])));
  });
  wrap.append(card('Schiffs-Upgrades (Kosten)', upgRows));

  wrap.append(card('Hafen-Upgrades (Kosten)', fieldGrid([
    ...objFields(TUNING.economy, [
      ['portUpgradeBase', 'Grundpreis', 'Basispreis eines Hafen-Upgrades (Ring 0).'],
      ['portUpgradeRingMult', 'Aufschlag je Ring', 'Zusätzlicher Grundpreis je Ring-Stufe des Hafens.'],
    ]),
    { label: 'Faktor Stufe 1', desc: 'Preisfaktor für die erste Stufe.', step: 0.5, get: () => TUNING.economy.portUpgradeLevelMult[0], set: v => TUNING.economy.portUpgradeLevelMult[0] = v },
    { label: 'Faktor Stufe 2', desc: 'Preisfaktor für die zweite Stufe.', step: 0.5, get: () => TUNING.economy.portUpgradeLevelMult[1], set: v => TUNING.economy.portUpgradeLevelMult[1] = v },
    { label: 'Faktor Stufe 3', desc: 'Preisfaktor für die dritte Stufe.', step: 0.5, get: () => TUNING.economy.portUpgradeLevelMult[2], set: v => TUNING.economy.portUpgradeLevelMult[2] = v },
    { label: 'Faktor Stufe 4', desc: 'Preisfaktor für die vierte Stufe.', step: 0.5, get: () => TUNING.economy.portUpgradeLevelMult[3], set: v => TUNING.economy.portUpgradeLevelMult[3] = v },
    { label: 'Faktor Stufe 5', desc: 'Preisfaktor für die fünfte Stufe.', step: 0.5, get: () => TUNING.economy.portUpgradeLevelMult[4], set: v => TUNING.economy.portUpgradeLevelMult[4] = v },
  ])));

  wrap.append(card('Hafen-Kanonenbatterie (Werte)', fieldGrid(objFields(TUNING.portCannon, [
    ['baseRange', 'Basis-Reichweite', 'Reichweite der Hafenbatterie ohne Upgrade (px).'],
    ['rangePerLevel', '+ Reichweite je Stufe', 'Zusätzliche Reichweite je Stufe (px).'],
    ['baseCooldown', 'Basis-Ladezeit (ms)', 'Nachladezeit ohne Upgrade.'],
    ['cooldownPerLevel', '− Ladezeit je Stufe', 'Verkürzung der Ladezeit je Stufe.'],
    ['minCooldown', 'Min. Ladezeit (ms)', 'Untergrenze der Ladezeit.'],
    ['baseDamage', 'Basis-Schaden', 'Schaden der Hafenbatterie ohne Upgrade.'],
    ['damagePerLevel', '+ Schaden je Stufe', 'Zusätzlicher Schaden je Stufe.'],
  ]))));
  return wrap;
}

function buildTradeTab() {
  const wrap = el('div');
  wrap.append(card('Globale Handelsregeln', fieldGrid([
    ...objFields(TUNING.economy, [
      ['priceWobbleAmount', 'Preisschwankung', 'Tägliche Schwankung der Preise (0.12 = ±12 %).', 0.01],
      ['tradeDiscountPerLevel', 'Handelsposten-Bonus', 'Pro Stufe: −Einkauf / +halber Verkaufsbonus (0.05 = 5 %).', 0.01],
      ['warehousePerLevel', 'Lager je Stufe', 'Zusätzliche Lagerkapazität je Lagerhaus-Stufe.'],
    ]),
  ])));

  wrap.append(card('Grundpreise der Waren', fieldGrid(GOODS.map(g => ({
    label: g.name,
    desc: `Basispreis von ${g.name}. Häfen multiplizieren diesen Wert.`,
    get: () => g.basePrice, set: v => g.basePrice = v,
  })))));

  // Pro-Hafen-Multiplikatoren (viele Werte → einklappbar je Hafen).
  const portsWrap = el('div');
  portsWrap.append(el('div', 'dp-hint', 'Pro Hafen: Kauf-/Verkaufs-Multiplikator je Ware (× Grundpreis). <0.75 = günstig, >1.3 = teuer.'));
  PORTS.forEach(port => {
    const det = el('details', 'dp-details');
    const sum = el('summary', null, `${port.name}  (Ring ${port.ring})`);
    det.append(sum);
    const fields = [];
    GOODS.forEach(g => {
      const pr = port.prices[g.id];
      if (!pr) return;
      fields.push({ label: `${g.name} – Kauf`, desc: 'Einkaufspreis-Multiplikator.', step: 0.05, get: () => pr.buy, set: v => pr.buy = v });
      fields.push({ label: `${g.name} – Verk.`, desc: 'Verkaufspreis-Multiplikator.', step: 0.05, get: () => pr.sell, set: v => pr.sell = v });
    });
    if (port.purchasePrice != null) {
      fields.unshift({ label: 'Kaufpreis Hafen', desc: 'Preis, um diesen Hafen zu erwerben.', step: 500, get: () => port.purchasePrice, set: v => port.purchasePrice = v });
    }
    det.append(fieldGrid(fields));
    portsWrap.append(det);
  });
  wrap.append(card('Hafen-Preise (je Hafen)', portsWrap));
  return wrap;
}

function buildSkillsTab() {
  const wrap = el('div');
  wrap.append(el('div', 'dp-hint', 'Erfahrung & Mannschafts-Skills. Genauigkeit (Vorhalten) = nur Crew; Präzision (Streuung) = Crew + Kanonen-Upgrade.'));

  wrap.append(card('Geschützwesen-Basis (Spieler)', fieldGrid(objFields(TUNING.player, [
    ['gunneryBaseLeadFactor', 'Basis-Vorhalten', 'Vorhalten ohne Skill (0 = gar nicht, 1 = perfekt). Skills erhöhen das.', 0.05],
    ['gunneryBaseSpread', 'Basis-Streuung', 'Streuung ohne Skill/Upgrade (rad). Größer = ungenauer.', 0.005],
    ['gunnerySpreadPerCannonLevel', 'Streuung je Kanonen-Stufe', 'Wie stark "Schwere Kanonen" (Material) die Präzision verbessert.', 0.002],
    ['gunneryMinSpread', 'Min. Streuung', 'Untergrenze — der Spieler trifft nie zu 100 %.', 0.005],
  ]))));

  wrap.append(card('Erfahrung & Stufen', fieldGrid([
    { label: 'EP Tier 0 (Freibeuter)', desc: 'EP für einen versenkten Freibeuter.', step: 1, get: () => TUNING.crew.xpPerTier[0], set: v => TUNING.crew.xpPerTier[0] = v },
    { label: 'EP Tier 1 (Korsar)', desc: 'EP für einen versenkten Korsar.', step: 1, get: () => TUNING.crew.xpPerTier[1], set: v => TUNING.crew.xpPerTier[1] = v },
    { label: 'EP Tier 2 (Galeone)', desc: 'EP für eine versenkte Schwarze Galeone.', step: 1, get: () => TUNING.crew.xpPerTier[2], set: v => TUNING.crew.xpPerTier[2] = v },
    { label: 'EP Tier 3 (Todesgaleone)', desc: 'EP für eine versenkte Todesgaleone.', step: 1, get: () => TUNING.crew.xpPerTier[3], set: v => TUNING.crew.xpPerTier[3] = v },
    ...objFields(TUNING.crew, [
      ['levelBaseXP', 'EP für Stufe 1→2', 'Grund-EP-Bedarf des ersten Aufstiegs.'],
      ['levelGrowth', 'EP-Wachstum je Stufe', 'Faktor, um den der EP-Bedarf pro Stufe steigt.', 0.05],
      ['skillPointsPerLevel', 'Skillpunkte je Stufe', 'Punkte pro Aufstieg.', 1],
      ['maxSkillRank', 'Max. Skill-Rang', 'Höchster Rang je Skill.', 1],
      ['respecCostPerPoint', 'Umverteilen je Punkt', 'Goldkosten pro zurückgesetztem Skillpunkt.', 5],
    ]),
  ])));

  wrap.append(card('Skill-Wirkung je Rang', fieldGrid(objFields(TUNING.crew, [
    ['leadFactorPerRank', 'Vorhalten / Rang', 'Genauigkeit: +Vorhalten je Rang von "Vorhalten".', 0.01],
    ['spreadPerRank', 'Streuung − / Rang', 'Präzision: −Streuung (rad) je Rang von "Ruhige Hand".', 0.002],
    ['reloadMsPerRank', 'Ladezeit − / Rang', 'Verkürzung der Ladezeit (ms) je Rang von "Schnelles Nachladen".', 5],
    ['plunderPerRank', 'Beute + / Rang', 'Zusätzliche Beute (×) je Rang von "Plünderer".', 0.02],
  ]))));
  return wrap;
}

function buildWorldTab() {
  const wrap = el('div');
  wrap.append(card('Welt & Zeit', fieldGrid(objFields(TUNING.world, [
    ['dayMs', 'Tageslänge (ms)', 'Dauer eines Spieltags. Treibt Preisschwankungen.'],
    ['dockDist', 'Anlege-Distanz', 'Distanz zum Hafen (px), ab der angelegt werden kann.'],
  ]))));
  return wrap;
}

const TABS = [
  ['Gegner', buildEnemiesTab],
  ['Spieler & Schiff', buildPlayerTab],
  ['Kampf', buildCombatTab],
  ['Upgrade-Kosten', buildCostTab],
  ['Handel', buildTradeTab],
  ['Mannschaft', buildSkillsTab],
  ['Welt', buildWorldTab],
];

// ── Panel-Konstruktion ────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('dp-styles')) return;
  const css = `
  #dp-toggle{position:fixed;right:10px;bottom:10px;z-index:99998;background:#1d2733;color:#e8eef5;
    border:1px solid #3a4a5c;border-radius:8px;padding:8px 12px;font:600 13px/1 system-ui,sans-serif;
    cursor:pointer;opacity:.85}
  #dp-toggle:hover{opacity:1}
  #dp-panel{position:fixed;inset:0 0 0 auto;width:min(460px,100vw);height:100vh;z-index:99999;
    background:#141b24;color:#e8eef5;font:13px/1.4 system-ui,sans-serif;box-shadow:-4px 0 24px rgba(0,0,0,.5);
    display:flex;flex-direction:column;transform:translateX(100%);transition:transform .18s ease}
  #dp-panel.open{transform:none}
  .dp-top{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #283543;background:#10161e}
  .dp-top h2{font-size:14px;margin:0;flex:1}
  .dp-btn{background:#23303f;color:#e8eef5;border:1px solid #3a4a5c;border-radius:6px;padding:6px 10px;
    font-size:12px;cursor:pointer}
  .dp-btn:hover{background:#2c3c4f}
  .dp-btn.warn{border-color:#7a3b3b;background:#3a2222}
  .dp-tabs{display:flex;flex-wrap:wrap;gap:4px;padding:8px 10px;border-bottom:1px solid #283543;background:#10161e}
  .dp-tab{background:#1b242f;border:1px solid #2b3947;border-radius:6px;padding:5px 9px;font-size:12px;cursor:pointer;color:#aebccb}
  .dp-tab.active{background:#2a6cb0;border-color:#2a6cb0;color:#fff}
  .dp-body{overflow:auto;padding:10px;flex:1}
  .dp-hint{font-size:11px;color:#8aa0b5;margin:2px 0 10px;line-height:1.4}
  .dp-card{background:#1a232e;border:1px solid #273441;border-radius:8px;padding:10px;margin-bottom:10px}
  .dp-card-title{font-weight:700;font-size:13px;margin-bottom:8px;color:#ffd27a}
  .dp-grid{display:grid;grid-template-columns:1fr;gap:8px}
  .dp-row{border-bottom:1px dashed #232f3b;padding-bottom:6px}
  .dp-row:last-child{border-bottom:none;padding-bottom:0}
  .dp-row-head{display:flex;align-items:center;gap:8px}
  .dp-label{flex:1;font-size:12px;color:#cdd9e5}
  .dp-input{width:96px;background:#0e141b;color:#fff;border:1px solid #36485a;border-radius:5px;
    padding:5px 7px;font-size:12px;text-align:right}
  .dp-input:focus{outline:none;border-color:#2a6cb0}
  .dp-desc{font-size:10.5px;color:#7d93a7;margin-top:3px}
  .dp-details{border:1px solid #273441;border-radius:6px;margin-bottom:8px;padding:4px 8px;background:#161f29}
  .dp-details>summary{cursor:pointer;font-size:12px;color:#cdd9e5;padding:4px 0}
  .dp-details[open]>summary{color:#ffd27a;margin-bottom:6px}
  #dp-export{position:absolute;inset:0;background:#0d1219;z-index:5;display:none;flex-direction:column;padding:12px}
  #dp-export textarea{flex:1;width:100%;background:#0e141b;color:#cfe;border:1px solid #36485a;border-radius:6px;
    font:11px/1.4 ui-monospace,monospace;padding:8px;resize:none}
  #dp-export .dp-top{padding:0 0 8px;border:none;background:none}
  `;
  const style = el('style');
  style.id = 'dp-styles';
  style.textContent = css;
  document.head.append(style);
}

function buildPanel() {
  injectStyles();

  const toggle = el('button', null, '⚙ Dev');
  toggle.id = 'dp-toggle';
  document.body.append(toggle);

  const panel = el('div');
  panel.id = 'dp-panel';

  // Kopfzeile
  const top = el('div', 'dp-top');
  const title = el('h2', null, 'Entwickler-Tuning');
  const exportBtn = el('button', 'dp-btn', 'Export');
  const resetBtn = el('button', 'dp-btn warn', 'Zurücksetzen');
  const closeBtn = el('button', 'dp-btn', '✕');
  top.append(title, exportBtn, resetBtn, closeBtn);

  // Tab-Leiste + Body
  const tabBar = el('div', 'dp-tabs');
  const body = el('div', 'dp-body');

  let activeIdx = 0;
  const tabButtons = [];
  function showTab(i) {
    activeIdx = i;
    tabButtons.forEach((b, j) => b.classList.toggle('active', j === i));
    body.innerHTML = '';
    body.append(TABS[i][1]());
  }
  TABS.forEach(([name], i) => {
    const b = el('div', 'dp-tab', name);
    b.addEventListener('click', () => showTab(i));
    tabButtons.push(b);
    tabBar.append(b);
  });

  // Export-Overlay
  const exportView = el('div');
  exportView.id = 'dp-export';
  const exTop = el('div', 'dp-top');
  const exTitle = el('h2', null, 'Aktuelle Werte (kopieren & mir schicken)');
  const copyBtn = el('button', 'dp-btn', 'In Zwischenablage');
  const exClose = el('button', 'dp-btn', 'Zurück');
  exTop.append(exTitle, copyBtn, exClose);
  const ta = el('textarea');
  ta.readOnly = true;
  exportView.append(exTop, ta);

  panel.append(top, tabBar, body, exportView);
  document.body.append(panel);

  // Verhalten
  const open = () => panel.classList.add('open');
  const close = () => panel.classList.remove('open');
  toggle.addEventListener('click', () => panel.classList.toggle('open'));
  closeBtn.addEventListener('click', close);

  exportBtn.addEventListener('click', () => {
    ta.value = JSON.stringify(liveSnapshot(), null, 2);
    exportView.style.display = 'flex';
  });
  exClose.addEventListener('click', () => { exportView.style.display = 'none'; });
  copyBtn.addEventListener('click', () => {
    ta.select();
    try { navigator.clipboard.writeText(ta.value); } catch (e) { document.execCommand('copy'); }
    copyBtn.textContent = 'Kopiert ✓';
    setTimeout(() => copyBtn.textContent = 'In Zwischenablage', 1200);
  });
  resetBtn.addEventListener('click', () => {
    if (!confirm('Alle Werte auf die Code-Defaults zurücksetzen?')) return;
    assignDeep(liveSnapshot(), DEFAULTS);
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    showTab(activeIdx);
  });

  // F9 schaltet das Panel um (Phaser fängt diese Taste nicht ab).
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F9') { e.preventDefault(); panel.classList.toggle('open'); }
  });

  showTab(0);
}

export function initDevPanel() {
  if (window.__devPanelInit) return;
  window.__devPanelInit = true;
  DEFAULTS = deepClone(liveSnapshot()); // Code-Defaults sichern (vor Persistenz)
  loadPersisted();                       // gespeicherte Tuning-Werte anwenden
  if (document.body) buildPanel();
  else window.addEventListener('DOMContentLoaded', buildPanel);
}
