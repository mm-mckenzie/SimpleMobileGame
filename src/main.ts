import Phaser from 'phaser';
import { GAME_W, GAME_H } from './config';
import { BootScene }    from './scenes/BootScene';
import { MenuScene }    from './scenes/MenuScene';
import { GameScene }    from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width:  GAME_W,
  height: GAME_H,
  backgroundColor: '#0a0e1a',
  parent: document.body,
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,      // support multi-touch
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
};

new Phaser.Game(config);
