/**
 * Random events fire every ~6–10 turns (weighted random interval).
 * To add a new event: append to EVENTS_LIST — no other changes needed.
 */

export interface GameEventDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  weight: number; // relative probability
  // Called when event fires; receives mutable game state snapshot
  // Returns a message shown in the event log
  apply: (ctx: EventContext) => string;
}

/** Minimal interface passed to event apply fns — avoids circular imports. */
export interface EventContext {
  playerResources: { spores: number; protein: number; mycoboost: number; symbiont: number };
  playerHexCount: number;
  enemyHexCount: number;
  totalHexCount: number;
  turn: number;

  // Mutators (scene resolves these)
  addPlayerSpores(n: number): void;
  addPlayerProtein(n: number): void;
  addPlayerMycoboost(n: number): void;
  convertRandomSoilToResource(type: 'leaf_litter' | 'dead_wood' | 'insect_corpse'): number;
  damageRandomPlayerHex(damage: number): number; // returns how many hexes damaged
  destroyRandomResourceHex(): boolean; // destroys a random unowned resource hex
  spawnBacteriaBloom(): void; // creates a hostile bacteria hex cluster
  grantFreeGrowthActions(n: number): void;
}

/**
 * EVENTS_LIST — add new events here without changing any other file.
 * The event system samples from this list each event cycle.
 */
export const EVENTS_LIST: GameEventDef[] = [
  {
    id: 'autumn_rain',
    name: 'Autumn Rain',
    emoji: '🌧',
    weight: 15,
    description: 'Heavy rainfall enriches the soil.',
    apply(ctx) {
      ctx.addPlayerSpores(6);
      return '+6 spores from rainfall!';
    },
  },
  {
    id: 'fallen_giant',
    name: 'Fallen Giant',
    emoji: '🌲',
    weight: 10,
    description: 'A massive tree has fallen, enriching the forest floor.',
    apply(ctx) {
      const n = ctx.convertRandomSoilToResource('dead_wood');
      return n > 0
        ? `${n} Dead Wood hex${n > 1 ? 'es' : ''} appeared!`
        : 'The fallen tree was already decomposed.';
    },
  },
  {
    id: 'insect_swarm',
    name: 'Insect Swarm',
    emoji: '🐜',
    weight: 12,
    description: 'A swarm of insects passes through, leaving remains.',
    apply(ctx) {
      ctx.addPlayerProtein(4);
      const n = ctx.convertRandomSoilToResource('insect_corpse');
      return `+4 protein. ${n} new Insect Corpse hex${n > 1 ? 'es' : ''} appeared.`;
    },
  },
  {
    id: 'spore_wind',
    name: 'Spore Wind',
    emoji: '🌬',
    weight: 12,
    description: 'A warm wind carries your spores far.',
    apply(ctx) {
      ctx.grantFreeGrowthActions(3);
      return '+3 free growth actions this turn!';
    },
  },
  {
    id: 'drought',
    name: 'Drought',
    emoji: '☀️',
    weight: 8,
    description: 'The earth dries out, reducing spore output.',
    apply(ctx) {
      const lost = Math.floor(ctx.playerResources.spores * 0.2);
      ctx.addPlayerSpores(-lost);
      return `Drought! Lost ${lost} spores.`;
    },
  },
  {
    id: 'bacteria_bloom',
    name: 'Bacteria Bloom',
    emoji: '🦠',
    weight: 8,
    description: 'Hostile bacteria has appeared on the forest floor!',
    apply(ctx) {
      ctx.spawnBacteriaBloom();
      return 'Bacteria Bloom appeared! Contain it with Toxin Glands.';
    },
  },
  {
    id: 'decomposer_raid',
    name: 'Decomposer Raid',
    emoji: '💀',
    weight: 8,
    description: 'Decomposers attack your richest resource hex.',
    apply(ctx) {
      const n = ctx.damageRandomPlayerHex(2);
      return n > 0 ? 'A decomposer attacked your network! Hex took 2 damage.' : 'Decomposers found nothing to attack.';
    },
  },
  {
    id: 'mycovirus',
    name: 'Mycovirus',
    emoji: '🧬',
    weight: 6,
    description: 'A viral agent disrupts your metabolism briefly.',
    apply(ctx) {
      const lost = Math.max(1, Math.floor(ctx.playerResources.protein * 0.25));
      ctx.addPlayerProtein(-lost);
      return `Mycovirus! Lost ${lost} protein.`;
    },
  },
  {
    id: 'ancient_root_awakens',
    name: 'Ancient Root Awakens',
    emoji: '🌿',
    weight: 6,
    description: 'Dormant root networks surge with energy.',
    apply(ctx) {
      ctx.addPlayerMycoboost(3);
      ctx.addPlayerSpores(4);
      return '+3 mycoboost and +4 spores from the roots!';
    },
  },
  {
    id: 'good_mushroom_season',
    name: 'Good Mushroom Season',
    emoji: '🍄',
    weight: 8,
    description: 'Mushroom caps are fruiting abundantly.',
    apply(ctx) {
      ctx.addPlayerMycoboost(5);
      return '+5 mycoboost from the mushroom bloom!';
    },
  },
  {
    id: 'resource_collapse',
    name: 'Resource Collapse',
    emoji: '⚡',
    weight: 5,
    description: 'An unclaimed resource hex is destroyed by environmental stress.',
    apply(ctx) {
      const removed = ctx.destroyRandomResourceHex();
      return removed ? 'An unclaimed resource hex was destroyed.' : 'No unclaimed resources to collapse.';
    },
  },
  {
    id: 'symbiont_surge',
    name: 'Symbiont Surge',
    emoji: '✨',
    weight: 6,
    description: 'The root network pulses with ancient energy.',
    apply(ctx) {
      const bonus = Math.max(2, Math.floor(ctx.playerHexCount / 5));
      ctx.addPlayerSpores(bonus);
      return `Symbiont surge! +${bonus} spores from your network size.`;
    },
  },
  // ── Future event slots (easy to add more) ─────────────────────────────
  // { id: 'wildfire_nearby', ... }
  // { id: 'heavy_rain_flood', ... }
  // { id: 'animal_trampling', ... }
];
