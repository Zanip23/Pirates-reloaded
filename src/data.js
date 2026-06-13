// World layout: concentric rings from the map center.
// Ring 0 = safe home waters; outer rings = escalating danger and rewards.

import { TUNING } from './config.js';

export const MAP_W = 5000;
export const MAP_H = 5000;
export const MAP_CX = 2500;
export const MAP_CY = 2500;

export const RING_RADII = [700, 1500, 2300]; // boundaries between rings 0/1, 1/2, 2/3

export const RINGS = [
  { id: 0, name: 'Heimatgewässer' },
  { id: 1, name: 'Offene See'     },
  { id: 2, name: 'Sturmgürtel'    },
  { id: 3, name: 'Totenwasser'    },
];

export function ringAt(x, y) {
  const d = Math.hypot(x - MAP_CX, y - MAP_CY);
  if (d < RING_RADII[0]) return 0;
  if (d < RING_RADII[1]) return 1;
  if (d < RING_RADII[2]) return 2;
  return 3;
}

export const GOODS = [
  { id: 'rum',     name: 'Rum',        basePrice: 20 },
  { id: 'wood',    name: 'Holz',       basePrice: 15 },
  { id: 'cloth',   name: 'Stoffe',     basePrice: 25 },
  { id: 'tobacco', name: 'Tabak',      basePrice: 30 },
  { id: 'iron',    name: 'Eisen',      basePrice: 35 },
  { id: 'spices',  name: 'Gewürze',    basePrice: 50 },
  { id: 'gems',    name: 'Edelsteine', basePrice: 120 },
];

