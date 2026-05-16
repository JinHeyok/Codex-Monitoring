export const PRICING = {
  default: {
    key: "default",
    label: "Default estimate: $1.25 input / $10.00 output per 1M tokens",
    inputPerMillion: 1.25,
    outputPerMillion: 10,
    currency: "USD"
  },
  economy: {
    key: "economy",
    label: "Economy estimate: $0.25 input / $2.00 output per 1M tokens",
    inputPerMillion: 0.25,
    outputPerMillion: 2,
    currency: "USD"
  }
};

export const SAMPLE_USAGE = [
  {
    id: "sample-001",
    timestamp: "2026-05-01T09:30:00.000Z",
    model: "gpt-5.4",
    inputTokens: 18700,
    outputTokens: 6200,
    project: "codex-monitoring",
    session: "dashboard-foundation",
    source: "sample",
    pricingKey: "default"
  },
  {
    id: "sample-002",
    timestamp: "2026-05-03T14:10:00.000Z",
    model: "gpt-5.4-mini",
    inputTokens: 9200,
    outputTokens: 3100,
    project: "codex-monitoring",
    session: "spec-writing",
    source: "sample",
    pricingKey: "economy"
  },
  {
    id: "sample-003",
    timestamp: "2026-05-06T11:45:00.000Z",
    model: "gpt-5.4",
    inputTokens: 26400,
    outputTokens: 10400,
    project: "analytics-prototype",
    session: "chart-layout",
    source: "sample",
    pricingKey: "default"
  },
  {
    id: "sample-004",
    timestamp: "2026-05-10T16:20:00.000Z",
    model: "gpt-5.3-codex",
    inputTokens: 33100,
    outputTokens: 14800,
    project: "analytics-prototype",
    session: "import-safety",
    source: "sample",
    pricingKey: "default"
  },
  {
    id: "sample-005",
    timestamp: "2026-05-13T08:05:00.000Z",
    model: "gpt-5.4-mini",
    inputTokens: 7800,
    outputTokens: 2600,
    project: "docs",
    session: "quickstart",
    source: "sample",
    pricingKey: "economy"
  }
];
