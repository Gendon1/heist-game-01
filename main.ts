// Build script for The Velvet Vault — copies game assets and screenshots to output,
// then generates dossier.json via buildDossier from the make.fun vendor module.

import { copyFile, cp, mkdir, readdir, stat } from "node:fs/promises";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const outDir = process.env.MAKEFUN_OUTPUT_DIR ? resolve(process.env.MAKEFUN_OUTPUT_DIR) : "/output";
const gameSrc = join(__dirname, "game");
const shotsSrc = join(__dirname, "screenshots");
const shotsDst = join(outDir, "screenshots");

await mkdir(outDir, { recursive: true });
await cp(gameSrc, join(outDir, "game"), { recursive: true });

try {
  await mkdir(shotsDst, { recursive: true });
  for (const file of await readdir(shotsSrc)) {
    await copyFile(join(shotsSrc, file), join(shotsDst, file));
  }
} catch {
  // screenshots/ is optional
}

writeFileSync(join(outDir, "dossier.json"), buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
}));

function countFiles(dir: string): number {
  let count = 0;
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        count += countFiles(full);
      } else {
        count++;
      }
    }
  } catch {
  }
  return count;
}
const gameFiles = countFiles(join(outDir, "game"));
const shotFiles = countFiles(join(outDir, "screenshots"));
const dossierBytes = statSync(join(outDir, "dossier.json")).size;
console.log(`Handed in: ${gameFiles} game files + ${shotFiles} screenshots, dossier.json ${dossierBytes} bytes -> ${outDir}`);