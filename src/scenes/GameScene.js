import { PORTS, GOODS, UPGRADES, RUMORS, INITIAL_PLAYER } from '../data.js';
import { saveGame, loadGame, deleteSave } from '../save.js';

const MAP_W = 1200;
const MAP_H = 800;
const SHIP_SPEED = 140;
const DOCK_DIST = 70;
const EVENT_INTERVAL = 12000; // ms between possible events

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.doLoad = data && data.load;
  }

  create() {
    this.scale.on('resize', this.resize, this);
    // ── Player state ──────────────────────────────────────────────
    if (this.doLoad) {
      const saved = loadGame();
      this.player = saved || JSON.parse(JSON.stringify(INITIAL_PLAYER));
    } else {
      const reg = this.registry.get('player');
      this.player = reg || JSON.parse(JSON.stringify(INITIAL_PLAYER));
    }
    // Defensive check
    if (!this.player || typeof this.player !== 'object' || this.player.day === undefined) {
       this.player = JSON.parse(JSON.stringify(INITIAL_PLAYER));
    } else {
       this.player = { ...JSON.parse(JSON.stringify(INITIAL_PLAYER)), ...this.player };
    }

    this.portUIOpen = false;
    this.currentPort = null;
    this.moveTarget = null;
    this.lastEventTime = 0;
    this.gameOver = false;
    this.dayTimer = 0;

    // ── World ─────────────────────────────────────────────────────
    this.buildWorld();
    this.buildShip();
    this.buildPorts();
    this.buildHUD();
    this.buildMobileControls();
    this.buildPortUI();
    this.buildCombatUI();
    this.buildEventUI();
    this.buildGameOverUI();

    // ── Camera ────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.ship, true, 0.08, 0.08);
    this.cameras.main.setBackgroundColor(0x081420);

    // ── Input ─────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    this.input.on('pointerdown', this.onMapTap, this);

    // Update HUD once
    this.refreshHUD();
  }

  // ── World building ────────────────────────────────────────────────────────


  resize(gameSize) {
    if (!this.scene.isActive()) return;

    const W = gameSize.width;
    const H = gameSize.height;

    // Reposition mobile controls
    if (this.mobileArrows) {
      const btnSize = 46;
      const pad = 10;
      const bx = pad + btnSize;
      const by = H - pad - btnSize;
      this.mobileArrows.up.setPosition(bx, by - btnSize - pad);
      this.mobileArrows.upText.setPosition(bx, by - btnSize - pad);
      this.mobileArrows.down.setPosition(bx, by + btnSize + pad);
      this.mobileArrows.downText.setPosition(bx, by + btnSize + pad);
      this.mobileArrows.left.setPosition(bx - btnSize - pad, by);
      this.mobileArrows.leftText.setPosition(bx - btnSize - pad, by);
      this.mobileArrows.right.setPosition(bx + btnSize + pad, by);
      this.mobileArrows.rightText.setPosition(bx + btnSize + pad, by);
    }

    // Reposition HUD
    if (this.dockBtn && this.nearestPort && this.dockBtn.visible) {
      this.positionDockBtn();
    }

    // Reposition panels if they are open
    if (this.portUIOpen && this.currentPort) {
      const port = this.currentPort;
      this.closePort();
      this.buildPortUI();
      this.openPort(port);
    }

    if (this.inCombat && this.enemy) {
      this.combatPanel.setVisible(false);
      this.buildCombatUI();
      this.startCombat(this.enemy);
      this.combatPanel.setVisible(true);
    }

    if (this.eventPanel && this.eventPanel.visible) {
      // Just re-center the panel
      const ew = Math.min(W - 8, 380);
      const eh = 200;
      const ex = (W - ew) / 2;
      const ey = (H - eh) / 2;

      this.eventPanel.each((child) => {
         if (child === this.eventBg) {
             child.setPosition(ex, ey);
             child.setSize(ew, eh);
         } else if (child === this.eventTitle) {
             child.setPosition(ex + ew / 2, ey + 12);
         } else if (child === this.eventBody) {
             child.setPosition(ex + 10, ey + 40);
             child.style.wordWrapWidth = ew - 20;
             child.dirty = true;
         } else if (child === this.eventBtn1.bg) {
             child.setPosition(ex + ew / 4, ey + eh - 36);
         } else if (child === this.eventBtn1.txt) {
             child.setPosition(ex + ew / 4, ey + eh - 36);
         } else if (child === this.eventBtn2.bg) {
             child.setPosition(ex + ew * 3 / 4, ey + eh - 36);
         } else if (child === this.eventBtn2.txt) {
             child.setPosition(ex + ew * 3 / 4, ey + eh - 36);
         }
      });
    }

    if (this.gameOverPanel && this.gameOverPanel.visible) {
        this.gameOverPanel.setVisible(false);
        this.buildGameOverUI();
        this.triggerGameOver();
    }
  }

  buildWorld() {
    // Deep ocean background
    const bg = this.add.graphics();
    bg.fillStyle(0x081420);
    bg.fillRect(0, 0, MAP_W, MAP_H);
    bg.setDepth(0);

    // Ocean texture — horizontal wave lines
    const waveLine = this.add.graphics();
    waveLine.lineStyle(1, 0x0d2030, 0.8);
    for (let y = 10; y < MAP_H; y += 20) {
      waveLine.beginPath();
      waveLine.moveTo(0, y);
      for (let x = 0; x <= MAP_W; x += 30) {
        waveLine.lineTo(x, y + Math.sin(x * 0.05) * 3);
      }
      waveLine.strokePath();
    }
    waveLine.setDepth(1);

    // Scatter some lighter patches
    const deep = this.add.graphics();
    deep.fillStyle(0x0a1828, 0.5);
    for (let i = 0; i < 15; i++) {
      const rx = Phaser.Math.Between(30, MAP_W - 30);
      const ry = Phaser.Math.Between(30, MAP_H - 30);
      const rw = Phaser.Math.Between(60, 200);
      const rh = Phaser.Math.Between(40, 100);
      deep.fillEllipse(rx, ry, rw, rh);
    }
    deep.setDepth(1);
  }

  buildShip() {
    const p = this.player;
    this.ship = this.add.container(p.x, p.y);
    this.ship.setDepth(10);
    this.shipGraphic = this.drawShipGraphic(0, 0, 0xd4c090, 0x5a3010);
    this.ship.add(this.shipGraphic);

    // Wake effect graphics
    this.wake = this.add.graphics();
    this.wake.setDepth(9);
  }

  drawShipGraphic(ox, oy, sailColor, hullColor) {
    const g = this.add.graphics();
    // Hull
    g.fillStyle(hullColor);
    g.fillRect(ox - 14, oy + 2, 28, 10);
    g.fillStyle(0x7a4520);
    g.fillRect(ox - 11, oy - 4, 22, 8);
    // Mast
    g.fillStyle(0x3a2008);
    g.fillRect(ox - 1, oy - 20, 2, 22);
    // Sails
    g.fillStyle(sailColor);
    g.fillTriangle(ox, oy - 20, ox + 13, oy - 4, ox, oy - 4);
    g.fillTriangle(ox, oy - 20, ox - 11, oy - 4, ox, oy - 4);
    // Cannon
    g.fillStyle(0x333);
    g.fillRect(ox - 14, oy + 2, 3, 4);
    g.fillRect(ox + 11, oy + 2, 3, 4);
    return g;
  }

  buildPorts() {
    this.portObjects = [];
    PORTS.forEach(port => {
      const g = this.add.container(port.x, port.y);
      g.setDepth(5);

      // Island base
      const isle = this.add.graphics();
      isle.fillStyle(0x2d7a3a);
      isle.fillEllipse(0, 0, 60, 40);
      isle.fillStyle(0x4a9a52);
      isle.fillEllipse(-8, -5, 30, 20);
      isle.fillStyle(0xc8a830);
      isle.fillEllipse(8, 8, 20, 10);
      // Dock
      isle.fillStyle(0x7a5020);
      isle.fillRect(-4, 14, 8, 16);
      isle.fillRect(-10, 28, 20, 4);
      // Tiny flag
      isle.fillStyle(0xff3030);
      isle.fillRect(0, -22, 10, 6);
      isle.fillStyle(0x2a1a08);
      isle.fillRect(0, -24, 2, 18);

      g.add(isle);

      const lbl = this.add.text(0, 26, port.name, {
        fontSize: '10px',
        fill: '#e8d080',
        fontFamily: 'Courier New',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5, 0);
      g.add(lbl);

      this.portObjects.push({ data: port, container: g });
    });
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  buildHUD() {
    // Fixed overlay — not on world camera, use setScrollFactor(0)
    const style = { fontSize: '12px', fill: '#a8e8d0', fontFamily: 'Courier New', stroke: '#000', strokeThickness: 2 };

    this.hudBg = this.add.rectangle(4, 4, 220, 110, 0x000000, 0.7).setOrigin(0, 0).setScrollFactor(0).setDepth(50);
    this.hudBg.setStrokeStyle(1, 0x2a5a4a);

    this.hudGold = this.add.text(12, 10, '', style).setScrollFactor(0).setDepth(51);
    this.hudHull = this.add.text(12, 28, '', style).setScrollFactor(0).setDepth(51);
    this.hudCargo = this.add.text(12, 46, '', style).setScrollFactor(0).setDepth(51);
    this.hudCrew  = this.add.text(12, 64, '', style).setScrollFactor(0).setDepth(51);
    this.hudDay   = this.add.text(12, 82, '', style).setScrollFactor(0).setDepth(51);
    this.hudNear  = this.add.text(12, 100, '', { fontSize: '11px', fill: '#c8d080', fontFamily: 'Courier New', stroke: '#000', strokeThickness: 2 }).setScrollFactor(0).setDepth(51);

    // Dock button (shown when near port)
    this.dockBtn = this.add.rectangle(0, 0, 130, 44, 0x1a6e2e, 1).setScrollFactor(0).setDepth(52).setVisible(false);
    this.dockBtn.setStrokeStyle(2, 0xffd700);
    this.dockBtn.setInteractive({ useHandCursor: true });
    this.dockBtnTxt = this.add.text(0, 0, 'ANLEGEN', { fontSize: '16px', fill: '#fff', fontFamily: 'Courier New', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(53).setVisible(false);
    this.dockBtn.on('pointerdown', () => this.openPort(this.nearestPort));
  }

  refreshHUD() {
    const p = this.player;
    const usedCargo = Object.values(p.cargo).reduce((s, v) => s + v, 0);
    this.hudGold.setText(`Gold:  ${p.gold}`);
    this.hudHull.setText(`Rumpf: ${p.hull}/${p.maxHull}`);
    this.hudCargo.setText(`Fracht:${usedCargo}/${p.cargoCapacity}`);
    this.hudCrew.setText(`Crew:  ${p.crew}/${p.maxCrew}`);
    this.hudDay.setText(`Tag:   ${p.day}`);
  }

  positionDockBtn() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.dockBtn.setPosition(W - 70, 40);
    this.dockBtnTxt.setPosition(W - 70, 40);
  }

  // ── Mobile controls ───────────────────────────────────────────────────────

  buildMobileControls() {
    const W = this.scale.width;
    const H = this.scale.height;
    const btnSize = 46;
    const pad = 10;
    const bx = pad + btnSize;
    const by = H - pad - btnSize;

    this.mobileVel = { x: 0, y: 0 };

    const makeArrow = (x, y, label, vx, vy) => {
      const bg = this.add.rectangle(x, y, btnSize, btnSize, 0x000000, 0.5)
        .setScrollFactor(0).setDepth(60).setInteractive();
      bg.setStrokeStyle(1, 0x446644);
      const t = this.add.text(x, y, label, { fontSize: '18px', fill: '#88cc88', fontFamily: 'Courier New' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(61);

      bg.on('pointerdown', () => { this.mobileVel.x = vx; this.mobileVel.y = vy; });
      bg.on('pointerup', () => { this.mobileVel.x = 0; this.mobileVel.y = 0; });
      bg.on('pointerout', () => { this.mobileVel.x = 0; this.mobileVel.y = 0; });
      return bg;
    };

    makeArrow(bx, by - btnSize - pad, '▲', 0, -1);
    makeArrow(bx, by + btnSize + pad, '▼', 0, 1);
    makeArrow(bx - btnSize - pad, by, '◄', -1, 0);
    makeArrow(bx + btnSize + pad, by, '►', 1, 0);
    makeArrow(bx, by, '·', 0, 0);
  }

  // ── Port UI ───────────────────────────────────────────────────────────────

  buildPortUI() {
    if (this.portPanel) {
        this.portPanel.destroy();
    }
    const W = this.scale.width;
    const H = this.scale.height;
    const pw = Math.min(W - 8, 500);
    const ph = Math.min(H - 8, 560);
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;

    this.portPanel = this.add.container(0, 0).setScrollFactor(0).setDepth(80).setVisible(false);

    const bg = this.add.rectangle(px, py, pw, ph, 0x0a0e18, 0.97).setOrigin(0, 0).setStrokeStyle(2, 0xc8a020);
    this.portPanel.add(bg);

    // Tab buttons
    this.portTabs = ['MARKT', 'WERFT', 'TAVERNE', 'STATUS'];
    this.activeTab = 'MARKT';
    this.tabBtns = [];
    const tabW = Math.floor((pw - 4) / this.portTabs.length);
    this.portTabs.forEach((tab, i) => {
      const tx = px + 2 + i * tabW;
      const tbg = this.add.rectangle(tx, py + 2, tabW - 2, 32, 0x1a2a1a).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      const ttxt = this.add.text(tx + (tabW - 2) / 2, py + 18, tab, {
        fontSize: '11px', fill: '#a8d080', fontFamily: 'Courier New', fontStyle: 'bold',
      }).setOrigin(0.5);
      tbg.on('pointerdown', () => this.switchTab(tab));
      this.portPanel.add(tbg);
      this.portPanel.add(ttxt);
      this.tabBtns.push({ bg: tbg, txt: ttxt, id: tab });
    });

    // Port name
    this.portNameText = this.add.text(px + pw / 2, py + 38, '', {
      fontSize: '14px', fill: '#e8d060', fontFamily: 'Courier New', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.portPanel.add(this.portNameText);

    // Content area (will be rebuilt per tab)
    this.portContent = this.add.container(0, 0);
    this.portPanel.add(this.portContent);

    // Leave button
    const leaveX = px + pw - 2;
    const leaveY = py + ph - 2;
    const leaveBg = this.add.rectangle(leaveX, leaveY, 120, 36, 0x6e1a1a).setOrigin(1, 1).setInteractive({ useHandCursor: true });
    leaveBg.setStrokeStyle(1, 0xff6060);
    const leaveTxt = this.add.text(leaveX - 60, leaveY - 18, 'SEGEL SETZEN', {
      fontSize: '13px', fill: '#ff9090', fontFamily: 'Courier New', fontStyle: 'bold',
    }).setOrigin(0.5);
    leaveBg.on('pointerdown', () => this.closePort());
    this.portPanel.add(leaveBg);
    this.portPanel.add(leaveTxt);

    this._portPanelBounds = { px, py, pw, ph };
  }

  openPort(port) {
    this.portUIOpen = true;
    this.currentPort = port;
    this.portNameText.setText(port.name);
    this.portPanel.setVisible(true);
    this.moveTarget = null;
    this.switchTab('MARKT');
    this.positionDockBtn();
    this.dockBtn.setVisible(false);
    this.dockBtnTxt.setVisible(false);
    saveGame(this.player);
  }

  closePort() {
    this.portUIOpen = false;
    this.portPanel.setVisible(false);
    this.currentPort = null;
    this.refreshHUD();
  }

  switchTab(tab) {
    this.activeTab = tab;
    this.tabBtns.forEach(t => {
      t.bg.setFillStyle(t.id === tab ? 0x2a4a2a : 0x1a2a1a);
    });
    this.portContent.removeAll(true);
    const { px, py, pw, ph } = this._portPanelBounds;
    const contentY = py + 58;
    const contentH = ph - 58 - 44;

    if (tab === 'MARKT')   this.buildMarketTab(px + 4, contentY, pw - 8, contentH);
    if (tab === 'WERFT') this.buildShipyardTab(px + 4, contentY, pw - 8, contentH);
    if (tab === 'TAVERNE')   this.buildTavernTab(px + 4, contentY, pw - 8, contentH);
    if (tab === 'STATUS')   this.buildStatusTab(px + 4, contentY, pw - 8, contentH);
  }

  // ── Market tab ────────────────────────────────────────────────────────────

  buildMarketTab(x, y, w, h) {
    const port = this.currentPort;
    const p = this.player;
    const usedCargo = Object.values(p.cargo).reduce((s, v) => s + v, 0);

    // Header row
    const cols = ['WARE', 'KAUFEN', 'VERKAUFEN', 'BESITZ', 'AKT'];
    const colW = [w * 0.22, w * 0.17, w * 0.17, w * 0.12, w * 0.32];
    let cx = x;
    cols.forEach((c, i) => {
      this.portContent.add(this.add.text(cx + 2, y, c, { fontSize: '10px', fill: '#7aaa7a', fontFamily: 'Courier New' }));
      cx += colW[i];
    });

    this.portContent.add(this.add.rectangle(x, y + 14, w, 1, 0x2a4a2a).setOrigin(0, 0));

    GOODS.forEach((good, idx) => {
      const ry = y + 18 + idx * 44;
      const pData = port.prices[good.id];
      const buyPrice  = Math.round(good.basePrice * pData.buy);
      const sellPrice = Math.round(good.basePrice * pData.sell);
      const owned = p.cargo[good.id] || 0;

      // Price indicator
      const indicator = pData.buy <= 0.75 ? '★ CHEAP' : pData.buy >= 1.6 ? '▲ PRICEY' : 'NORMAL';
      const indColor  = pData.buy <= 0.75 ? '#60e060' : pData.buy >= 1.6 ? '#e06060' : '#a0a0a0';

      this.portContent.add(this.add.text(x + 2, ry, good.name, { fontSize: '12px', fill: '#d8c080', fontFamily: 'Courier New' }));
      this.portContent.add(this.add.text(x + colW[0], ry, String(buyPrice), { fontSize: '12px', fill: '#70d070', fontFamily: 'Courier New' }));
      this.portContent.add(this.add.text(x + colW[0] + colW[1], ry, String(sellPrice), { fontSize: '12px', fill: '#d07070', fontFamily: 'Courier New' }));
      this.portContent.add(this.add.text(x + colW[0] + colW[1] + colW[2], ry, String(owned), { fontSize: '12px', fill: '#a0c8e0', fontFamily: 'Courier New' }));
      this.portContent.add(this.add.text(x + 2, ry + 14, indicator, { fontSize: '9px', fill: indColor, fontFamily: 'Courier New' }));

      const btnX = x + colW[0] + colW[1] + colW[2] + colW[3] - 4;

      // Buy button
      const buyBg = this.add.rectangle(btnX - 66, ry + 6, 52, 22, 0x1a4a1a).setOrigin(0.5).setInteractive({ useHandCursor: true });
      buyBg.setStrokeStyle(1, 0x40a040);
      const buyTxt = this.add.text(btnX - 66, ry + 6, 'KAUFEN', { fontSize: '11px', fill: '#80e080', fontFamily: 'Courier New' }).setOrigin(0.5);
      buyBg.on('pointerdown', () => this.buyGood(good, buyPrice, usedCargo));
      this.portContent.add(buyBg);
      this.portContent.add(buyTxt);

      // Sell button
      const sellBg = this.add.rectangle(btnX - 8, ry + 6, 52, 22, 0x4a1a1a).setOrigin(0.5).setInteractive({ useHandCursor: true });
      sellBg.setStrokeStyle(1, 0xa04040);
      const sellTxt = this.add.text(btnX - 8, ry + 6, 'VERKAUFEN', { fontSize: '11px', fill: '#e08080', fontFamily: 'Courier New' }).setOrigin(0.5);
      sellBg.on('pointerdown', () => this.sellGood(good, sellPrice));
      this.portContent.add(sellBg);
      this.portContent.add(sellTxt);
    });

    this.portContent.add(this.add.text(x, y + h - 16, `Gold: ${p.gold}  Fracht: ${usedCargo}/${p.cargoCapacity}`, {
      fontSize: '11px', fill: '#c8c860', fontFamily: 'Courier New',
    }));
  }

  buyGood(good, price, _usedCargo) {
    const p = this.player;
    const usedCargo = Object.values(p.cargo).reduce((s, v) => s + v, 0);
    if (p.gold < price) { this.showToast('Nicht genug Gold!'); return; }
    if (usedCargo >= p.cargoCapacity) { this.showToast('Cargo hold is full!'); return; }
    p.gold -= price;
    p.cargo[good.id] = (p.cargo[good.id] || 0) + 1;
    saveGame(p);
    this.refreshHUD();
    this.switchTab('MARKT');
  }

  sellGood(good, price) {
    const p = this.player;
    if (!p.cargo[good.id] || p.cargo[good.id] <= 0) { this.showToast('Nothing to sell!'); return; }
    p.gold += price;
    p.cargo[good.id] -= 1;
    if (p.cargo[good.id] === 0) delete p.cargo[good.id];
    saveGame(p);
    this.refreshHUD();
    this.switchTab('MARKT');
  }

  // ── Shipyard tab ──────────────────────────────────────────────────────────

  buildShipyardTab(x, y, w, h) {
    const p = this.player;

    UPGRADES.forEach((upg, i) => {
      const uy = y + i * 80;
      const lvl = p.upgradeLevel[upg.id] || 0;
      const maxed = lvl >= upg.maxLevel;
      const price = upg.price(lvl);

      this.portContent.add(this.add.text(x, uy, upg.name, { fontSize: '13px', fill: '#e8c840', fontFamily: 'Courier New', fontStyle: 'bold' }));
      this.portContent.add(this.add.text(x, uy + 16, `Stufe ${lvl}/${upg.maxLevel}  •  ${upg.desc}`, { fontSize: '10px', fill: '#a0b8a0', fontFamily: 'Courier New', wordWrap: { width: w - 130 } }));

      if (!maxed) {
        this.portContent.add(this.add.text(x, uy + 38, `Kosten: ${price} Gold`, { fontSize: '11px', fill: '#c8d060', fontFamily: 'Courier New' }));
        const btnBg = this.add.rectangle(x + w - 70, uy + 30, 110, 28, p.gold >= price ? 0x1a4a2a : 0x2a2a2a).setInteractive({ useHandCursor: true });
        btnBg.setStrokeStyle(1, p.gold >= price ? 0x60c060 : 0x444);
        const btnTxt = this.add.text(x + w - 70, uy + 30, 'VERBESSERN', { fontSize: '11px', fill: p.gold >= price ? '#80e080' : '#666', fontFamily: 'Courier New' }).setOrigin(0.5);
        if (p.gold >= price) {
          btnBg.on('pointerdown', () => this.buyUpgrade(upg));
        }
        this.portContent.add(btnBg);
        this.portContent.add(btnTxt);
      } else {
        this.portContent.add(this.add.text(x + w - 100, uy + 30, '✓ MAXIMAL', { fontSize: '13px', fill: '#60e060', fontFamily: 'Courier New' }));
      }

      this.portContent.add(this.add.rectangle(x, uy + 68, w, 1, 0x223322).setOrigin(0, 0));
    });

    // Repair option
    const repairY = y + UPGRADES.length * 80 + 10;
    const repairCost = Math.floor((p.maxHull - p.hull) * 2);
    if (repairCost > 0) {
      this.portContent.add(this.add.text(x, repairY, `Rumpf reparieren (+${p.maxHull - p.hull} HP)  Kosten: ${repairCost} Gold`, { fontSize: '12px', fill: '#80c0e0', fontFamily: 'Courier New' }));
      const rb = this.add.rectangle(x + w - 70, repairY + 8, 110, 28, p.gold >= repairCost ? 0x1a3a5a : 0x2a2a2a).setInteractive({ useHandCursor: true });
      rb.setStrokeStyle(1, p.gold >= repairCost ? 0x4080c0 : 0x444);
      const rt = this.add.text(x + w - 70, repairY + 8, 'REPARIEREN', { fontSize: '11px', fill: p.gold >= repairCost ? '#80c0ff' : '#666', fontFamily: 'Courier New' }).setOrigin(0.5);
      if (p.gold >= repairCost) {
        rb.on('pointerdown', () => {
          p.gold -= repairCost;
          p.hull = p.maxHull;
          saveGame(p);
          this.refreshHUD();
          this.switchTab('WERFT');
        });
      }
      this.portContent.add(rb);
      this.portContent.add(rt);
    }
  }

  buyUpgrade(upg) {
    const p = this.player;
    const lvl = p.upgradeLevel[upg.id] || 0;
    const price = upg.price(lvl);
    if (p.gold < price) { this.showToast('Nicht genug Gold!'); return; }
    p.gold -= price;
    p.upgradeLevel[upg.id] = lvl + 1;
    const newLvl = lvl + 1;
    const fx = upg.effect(newLvl);
    if (fx.maxHull) { p.maxHull = 100 + fx.maxHull; p.hull = Math.min(p.hull + (fx.hullRepair || 0), p.maxHull); }
    if (fx.cannons) { p.cannons = 2 + fx.cannons; }
    if (fx.speed)   { p.speed = 100 + fx.speed; }
    if (fx.cargoCapacity) { p.cargoCapacity = 20 + fx.cargoCapacity; }
    saveGame(p);
    this.refreshHUD();
    this.switchTab('WERFT');
    this.showToast('Verbesserung gekauft!');
  }

  // ── Tavern tab ────────────────────────────────────────────────────────────

  buildTavernTab(x, y, w, h) {
    const p = this.player;

    this.portContent.add(this.add.text(x, y, 'DIE TAVERNE', { fontSize: '14px', fill: '#c88030', fontFamily: 'Courier New', fontStyle: 'bold' }));

    // Hire crew
    const crewSlots = p.maxCrew - p.crew;
    const crewCost = 60;
    this.portContent.add(this.add.text(x, y + 28, `Crew: ${p.crew}/${p.maxCrew}`, { fontSize: '12px', fill: '#d0a060', fontFamily: 'Courier New' }));
    if (crewSlots > 0) {
      this.portContent.add(this.add.text(x, y + 48, `Matrosen anheuern  (${crewCost} Gold)`, { fontSize: '12px', fill: '#a8c890', fontFamily: 'Courier New' }));
      const hb = this.add.rectangle(x + w - 70, y + 56, 110, 28, p.gold >= crewCost ? 0x3a2a10 : 0x2a2a2a).setInteractive({ useHandCursor: true });
      hb.setStrokeStyle(1, 0x907040);
      const ht = this.add.text(x + w - 70, y + 56, 'ANHEUERN', { fontSize: '11px', fill: '#d0a060', fontFamily: 'Courier New' }).setOrigin(0.5);
      if (p.gold >= crewCost) {
        hb.on('pointerdown', () => { p.gold -= crewCost; p.crew++; saveGame(p); this.refreshHUD(); this.switchTab('TAVERNE'); });
      }
      this.portContent.add(hb);
      this.portContent.add(ht);
    }

    // Buy morale
    const moraleCost = 40;
    this.portContent.add(this.add.rectangle(x, y + 90, w, 1, 0x443322).setOrigin(0, 0));
    this.portContent.add(this.add.text(x, y + 96, `Moral: ${p.morale}/100`, { fontSize: '12px', fill: '#d09060', fontFamily: 'Courier New' }));
    this.portContent.add(this.add.text(x, y + 114, `Eine Runde Getränke  (+15 Moral, ${moraleCost} Gold)`, { fontSize: '11px', fill: '#b0906a', fontFamily: 'Courier New' }));
    const mb = this.add.rectangle(x + w - 70, y + 120, 110, 28, p.gold >= moraleCost ? 0x3a2010 : 0x2a2a2a).setInteractive({ useHandCursor: true });
    mb.setStrokeStyle(1, 0x907040);
    const mt = this.add.text(x + w - 70, y + 120, 'GETRÄNKE', { fontSize: '11px', fill: '#d09060', fontFamily: 'Courier New' }).setOrigin(0.5);
    if (p.gold >= moraleCost) {
      mb.on('pointerdown', () => { p.gold -= moraleCost; p.morale = Math.min(100, p.morale + 15); saveGame(p); this.refreshHUD(); this.switchTab('TAVERNE'); });
    }
    this.portContent.add(mb);
    this.portContent.add(mt);

    // Rumors
    this.portContent.add(this.add.rectangle(x, y + 152, w, 1, 0x443322).setOrigin(0, 0));
    this.portContent.add(this.add.text(x, y + 158, 'GERÜCHTE:', { fontSize: '11px', fill: '#907060', fontFamily: 'Courier New', fontStyle: 'bold' }));
    const rumorPick = Phaser.Utils.Array.GetRandom(RUMORS);
    const rumorPick2 = Phaser.Utils.Array.GetRandom(RUMORS.filter(r => r !== rumorPick));
    [rumorPick, rumorPick2].forEach((r, i) => {
      this.portContent.add(this.add.text(x, y + 178 + i * 30, `"${r}"`, {
        fontSize: '10px', fill: '#907860', fontFamily: 'Courier New', fontStyle: 'italic',
        wordWrap: { width: w - 4 },
      }));
    });
  }

  // ── Status tab ────────────────────────────────────────────────────────────

  buildStatusTab(x, y, w, h) {
    const p = this.player;
    const usedCargo = Object.values(p.cargo).reduce((s, v) => s + v, 0);

    const lines = [
      `Ship:        ${p.name}`,
      `Gold:        ${p.gold}`,
      `Hull:        ${p.hull} / ${p.maxHull}`,
      `Cannons:     ${p.cannons}`,
      `Speed:       ${p.speed}`,
      `Cargo:       ${usedCargo} / ${p.cargoCapacity}`,
      `Crew:        ${p.crew} / ${p.maxCrew}`,
      `Morale:      ${p.morale}`,
      `Reputation:  ${p.reputation}`,
      `Day:         ${p.day}`,
      `Enemies:     ${p.enemiesDefeated} defeated`,
      '',
      '--- CARGO HOLD ---',
    ];

    GOODS.forEach(g => {
      const qty = p.cargo[g.id] || 0;
      if (qty > 0) lines.push(`  ${g.name}: ${qty}`);
    });
    if (Object.values(p.cargo).reduce((s, v) => s + v, 0) === 0) lines.push('  (empty)');

    lines.push('', '--- UPGRADES ---');
    UPGRADES.forEach(u => {
      const lvl = p.upgradeLevel[u.id] || 0;
      lines.push(`  ${u.name}: Lv ${lvl}/${u.maxLevel}`);
    });

    lines.forEach((line, i) => {
      this.portContent.add(this.add.text(x, y + i * 16, line, { fontSize: '11px', fill: '#a0c8a0', fontFamily: 'Courier New' }));
    });
  }

  // ── Combat UI ─────────────────────────────────────────────────────────────

  buildCombatUI() {
    if (this.combatPanel) this.combatPanel.destroy();
    const W = this.scale.width;
    const H = this.scale.height;
    const cw = Math.min(W - 8, 420);
    const ch = Math.min(H - 8, 440);
    const cx = (W - cw) / 2;
    const cy = (H - ch) / 2;

    this.combatPanel = this.add.container(0, 0).setScrollFactor(0).setDepth(90).setVisible(false);

    const bg = this.add.rectangle(cx, cy, cw, ch, 0x100a08, 0.98).setOrigin(0, 0).setStrokeStyle(2, 0xaa3020);
    this.combatPanel.add(bg);

    this.combatTitle = this.add.text(cx + cw / 2, cy + 10, 'KAMPF!', {
      fontSize: '18px', fill: '#ff6040', fontFamily: 'Courier New', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.combatPanel.add(this.combatTitle);

    // Ship art
    const playerShipG = this.drawCombatShip(cx + cw * 0.22, cy + 100, false);
    const enemyShipG  = this.drawCombatShip(cx + cw * 0.78, cy + 100, true);
    this.combatPanel.add(playerShipG);
    this.combatPanel.add(enemyShipG);

    const statStyle = { fontSize: '11px', fill: '#d0c090', fontFamily: 'Courier New' };
    this.combatPlayerStats = this.add.text(cx + 10, cy + 150, '', statStyle);
    this.combatEnemyStats  = this.add.text(cx + cw - 10, cy + 150, '', { ...statStyle, align: 'right' }).setOrigin(1, 0);
    this.combatPanel.add(this.combatPlayerStats);
    this.combatPanel.add(this.combatEnemyStats);

    this.combatLog = this.add.text(cx + 8, cy + 240, '', {
      fontSize: '11px', fill: '#c0a860', fontFamily: 'Courier New',
      wordWrap: { width: cw - 16 },
    });
    this.combatPanel.add(this.combatLog);

    // Buttons
    const btnY = cy + ch - 48;
    const btnW = Math.floor((cw - 24) / 3);
    ['FEUER', 'REPARIEREN', 'FLIEHEN'].forEach((lbl, i) => {
      const bx = cx + 8 + i * (btnW + 4) + btnW / 2;
      const colors = [0x6e1a08, 0x1a4a2a, 0x1a1a6e];
      const b = this.add.rectangle(bx, btnY, btnW, 36, colors[i]).setInteractive({ useHandCursor: true });
      b.setStrokeStyle(1, 0x888860);
      const t = this.add.text(bx, btnY, lbl, { fontSize: '13px', fill: '#fff', fontFamily: 'Courier New', fontStyle: 'bold' }).setOrigin(0.5);
      if (lbl === 'FEUER')   b.on('pointerdown', () => this.combatFire());
      if (lbl === 'REPARIEREN') b.on('pointerdown', () => this.combatRepair());
      if (lbl === 'FLIEHEN')   b.on('pointerdown', () => this.combatFlee());
      this.combatPanel.add(b);
      this.combatPanel.add(t);
    });

    this._combatBounds = { cx, cy, cw, ch };
  }

  drawCombatShip(x, y, flip) {
    const g = this.add.graphics();
    const sx = flip ? -1 : 1;
    g.x = x; g.y = y;
    // Hull
    g.fillStyle(flip ? 0x5a1010 : 0x5a3010);
    g.fillRect(-20 * sx, 10, 40 * sx, 16);
    g.fillStyle(flip ? 0x8a2020 : 0x7a4520);
    g.fillRect(-16 * sx, 2, 32 * sx, 10);
    // Mast
    g.fillStyle(0x3a2008);
    g.fillRect(-1 * sx, -28, 2 * sx, 32);
    // Sail
    g.fillStyle(flip ? 0xc0a0a0 : 0xd4c090);
    g.fillTriangle(0, -28, 18 * sx, -2, 0, -2);
    g.fillTriangle(0, -28, -14 * sx, -2, 0, -2);
    return g;
  }

  startCombat(enemy) {
    this.inCombat = true;
    this.combatResolving = false;
    this.enemy = enemy;
    this.combatPanel.setVisible(true);
    this.combatTitle.setText(`ANGRIFF! — ${enemy.name}`);
    this.updateCombatStats();
    this.combatLog.setText('Ein feindliches Schiff greift an!\nMach dich bereit zum Kampf!');
  }

  updateCombatStats() {
    const p = this.player;
    const e = this.enemy;
    this.combatPlayerStats.setText(
      `YOUR SHIP\nHull: ${p.hull}/${p.maxHull}\nCannons: ${p.cannons}\nCrew: ${p.crew}`
    );
    this.combatEnemyStats.setText(
      `ENEMY\nHull: ${e.hull}/${e.maxHull}\nCannons: ${e.cannons}\nCrew: ${e.crew}`
    );
  }

  combatFire() {
    if (!this.inCombat || this.combatResolving) return;
    const p = this.player;
    const e = this.enemy;
    const crewBonus  = Math.max(0.5, p.crew / p.maxCrew);
    const moraleBonus = p.morale / 100;
    const dmg = Math.round((p.cannons * 8 + Phaser.Math.Between(2, 10)) * crewBonus * (0.8 + moraleBonus * 0.4));
    e.hull -= dmg;
    let log = `You fire! Dealt ${dmg} damage.`;

    if (e.hull <= 0) {
      e.hull = 0;
      this.combatResolving = true;
      this.updateCombatStats();
      this.combatLog.setText(log + '\nENEMY DEFEATED!');
      this.time.delayedCall(1200, () => this.endCombat(true));
      return;
    }

    // Enemy retaliates
    const eDmg = Math.round((e.cannons * 7 + Phaser.Math.Between(1, 8)) * (0.6 + Math.random() * 0.6));
    p.hull -= eDmg;
    log += `\nEnemy fires back! You take ${eDmg} damage.`;

    if (p.hull <= 0) {
      p.hull = 0;
      this.combatResolving = true;
      this.updateCombatStats();
      this.combatLog.setText(log + '\nDEIN SCHIFF SINKT!');
      this.time.delayedCall(1200, () => this.endCombat(false));
      return;
    }

    this.updateCombatStats();
    this.combatLog.setText(log);
  }

  combatRepair() {
    if (!this.inCombat || this.combatResolving) return;
    const p = this.player;
    const e = this.enemy;
    const repairAmt = Math.round(p.crew * 1.5 + Phaser.Math.Between(2, 6));
    p.hull = Math.min(p.maxHull, p.hull + repairAmt);
    let log = `Die Crew repariert den Rumpf (+${repairAmt} HP).`;

    const eDmg = Math.round((e.cannons * 7 + Phaser.Math.Between(1, 8)) * (0.6 + Math.random() * 0.6));
    p.hull -= eDmg;
    log += `\nFeind feuert! Du nimmst ${eDmg} Schaden.`;

    if (p.hull <= 0) {
      p.hull = 0;
      this.combatResolving = true;
      this.updateCombatStats();
      this.combatLog.setText(log + '\nDEIN SCHIFF SINKT!');
      this.time.delayedCall(1200, () => this.endCombat(false));
      return;
    }

    this.updateCombatStats();
    this.combatLog.setText(log);
  }

  combatFlee() {
    if (!this.inCombat || this.combatResolving) return;
    const p = this.player;
    const e = this.enemy;
    const fleeChance = Math.min(0.8, (p.speed / 200) + (p.crew / p.maxCrew) * 0.2);
    if (Math.random() < fleeChance) {
      this.combatResolving = true;
      this.combatLog.setText('Du entkommst! (Knapp...)');
      this.time.delayedCall(900, () => this.endCombat(null));
    } else {
      const eDmg = Math.round((e.cannons * 7 + Phaser.Math.Between(2, 10)) * (0.7 + Math.random() * 0.5));
      p.hull -= eDmg;
      let log = `Flucht gescheitert! Der Feind trifft für ${eDmg} Schaden.`;
      if (p.hull <= 0) {
      p.hull = 0;
      this.combatResolving = true;
      this.updateCombatStats();
      this.combatLog.setText(log + '\nDEIN SCHIFF SINKT!');
      this.time.delayedCall(1200, () => this.endCombat(false));
      return;
    }
      this.updateCombatStats();
      this.combatLog.setText(log);
    }
  }

  endCombat(won) {
    if (!this.inCombat && !this.combatResolving) return;
    this.inCombat = false;
    this.combatResolving = false;
    if (this.combatPanel) this.combatPanel.setVisible(false);
    const p = this.player;

    if (won === true) {
      const loot = Phaser.Math.Between(50, 150) + this.enemy.reward;
      p.gold += loot;
      p.reputation = Math.min(100, p.reputation + 5);
      p.morale = Math.min(100, p.morale + 10);
      p.enemiesDefeated = (p.enemiesDefeated || 0) + 1;
      this.showToast(`Sieg! +${loot} Gold!`);
    } else if (won === false) {
      this.triggerGameOver();
      return;
    }

    saveGame(p);
    this.refreshHUD();
  }

  // ── Random event UI ───────────────────────────────────────────────────────

  buildEventUI() {
    const W = this.scale.width;
    const H = this.scale.height;
    const ew = Math.min(W - 8, 380);
    const eh = 200;
    const ex = (W - ew) / 2;
    const ey = (H - eh) / 2;

    this.eventPanel = this.add.container(0, 0).setScrollFactor(0).setDepth(85).setVisible(false);
    const bg = this.add.rectangle(ex, ey, ew, eh, 0x0c1020, 0.96).setOrigin(0, 0).setStrokeStyle(2, 0x607090);
    this.eventBg = bg;
    this.eventPanel.add(bg);

    this.eventTitle = this.add.text(ex + ew / 2, ey + 12, '', { fontSize: '14px', fill: '#e0c060', fontFamily: 'Courier New', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.eventPanel.add(this.eventTitle);

    this.eventBody = this.add.text(ex + 10, ey + 40, '', { fontSize: '11px', fill: '#b0c090', fontFamily: 'Courier New', wordWrap: { width: ew - 20 } });
    this.eventPanel.add(this.eventBody);

    this.eventBtn1 = this.makeEventBtn(ex + ew / 4, ey + eh - 36, 'OK', 0x1a3a1a);
    this.eventBtn2 = this.makeEventBtn(ex + ew * 3 / 4, ey + eh - 36, 'IGNORIEREN', 0x2a2a2a);
    this.eventPanel.add(this.eventBtn1.bg);
    this.eventPanel.add(this.eventBtn1.txt);
    this.eventPanel.add(this.eventBtn2.bg);
    this.eventPanel.add(this.eventBtn2.txt);
    this._evBounds = { ex, ey, ew, eh };
  }

  makeEventBtn(x, y, label, color) {
    const bg = this.add.rectangle(x, y, 110, 32, color).setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(1, 0x607090);
    const txt = this.add.text(x, y, label, { fontSize: '13px', fill: '#fff', fontFamily: 'Courier New' }).setOrigin(0.5);
    return { bg, txt };
  }

  triggerRandomEvent() {
    if (this.portUIOpen || this.inCombat || this.gameOver) return;
    const types = ['pirat', 'sturm', 'treibgut', 'händler', 'marine'];
    const weights = [30, 20, 25, 15, 10];
    const roll = Phaser.Math.Between(1, 100);
    let acc = 0;
    let chosen = 'sturm';
    for (let i = 0; i < types.length; i++) {
      acc += weights[i];
      if (roll <= acc) { chosen = types[i]; break; }
    }
    this.showEvent(chosen);
  }

  showEvent(type) {
    this.eventPanel.setVisible(true);
    this.moveTarget = null;
    this.mobileVel = { x: 0, y: 0 };

    // Clear old listeners
    this.eventBtn1.bg.removeAllListeners('pointerdown');
    this.eventBtn2.bg.removeAllListeners('pointerdown');
    this.eventBtn2.txt.setVisible(true);
    this.eventBtn2.bg.setVisible(true);

    const p = this.player;

    if (type === 'pirat') {
      const strength = Math.max(1, Math.floor(p.reputation / 15) + Math.floor(p.enemiesDefeated / 3));
      const enemyCannons = Math.min(10, 2 + strength);
      const enemyHull = Math.min(200, 60 + strength * 15);
      this.eventTitle.setText('⚠ PIRATENANGRIFF!');
      this.eventBody.setText(`Ein Piratenschiff taucht aus dem Nebel auf!\nSie sehen ${strength > 3 ? 'gefährlich' : 'machbar'} aus.\n\nKanonen: ${enemyCannons}   Rumpf: ${enemyHull}`);
      this.eventBtn1.txt.setText('KÄMPFEN');
      this.eventBtn2.txt.setText('FLUCHT VERSUCHEN');
      this.eventBtn1.bg.on('pointerdown', () => {
        this.eventPanel.setVisible(false);
        this.startCombat({ name: 'Pirate Ship', hull: enemyHull, maxHull: enemyHull, cannons: enemyCannons, crew: 6 + strength, reward: 30 + strength * 20 });
      });
      this.eventBtn2.bg.on('pointerdown', () => {
        this.eventPanel.setVisible(false);
        const escaped = Math.random() < (p.speed / 250);
        if (escaped) {
          this.showToast('You escaped!');
        } else {
          const dmg = Phaser.Math.Between(10, 30);
          p.hull -= dmg;
          p.morale = Math.max(0, p.morale - 5);
          this.showToast(`Caught! Took ${dmg} damage!`);
          if (p.hull <= 0) { this.triggerGameOver(); return; }
          saveGame(p); this.refreshHUD();
        }
      });
    } else if (type === 'sturm') {
      const dmg = Phaser.Math.Between(8, 25);
      const cargoLoss = Math.random() < 0.3;
      this.eventTitle.setText('⚡ STORM!');
      this.eventBody.setText(`Dunkle Wolken! Ein heftiger Sturm beutelt dein Schiff!\nDu nimmst ${dmg} Rumpfschaden.${cargoLoss ? '\nEtwas Fracht wird über Bord gespült!' : ''}`);
      this.eventBtn1.txt.setText('WEITERSEGELN');
      this.eventBtn2.txt.setVisible(false);
      this.eventBtn2.bg.setVisible(false);
      this.eventBtn1.bg.on('pointerdown', () => {
        p.hull = Math.max(1, p.hull - dmg);
        if (cargoLoss) {
          const keys = Object.keys(p.cargo).filter(k => p.cargo[k] > 0);
          if (keys.length) {
            const k = Phaser.Utils.Array.GetRandom(keys);
            p.cargo[k] = Math.max(0, p.cargo[k] - Phaser.Math.Between(1, 3));
            if (p.cargo[k] <= 0) delete p.cargo[k];
          }
        }
        saveGame(p); this.refreshHUD();
        this.eventPanel.setVisible(false);
      });
    } else if (type === 'treibgut') {
      const goldFind = Phaser.Math.Between(20, 80);
      this.eventTitle.setText('★ TREIBGUT GEFUNDEN!');
      this.eventBody.setText(`Dein Ausguck entdeckt Trümmer auf dem Wasser.\nDu birgst Bergut im Wert von ${goldFind} Gold!`);
      this.eventBtn1.txt.setText('COLLECT');
      this.eventBtn2.txt.setVisible(false);
      this.eventBtn2.bg.setVisible(false);
      this.eventBtn1.bg.on('pointerdown', () => {
        p.gold += goldFind;
        saveGame(p); this.refreshHUD();
        this.eventPanel.setVisible(false);
        this.showToast(`+${goldFind} gold!`);
      });
    } else if (type === 'händler') {
      const goodIdx = Phaser.Math.Between(0, GOODS.length - 1);
      const good = GOODS[goodIdx];
      const discountPrice = Math.round(good.basePrice * 0.8);
      const usedCargo = Object.values(p.cargo).reduce((s, v) => s + v, 0);
      this.eventTitle.setText('⛵ HÄNDLER GESICHTET!');
      this.eventBody.setText(`Ein Handelsschiff ruft dich an.\nSie bieten: ${good.name} für ${discountPrice} Gold pro Stück.\n\nGold: ${p.gold}   Freie Fracht: ${p.cargoCapacity - usedCargo}`);
      this.eventBtn1.txt.setText('1 KAUFEN');
      this.eventBtn2.txt.setText('WEITER');
      this.eventBtn1.bg.on('pointerdown', () => {
        const uc = Object.values(p.cargo).reduce((s, v) => s + v, 0);
        if (p.gold < discountPrice) { this.showToast('Nicht genug Gold!'); return; }
        if (uc >= p.cargoCapacity) { this.showToast('Cargo full!'); return; }
        p.gold -= discountPrice;
        p.cargo[good.id] = (p.cargo[good.id] || 0) + 1;
        saveGame(p); this.refreshHUD();
        this.eventPanel.setVisible(false);
        this.showToast(`Bought ${good.name}!`);
      });
      this.eventBtn2.bg.on('pointerdown', () => { this.eventPanel.setVisible(false); });
    } else if (type === 'marine') {
      this.eventTitle.setText('⚓ MARINE PATROL!');
      if (p.reputation < -5) {
        const dmg = Phaser.Math.Between(5, 20);
        const fine = Math.min(p.gold, Phaser.Math.Between(30, 100));
        this.eventBody.setText(`Eine Marinepatrouille erkennt deine Flagge!\nDein Ruf eilt dir voraus.\nSie feuern einen Warnschuss (${dmg} Schaden) und fordern ${fine} Gold!`);
        this.eventBtn1.txt.setText('STRAFE ZAHLEN');
        this.eventBtn2.txt.setText('FLUCHT!');
        this.eventBtn1.bg.on('pointerdown', () => {
          p.gold -= fine;
          p.hull -= dmg;
          if (p.hull <= 0) { this.triggerGameOver(); return; }
          saveGame(p); this.refreshHUD();
          this.eventPanel.setVisible(false);
        });
        this.eventBtn2.bg.on('pointerdown', () => {
          p.hull -= dmg * 2;
          if (p.hull <= 0) { this.triggerGameOver(); return; }
          saveGame(p); this.refreshHUD();
          this.eventPanel.setVisible(false);
          this.showToast('Escaped the Navy!');
        });
      } else {
        this.eventBody.setText('A Navy patrol vessel passes nearby.\nThey wave — your reputation is clean.\n\nThey move on without incident.');
        this.eventBtn1.txt.setText('WAVE BACK');
        this.eventBtn2.txt.setVisible(false);
        this.eventBtn2.bg.setVisible(false);
        this.eventBtn1.bg.on('pointerdown', () => { this.eventPanel.setVisible(false); });
      }
    }
  }

  // ── Game over ─────────────────────────────────────────────────────────────

  buildGameOverUI() {
    if (this.gameOverPanel) this.gameOverPanel.destroy();
    const W = this.scale.width;
    const H = this.scale.height;

    this.gameOverPanel = this.add.container(0, 0).setScrollFactor(0).setDepth(100).setVisible(false);
    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.85).setOrigin(0, 0);
    this.gameOverPanel.add(bg);

    this.gameOverTitle = this.add.text(W / 2, H * 0.2, 'DEIN SCHIFF IST GESUNKEN', { fontSize: '22px', fill: '#ff4020', fontFamily: 'Courier New', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    this.gameOverPanel.add(this.gameOverTitle);

    this.gameOverStats = this.add.text(W / 2, H * 0.42, '', { fontSize: '13px', fill: '#c0c080', fontFamily: 'Courier New', align: 'center' }).setOrigin(0.5);
    this.gameOverPanel.add(this.gameOverStats);

    const newBg = this.add.rectangle(W / 2, H * 0.68, 200, 44, 0x1a6e2e).setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0xffd700);
    const newTxt = this.add.text(W / 2, H * 0.68, 'NEUES SPIEL', { fontSize: '16px', fill: '#fff', fontFamily: 'Courier New', fontStyle: 'bold' }).setOrigin(0.5);
    newBg.on('pointerdown', () => {
      deleteSave();
      this.registry.set('player', JSON.parse(JSON.stringify(INITIAL_PLAYER)));
      this.scene.start('MenuScene');
    });
    this.gameOverPanel.add(newBg);
    this.gameOverPanel.add(newTxt);
  }

  triggerGameOver() {
    this.gameOver = true;
    this.inCombat = false;
    this.combatResolving = false;
    if (this.combatPanel) this.combatPanel.setVisible(false);
    if (this.eventPanel) this.eventPanel.setVisible(false);
    deleteSave();
    const p = this.player;
    this.gameOverStats.setText(
      `Gold earned: ${p.gold}\nDays survived: ${p.day}\nEnemies defeated: ${p.enemiesDefeated || 0}\nReputation: ${p.reputation}`
    );
    this.gameOverPanel.setVisible(true);
  }

  // ── Toast notification ────────────────────────────────────────────────────

  showToast(msg) {
    const W = this.scale.width;
    const t = this.add.text(W / 2, this.scale.height * 0.35, msg, {
      fontSize: '14px', fill: '#ffe060', fontFamily: 'Courier New', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3, backgroundColor: '#00000088', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(99);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 30, duration: 1800, ease: 'Power2', onComplete: () => t.destroy() });
  }

  // ── Update loop ───────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.gameOver || this.portUIOpen || this.inCombat) {
      if (this.portUIOpen) this.positionDockBtn();
      return;
    }

    this.moveShip(delta);
    this.checkPortProximity();
    this.checkRandomEvent(time);
    this.advanceDay(delta);

    // Save position periodically
    this.player.x = this.ship.x;
    this.player.y = this.ship.y;
  }

  moveShip(delta) {
    const p = this.player;
    const speed = (SHIP_SPEED + (p.speed - 100) * 0.4) * (delta / 1000);
    const crewFactor = Math.max(0.5, p.crew / p.maxCrew);
    const actualSpeed = speed * crewFactor;

    let vx = 0, vy = 0;

    // Keyboard
    if (this.cursors.left.isDown  || this.wasd.left.isDown)  vx = -1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
    if (this.cursors.up.isDown    || this.wasd.up.isDown)    vy = -1;
    if (this.cursors.down.isDown  || this.wasd.down.isDown)  vy = 1;

    // Mobile buttons
    if (this.mobileVel) { vx += this.mobileVel.x; vy += this.mobileVel.y; }

    // Tap-to-move
    if ((vx === 0 && vy === 0) && this.moveTarget) {
      const dx = this.moveTarget.x - this.ship.x;
      const dy = this.moveTarget.y - this.ship.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 8) {
        this.moveTarget = null;
      } else {
        vx = dx / dist;
        vy = dy / dist;
      }
    }

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    if (vx !== 0 || vy !== 0) {
      this.ship.x = Phaser.Math.Clamp(this.ship.x + vx * actualSpeed, 20, MAP_W - 20);
      this.ship.y = Phaser.Math.Clamp(this.ship.y + vy * actualSpeed, 20, MAP_H - 20);

      // Rotate ship to movement direction
      if (vx !== 0 || vy !== 0) {
        this.ship.rotation = Math.atan2(vy, vx) + Math.PI / 2;
      }

      // Wake effect
      this.drawWake();
    }
  }

  drawWake() {
    this.wake.clear();
    this.wake.fillStyle(0x1a4a6a, 0.4);
    const bx = this.ship.x - Math.sin(this.ship.rotation) * 18;
    const by = this.ship.y + Math.cos(this.ship.rotation) * 18;
    this.wake.fillEllipse(bx, by, 16, 8);
    this.wake.fillEllipse(bx - 6, by + 8, 8, 5);
    this.wake.fillEllipse(bx + 6, by + 8, 8, 5);
  }

  checkPortProximity() {
    let nearest = null;
    let nearestDist = Infinity;

    PORTS.forEach(port => {
      const dx = this.ship.x - port.x;
      const dy = this.ship.y - port.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) { nearestDist = dist; nearest = port; }
    });

    this.nearestPort = nearest;
    const W = this.scale.width;
    const H = this.scale.height;

    if (nearestDist < DOCK_DIST) {
      this.dockBtn.setVisible(true);
      this.dockBtnTxt.setVisible(true);
      this.positionDockBtn();
      this.dockBtnTxt.setText(`ANLEGEN: ${nearest.name}`);
      this.hudNear.setText(`Nahe: ${nearest.name}`);
    } else {
      this.dockBtn.setVisible(false);
      this.dockBtnTxt.setVisible(false);
      if (nearest) {
        this.hudNear.setText(`Nearest: ${nearest.name}`);
      }
    }
  }

  checkRandomEvent(time) {
    if (time - this.lastEventTime < EVENT_INTERVAL) return;
    this.lastEventTime = time;
    if (Math.random() < 0.35) {
      this.triggerRandomEvent();
    }
  }

  advanceDay(delta) {
    this.dayTimer += delta;
    if (this.dayTimer >= 30000) {
      this.dayTimer = 0;
      this.player.day++;
      // Morale slowly decays
      this.player.morale = Math.max(10, this.player.morale - 1);
      this.refreshHUD();
      saveGame(this.player);
    }
  }

  onMapTap(pointer) {
    if (this.portUIOpen || this.inCombat || this.gameOver || this.isPointerOnFixedUI(pointer)) return;
    // Convert screen coords to world coords
    const wx = pointer.worldX;
    const wy = pointer.worldY;
    this.moveTarget = { x: wx, y: wy };
  }
}
