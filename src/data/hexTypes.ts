import { C } from '../config';

// ─── HexCell (defined here to avoid circular imports) ──────────────────────
export interface HexCell {
  col: number;
  row: number;
  type: HexType;
  yield: number;
  owner: Owner;
  nodeType: NodeType | null;
  hp: number;
  maxHp: number;
}

// ─── Types ─────────────────────────────────────────────────────────────────
export type HexType =
  | 'soil'
  | 'leaf_litter'
  | 'dead_wood'
  | 'mushroom_cap'
  | 'moisture'
  | 'insect_corpse'
  | 'root_system'
  | 'toxic_zone';

export type ResourceKind = 'spores' | 'protein' | 'mycoboost' | 'symbiont' | 'none';

export type NodeType =
  | 'core'
  | 'conduit'
  | 'toxin_gland'
  | 'chitin_wall'
  | 'spore_cluster'
  | 'sporulation_chamber';

export type Owner = 'player' | 'enemy1' | 'enemy2' | 'enemy3' | null;

// ─── Hex type definitions ───────────────────────────────────────────────────
export interface HexTypeDef {
  id: HexType;
  label: string;
  emoji: string;
  baseColor: number;
  resource: ResourceKind;
  yieldMin: number;   // base income per turn when owned (before yield multiplier)
  yieldMax: number;
  spawnWeight: number; // relative map-gen probability (sum to ~100)
  claimable: boolean;  // can player/enemy grow here?
  description: string;
}

/**
 * To add a new hex type: append an entry here and add its grow cost
 * in BALANCE.growCost (config.ts). Everything else picks it up automatically.
 */
export const HEX_TYPES: Record<HexType, HexTypeDef> = {
  soil: {
    id: 'soil', label: 'Soil', emoji: '·',
    baseColor: C.soil, resource: 'none',
    yieldMin: 0, yieldMax: 0, spawnWeight: 35, claimable: true,
    description: 'Empty earth. Free to grow through.',
  },
  leaf_litter: {
    id: 'leaf_litter', label: 'Leaf Litter', emoji: '🍂',
    baseColor: C.leafLitter, resource: 'spores',
    yieldMin: 1, yieldMax: 2, spawnWeight: 25, claimable: true,
    description: 'Decomposing leaves. Generates spores.',
  },
  dead_wood: {
    id: 'dead_wood', label: 'Dead Wood', emoji: '🪵',
    baseColor: C.deadWood, resource: 'spores',
    yieldMin: 2, yieldMax: 4, spawnWeight: 15, claimable: true,
    description: 'Rich dead timber. High spore yield.',
  },
  mushroom_cap: {
    id: 'mushroom_cap', label: 'Mushroom Cap', emoji: '🍄',
    baseColor: C.mushroom, resource: 'mycoboost',
    yieldMin: 1, yieldMax: 2, spawnWeight: 8, claimable: true,
    description: 'A fruiting body. Generates Mycoboost.',
  },
  moisture: {
    id: 'moisture', label: 'Moisture Pocket', emoji: '💧',
    baseColor: C.moisture, resource: 'none',
    yieldMin: 0, yieldMax: 0, spawnWeight: 8, claimable: true,
    description: 'Damp earth. Boosts adjacent growth speed by 1.',
  },
  insect_corpse: {
    id: 'insect_corpse', label: 'Insect Corpse', emoji: '🐛',
    baseColor: C.insect, resource: 'protein',
    yieldMin: 1, yieldMax: 2, spawnWeight: 5, claimable: true,
    description: 'Dead insect matter. Generates Protein.',
  },
  root_system: {
    id: 'root_system', label: 'Root System', emoji: '🌿',
    baseColor: C.root, resource: 'symbiont',
    yieldMin: 1, yieldMax: 1, spawnWeight: 3, claimable: true,
    description: 'Ancient root network. Generates Symbiont Points.',
  },
  toxic_zone: {
    id: 'toxic_zone', label: 'Toxic Zone', emoji: '☠️',
    baseColor: C.toxicZone, resource: 'none',
    yieldMin: 0, yieldMax: 0, spawnWeight: 1, claimable: false,
    description: 'Poisonous spore cloud. Impassable without Depth Runner.',
  },
};

export const HEX_TYPE_LIST = Object.values(HEX_TYPES);

// ─── Node definitions (buildable on owned hexes) ────────────────────────────
export interface NodeDef {
  id: NodeType;
  label: string;
  emoji: string;
  description: string;
  color: number;
}

export const NODE_DEFS: Record<NodeType, NodeDef> = {
  core: {
    id: 'core', label: 'Core', emoji: '✦',
    color: C.core,
    description: 'Your mycelium core. Protect it at all costs.',
  },
  conduit: {
    id: 'conduit', label: 'Conduit', emoji: '·',
    color: C.player,
    description: 'Basic network node. Connects your hyphae.',
  },
  toxin_gland: {
    id: 'toxin_gland', label: 'Toxin Gland', emoji: '☣',
    color: C.toxinGland,
    description: 'Deals 1 damage to all adjacent enemy hexes each turn.',
  },
  chitin_wall: {
    id: 'chitin_wall', label: 'Chitin Wall', emoji: '🧱',
    color: C.chitinWall,
    description: 'Fortifies this hex: +3 HP.',
  },
  spore_cluster: {
    id: 'spore_cluster', label: 'Spore Cluster', emoji: '✴',
    color: C.sporeCluster,
    description: 'Doubles resource yield of this hex.',
  },
  sporulation_chamber: {
    id: 'sporulation_chamber', label: 'Sporulation Chamber', emoji: '⬡',
    color: C.sporoChamber,
    description: 'Generates +3 spores per turn passively.',
  },
};
