import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';

function getGameSize() {
  return {
    width:  Math.min(window.innerWidth,  800),
    height: Math.min(window.innerHeight, 600),
  };
}

const size = getGameSize();

const config = {
  type: Phaser.AUTO,
  width:  size.width,
  height: size.height,
  backgroundColor: '#081420',
  parent: 'game-container',
  scene: [MenuScene, GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
};

const game = new Phaser.Game(config);

// Resize handler — restart current scene on major resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  }, 200);
});
