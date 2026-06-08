# MYCELIUM 🍄

> **Grow. Consume. Evolve.**  
> A mobile-first hex-grid fungal strategy game.

---

## Play it on your phone (easiest way)

### Option A — GitHub Pages (permanent link, works on any device)

1. Push this repo to GitHub (if you haven't yet)
2. In your repo → **Settings → Pages → Source → GitHub Actions**
3. The game auto-deploys on every push
4. Your URL will be: `https://<your-username>.github.io/SimpleMobileGame/`
5. Open that URL on your phone — tap **Share → Add to Home Screen** to install it like a real app

### Option B — Netlify Drop (30 seconds, no account needed)

1. Run `npm run build` locally
2. Go to **[netlify.com/drop](https://app.netlify.com/drop)**
3. Drag your `dist/` folder onto the page
4. Netlify gives you a public URL instantly — share it with anyone

### Option C — Same WiFi (instant, no deploy needed)

1. Run `npm run dev` on your computer
2. The terminal prints a **Network URL** like `http://192.168.x.x:3000`
3. Type that into your phone browser (same WiFi required)
4. Tap **Share → Add to Home Screen** to install

---

## Local development

```bash
npm install
npm run dev     # opens at http://localhost:3000
                # also exposed on your LAN for phone testing
```

## Build

```bash
npm run build   # outputs to dist/
```

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

## Adding content

See [CLAUDE.md](CLAUDE.md) for the full guide on adding hex types, mutations, events, nodes, and enemy personalities — all data-driven, no engine changes needed.

---

## Stack

Phaser 3 · TypeScript · Vite · Zero external assets
