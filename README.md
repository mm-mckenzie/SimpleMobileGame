# MYCELIUM 🍄

> **Grow. Consume. Evolve.**  
> A mobile-first hex-grid fungal strategy game.

---

## ▶ Play now

**[https://mm-mckenzie.github.io/SimpleMobileGame/](https://mm-mckenzie.github.io/SimpleMobileGame/)**

Works in any browser. On mobile, tap **Share → Add to Home Screen** to install it like a real app.

---

## How to play

| Action | How |
|--------|-----|
| Grow network | Tap an adjacent glowing hex → tap **Grow Here** |
| Build a node | Tap one of your hexes → pick from the build menu |
| End turn | Tap **END TURN ▶** at the bottom |
| Pick mutation | Evolution panel slides up automatically every 5 turns |

**Win:** Own 70% of the forest floor  
**Lose:** Your Core node is destroyed

---

## Local development

```bash
npm install
npm run dev     # http://localhost:3000 (also on LAN for phone testing)
```

```bash
npm run build   # production build → dist/
```

---

## Adding content

See [CLAUDE.md](CLAUDE.md) for the full guide on adding hex types, mutations, events, nodes, and enemy personalities — all data-driven, no engine changes needed.

---

## Stack

Phaser 3 · TypeScript · Vite · Zero external assets
