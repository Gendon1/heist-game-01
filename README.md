# The Velvet Vault — A One-Room Heist

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![Rank](https://make.fun/badge/best-heist-game-20261122-0559/Gendon1/heist-game-01/rank.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![Reward](https://make.fun/badge/best-heist-game-20261122-0559/Gendon1/heist-game-01/reward.svg)](https://make.fun/c/best-heist-game-20261122-0559)

A compact top-down heist where you infiltrate a neon-lit vault room, steal the Golden Idol, and escape before the alarm maxes out. Dodge sweeping guard vision cones and rotating cameras, manage a rising alarm meter, spend coins on smoke bombs and signal jammers to buy time, pick the idol's lock, and sprint for the exit.

## How to Play

**Move:** WASD / Arrow keys or click/tap a tile to walk  
**1** — Throw smoke bomb (blocks vision temporarily)  
**2** — Activate jammer (freezes cameras briefly)  
**P** — Pause  
**Space** — Start / Restart

Collect coins scattered in the room to afford gadgets. The alarm rises when spotted; at 100% the vault locks down. Lockpick the idol (hold near it), then reach the exit door to win.

## Run It

```bash
node serve.ts          # starts on http://localhost:8080
node serve.ts --port 3000  # custom port
```

Screenshots are defined in `shots.json` — each entry has a `name` and a `query` string to append to the game URL (e.g. `http://localhost:8080/?shot=play&seed=1`).

## Files

- `game/` — client game (index.html + src/*.js, ES modules)
- `screenshots/` — captured stills (optional, copied to output on build)
- `main.ts` — build script: copies assets, writes dossier.json
- `vendor/makefun-game.ts` — make.fun dossier helper (provided by kit)