// buy = price the player pays, sell = price the player receives (× basePrice)
export const PORTS = [
  // ── Ring 0 (Heimatgewässer) ───────────────────────────────────────
  {
    id: 'port_haven', name: 'Port Haven', x: 2500, y: 2200, ring: 0,
    purchasePrice: null,
    desc: 'Dein Heimathafen. Berühmt für seine Rum-Brennereien.',
    prices: {
      rum:     { buy: 0.7,  sell: 0.6  },
      wood:    { buy: 1.1,  sell: 0.9  },
      cloth:   { buy: 1.2,  sell: 1.0  },
      tobacco: { buy: 1.3,  sell: 1.1  },
      iron:    { buy: 1.8,  sell: 1.5  },
      spices:  { buy: 1.5,  sell: 1.25 },
      gems:    { buy: 1.9,  sell: 1.55 },
    },
  },
  // ── Ring 1 (Offene See) ───────────────────────────────────────────
  {
    id: 'kingsport', name: 'Kingsport', x: 1800, y: 2000, ring: 1,
    purchasePrice: 2500,
    desc: 'Ein Marinestützpunkt mit blühender Eisengießerei.',
    prices: {
      rum:     { buy: 1.8,  sell: 1.5  },
      wood:    { buy: 1.3,  sell: 1.1  },
      cloth:   { buy: 1.1,  sell: 0.9  },
      tobacco: { buy: 1.2,  sell: 1.0  },
      iron:    { buy: 0.65, sell: 0.55 },
      spices:  { buy: 1.4,  sell: 1.15 },
      gems:    { buy: 1.85, sell: 1.5  },
    },
  },
  {
    id: 'redreef', name: 'Redreef', x: 3450, y: 1850, ring: 1,
    purchasePrice: 3000,
    desc: 'Ein Holzhafen, umgeben von alten roten Riffen.',
    prices: {
      rum:     { buy: 1.3,  sell: 1.1  },
      wood:    { buy: 0.6,  sell: 0.5  },
      cloth:   { buy: 1.8,  sell: 1.5  },
      tobacco: { buy: 1.2,  sell: 1.0  },
      iron:    { buy: 1.2,  sell: 1.0  },
      spices:  { buy: 1.5,  sell: 1.2  },
      gems:    { buy: 1.8,  sell: 1.45 },
    },
  },
  {
    id: 'isla_palma', name: 'Isla Palma', x: 2700, y: 3650, ring: 1,
    purchasePrice: 3500,
    desc: 'Eine üppige Palmeninsel, reich an Stoffen und Gewürzen.',
    prices: {
      rum:     { buy: 1.2,  sell: 1.0  },
      wood:    { buy: 1.1,  sell: 0.9  },
      cloth:   { buy: 0.7,  sell: 0.6  },
      tobacco: { buy: 1.3,  sell: 1.1  },
      iron:    { buy: 1.5,  sell: 1.25 },
      spices:  { buy: 0.75, sell: 0.65 },
      gems:    { buy: 1.8,  sell: 1.45 },
    },
  },
  // ── Ring 2 (Sturmgürtel) ─────────────────────────────────────────
  {
    id: 'san_cordoba', name: 'San Cordoba', x: 1000, y: 1900, ring: 2,
    purchasePrice: 10000,
    desc: 'Eine reiche Kolonialstadt, berühmt für ihre feinen Stoffe.',
    prices: {
      rum:     { buy: 1.2,  sell: 1.0  },
      wood:    { buy: 1.9,  sell: 1.6  },
      cloth:   { buy: 0.65, sell: 0.55 },
      tobacco: { buy: 1.4,  sell: 1.2  },
      iron:    { buy: 1.3,  sell: 1.1  },
      spices:  { buy: 1.3,  sell: 1.1  },
      gems:    { buy: 1.75, sell: 1.4  },
    },
  },
  {
    id: 'blackwater_cay', name: 'Blackwater Cay', x: 4200, y: 1600, ring: 2,
    purchasePrice: 15000,
    desc: 'Ein Schmugglernest im Norden. Tabak fließt in Strömen.',
    prices: {
      rum:     { buy: 1.1,  sell: 0.9  },
      wood:    { buy: 1.2,  sell: 1.0  },
      cloth:   { buy: 1.3,  sell: 1.1  },
      tobacco: { buy: 0.55, sell: 0.45 },
      iron:    { buy: 1.4,  sell: 1.2  },
      spices:  { buy: 1.6,  sell: 1.35 },
      gems:    { buy: 1.4,  sell: 1.15 },
    },
  },
  {
    id: 'isla_verde', name: 'Isla Verde', x: 1800, y: 4300, ring: 2,
    purchasePrice: 12000,
    desc: 'Eine tropische Insel, die vor exotischen Gewürzen überquillt.',
    prices: {
      rum:     { buy: 1.4,  sell: 1.2  },
      wood:    { buy: 1.1,  sell: 0.9  },
      cloth:   { buy: 1.2,  sell: 1.0  },
      tobacco: { buy: 1.9,  sell: 1.6  },
      iron:    { buy: 1.5,  sell: 1.3  },
      spices:  { buy: 0.6,  sell: 0.5  },
      gems:    { buy: 1.8,  sell: 1.45 },
    },
  },
  {
    id: 'sturmfels', name: 'Sturmfels', x: 4300, y: 3600, ring: 2,
    purchasePrice: 18000,
    desc: 'Ein finsterer Felshafen im Sturmgürtel. Hier funkeln Edelsteine.',
    prices: {
      rum:     { buy: 1.6,  sell: 1.35 },
      wood:    { buy: 1.5,  sell: 1.25 },
      cloth:   { buy: 1.6,  sell: 1.3  },
      tobacco: { buy: 1.3,  sell: 1.1  },
      iron:    { buy: 1.2,  sell: 1.0  },
      spices:  { buy: 1.7,  sell: 1.4  },
      gems:    { buy: 0.65, sell: 0.55 },
    },
  },
  // ── Ring 3 (Totenwasser) ─────────────────────────────────────────
  {
    id: 'el_diablo', name: 'El Diablo', x: 200, y: 1800, ring: 3,
    purchasePrice: 40000,
    desc: 'Das Nest der schlimmsten Schmuggler. Rum und Tabak um jeden Preis.',
    prices: {
      rum:     { buy: 0.5,  sell: 0.4  },
      wood:    { buy: 2.0,  sell: 1.7  },
      cloth:   { buy: 1.8,  sell: 1.5  },
      tobacco: { buy: 0.5,  sell: 0.4  },
      iron:    { buy: 1.9,  sell: 1.6  },
      spices:  { buy: 2.1,  sell: 1.8  },
      gems:    { buy: 1.6,  sell: 1.35 },
    },
  },
  {
    id: 'totenbucht', name: 'Totenbucht', x: 4950, y: 2500, ring: 3,
    purchasePrice: 45000,
    desc: 'Eine düstere Bucht am östlichen Rand der Welt. Eisen regiert hier.',
    prices: {
      rum:     { buy: 1.8,  sell: 1.55 },
      wood:    { buy: 1.7,  sell: 1.4  },
      cloth:   { buy: 1.6,  sell: 1.35 },
      tobacco: { buy: 1.9,  sell: 1.6  },
      iron:    { buy: 0.5,  sell: 0.4  },
      spices:  { buy: 1.8,  sell: 1.5  },
      gems:    { buy: 1.5,  sell: 1.25 },
    },
  },
  {
    id: 'bluthafen', name: 'Bluthafen', x: 600, y: 4300, ring: 3,
    purchasePrice: 55000,
    desc: 'Eine berüchtigte Piratenbastion im Süd-Westen. Stoffe und Eisen begehrt.',
    prices: {
      rum:     { buy: 0.6,  sell: 0.5  },
      wood:    { buy: 1.9,  sell: 1.6  },
      cloth:   { buy: 0.5,  sell: 0.4  },
      tobacco: { buy: 0.65, sell: 0.55 },
      iron:    { buy: 0.55, sell: 0.45 },
      spices:  { buy: 1.9,  sell: 1.6  },
      gems:    { buy: 2.1,  sell: 1.8  },
    },
  },
  {
    id: 'geisterschlund', name: 'Geisterschlund', x: 4800, y: 4700, ring: 3,
    purchasePrice: 70000,
    desc: 'Am äußersten Rand der Karte. Legenden ranken sich darum — und hohe Preise.',
    prices: {
      rum:     { buy: 2.2,  sell: 1.9  },
      wood:    { buy: 2.2,  sell: 1.9  },
      cloth:   { buy: 2.2,  sell: 1.9  },
      tobacco: { buy: 2.2,  sell: 1.9  },
      iron:    { buy: 2.2,  sell: 1.9  },
      spices:  { buy: 2.2,  sell: 1.9  },
      gems:    { buy: 0.5,  sell: 0.4  },
    },
  },
  {
    id: 'dunkelfurt', name: 'Dunkelfurt', x: 500, y: 600, ring: 3,
    purchasePrice: 60000,
    desc: 'In der Nordwestecke. Gewürze und Stoffe sind hier eine Währung.',
    prices: {
      rum:     { buy: 1.7,  sell: 1.4  },
      wood:    { buy: 1.8,  sell: 1.5  },
      cloth:   { buy: 0.5,  sell: 0.4  },
      tobacco: { buy: 0.55, sell: 0.45 },
      iron:    { buy: 1.8,  sell: 1.5  },
      spices:  { buy: 0.5,  sell: 0.4  },
      gems:    { buy: 1.7,  sell: 1.4  },
    },
  },
];

