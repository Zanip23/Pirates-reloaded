// Procedural pixel-art textures, drawn once at 1x and rendered scaled.
// Palette: bright Caribbean — turquoise sea, sandy isles, cream sails.

export const SCALE = 3;

export const PAL = {
  waterDeep:  '#1672ae',
  water:      '#22a0cf',
  waterLight: '#46c2e2',
  sparkle:    '#b8f0f6',
  foam:       '#e8fbff',
  sand:       '#eed792',
  sandDark:   '#d2b468',
  grass:      '#3fae4e',
  grassDark:  '#2c8a3c',
  palm:       '#1f6b2e',
  trunk:      '#7a4a22',
  hull:       '#7a4a22',
  hullDark:   '#4e2e10',
  deck:       '#a9743c',
  sail:       '#f6eed8',
  sailShade:  '#d8c9a8',
  mast:       '#3c2410',
  roof:       '#c04030',
  wall:       '#e8d8b0',
  flagRed:    '#d03030',
  black:      '#16161c',
  pirateGray: '#9aa0a8',
  pirateRed:  '#a83838',
  pirateBlack:'#34343e',
  gold:       '#ffd23f',
  goldDark:   '#c89818',
  ball:       '#22222a',
  cloud:      '#b8c4cc',
  cloudDark:  '#8a98a4',
};

function canvas(scene, key, w, h) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  return tex;
}

