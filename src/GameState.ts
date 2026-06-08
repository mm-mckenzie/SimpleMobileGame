import { BALANCE } from './config';
import { HexCell, NodeType, Owner } from './data/hexTypes';
import { MutationEffects, DEFAULT_MUTATION_EFFECTS } from './data/mutations';
import { RNG } from './RNG';

export type { HexCell };

export interface EnemyState {
  id: 'enemy1' | 'enemy2' | 'enemy3';
  coreCol: number;
  coreRow: number;
  spores: number;
  sporeIncome: number; // scales with difficulty
  slowed: boolean;     // toxin slow effect
  alive: boolean;
  hexCount: number;    // cached
  nextGrowTarget: { col: number; row: number } | null; // for bioluminescence
}

export interface Resources {
  spores: number;
  protein: number;
  mycoboost: number;
  symbiont: number;
}

export interface RunStats {
  hexesOwned: number;
  enemiesDestroyed: number;       // individual enemy hexes destroyed
  factionsEliminated: number;
  mutationsUnlocked: string[];
  eventsTriggered: string[];
  highestTurn: number;
  score: number;
}

// ─── Game State singleton ────────────────────────────────────────────────────

export interface IGameState {
  hexes: Map<string, HexCell>;   // key = hexKey(col, row)
  playerCore: { col: number; row: number };
  enemies: EnemyState[];
  resources: Resources;
  turn: number;
  growActionsLeft: number;       // how many grows the player can do this turn
  mutationEffects: MutationEffects;
  activeMutationIds: Set<string>;
  pendingEvolution: boolean;
  eventsLog: string[];           // last N event messages
  stats: RunStats;
  bacteriaHexes: Set<string>;    // hostile bacteria cluster positions
  slowed: boolean;               // player slowed flag
  freeGrowActions: number;       // bonus grows from events (consumed this turn)
  jumpGrowUsed: boolean;         // per-turn flag for Hyphal Bridge
}

class GameStateManager {
  state: IGameState = this.fresh();

  fresh(): IGameState {
    return {
      hexes: new Map(),
      playerCore: { col: 4, row: 12 },
      enemies: [],
      resources: {
        spores:    BALANCE.startSpores,
        protein:   BALANCE.startProtein,
        mycoboost: BALANCE.startMycoboost,
        symbiont:  BALANCE.startSymbiont,
      },
      turn: 1,
      growActionsLeft: 1,
      mutationEffects: { ...DEFAULT_MUTATION_EFFECTS },
      activeMutationIds: new Set(),
      pendingEvolution: false,
      eventsLog: [],
      stats: {
        hexesOwned: 0,
        enemiesDestroyed: 0,
        factionsEliminated: 0,
        mutationsUnlocked: [],
        eventsTriggered: [],
        highestTurn: 0,
        score: 0,
      },
      bacteriaHexes: new Set(),
      slowed: false,
      freeGrowActions: 0,
      jumpGrowUsed: false,
    };
  }

  reset(): void {
    this.state = this.fresh();
  }

  key(col: number, row: number): string {
    return `${col},${row}`;
  }

  hex(col: number, row: number): HexCell | undefined {
    return this.state.hexes.get(this.key(col, row));
  }

  /** Base grow cost for a hex (before mutation reductions). */
  growCost(col: number, row: number): number {
    const h = this.hex(col, row);
    if (!h) return 99;
    const fx = this.state.mutationEffects;
    if (h.type === 'root_system' && fx.rootSystemCostFree) return 0;
    const base = BALANCE.growCost[h.type] ?? 2;
    return Math.max(1, base - fx.growCostReduction);
  }

