#!/usr/bin/env node
import { spawn } from "node:child_process";

const child = spawn("codex", ["app-server", "--listen", "stdio://"], {
  stdio: ["pipe", "pipe", "pipe"]
});

let buffer = "";
let initialized = false;

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
      send({ jsonrpc: "2.0", id: "limits", method: "account/rateLimits/read" });
      return;
    }

    if (message.id === "limits") {
      console.log(JSON.stringify(message.result || message.error || message, null, 2));
      child.stdin.end();
      child.kill("SIGTERM");
    }
  }
});

child.stderr.on("data", (chunk) => {
  if (!chunk.includes("could not update PATH")) {
    process.stderr.write(chunk);
  }
});

child.on("exit", (code) => {
  if (!initialized && code !== 0) process.exit(code || 1);
});

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

send({
  jsonrpc: "2.0",
  id: "init",
  method: "initialize",
  params: {
    clientInfo: { name: "codex-monitoring", version: "0.1.0" },
    apiVersion: "v2"
  }
});

setTimeout(() => {
  if (!initialized) {
    child.stdin.end();
    child.kill("SIGTERM");
    process.exit(1);
  }
}, 15000);
