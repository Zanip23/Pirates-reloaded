// World layout: the map is split into three vertical risk bands.
// Further east = more pirates, but better trade margins.

export const MAP_W = 2400;
export const MAP_H = 1600;

export const ZONES = [
  { id: 0, name: 'Heimatgewässer', maxX: 850 },
  { id: 1, name: 'Offene See',     maxX: 1700 },
  { id: 2, name: 'Schwarze Weiten', maxX: Infinity },
];

export function zoneAt(x) {
  if (x < ZONES[0].maxX) return 0;
  if (x < ZONES[1].maxX) return 1;
  return 2;
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
  {
    id: 'port_haven', name: 'Port Haven', x: 420, y: 480, zone: 0,
    desc: 'Dein Heimathafen. Berühmt für seine Rum-Brennereien.',
    prices: {
      rum:     { buy: 0.7,  sell: 0.6 },
      wood:    { buy: 1.1,  sell: 0.9 },
      cloth:   { buy: 1.2,  sell: 1.0 },
      tobacco: { buy: 1.3,  sell: 1.1 },
      iron:    { buy: 1.8,  sell: 1.5 },
      spices:  { buy: 1.5,  sell: 1.25 },
      gems:    { buy: 1.9,  sell: 1.55 },
    },
  },
  {
    id: 'kingsport', name: 'Kingsport', x: 380, y: 1120, zone: 0,
    desc: 'Ein Marinestützpunkt mit blühender Eisengießerei.',
    prices: {
      rum:     { buy: 1.8,  sell: 1.5 },
      wood:    { buy: 1.3,  sell: 1.1 },
      cloth:   { buy: 1.1,  sell: 0.9 },
      tobacco: { buy: 1.2,  sell: 1.0 },
      iron:    { buy: 0.65, sell: 0.55 },
      spices:  { buy: 1.4,  sell: 1.15 },
      gems:    { buy: 1.85, sell: 1.5 },
    },
  },
  {
    id: 'redreef', name: 'Redreef', x: 1120, y: 320, zone: 1,
    desc: 'Ein Holzhafen, umgeben von alten roten Riffen.',
    prices: {
      rum:     { buy: 1.3,  sell: 1.1 },
      wood:    { buy: 0.6,  sell: 0.5 },
      cloth:   { buy: 1.8,  sell: 1.5 },
      tobacco: { buy: 1.2,  sell: 1.0 },
      iron:    { buy: 1.2,  sell: 1.0 },
      spices:  { buy: 1.5,  sell: 1.2 },
      gems:    { buy: 1.8,  sell: 1.45 },
    },
  },
  {
    id: 'san_cordoba', name: 'San Cordoba', x: 1340, y: 880, zone: 1,
    desc: 'Eine reiche Kolonialstadt, berühmt für ihre feinen Stoffe.',
    prices: {
      rum:     { buy: 1.2,  sell: 1.0 },
      wood:    { buy: 1.9,  sell: 1.6 },
      cloth:   { buy: 0.7,  sell: 0.6 },
      tobacco: { buy: 1.4,  sell: 1.2 },
      iron:    { buy: 1.3,  sell: 1.1 },
      spices:  { buy: 1.3,  sell: 1.1 },
      gems:    { buy: 1.75, sell: 1.4 },
    },
  },
  {
    id: 'isla_verde', name: 'Isla Verde', x: 1180, y: 1340, zone: 1,
    desc: 'Eine tropische Insel, die vor exotischen Gewürzen überquillt.',
    prices: {
      rum:     { buy: 1.4,  sell: 1.2 },
      wood:    { buy: 1.1,  sell: 0.9 },
      cloth:   { buy: 1.2,  sell: 1.0 },
      tobacco: { buy: 1.9,  sell: 1.6 },
      iron:    { buy: 1.5,  sell: 1.3 },
      spices:  { buy: 0.6,  sell: 0.5 },
      gems:    { buy: 1.8,  sell: 1.45 },
    },
  },
  {
    id: 'blackwater_cay', name: 'Blackwater Cay', x: 1980, y: 460, zone: 2,
    desc: 'Ein Schmugglernest in den Schwarzen Weiten. Tabak fließt in Strömen.',
    prices: {
      rum:     { buy: 1.1,  sell: 0.9 },
      wood:    { buy: 1.2,  sell: 1.0 },
      cloth:   { buy: 1.3,  sell: 1.1 },
      tobacco: { buy: 0.6,  sell: 0.5 },
      iron:    { buy: 1.4,  sell: 1.2 },
      spices:  { buy: 1.6,  sell: 1.35 },
      gems:    { buy: 1.4,  sell: 1.15 },
    },
  },
  {
    id: 'sturmfels', name: 'Sturmfels', x: 2060, y: 1180, zone: 2,
    desc: 'Ein finsterer Felshafen am Rand der Karte. Hier funkeln Edelsteine.',
    prices: {
      rum:     { buy: 1.6,  sell: 1.35 },
      wood:    { buy: 1.5,  sell: 1.25 },
      cloth:   { buy: 1.6,  sell: 1.3 },
      tobacco: { buy: 1.3,  sell: 1.1 },
      iron:    { buy: 1.2,  sell: 1.0 },
      spices:  { buy: 1.7,  sell: 1.4 },
      gems:    { buy: 0.65, sell: 0.55 },
    },
  },
];

