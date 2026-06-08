/**
 * Mutations are picked every BALANCE.evolutionInterval turns (3 options shown).
 *
 * To add a new mutation: append an entry to MUTATIONS_LIST and handle its
 * flags in GameState.mutationEffects and the places those flags are checked
 * (GameScene, GameState.collectResources, etc.).
 *
 * Rarity weights: common=50, rare=30, epic=15, legendary=5
 */

export type MutationRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Mutation {
  id: string;
  name: string;
  emoji: string;
  rarity: MutationRarity;
  description: string;
  // Which fields in MutationEffects this mutation changes, and by how much.
  // These are CUMULATIVE (multiple mutations of the same type stack).
  effects: Partial<MutationEffects>;
}

/** All the modifiable flags/values that mutations can change. */
export interface MutationEffects {
  // Growth
  growCostReduction: number;    // subtract from every grow cost (min 1 always)
  extraGrowActionsPerTurn: number;
  canGrowThroughToxic: boolean;
  rootSystemCostFree: boolean;
  canJumpGrowth: boolean;       // once per turn, grow 2 hexes away

  // Yield
  sporeYieldMultiplier: number; // stacks multiplicatively: 1.0 = base
  proteinYieldBonus: number;
  moistureAdjacentBonus: number; // extra spores per moisture-adjacent owned hex/turn

  // Combat / defence
  hexHpBonus: number;           // flat HP added to every new player hex
  toxinDamageBonus: number;
  toxinSlows: boolean;          // toxin glands also halve enemy growth speed for 1 turn
  hasThornsPassive: boolean;    // reflects 1 damage when player hex is attacked
  sporulationFrenzyUsed: boolean;
  sporulationFrenzyAvailable: boolean;

  // Resource
  passiveSporesPerTurn: number; // bonus spores at start of player turn
  destroyedEnemySpores: number; // spores gained per enemy hex destroyed

  // Special
  doubleNextEvolution: boolean; // pick 2 next evolution (used once then reset)
  bioluminescence: boolean;     // reveals enemy next-move hex
  timeDialation: boolean;       // every 10th turn = free extra turn
}

export const DEFAULT_MUTATION_EFFECTS: MutationEffects = {
  growCostReduction: 0,
  extraGrowActionsPerTurn: 0,
  canGrowThroughToxic: false,
  rootSystemCostFree: false,
  canJumpGrowth: false,
  sporeYieldMultiplier: 1.0,
  proteinYieldBonus: 0,
  moistureAdjacentBonus: 0,
  hexHpBonus: 0,
  toxinDamageBonus: 0,
  toxinSlows: false,
  hasThornsPassive: false,
  sporulationFrenzyUsed: false,
  sporulationFrenzyAvailable: false,
  passiveSporesPerTurn: 0,
  destroyedEnemySpores: 0,
  doubleNextEvolution: false,
  bioluminescence: false,
  timeDialation: false,
};

/**
 * MUTATIONS_LIST — extend freely. The draft system samples from this list
 * (weighted by rarity), excluding mutations already active this run.
 */