  /** Collect income for player; returns income breakdown. */
  collectPlayerIncome(): Partial<Resources> {
    const s = this.state;
    const fx = s.mutationEffects;
    let spores   = BALANCE.coreSporesPerTurn + fx.passiveSporesPerTurn;
    let protein  = 0;
    let myco     = 0;
    let sym      = 0;

    // Count moisture hexes for adjacency bonus
    const moistureCols = new Set<string>();
    for (const [k, h] of s.hexes) {
      if (h.owner === 'player' && h.type === 'moisture') moistureCols.add(k);
    }

    for (const [, h] of s.hexes) {
      if (h.owner !== 'player') continue;
      if (h.nodeType === 'sporulation_chamber') spores += 3;
      if (h.type === 'soil' || h.type === 'moisture' || h.type === 'toxic_zone') continue;

      // Base yield
      let baseYield = h.yield;

      // Spore cluster doubles yield
      if (h.nodeType === 'spore_cluster') baseYield *= 2;

      // Moisture adjacency bonus
      if (fx.moistureAdjacentBonus > 0) {
        // (resolved in GameScene where we have neighbour access)
      }

      const yieldAmt = Math.floor(baseYield * fx.sporeYieldMultiplier);

      switch (h.type) {
        case 'leaf_litter':
        case 'dead_wood':
          spores += yieldAmt; break;
        case 'mushroom_cap':
          myco += baseYield; break;  // myco not multiplied by spore mult
        case 'insect_corpse':
          protein += baseYield + fx.proteinYieldBonus; break;
        case 'root_system':
          sym += baseYield; break;
      }
    }

    s.resources.spores   = Math.min(s.resources.spores   + spores,  999);
    s.resources.protein  = Math.min(s.resources.protein  + protein, 999);
    s.resources.mycoboost= Math.min(s.resources.mycoboost+ myco,    999);
    s.resources.symbiont = Math.min(s.resources.symbiont + sym,     999);

    return { spores, protein, mycoboost: myco, symbiont: sym };
  }

  /** Collect income for a given enemy faction. */
  collectEnemyIncome(enemy: EnemyState): void {
    if (!enemy.alive || enemy.slowed) {
      enemy.slowed = false; // slowed only lasts one turn
      return;
    }
    enemy.spores += enemy.sporeIncome;
    enemy.spores = Math.min(enemy.spores, 300);
  }

  /** Scale enemy income for difficulty. */
  scaleEnemyDifficulty(): void {
    const ramp = Math.floor((this.state.turn - 1) / BALANCE.difficultyRampTurns);
    for (const e of this.state.enemies) {
      if (!e.alive) continue;
      const base = 3 + ramp * BALANCE.difficultyRampFactor * 3;
      e.sporeIncome = Math.round(base);
    }
  }

  /** How many player hexes exist (including core). */
  playerHexCount(): number {
    let n = 0;
    for (const [, h] of this.state.hexes) if (h.owner === 'player') n++;
    return n;
  }

  /** Total claimable hexes on the map. */
  totalClaimableHexes(): number {
    let n = 0;
    for (const [, h] of this.state.hexes) if (h.type !== 'toxic_zone') n++;
    return n;
  }

  /** Apply a mutation's effects to the live MutationEffects object. */
  applyMutationEffects(effects: Partial<MutationEffects>): void {
    const fx = this.state.mutationEffects;
    const fxAny = fx as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(effects) as [keyof MutationEffects, unknown][]) {
      if (typeof v === 'boolean') {
        fxAny[k] = fxAny[k] || v;
      } else if (typeof v === 'number') {
        if (k === 'sporeYieldMultiplier') {
          fx.sporeYieldMultiplier = fx.sporeYieldMultiplier * v;
        } else {
          fxAny[k] = (fxAny[k] as number) + v;
        }
      }
    }
  }

  logEvent(msg: string): void {
    this.state.eventsLog.unshift(msg);
    if (this.state.eventsLog.length > 10) this.state.eventsLog.pop();
  }

  computeScore(): number {
    const s = this.state;
    const owned = this.playerHexCount();
    const total = this.totalClaimableHexes();
    return Math.floor(
      owned * 10 +
      s.turn * 5 +
      s.stats.enemiesDestroyed * 8 +
      s.stats.factionsEliminated * 50 +
      s.stats.mutationsUnlocked.length * 15 +
      (owned / total) * 200
    );
  }

  /** Save best score to localStorage. */
  saveBestScore(score: number): void {
    try {
      const prev = parseInt(localStorage.getItem('mycelium_best') ?? '0', 10);
      if (score > prev) localStorage.setItem('mycelium_best', String(score));
    } catch {}
  }

  getBestScore(): number {
    try { return parseInt(localStorage.getItem('mycelium_best') ?? '0', 10); } catch { return 0; }
  }
}

export const GS = new GameStateManager();
