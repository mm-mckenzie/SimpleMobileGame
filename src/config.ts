// ─── Screen ────────────────────────────────────────────────────────────────
export const GAME_W = 390;
export const GAME_H = 844;

// ─── Hex Grid ──────────────────────────────────────────────────────────────
export const HEX_SIZE   = 22;          // circumradius (center → vertex)
export const HEX_COLS   = 9;
export const HEX_ROWS   = 15;
export const HEX_W      = Math.sqrt(3) * HEX_SIZE; // pointy-top hex width
export const HEX_H      = 2 * HEX_SIZE;             // pointy-top hex height
export const H_SPACING  = HEX_W;                    // col-to-col distance
export const V_SPACING  = HEX_SIZE * 1.5;           // row-to-row distance

// Grid origin so it's centred in game area (game area = y 64..780)
export const GRID_ORIGIN_X = (GAME_W - (HEX_COLS - 0.5) * H_SPACING) / 2 + HEX_W / 2;
export const GRID_ORIGIN_Y = 64 + (716 - ((HEX_ROWS - 1) * V_SPACING + HEX_H)) / 2 + HEX_H / 2;

// ─── UI Layout ─────────────────────────────────────────────────────────────
export const TOP_BAR_H    = 64;
export const BOTTOM_BAR_H = 64;
export const ACTION_PANEL_H = 160;

// ─── Colors ────────────────────────────────────────────────────────────────
export const C = {
  // Backgrounds
  bg:         0x0a0e1a,
  panel:      0x0d1225,
  panelLight: 0x131a30,
  border:     0x1e3060,

  // Hex base colors (hex type backgrounds)
  soil:       0x111827,
  leafLitter: 0x1a3410,
  deadWood:   0x2e1a08,
  mushroom:   0x2e1a00,
  moisture:   0x081830,
  insect:     0x1c2e0a,
  root:       0x1e1040,
  toxicZone:  0x200a28,

  // Owner overlay tints
  player:     0x00ffcc,
  enemy1:     0xff4444,
  enemy2:     0xff8800,
  enemy3:     0xaa44ff,

  // Node type accents
  core:       0x00ffee,
  toxinGland: 0xddff00,
  chitinWall: 0x8899bb,
  sporeCluster: 0x44ffaa,
  sporoChamber: 0xffaa00,

  // UI
  gold:       0xffd700,
  green:      0x00dd66,
  red:        0xff4444,
  white:      0xffffff,
  gray:       0x889aaa,
  darkGray:   0x334455,

  // Rarity
  common:     0xaaaaaa,
  rare:       0x4a9eff,
  epic:       0xb44fff,
  legendary:  0xffd700,
};

// ─── Game Balance (centralised for easy tuning / future updates) ───────────
export const BALANCE = {
  startSpores:        12,
  startProtein:       4,
  startMycoboost:     0,
  startSymbiont:      0,

  coreSporesPerTurn:  3,   // guaranteed from core each turn
  coreHp:             8,
  defaultHexHp:       2,

  growCost: {            // spore cost to claim hex by type
    soil:       2,
    leaf_litter: 2,
    dead_wood:  3,
    mushroom_cap: 3,
    moisture:   2,
    insect_corpse: 2,
    root_system: 4,
    toxic_zone: 99,      // effectively blocked without mutation
  } as Record<string, number>,

  nodeCost: {            // [spores, protein, mycoboost]
    toxin_gland:       [4, 3, 0],
    chitin_wall:       [5, 0, 0],
    spore_cluster:     [6, 0, 0],
    sporulation_chamber: [8, 2, 0],
  } as Record<string, [number, number, number]>,

  enemyGrowInterval:  1,   // enemy grows N hexes per turn
  evolutionInterval:  5,   // turns between evolution picks
  winHexPercent:      0.70, // own 70% of claimable hexes to win

  // Difficulty scaling: every N turns, enemy income multiplier increases
  difficultyRampTurns: 8,
  difficultyRampFactor: 0.15, // +15% enemy income per ramp
};

// ─── Scene Keys ────────────────────────────────────────────────────────────
export const SCENES = {
  BOOT:     'Boot',
  MENU:     'Menu',
  GAME:     'Game',
  GAMEOVER: 'GameOver',
} as const;
