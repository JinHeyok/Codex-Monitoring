#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const outputFile = process.env.CODEX_LIMITS_OUTPUT || path.join(repoRoot, "data", "codex-limits.json");
const watch = process.argv.includes("--watch");
const intervalMs = Number(process.env.CODEX_LIMITS_SYNC_INTERVAL_MS || 30 * 1000);

await syncOnce();

if (watch) {
  setTimeout(syncLoop, intervalMs);
}

async function syncLoop() {
  try {
    await syncOnce();
  } catch (error) {
      console.error(`[codex-limits-sync] ${error.message}`);
  } finally {
    setTimeout(syncLoop, intervalMs);
  }
}

async function syncOnce() {
  const response = await readRateLimits();
  const limits = normalizeLimits(response);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  const tempFile = `${outputFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(limits, null, 2));
  fs.renameSync(tempFile, outputFile);
  console.log(`[codex-limits-sync] wrote Codex rate limit snapshot to ${outputFile}`);
}

function readRateLimits() {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", ["app-server", "--listen", "stdio://"], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let buffer = "";
    let initialized = false;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Timed out while reading Codex rate limits"));
    }, 20000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (!line) continue;

        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }

        if (message.id === "init" && !initialized) {
          initialized = true;
          send(child, { jsonrpc: "2.0", id: "limits", method: "account/rateLimits/read" });
          continue;
        }

        if (message.id === "limits") {
          clearTimeout(timer);
          child.stdin.end();
          child.kill("SIGTERM");
          if (message.error) reject(new Error(message.error.message || "Codex rate limit read failed"));
          else resolve(message.result);
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      if (!text.includes("could not update PATH")) process.stderr.write(text);
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    send(child, {
      jsonrpc: "2.0",
      id: "init",
      method: "initialize",
      params: {
        clientInfo: { name: "codex-monitoring", version: "0.1.0" },
        apiVersion: "v2"
      }
    });
  });
}

function send(child, message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function normalizeLimits(response) {
  const snapshot = response?.rateLimitsByLimitId?.codex || response?.rateLimits || null;
  return {
    source: "codex-app-server",
    capturedAt: new Date().toISOString(),
    limitId: snapshot?.limitId || "codex",
    planType: snapshot?.planType || null,
    credits: snapshot?.credits
      ? {
          hasCredits: Boolean(snapshot.credits.hasCredits),
          unlimited: Boolean(snapshot.credits.unlimited),
          balance: snapshot.credits.balance ?? null
        }
      : null,
    primary: normalizeWindow(snapshot?.primary),
    secondary: normalizeWindow(snapshot?.secondary)
  };
}

function normalizeWindow(window) {
  if (!window) return null;
  return {
    usedPercent: Number(window.usedPercent || 0),
    windowDurationMins: Number(window.windowDurationMins || 0),
    resetsAt: Number(window.resetsAt || 0)
  };
}
