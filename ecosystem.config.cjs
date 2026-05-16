module.exports = {
  apps: [
    {
      name: "codex-usage-sync",
      script: "node",
      args: "scripts/sync-codex-usage.js --watch",
      cwd: __dirname,
      interpreter: "none",
      watch: false,
    },
    {
      name: "codex-limits-sync",
      script: "node",
      args: "scripts/sync-codex-limits.js --watch",
      cwd: __dirname,
      interpreter: "none",
      watch: false,
    },
    {
      name: "codex-monitoring",
      script: "node",
      args: "scripts/server.js",
      cwd: __dirname,
      interpreter: "none",
      env: {
        HOST: "127.0.0.1",
        PORT: "4000",
      },
      watch: false,
    },
  ],
};
