// Tiny static dev server for The Velvet Vault game/ directory.
// Serves on http://127.0.0.1:8080 (or --port N), with correct MIME types,
// path traversal protection, no-store caching, and request logging.

import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import { join, resolve, extname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const gameRoot = join(__dirname, "game");
const portArg = process.argv.find((a) => a.startsWith("--port="))?.split("=")[1]
  ?? process.argv[process.argv.indexOf("--port") + 1];
const parsedPort = Number(portArg);
const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort < 65536 ? parsedPort : 8080;

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";

  const requested = resolve(gameRoot, pathname.slice(1));
  const rel = relative(gameRoot, requested);
  if (rel.startsWith("..") || rel.includes(sep + ".." + sep) || rel === "..") {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("Forbidden");
  }

  try {
    await fs.access(requested);
    const st = await fs.stat(requested);
    if (!st.isFile()) throw new Error("Not a file");

    const ext = extname(requested).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mime[ext] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    const stream = (await import("node:fs")).createReadStream(requested);
    stream.pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving ${gameRoot} at http://127.0.0.1:${port}`);
});