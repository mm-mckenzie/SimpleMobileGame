import Phaser from 'phaser';
import {
  SCENES, GAME_W, GAME_H, C, BALANCE,
  HEX_SIZE,
} from '../config';
import { GS } from '../GameState';
import { HexCell, HexType, NodeType, Owner, NODE_DEFS, HEX_TYPES } from '../data/hexTypes';
import {
  hexToPixel, pixelToHex, getNeighbours, getBorderHexes,
  getGrowableHexes, hexVertices, generateMap, hexDist,
} from '../HexGrid';
import { RNG } from '../RNG';
import { MUTATIONS_LIST, RARITY_WEIGHTS, Mutation } from '../data/mutations';
import { EVENTS_LIST } from '../data/events';
import { ENEMY_FACTIONS, PERSONALITY_WEIGHTS } from '../data/enemies';

// ── constants ─────────────────────────────────────────────────────────────
const OWNER_COLORS: Record<string, number> = {
  player: C.player,
  enemy1: C.enemy1,
  enemy2: C.enemy2,
  enemy3: C.enemy3,
};
const NODE_COLORS: Record<string, number> = {
  core: C.core,
  conduit: C.player,
  toxin_gland: C.toxinGland,
  chitin_wall: C.chitinWall,
  spore_cluster: C.sporeCluster,
  sporulation_chamber: C.sporoChamber,
};
const PHASE = {
  PLAYER: 'player',
  ANIMATING: 'animating',
  EVOLUTION: 'evolution',
  EVENT: 'event',
  ENEMY: 'enemy',
  GAMEOVER: 'gameover',
} as const;
type Phase = (typeof PHASE)[keyof typeof PHASE];

export class GameScene extends Phaser.Scene {
  // ── Graphics layers ──────────────────────────────────────────────────
  private hexGfx!: Phaser.GameObjects.Graphics;   // hex fills
  private borderGfx!: Phaser.GameObjects.Graphics; // hex borders / overlays
  private uiGfx!: Phaser.GameObjects.Graphics;

  // ── UI text ───────────────────────────────────────────────────────────
  private sporesText!: Phaser.GameObjects.Text;
  private proteinText!: Phaser.GameObjects.Text;
  private mycoText!: Phaser.GameObjects.Text;
  private symText!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private ownedText!: Phaser.GameObjects.Text;
  private actionsText!: Phaser.GameObjects.Text;

  // ── Hex content icons ─────────────────────────────────────────────────
  private hexIcons = new Map<string, Phaser.GameObjects.Text>();

  // ── Selection / action panel ──────────────────────────────────────────
  private selectedKey: string | null = null;
  private actionContainer!: Phaser.GameObjects.Container;
  private actionVisible = false;

  // ── Evolution panel ────────────────────────────────────────────────────
  private evolutionContainer!: Phaser.GameObjects.Container;

  // ── Event log banner ──────────────────────────────────────────────────
  private eventBanner!: Phaser.GameObjects.Text;

  // ── Phase & build mode ────────────────────────────────────────────────
  private phase: Phase = PHASE.PLAYER;
  private nextEventTurn = 0;

  // ── Growable highlight cache ───────────────────────────────────────────
  private growableKeys = new Set<string>();
  private bioHints = new Set<string>(); // bioluminescence enemy hints

  constructor() { super({ key: SCENES.GAME }); }

  // ═════════════════════════════════════════════════════════════════════
  //  LIFECYCLE
  // ═════════════════════════════════════════════════════════════════════

  create(): void {
    this.cameras.main.setBackgroundColor(C.bg);

    // Generate the map
    generateMap(2);
    GS.scaleEnemyDifficulty();

    // Graphics layers (order = z-order)
    this.hexGfx    = this.add.graphics();
    this.borderGfx = this.add.graphics();
    this.uiGfx     = this.add.graphics();

    this.buildUI();
    this.buildActionPanel();
    this.buildEvolutionPanel();
    this.buildEventBanner();

    this.setupInput();
    this.refreshGrowableCache();
    this.drawAll();
    this.updateResourceUI();

    // Start event timer
    this.nextEventTurn = RNG.int(5, 9);

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  // ═════════════════════════════════════════════════════════════════════
  //  DRAWING
  // ═════════════════════════════════════════════════════════════════════

  private drawAll(): void {
    this.hexGfx.clear();
    this.borderGfx.clear();
    this.hexIcons.forEach(t => t.destroy());
    this.hexIcons.clear();

    for (const [, h] of GS.state.hexes) {
      this.drawHex(h);
    }
    // Bacteria
    for (const k of GS.state.bacteriaHexes) {
      const parts = k.split(',').map(Number);
      this.drawBacteriaHex(parts[0], parts[1]);
    }
    // Growable highlights
    for (const k of this.growableKeys) {
      const [col, row] = k.split(',').map(Number);
      this.drawGrowHighlight(col, row);
    }
    // Bioluminescence hints
    for (const k of this.bioHints) {
      const [col, row] = k.split(',').map(Number);
      this.drawBioHint(col, row);
    }

    this.updateResourceUI();
  }

  private drawHex(h: HexCell): void {
    const { x, y } = hexToPixel(h.col, h.row);
    const verts = hexVertices(x, y);

    // Base fill: type color
    let fillColor = HEX_TYPES[h.type].baseColor;
    let fillAlpha = 1.0;

    // Owner tint overlay
    if (h.owner) {
      fillColor = blendColor(HEX_TYPES[h.type].baseColor, OWNER_COLORS[h.owner], 0.55);
      fillAlpha = 1.0;
    }

    // Bacteria tint
    if (GS.state.bacteriaHexes.has(GS.key(h.col, h.row))) {
      fillColor = blendColor(fillColor, 0x00ff44, 0.4);
    }

    this.hexGfx.fillStyle(fillColor, fillAlpha);
    this.hexGfx.beginPath();
    this.hexGfx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < 6; i++) this.hexGfx.lineTo(verts[i].x, verts[i].y);
    this.hexGfx.closePath();
    this.hexGfx.fillPath();

    // Border
    const borderAlpha = h.owner ? 0.7 : 0.25;
    const borderCol   = h.owner ? OWNER_COLORS[h.owner] : C.border;
    this.borderGfx.lineStyle(h.owner ? 1.5 : 0.8, borderCol, borderAlpha);
    this.borderGfx.beginPath();
    this.borderGfx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < 6; i++) this.borderGfx.lineTo(verts[i].x, verts[i].y);
    this.borderGfx.closePath();
    this.borderGfx.strokePath();

