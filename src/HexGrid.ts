/**
 * Hex grid utilities: coordinate math, map generation, neighbour logic.
 * Uses pointy-top offset coordinates (odd-r offset).
 */

import { HEX_SIZE, H_SPACING, V_SPACING, GRID_ORIGIN_X, GRID_ORIGIN_Y, HEX_COLS, HEX_ROWS, BALANCE } from './config';
import { HexType, HEX_TYPE_LIST, HexCell } from './data/hexTypes';
import { GS } from './GameState';
import { RNG } from './RNG';
import { ENEMY_FACTIONS } from './data/enemies';

// ─── Coordinate conversions ─────────────────────────────────────────────────

export function hexToPixel(col: number, row: number): { x: number; y: number } {
  return {
    x: GRID_ORIGIN_X + col * H_SPACING + (row % 2) * (H_SPACING / 2),
    y: GRID_ORIGIN_Y + row * V_SPACING,
  };
}

export function pixelToHex(px: number, py: number): { col: number; row: number } | null {
  // Try nearby rows/cols and find the closest centre
  const approxRow = (py - GRID_ORIGIN_Y) / V_SPACING;
  let best: { col: number; row: number } | null = null;
  let bestDist = HEX_SIZE * 1.15; // slightly generous hit target

  for (const row of [Math.floor(approxRow) - 1, Math.floor(approxRow), Math.ceil(approxRow), Math.ceil(approxRow) + 1]) {
    if (row < 0 || row >= HEX_ROWS) continue;
    const offset = (row % 2) * (H_SPACING / 2);
    const approxCol = (px - GRID_ORIGIN_X - offset) / H_SPACING;
    for (const col of [Math.floor(approxCol) - 1, Math.floor(approxCol), Math.ceil(approxCol), Math.ceil(approxCol) + 1]) {
      if (col < 0 || col >= HEX_COLS) continue;
      const { x, y } = hexToPixel(col, row);
      const d = Math.hypot(px - x, py - y);
      if (d < bestDist) { bestDist = d; best = { col, row }; }
    }
  }
  return best;
}

// ─── Neighbour offsets (odd-r offset, pointy-top) ────────────────────────────

const EVEN_ROW_DIRS = [
  { dc: -1, dr: -1 }, { dc: 0, dr: -1 },
  { dc:  1, dr:  0 },
  { dc:  0, dr:  1 }, { dc: -1, dr:  1 },
  { dc: -1, dr:  0 },
];
const ODD_ROW_DIRS = [
  { dc: 0, dr: -1 }, { dc:  1, dr: -1 },
  { dc: 1, dr:  0 },
  { dc: 1, dr:  1 }, { dc:  0, dr:  1 },
  { dc: -1, dr:  0 },
];

export function getNeighbours(col: number, row: number): { col: number; row: number }[] {
  const dirs = row % 2 === 0 ? EVEN_ROW_DIRS : ODD_ROW_DIRS;
  return dirs
    .map(({ dc, dr }) => ({ col: col + dc, row: row + dr }))
    .filter(({ col: c, row: r }) => c >= 0 && c < HEX_COLS && r >= 0 && r < HEX_ROWS);
}

/** Manhattan-like distance in offset-hex space (approximation). */
export function hexDist(c1: number, r1: number, c2: number, r2: number): number {
  const dx = c2 - c1;
  const dy = r2 - r1;
  return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dx + dy));
}

// ─── Map Generation ─────────────────────────────────────────────────────────

function pickHexType(): HexType {
  const candidates = HEX_TYPE_LIST.map(d => ({ value: d.id, weight: d.spawnWeight }));
  return RNG.weighted(candidates) as HexType;
}

function makeHex(col: number, row: number, type?: HexType): HexCell {
  const t = type ?? pickHexType();
  const def = HEX_TYPE_LIST.find(d => d.id === t)!;
  const yld  = def.yieldMin === def.yieldMax
    ? def.yieldMin
    : RNG.int(def.yieldMin, def.yieldMax);
  return {
    col, row,
    type: t,
    yield: yld,
    owner: null,
    nodeType: null,
    hp: BALANCE.defaultHexHp,
    maxHp: BALANCE.defaultHexHp,
  };
}

