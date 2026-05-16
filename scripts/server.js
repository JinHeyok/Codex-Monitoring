#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || "127.0.0.1";
const usageFile = path.join(root, "data", "codex-usage.json");
const eventsFile = path.join(root, "data", "codex-events.json");
const limitsFile = path.join(root, "data", "codex-limits.json");
const clients = new Set();
const jsonCache = new Map();
let usageVersion = null;
let eventBroadcastTimer = null;

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);

  if (url.pathname === "/events") {
    openEventStream(res);
    return;
  }

  if (url.pathname === "/health") {
    sendJson(res, {
      ok: true,
      service: "codex-monitoring",
      sseClients: clients.size,
      updatedAt: new Date().toISOString()
    });
    return;
  }

  if (url.pathname === "/api/snapshot") {
    const usage = readJsonCached(usageFile, []);
    const events = readJsonCached(eventsFile, []);
    const limits = readJsonCached(limitsFile, null);
    usageVersion = `${usage.version}:${events.version}:${limits.version}`;
    sendJson(res, {
      usage: usage.data,
      events: events.data,
      limits: limits.data,
      runtime: {
        activeCodexCliCount: countActiveCodexCli()
      },
      version: `${usage.version}:${events.version}:${limits.version}`,
      updatedAt: new Date().toISOString()
    });
    return;
  }

  serveStatic(url.pathname, res);
});

server.listen(port, host, () => {
  console.log(`[codex-monitoring] serving http://${host}:${port}`);
});

fs.mkdirSync(path.dirname(usageFile), { recursive: true });
fs.watch(path.dirname(usageFile), (eventType, filename) => {
  if (
    filename === path.basename(usageFile)
    || filename === path.basename(eventsFile)
    || filename === path.basename(limitsFile)
  ) {
    scheduleUsageBroadcast();
  }
});

setInterval(() => {
  broadcast("heartbeat", { updatedAt: new Date().toISOString() });
}, 15000);

function openEventStream(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no"
  });
  res.write(": stream opened\n");
  res.write("retry: 5000\n\n");
  const usage = readJsonCached(usageFile, []);
  const events = readJsonCached(eventsFile, []);
  const limits = readJsonCached(limitsFile, null);
  usageVersion = `${usage.version}:${events.version}:${limits.version}`;
  res.write(`event: connected\ndata: ${JSON.stringify({ updatedAt: new Date().toISOString(), version: usageVersion })}\n\n`);
  clients.add(res);
  res.on("close", () => clients.delete(res));
}

function countActiveCodexCli() {
  try {
    const output = execFileSync("ps", ["-axo", "comm="], {
      encoding: "utf8",
      timeout: 1000
    });
    return output
      .split("\n")
      .filter((line) => path.basename(line.trim()) === "codex")
      .length;
  } catch {
    return 0;
  }
}

function scheduleUsageBroadcast() {
  clearTimeout(eventBroadcastTimer);
  eventBroadcastTimer = setTimeout(() => {
    const usage = readJsonCached(usageFile, []);
    const events = readJsonCached(eventsFile, []);
    const limits = readJsonCached(limitsFile, null);
    const nextVersion = `${usage.version}:${events.version}:${limits.version}`;
    if (nextVersion === usageVersion) return;
    usageVersion = nextVersion;
    broadcast("usage-updated", {
      updatedAt: new Date().toISOString(),
      version: usageVersion
    });
  }, 250);
}

function broadcast(event, payload) {
  for (const client of clients) {
    client.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  }
}

function serveStatic(pathname, res) {
  const cleanPath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(root, cleanPath));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function sendJson(res, payload) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(payload));
}

function readJsonCached(filePath, fallback) {
  try {
    const stat = fs.statSync(filePath);
    const version = `${stat.mtimeMs}:${stat.size}`;
    const cached = jsonCache.get(filePath);
    if (cached?.version === version) return cached;

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const next = {
      version,
      data: Array.isArray(fallback) ? (Array.isArray(data) ? data : fallback) : (data ?? fallback)
    };
    jsonCache.set(filePath, next);
    return next;
  } catch {
    const empty = { version: "missing:0", data: fallback };
    jsonCache.set(filePath, empty);
    return empty;
  }
}
