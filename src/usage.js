export const ALLOWED_FIELDS = new Set([
  "id",
  "timestamp",
  "model",
  "inputTokens",
  "outputTokens",
  "project",
  "session",
  "source",
  "pricingKey",
  "cachedInputTokens",
  "reasoningOutputTokens",
  "totalTokens",
  "cumulativeTotalTokens",
  "contextWindow"
]);

export const SENSITIVE_FIELD_PATTERNS = [
  /api.?key/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /prompt/i,
  /response/i,
  /message/i,
  /conversation/i,
  /email/i,
  /phone/i,
  /customer/i,
  /host/i,
  /\bip\b/i,
  /vpn/i,
  /internal.?url/i
];

const numberFormatter = new Intl.NumberFormat("en-US");
const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4
});

export function formatTokens(value) {
  return numberFormatter.format(Math.round(value || 0));
}

export function formatMoney(value, currency = "USD") {
  if (currency !== "USD") {
    return `${currency} ${Number(value || 0).toFixed(4)}`;
  }
  return moneyFormatter.format(Number(value || 0));
}

export function hasSensitiveField(record) {
  return Object.keys(record || {}).find((key) => {
    if (ALLOWED_FIELDS.has(key)) return false;
    return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key)) || !ALLOWED_FIELDS.has(key);
  });
}

export function normalizeRecord(record) {
  const timestamp = new Date(record.timestamp);
  const inputTokens = Number(record.inputTokens);
  const outputTokens = Number(record.outputTokens);

  if (!record.id || typeof record.id !== "string") {
    throw new Error("문자열 id가 없습니다");
  }
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("timestamp가 올바르지 않습니다");
  }
  if (!Number.isInteger(inputTokens) || inputTokens < 0) {
    throw new Error("inputTokens는 0 이상의 정수여야 합니다");
  }
  if (!Number.isInteger(outputTokens) || outputTokens < 0) {
    throw new Error("outputTokens는 0 이상의 정수여야 합니다");
  }

  return {
    id: record.id,
    timestamp: timestamp.toISOString(),
    model: String(record.model || "Unknown model"),
    inputTokens,
    outputTokens,
    project: String(record.project || "Unlabeled"),
    session: String(record.session || "Unlabeled"),
    source: String(record.source || "import"),
    pricingKey: String(record.pricingKey || "default"),
    cachedInputTokens: optionalNumber(record.cachedInputTokens),
    reasoningOutputTokens: optionalNumber(record.reasoningOutputTokens),
    totalTokens: optionalNumber(record.totalTokens),
    cumulativeTotalTokens: optionalNumber(record.cumulativeTotalTokens),
    contextWindow: optionalNumber(record.contextWindow)
  };
}

function optionalNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export function estimateCost(record, pricing) {
  const basis = pricing[record.pricingKey] || pricing.default;
  if (!basis) return { amount: 0, currency: "USD", label: "사용 가능한 가격 기준 없음" };

  const inputCost = (record.inputTokens / 1_000_000) * basis.inputPerMillion;
  const outputCost = (record.outputTokens / 1_000_000) * basis.outputPerMillion;

  return {
    amount: inputCost + outputCost,
    currency: basis.currency,
    label: basis.label
  };
}

export function filterRecords(records, filters = {}) {
  const now = filters.now ? new Date(filters.now) : new Date();
  let start = null;
  if (filters.dateRange === "today") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (filters.dateRange === "7d") {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (filters.dateRange === "30d") {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return records.filter((record) => {
    const date = new Date(record.timestamp);
    return (!start || date >= start)
      && (!filters.model || filters.model === "all" || record.model === filters.model)
      && (!filters.project || filters.project === "all" || record.project === filters.project)
      && (!filters.session || filters.session === "all" || record.session === filters.session);
  });
}

export function sortRecords(records, sortKey = "date-desc", pricing = {}) {
  const sorted = [...records];
  const cost = (record) => estimateCost(record, pricing).amount;
  const total = (record) => record.inputTokens + record.outputTokens;

  sorted.sort((a, b) => {
    if (sortKey === "date-asc") return new Date(a.timestamp) - new Date(b.timestamp);
    if (sortKey === "tokens-desc") return total(b) - total(a);
    if (sortKey === "tokens-asc") return total(a) - total(b);
    if (sortKey === "cost-desc") return cost(b) - cost(a);
    if (sortKey === "model-asc") return a.model.localeCompare(b.model);
    if (sortKey === "project-asc") return a.project.localeCompare(b.project);
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return sorted;
}

export function summarizeRecords(records, pricing) {
  const summary = {
    recordCount: records.length,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
    currency: "USD",
    byModel: {},
    byProject: {},
    byDate: {},
    bySession: {},
    pricingLabels: new Set()
  };

  for (const record of records) {
    const total = record.inputTokens + record.outputTokens;
    const estimate = estimateCost(record, pricing);
    summary.inputTokens += record.inputTokens;
    summary.outputTokens += record.outputTokens;
    summary.totalTokens += total;
    summary.estimatedCost += estimate.amount;
    summary.currency = estimate.currency || summary.currency;
    summary.pricingLabels.add(estimate.label);
    addGroup(summary.byModel, record.model, record, estimate.amount);
    addGroup(summary.byProject, record.project, record, estimate.amount);
    addGroup(summary.bySession, record.session, record, estimate.amount);
    addGroup(summary.byDate, record.timestamp.slice(0, 10), record, estimate.amount);
  }

  summary.pricingLabels = [...summary.pricingLabels];
  return summary;
}

function addGroup(target, key, record, estimatedCost) {
  if (!target[key]) {
    target[key] = {
      label: key,
      recordCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0
    };
  }
  target[key].recordCount += 1;
  target[key].inputTokens += record.inputTokens;
  target[key].outputTokens += record.outputTokens;
  target[key].totalTokens += record.inputTokens + record.outputTokens;
  target[key].estimatedCost += estimatedCost;
}

export function validateImportRows(rows, existingRecords = []) {
  if (!Array.isArray(rows)) {
    return { accepted: [], rejected: [{ row: 0, reason: "가져오기 데이터는 JSON 배열이어야 합니다" }], duplicates: [] };
  }

  const existingIds = new Set(existingRecords.map((record) => record.id));
  const accepted = [];
  const rejected = [];
  const duplicates = [];

  rows.forEach((row, index) => {
    const sensitiveField = hasSensitiveField(row);
    if (sensitiveField) {
      rejected.push({ row: index + 1, reason: `허용되지 않는 필드: ${sensitiveField}` });
      return;
    }

    try {
      const normalized = normalizeRecord(row);
      if (existingIds.has(normalized.id) || accepted.some((record) => record.id === normalized.id)) {
        duplicates.push({ row: index + 1, id: normalized.id });
        return;
      }
      accepted.push(normalized);
    } catch (error) {
      rejected.push({ row: index + 1, reason: error.message });
    }
  });

  return { accepted, rejected, duplicates };
}

export function buildExportPayload(records, filters, pricing) {
  const summary = summarizeRecords(records, pricing);
  return {
    generatedAt: new Date().toISOString(),
    filters,
    summary: {
      recordCount: summary.recordCount,
      inputTokens: summary.inputTokens,
      outputTokens: summary.outputTokens,
      totalTokens: summary.totalTokens,
      estimatedCost: Number(summary.estimatedCost.toFixed(6)),
      currency: summary.currency
    },
    estimateLabel: "표시된 가격 기준으로 계산한 예상 비용",
    pricingBasis: summary.pricingLabels
  };
}
