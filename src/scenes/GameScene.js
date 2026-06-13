import {
  MAP_W, MAP_H, MAP_CX, MAP_CY, RING_RADII, RINGS, ringAt,
  PORTS, PIRATE_TIERS, INITIAL_PLAYER, shipStats, portCannonStats, clone,
} from '../data.js';
import { saveGame, loadGame } from '../save.js';
import { SCALE } from '../textures.js';
import { makeButton, showToast, textStyle, COLORS } from '../ui.js';

const DOCK_DIST = 130;
const TURN_RATE = 3.2;
const DAY_MS = 40000;
const BALL_SPEED = 430;
const JOY_RADIUS = 70;

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.doLoad = data && data.load;
  }

  create() {
    if (this.doLoad) {
      this.player = loadGame() || clone(INITIAL_PLAYER);
    } else {
      this.player = this.registry.get('player') || clone(INITIAL_PLAYER);
    }
    this.player = { ...clone(INITIAL_PLAYER), ...this.player };
    this.player.hull = Math.min(this.player.hull, shipStats(this.player).maxHull);
    this.registry.set('player', this.player);

    this.sailTarget = null;
    this.heading = -Math.PI / 2;
    this.fireCooldown = 0;
    this.dayTimer = 0;
    this.stormTickTimer = 0;
    this.wrecked = false;
    this.balls = [];
    this.portBatteryCooldowns = {};

    this.worldLayer = this.add.layer();
    this.uiLayer = this.add.layer().setDepth(1000);
    this.toWorld = obj => { this.worldLayer.add(obj); return obj; };
    this.toUI = obj => { this.uiLayer.add(obj); return obj; };

    this.buildWorld();
    this.buildShip();
    this.buildPirates();
    this.buildStorms();
    this.buildCrates();
    this.buildHUD();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W, MAP_H);
    cam.startFollow(this.ship, true, 0.08, 0.08);
    cam.setBackgroundColor(0x1672ae);
    this.applyZoom();

    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCam.ignore(this.worldLayer);
    cam.ignore(this.uiLayer);

    this._joy = null;
    this.joyGfx = this.toUI(this.add.graphics().setScrollFactor(0).setDepth(201));

    this.input.on('pointerdown', (pointer, over) => {
      if (this.wrecked) return;
      if (over && over.length > 0) return;
      if (this._isTouchPointer(pointer)) {
        if (!this._joy) this._joyStart(pointer);
      } else {
        this.onSeaPointer(pointer, over);
      }
    }, this);

    this.input.on('pointermove', (pointer, over) => {
      if (!pointer.isDown) return;
      if (this._joy && pointer.id === this._joy.id) {
        this._joyMove(pointer);
      } else if (!this._isTouchPointer(pointer)) {
        this.onSeaPointer(pointer, over);
      }
    }, this);

    this.input.on('pointerup', (pointer) => {
      if (this._joy && pointer.id === this._joy.id) this._joyEnd();
    }, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });

    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      // Sync ship position after teleport or port visit
      this.ship.x = this.player.x;
      this.ship.y = this.player.y;
      this.refreshPortVisuals();
      this.refreshHUD();
      saveGame(this.player);
    });

    this.waterFrame = 0;
    this.time.addEvent({
      delay: 380, loop: true,
      callback: () => {
        this.waterFrame = (this.waterFrame + 1) % 3;
        this.water.setTexture('water' + this.waterFrame);
      },
    });

    this.layout();
    this.refreshHUD();
  }

  applyZoom() {
    const W = this.scale.width, H = this.scale.height;
    const zoom = Phaser.Math.Clamp(Math.round(Math.min(W / 640, H / 460) * 2) / 2, 1, 3);
    this.cameras.main.setZoom(zoom);
  }

  // ── World ──────────────────────────────────────────────────────────────────

  buildWorld() {
    this.water = this.toWorld(this.add.tileSprite(0, 0, MAP_W, MAP_H, 'water0')
      .setOrigin(0).setDepth(0).setTileScale(SCALE));

    // Ring zone visualization: light center, visible ring borders
    const ringGfx = this.toWorld(this.add.graphics().setDepth(1));
    ringGfx.fillStyle(0x9fe8f0, 0.05);
    ringGfx.fillCircle(MAP_CX, MAP_CY, RING_RADII[0]);
    ringGfx.lineStyle(5, 0x5090c8, 0.22);
    ringGfx.strokeCircle(MAP_CX, MAP_CY, RING_RADII[0]);
    ringGfx.lineStyle(5, 0x804828, 0.22);
    ringGfx.strokeCircle(MAP_CX, MAP_CY, RING_RADII[1]);
    ringGfx.lineStyle(5, 0xc03018, 0.18);
    ringGfx.strokeCircle(MAP_CX, MAP_CY, RING_RADII[2]);

    // Decorative islets
    const islets = [
      [2200, 2100], [2800, 2150], [2400, 2700],
      [1700, 1700], [3300, 2000], [2100, 3200], [3000, 3300],
      [1600, 3000], [2900, 1600], [2200, 3800],
      [1200, 1500], [3800, 1400], [1100, 3200], [4000, 2900],
      [2700, 4500], [1500, 4600], [3600, 4400], [800,  1800],
      [4600, 2000], [4400, 4100],
      [400,  2000], [200,  3500], [4700, 1200], [4900, 4000],
      [1000, 800],  [4000, 500],  [300,  800],
    ];
    islets.forEach(([x, y]) => {
      this.toWorld(this.add.image(x, y, 'islet').setScale(SCALE).setDepth(2));
    });

    // Ports
    const owned = this.player.ownedPorts || ['port_haven'];
    this.portViews = PORTS.map(port => {
      const isOwned = owned.includes(port.id);
      const texKey = isOwned ? 'islandOwned' : (port.ring >= 2 ? 'islandDanger' : 'islandSafe');
      const img = this.toWorld(this.add.image(port.x, port.y, texKey).setScale(SCALE).setDepth(3));
      img.setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => {
        if (this.distTo(port.x, port.y) < DOCK_DIST) this.openPort(port);
      });
      const nameColor = port.ring === 3 ? '#ff9070' : port.ring === 2 ? '#ffb888' : '#fff3c8';
      this.toWorld(this.add.text(port.x, port.y + 86, port.name,
        textStyle(13, nameColor)).setOrigin(0.5, 0).setDepth(4));
      return { port, img };
    });

    this.flag = this.toWorld(this.add.image(0, 0, 'flagMarker').setScale(SCALE).setDepth(5).setVisible(false));
    this.tweens.add({ targets: this.flag, y: '-=6', duration: 500, yoyo: true, repeat: -1 });
  }

  refreshPortVisuals() {
    const owned = this.player.ownedPorts || ['port_haven'];
    this.portViews.forEach(({ port, img }) => {
      const isOwned = owned.includes(port.id);
      img.setTexture(isOwned ? 'islandOwned' : (port.ring >= 2 ? 'islandDanger' : 'islandSafe'));
    });
  }

  buildShip() {
    const p = this.player;
    this.ship = this.toWorld(this.add.image(p.x, p.y, 'shipPlayer').setScale(SCALE).setDepth(10));
    this.wake = this.toWorld(this.add.graphics().setDepth(9));
  }

  buildPirates() {
    this.pirates = [];
    const plan = [
      // Ring 1 — Freibeuter / Korsar
      { ring: 1, tier: 0 }, { ring: 1, tier: 0 }, { ring: 1, tier: 1 },
      { ring: 1, tier: 0 }, { ring: 1, tier: 1 },
      // Ring 2 — Korsar / Schwarze Galeone
      { ring: 2, tier: 1 }, { ring: 2, tier: 1 }, { ring: 2, tier: 2 },
      { ring: 2, tier: 2 }, { ring: 2, tier: 1 }, { ring: 2, tier: 2 }, { ring: 2, tier: 1 },
      // Ring 3 — Schwarze Galeone / Todesgaleone
      { ring: 3, tier: 2 }, { ring: 3, tier: 3 }, { ring: 3, tier: 2 },
      { ring: 3, tier: 3 }, { ring: 3, tier: 3 }, { ring: 3, tier: 2 },
      { ring: 3, tier: 3 }, { ring: 3, tier: 3 },
    ];
    plan.forEach(cfg => this.spawnPirate(cfg.ring, cfg.tier));
  }

  spawnPirate(ring, tierIdx) {
    const tier = PIRATE_TIERS[tierIdx];
    const minR = ring === 1 ? RING_RADII[0] + 100 : ring === 2 ? RING_RADII[1] + 100 : RING_RADII[2] + 100;
    const maxR = ring === 1 ? RING_RADII[1] - 100 : ring === 2 ? RING_RADII[2] - 100 : Math.min(MAP_W, MAP_H) * 0.68;

    let x, y, tries = 0;
    do {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(minR, maxR);
      x = Phaser.Math.Clamp(MAP_CX + Math.cos(angle) * dist, 80, MAP_W - 80);
      y = Phaser.Math.Clamp(MAP_CY + Math.sin(angle) * dist, 80, MAP_H - 80);
      tries++;
    } while (tries < 30 && (this.nearAnyPort(x, y) || this.distTo(x, y) < 500));

    const spr = this.toWorld(this.add.image(x, y, tier.texture).setScale(SCALE).setDepth(8));
    const bar = this.toWorld(this.add.graphics().setDepth(11));
    const pirate = {
      spr, bar, tierIdx, tier, ring,
      hull: tier.hull,
      heading: Phaser.Math.FloatBetween(0, Math.PI * 2),
      home: { x, y },
      state: 'roam',
      roamTarget: null,
      cooldown: Phaser.Math.Between(400, 1500),
    };
    this.pirates.push(pirate);
    return pirate;
  }

  nearAnyPort(x, y, radius = 150) {
    return PORTS.some(p => Phaser.Math.Distance.Between(x, y, p.x, p.y) < radius);
  }

  buildStorms() {
    this.storms = [];
    const spots = [
      [1400, 1800], [3600, 1300], [1300, 3700],
      [4000, 3500], [2500, 4400], [1000, 2600],
    ];
    spots.forEach(([x, y]) => {
      const c = this.toWorld(this.add.container(x, y).setDepth(20).setAlpha(0.9));
      [[-40, -10], [30, -22], [0, 14], [-15, -30], [40, 18]].forEach(([ox, oy]) => {
        c.add(this.add.image(ox, oy, 'cloud').setScale(SCALE * Phaser.Math.FloatBetween(0.8, 1.3)));
      });
      this.tweens.add({ targets: c, alpha: 0.7, duration: 900, yoyo: true, repeat: -1 });
      this.storms.push({
        c, radius: 150,
        vx: Phaser.Math.FloatBetween(-14, 14),
        vy: Phaser.Math.FloatBetween(-10, 10),
        turnTimer: Phaser.Math.Between(4000, 9000),
      });
    });
  }

  buildCrates() {
    this.crates = [];
    for (let i = 0; i < 8; i++) this.spawnCrate();
  }

  spawnCrate() {
    let x, y, tries = 0;
    do {
      x = Phaser.Math.Between(120, MAP_W - 120);
      y = Phaser.Math.Between(120, MAP_H - 120);
      tries++;
    } while (tries < 20 && this.nearAnyPort(x, y));
    if (this.nearAnyPort(x, y)) return;
    const spr = this.toWorld(this.add.image(x, y, 'crate').setScale(SCALE).setDepth(6));
    this.tweens.add({ targets: spr, angle: 8, duration: 1200, yoyo: true, repeat: -1 });
    this.crates.push({ spr, ring: ringAt(x, y) });
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  buildHUD() {
    this.hud = this.toUI(this.add.container(0, 0).setScrollFactor(0).setDepth(100));

    this.hudBg = this.add.rectangle(0, 0, 10, 40, 0x0a1420, 0.82).setOrigin(0);
    this.hudBg.setStrokeStyle(2, COLORS.panelEdge);
    this.hud.add(this.hudBg);

    const mkStat = (icon) => {
      const img = this.add.image(0, 0, icon).setScale(2);
      const txt = this.add.text(0, 0, '', textStyle(13, '#ffffff')).setOrigin(0, 0.5);
      this.hud.add(img); this.hud.add(txt);
      return { img, txt };
    };
    this.stGold = mkStat('icoGold');
    this.stHull = mkStat('icoHull');
    this.stCargo = mkStat('icoCargo');
    this.stCrew = mkStat('icoCrew');
    this.stDay = mkStat('icoDay');

    this.zoneTxt = this.add.text(0, 0, '', textStyle(12, '#9fe8f0')).setOrigin(0.5, 0);
    this.hud.add(this.zoneTxt);

    this.minimap = this.toUI(this.add.graphics().setScrollFactor(0).setDepth(100));

    this.dockBtn = null;

    this.menuBtn = this.toUI(makeButton(this, 0, 0, 44, 38, '⚓', 'normal', () => {
      saveGame(this.player);
      this.scene.start('MenuScene');
    }));
    this.menuBtn.setScrollFactor(0).setDepth(101);
    this.menuBtn.list.forEach(o => o.setScrollFactor(0));

    this.hud.list.forEach(o => o.setScrollFactor(0));
  }

  layout() {
    if (!this.hudBg) return;
    this.applyZoom();
    const W = this.scale.width;
    if (this.uiCam) this.uiCam.setSize(W, this.scale.height);
    const narrow = W < 500;
    const bgHeight = narrow ? 70 : 40;

    this.hudBg.setSize(W, bgHeight);
    if (this.hudBg.input) this.hudBg.input.hitArea.setSize(W, bgHeight);

    const stats = [this.stGold, this.stHull, this.stCargo, this.stCrew, this.stDay];
    if (narrow) {
      const row1 = stats.slice(0, 3);
      const row2 = stats.slice(3, 5);
      const slice1 = (W - 10) / 3;
      row1.forEach((s, i) => {
        const x = 10 + i * slice1;
        s.img.setPosition(x + 8, 20); s.txt.setPosition(x + 20, 20);
      });
      const slice2 = (W - 10) / 2;
      row2.forEach((s, i) => {
        const x = 10 + i * slice2;
        s.img.setPosition(x + 8, 50); s.txt.setPosition(x + 20, 50);
      });
    } else {
      const slice = Math.min(140, (W - 60) / stats.length);
      stats.forEach((s, i) => {
        const x = 14 + i * slice;
        s.img.setPosition(x + 8, 20); s.txt.setPosition(x + 20, 20);
      });
    }

    this.zoneTxt.setPosition(W / 2, bgHeight + 8);
    this.menuBtn.setPosition(W - 32, bgHeight + 26);

    this.drawMinimap();
    this.positionDockBtn();
  }

  refreshHUD() {
    const p = this.player;
    const st = shipStats(p);
    const used = Object.values(p.cargo).reduce((s, v) => s + v, 0);
    this.stGold.txt.setText(String(p.gold));
    this.stHull.txt.setText(`${Math.max(0, Math.ceil(p.hull))}/${st.maxHull}`);
    this.stHull.txt.setColor(p.hull < st.maxHull * 0.3 ? '#ff6050' : '#ffffff');
    this.stCargo.txt.setText(`${used}/${st.cargoCap}`);
    this.stCrew.txt.setText(`${p.crew}/${p.maxCrew}`);
    this.stDay.txt.setText(`Tag ${p.day}`);
  }

  drawMinimap() {
    const g = this.minimap;
    const W = this.scale.width;

    // Leuchtturm: höchste Stufe unter allen eigenen Häfen × 15px, max +75px
    const owned = this.player.ownedPorts || ['port_haven'];
    const maxLighthouseLvl = owned.reduce((max, portId) =>
      Math.max(max, this.player.portUpgrades?.[portId]?.lighthouse || 0), 0);
    const lighthouseBonus = maxLighthouseLvl * 15;

    const mw = Math.min(132 + lighthouseBonus, W * 0.38);
    const mh = mw; // Karte ist quadratisch
    const narrow = W < 500;
    const my = narrow ? 104 : 96;
    const mx = W - mw - 10;
    const sx = mw / MAP_W, sy = mh / MAP_H;
    g.clear();
    g.fillStyle(0x0a1420, 0.4);
    g.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
    g.fillStyle(0x1672ae, 0.6);
    g.fillRect(mx, my, mw, mh);

    // Ring circles
    const cx = mx + MAP_CX * sx, cy = my + MAP_CY * sy;
    g.lineStyle(1, 0x5090c8, 0.5);
    g.strokeCircle(cx, cy, RING_RADII[0] * sx);
    g.lineStyle(1, 0x804828, 0.5);
    g.strokeCircle(cx, cy, RING_RADII[1] * sx);
    g.lineStyle(1, 0xc03018, 0.4);
    g.strokeCircle(cx, cy, RING_RADII[2] * sx);

    g.lineStyle(2, COLORS.panelEdge, 1);
    g.strokeRect(mx - 3, my - 3, mw + 6, mh + 6);

    // Leuchtturm-Detektionszonen aufbauen
    const lighthouseZones = [];
    owned.forEach(portId => {
      const lvl = this.player.portUpgrades?.[portId]?.lighthouse || 0;
      if (lvl === 0) return;
      const port = PORTS.find(p => p.id === portId);
      if (!port) return;
      lighthouseZones.push({ x: port.x, y: port.y, range: 300 + lvl * 200 });
    });

    // Leuchtturm-Radien auf Minimap anzeigen (gelb, dezent)
    lighthouseZones.forEach(z => {
      g.lineStyle(1, 0xffe066, 0.35);
      g.strokeCircle(mx + z.x * sx, my + z.y * sy, z.range * sx);
    });

    // Häfen: Kanonenreichweite für aktive Batterien anzeigen
    PORTS.forEach(p => {
      const isOwned = owned.includes(p.id);
      if (isOwned) {
        const upg = this.player.portUpgrades?.[p.id] || {};
        const cannonCount = upg.cannon_count || 0;
        if (cannonCount > 0) {
          const range = (400 + (upg.cannon_radius || 0) * 100) * sx;
          g.lineStyle(1, 0xff8844, 0.45);
          g.strokeCircle(mx + p.x * sx, my + p.y * sy, range);
        }
      }
      g.fillStyle(isOwned ? 0xffd23f : (p.ring >= 2 ? 0xff7050 : 0xaab8c0), 1);
      const dotSize = isOwned ? 5 : 4;
      g.fillRect(mx + p.x * sx - dotSize / 2, my + p.y * sy - dotSize / 2, dotSize, dotSize);
    });

    if (this.storms) this.storms.forEach(s => {
      g.fillStyle(0x8a98a4, 0.8);
      g.fillCircle(mx + s.c.x * sx, my + s.c.y * sy, 3);
    });

    // Piraten: nur sichtbar wenn nahe am Spieler ODER im Leuchtturm-Radius
    const playerSightRange = 550;
    if (this.pirates) this.pirates.forEach(pi => {
      if (pi.hull <= 0) return;
      const nearPlayer = Phaser.Math.Distance.Between(
        pi.spr.x, pi.spr.y, this.ship.x, this.ship.y) < playerSightRange;
      const inLighthouse = lighthouseZones.some(z =>
        Phaser.Math.Distance.Between(pi.spr.x, pi.spr.y, z.x, z.y) < z.range);
      if (!nearPlayer && !inLighthouse) return;
      // Orange wenn nur per Leuchtturm erkannt, Rot wenn in Sichtweite des Spielers
      g.fillStyle(inLighthouse && !nearPlayer ? 0xffaa44 : 0xff4444, 1);
      g.fillRect(mx + pi.spr.x * sx - 1, my + pi.spr.y * sy - 1, 3, 3);
    });

    g.fillStyle(0xffffff, 1);
    g.fillRect(mx + this.ship.x * sx - 2, my + this.ship.y * sy - 2, 4, 4);
  }

  positionDockBtn() {
    if (this.dockBtn) { this.dockBtn.destroy(); this.dockBtn = null; }
    if (!this.nearPort) return;
    const W = this.scale.width, H = this.scale.height;
    this.dockBtn = this.toUI(makeButton(this, W / 2, H - 56, Math.min(320, W - 30), 56,
      `⚓ ANLEGEN: ${this.nearPort.name}`, 'gold', () => this.openPort(this.nearPort)));
    this.dockBtn.setScrollFactor(0).setDepth(110);
    this.dockBtn.list.forEach(o => o.setScrollFactor(0));
  }

  // ── Port ───────────────────────────────────────────────────────────────────

  openPort(port) {
    if (this.wrecked) return;
    this.sailTarget = null;
    this.flag.setVisible(false);
    this.player.x = this.ship.x;
    this.player.y = this.ship.y;
    saveGame(this.player);
    this.scene.pause();
    this.scene.launch('PortScene', { portId: port.id });
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  onSeaPointer(pointer, currentlyOver) {
    if (this.wrecked) return;
    if (currentlyOver && currentlyOver.length > 0) return;
    const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.sailTarget = {
      x: Phaser.Math.Clamp(wp.x, 30, MAP_W - 30),
      y: Phaser.Math.Clamp(wp.y, 30, MAP_H - 30),
    };
    this.flag.setPosition(this.sailTarget.x, this.sailTarget.y - 18).setVisible(true);
  }

  // ── Update loop ────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.wrecked) return;
    const dt = delta / 1000;

    this.handleKeyboard();
    this.handleJoystick();
    this.moveShip(dt);
    this.updateCombat(delta);
    this.updatePirates(dt, delta);
    this.updateBalls(dt);
    this.updateStorms(dt, delta);
    this.updatePortBatteries(delta);
    this.checkCrates();
    this.checkDockProximity();
    this.advanceDay(delta);
    this.drawMinimap();
  }

  handleKeyboard() {
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown  || this.wasd.left.isDown)  vx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
    if (this.cursors.up.isDown    || this.wasd.up.isDown)    vy -= 1;
    if (this.cursors.down.isDown  || this.wasd.down.isDown)  vy += 1;
    if (vx || vy) {
      this.sailTarget = {
        x: Phaser.Math.Clamp(this.ship.x + vx * 220, 30, MAP_W - 30),
        y: Phaser.Math.Clamp(this.ship.y + vy * 220, 30, MAP_H - 30),
      };
      this.flag.setVisible(false);
    }
  }

  handleJoystick() {
    if (!this._joy || this._joy.dist < 12) return;
    const FAR = 2000;
    const a = this._joy.angle;
    this.sailTarget = {
      x: Phaser.Math.Clamp(this.ship.x + Math.cos(a) * FAR, 30, MAP_W - 30),
      y: Phaser.Math.Clamp(this.ship.y + Math.sin(a) * FAR, 30, MAP_H - 30),
    };
    this.flag.setVisible(false);
  }

  _isTouchPointer(pointer) {
    const ev = pointer.event;
    if (!ev) return false;
    return ev.pointerType === 'touch' || (ev.type && ev.type.startsWith('touch'));
  }

  _joyStart(pointer) {
    this._joy = { id: pointer.id, sx: pointer.x, sy: pointer.y, angle: 0, dist: 0 };
    this._drawJoy(pointer.x, pointer.y, pointer.x, pointer.y);
  }

  _joyMove(pointer) {
    if (!this._joy) return;
    const dx = pointer.x - this._joy.sx;
    const dy = pointer.y - this._joy.sy;
    const dist = Math.hypot(dx, dy);
    this._joy.angle = Math.atan2(dy, dx);
    this._joy.dist = dist;
    const clamped = Math.min(dist, JOY_RADIUS);
    const norm = dist > 0.01 ? dist : 1;
    const kx = this._joy.sx + (dx / norm) * clamped;
    const ky = this._joy.sy + (dy / norm) * clamped;
    this._drawJoy(this._joy.sx, this._joy.sy, kx, ky);
  }

  _joyEnd() {
    this._joy = null;
    this.joyGfx.clear();
    this.sailTarget = null;
    this.wake.clear();
  }

  _drawJoy(bx, by, kx, ky) {
    const g = this.joyGfx;
    g.clear();
    const R = JOY_RADIUS;
    g.fillStyle(0x000000, 0.22);
    g.fillCircle(bx, by, R);
    g.lineStyle(3, 0xffffff, 0.4);
    g.strokeCircle(bx, by, R);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(kx, ky, R * 0.38);
    g.lineStyle(2, 0xffffff, 0.85);
    g.strokeCircle(kx, ky, R * 0.38);
  }

  moveShip(dt) {
    if (!this.sailTarget) return;
    const dx = this.sailTarget.x - this.ship.x;
    const dy = this.sailTarget.y - this.ship.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) {
      this.sailTarget = null;
      this.flag.setVisible(false);
      this.wake.clear();
      return;
    }

    const want = Math.atan2(dy, dx);
    this.heading = Phaser.Math.Angle.RotateTo(this.heading, want, TURN_RATE * dt);

    const st = shipStats(this.player);
    const crewFactor = 0.7 + 0.3 * (this.player.crew / this.player.maxCrew);
    const speed = st.speed * 1.45 * crewFactor;
    this.ship.x = Phaser.Math.Clamp(this.ship.x + Math.cos(this.heading) * speed * dt, 24, MAP_W - 24);
    this.ship.y = Phaser.Math.Clamp(this.ship.y + Math.sin(this.heading) * speed * dt, 24, MAP_H - 24);
    this.pushOffIslands(this.ship);

    const rot = this.heading + Math.PI / 2;
    this.ship.rotation = Math.round(rot / (Math.PI / 8)) * (Math.PI / 8);

    this.drawWake(this.ship, this.heading);
    this.player.x = this.ship.x;
    this.player.y = this.ship.y;
  }

  pushOffIslands(spr) {
    PORTS.forEach(p => {
      const d = Phaser.Math.Distance.Between(spr.x, spr.y, p.x, p.y);
      const r = 72;
      if (d < r && d > 0.01) {
        spr.x = p.x + ((spr.x - p.x) / d) * r;
        spr.y = p.y + ((spr.y - p.y) / d) * r;
      }
    });
  }

  drawWake(spr, heading) {
    this.wake.clear();
    this.wake.fillStyle(0xe8fbff, 0.5);
    const bx = spr.x - Math.cos(heading) * 30;
    const by = spr.y - Math.sin(heading) * 30;
    this.wake.fillEllipse(bx, by, 14, 8);
    this.wake.fillStyle(0xe8fbff, 0.25);
    this.wake.fillEllipse(bx - Math.cos(heading) * 14, by - Math.sin(heading) * 14, 20, 10);
  }

  // ── Combat ─────────────────────────────────────────────────────────────────

  updateCombat(delta) {
    this.fireCooldown -= delta;
    if (this.fireCooldown > 0) return;
    const st = shipStats(this.player);
    const target = this.nearestPirate(st.range);
    if (!target) return;
    const moraleBonus = 0.85 + 0.3 * (this.player.morale / 100);
    const dmg = Math.round((st.damage + Phaser.Math.Between(0, 4)) * moraleBonus);
    this.shoot(this.ship, target.spr, dmg, true);
    this.fireCooldown = st.fireRate;
  }

  nearestPirate(range) {
    let best = null, bestD = range;
    this.pirates.forEach(pi => {
      if (pi.hull <= 0) return;
      const d = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, pi.spr.x, pi.spr.y);
      if (d < bestD) { bestD = d; best = pi; }
    });
    return best;
  }

  shoot(fromSpr, targetSpr, dmg, friendly) {
    const dx = targetSpr.x - fromSpr.x;
    const dy = targetSpr.y - fromSpr.y;
    const a = Math.atan2(dy, dx) + Phaser.Math.FloatBetween(-0.07, 0.07);
    const spr = this.toWorld(this.add.image(fromSpr.x, fromSpr.y, 'ball').setScale(SCALE).setDepth(12));
    this.balls.push({
      spr, friendly, dmg,
      vx: Math.cos(a) * BALL_SPEED,
      vy: Math.sin(a) * BALL_SPEED,
      life: Math.min(0.9, Math.hypot(dx, dy) / BALL_SPEED + 0.12),
    });
  }

  updateBalls(dt) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.spr.x += b.vx * dt;
      b.spr.y += b.vy * dt;
      b.life -= dt;

      let hit = false;
      if (b.friendly) {
        for (const pi of this.pirates) {
          if (pi.hull <= 0) continue;
          if (Phaser.Math.Distance.Between(b.spr.x, b.spr.y, pi.spr.x, pi.spr.y) < 26) {
            pi.hull -= b.dmg;
            pi.state = 'chase';
            this.effect('boomAnim', 'boom', b.spr.x, b.spr.y);
            if (pi.hull <= 0) this.sinkPirate(pi);
            hit = true;
            break;
          }
        }
      } else if (Phaser.Math.Distance.Between(b.spr.x, b.spr.y, this.ship.x, this.ship.y) < 26) {
        this.damagePlayer(b.dmg);
        this.effect('boomAnim', 'boom', b.spr.x, b.spr.y);
        hit = true;
      }

      if (hit || b.life <= 0) {
        if (!hit) this.effect('splashAnim', 'splash', b.spr.x, b.spr.y);
        b.spr.destroy();
        this.balls.splice(i, 1);
      }
    }
  }

  effect(anim, tex, x, y) {
    const s = this.toWorld(this.add.sprite(x, y, tex, '0').setScale(SCALE).setDepth(13));
    s.play(anim);
    s.once('animationcomplete', () => s.destroy());
  }

  damagePlayer(dmg) {
    this.player.hull -= dmg;
    this.cameras.main.shake(120, 0.004);
    this.refreshHUD();
    if (this.player.hull <= 0) this.shipwreck();
  }

  sinkPirate(pi) {
    pi.hull = 0;
    pi.bar.clear();
    this.effect('boomAnim', 'boom', pi.spr.x, pi.spr.y);
    this.tweens.add({
      targets: pi.spr, alpha: 0, scale: SCALE * 0.5, angle: 25, duration: 700,
      onComplete: () => pi.spr.setVisible(false),
    });

    const p = this.player;
    const loot = Phaser.Math.Between(pi.tier.loot[0], pi.tier.loot[1]);
    p.gold += loot;
    p.enemiesDefeated++;
    p.reputation = Math.min(100, p.reputation + 2 + pi.tierIdx * 2);
    p.morale = Math.min(100, p.morale + 6);
    showToast(this, `${pi.tier.name} versenkt! +${loot} Gold`, '#5ce07a');
    saveGame(p);
    this.refreshHUD();

    this.time.delayedCall(Phaser.Math.Between(25000, 50000), () => {
      if (!this.scene.isActive()) return;
      const idx = this.pirates.indexOf(pi);
      if (idx >= 0) {
        pi.spr.destroy();
        pi.bar.destroy();
        this.pirates.splice(idx, 1);
      }
      this.spawnPirate(pi.ring, pi.tierIdx);
    });
  }

  // ── Port cannon batteries ──────────────────────────────────────────────────

  updatePortBatteries(delta) {
    const owned = this.player.ownedPorts || [];
    for (const port of PORTS) {
      if (!owned.includes(port.id)) continue;
      const stats = portCannonStats(this.player.portUpgrades?.[port.id] || {});
      if (stats.count === 0) continue;

      this.portBatteryCooldowns[port.id] = (this.portBatteryCooldowns[port.id] || 0) - delta;
      if (this.portBatteryCooldowns[port.id] > 0) continue;

      const targets = this.pirates
        .filter(pi => pi.hull > 0 &&
          Phaser.Math.Distance.Between(pi.spr.x, pi.spr.y, port.x, port.y) < stats.range)
        .sort((a, b) =>
          Phaser.Math.Distance.Between(a.spr.x, a.spr.y, port.x, port.y) -
          Phaser.Math.Distance.Between(b.spr.x, b.spr.y, port.x, port.y));

      if (targets.length === 0) continue;

      for (let i = 0; i < stats.count; i++) {
        const target = targets[i % targets.length];
        this.time.delayedCall(i * 100, () => {
          if (!this.scene.isActive()) return;
          this.portMuzzleFlash(port.x, port.y);
          this.shoot({ x: port.x, y: port.y }, target.spr, stats.damage, true);
        });
      }

      this.portBatteryCooldowns[port.id] = stats.cooldown;
    }
  }

  portMuzzleFlash(x, y) {
    const g = this.toWorld(this.add.graphics().setDepth(14));
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x, y, 10);
    g.fillStyle(0xffcc00, 0.8);
    g.fillCircle(x, y, 18);
    g.fillStyle(0xff8800, 0.5);
    g.fillCircle(x, y, 28);
    this.tweens.add({
      targets: g, alpha: 0, scaleX: 1.8, scaleY: 1.8,
      duration: 200, ease: 'Quad.Out',
      onComplete: () => g.destroy(),
    });
  }

  // ── Pirate AI ──────────────────────────────────────────────────────────────

  updatePirates(dt, delta) {
    const playerRing = ringAt(this.ship.x, this.ship.y);

    this.pirates.forEach(pi => {
      if (pi.hull <= 0) return;
      const d = Phaser.Math.Distance.Between(pi.spr.x, pi.spr.y, this.ship.x, this.ship.y);

      if (pi.state !== 'chase' && d < pi.tier.aggro && playerRing >= 1) {
        pi.state = 'chase';
      }
      if (pi.state === 'chase' && d > pi.tier.aggro * 2.2) {
        pi.state = 'roam';
        pi.roamTarget = null;
      }

      let tx, ty, speed;
      if (pi.state === 'chase') {
        tx = this.ship.x; ty = this.ship.y;
        speed = pi.tier.speed * 1.45;
      } else {
        if (!pi.roamTarget || Phaser.Math.Distance.Between(pi.spr.x, pi.spr.y, pi.roamTarget.x, pi.roamTarget.y) < 24) {
          pi.roamTarget = {
            x: Phaser.Math.Clamp(pi.home.x + Phaser.Math.Between(-260, 260), 60, MAP_W - 60),
            y: Phaser.Math.Clamp(pi.home.y + Phaser.Math.Between(-260, 260), 60, MAP_H - 60),
          };
        }
        tx = pi.roamTarget.x; ty = pi.roamTarget.y;
        speed = pi.tier.speed * 0.55;
      }

      const want = Math.atan2(ty - pi.spr.y, tx - pi.spr.x);
      pi.heading = Phaser.Math.Angle.RotateTo(pi.heading, want, 2.4 * dt);
      const move = (pi.state === 'chase' && d < 120) ? 0 : speed * dt;
      pi.spr.x = Phaser.Math.Clamp(pi.spr.x + Math.cos(pi.heading) * move, 24, MAP_W - 24);
      pi.spr.y = Phaser.Math.Clamp(pi.spr.y + Math.sin(pi.heading) * move, 24, MAP_H - 24);
      this.pushOffIslands(pi.spr);
      const rot = pi.heading + Math.PI / 2;
      pi.spr.rotation = Math.round(rot / (Math.PI / 8)) * (Math.PI / 8);

      pi.cooldown -= delta;
      if (pi.state === 'chase' && pi.cooldown <= 0 && d < pi.tier.range) {
        const dmg = Phaser.Math.Between(pi.tier.dmg[0], pi.tier.dmg[1]);
        this.shoot(pi.spr, this.ship, dmg, false);
        pi.cooldown = pi.tier.fireRate;
      }

      pi.bar.clear();
      if (pi.hull < pi.tier.hull) {
        const w = 40, frac = Math.max(0, pi.hull / pi.tier.hull);
        pi.bar.fillStyle(0x0a1420, 0.8);
        pi.bar.fillRect(pi.spr.x - w / 2 - 1, pi.spr.y - 48, w + 2, 6);
        pi.bar.fillStyle(0xe06060, 1);
        pi.bar.fillRect(pi.spr.x - w / 2, pi.spr.y - 47, w * frac, 4);
      }
    });
  }

  // ── Storms ─────────────────────────────────────────────────────────────────

  updateStorms(dt, delta) {
    let inStorm = false;
    const minStormDist = RING_RADII[0] + 150;

    this.storms.forEach(s => {
      s.turnTimer -= delta;
      if (s.turnTimer <= 0) {
        s.vx = Phaser.Math.FloatBetween(-14, 14);
        s.vy = Phaser.Math.FloatBetween(-10, 10);
        s.turnTimer = Phaser.Math.Between(4000, 9000);
      }
      s.c.x += s.vx * dt;
      s.c.y += s.vy * dt;

      // Bounce off map edges
      if (s.c.x < 80)         { s.c.x = 80;         s.vx =  Math.abs(s.vx); }
      if (s.c.x > MAP_W - 80) { s.c.x = MAP_W - 80; s.vx = -Math.abs(s.vx); }
      if (s.c.y < 80)         { s.c.y = 80;          s.vy =  Math.abs(s.vy); }
      if (s.c.y > MAP_H - 80) { s.c.y = MAP_H - 80;  s.vy = -Math.abs(s.vy); }

      // Keep storms outside the safe home zone
      const distCenter = Math.hypot(s.c.x - MAP_CX, s.c.y - MAP_CY);
      if (distCenter < minStormDist) {
        const angle = Math.atan2(s.c.y - MAP_CY, s.c.x - MAP_CX);
        s.c.x = MAP_CX + Math.cos(angle) * minStormDist;
        s.c.y = MAP_CY + Math.sin(angle) * minStormDist;
        s.vx = Math.cos(angle) * 14;
        s.vy = Math.sin(angle) * 10;
      }

      if (Phaser.Math.Distance.Between(s.c.x, s.c.y, this.ship.x, this.ship.y) < s.radius) {
        inStorm = true;
      }
    });

    if (inStorm) {
      this.stormTickTimer -= delta;
      if (this.stormTickTimer <= 0) {
        this.stormTickTimer = 1000;
        this.damagePlayer(2);
        showToast(this, 'Der Sturm zerrt am Rumpf!', '#b8c4cc');
      }
    } else {
      this.stormTickTimer = 0;
    }
  }

  // ── Crates ─────────────────────────────────────────────────────────────────

  checkCrates() {
    for (let i = this.crates.length - 1; i >= 0; i--) {
      const c = this.crates[i];
      if (Phaser.Math.Distance.Between(c.spr.x, c.spr.y, this.ship.x, this.ship.y) < 40) {
        const base = [20, 50, 110, 250][c.ring] || 20;
        const gold = Phaser.Math.Between(base, base * 2);
        this.player.gold += gold;
        showToast(this, `Treibende Fracht geborgen: +${gold} Gold`, '#ffd23f');
        c.spr.destroy();
        this.crates.splice(i, 1);
        this.refreshHUD();
        saveGame(this.player);
        this.time.delayedCall(Phaser.Math.Between(15000, 35000), () => {
          if (this.scene.isActive()) this.spawnCrate();
        });
      }
    }
  }

  // ── Docking & day cycle ────────────────────────────────────────────────────

  checkDockProximity() {
    let near = null;
    for (const p of PORTS) {
      if (this.distTo(p.x, p.y) < DOCK_DIST) { near = p; break; }
    }
    if (near !== this.nearPort) {
      this.nearPort = near;
      this.positionDockBtn();
    }

    const ring = ringAt(this.ship.x, this.ship.y);
    const label = near ? `⚓ ${near.name}` : RINGS[ring].name;
    const color = ring === 3 ? '#ff8060' : ring === 2 ? '#ffb070' : '#9fe8f0';
    if (this.zoneTxt.text !== label) {
      this.zoneTxt.setText(label);
      this.zoneTxt.setColor(color);
    }
  }

  advanceDay(delta) {
    this.dayTimer += delta;
    if (this.dayTimer < DAY_MS) return;
    this.dayTimer = 0;
    this.player.day++;
    this.player.morale = Math.max(10, this.player.morale - 1);
    this.refreshHUD();
    saveGame(this.player);
  }

  distTo(x, y) {
    return Phaser.Math.Distance.Between(this.ship.x, this.ship.y, x, y);
  }

  // ── Shipwreck ──────────────────────────────────────────────────────────────

  shipwreck() {
    if (this.wrecked) return;
    this.wrecked = true;
    this.sailTarget = null;
    this.flag.setVisible(false);
    this.wake.clear();

    const p = this.player;
    p.hull = 0;
    this.tweens.add({ targets: this.ship, alpha: 0, scale: SCALE * 0.4, angle: 40, duration: 1100 });
    this.effect('boomAnim', 'boom', this.ship.x, this.ship.y);
    this.cameras.main.shake(400, 0.008);

    const goldLost = Math.floor(p.gold * 0.25);
    const hadCargo = Object.values(p.cargo).reduce((s, v) => s + v, 0) > 0;

    this.time.delayedCall(1200, () => {
      const W = this.scale.width, H = this.scale.height;
      const panel = this.toUI(this.add.container(0, 0).setScrollFactor(0).setDepth(150));
      const dim = this.add.rectangle(0, 0, W, H, 0x0a1420, 0.85).setOrigin(0).setInteractive();
      const title = this.add.text(W / 2, H * 0.26, 'SCHIFFBRUCH!', textStyle(30, '#ff6050')).setOrigin(0.5);
      const lines = [
        'Deine Crew rettet dich an den Strand von Port Haven.',
        '',
        `Verlorene Fracht: ${hadCargo ? 'alles' : 'keine'}`,
        `Verlorenes Gold:  ${goldLost}`,
      ].join('\n');
      const body = this.add.text(W / 2, H * 0.45, lines, textStyle(14, '#e8d8b0', { align: 'center' })).setOrigin(0.5);
      const btn = makeButton(this, W / 2, H * 0.68, 240, 54, 'WEITERSEGELN', 'gold', () => {
        p.cargo = {};
        p.gold -= goldLost;
        p.hull = Math.ceil(shipStats(p).maxHull * 0.5);
        p.morale = Math.max(10, p.morale - 15);
        p.shipwrecks = (p.shipwrecks || 0) + 1;
        p.day += 2;
        p.x = INITIAL_PLAYER.x;
        p.y = INITIAL_PLAYER.y;
        saveGame(p);
        this.scene.restart({ load: false });
      });
      panel.add([dim, title, body]);
      panel.list.forEach(o => o.setScrollFactor(0));
      this.toUI(btn);
      btn.setScrollFactor(0).setDepth(151);
      btn.list.forEach(o => o.setScrollFactor(0));
    });
  }
}
