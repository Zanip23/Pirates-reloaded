import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { PortScene } from './scenes/PortScene.js';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1672ae',
  parent: 'game-container',
  scene: [BootScene, MenuScene, GameScene, PortScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
};

const game = new Phaser.Game(config);
window.game = game; // debugging & test access

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  }, 200);
});
