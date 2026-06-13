// Central tuning config — every scalar "Stellschraube" the dev panel can edit
// lives here, so balancing changes only ever touch one place. The structured
// data tables (PIRATE_TIERS, GOODS, PORTS, UPGRADES, PORT_UPGRADES) live in
// data.js and are mutated in place by the panel.
//
// The panel writes directly into TUNING (and into those tables), and the game
// reads these values live every frame — so changes take effect immediately,
// without a reload.

export const TUNING = {
  // ── Spieler & Schiff: Basiswerte und Zugewinn pro Upgrade-Stufe ──────────
  player: {
    baseMaxHull: 100,    hullPerLevel: 25,    // Rumpf-HP (Upgrade "Rumpf")
    baseDamage: 8,       damagePerLevel: 4,   // Schaden/Kugel (Upgrade "Kanonen")
    baseFireRate: 1500,  fireRatePerLevel: 150, // Ladezeit in ms; je Stufe schneller
    baseSpeed: 105,      speedPerLevel: 16,   // Tempo (Upgrade "Segel")
    baseCargo: 20,       cargoPerLevel: 10,   // Frachtkapazität (Upgrade "Frachtraum")
    range: 230,                               // Schussreichweite des Spielers (px)
    // ── Geschützwesen (Gunnery) — Basiswerte ohne Crew-Skills ──────────────
    // Genauigkeit (trifft die Mitte) = Vorhalten = leadFactor → nur Mannschaft.
    // Präzision (enge Gruppierung)   = Streuung  = spread     → Mannschaft + Material.
    gunneryBaseLeadFactor: 0.30,        // Vorhalten ohne Skill (hält kaum vor → verfehlt Bewegte)
    gunneryBaseSpread: 0.14,            // Streuung ohne Skill/Upgrade (breit)
    gunnerySpreadPerCannonLevel: 0.014, // "Schwere Kanonen" (Material) verbessert die Präzision
    gunneryMinSpread: 0.035,            // Untergrenze der Streuung (nie perfekt)
  },

  // ── Kampf & Bewegung ─────────────────────────────────────────────────────
  combat: {
    ballSpeed: 430,            // Geschwindigkeit der Kanonenkugeln (px/s)
    playerTurnRate: 3.2,       // Wenderate des Spielers (rad/s)
    playerSpeedMult: 1.45,     // Multiplikator auf das Schiffstempo beim Segeln
    crewSpeedFloor: 0.7,       // Tempo-Faktor bei 0 Mannschaft (1.0 bei voller Crew)
    pirateChaseSpeedMult: 1.25, // Tempo-Multiplikator der Piraten im Angriff
    pirateRoamSpeedMult: 0.55,  // Tempo-Multiplikator beim Patrouillieren
    pirateChaseTurnRate: 3.0,   // Wenderate der Piraten im Angriff (rad/s)
    pirateRoamTurnRate: 2.4,    // Wenderate beim Patrouillieren (rad/s)
    pirateOrbitFlipChance: 0.004, // Chance/Frame, die Umkreis-Richtung zu wechseln
    hitRadius: 26,             // Trefferradius einer Kugel (px)
    aggroLoseMult: 2.2,        // Verfolgung endet ab aggro × diesem Wert Distanz
  },

  // ── Mannschaft: Erfahrung & Skills ───────────────────────────────────────
  // Die Crew sammelt EP nur durch versenkte Gegner, steigt in Stufen auf und
  // erhält Skillpunkte. Skills = menschliche Fähigkeiten (Erfahrung), getrennt
  // von Upgrades (Material) — manche Werte beeinflussen beide gemeinsam.
  crew: {
    xpPerTier: [10, 22, 40, 70],   // EP je versenktem Piraten nach Stufe (0–3)
    levelBaseXP: 60,               // EP für den ersten Stufenaufstieg (1→2)
    levelGrowth: 1.4,              // EP-Bedarf wächst je Stufe (× pro Stufe)
    skillPointsPerLevel: 1,        // Skillpunkte je Stufenaufstieg
    maxSkillRank: 5,               // höchster Rang je Skill
    respecCostPerPoint: 40,        // Gold je zurückgesetztem Punkt (Umverteilung)
    // Wirkung je Skill-Rang:
    leadFactorPerRank: 0.14,       // Vorhalten (Genauigkeit): +Vorhalten je Rang
    spreadPerRank: 0.012,          // Ruhige Hand (Präzision): −Streuung je Rang
    reloadMsPerRank: 90,           // Schnelles Nachladen: −Ladezeit (ms) je Rang
    plunderPerRank: 0.12,          // Plünderer: +Beute (×) je Rang
  },

  // ── Welt & Zeit ──────────────────────────────────────────────────────────
  world: {
    dayMs: 40000,   // Dauer eines Spieltags (ms) — treibt Preisschwankungen
    dockDist: 130,  // Distanz zum Hafen, ab der angelegt werden kann (px)
  },

  // ── Hafen-Kanonenbatterie (eigene Häfen verteidigen) ─────────────────────
  portCannon: {
    baseRange: 400,    rangePerLevel: 100,    // Reichweite (px) + je Stufe
    baseCooldown: 3500, cooldownPerLevel: 400, minCooldown: 1500, // Ladezeit (ms)
    baseDamage: 10,    damagePerLevel: 15,    // Schaden je Stufe
  },

  // ── Wirtschaft & Handel ──────────────────────────────────────────────────
  economy: {
    portUpgradeBase: 300,        // Grundpreis Hafen-Upgrade
    portUpgradeRingMult: 500,    // Aufschlag je Ring-Stufe des Hafens
    portUpgradeLevelMult: [1, 2, 4, 7, 12], // Preisfaktor je bereits gekaufter Stufe
    warehousePerLevel: 20,       // Lagerhaus-Kapazität je Stufe
    priceWobbleAmount: 0.12,     // tägliche Preisschwankung (±12 %)
    tradeDiscountPerLevel: 0.05, // Handelsposten: −5 % Einkauf / +2,5 % Verkauf je Stufe
  },
};

const deepClone = (o) => JSON.parse(JSON.stringify(o));

// Pristine snapshot for the panel's "Zurücksetzen" button.
export const DEFAULT_TUNING = deepClone(TUNING);

// Overwrite TUNING's contents in place (keeps the same object reference that
// every module already imported) from a snapshot.
export function applyTuning(snapshot) {
  for (const k of Object.keys(snapshot)) TUNING[k] = deepClone(snapshot[k]);
}
