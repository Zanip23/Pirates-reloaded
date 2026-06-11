import { hasSave, deleteSave } from '../save.js';
import { INITIAL_PLAYER } from '../data.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.elements = [];

    this.scale.on('resize', this.resize, this);

    // Ocean background
    this.bg = this.add.rectangle(0, 0, 10, 10, 0x0a1628).setOrigin(0, 0);

    // Animated wave tiles
    this.waves = [];
    for (let i = 0; i < 20; i++) {
      const w = this.add.graphics();
      w.lineStyle(1, 0x1a3a5c, 0.6);
      w.strokeRect(0, 0, Phaser.Math.Between(20, 50), 2);
      this.waves.push({ obj: w, speed: Phaser.Math.FloatBetween(0.3, 0.8) });
    }

    // Title
    this.title1 = this.add.text(0, 0, 'BLACK TIDE', {
      fill: '#c8a020',
      fontFamily: 'Courier New',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.title2 = this.add.text(0, 0, 'TRADER', {
      fill: '#e8c840',
      fontFamily: 'Courier New',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Draw a simple ship decoration
    this.shipGraphic = this.add.graphics();

    this.buttons = [];

    const newGameBtn = this.makeButton('NEW GAME', 0x1a6e2e, () => {
      deleteSave();
      this.registry.set('player', JSON.parse(JSON.stringify(INITIAL_PLAYER)));
      this.scene.start('GameScene');
    });
    this.buttons.push(newGameBtn);

    if (hasSave()) {
      const continueBtn = this.makeButton('CONTINUE', 0x1a3a6e, () => {
        this.scene.start('GameScene', { load: true });
      });
      this.buttons.push(continueBtn);

      const deleteBtn = this.makeButton('DELETE SAVE', 0x6e1a1a, () => {
        deleteSave();
        this.scene.restart();
      });
      this.buttons.push(deleteBtn);
    }

    this.infoText = this.add.text(0, 0, 'Use WASD / Arrow Keys or tap to move  •  Tap port to dock', {
      fontSize: '11px',
      fill: '#4a7aaa',
      fontFamily: 'Courier New',
    }).setOrigin(0.5, 1);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.resize, this);
    });

    this.resize({ width: this.scale.width, height: this.scale.height });
  }

  resize(gameSize) {
    if (!this.scene.isActive()) return;

    const W = gameSize.width;
    const H = gameSize.height;

    this.bg.setSize(W, H);

    this.waves.forEach(w => {
      w.obj.x = Phaser.Math.Between(0, W);
      w.obj.y = Phaser.Math.Between(0, H);
    });

    this.title1.setPosition(W / 2, H * 0.18);
    this.title1.setFontSize(Math.floor(W / 12) + 'px');

    this.title2.setPosition(W / 2, H * 0.18 + Math.floor(W / 10));
    this.title2.setFontSize(Math.floor(W / 10) + 'px');

    this.drawTitleShip(W / 2, H * 0.48);

    const btnY = H * 0.68;
    const btnW = Math.min(260, W * 0.7);
    const btnH = 52;
    const gap = 64;

    this.buttons.forEach((btn, i) => {
      btn.bg.setPosition(W / 2, btnY + gap * i);
      btn.bg.setSize(btnW, btnH);
      btn.txt.setPosition(W / 2, btnY + gap * i);
    });

    this.infoText.setPosition(W / 2, H - 20);
  }

  drawTitleShip(cx, cy) {
    const g = this.shipGraphic;
    g.clear();
    const s = 1.8;

    // Hull
    g.fillStyle(0x5a3010);
    g.fillRect(cx - 30 * s, cy, 60 * s, 18 * s);
    g.fillStyle(0x7a4520);
    g.fillRect(cx - 25 * s, cy - 8 * s, 50 * s, 10 * s);

    // Mast
    g.fillStyle(0x4a2808);
    g.fillRect(cx - 2 * s, cy - 40 * s, 4 * s, 42 * s);

    // Sail
    g.fillStyle(0xd4c090);
    g.fillTriangle(
      cx, cy - 38 * s,
      cx + 28 * s, cy - 12 * s,
      cx, cy - 12 * s
    );
    g.fillTriangle(
      cx, cy - 38 * s,
      cx - 24 * s, cy - 14 * s,
      cx, cy - 14 * s
    );

    // Flag
    g.fillStyle(0xcc2020);
    g.fillRect(cx, cy - 42 * s, 14 * s, 8 * s);
    g.fillStyle(0xffffff);
    g.fillRect(cx + 3 * s, cy - 40 * s, 5 * s, 4 * s);
  }

  makeButton(label, color, callback) {
    const bg = this.add.rectangle(0, 0, 10, 10, color, 1).setOrigin(0.5).setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(2, 0xffd700);
    const txt = this.add.text(0, 0, label, {
      fontSize: '18px',
      fill: '#ffffff',
      fontFamily: 'Courier New',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    bg.on('pointerover', () => { bg.setFillStyle(Phaser.Display.Color.ValueToColor(color).brighten(30).color); });
    bg.on('pointerout', () => { bg.setFillStyle(color); });
    bg.on('pointerdown', callback);
    txt.on('pointerdown', callback);
    txt.setInteractive({ useHandCursor: true });

    return { bg, txt, color };
  }

  update() {
    this.waves.forEach(w => {
      w.obj.x += w.speed;
      if (w.obj.x > this.scale.width + 60) w.obj.x = -60;
    });
  }
}