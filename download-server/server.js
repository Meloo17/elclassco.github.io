import "dotenv/config";
import http from "node:http";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const DOWNLOAD_DIR = path.resolve(process.env.DOWNLOAD_DIR || path.join(here, "downloads"));
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://127.0.0.1:5500";
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const MANIFEST_PATH = path.join(here, "manifest.json");
const downloadTickets = new Map();

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(body));
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && origin === CORS_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Range");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, Content-Disposition");
  }
}

function readManifest() {
  const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  if (!Array.isArray(raw.games)) throw new Error("manifest.json must contain a games array");
  return raw.games.filter(game =>
    game &&
    typeof game.id === "string" &&
    /^[a-z0-9][a-z0-9-]{0,79}$/i.test(game.id) &&
    typeof game.title === "string" &&
    typeof game.filename === "string" &&
    path.basename(game.filename) === game.filename
  );
}

async function authenticate(req) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, reason: "Supabase Auth is not configured on the download server." };
  }
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { ok: false, reason: "Sign in to EL CLASSCO before downloading." };

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return { ok: false, reason: "Your session is invalid or expired. Sign in again." };
    const user = await response.json();
    return user?.id ? { ok: true, user } : { ok: false, reason: "Could not verify the signed-in user." };
  } catch {
    return { ok: false, reason: "Could not verify your EL CLASSCO session. Try again." };
  }
}

function parseRange(header, size) {
  if (!header) return null;
  const downloadPath = "/downloads/";
  const downloadId = url.pathname.startsWith(downloadPath) ? url.pathname.slice(downloadPath.length) : "";
  const downloadPath = "/downloads/";
  const downloadId = url.pathname.startsWith(downloadPath) ? url.pathname.slice(downloadPath.length) : "";
  const match = /^[a-z0-9][a-z0-9-]{0,79}$/i.test(downloadId) ? [url.pathname, downloadId] : null;
  if (!match || (!match[1] && !match[2])) return { invalid: true };
  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return { invalid: true };
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) {
    return { invalid: true };
  }
  return { start, end: Math.min(end, size - 1) };
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/health" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, service: "EL CLASSCO download server" });
  }

  if (url.pathname === "/api/games" && req.method === "GET") {
    try {
      const games = readManifest().map(game => {
        const fullPath = path.join(DOWNLOAD_DIR, game.filename);
        const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
        return {
          id: game.id,
          title: game.title,
          description: game.description || "",
          filename: game.filename,
          sizeBytes: exists ? fs.statSync(fullPath).size : null,
          available: exists
        };
      });
      return sendJson(res, 200, { games });
    } catch {
      return sendJson(res, 500, { error: "Could not read download manifest." });
    }
  }

  const ticketPath = "/api/download-ticket/";
  const ticketId = url.pathname.startsWith(ticketPath) ? url.pathname.slice(ticketPath.length) : "";
  const ticketRoute = /^[a-z0-9][a-z0-9-]{0,79}$/i.test(ticketId) ? [url.pathname, ticketId] : null;
  if (ticketRoute && req.method === "GET") {
    const auth = await authenticate(req);
    if (!auth.ok) return sendJson(res, 401, { error: auth.reason });
    let game;
    try {
      game = readManifest().find(item => item.id === ticketRoute[1]);
    } catch {
      return sendJson(res, 500, { error: "Could not read download manifest." });
    }
    if (!game) return sendJson(res, 404, { error: "This file is not in the authorized manifest." });
    const fullPath = path.resolve(DOWNLOAD_DIR, game.filename);
    if (!fullPath.startsWith(DOWNLOAD_DIR + path.sep)) return sendJson(res, 400, { error: "Invalid file path." });
    try {
      if (!fs.statSync(fullPath).isFile()) throw new Error("not a file");
    } catch {
      return sendJson(res, 404, { error: "File not uploaded yet." });
    }
    const ticket = randomBytes(32).toString("hex");
    downloadTickets.set(ticket, { gameId: game.id, userId: auth.user.id, expiresAt: Date.now() + 10 * 60 * 1000, uses: 0 });
    return sendJson(res, 200, { ticket, expiresInSeconds: 600 });
  }

  const downloadPath = "/downloads/";
  const downloadId = url.pathname.startsWith(downloadPath) ? url.pathname.slice(downloadPath.length) : "";
  const match = /^[a-z0-9][a-z0-9-]{0,79}$/i.test(downloadId) ? [url.pathname, downloadId] : null;
  if (match && (req.method === "GET" || req.method === "HEAD")) {
    let game;
    try {
      game = readManifest().find(item => item.id === match[1]);
    } catch {
      return sendJson(res, 500, { error: "Could not read download manifest." });
    }
    if (!game) return sendJson(res, 404, { error: "This file is not in the authorized manifest." });
    const ticket = url.searchParams.get("ticket") || "";
    const ticketData = downloadTickets.get(ticket);
    if (!ticketData || ticketData.gameId !== game.id || ticketData.expiresAt < Date.now() || ticketData.uses >= 100) {
      if (ticketData && (ticketData.expiresAt < Date.now() || ticketData.uses >= 100)) downloadTickets.delete(ticket);
      return sendJson(res, 401, { error: "Download link expired. Request a new link from EL CLASSCO." });
    }
    ticketData.uses += 1;
    const fullPath = path.resolve(DOWNLOAD_DIR, game.filename);
    if (!fullPath.startsWith(DOWNLOAD_DIR + path.sep)) return sendJson(res, 400, { error: "Invalid file path." });
    let stat;
    try {
      stat = fs.statSync(fullPath);
      if (!stat.isFile()) throw new Error("not a file");
    } catch {
      return sendJson(res, 404, { error: "File not uploaded yet." });
    }

    const range = parseRange(req.headers.range, stat.size);
    if (range?.invalid) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}`, "Cache-Control": "no-store" });
      return res.end();
    }

    const start = range ? range.start : 0;
    const end = range ? range.end : stat.size - 1;
    const headers = {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(game.filename))}`,
      "Content-Length": Math.max(0, end - start + 1),
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store"
    };
    if (range) headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
    res.writeHead(range ? 206 : 200, headers);
    if (req.method === "HEAD") return res.end();

    const stream = fs.createReadStream(fullPath, { start, end });
    stream.on("error", () => {
      if (!res.headersSent) sendJson(res, 500, { error: "File transfer failed." });
      else res.destroy();
    });
    stream.pipe(res);
    return;
  }

  sendJson(res, 404, { error: "Not found." });
});

server.listen(PORT, HOST, () => {
  console.log(`EL CLASSCO download server listening at http://${HOST}:${PORT}`);
  console.log(`Download folder: ${DOWNLOAD_DIR}`);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase Auth is not configured. Protected downloads will return 401 until configured.");
  }
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
