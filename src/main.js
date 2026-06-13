import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { PortScene } from './scenes/PortScene.js';
import { initDevPanel } from './devpanel.js';

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#1672ae',
  parent: 'game-container',
  scene: [BootScene, MenuScene, GameScene, PortScene],
  scale: {
    // Let Phaser size the canvas from the parent element. The parent is
    // pinned to the dynamic viewport in CSS, so the canvas can never be
    // bigger than the visible screen (the old window.innerHeight approach
    // drifted whenever the mobile URL bar showed/hid, pushing the HUD
    // off-screen).
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: '100%',
    height: '100%',
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
};

const game = new Phaser.Game(config);
window.game = game; // debugging & test access

// Entwickler-Tuning-Overlay (⚙ Dev unten rechts oder Taste F9).
initDevPanel();

// Mobile browsers resize the visual viewport (URL bar, keyboard, pinch)
// without always firing a window resize — re-sync the canvas in all cases.
let resizeTimeout;
const syncSize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => game.scale.refresh(), 100);
};
window.addEventListener('resize', syncSize);
window.addEventListener('orientationchange', syncSize);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncSize);
}
