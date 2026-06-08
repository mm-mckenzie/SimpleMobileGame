import Phaser from 'phaser';
import { SCENES, C } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: SCENES.BOOT }); }

  preload(): void {
    // No external assets — everything is drawn procedurally.
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.bg);
    this.time.delayedCall(100, () => this.scene.start(SCENES.MENU));
  }
}