export function priceWobble(portIndex, goodIndex, day) {
  const s = Math.sin(day * 0.9 + portIndex * 2.3 + goodIndex * 1.7);
  return 1 + s * TUNING.economy.priceWobbleAmount;
}

export const PORT_UPGRADES = [
  {
    id: 'cannon_count',  name: 'Anzahl Kanonen',
    desc: 'Gleichzeitig abgefeuerte Kugeln pro Salve. Stufe 1 = 1 Kanone aktiv.',
    maxLevel: 5,
  },
  {
    id: 'cannon_radius', name: 'Kanonenreichweite',
    desc: 'Reichweite der Kanonenbatterie. +100px je Stufe (Basis 400px).',
    maxLevel: 5,
  },
  {
    id: 'cannon_rate',   name: 'Schussfrequenz',
    desc: 'Schnellere Salven. −400ms Ladezeit je Stufe (Minimum 1,5s).',
    maxLevel: 5,
  },
  {
    id: 'cannon_damage', name: 'Kanonenschaden',
    desc: 'Schaden pro Kugel auf Piraten. +15 Schaden je Stufe (Basis 10).',
    maxLevel: 5,
  },
  {
    id: 'warehouse', name: 'Lagerhaus',
    desc: 'Lagere Waren außerhalb deines Schiffs.',
    maxLevel: 5,
  },
  {
    id: 'trade', name: 'Handelsposten',
    desc: 'Bessere Ein- und Verkaufspreise.',
    maxLevel: 5,
  },
  {
    id: 'lighthouse', name: 'Leuchtturm',
    desc: 'Vergrößert die Minimap (+3px je Stufe). Mehr Überblick über die See.',
    maxLevel: 5,
  },
];

export function portUpgradePrice(portRing, currentLevel) {
  const e = TUNING.economy;
  const base = e.portUpgradeBase + portRing * e.portUpgradeRingMult;
  return base * (e.portUpgradeLevelMult[currentLevel] ?? 1);
}