// Deterministic daily price wobble (±12 %) so markets feel alive.
export function priceWobble(portIndex, goodIndex, day) {
  const s = Math.sin(day * 0.9 + portIndex * 2.3 + goodIndex * 1.7);
  return 1 + s * 0.12;
}

export const UPGRADES = [
  {
    id: 'hull', name: 'Rumpfverstärkung',
    desc: 'Mehr Rumpfpunkte — du überstehst mehr Treffer.',
    maxLevel: 4,
    price: (lvl) => 200 + lvl * 300,
  },
  {
    id: 'cannons', name: 'Schwere Kanonen',
    desc: 'Mehr Schaden und schnelleres Nachladen im Gefecht.',
    maxLevel: 4,
    price: (lvl) => 250 + lvl * 350,
  },
  {
    id: 'sails', name: 'Schnelle Segel',
    desc: 'Höheres Tempo — entkomme Piraten oder jage sie.',
    maxLevel: 4,
    price: (lvl) => 200 + lvl * 250,
  },
  {
    id: 'cargo', name: 'Erweiterter Frachtraum',
    desc: 'Mehr Platz für Waren auf jeder Fahrt.',
    maxLevel: 4,
    price: (lvl) => 180 + lvl * 200,
  },
];

// Derived ship stats from upgrade levels.
export function shipStats(player) {
  const u = player.upgradeLevel || {};
  return {
    maxHull:   100 + (u.hull   || 0) * 25,
    damage:    8   + (u.cannons || 0) * 4,
    fireRate:  1500 - (u.cannons || 0) * 150,
    speed:     105 + (u.sails  || 0) * 16,
    cargoCap:  20  + (u.cargo  || 0) * 10,
    range:     230,
  };
}

export const PIRATE_TIERS = [
  {
    name: 'Freibeuter', texture: 'pirate0',
    hull: 45, dmg: [4, 7], speed: 92, range: 205, fireRate: 1700,
    loot: [30, 70], aggro: 330,
  },
  {
    name: 'Korsar', texture: 'pirate1',
    hull: 90, dmg: [7, 12], speed: 112, range: 220, fireRate: 1500,
    loot: [90, 170], aggro: 380,
  },
  {
    name: 'Schwarze Galeone', texture: 'pirate2',
    hull: 150, dmg: [12, 19], speed: 128, range: 235, fireRate: 1350,
    loot: [200, 380], aggro: 430,
  },
];

export const RUMORS = [
  'Rum aus Port Haven verkauft sich in Kingsport für gutes Gold.',
  'Eisen aus Kingsport wird in Port Haven mit Kusshand genommen.',
  'Holz aus Redreef ist in San Cordoba Mangelware.',
  'Stoffe aus San Cordoba sind in Redreef hochgeschätzt.',
  'Gewürze von Isla Verde verkaufen sich überall im Osten teuer.',
  'Tabak aus Blackwater Cay bringt auf Isla Verde ein Vermögen.',
  'In Sturmfels funkeln Edelsteine — wer die Schwarzen Weiten überlebt, wird reich.',
  'Je weiter östlich, desto fetter die Beute treibender Frachtkisten.',
  'Die Schwarzen Galeonen am Kartenrand versenken jeden, der zu langsam ist.',
  'In Sichtweite eines Hafens trauen sich Piraten nicht anzugreifen.',
  'Sturmwolken fressen sich durch jeden Rumpf — segle um sie herum.',
];

// structuredClone is missing on older mobile browsers
export const clone = (obj) => JSON.parse(JSON.stringify(obj));

export const INITIAL_PLAYER = {
  version: 2,
  name: 'Seefalke',
  gold: 500,
  hull: 100,
  cargo: {},
  crew: 8,
  maxCrew: 12,
  morale: 70,
  reputation: 0,
  x: 420,
  y: 620,
  day: 1,
  enemiesDefeated: 0,
  shipwrecks: 0,
  upgradeLevel: { hull: 0, cannons: 0, sails: 0, cargo: 0 },
};
