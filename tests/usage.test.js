import assert from "node:assert/strict";
import test from "node:test";

import { PRICING, SAMPLE_USAGE } from "../src/data.js";
import {
  buildExportPayload,
  filterRecords,
  sortRecords,
  summarizeRecords,
  validateImportRows
} from "../src/usage.js";

test("summarizes token totals and estimated costs", () => {
  const summary = summarizeRecords(SAMPLE_USAGE, PRICING);

  assert.equal(summary.recordCount, 5);
  assert.equal(summary.inputTokens, 95200);
  assert.equal(summary.outputTokens, 37100);
  assert.equal(summary.totalTokens, 132300);
  assert.ok(summary.estimatedCost > 0);
  assert.ok(summary.byModel["gpt-5.4"]);
});

test("filters records by model and project", () => {
  const filtered = filterRecords(SAMPLE_USAGE, {
    model: "gpt-5.4-mini",
    project: "docs",
    dateRange: "all"
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].session, "quickstart");
});

test("sorts records by total tokens descending", () => {
  const sorted = sortRecords(SAMPLE_USAGE, "tokens-desc", PRICING);
  const totals = sorted.map((record) => record.inputTokens + record.outputTokens);

  assert.deepEqual(totals, [...totals].sort((a, b) => b - a));
});

test("rejects sensitive import fields before accepting records", () => {
  const result = validateImportRows([
    {
      id: "unsafe",
      timestamp: "2026-05-14T00:00:00.000Z",
      model: "gpt-5.4",
      inputTokens: 1,
      outputTokens: 1,
      prompt: "do not store this"
    }
  ]);

  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.match(result.rejected[0].reason, /prompt/);
});

test("deduplicates imported records by id", () => {
  const result = validateImportRows([
    {
      id: "sample-001",
      timestamp: "2026-05-14T00:00:00.000Z",
      model: "gpt-5.4",
      inputTokens: 10,
      outputTokens: 10
    }
  ], SAMPLE_USAGE);

  assert.equal(result.accepted.length, 0);
  assert.equal(result.duplicates.length, 1);
});

test("exports summary without sensitive detail fields", () => {
  const payload = buildExportPayload(SAMPLE_USAGE.slice(0, 1), { model: "all" }, PRICING);
  const serialized = JSON.stringify(payload);

  assert.equal(payload.summary.recordCount, 1);
  assert.doesNotMatch(serialized, /prompt|response|apiKey|authorization|cookie/i);
});