export function portWarehouseCapacity(upgrades) {
  return (upgrades?.warehouse || 0) * TUNING.economy.warehousePerLevel;
}

export function portCannonStats(upgrades) {
  const c = TUNING.portCannon;
  return {
    count:    upgrades?.cannon_count  || 0,
    range:    c.baseRange + (upgrades?.cannon_radius || 0) * c.rangePerLevel,
    cooldown: Math.max(c.minCooldown, c.baseCooldown - (upgrades?.cannon_rate || 0) * c.cooldownPerLevel),
    damage:   c.baseDamage + (upgrades?.cannon_damage || 0) * c.damagePerLevel,
  };
}

// priceBase/priceStep: Preis einer Stufe = priceBase + Stufe × priceStep.
export const UPGRADES = [
  {
    id: 'hull', name: 'Rumpfverstärkung',
    desc: 'Mehr Rumpfpunkte — du überstehst mehr Treffer.',
    maxLevel: 4, priceBase: 200, priceStep: 300,
  },
  {
    id: 'cannons', name: 'Schwere Kanonen',
    desc: 'Mehr Schaden und schnelleres Nachladen im Gefecht.',
    maxLevel: 4, priceBase: 250, priceStep: 350,
  },
  {
    id: 'sails', name: 'Schnelle Segel',
    desc: 'Höheres Tempo — entkomme Piraten oder jage sie.',
    maxLevel: 4, priceBase: 200, priceStep: 250,
  },
  {
    id: 'cargo', name: 'Erweiterter Frachtraum',
    desc: 'Mehr Platz für Waren auf jeder Fahrt.',
    maxLevel: 4, priceBase: 180, priceStep: 200,
  },
];

export function upgradePrice(upg, lvl) {
  return upg.priceBase + lvl * upg.priceStep;
}

// ── Mannschafts-Skills ─────────────────────────────────────────────────────
// Skills = menschliche Fähigkeiten (durch Erfahrung), bewusst getrennt von den
// materiellen Gold-Upgrades. Überschneidungen sind gewollt: z. B. verbessern
// "Ruhige Hand" (Crew) UND "Schwere Kanonen" (Material) gemeinsam die Präzision.
export const CREW_SKILLS = [
  {
    id: 'gunneryLead', name: 'Vorhalten',
    desc: 'Genauigkeit: erfahrene Kanoniere führen bewegte Ziele vor und treffen sie tatsächlich. Reine Mannschaftssache — Material hilft hier nicht.',
  },
  {
    id: 'gunneryGrouping', name: 'Ruhige Hand',
    desc: 'Präzision: engere Streuung der Salven. Stapelt mit dem Upgrade "Schwere Kanonen".',
  },
  {
    id: 'reload', name: 'Schnelles Nachladen',
    desc: 'Kürzere Ladezeit zwischen den Salven. Stapelt mit dem Upgrade "Schwere Kanonen".',
  },
  {
    id: 'plunder', name: 'Plünderer',
    desc: 'Mehr Goldbeute aus versenkten Schiffen. Reine Mannschaftssache.',
  },
];

// EP, die für den nächsten Aufstieg ab der angegebenen Stufe nötig sind.
export function xpForNextLevel(level) {
  const c = TUNING.crew;
  return Math.round(c.levelBaseXP * Math.pow(c.levelGrowth, Math.max(0, level - 1)));
}

// EP, die ein versenkter Pirat des angegebenen Tiers einbringt.
export function xpForKill(tierIdx) {
  const arr = TUNING.crew.xpPerTier;
  return arr[tierIdx] ?? arr[arr.length - 1];
}

// Geschütz-Endwerte des Spielers: kombiniert Mannschaft (Skills) und Material
// (Upgrades). leadFactor nur Crew, spread aus Crew + Kanonen-Upgrade.
export function gunneryStats(player) {
  const u = player.upgradeLevel || {};
  const s = player.skills || {};
  const pg = TUNING.player;
  const c = TUNING.crew;
  const lead = Math.min(1, pg.gunneryBaseLeadFactor + (s.gunneryLead || 0) * c.leadFactorPerRank);
  const spread = Math.max(pg.gunneryMinSpread,
    pg.gunneryBaseSpread
      - (u.cannons || 0) * pg.gunnerySpreadPerCannonLevel
      - (s.gunneryGrouping || 0) * c.spreadPerRank);
  return { lead, spread };
}

