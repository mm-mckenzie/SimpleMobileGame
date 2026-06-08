import Phaser from 'phaser';
import { SCENES, GAME_W, GAME_H, C } from '../config';
import { GS } from '../GameState';

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: SCENES.GAMEOVER }); }

  create(data: { win: boolean; score: number }): void {
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const win   = data.win ?? false;
    const score = data.score ?? 0;
    const s     = GS.state;

    this.drawBackground(win);
    this.drawResult(win, score);
    this.drawStats();
    this.drawButtons();
  }

  private drawBackground(win: boolean): void {
    const g = this.add.graphics();
    const topColor = win ? 0x001a10 : 0x1a0000;
    g.fillGradientStyle(C.bg, C.bg, topColor, topColor, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);

    // Hex pattern
    g.lineStyle(1, win ? C.player : C.red, 0.1);
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, GAME_W);
      const y = Phaser.Math.Between(0, GAME_H);
      const r = Phaser.Math.Between(15, 50);
      this.drawHexOutline(g, x, y, r);
    }
  }

  private drawHexOutline(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      if (i === 0) g.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      else         g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    g.closePath();
    g.strokePath();
  }

  private drawResult(win: boolean, score: number): void {
    const titleColor = win ? '#00ffcc' : '#ff4444';
    const title      = win ? '⬡ DOMINATION ⬡' : '✕ CONSUMED ✕';
    const subtitle   = win
      ? 'Your mycelium has conquered the forest.'
      : 'Your core was destroyed.';

    this.add.text(GAME_W / 2, 120, title, {
      fontFamily: 'monospace', fontSize: '30px',
      color: titleColor, stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 168, subtitle, {
      fontFamily: 'monospace', fontSize: '14px',
      color: '#889aaa',
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 215, `Score  ${score.toLocaleString()}`, {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffd700',
    }).setOrigin(0.5);

    const best = GS.getBestScore();
    const isBest = score >= best;
    if (isBest) {
      this.add.text(GAME_W / 2, 250, '⭐ New Best!', {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffd700',
      }).setOrigin(0.5);
    } else {
      this.add.text(GAME_W / 2, 250, `Best: ${best.toLocaleString()}`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#889aaa',
      }).setOrigin(0.5);
    }
  }

  private drawStats(): void {
    const s = GS.state;
    const owned = GS.playerHexCount();
    const total = GS.totalClaimableHexes();
    const pct   = Math.round((owned / total) * 100);

    const lines = [
      `Turns survived:     ${s.turn}`,
      `Hexes owned:        ${owned} / ${total}  (${pct}%)`,
      `Enemy hexes destroyed: ${s.stats.enemiesDestroyed}`,
      `Factions eliminated: ${s.stats.factionsEliminated}`,
      `Mutations active:   ${s.activeMutationIds.size}`,
      `Events triggered:   ${s.stats.eventsTriggered.length}`,
    ];

    const panel = this.add.graphics();
    panel.fillStyle(C.panelLight, 1);
    panel.fillRoundedRect(20, 275, GAME_W - 40, lines.length * 28 + 24, 10);
    panel.lineStyle(1, C.border, 0.6);
    panel.strokeRoundedRect(20, 275, GAME_W - 40, lines.length * 28 + 24, 10);

    lines.forEach((l, i) => {
      this.add.text(36, 290 + i * 28, l, {
        fontFamily: 'monospace', fontSize: '13px', color: '#aabbcc',
      });
    });
  }

  private drawButtons(): void {
    const startY = 570;

    this.makeButton(GAME_W / 2, startY, '▶  PLAY AGAIN', C.player, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        GS.reset();
        this.scene.start(SCENES.GAME);
      });
    });

    this.makeButton(GAME_W / 2, startY + 72, 'MAIN MENU', C.border, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => this.scene.start(SCENES.MENU));
    });
  }

  private makeButton(x: number, y: number, label: string, color: number, cb: () => void): void {
    const w = 240, h = 52, r = 12;
    const g = this.add.graphics();
    g.fillStyle(color, 0.15);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    g.lineStyle(2, color, 0.9);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);

    const t = this.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '18px',
      color: '#' + color.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', cb);
    zone.on('pointerover', () => { g.setAlpha(0.7); t.setAlpha(0.7); });
    zone.on('pointerout',  () => { g.setAlpha(1);   t.setAlpha(1);   });
  }
}
