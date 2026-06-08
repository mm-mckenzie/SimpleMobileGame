import Phaser from 'phaser';
import { SCENES, GAME_W, GAME_H, C } from '../config';
import { GS } from '../GameState';

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: SCENES.MENU }); }

  create(): void {
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.drawBackground();
    this.drawTitle();
    this.drawButtons();
    this.drawBestScore();
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(C.bg, C.bg, 0x0a1830, 0x0a1830, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);

    // Ambient hex pattern
    g.lineStyle(1, C.border, 0.15);
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, GAME_W);
      const y = Phaser.Math.Between(0, GAME_H);
      const r = Phaser.Math.Between(12, 40);
      this.drawHexOutline(g, x, y, r);
    }
  }

  private drawHexOutline(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const vx = cx + r * Math.cos(a);
      const vy = cy + r * Math.sin(a);
      if (i === 0) g.moveTo(vx, vy); else g.lineTo(vx, vy);
    }
    g.closePath();
    g.strokePath();
  }

  private drawTitle(): void {
    // Glow backing
    const glow = this.add.graphics();
    glow.fillStyle(C.player, 0.07);
    glow.fillEllipse(GAME_W / 2, 280, 340, 120);

    this.add.text(GAME_W / 2, 200, 'MYCELIUM', {
      fontFamily: 'monospace',
      fontSize: '52px',
      color: '#00ffcc',
      stroke: '#003322',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 265, 'Grow. Consume. Evolve.', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#66ffee',
    }).setOrigin(0.5).setAlpha(0.8);

    // Animated hex icon
    const icon = this.add.text(GAME_W / 2, 340, '⬡', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#00ffcc',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: icon,
      scaleX: 1.15, scaleY: 1.15,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawButtons(): void {
    this.makeButton(GAME_W / 2, 430, '▶  START RUN', 0x00ffcc, 0x003322, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        GS.reset();
        this.scene.start(SCENES.GAME);
      });
    });

    this.makeButton(GAME_W / 2, 510, 'HOW TO PLAY', 0x334455, 0x1e3060, () => {
      this.showHowToPlay();
    });
  }

  private makeButton(
    x: number, y: number,
    label: string,
    fill: number, border: number,
    cb: () => void,
  ): void {
    const w = 240, h = 52, r = 12;
    const g = this.add.graphics();
    g.fillStyle(fill, 0.15);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    g.lineStyle(2, border, 0.9);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);

    const t = this.add.text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#' + fill.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', cb);
    zone.on('pointerover', () => { g.setAlpha(0.7); t.setAlpha(0.7); });
    zone.on('pointerout',  () => { g.setAlpha(1.0); t.setAlpha(1.0); });
  }

  private drawBestScore(): void {
    const best = GS.getBestScore();
    if (best > 0) {
      this.add.text(GAME_W / 2, GAME_H - 80, `Best Score: ${best.toLocaleString()}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffd700',
      }).setOrigin(0.5);
    }

    this.add.text(GAME_W / 2, GAME_H - 50, 'v1.0  — Built for updates', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#334455',
    }).setOrigin(0.5);
  }

  private showHowToPlay(): void {
    // Darken overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, GAME_W, GAME_H);

    const lines = [
      'HOW TO PLAY',
      '',
      '⬡  Tap an adjacent hex to GROW',
      '🍄  Claim resources for income',
      '☣  Build Toxin Glands to fight',
      '🧱  Chitin Walls protect hexes',
      '✦  Pick mutations every 5 turns',
      '⚡  Events shake up the map',
      '',
      'WIN: Own 70% of the forest',
      'LOSE: Your core is destroyed',
      '',
      'Tap anywhere to close',
    ];

    const panel = this.add.text(GAME_W / 2, GAME_H / 2, lines.join('\n'), {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#00ffcc',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    const close = this.add.zone(0, 0, GAME_W, GAME_H).setOrigin(0).setInteractive();
    close.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
      close.destroy();
    });
  }
}