export function shipStats(player) {
  const u = player.upgradeLevel || {};
  const p = TUNING.player;
  return {
    maxHull:   p.baseMaxHull  + (u.hull    || 0) * p.hullPerLevel,
    damage:    p.baseDamage   + (u.cannons || 0) * p.damagePerLevel,
    fireRate:  p.baseFireRate - (u.cannons || 0) * p.fireRatePerLevel,
    speed:     p.baseSpeed    + (u.sails   || 0) * p.speedPerLevel,
    cargoCap:  p.baseCargo    + (u.cargo   || 0) * p.cargoPerLevel,
    range:     p.range,
  };
}

// salvo      = cannonballs fired per volley (broadside)
// spread     = aiming inaccuracy / fan width in radians (lower = more accurate)
// standoff   = preferred orbit distance the NPC tries to hold while attacking
// leadFactor = how perfectly the NPC leads a moving target (1 = perfect
//              intercept, lower = under-leads, so circling can still dodge)
export const PIRATE_TIERS = [
  {
    name: 'Freibeuter', texture: 'pirate0',
    hull: 45, dmg: [3, 6], speed: 92, range: 205, fireRate: 1800,
    loot: [30, 70], aggro: 250,
    salvo: 1, spread: 0.13, standoff: 165, leadFactor: 0.45,
  },
  {
    name: 'Korsar', texture: 'pirate1',
    hull: 90, dmg: [4, 7], speed: 112, range: 220, fireRate: 1550,
    loot: [90, 170], aggro: 320,
    salvo: 2, spread: 0.10, standoff: 165, leadFactor: 0.65,
  },
  {
    name: 'Schwarze Galeone', texture: 'pirate2',
    hull: 150, dmg: [7, 12], speed: 128, range: 235, fireRate: 1350,
    loot: [200, 380], aggro: 430,
    salvo: 2, spread: 0.07, standoff: 170, leadFactor: 0.85,
  },
  {
    name: 'Todesgaleone', texture: 'pirate3',
    hull: 220, dmg: [9, 15], speed: 138, range: 250, fireRate: 1200,
    loot: [420, 760], aggro: 480,
    salvo: 3, spread: 0.06, standoff: 185, leadFactor: 1.0,
  },
];

export const RUMORS = [
  'Rum aus Port Haven ist in San Cordoba kaum zu finden.',
  'Eisen aus Kingsport wird überall in den Ringen gebraucht.',
  'Holz aus Redreef ist in Blackwater Cay Mangelware.',
  'Stoffe aus San Cordoba sind bei Isla Palma hochgeschätzt.',
  'Gewürze von Isla Palma verkaufen sich in Geisterschlund für ein Vermögen.',
  'Tabak aus El Diablo bringt in Sturmfels bestes Gold.',
  'Edelsteine aus Sturmfels sind die reinsten im Totenwasser.',
  'Je weiter außen, desto fetter die Beute treibender Frachtkisten.',
  'Die Todesgaleonen im Totenwasser versenken jeden Unerfahrenen.',
  'Kanonenbatterien in eigenen Häfen halten Piraten auf Abstand.',
  'Mehr Kanonen bedeuten mehr gleichzeitige Salven gegen Angreifer.',
  'Ein eigener Handelsposten senkt die Einkaufspreise spürbar.',
  'Im Geisterschlund werden alle Waren zu Wucherpreisen gehandelt.',
  'Bluthafen zahlt Höchstpreise für Edelsteine.',
  'Wer Dunkelfurt hält, beherrscht den Gewürzhandel im Norden.',
];

export const clone = (obj) => JSON.parse(JSON.stringify(obj));

export const INITIAL_PLAYER = {
  version: 4,
  name: 'Seefalke',
  gold: 500,
  hull: 100,
  cargo: {},
  crew: 8,
  maxCrew: 12,
  morale: 70,
  reputation: 0,
  crewXP: 0,
  crewLevel: 1,
  skillPoints: 0,
  skills: { gunneryLead: 0, gunneryGrouping: 0, reload: 0, plunder: 0 },
  x: 2500,
  y: 2420,
  day: 1,
  enemiesDefeated: 0,
  shipwrecks: 0,
  upgradeLevel: { hull: 0, cannons: 0, sails: 0, cargo: 0 },
  ownedPorts: ['port_haven'],
  portUpgrades: {},
  portWarehouse: {},
  teleportLastDay: 0,
};