export const MUTATIONS_LIST: Mutation[] = [
  // ─── Common ──────────────────────────────────────────────────────────────
  {
    id: 'rapid_hyphae',
    name: 'Rapid Hyphae',
    emoji: '⚡',
    rarity: 'common',
    description: 'Growth costs 1 less spore (minimum 1).',
    effects: { growCostReduction: 1 },
  },
  {
    id: 'efficient_digestion',
    name: 'Efficient Digestion',
    emoji: '🔬',
    rarity: 'common',
    description: '+25% spore yield from all hexes.',
    effects: { sporeYieldMultiplier: 1.25 },
  },
  {
    id: 'protein_efficiency',
    name: 'Protein Efficiency',
    emoji: '💪',
    rarity: 'common',
    description: 'Gain +1 protein from every insect corpse hex each turn.',
    effects: { proteinYieldBonus: 1 },
  },
  {
    id: 'mycelial_armor',
    name: 'Mycelial Armor',
    emoji: '🛡',
    rarity: 'common',
    description: 'All new hexes you claim have +1 HP.',
    effects: { hexHpBonus: 1 },
  },
  {
    id: 'branching_growth',
    name: 'Branching Growth',
    emoji: '🌿',
    rarity: 'common',
    description: 'Gain +1 growth action per turn.',
    effects: { extraGrowActionsPerTurn: 1 },
  },
  {
    id: 'passive_sporulation',
    name: 'Passive Sporulation',
    emoji: '✨',
    rarity: 'common',
    description: '+2 spores at the start of every player turn.',
    effects: { passiveSporesPerTurn: 2 },
  },
  {
    id: 'moisture_channeling',
    name: 'Moisture Channeling',
    emoji: '💧',
    rarity: 'common',
    description: 'Each moisture pocket hex in your network gives +1 spore to adjacent owned hexes per turn.',
    effects: { moistureAdjacentBonus: 1 },
  },

  // ─── Rare ────────────────────────────────────────────────────────────────
  {
    id: 'depth_runner',
    name: 'Depth Runner',
    emoji: '🔮',
    rarity: 'rare',
    description: 'Your network can grow through Toxic Zone hexes.',
    effects: { canGrowThroughToxic: true },
  },
  {
    id: 'root_rider',
    name: 'Root Rider',
    emoji: '🌿',
    rarity: 'rare',
    description: 'Growing to Root System hexes costs 0 spores.',
    effects: { rootSystemCostFree: true },
  },
  {
    id: 'neurotoxin',
    name: 'Neurotoxin',
    emoji: '🧪',
    rarity: 'rare',
    description: 'Toxin Glands also slow adjacent enemy growth by 50% for 1 turn.',
    effects: { toxinSlows: true },
  },
  {
    id: 'toxin_storm',
    name: 'Toxin Storm',
    emoji: '☣',
    rarity: 'rare',
    description: 'Toxin Glands deal +1 damage.',
    effects: { toxinDamageBonus: 1 },
  },
  {
    id: 'thorns_passive',
    name: 'Thorns',
    emoji: '🌵',
    rarity: 'rare',
    description: 'When an enemy destroys your hex, they take 1 damage back.',
    effects: { hasThornsPassive: true },
  },
  {
    id: 'parasitic_filaments',
    name: 'Parasitic Filaments',
    emoji: '🪱',
    rarity: 'rare',
    description: 'Gain 3 spores for every enemy hex you destroy.',
    effects: { destroyedEnemySpores: 3 },
  },
  {
    id: 'sporulation_frenzy',
    name: 'Sporulation Frenzy',
    emoji: '🌊',
    rarity: 'rare',
    description: 'Once per run: grow 6 random adjacent hexes for free.',
    effects: { sporulationFrenzyAvailable: true },
  },
  {
    id: 'hyphal_bridge',
    name: 'Hyphal Bridge',
    emoji: '🌉',
    rarity: 'rare',
    description: 'Once per turn, you may grow to a hex 2 steps away.',
    effects: { canJumpGrowth: true },
  },

  // ─── Epic ─────────────────────────────────────────────────────────────────
  {
    id: 'mutation_cascade',
    name: 'Mutation Cascade',
    emoji: '🌀',
    rarity: 'epic',
    description: 'Pick 2 mutations at your next Evolution event instead of 1.',
    effects: { doubleNextEvolution: true },
  },
  {
    id: 'bioluminescence',
    name: 'Bioluminescence',
    emoji: '🌟',
    rarity: 'epic',
    description: 'Rival expansion targets are highlighted on the map.',
    effects: { bioluminescence: true },
  },
  {
    id: 'efficient_digestion_ii',
    name: 'Hyper Digestion',
    emoji: '⚗️',
    rarity: 'epic',
    description: '+50% spore yield from all hexes.',
    effects: { sporeYieldMultiplier: 1.5 },
  },
  {
    id: 'double_growth',
    name: 'Double Growth',
    emoji: '✦',
    rarity: 'epic',
    description: 'Gain +2 growth actions per turn.',
    effects: { extraGrowActionsPerTurn: 2 },
  },

  // ─── Legendary ───────────────────────────────────────────────────────────
  {
    id: 'time_dilation',
    name: 'Time Dilation',
    emoji: '⏳',
    rarity: 'legendary',
    description: 'Every 10th turn, gain a free extra turn (enemies do not act).',
    effects: { timeDialation: true },
  },
  {
    id: 'sporulation_cascade',
    name: 'Sporulation Cascade',
    emoji: '💫',
    rarity: 'legendary',
    description: 'Gain 5 spores for every enemy hex you destroy.',
    effects: { destroyedEnemySpores: 5 },
  },
];

export const RARITY_WEIGHTS: Record<MutationRarity, number> = {
  common:    50,
  rare:      30,
  epic:      15,
  legendary: 5,
};
