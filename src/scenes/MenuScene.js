import { hasSave, deleteSave } from '../save.js';
import { INITIAL_PLAYER, clone } from '../data.js';
import { SCALE } from '../textures.js';
import { makeButton, textStyle } from '../ui.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.onResize, this);
    });
    this.build();
  }

  onResize() {
    if (this.scene.isActive()) this.scene.restart();
  }

  build() {
    const W = this.scale.width, H = this.scale.height;

    // animated sea
    this.water = this.add.tileSprite(0, 0, W, H, 'water0').setOrigin(0).setTileScale(SCALE);
    this.waterFrame = 0;
    this.time.addEvent({
      delay: 380, loop: true,
      callback: () => {
        this.waterFrame = (this.waterFrame + 1) % 3;
        this.water.setTexture('water' + this.waterFrame);
      },
    });

    // a couple of islets drifting by feel
    this.add.image(W * 0.15, H * 0.2, 'islet').setScale(SCALE);
    this.add.image(W * 0.85, H * 0.75, 'islet').setScale(SCALE);

    // title
    const titleSize = Math.min(52, Math.floor(W / 9));
    this.add.text(W / 2, H * 0.16, 'BLACK TIDE',
      textStyle(titleSize, '#ffd23f', { strokeThickness: 8 })).setOrigin(0.5);
    this.add.text(W / 2, H * 0.16 + titleSize * 1.1, 'TRADER',
      textStyle(Math.floor(titleSize * 1.2), '#f6eed8', { strokeThickness: 8 })).setOrigin(0.5);

    // bobbing ship
    const ship = this.add.image(W / 2, H * 0.46, 'shipPlayer').setScale(SCALE * 2.4);
    ship.setRotation(Math.PI / 8);
    this.tweens.add({ targets: ship, y: '+=8', angle: '+=4', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // buttons
    const btnW = Math.min(280, W * 0.8);
    let by = H * 0.62;
    const gap = 66;

    if (hasSave()) {
      makeButton(this, W / 2, by, btnW, 54, 'WEITERSPIELEN', 'gold', () => {
        this.scene.start('GameScene', { load: true });
      });
      by += gap;
    }

    makeButton(this, W / 2, by, btnW, 54, 'NEUES SPIEL', 'good', () => {
      deleteSave();
      this.registry.set('player', clone(INITIAL_PLAYER));
      this.scene.start('GameScene');
    });
    by += gap;

    if (hasSave()) {
      makeButton(this, W / 2, by, btnW, 44, 'SPIELSTAND LÖSCHEN', 'bad', () => {
        deleteSave();
        this.scene.restart();
      });
    }

    this.add.text(W / 2, H - 16, 'Tippe oder klicke aufs Meer, um zu segeln — mehr brauchst du nicht.',
      textStyle(11, '#cfe8f2')).setOrigin(0.5, 1);
  }
}