function P(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ── Water tiles (3 animation frames) ─────────────────────────────────────────

function makeWaterFrame(scene, key, shift) {
  const tex = canvas(scene, key, 16, 16);
  const ctx = tex.context;
  P(ctx, 0, 0, 16, 16, PAL.water);
  // darker wave dashes
  const dashes = [[2, 4, 4], [10, 9, 3], [5, 13, 4], [12, 1, 3]];
  dashes.forEach(([x, y, w]) => {
    P(ctx, (x + shift) % 16, y, w, 1, PAL.waterDeep);
  });
  // lighter crests
  const crests = [[7, 2, 3], [1, 9, 3], [9, 14, 4], [14, 6, 2]];
  crests.forEach(([x, y, w]) => {
    P(ctx, (x + shift * 2) % 16, y, w, 1, PAL.waterLight);
  });
  // sparkles
  const sparks = [[4, 6], [13, 11], [8, 8]];
  sparks.forEach(([x, y], i) => {
    if ((i + shift) % 3 !== 0) P(ctx, (x + shift) % 16, y, 1, 1, PAL.sparkle);
  });
  tex.refresh();
}

// ── Ships (top-down, pointing up) ────────────────────────────────────────────

function makeShip(scene, key, sailColor, sailShade, hullColor, hullDark, flagColor) {
  const tex = canvas(scene, key, 16, 24);
  const ctx = tex.context;
  // hull, tapering bow
  P(ctx, 7, 0, 2, 2, hullDark);
  P(ctx, 6, 2, 4, 2, hullColor);
  P(ctx, 5, 4, 6, 3, hullColor);
  P(ctx, 4, 7, 8, 13, hullColor);
  P(ctx, 5, 20, 6, 2, hullColor);
  P(ctx, 6, 22, 4, 1, hullDark);
  // side shading
  P(ctx, 4, 7, 1, 13, hullDark);
  P(ctx, 11, 7, 1, 13, hullDark);
  // deck
  P(ctx, 6, 8, 4, 11, PAL.deck);
  // fore sail (yard seen from above)
  P(ctx, 3, 6, 10, 3, sailColor);
  P(ctx, 3, 9, 10, 1, sailShade);
  // main sail
  P(ctx, 2, 12, 12, 4, sailColor);
  P(ctx, 2, 16, 12, 1, sailShade);
  // masts
  P(ctx, 7, 7, 2, 1, PAL.mast);
  P(ctx, 7, 13, 2, 1, PAL.mast);
  // stern flag
  P(ctx, 7, 21, 2, 1, flagColor);
  tex.refresh();
}

// ── Port island ──────────────────────────────────────────────────────────────

function blob(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function makeIsland(scene, key, danger) {
  const tex = canvas(scene, key, 64, 52);
  const ctx = tex.context;
  // shallow water ring
  blob(ctx, 32, 24, 30, 21, PAL.waterLight);
  blob(ctx, 32, 24, 27, 18, PAL.foam);
  // sand
  blob(ctx, 32, 24, 25, 16, PAL.sand);
  blob(ctx, 20, 30, 8, 5, PAL.sandDark);
  // grass
  blob(ctx, 32, 21, 17, 10, PAL.grass);
  blob(ctx, 26, 19, 8, 5, PAL.grassDark);
  // palms
  [[15, 18], [48, 16]].forEach(([x, y]) => {
    P(ctx, x, y, 1, 4, PAL.trunk);
    P(ctx, x - 2, y - 2, 5, 2, PAL.palm);
    P(ctx, x - 1, y - 3, 3, 1, PAL.palm);
  });
  // houses
  [[28, 18], [35, 16], [31, 22]].forEach(([x, y]) => {
    P(ctx, x, y + 2, 5, 3, PAL.wall);
    P(ctx, x, y, 5, 2, danger ? PAL.pirateBlack : PAL.roof);
  });
  // dock into the water (south)
  P(ctx, 30, 36, 4, 12, PAL.trunk);
  P(ctx, 26, 46, 12, 2, PAL.hullDark);
  // flag pole
  P(ctx, 40, 8, 1, 9, PAL.mast);
  P(ctx, 41, 8, 6, 4, danger ? PAL.black : PAL.flagRed);
  if (danger) P(ctx, 43, 9, 2, 2, '#ffffff'); // skull dot
  tex.refresh();
}

function makeIslandOwned(scene) {
  const tex = canvas(scene, 'islandOwned', 64, 52);
  const ctx = tex.context;
  blob(ctx, 32, 24, 30, 21, PAL.waterLight);
  blob(ctx, 32, 24, 27, 18, PAL.foam);
  blob(ctx, 32, 24, 25, 16, PAL.sand);
  blob(ctx, 20, 30, 8, 5, PAL.sandDark);
  blob(ctx, 32, 21, 17, 10, PAL.grass);
  blob(ctx, 26, 19, 8, 5, PAL.grassDark);
  [[15, 18], [48, 16]].forEach(([x, y]) => {
    P(ctx, x, y, 1, 4, PAL.trunk);
    P(ctx, x - 2, y - 2, 5, 2, PAL.palm);
    P(ctx, x - 1, y - 3, 3, 1, PAL.palm);
  });
  [[28, 18], [35, 16], [31, 22]].forEach(([x, y]) => {
    P(ctx, x, y + 2, 5, 3, PAL.wall);
    P(ctx, x, y, 5, 2, PAL.roof);
  });
  P(ctx, 30, 36, 4, 12, PAL.trunk);
  P(ctx, 26, 46, 12, 2, PAL.hullDark);
  // gold flag = player-owned port
  P(ctx, 40, 8, 1, 9, PAL.mast);
  P(ctx, 41, 8, 6, 4, PAL.gold);
  P(ctx, 42, 9, 3, 2, PAL.goldDark);
  tex.refresh();
}

function makeIslet(scene) {
  const tex = canvas(scene, 'islet', 24, 18);
  const ctx = tex.context;
  blob(ctx, 12, 9, 11, 7, PAL.waterLight);
  blob(ctx, 12, 9, 9, 5, PAL.sand);
  blob(ctx, 11, 8, 5, 3, PAL.grass);
  P(ctx, 14, 4, 1, 4, PAL.trunk);
  P(ctx, 12, 3, 5, 2, PAL.palm);
  tex.refresh();
}

// ── Small props ──────────────────────────────────────────────────────────────

function makeBall(scene) {
  const tex = canvas(scene, 'ball', 4, 4);
  const ctx = tex.context;
  P(ctx, 1, 0, 2, 4, PAL.ball);
  P(ctx, 0, 1, 4, 2, PAL.ball);
  P(ctx, 1, 1, 1, 1, '#55555f');
  tex.refresh();
}

function makeCrate(scene) {
  const tex = canvas(scene, 'crate', 10, 10);
  const ctx = tex.context;
  P(ctx, 1, 1, 8, 8, PAL.hull);
  P(ctx, 1, 1, 8, 1, PAL.deck);
  P(ctx, 1, 8, 8, 1, PAL.hullDark);
  P(ctx, 1, 4, 8, 2, PAL.hullDark);
  P(ctx, 4, 1, 2, 8, PAL.hullDark);
  tex.refresh();
}

function makeFlagMarker(scene) {
  const tex = canvas(scene, 'flagMarker', 10, 14);
  const ctx = tex.context;
  P(ctx, 2, 0, 1, 14, PAL.mast);
  P(ctx, 3, 0, 6, 3, PAL.gold);
  P(ctx, 3, 3, 4, 2, PAL.goldDark);
  P(ctx, 0, 13, 5, 1, PAL.hullDark);
  tex.refresh();
}

function makeCloud(scene) {
  const tex = canvas(scene, 'cloud', 30, 18);
  const ctx = tex.context;
  blob(ctx, 10, 11, 8, 5, PAL.cloudDark);
  blob(ctx, 20, 11, 8, 5, PAL.cloudDark);
  blob(ctx, 15, 7, 9, 5, PAL.cloud);
  blob(ctx, 8, 9, 5, 4, PAL.cloud);
  blob(ctx, 22, 9, 5, 4, PAL.cloud);
  tex.refresh();
}

// ── Effect sprite sheets (frames laid out horizontally) ──────────────────────

function makeSplashSheet(scene) {
  const fw = 12, fh = 12, frames = 4;
  const tex = canvas(scene, 'splash', fw * frames, fh);
  const ctx = tex.context;
  for (let f = 0; f < frames; f++) {
    const ox = f * fw, c = 6, r = 1 + f * 1.4;
    ctx.strokeStyle = f < 2 ? PAL.foam : PAL.waterLight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(ox + c, c, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (f === 0) P(ctx, ox + c - 1, c - 1, 2, 2, PAL.foam);
    tex.add(String(f), 0, ox, 0, fw, fh);
  }
  tex.refresh();
}

function makeBoomSheet(scene) {
  const fw = 16, fh = 16, frames = 4;
  const tex = canvas(scene, 'boom', fw * frames, fh);
  const ctx = tex.context;
  const cols = ['#fff8d0', '#ffd23f', '#ff8030', '#55555f'];
  for (let f = 0; f < frames; f++) {
    const ox = f * fw, c = 8, r = 2 + f * 1.6;
    blob(ctx, ox + c, c, r, r, cols[f]);
    if (f < 3) blob(ctx, ox + c, c, Math.max(1, r - 2), Math.max(1, r - 2), cols[f + 1]);
    tex.add(String(f), 0, ox, 0, fw, fh);
  }
  tex.refresh();
}

// ── HUD icons (8x8) ──────────────────────────────────────────────────────────

function makeIcons(scene) {
  // coin
  let tex = canvas(scene, 'icoGold', 8, 8);
  let ctx = tex.context;
  blob(ctx, 4, 4, 3.5, 3.5, PAL.goldDark);
  blob(ctx, 4, 4, 2.5, 2.5, PAL.gold);
  P(ctx, 3, 2, 2, 1, '#fff0a0');
  tex.refresh();

  // hull (shield)
  tex = canvas(scene, 'icoHull', 8, 8);
  ctx = tex.context;
  P(ctx, 1, 0, 6, 4, PAL.hull);
  P(ctx, 2, 4, 4, 2, PAL.hull);
  P(ctx, 3, 6, 2, 1, PAL.hull);
  P(ctx, 2, 1, 2, 2, PAL.deck);
  tex.refresh();

  // cargo crate
  tex = canvas(scene, 'icoCargo', 8, 8);
  ctx = tex.context;
  P(ctx, 1, 1, 6, 6, PAL.deck);
  P(ctx, 1, 3, 6, 1, PAL.hullDark);
  P(ctx, 3, 1, 1, 6, PAL.hullDark);
  tex.refresh();

  // crew
  tex = canvas(scene, 'icoCrew', 8, 8);
  ctx = tex.context;
  P(ctx, 3, 0, 2, 2, '#e8b888');
  P(ctx, 2, 2, 4, 4, '#2c5a8a');
  P(ctx, 1, 3, 1, 2, '#e8b888');
  P(ctx, 6, 3, 1, 2, '#e8b888');
  P(ctx, 2, 6, 1, 2, '#2c3a4a');
  P(ctx, 5, 6, 1, 2, '#2c3a4a');
  tex.refresh();

  // sun (day)
  tex = canvas(scene, 'icoDay', 8, 8);
  ctx = tex.context;
  P(ctx, 3, 0, 2, 8, PAL.gold);
  P(ctx, 0, 3, 8, 2, PAL.gold);
  blob(ctx, 4, 4, 2.5, 2.5, '#fff0a0');
  tex.refresh();
}

// ── Entry point ──────────────────────────────────────────────────────────────

export function createAllTextures(scene) {
  makeWaterFrame(scene, 'water0', 0);
  makeWaterFrame(scene, 'water1', 3);
  makeWaterFrame(scene, 'water2', 7);

  makeShip(scene, 'shipPlayer', PAL.sail, PAL.sailShade, PAL.hull, PAL.hullDark, PAL.flagRed);
  makeShip(scene, 'pirate0', PAL.pirateGray, '#7a8088', PAL.hullDark, PAL.black, PAL.black);
  makeShip(scene, 'pirate1', PAL.pirateRed, '#7a2828', PAL.hullDark, PAL.black, PAL.black);
  makeShip(scene, 'pirate2', PAL.pirateBlack, PAL.black, PAL.black, '#000008', PAL.black);
  makeShip(scene, 'pirate3', '#6a0010', '#440008', '#16161c', '#0a0a10', '#ff2020');

  makeIsland(scene, 'islandSafe', false);
  makeIsland(scene, 'islandDanger', true);
  makeIslandOwned(scene);
  makeIslet(scene);

  makeBall(scene);
  makeCrate(scene);
  makeFlagMarker(scene);
  makeCloud(scene);
  makeSplashSheet(scene);
  makeBoomSheet(scene);
  makeIcons(scene);

  if (!scene.anims.exists('splashAnim')) {
    scene.anims.create({
      key: 'splashAnim',
      frames: [0, 1, 2, 3].map(f => ({ key: 'splash', frame: String(f) })),
      frameRate: 14,
      hideOnComplete: true,
    });
    scene.anims.create({
      key: 'boomAnim',
      frames: [0, 1, 2, 3].map(f => ({ key: 'boom', frame: String(f) })),
      frameRate: 12,
      hideOnComplete: true,
    });
  }
}
