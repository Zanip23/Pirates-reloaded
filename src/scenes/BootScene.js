import { createAllTextures } from '../textures.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    createAllTextures(this);
    this.scene.start('MenuScene');
  }
}
