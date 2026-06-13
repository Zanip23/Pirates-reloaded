import {
  PORTS, GOODS, UPGRADES, PORT_UPGRADES, RINGS, RUMORS,
  priceWobble, shipStats, portUpgradePrice, portWarehouseCapacity, portGarrisonRadius,
} from '../data.js';
import { saveGame } from '../save.js';
import { makeButton, makePanel, showToast, textStyle } from '../ui.js';

const PANEL_MAX_W = 480;
const PANEL_MIN_W = 400;
const PANEL_H = 640;

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
    this.teleportMode = this.teleportMode || false;

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

    const pw = Phaser.Math.Clamp(W - 8, PANEL_MIN_W, PANEL_MAX_W);
    const ph = PANEL_H;
    this.root = this.add.container(0, 0);
    const s = Math.min((W - 8) / pw, (H - 8) / ph, 1);
    this.root.setScale(s);
    this.root.setPosition(Math.round((W - pw * s) / 2), Math.round((H - ph * s) / 2));

    const smooth = o => {
      if (o.style && o.texture) o.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      if (o.list) o.list.forEach(smooth);
    };
    this.ui = obj => {
      this.root.add(obj);
      if (s < 0.999) smooth(obj);
      return obj;
    };

    this.ui(makePanel(this, 0, 0, pw, ph));

    const isOwned = (this.player.ownedPorts || ['port_haven']).includes(this.port.id);
    const ringName = RINGS[this.port.ring]?.name || '';
    const headerColor = this.port.ring >= 3 ? '#ff9070' : this.port.ring >= 2 ? '#ffb888' : '#ffd23f';
    this.ui(this.add.text(pw / 2, 14, this.port.name.toUpperCase(),
      textStyle(20, headerColor)).setOrigin(0.5, 0));
    this.ui(this.add.text(pw / 2, 40,
      `${this.port.desc}  •  ${ringName}`,
      textStyle(11, '#9fb8c8', { wordWrap: { width: pw - 30 }, align: 'center' })).setOrigin(0.5, 0));

    // Tabs
    const havenLabel = isOwned ? 'HAFEN ★' : 'HAFEN';
    const tabs = ['MARKT', 'WERFT', 'TAVERNE', 'SCHIFF', havenLabel];
    const tabW = (pw - 16) / tabs.length;
    tabs.forEach((tab, i) => {
      const tabKey = tab === havenLabel ? 'HAFEN' : tab;
      const active = this.activeTab === tabKey;
      const btn = makeButton(this, 8 + tabW * i + tabW / 2, 92, tabW - 6, 40,
        tab, active ? 'gold' : 'normal', () => {
          this.activeTab = tabKey;
          this.teleportMode = false;
          this.scene.restart({ portId: this.portId });
        });
      this.ui(btn);
    });

    const cy = 122;
    const ch = ph - 122 - 70;
    if (this.activeTab === 'MARKT')   this.buildMarket(14, cy, pw - 28, ch);
    if (this.activeTab === 'WERFT')   this.buildShipyard(14, cy, pw - 28, ch);
    if (this.activeTab === 'TAVERNE') this.buildTavern(14, cy, pw - 28, ch);
    if (this.activeTab === 'SCHIFF')  this.buildStatus(14, cy, pw - 28, ch);
    if (this.activeTab === 'HAFEN') {
      if (this.teleportMode) this.buildTeleport(14, cy, pw - 28, ch);
      else                   this.buildHafen(14, cy, pw - 28, ch);
    }

    this.goldTxt = this.ui(this.add.text(16, ph - 36, '', textStyle(14, '#ffd23f')).setOrigin(0, 0.5));
    this.ui(makeButton(this, pw - 92, ph - 36, 160, 46, '⛵ ABLEGEN', 'bad', () => this.leave()));
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
    const isOwned = (this.player.ownedPorts || []).includes(this.port.id);
    const tradeLevel = isOwned ? (this.player.portUpgrades?.[this.port.id]?.trade || 0) : 0;
    const discount = tradeLevel * 0.05;
    return {
      buy:   Math.max(1, Math.round(good.basePrice * mul.buy  * wob * (1 - discount))),
      sell:  Math.max(1, Math.round(good.basePrice * mul.sell * wob * (1 + discount * 0.5))),
      cheap: mul.buy  <= 0.75,
      dear:  mul.sell >= 1.3,
    };
  }

  buildMarket(x, y, w, h) {
    const p = this.player;
    const isOwned = (p.ownedPorts || []).includes(this.port.id);
    const tradeLevel = isOwned ? (p.portUpgrades?.[this.port.id]?.trade || 0) : 0;
    if (tradeLevel > 0) {
      this.ui(this.add.text(x + w / 2, y + 4,
        `Handelsposten Stufe ${tradeLevel} aktiv: −${tradeLevel * 5}% Einkauf / +${tradeLevel * 2.5}% Verkauf`,
        textStyle(10, '#5ce07a', { align: 'center' })).setOrigin(0.5, 0));
    }
    const rowH = Math.min(56, Math.floor((h - (tradeLevel > 0 ? 44 : 28)) / GOODS.length));

    GOODS.forEach((good, gi) => {
      const ry = y + 18 + gi * rowH;
      const pr = this.goodPrices(good, gi);
      const owned = p.cargo[good.id] || 0;

      this.ui(this.add.text(x, ry, good.name, textStyle(13, '#f6eed8')).setOrigin(0, 0.5));
      const hint = pr.cheap ? '★ GÜNSTIG' : pr.dear ? '▲ GUTER PREIS' : '';
      const hintColor = pr.cheap ? '#5ce07a' : '#ffd23f';
      if (hint) this.ui(this.add.text(x, ry + 15, hint, textStyle(9, hintColor)).setOrigin(0, 0.5));

      this.ui(this.add.text(x + w * 0.32, ry - 8, `Kauf ${pr.buy}`,  textStyle(11, '#5ce07a')).setOrigin(0, 0.5));
      this.ui(this.add.text(x + w * 0.32, ry + 9, `Verk ${pr.sell}`, textStyle(11, '#e09090')).setOrigin(0, 0.5));
      this.ui(this.add.text(x + w * 0.48, ry, `×${owned}`, textStyle(12, '#9fe8f0')).setOrigin(0, 0.5));

      const bw = 72;
      const btnX1 = x + w - bw * 1.6 - 10;
      const btnX2 = x + w - bw * 0.5;

      this.ui(makeButton(this, btnX1, ry, bw, rowH - 12, 'KAUF',
        this.canBuy(pr.buy) ? 'good' : 'disabled', () => this.buy(good, pr.buy, 1)));
      this.ui(makeButton(this, btnX2, ry, bw, rowH - 12, 'VERK',
        owned > 0 ? 'bad' : 'disabled', () => this.sell(good, pr.sell, 1)));
    });
  }

  canBuy(price) {
    const used = Object.values(this.player.cargo).reduce((s, v) => s + v, 0);
    return this.player.gold >= price && used < shipStats(this.player).cargoCap;
  }

  buy(good, price, qty) {
    const p = this.player;
    const used = Object.values(p.cargo).reduce((s, v) => s + v, 0);
    if (p.gold < price)                  { showToast(this, 'Nicht genug Gold!',        '#ff6050'); return; }
    if (used >= shipStats(p).cargoCap)   { showToast(this, 'Der Frachtraum ist voll!', '#ff6050'); return; }
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
      const btnW = 128;
      const rightX = x + w - (btnW / 2 + 6);

      this.ui(this.add.text(x, ry, upg.name, textStyle(13, '#ffd23f')).setOrigin(0, 0));
      this.ui(this.add.text(x, ry + 18, upg.desc, textStyle(10, '#9fb8c8', { wordWrap: { width: w - btnW - 24 } })).setOrigin(0, 0));

      if (maxed) {
        this.ui(this.add.text(rightX, ry + 16, '✓ MAX', textStyle(13, '#5ce07a')).setOrigin(0.5));
        this.ui(this.add.text(x, ry + 50, `Stufe ${lvl}/${upg.maxLevel}`, textStyle(11, '#9fb8c8')).setOrigin(0, 0));
      } else {
        this.ui(this.add.text(x, ry + 50, `Stufe ${lvl}/${upg.maxLevel}  •  ${price} Gold`, textStyle(11, '#f6eed8')).setOrigin(0, 0));
        this.ui(makeButton(this, rightX, ry + 22, btnW, 40, 'AUSBAUEN',
          p.gold >= price ? 'good' : 'disabled', () => {
            p.gold -= price;
            p.upgradeLevel[upg.id] = lvl + 1;
            if (upg.id === 'hull') p.hull += 25;
            p.hull = Math.min(p.hull, shipStats(p).maxHull);
            saveGame(p);
            this.rebuild();
          }));
      }
    });

    const ry = y + UPGRADES.length * rowH + 12;
    const missing = st.maxHull - Math.ceil(p.hull);
    const btnW = 128;
    if (missing > 0) {
      const cost = missing * 2;
      this.ui(this.add.text(x, ry, `Rumpf reparieren (+${missing})\n${cost} Gold`, textStyle(12, '#9fe8f0')).setOrigin(0, 0.5));
      this.ui(makeButton(this, x + w - (btnW / 2 + 6), ry, btnW, 40, 'REPARIEREN',
        p.gold >= cost ? 'normal' : 'disabled', () => {
          p.gold -= cost;
          p.hull = st.maxHull;
          saveGame(p);
          this.rebuild();
        }));
    } else {
      this.ui(this.add.text(x, ry, 'Der Rumpf ist in bestem Zustand.', textStyle(12, '#5ce07a')).setOrigin(0, 0.5));
    }
  }

  // ── Tavern ─────────────────────────────────────────────────────────────────

  buildTavern(x, y, w, h) {
    const p = this.player;
    const btnW = 150;
    const btnX = x + w - (btnW / 2 + 5);
    const textW = w - btnW - 24;

    this.ui(this.add.text(x, y + 6, `Crew: ${p.crew}/${p.maxCrew}  —  volle Decks segeln schneller`,
      textStyle(12, '#f6eed8', { wordWrap: { width: textW } })).setOrigin(0, 0));
    const crewCost = 60;
    if (p.crew < p.maxCrew) {
      this.ui(makeButton(this, btnX, y + 16, btnW, 42, `ANHEUERN ${crewCost}g`,
        p.gold >= crewCost ? 'good' : 'disabled', () => {
          p.gold -= crewCost; p.crew++;
          saveGame(p); this.rebuild();
        }));
    }

    const mY = y + 66;
    this.ui(this.add.text(x, mY, `Moral: ${p.morale}/100  —  motivierte Kanoniere treffen härter`,
      textStyle(12, '#f6eed8', { wordWrap: { width: textW } })).setOrigin(0, 0));
    const drinkCost = 40;
    if (p.morale < 100) {
      this.ui(makeButton(this, btnX, mY + 10, btnW, 42, `RUNDE RUM ${drinkCost}g`,
        p.gold >= drinkCost ? 'gold' : 'disabled', () => {
          p.gold -= drinkCost;
          p.morale = Math.min(100, p.morale + 15);
          saveGame(p); this.rebuild();
        }));
    }

    const rY = mY + 64;
    this.ui(this.add.text(x, rY, 'GERÜCHTE AM TRESEN', textStyle(12, '#ffd23f')).setOrigin(0, 0));
    const r1 = RUMORS[(this.portIndex * 3 + p.day) % RUMORS.length];
    const r2 = RUMORS[(this.portIndex * 5 + p.day + 4) % RUMORS.length];
    [r1, r2].filter((r, i, a) => a.indexOf(r) === i).forEach((r, i) => {
      this.ui(this.add.text(x, rY + 24 + i * 44, `„${r}"`,
        textStyle(11, '#c8b890', { fontStyle: 'italic', wordWrap: { width: w - 10 } })).setOrigin(0, 0));
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
      this.ui(this.add.text(x, y + 6 + i * 22, line, textStyle(12, '#d8e8f0')).setOrigin(0, 0));
    });

    const rightX = x + w * 0.58;
    this.ui(this.add.text(rightX, y + 6, 'FRACHTRAUM', textStyle(12, '#ffd23f')).setOrigin(0, 0));
    const entries = GOODS.filter(g => (p.cargo[g.id] || 0) > 0);
    if (entries.length === 0) {
      this.ui(this.add.text(rightX, y + 30, '(leer)', textStyle(11, '#7a868f')).setOrigin(0, 0));
    } else {
      entries.forEach((g, i) => {
        this.ui(this.add.text(rightX, y + 30 + i * 20, `${g.name} ×${p.cargo[g.id]}`,
          textStyle(11, '#9fe8f0')).setOrigin(0, 0));
      });
    }

    // ── Lagerhaus-Interaktion (volle Breite, unter den Stats) ──────────────
    const isOwned = (p.ownedPorts || []).includes(this.port.id);
    const whLevel = isOwned ? (p.portUpgrades?.[this.port.id]?.warehouse || 0) : 0;
    if (whLevel > 0) {
      if (!p.portWarehouse) p.portWarehouse = {};
      const wh = p.portWarehouse[this.port.id] || {};
      const whUsed = Object.values(wh).reduce((s, v) => s + v, 0);
      const whCap = portWarehouseCapacity({ warehouse: whLevel });
      const shipUsed = used;
      const cargoCap = st.cargoCap;

      const whBaseY = y + 256;
      this.ui(this.add.text(x, whBaseY,
        `LAGERHAUS — ${whUsed}/${whCap} Einheiten eingelagert`,
        textStyle(11, '#ffd23f')).setOrigin(0, 0));

      const colW = Math.floor((w - 8) / 3);
      let col = 0, row = 0;
      GOODS.forEach(good => {
        const inWh = wh[good.id] || 0;
        const onShip = p.cargo[good.id] || 0;
        if (inWh === 0 && onShip === 0) return;

        const gx = x + col * (colW + 4);
        const gy = whBaseY + 20 + row * 32;
        const nameShort = good.name.length > 6 ? good.name.slice(0, 6) : good.name;
        this.ui(this.add.text(gx, gy, `${nameShort}  S:${onShip} L:${inWh}`,
          textStyle(9, '#c8e0d0')).setOrigin(0, 0));

        if (onShip > 0 && whUsed < whCap) {
          this.ui(makeButton(this, gx + 86, gy + 7, 40, 20, 'EINLG', 'normal', () => {
            if (!p.portWarehouse[this.port.id]) p.portWarehouse[this.port.id] = {};
            p.cargo[good.id] -= 1;
            if (p.cargo[good.id] <= 0) delete p.cargo[good.id];
            p.portWarehouse[this.port.id][good.id] = (p.portWarehouse[this.port.id][good.id] || 0) + 1;
            saveGame(p); this.rebuild();
          }));
        }
        if (inWh > 0 && shipUsed < cargoCap) {
          this.ui(makeButton(this, gx + 130, gy + 7, 40, 20, 'ENTNH', 'normal', () => {
            if (!p.portWarehouse[this.port.id]) p.portWarehouse[this.port.id] = {};
            p.portWarehouse[this.port.id][good.id] -= 1;
            if (p.portWarehouse[this.port.id][good.id] <= 0) delete p.portWarehouse[this.port.id][good.id];
            p.cargo[good.id] = (p.cargo[good.id] || 0) + 1;
            saveGame(p); this.rebuild();
          }));
        }

        col++;
        if (col >= 3) { col = 0; row++; }
      });

      if (Object.keys(wh).length === 0 && shipUsed === 0) {
        this.ui(this.add.text(x, whBaseY + 20, '(keine Waren auf Schiff oder im Lager)',
          textStyle(10, '#7a868f')).setOrigin(0, 0));
      }
    }
  }

  // ── Hafen (Port ownership & upgrades) ─────────────────────────────────────

  buildHafen(x, y, w, h) {
    const p = this.player;
    const isOwned = (p.ownedPorts || ['port_haven']).includes(this.port.id);

    if (!isOwned) {
      this.buildHafenBuy(x, y, w, h);
    } else {
      this.buildHafenUpgrades(x, y, w, h);
    }
  }

  buildHafenBuy(x, y, w, h) {
    const p = this.player;
    const price = this.port.purchasePrice;

    if (!price) {
      this.ui(this.add.text(x + w / 2, y + 60, 'Dieser Hafen gehört dir\nvon Anfang an.',
        textStyle(14, '#9fe8f0', { align: 'center' })).setOrigin(0.5, 0));
      return;
    }

    this.ui(this.add.text(x, y + 8,
      'Einen Hafen zu besitzen erlaubt Ausbau,\nLagerung und Teleportation.',
      textStyle(12, '#9fb8c8', { wordWrap: { width: w } })).setOrigin(0, 0));

    const ringName = RINGS[this.port.ring]?.name || '';
    this.ui(this.add.text(x, y + 56, `Ring:      ${this.port.ring} — ${ringName}`, textStyle(12, '#d8e8f0')).setOrigin(0, 0));
    this.ui(this.add.text(x, y + 78, `Kaufpreis: ${price.toLocaleString('de-DE')} Gold`, textStyle(12, '#ffd23f')).setOrigin(0, 0));

    const canAfford = p.gold >= price;
    this.ui(makeButton(this, x + w / 2, y + 130, w * 0.7, 52, `HAFEN ERWERBEN  ${price.toLocaleString('de-DE')}g`,
      canAfford ? 'gold' : 'disabled', () => {
        p.gold -= price;
        if (!p.ownedPorts) p.ownedPorts = ['port_haven'];
        p.ownedPorts.push(this.port.id);
        saveGame(p);
        showToast(this, `${this.port.name} gehört dir!`, '#ffd23f');
        this.rebuild();
      }));

    this.ui(this.add.text(x, y + 200,
      'Als Eigentümer kannst du hier\n• Kanonenbatterien aufstellen\n• Ein Lagerhaus betreiben\n• Handelspreise verbessern\n• Eine Garnison unterhalten\n• Einen Leuchtturm bauen\n• Dich hierher teleportieren',
      textStyle(11, '#9fb8c8', { wordWrap: { width: w }, lineSpacing: 4 })).setOrigin(0, 0));
  }

  buildHafenUpgrades(x, y, w, h) {
    const p = this.player;
    const upgrades = p.portUpgrades?.[this.port.id] || {};
    const ring = this.port.ring;

    this.ui(this.add.text(x, y + 4, '★ DEIN HAFEN', textStyle(13, '#ffd23f')).setOrigin(0, 0));

    const rowH = Math.min(72, Math.floor((h - 100) / PORT_UPGRADES.length));

    PORT_UPGRADES.forEach((upg, i) => {
      const ry = y + 28 + i * rowH;
      const lvl = upgrades[upg.id] || 0;
      const maxed = lvl >= upg.maxLevel;
      const price = portUpgradePrice(ring, lvl);
      const btnW = 128;
      const rightX = x + w - (btnW / 2 + 6);

      this.ui(this.add.text(x, ry, upg.name, textStyle(12, '#ffd23f')).setOrigin(0, 0));
      this.ui(this.add.text(x, ry + 16, upg.desc, textStyle(10, '#9fb8c8', { wordWrap: { width: w - btnW - 20 } })).setOrigin(0, 0));

      if (maxed) {
        this.ui(this.add.text(rightX, ry + 14, '✓ MAX', textStyle(12, '#5ce07a')).setOrigin(0.5));
        this.ui(this.add.text(x, ry + 44, `Stufe ${lvl}/${upg.maxLevel}`, textStyle(10, '#9fb8c8')).setOrigin(0, 0));
      } else {
        this.ui(this.add.text(x, ry + 44, `Stufe ${lvl}/${upg.maxLevel}  •  ${price.toLocaleString('de-DE')} Gold`,
          textStyle(10, '#f6eed8')).setOrigin(0, 0));
        this.ui(makeButton(this, rightX, ry + 20, btnW, 38, 'AUSBAUEN',
          p.gold >= price ? 'good' : 'disabled', () => {
            if (!p.portUpgrades) p.portUpgrades = {};
            if (!p.portUpgrades[this.port.id]) p.portUpgrades[this.port.id] = {};
            p.gold -= price;
            p.portUpgrades[this.port.id][upg.id] = lvl + 1;
            saveGame(p);
            this.rebuild();
          }));
      }
    });

    // Teleport section
    const teleportY = y + h - 60;
    this.buildTeleportButton(x, teleportY, w);
  }

  buildTeleportButton(x, y, w) {
    const p = this.player;
    const otherOwned = (p.ownedPorts || ['port_haven']).filter(id => id !== this.port.id);
    if (otherOwned.length === 0) {
      this.ui(this.add.text(x, y + 8,
        'Kaufe weitere Häfen um Teleportation freizuschalten.',
        textStyle(10, '#7a868f', { wordWrap: { width: w } })).setOrigin(0, 0));
      return;
    }

    const onCooldown = (p.teleportLastDay || 0) >= p.day;
    this.ui(this.add.text(x, y, 'TELEPORTIEREN', textStyle(12, '#9fe8f0')).setOrigin(0, 0));
    if (onCooldown) {
      this.ui(this.add.text(x, y + 20,
        'Bereits heute teleportiert. Morgen wieder verfügbar.',
        textStyle(10, '#7a868f', { wordWrap: { width: w } })).setOrigin(0, 0));
    } else {
      this.ui(makeButton(this, x + w / 2, y + 30, w * 0.8, 42, 'ZIELHAFEN WÄHLEN →', 'normal', () => {
        this.teleportMode = true;
        this.scene.restart({ portId: this.portId });
      }));
    }
  }

  // ── Teleport destination selection ─────────────────────────────────────────

  buildTeleport(x, y, w, h) {
    const p = this.player;
    const otherOwned = (p.ownedPorts || ['port_haven'])
      .filter(id => id !== this.port.id)
      .map(id => PORTS.find(po => po.id === id))
      .filter(Boolean);

    this.ui(this.add.text(x + w / 2, y + 8, 'ZIELHAFEN WÄHLEN',
      textStyle(15, '#ffd23f')).setOrigin(0.5, 0));
    this.ui(this.add.text(x + w / 2, y + 32,
      'Teleportation ist einmal pro Tag kostenlos.',
      textStyle(10, '#9fb8c8')).setOrigin(0.5, 0));

    const btnW = (w - 10) / 2;
    otherOwned.forEach((destPort, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = x + col * (btnW + 10) + btnW / 2;
      const by = y + 62 + row * 60;
      const ringLabel = RINGS[destPort.ring]?.name || '';
      this.ui(makeButton(this, bx, by, btnW, 50,
        `${destPort.name}\n${ringLabel}`, 'gold', () => {
          p.x = destPort.x;
          p.y = destPort.y + 130;
          p.teleportLastDay = p.day;
          saveGame(p);
          showToast(this, `Teleportiert nach ${destPort.name}!`, '#ffd23f');
          this.scene.stop();
          this.scene.resume('GameScene');
        }));
    });

    const backY = y + 62 + Math.ceil(otherOwned.length / 2) * 60 + 14;
    this.ui(makeButton(this, x + w / 2, backY, 180, 40, '← ZURÜCK', 'normal', () => {
      this.teleportMode = false;
      this.scene.restart({ portId: this.portId });
    }));
  }
}
