#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const codexHome = process.env.CODEX_HOME || path.join(process.env.HOME || "", ".codex");
const sessionsDir = process.env.CODEX_SESSIONS_DIR || path.join(codexHome, "sessions");
const outputFile = process.env.CODEX_USAGE_OUTPUT || path.join(repoRoot, "data", "codex-usage.json");
const eventsOutputFile = process.env.CODEX_EVENTS_OUTPUT || path.join(repoRoot, "data", "codex-events.json");
const watch = process.argv.includes("--watch");
const intervalMs = Number(process.env.CODEX_USAGE_SYNC_INTERVAL_MS || 30000);
const maxBytes = Number(process.env.CODEX_USAGE_MAX_BYTES || 5 * 1024 * 1024);
const retentionDays = Number(process.env.CODEX_USAGE_RETENTION_DAYS || 30);
const defaultContextWindow = Number(process.env.CODEX_DEFAULT_CONTEXT_WINDOW || 258400);

const sensitiveKeys = new Set(["content", "message", "prompt", "response", "encrypted_content"]);

await syncOnce();

if (watch) {
  setInterval(() => {
    syncOnce().catch((error) => {
      console.error(`[codex-usage-sync] ${error.message}`);
    });
  }, intervalMs);
}

async function syncOnce() {
  const files = listJsonlFiles(sessionsDir);
  const records = [];
  const events = [];

  for (const file of files) {
    const sessionData = await parseSessionFile(file);
    records.push(...sessionData.records);
    events.push(...sessionData.events);
  }

  records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  const pruned = pruneIfNeeded(records);
  const tempFile = `${outputFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(pruned.records, null, 2));
  fs.renameSync(tempFile, outputFile);
  const eventTempFile = `${eventsOutputFile}.tmp`;
  fs.writeFileSync(eventTempFile, JSON.stringify(pruneEvents(events, pruned.records), null, 2));
  fs.renameSync(eventTempFile, eventsOutputFile);
  const note = pruned.removed
    ? `, pruned ${pruned.removed} records older than ${retentionDays} days`
    : "";
  console.log(`[codex-usage-sync] wrote ${pruned.records.length} records to ${outputFile}${note}`);
}

function listJsonlFiles(root) {
  if (!fs.existsSync(root)) return [];
  const results = [];
  const stack = [root];

  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      if (entry.isFile() && entry.name.endsWith(".jsonl")) results.push(fullPath);
    }
  }

  return results;
}

async function parseSessionFile(file) {
  const records = [];
  const events = [];
  const session = {
    id: path.basename(file, ".jsonl"),
    timestamp: null,
    cwd: null,
    model: null,
    contextWindow: 0
  };

  const input = fs.createReadStream(file, { encoding: "utf8" });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });

  for await (const line of lines) {
    if (!line) continue;

    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    const payload = event.payload || {};
    if (payload.type === "session_meta") {
      session.timestamp = payload.timestamp || event.timestamp || session.timestamp;
      session.cwd = payload.cwd || session.cwd;
    }

    if (event.type === "turn_context") {
      session.cwd = payload.cwd || session.cwd;
      session.model = payload.model || session.model;
      session.contextWindow = Number(payload.model_context_window || session.contextWindow || 0);
    }

    if (payload.model_context_window) {
      session.contextWindow = Number(payload.model_context_window || session.contextWindow || 0);
    }

    if (payload.type === "token_count" && payload.info?.last_token_usage) {
      assertNoSensitivePayload(payload.info.last_token_usage);
      const record = toUsageRecord(event.timestamp, payload.info, session);
      records.push(record);
      events.push(toApiEvent(record));
      continue;
    }

    if (event.type === "response_item" && (payload.type === "function_call" || payload.type === "custom_tool_call")) {
      events.push(toToolEvent(event.timestamp, payload, session));
      continue;
    }

    if (event.type === "event_msg" && payload.type === "task_complete") {
      events.push(toTaskCompleteEvent(event.timestamp, payload, session));
    }
  }

  return { records, events };
}

function toUsageRecord(timestamp, info, session) {
  const usage = info.last_token_usage || {};
  const safeTimestamp = timestamp || session.timestamp || new Date().toISOString();
  const total = Number(usage.total_tokens || 0);
  const input = Number(usage.input_tokens || 0);
  const output = Number(usage.output_tokens || 0);
  const cached = Number(usage.cached_input_tokens || 0);
  const reasoning = Number(usage.reasoning_output_tokens || 0);
  const cumulative = Number(info.total_token_usage?.total_tokens || total);
  const contextWindow = Number(info.model_context_window || session.contextWindow || 0);
  const sessionLabel = shortSession(session.id);

  return {
    id: `${session.id}-${safeTimestamp}`,
    timestamp: new Date(safeTimestamp).toISOString(),
    model: session.model || "codex",
    inputTokens: input,
    outputTokens: output,
    project: projectFromCwd(session.cwd),
    session: sessionLabel,
    source: "codex-local-session",
    pricingKey: "default",
    cachedInputTokens: cached,
    reasoningOutputTokens: reasoning,
    totalTokens: total,
    cumulativeTotalTokens: cumulative,
    contextWindow: contextWindow || defaultContextWindow
  };
}

function toApiEvent(record) {
  return {
    id: `event-${record.id}`,
    timestamp: record.timestamp,
    eventName: "api_request",
    eventLabel: "API 요청",
    model: record.model,
    project: record.project,
    session: record.session,
    costUsd: 0,
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    durationMs: 0,
    toolName: ""
  };
}

function toToolEvent(timestamp, payload, session) {
  const safeTimestamp = timestamp || session.timestamp || new Date().toISOString();
  return {
    id: `tool-${session.id}-${safeTimestamp}-${payload.call_id || payload.name || "unknown"}`,
    timestamp: new Date(safeTimestamp).toISOString(),
    eventName: "tool_result",
    eventLabel: "도구 실행",
    model: session.model || "codex",
    project: projectFromCwd(session.cwd),
    session: shortSession(session.id),
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    durationMs: 0,
    toolName: String(payload.name || payload.type || "unknown")
  };
}

function toTaskCompleteEvent(timestamp, payload, session) {
  const safeTimestamp = payload.completed_at || timestamp || session.timestamp || new Date().toISOString();
  return {
    id: `complete-${session.id}-${safeTimestamp}`,
    timestamp: new Date(safeTimestamp).toISOString(),
    eventName: "task_complete",
    eventLabel: "작업 완료",
    model: session.model || "codex",
    project: projectFromCwd(session.cwd),
    session: shortSession(session.id),
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    durationMs: Number(payload.duration_ms || 0),
    toolName: ""
  };
}

function projectFromCwd(cwd) {
  if (!cwd) return "Codex";
  return path.basename(cwd) || "Codex";
}

function shortSession(id) {
  return id.replace(/^rollout-/, "").slice(0, 32);
}

function assertNoSensitivePayload(value) {
  for (const key of Object.keys(value || {})) {
    if (sensitiveKeys.has(key)) {
      throw new Error(`Refusing to process sensitive token usage field: ${key}`);
    }
  }
}

function pruneIfNeeded(records) {
  const serialized = JSON.stringify(records, null, 2);
  if (Buffer.byteLength(serialized) <= maxBytes) {
    return { records, removed: 0 };
  }

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const filtered = records.filter((record) => {
    const time = new Date(record.timestamp).getTime();
    return Number.isFinite(time) && time >= cutoff;
  });

  return {
    records: filtered,
    removed: records.length - filtered.length
  };
}

function pruneEvents(events, records) {
  if (!records.length) return events;
  const oldest = Math.min(...records.map((record) => new Date(record.timestamp).getTime()).filter(Number.isFinite));
  if (!Number.isFinite(oldest)) return events;
  return events.filter((event) => {
    const time = new Date(event.timestamp).getTime();
    return Number.isFinite(time) && time >= oldest;
  });
}

export { pruneIfNeeded };
