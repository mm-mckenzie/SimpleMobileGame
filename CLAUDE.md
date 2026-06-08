# MYCELIUM — Strategy Game

A mobile-first hex-grid strategy game built with Phaser 3 + TypeScript + Vite.
You control a fungal network: grow, consume resources, evolve mutations, and
eliminate rival organisms.

---

## Quick Start / Testing

```bash
npm install
npm run dev          # http://localhost:3000
                     # also exposed on your LAN IP for testing on a physical phone
```

Open in any browser. Works on desktop, tablet, and mobile (touch).

---

## Gameplay

| Action | How |
|--------|-----|
| Grow network | Tap an adjacent highlighted hex → tap "Grow Here" in panel |
| Build a node | Tap one of your hexes → Build menu appears |
| End turn | Tap "END TURN ▶" button at bottom |
| Pick mutation | Every 5 turns an Evolution panel slides up automatically |

**Win**: Own 70% of claimable hexes.  
**Lose**: Your Core node is destroyed.

---

## Addictive Mechanics

- **Evolution draft** — 3 random mutations offered every 5 turns. Weighted rarity (Common → Legendary). No repeats within a run. Creates snowballing builds.
- **12 random events** — fire every 5–9 turns (variable). Autumn Rain, Bacteria Bloom, Spore Wind, Fallen Giant, etc.
- **Enemy AI personalities** — Aggressive (rushes you), Expansive (grabs resources), Opportunist (random).
- **Difficulty scaling** — enemy income grows every 8 turns, so late-game pressure is intense.
- **Player always has something to do** — core generates 3 spores/turn guaranteed; "Rest" is implicit (just don't grow and bank spores). Map has 135 hexes, so growable hexes are always available for many turns.

---

## File Structure

```
src/
  main.ts              Phaser game bootstrap
  config.ts            ALL constants (colors, grid, balance)  ← tune here
  RNG.ts               Stateless random utilities
  GameState.ts         Singleton game state + income logic
  HexGrid.ts           Coordinate math, map generation, neighbour lookup

  data/
    hexTypes.ts        Hex type definitions + node definitions
    mutations.ts       20 mutations + MutationEffects interface
    events.ts          12 random events
    enemies.ts         3 enemy faction defs + AI weights

  scenes/
    BootScene.ts       Boot → Menu
    MenuScene.ts       Title screen, how-to-play
    GameScene.ts       Main gameplay (grow, build, turn, evolution, AI)
    GameOverScene.ts   Win/lose screen + stats
```

---

## Adding Content (Future Updates)

### New hex type
1. Add entry to `HEX_TYPES` in `src/data/hexTypes.ts`
2. Add grow cost to `BALANCE.growCost` in `src/config.ts`
3. Add base color to `C` in `src/config.ts`

### New mutation
Append to `MUTATIONS_LIST` in `src/data/mutations.ts`.
If it needs a new *flag*, add the flag to `MutationEffects` and `DEFAULT_MUTATION_EFFECTS`,
then check the flag in the relevant game-loop function in `GameScene.ts`.

### New random event
Append to `EVENTS_LIST` in `src/data/events.ts`. The `apply(ctx)` function
receives an `EventContext` with helper methods — no other files need changing.

### New node type
1. Add to `NodeType` union and `NODE_DEFS` in `src/data/hexTypes.ts`
2. Add cost to `BALANCE.nodeCost` in `src/config.ts`
3. Handle effect in `processCombat()` in `GameScene.ts`

### New enemy personality
Add to `PERSONALITY_WEIGHTS` in `src/data/enemies.ts`.

### New scene (e.g., Campaign map)
Create `src/scenes/CampaignScene.ts`, add it to the scene array in `src/main.ts`.

---

## Balance Tuning

All numbers live in `BALANCE` (src/config.ts):

| Key | Meaning |
|-----|---------|
| `winHexPercent` | Fraction of map needed to win (0.70) |
| `evolutionInterval` | Turns between evolution picks (5) |
| `difficultyRampTurns` | Turns per enemy income boost (8) |
| `difficultyRampFactor` | % income increase per ramp (0.15) |
| `growCost.*` | Spore cost per hex type |
| `nodeCost.*` | [spores, protein, mycoboost] per node |

---

## Planned Future Update Hooks

- **Campaign mode**: Pre-designed maps with story events (add `src/data/campaign.ts`)
- **Prestige / meta-progression**: `localStorage` save already tracks best score; extend for unlockable starting mutations
- **New biomes**: New map themes (forest, cave, ocean floor) — just change hex type weights in `generateMap()`
- **Multiplayer / async**: Turn state is pure data in `GS.state` — serialisable for async turns
- **Weather system**: Add persistent weather state + per-turn weather effects
- **Achievements**: Track stats in `RunStats` (already in `GameState.ts`) and display in `GameOverScene`