    // HP bar for player-owned non-core hexes (show damage)
    if (h.owner === 'player' && h.nodeType !== 'core' && h.hp < h.maxHp) {
      this.drawHPBar(x, y, h.hp, h.maxHp);
    }

    // Node icon
    if (h.nodeType && h.nodeType !== 'conduit') {
      const def = NODE_DEFS[h.nodeType];
      const icon = this.add.text(x, y - 4, def.emoji, {
        fontFamily: 'monospace',
        fontSize: h.nodeType === 'core' ? '14px' : '11px',
        color: '#' + NODE_COLORS[h.nodeType].toString(16).padStart(6, '0'),
      }).setOrigin(0.5).setDepth(5);
      this.hexIcons.set(GS.key(h.col, h.row) + '_node', icon);
    }

    // Resource/type icon for unowned hexes
    if (!h.owner && HEX_TYPES[h.type].emoji !== '·') {
      const def = HEX_TYPES[h.type];
      const icon = this.add.text(x, y, def.emoji, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#' + fillColor.toString(16).padStart(6, '0').replace(/^0+/, ''),
      }).setOrigin(0.5).setDepth(4).setAlpha(0.6);
      this.hexIcons.set(GS.key(h.col, h.row) + '_type', icon);
    }
  }

  private drawHPBar(cx: number, cy: number, hp: number, maxHp: number): void {
    const bw = HEX_SIZE * 1.2, bh = 3, by = cy + HEX_SIZE - 6;
    const pct = hp / maxHp;
    this.borderGfx.fillStyle(0x000000, 0.6);
    this.borderGfx.fillRect(cx - bw / 2, by, bw, bh);
    const col = pct > 0.5 ? C.green : pct > 0.25 ? 0xffaa00 : C.red;
    this.borderGfx.fillStyle(col, 1);
    this.borderGfx.fillRect(cx - bw / 2, by, bw * pct, bh);
  }

  private drawGrowHighlight(col: number, row: number): void {
    const { x, y } = hexToPixel(col, row);
    const verts = hexVertices(x, y, HEX_SIZE - 2);
    this.borderGfx.lineStyle(2, C.player, 0.5 + 0.2 * Math.sin(this.time.now / 300));
    this.borderGfx.beginPath();
    this.borderGfx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < 6; i++) this.borderGfx.lineTo(verts[i].x, verts[i].y);
    this.borderGfx.closePath();
    this.borderGfx.strokePath();
  }

  private drawBacteriaHex(col: number, row: number): void {
    const { x, y } = hexToPixel(col, row);
    const verts = hexVertices(x, y);
    this.hexGfx.fillStyle(0x00ff44, 0.3);
    this.hexGfx.beginPath();
    this.hexGfx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < 6; i++) this.hexGfx.lineTo(verts[i].x, verts[i].y);
    this.hexGfx.closePath();
    this.hexGfx.fillPath();
    this.borderGfx.lineStyle(2, 0x00ff44, 0.7);
    this.borderGfx.beginPath();
    this.borderGfx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < 6; i++) this.borderGfx.lineTo(verts[i].x, verts[i].y);
    this.borderGfx.closePath();
    this.borderGfx.strokePath();
    const icon = this.add.text(x, y, '🦠', { fontSize: '10px' }).setOrigin(0.5).setDepth(5);
    this.hexIcons.set(`bact_${col},${row}`, icon);
  }

  private drawBioHint(col: number, row: number): void {
    const { x, y } = hexToPixel(col, row);
    const verts = hexVertices(x, y, HEX_SIZE - 3);
    this.borderGfx.lineStyle(2, 0xff4444, 0.6);
    this.borderGfx.beginPath();
    this.borderGfx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < 6; i++) this.borderGfx.lineTo(verts[i].x, verts[i].y);
    this.borderGfx.closePath();
    this.borderGfx.strokePath();
  }

  private drawSelectionRing(col: number, row: number): void {
    const { x, y } = hexToPixel(col, row);
    const verts = hexVertices(x, y, HEX_SIZE + 2);
    this.borderGfx.lineStyle(3, 0xffffff, 0.9);
    this.borderGfx.beginPath();
    this.borderGfx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < 6; i++) this.borderGfx.lineTo(verts[i].x, verts[i].y);
    this.borderGfx.closePath();
    this.borderGfx.strokePath();
  }

  // ═════════════════════════════════════════════════════════════════════
  //  UI BUILDING
  // ═════════════════════════════════════════════════════════════════════

  private buildUI(): void {
    // Top bar background
    this.uiGfx.fillStyle(C.panel, 1);
    this.uiGfx.fillRect(0, 0, GAME_W, BALANCE.coreHp + 50); // just panel height
    this.uiGfx.fillStyle(C.panel, 1);
    this.uiGfx.fillRect(0, 0, GAME_W, 64);
    this.uiGfx.lineStyle(1, C.border, 0.6);
    this.uiGfx.lineBetween(0, 64, GAME_W, 64);

    // Bottom bar
    this.uiGfx.fillStyle(C.panel, 1);
    this.uiGfx.fillRect(0, GAME_H - 64, GAME_W, 64);
    this.uiGfx.lineStyle(1, C.border, 0.6);
    this.uiGfx.lineBetween(0, GAME_H - 64, GAME_W, GAME_H - 64);

    // Resource texts (top bar)
    const ry = 22;
    this.sporesText  = this.makeLabel(12,         ry, '⬡  0');
    this.proteinText = this.makeLabel(110,        ry, '💪 0');
    this.mycoText    = this.makeLabel(200,        ry, '🍄 0');
    this.symText     = this.makeLabel(280,        ry, '🌿 0');

    // Turn + owned count
    this.turnText    = this.makeLabel(12,         46, 'Turn 1');
    this.ownedText   = this.makeLabel(110,        46, 'Owned: 3');
    this.actionsText = this.makeLabel(250,        46, '⚡ Actions: 1');

    // End Turn button (bottom bar)
    this.makeEndTurnButton();
  }

  private makeLabel(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#' + C.player.toString(16).padStart(6, '0'),
    }).setDepth(10);
  }

  private makeEndTurnButton(): void {
    const bx = GAME_W / 2, by = GAME_H - 33;
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(C.player, 0.15);
    g.fillRoundedRect(bx - 80, by - 20, 160, 40, 10);
    g.lineStyle(2, C.player, 0.9);
    g.strokeRoundedRect(bx - 80, by - 20, 160, 40, 10);

    this.add.text(bx, by, 'END TURN  ▶', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#00ffcc',
    }).setOrigin(0.5).setDepth(11);

    const zone = this.add.zone(bx, by, 160, 40).setInteractive({ useHandCursor: true }).setDepth(11);
    zone.on('pointerdown', () => {
      if (this.phase === PHASE.PLAYER) this.endTurn();
    });
  }

  // ─── Action panel (slides up when hex selected) ────────────────────────
  private readonly PANEL_H = 242; // header(52) + 5 buttons × 38px each

  private buildActionPanel(): void {
    this.actionContainer = this.add.container(0, GAME_H).setDepth(20);

    const g = this.add.graphics();
    const ph = this.PANEL_H;
    g.fillStyle(C.panel, 0.97);
    g.fillRoundedRect(0, 0, GAME_W, ph, { tl: 16, tr: 16, bl: 0, br: 0 });
    g.lineStyle(1, C.border, 0.8);
    g.strokeRoundedRect(0, 0, GAME_W, ph, { tl: 16, tr: 16, bl: 0, br: 0 });
    this.actionContainer.add(g);

    this.actionContainer.add(
      this.add.text(16, 12, '', {
        fontFamily: 'monospace', fontSize: '13px', color: '#00ffcc',
      }).setName('hexInfo'),
    );

    this.actionContainer.add(
      this.add.text(16, 30, '', {
        fontFamily: 'monospace', fontSize: '11px', color: '#889aaa', wordWrap: { width: GAME_W - 32 },
      }).setName('hexDesc'),
    );
  }

  private showActionPanel(col: number, row: number): void {
    const h = GS.hex(col, row);
    if (!h) return;

    // Clear old buttons from container (keep 0=bg, 1=info, 2=desc)
    while (this.actionContainer.length > 3) {
      this.actionContainer.removeAt(this.actionContainer.length - 1, true);
    }

    const def  = HEX_TYPES[h.type];
    const info = (this.actionContainer.getAt(1) as Phaser.GameObjects.Text);
    const desc = (this.actionContainer.getAt(2) as Phaser.GameObjects.Text);

    const ownerStr = h.owner ? ` [${h.owner}]` : ' [empty]';
    info.setText(`${def.emoji} ${def.label}${ownerStr}  yield:${h.yield}`);
    desc.setText(def.description + (h.nodeType ? `  • Node: ${h.nodeType}` : ''));

    const actions: { label: string; color: number; cb: () => void }[] = [];
    const s = GS.state;
    const growable = this.growableKeys.has(GS.key(col, row));
    const totalActions = s.growActionsLeft + s.freeGrowActions;

    if (!h.owner && growable && totalActions > 0) {
      const cost = GS.growCost(col, row);
      actions.push({
        label: `⬡ Grow Here  (${cost} ⬡)`,
        color: C.player,
        cb: () => this.doGrow(col, row),
      });
    } else if (!h.owner && growable && totalActions <= 0) {
      actions.push({ label: 'No actions left this turn', color: C.gray, cb: () => {} });
    } else if (!h.owner && !growable && h.type !== 'toxic_zone') {
      actions.push({ label: 'Too far or not enough spores', color: C.gray, cb: () => {} });
    }

    // Build node options for owned player hexes
    if (h.owner === 'player' && h.nodeType === 'conduit') {
      const nodes: NodeType[] = ['toxin_gland', 'chitin_wall', 'spore_cluster', 'sporulation_chamber'];
      for (const nt of nodes) {
        const [sc, pr, mb] = BALANCE.nodeCost[nt];
        const canAfford = s.resources.spores >= sc && s.resources.protein >= pr;
        if (canAfford) {
          const def2 = NODE_DEFS[nt];
          actions.push({
            label: `${def2.emoji} Build ${def2.label}  (${sc}⬡ ${pr > 0 ? pr + '💪' : ''})`,
            color: NODE_COLORS[nt],
            cb: () => this.doBuild(col, row, nt),
          });
        }
      }
    }

    // Sporulation Frenzy button
    if (h.owner === 'player' && s.mutationEffects.sporulationFrenzyAvailable && !s.mutationEffects.sporulationFrenzyUsed) {
      actions.push({
        label: '🌊 Sporulation Frenzy!',
        color: C.epic,
        cb: () => this.doSporulationFrenzy(),
      });
    }

    if (actions.length === 0) {
      actions.push({ label: 'Nothing to do here', color: C.gray, cb: () => {} });
    }

    // Render action buttons
    actions.forEach((a, i) => {
      const by = 55 + i * 36;
      const bg = this.add.graphics();
      bg.fillStyle(a.color, 0.12);
      bg.fillRoundedRect(12, by, GAME_W - 24, 30, 6);
      bg.lineStyle(1, a.color, 0.5);
      bg.strokeRoundedRect(12, by, GAME_W - 24, 30, 6);

      const btn = this.add.text(24, by + 8, a.label, {
        fontFamily: 'monospace', fontSize: '13px',
        color: '#' + a.color.toString(16).padStart(6, '0'),
      });

      const zone = this.add.zone(GAME_W / 2, by + 15, GAME_W - 24, 30)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        a.cb();
        this.hideActionPanel();
      });

      this.actionContainer.add([bg, btn, zone]);
    });

    // Slide up
    if (!this.actionVisible) {
      this.actionVisible = true;
      this.tweens.add({
        targets: this.actionContainer,
        y: GAME_H - 64 - this.PANEL_H,
        duration: 200,
        ease: 'Power2.easeOut',
      });
    }
  }

  private hideActionPanel(): void {
    if (!this.actionVisible) return;
    this.actionVisible = false;
    this.selectedKey = null;
    this.tweens.add({
      targets: this.actionContainer,
      y: GAME_H,
      duration: 150,
      ease: 'Power2.easeIn',
    });
    this.drawAll(); // remove selection ring
  }

  // ─── Evolution panel ──────────────────────────────────────────────────────
  private buildEvolutionPanel(): void {
    this.evolutionContainer = this.add.container(0, GAME_H).setDepth(30);
  }

  private showEvolutionPanel(picks: number): void {
    this.phase = PHASE.EVOLUTION;
    this.evolutionContainer.removeAll(true);

    // Sample mutations
    const active = GS.state.activeMutationIds;
    const pool   = MUTATIONS_LIST.filter(m => !active.has(m.id));
    const items  = pool.map(m => ({ value: m, weight: RARITY_WEIGHTS[m.rarity] }));
    const chosen = uniqueWeighted(items, Math.min(3, pool.length));

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.92);
    g.fillRect(0, 0, GAME_W, GAME_H);
    this.evolutionContainer.add(g);

    this.evolutionContainer.add(
      this.add.text(GAME_W / 2, 60, picks > 1 ? `EVOLUTION  (pick ${picks})` : 'EVOLUTION', {
        fontFamily: 'monospace', fontSize: '22px', color: '#00ffcc',
      }).setOrigin(0.5),
    );
    this.evolutionContainer.add(
      this.add.text(GAME_W / 2, 90, 'Choose a mutation', {
        fontFamily: 'monospace', fontSize: '14px', color: '#889aaa',
      }).setOrigin(0.5),
    );

    let picksRemaining = picks;

    chosen.forEach((m: Mutation, i: number) => {
      const cy = 160 + i * 190;
      this.addMutationCard(m, 0, cy, () => {
        this.applyMutation(m);
        picksRemaining--;
        if (picksRemaining <= 0) {
          this.hideEvolutionPanel();
        } else {
          // Remove just this card's objects to indicate selection, resample
          this.showEvolutionPanel(picksRemaining);
        }
      });
    });

    this.tweens.add({
      targets: this.evolutionContainer,
      y: 0,
      duration: 300,
      ease: 'Power2.easeOut',
    });
  }

  private addMutationCard(m: Mutation, ox: number, oy: number, cb: () => void): void {
    const rarityColors: Record<string, number> = {
      common: C.common, rare: C.rare, epic: C.epic, legendary: C.legendary,
    };
    const rc = rarityColors[m.rarity];

    const g = this.add.graphics();
    g.fillStyle(C.panelLight, 1);
    g.fillRoundedRect(ox + 16, oy, GAME_W - 32, 170, 12);
    g.lineStyle(2, rc, 0.8);
    g.strokeRoundedRect(ox + 16, oy, GAME_W - 32, 170, 12);
    this.evolutionContainer.add(g);

    // Rarity badge
    const rarityLabel = m.rarity.toUpperCase();
    this.evolutionContainer.add(
      this.add.text(GAME_W - 24, oy + 12, rarityLabel, {
        fontFamily: 'monospace', fontSize: '11px',
        color: '#' + rc.toString(16).padStart(6, '0'),
      }).setOrigin(1, 0),
    );

    this.evolutionContainer.add(
      this.add.text(ox + 36, oy + 12, `${m.emoji}  ${m.name}`, {
        fontFamily: 'monospace', fontSize: '16px',
        color: '#' + rc.toString(16).padStart(6, '0'),
      }),
    );

    this.evolutionContainer.add(
      this.add.text(ox + 36, oy + 40, m.description, {
        fontFamily: 'monospace', fontSize: '13px',
        color: '#aabbcc',
        wordWrap: { width: GAME_W - 80 },
      }),
    );

    // Pick button
    const bg2 = this.add.graphics();
    bg2.fillStyle(rc, 0.18);
    bg2.fillRoundedRect(ox + 16, oy + 135, GAME_W - 32, 30, 8);
    bg2.lineStyle(1, rc, 0.7);
    bg2.strokeRoundedRect(ox + 16, oy + 135, GAME_W - 32, 30, 8);
    this.evolutionContainer.add(bg2);

    this.evolutionContainer.add(
      this.add.text(GAME_W / 2, oy + 150, 'CHOOSE THIS', {
        fontFamily: 'monospace', fontSize: '13px',
        color: '#' + rc.toString(16).padStart(6, '0'),
      }).setOrigin(0.5),
    );

    const zone = this.add.zone(GAME_W / 2, oy + 85, GAME_W - 32, 170)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', cb);
    this.evolutionContainer.add(zone);
  }

  private hideEvolutionPanel(): void {
    this.tweens.add({
      targets: this.evolutionContainer,
      y: GAME_H,
      duration: 250,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.evolutionContainer.removeAll(true);
        this.phase = PHASE.PLAYER;
        this.refreshGrowableCache();
        this.drawAll();
        GS.state.pendingEvolution = false;
      },
    });
  }

  private applyMutation(m: Mutation): void {
    GS.state.activeMutationIds.add(m.id);
    GS.state.stats.mutationsUnlocked.push(m.id);
    GS.applyMutationEffects(m.effects);
    this.showFloating(GAME_W / 2, 200, `${m.emoji} ${m.name}!`, 0xffd700, 28, 2000);
    GS.logEvent(`Evolution: ${m.name} unlocked`);
  }

  // ─── Event banner ─────────────────────────────────────────────────────────
  private buildEventBanner(): void {
    this.eventBanner = this.add.text(GAME_W / 2, 80, '', {
      fontFamily: 'monospace', fontSize: '14px',
      color: '#ffd700',
      backgroundColor: '#0d1225ee',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(25).setAlpha(0).setWordWrapWidth(GAME_W - 40);
  }

  private showEventBanner(msg: string): void {
    this.eventBanner.setText(msg).setAlpha(1);
    this.tweens.add({
      targets: this.eventBanner,
      alpha: 0,
      delay: 2800,
      duration: 600,
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  //  INPUT
  // ═════════════════════════════════════════════════════════════════════

  private setupInput(): void {
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.phase !== PHASE.PLAYER) return;
      const hex = pixelToHex(ptr.x, ptr.y);
      if (!hex) {
        this.hideActionPanel();
        return;
      }
      const k = GS.key(hex.col, hex.row);
      if (this.selectedKey === k) {
        this.hideActionPanel();
        return;
      }
      this.selectedKey = k;
      this.drawAll();
      this.drawSelectionRing(hex.col, hex.row);
      this.showActionPanel(hex.col, hex.row);
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  //  PLAYER ACTIONS
  // ═════════════════════════════════════════════════════════════════════

  private doGrow(col: number, row: number): void {
    const s = GS.state;
    const totalActions = s.growActionsLeft + s.freeGrowActions;
    if (totalActions <= 0) {
      this.showFloating(GAME_W / 2, 300, 'No actions left!', C.red);
      return;
    }
    const cost = GS.growCost(col, row);
    if (s.resources.spores < cost) {
      this.showFloating(GAME_W / 2, 300, 'Not enough spores!', C.red);
      return;
    }

    s.resources.spores -= cost;
    const fx = s.mutationEffects;

    if (s.freeGrowActions > 0) s.freeGrowActions--;
    else s.growActionsLeft--;

    const h = GS.hex(col, row)!;
    h.owner    = 'player';
    h.nodeType = 'conduit';
    h.hp = Math.min(h.maxHp, BALANCE.defaultHexHp + fx.hexHpBonus);
    h.maxHp = h.hp;

    const { x, y } = hexToPixel(col, row);
    this.showFloating(x, y - 20, `-${cost} ⬡`, C.player, 14, 800);

    // Pulse the new hex
    this.flashHex(col, row, C.player);
    this.refreshGrowableCache();
    this.drawAll();
    this.updateResourceUI();
  }

  private doBuild(col: number, row: number, nodeType: NodeType): void {
    const [sc, pr] = BALANCE.nodeCost[nodeType];
    const s = GS.state;
    if (s.resources.spores < sc || s.resources.protein < pr) return;

    s.resources.spores  -= sc;
    s.resources.protein -= pr;

    const h = GS.hex(col, row)!;
    h.nodeType = nodeType;
    if (nodeType === 'chitin_wall') { h.hp += 3; h.maxHp += 3; }

    const { x, y } = hexToPixel(col, row);
    const def = NODE_DEFS[nodeType];
    this.showFloating(x, y - 24, `${def.emoji} Built!`, NODE_COLORS[nodeType], 14, 1000);
    this.flashHex(col, row, NODE_COLORS[nodeType]);
    this.drawAll();
    this.updateResourceUI();
  }

  private doSporulationFrenzy(): void {
    const s = GS.state;
    s.mutationEffects.sporulationFrenzyUsed = true;
    s.mutationEffects.sporulationFrenzyAvailable = false;

    const border = getGrowableHexes();
    const targets = RNG.pickN(border, Math.min(6, border.length));
    for (const t of targets) {
      const h = GS.hex(t.col, t.row)!;
      h.owner    = 'player';
      h.nodeType = 'conduit';
      h.hp = h.maxHp = BALANCE.defaultHexHp + s.mutationEffects.hexHpBonus;
      this.flashHex(t.col, t.row, C.player);
    }

    this.showFloating(GAME_W / 2, 200, `🌊 Frenzy! +${targets.length} hexes!`, C.epic, 20, 2000);
    this.refreshGrowableCache();
    this.drawAll();
    this.updateResourceUI();
  }

  // ═════════════════════════════════════════════════════════════════════
  //  TURN PROCESSING
  // ═════════════════════════════════════════════════════════════════════

  private endTurn(): void {
    if (this.phase !== PHASE.PLAYER) return;
    this.phase = PHASE.ANIMATING;
    this.hideActionPanel();

    // 1. Player income
    const income = GS.collectPlayerIncome();
    this.applyMoistureAdjacency();
    if ((income.spores ?? 0) > 0) {
      this.showFloating(GAME_W / 2, 75, `+${income.spores} ⬡`, C.player, 13, 900);
    }

    // 2. Combat — toxin glands damage enemy hexes
    this.processCombat();

    // 3. Bacteria spread / damage
    this.processBacteria();

    // 4. Enemy AI
    this.time.delayedCall(400, () => {
      this.runEnemyAI();
      this.time.delayedCall(300, () => {
        this.postEnemyTurn();
      });
    });
  }

  private postEnemyTurn(): void {
    const s = GS.state;

    // 5. Check lose condition FIRST
    const coreHex = GS.hex(s.playerCore.col, s.playerCore.row);
    if (!coreHex || coreHex.owner !== 'player') {
      this.doGameOver(false);
      return;
    }

    // 6. Random event
    if (s.turn >= this.nextEventTurn) {
      this.fireEvent();
      this.nextEventTurn = s.turn + RNG.int(5, 9);
    }

    // 7. Time Dilation (every 10th turn = free bonus turn for player)
    if (s.mutationEffects.timeDialation && s.turn % 10 === 0) {
      this.showFloating(GAME_W / 2, 200, '⏳ Time Dilation — extra turn!', C.legendary, 18, 2000);
      // We skip the normal "enemy acts" so it's truly free
    }

    // 8. Advance turn
    s.turn++;
    GS.scaleEnemyDifficulty();

    // 9. Reset per-turn state
    const extra = s.mutationEffects.extraGrowActionsPerTurn;
    s.growActionsLeft = 1 + extra;
    s.freeGrowActions = 0;
    s.jumpGrowUsed    = false;

    // 10. Check evolution
    const evo = s.mutationEffects.doubleNextEvolution ? 2 : 1;
    if (s.turn % BALANCE.evolutionInterval === 0) {
      s.mutationEffects.doubleNextEvolution = false; // consumed
      this.refreshGrowableCache();
      this.drawAll();
      this.updateResourceUI();
      this.time.delayedCall(200, () => this.showEvolutionPanel(evo));
      return;
    }

    // 11. Check win condition
    const owned  = GS.playerHexCount();
    const total  = GS.totalClaimableHexes();
    if (owned / total >= BALANCE.winHexPercent) {
      this.doGameOver(true);
      return;
    }

    this.phase = PHASE.PLAYER;
    this.refreshGrowableCache();
    this.drawAll();
    this.updateResourceUI();
  }

  // ─── Combat ────────────────────────────────────────────────────────────────
  private processCombat(): void {
    const s = GS.state;
    const fx = s.mutationEffects;
    const toxinDmg = 1 + fx.toxinDamageBonus;

    for (const [, h] of s.hexes) {
      if (h.owner !== 'player' || h.nodeType !== 'toxin_gland') continue;
      for (const nb of getNeighbours(h.col, h.row)) {
        const nh = GS.hex(nb.col, nb.row);
        if (!nh || nh.owner === 'player' || nh.owner === null) continue;

        nh.hp -= toxinDmg;
        const { x, y } = hexToPixel(nb.col, nb.row);
        this.showFloating(x, y - 16, `-${toxinDmg}`, C.red, 12, 700);

        // Slow effect
        if (fx.toxinSlows) {
          const enemy = s.enemies.find(e => e.id === nh.owner);
          if (enemy) enemy.slowed = true;
        }

        if (nh.hp <= 0) {
          this.destroyHex(nb.col, nb.row);
        }
      }
    }

    // Enemy "passive toxin" on player hexes adjacent to enemies
    for (const [, h] of s.hexes) {
      if (!h.owner || h.owner === 'player') continue;
      // Each enemy-owned hex deals 0.5 dmg per turn (1 dmg every 2 turns via probability)
      for (const nb of getNeighbours(h.col, h.row)) {
        const nh = GS.hex(nb.col, nb.row);
        if (!nh || nh.owner !== 'player') continue;
        if (!RNG.chance(40)) continue; // not every turn

        nh.hp--;
        if (nh.hp <= 0) {
          // Thorns
          if (fx.hasThornsPassive) { h.hp--; }
          this.destroyPlayerHex(nb.col, nb.row);
        }
      }
    }
  }

  private destroyHex(col: number, row: number): void {
    const h = GS.hex(col, row);
    if (!h) return;
    const wasEnemy = h.owner && h.owner !== 'player';
    if (wasEnemy) {
      GS.state.stats.enemiesDestroyed++;
      GS.state.resources.spores = Math.min(999,
        GS.state.resources.spores + GS.state.mutationEffects.destroyedEnemySpores,
      );
    }
    h.owner    = null;
    h.nodeType = null;
    h.hp       = BALANCE.defaultHexHp;
    h.maxHp    = BALANCE.defaultHexHp;
    this.flashHex(col, row, C.red);
  }

  private destroyPlayerHex(col: number, row: number): void {
    const h = GS.hex(col, row);
    if (!h || h.nodeType === 'core') return; // core handled separately
    h.owner    = null;
    h.nodeType = null;
    h.hp       = BALANCE.defaultHexHp;
    h.maxHp    = BALANCE.defaultHexHp;
    this.flashHex(col, row, C.red);
    GS.logEvent('Lost a hex to enemy pressure!');
  }

  // ─── Enemy AI ──────────────────────────────────────────────────────────────
  private runEnemyAI(): void {
    const s = GS.state;
    for (const enemy of s.enemies) {
      if (!enemy.alive) continue;
      GS.collectEnemyIncome(enemy);

      const growsThisTurn = BALANCE.enemyGrowInterval;
      for (let g = 0; g < growsThisTurn; g++) {
        if (enemy.spores < 2) break;

        const candidates = getBorderHexes(enemy.id).filter(nb => {
          const h = GS.hex(nb.col, nb.row);
          return h && h.type !== 'toxic_zone' && !GS.state.bacteriaHexes.has(GS.key(nb.col, nb.row));
        });

        if (candidates.length === 0) break;

        // Score candidates by personality
        const pc    = s.playerCore;
        const fdef  = ENEMY_FACTIONS.find(f => f.id === enemy.id)!;
        const pw    = PERSONALITY_WEIGHTS[fdef.personality];

        const scored = candidates.map(nb => {
          const h     = GS.hex(nb.col, nb.row)!;
          const score =
            pw.resourceValue * (h.yield * 2 + (h.type !== 'soil' ? 3 : 0))
            + pw.towardPlayer * (20 - hexDist(nb.col, nb.row, pc.col, pc.row))
            + pw.towardSelf   * (20 - hexDist(nb.col, nb.row, enemy.coreCol, enemy.coreRow))
            + RNG.rand()      * pw.randomNoise;
          return { nb, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const chosen = scored[0].nb;

        // Mark next grow target for bioluminescence
        enemy.nextGrowTarget = chosen;

        // Grow to it (may be fighting player hex)
        const ch = GS.hex(chosen.col, chosen.row)!;
        if (ch.owner === 'player') {
          ch.hp -= 2;
          if (ch.hp <= 0) {
            if (ch.nodeType === 'core') {
              this.doGameOver(false);
              return;
            }
            ch.owner    = enemy.id;
            ch.nodeType = 'conduit';
            ch.hp = ch.maxHp = BALANCE.defaultHexHp;
            enemy.spores -= 4;
          }
        } else {
          ch.owner    = enemy.id;
          ch.nodeType = 'conduit';
          ch.hp = ch.maxHp = BALANCE.defaultHexHp;
          enemy.spores -= 2;
        }

        enemy.hexCount++;
      }

      // Check if faction eliminated
      let factionHexes = 0;
      for (const [, h] of s.hexes) if (h.owner === enemy.id) factionHexes++;
      if (factionHexes === 0 && enemy.alive) {
        enemy.alive = false;
        s.stats.factionsEliminated++;
        const fdef = ENEMY_FACTIONS.find(f => f.id === enemy.id)!;
        this.showEventBanner(`${fdef.emoji} ${fdef.name} eliminated!`);
        GS.logEvent(`${fdef.name} faction eliminated!`);
      }
    }

    // Update bioluminescence
    if (s.mutationEffects.bioluminescence) {
      this.bioHints.clear();
      for (const e of s.enemies) {
        if (e.nextGrowTarget) {
          this.bioHints.add(GS.key(e.nextGrowTarget.col, e.nextGrowTarget.row));
        }
      }
    }
  }

  // ─── Bacteria ─────────────────────────────────────────────────────────────
  private processBacteria(): void {
    const toRemove: string[] = [];
    const toAdd: string[] = [];

    for (const k of GS.state.bacteriaHexes) {
      const [col, row] = k.split(',').map(Number);

      // Damage adjacent player hexes
      for (const nb of getNeighbours(col, row)) {
        const nh = GS.hex(nb.col, nb.row);
        if (nh && nh.owner === 'player') {
          nh.hp -= 1;
          if (nh.hp <= 0) this.destroyPlayerHex(nb.col, nb.row);
        }
      }

      // Slow spread (20% chance per bacteria hex)
      if (RNG.chance(20)) {
        const empty = getNeighbours(col, row).filter(nb => {
          const h = GS.hex(nb.col, nb.row);
          return h && !h.owner && !GS.state.bacteriaHexes.has(GS.key(nb.col, nb.row));
        });
        if (empty.length > 0) toAdd.push(GS.key(...Object.values(RNG.pick(empty)) as [number, number]));
      }

      // Bacteria dies out after ~10 turns (20% death chance)
      if (RNG.chance(20)) toRemove.push(k);
    }

    toRemove.forEach(k => GS.state.bacteriaHexes.delete(k));
    toAdd.forEach(k => GS.state.bacteriaHexes.add(k));
  }

  // ─── Events ────────────────────────────────────────────────────────────────
  private fireEvent(): void {
    const s = GS.state;
    const def = RNG.weighted(EVENTS_LIST.map(e => ({ value: e, weight: e.weight })));
    s.stats.eventsTriggered.push(def.id);

    const ctx = this.buildEventContext();
    const msg  = def.apply(ctx);

    this.showEventBanner(`${def.emoji} ${def.name}: ${msg}`);
    GS.logEvent(`Event: ${def.name} — ${msg}`);
    this.drawAll();
    this.updateResourceUI();
  }

  private buildEventContext() {
    const s = GS.state;
    return {
      playerResources: s.resources,
      playerHexCount:  GS.playerHexCount(),
      enemyHexCount:   [...s.hexes.values()].filter(h => h.owner && h.owner !== 'player').length,
      totalHexCount:   s.hexes.size,
      turn:            s.turn,

      addPlayerSpores:  (n: number) => { s.resources.spores   = Math.max(0, Math.min(999, s.resources.spores   + n)); },
      addPlayerProtein: (n: number) => { s.resources.protein  = Math.max(0, Math.min(999, s.resources.protein  + n)); },
      addPlayerMycoboost: (n: number) => { s.resources.mycoboost = Math.max(0, Math.min(999, s.resources.mycoboost + n)); },

      convertRandomSoilToResource: (type: 'leaf_litter' | 'dead_wood' | 'insect_corpse') => {
        const soils = [...s.hexes.values()].filter(h => h.type === 'soil' && !h.owner);
        const picks = RNG.pickN(soils, Math.min(3, soils.length));
        picks.forEach(h => {
          h.type  = type;
          h.yield = RNG.int(HEX_TYPES[type].yieldMin, HEX_TYPES[type].yieldMax);
        });
        return picks.length;
      },

      damageRandomPlayerHex: (dmg: number) => {
        const candidates = [...s.hexes.values()].filter(h => h.owner === 'player' && h.nodeType !== 'core');
        if (!candidates.length) return 0;
        const target = RNG.pick(candidates);
        target.hp -= dmg;
        if (target.hp <= 0) this.destroyPlayerHex(target.col, target.row);
        return 1;
      },

      destroyRandomResourceHex: () => {
        const candidates = [...s.hexes.values()].filter(h => !h.owner && h.type !== 'soil' && h.type !== 'toxic_zone');
        if (!candidates.length) return false;
        const t = RNG.pick(candidates);
        t.type  = 'soil';
        t.yield = 0;
        return true;
      },

      spawnBacteriaBloom: () => {
        const soil = [...s.hexes.values()].filter(h => h.type === 'soil' && !h.owner);
        if (!soil.length) return;
        const origin = RNG.pick(soil);
        const cluster = [GS.key(origin.col, origin.row),
          ...getNeighbours(origin.col, origin.row).slice(0, 2).map(nb => GS.key(nb.col, nb.row))];
        cluster.forEach(k => s.bacteriaHexes.add(k));
      },

      grantFreeGrowthActions: (n: number) => { s.freeGrowActions += n; },
    };
  }

  private applyMoistureAdjacency(): void {
    const s = GS.state;
    if (s.mutationEffects.moistureAdjacentBonus <= 0) return;
    for (const [, h] of s.hexes) {
      if (h.owner !== 'player' || h.type !== 'moisture') continue;
      for (const nb of getNeighbours(h.col, h.row)) {
        const nh = GS.hex(nb.col, nb.row);
        if (nh && nh.owner === 'player') {
          s.resources.spores = Math.min(999, s.resources.spores + s.mutationEffects.moistureAdjacentBonus);
        }
      }
    }
  }

  // ─── Win / Lose ────────────────────────────────────────────────────────────
  private doGameOver(win: boolean): void {
    if (this.phase === PHASE.GAMEOVER) return;
    this.phase = PHASE.GAMEOVER;
    const score = GS.computeScore();
    GS.state.stats.score = score;
    GS.state.stats.highestTurn = GS.state.turn;
    GS.saveBestScore(score);

    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(620, () => {
      this.scene.start(SCENES.GAMEOVER, { win, score });
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  private refreshGrowableCache(): void {
    this.growableKeys.clear();
    for (const nb of getGrowableHexes()) {
      this.growableKeys.add(GS.key(nb.col, nb.row));
    }
    // Also add cost-check failures as un-highlighted
  }

  private updateResourceUI(): void {
    const r = GS.state.resources;
    const s = GS.state;
    this.sporesText.setText(`⬡  ${r.spores}`);
    this.proteinText.setText(`💪 ${r.protein}`);
    this.mycoText.setText(`🍄 ${r.mycoboost}`);
    this.symText.setText(`🌿 ${r.symbiont}`);
    this.turnText.setText(`Turn ${s.turn}`);
    this.ownedText.setText(`Owned: ${GS.playerHexCount()}`);
    const acts = s.growActionsLeft + s.freeGrowActions;
    this.actionsText.setText(`⚡ ${acts} action${acts !== 1 ? 's' : ''}`);
  }

  private showFloating(
    x: number, y: number, text: string,
    color: number = C.white,
    size: number = 14,
    duration: number = 900,
  ): void {
    const t = this.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: `${size}px`,
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration,
      ease: 'Power2.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private flashHex(col: number, row: number, color: number): void {
    const { x, y } = hexToPixel(col, row);
    const g = this.add.graphics().setDepth(8);
    const verts = hexVertices(x, y);
    g.fillStyle(color, 0.5);
    g.beginPath();
    g.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < 6; i++) g.lineTo(verts[i].x, verts[i].y);
    g.closePath();
    g.fillPath();
    this.tweens.add({
      targets: g, alpha: 0, duration: 400,
      onComplete: () => g.destroy(),
    });
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function blendColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab_ = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb  = b & 0xff;
  const r  = Math.round(ar + (br - ar) * t);
  const g  = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab_ + (bb - ab_) * t);
  return (r << 16) | (g << 8) | bl;
}

function uniqueWeighted<T>(items: { value: T; weight: number }[], n: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const total = pool.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) { r -= pool[idx].weight; if (r <= 0) break; }
    idx = Math.min(idx, pool.length - 1);
    result.push(pool.splice(idx, 1)[0].value);
  }
  return result;
}