/**
 * Generate the full hex map and seed enemy/player starting positions.
 * Called once per run from GameScene.
 */
export function generateMap(
  enemyCount: 2 | 3,
): void {
  const s = GS.state;
  s.hexes.clear();

  // ── Build grid ────────────────────────────────────────────────────────────
  for (let row = 0; row < HEX_ROWS; row++) {
    for (let col = 0; col < HEX_COLS; col++) {
      const h = makeHex(col, row);
      s.hexes.set(GS.key(col, row), h);
    }
  }

  // ── Player core (bottom-centre) ──────────────────────────────────────────
  const pc = s.playerCore;
  const coreHex = s.hexes.get(GS.key(pc.col, pc.row))!;
  coreHex.type    = 'soil';
  coreHex.owner   = 'player';
  coreHex.nodeType = 'core';
  coreHex.hp = coreHex.maxHp = BALANCE.coreHp;

  // Give player 2 starter hexes adjacent to core
  const starters = getNeighbours(pc.col, pc.row).slice(0, 2);
  for (const nb of starters) {
    const h = s.hexes.get(GS.key(nb.col, nb.row))!;
    h.owner = 'player';
    h.nodeType = 'conduit';
  }

  // ── Enemy cores (scattered in top area) ──────────────────────────────────
  const enemyPositions: { col: number; row: number }[] = [
    { col: 1,  row: 1  },
    { col: 7,  row: 1  },
    { col: 4,  row: 2  },
  ].slice(0, enemyCount);

  s.enemies = [];
  for (let i = 0; i < enemyCount; i++) {
    const pos  = enemyPositions[i];
    const fdef = ENEMY_FACTIONS[i];
    const h = s.hexes.get(GS.key(pos.col, pos.row))!;
    h.type     = 'soil';
    h.owner    = fdef.id;
    h.nodeType = 'core';
    h.hp = h.maxHp = BALANCE.coreHp;

    // One adjacent starter hex for enemy too
    const enb = getNeighbours(pos.col, pos.row)[0];
    if (enb) {
      const eh = s.hexes.get(GS.key(enb.col, enb.row))!;
      eh.owner = fdef.id;
      eh.nodeType = 'conduit';
    }

    s.enemies.push({
      id: fdef.id,
      coreCol: pos.col,
      coreRow: pos.row,
      spores: 8,
      sporeIncome: fdef.baseSporeIncome,
      slowed: false,
      alive: true,
      hexCount: 2,
      nextGrowTarget: null,
    });
  }
}

/** All hexes adjacent to the given owner's network that are unowned (and growable). */
export function getBorderHexes(owner: string): { col: number; row: number }[] {
  const owned = new Set<string>();
  for (const [k, h] of GS.state.hexes) {
    if (h.owner === owner) owned.add(k);
  }
  const border = new Map<string, { col: number; row: number }>();
  for (const k of owned) {
    const h = GS.state.hexes.get(k)!;
    for (const nb of getNeighbours(h.col, h.row)) {
      const nk  = GS.key(nb.col, nb.row);
      const nh  = GS.state.hexes.get(nk);
      if (nh && !nh.owner && !border.has(nk)) {
        border.set(nk, nb);
      }
    }
  }
  return [...border.values()];
}

/** Hexes the player can grow to right now (adjacent, affordable, correct type). */
export function getGrowableHexes(): { col: number; row: number }[] {
  const fx = GS.state.mutationEffects;
  return getBorderHexes('player').filter(nb => {
    const h = GS.state.hexes.get(GS.key(nb.col, nb.row));
    if (!h) return false;
    if (h.type === 'toxic_zone' && !fx.canGrowThroughToxic) return false;
    return GS.growCost(nb.col, nb.row) <= GS.state.resources.spores;
  });
}

/** Hex vertices for drawing a pointy-top hexagon. */
export function hexVertices(cx: number, cy: number, size: number = HEX_SIZE): { x: number; y: number }[] {
  const verts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    verts.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
  }
  return verts;
}
