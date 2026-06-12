import { PORTS, GOODS, UPGRADES, RUMORS, priceWobble, shipStats } from '../data.js';
import { saveGame } from '../save.js';
import { makeButton, makePanel, showToast, textStyle } from '../ui.js';

// Overlay scene shown while docked. The GameScene stays paused underneath.
export class PortScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PortScene' });
  }

  init(data) {
    this.portId = data.portId;
  }

  create() {
    this.port = PORTS.find(p => p.id === this.portId);
    this.player = this.registry.get('player');
    this.portIndex = PORTS.indexOf(this.port);
    this.activeTab = this.activeTab || 'MARKT';

    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.onResize, this);
    });

    this.build();
  }

  onResize() {
    if (this.scene.isActive()) this.scene.restart({ portId: this.portId });
  }

  build() {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x0a1420, 0.55).setOrigin(0).setInteractive();

    const pw = Math.min(W - 12, 560);
    const ph = Math.min(H - 12, 620);
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;
    this.bounds = { px, py, pw, ph };

    makePanel(this, px, py, pw, ph);

    // header
    this.add.text(px + pw / 2, py + 14, this.port.name.toUpperCase(),
      textStyle(20, this.port.zone === 2 ? '#ff9080' : '#ffd23f')).setOrigin(0.5, 0);
    this.add.text(px + pw / 2, py + 40, this.port.desc,
      textStyle(11, '#9fb8c8', { wordWrap: { width: pw - 30 }, align: 'center' })).setOrigin(0.5, 0);

    // tabs
    const tabs = ['MARKT', 'WERFT', 'TAVERNE', 'SCHIFF'];
    const tabW = (pw - 16) / tabs.length;
    this.tabBtns = tabs.map((tab, i) => {
      const active = tab === this.activeTab;
      const btn = makeButton(this, px + 8 + tabW * i + tabW / 2, py + 92, tabW - 6, 40,
        tab, active ? 'gold' : 'normal', () => {
          this.activeTab = tab;
          this.scene.restart({ portId: this.portId });
        });
      return btn;
    });

    // content container
    this.content = this.add.container(0, 0);
    const cy = py + 122;
    const ch = ph - 122 - 70;
    if (this.activeTab === 'MARKT') this.buildMarket(px + 14, cy, pw - 28, ch);
    if (this.activeTab === 'WERFT') this.buildShipyard(px + 14, cy, pw - 28, ch);
    if (this.activeTab === 'TAVERNE') this.buildTavern(px + 14, cy, pw - 28, ch);
    if (this.activeTab === 'SCHIFF') this.buildStatus(px + 14, cy, pw - 28, ch);

    // gold footer + leave
    if (pw < 400) {
      this.goldTxt = this.add.text(px + pw / 2, py + ph - 64, '', textStyle(12, '#ffd23f')).setOrigin(0.5, 0.5);
      makeButton(this, px + pw / 2, py + ph - 28, 160, 46, '⛵ ABLEGEN', 'bad', () => this.leave());
    } else {
      this.goldTxt = this.add.text(px + 16, py + ph - 36, '', textStyle(14, '#ffd23f')).setOrigin(0, 0.5);
      makeButton(this, px + pw - 92, py + ph - 36, 160, 46, '⛵ ABLEGEN', 'bad', () => this.leave());
    }
    this.refreshGold();
  }

  refreshGold() {
    const used = Object.values(this.player.cargo).reduce((s, v) => s + v, 0);
    this.goldTxt.setText(`Gold: ${this.player.gold}   Fracht: ${used}/${shipStats(this.player).cargoCap}`);
  }

  leave() {
    saveGame(this.player);
    this.scene.stop();
    this.scene.resume('GameScene');
  }

  rebuild() {
    this.scene.restart({ portId: this.portId });
  }

  // ── Market ─────────────────────────────────────────────────────────────────

  goodPrices(good, goodIdx) {
    const mul = this.port.prices[good.id];
    const wob = priceWobble(this.portIndex, goodIdx, this.player.day);
    return {
      buy: Math.max(1, Math.round(good.basePrice * mul.buy * wob)),
      sell: Math.max(1, Math.round(good.basePrice * mul.sell * wob)),
      cheap: mul.buy <= 0.75,
      dear: mul.sell >= 1.3,
    };
  }

  buildMarket(x, y, w, h) {
    const p = this.player;
    const rowH = Math.min(56, Math.floor((h - 20) / GOODS.length));

    GOODS.forEach((good, gi) => {
      const ry = y + 10 + gi * rowH;
      const pr = this.goodPrices(good, gi);
      const owned = p.cargo[good.id] || 0;

      this.add.text(x, ry, good.name, textStyle(13, '#f6eed8')).setOrigin(0, 0.5);
      const hint = pr.cheap ? '★ GÜNSTIG' : pr.dear ? '▲ GUTER PREIS' : '';
      const hintColor = pr.cheap ? '#5ce07a' : '#ffd23f';
      if (hint) this.add.text(x, ry + 15, hint, textStyle(9, hintColor)).setOrigin(0, 0.5);

      this.add.text(x + w * 0.32, ry - 8, `Kauf ${pr.buy}`, textStyle(11, '#5ce07a')).setOrigin(0, 0.5);
      this.add.text(x + w * 0.32, ry + 9, `Verk ${pr.sell}`, textStyle(11, '#e09090')).setOrigin(0, 0.5);
      this.add.text(x + w * 0.52, ry, `×${owned}`, textStyle(12, '#9fe8f0')).setOrigin(0, 0.5);

      const narrow = w < 320;
      const bw = Math.min(72, w * (narrow ? 0.22 : 0.155));
      const btnX1 = x + w - bw * 1.6 - 10;
      const btnX2 = x + w - bw * 0.5;

      makeButton(this, btnX1, ry, bw, rowH - 12, 'KAUF',
        this.canBuy(pr.buy) ? 'good' : 'disabled', () => this.buy(good, pr.buy, 1));
      makeButton(this, btnX2, ry, bw, rowH - 12, 'VERK',
        owned > 0 ? 'bad' : 'disabled', () => this.sell(good, pr.sell, 1));
    });
  }

  canBuy(price) {
    const used = Object.values(this.player.cargo).reduce((s, v) => s + v, 0);
    return this.player.gold >= price && used < shipStats(this.player).cargoCap;
  }

  buy(good, price, qty) {
    const p = this.player;
    const used = Object.values(p.cargo).reduce((s, v) => s + v, 0);
    if (p.gold < price) { showToast(this, 'Nicht genug Gold!', '#ff6050'); return; }
    if (used >= shipStats(p).cargoCap) { showToast(this, 'Der Frachtraum ist voll!', '#ff6050'); return; }
    p.gold -= price;
    p.cargo[good.id] = (p.cargo[good.id] || 0) + qty;
    saveGame(p);
    this.rebuild();
  }

  sell(good, price, qty) {
    const p = this.player;
    if (!p.cargo[good.id]) return;
    p.gold += price;
    p.cargo[good.id] -= qty;
    if (p.cargo[good.id] <= 0) delete p.cargo[good.id];
    saveGame(p);
    this.rebuild();
  }

  // ── Shipyard ───────────────────────────────────────────────────────────────

  buildShipyard(x, y, w, h) {
    const p = this.player;
    const st = shipStats(p);
    const rowH = Math.min(84, Math.floor((h - 60) / UPGRADES.length));

    UPGRADES.forEach((upg, i) => {
      const ry = y + 6 + i * rowH;
      const lvl = p.upgradeLevel[upg.id] || 0;
      const maxed = lvl >= upg.maxLevel;
      const price = upg.price(lvl);
      const narrow = w < 340;
      const btnW = narrow ? 90 : 128;
      const rightX = x + w - (btnW / 2 + 6);

      this.add.text(x, ry, `${upg.name}  •  Stufe ${lvl}/${upg.maxLevel}`, textStyle(13, '#ffd23f')).setOrigin(0, 0);
      this.add.text(x, ry + 18, upg.desc, textStyle(10, '#9fb8c8', { wordWrap: { width: w - (narrow ? 100 : 150) } })).setOrigin(0, 0);

      if (maxed) {
        this.add.text(rightX, ry + 16, '✓ MAX', textStyle(13, '#5ce07a')).setOrigin(0.5);
      } else {
        this.add.text(x, ry + 42, `${price} Gold`, textStyle(11, '#f6eed8')).setOrigin(0, 0);
        makeButton(this, rightX, ry + 22, btnW, 40, 'AUSBAUEN',
          p.gold >= price ? 'good' : 'disabled', () => {
            p.gold -= price;
            p.upgradeLevel[upg.id] = lvl + 1;
            if (upg.id === 'hull') p.hull += 25; // the new planking comes fitted
            p.hull = Math.min(p.hull, shipStats(p).maxHull);
            saveGame(p);
            this.rebuild();
          });
      }
    });

    // repairs
    const ry = y + UPGRADES.length * rowH + 12;
    const missing = st.maxHull - Math.ceil(p.hull);
    const narrow = w < 340;
    const btnW = narrow ? 100 : 128;
    if (missing > 0) {
      const cost = missing * 2;
      this.add.text(x, ry, `Rumpf reparieren (+${missing})\n${cost} Gold`, textStyle(12, '#9fe8f0')).setOrigin(0, 0.5);
      makeButton(this, x + w - (btnW / 2 + 6), ry, btnW, 40, 'REPARIEREN',
        p.gold >= cost ? 'normal' : 'disabled', () => {
          p.gold -= cost;
          p.hull = st.maxHull;
          saveGame(p);
          this.rebuild();
        });
    } else {
      this.add.text(x, ry, 'Der Rumpf ist in bestem Zustand.', textStyle(12, '#5ce07a')).setOrigin(0, 0.5);
    }
  }

  // ── Tavern ─────────────────────────────────────────────────────────────────

  buildTavern(x, y, w, h) {
    const p = this.player;
    const narrow = w < 320;
    const btnW = narrow ? 110 : 150;
    const btnX = x + w - (btnW / 2 + 5);

    this.add.text(x, y + 6, `Crew: ${p.crew}/${p.maxCrew}  —  volle Decks segeln schneller`,
      textStyle(12, '#f6eed8', { wordWrap: { width: w - 10 } })).setOrigin(0, 0);
    const crewCost = 60;
    const crewBtnY = narrow ? y + 36 : y + 16;
    if (p.crew < p.maxCrew) {
      makeButton(this, btnX, crewBtnY, btnW, 42, `ANHEUERN ${crewCost}g`,
        p.gold >= crewCost ? 'good' : 'disabled', () => {
          p.gold -= crewCost; p.crew++;
          saveGame(p); this.rebuild();
        });
    }

    const mY = narrow ? y + 86 : y + 56;
    this.add.text(x, mY, `Moral: ${p.morale}/100  —  motivierte Kanoniere treffen härter`,
      textStyle(12, '#f6eed8', { wordWrap: { width: w - 10 } })).setOrigin(0, 0);
    const drinkCost = 40;
    const drinkBtnY = narrow ? mY + 30 : mY + 10;
    if (p.morale < 100) {
      makeButton(this, btnX, drinkBtnY, btnW, 42, `RUNDE RUM ${drinkCost}g`,
        p.gold >= drinkCost ? 'gold' : 'disabled', () => {
          p.gold -= drinkCost;
          p.morale = Math.min(100, p.morale + 15);
          saveGame(p); this.rebuild();
        });
    }

    // rumors — deterministic per port and day so they don't reshuffle on rebuild
    const rY = narrow ? mY + 80 : mY + 60;
    this.add.text(x, rY, 'GERÜCHTE AM TRESEN', textStyle(12, '#ffd23f')).setOrigin(0, 0);
    const r1 = RUMORS[(this.portIndex * 3 + p.day) % RUMORS.length];
    const r2 = RUMORS[(this.portIndex * 5 + p.day + 4) % RUMORS.length];
    [r1, r2].filter((r, i, a) => a.indexOf(r) === i).forEach((r, i) => {
      this.add.text(x, rY + 24 + i * 44, `„${r}“`,
        textStyle(11, '#c8b890', { fontStyle: 'italic', wordWrap: { width: w - 10 } })).setOrigin(0, 0);
    });
  }

  // ── Ship status ────────────────────────────────────────────────────────────

  buildStatus(x, y, w, h) {
    const p = this.player;
    const st = shipStats(p);
    const used = Object.values(p.cargo).reduce((s, v) => s + v, 0);

    const left = [
      `Schiff      ${p.name}`,
      `Rumpf       ${Math.ceil(p.hull)} / ${st.maxHull}`,
      `Kanonen     ${st.damage} Schaden`,
      `Tempo       ${st.speed}`,
      `Fracht      ${used} / ${st.cargoCap}`,
      `Crew        ${p.crew} / ${p.maxCrew}`,
      `Moral       ${p.morale}`,
      `Ruf         ${p.reputation}`,
      `Tag         ${p.day}`,
      `Versenkt    ${p.enemiesDefeated} Piraten`,
      `Schiffbrüche ${p.shipwrecks || 0}`,
    ];
    left.forEach((line, i) => {
      this.add.text(x, y + 6 + i * 22, line, textStyle(12, '#d8e8f0')).setOrigin(0, 0);
    });

    this.add.text(x + w * 0.58, y + 6, 'FRACHTRAUM', textStyle(12, '#ffd23f')).setOrigin(0, 0);
    const entries = GOODS.filter(g => (p.cargo[g.id] || 0) > 0);
    if (entries.length === 0) {
      this.add.text(x + w * 0.58, y + 30, '(leer)', textStyle(11, '#7a868f')).setOrigin(0, 0);
    } else {
      entries.forEach((g, i) => {
        this.add.text(x + w * 0.58, y + 30 + i * 20, `${g.name} ×${p.cargo[g.id]}`,
          textStyle(11, '#9fe8f0')).setOrigin(0, 0);
      });
    }
  }
}
