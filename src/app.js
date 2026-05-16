import { PRICING, SAMPLE_USAGE } from "./data.js";
import {
  buildExportPayload,
  filterRecords,
  formatMoney,
  formatTokens,
  normalizeRecord,
  sortRecords,
  summarizeRecords,
  validateImportRows
} from "./usage.js";

const STORAGE_KEY = "codex-monitoring.records";
const IMPORT_TIME_KEY = "codex-monitoring.lastImportAt";
const PAGE_SIZE_KEY = "codex-monitoring.pageSize";
const WEEKLY_TOKEN_THRESHOLD_KEY = "codex-monitoring.weeklyTokenThreshold";
const WINDOW_TOKEN_THRESHOLD_KEY = "codex-monitoring.windowTokenThreshold";
const WEEKLY_TOKEN_NOTIFICATIONS_KEY = "codex-monitoring.weeklyTokenNotificationsEnabled";
const WINDOW_TOKEN_NOTIFICATIONS_KEY = "codex-monitoring.windowTokenNotificationsEnabled";
const RESET_WINDOW_HOURS = 5;

const state = {
  records: [],
  events: [],
  codexLimits: null,
  runtime: {
    activeCodexCliCount: 0
  },
  dataSource: "sample",
  filters: {
    dateRange: "all",
    model: "all",
    project: "all",
    session: "all"
  },
  sortKey: "date-desc",
  eventFilter: "all",
  importReport: null,
  logSearch: "",
  page: 1,
  pageSize: Number(localStorage.getItem(PAGE_SIZE_KEY) || 25),
  eventSource: null,
  snapshotVersion: "",
  refreshInFlight: false,
  refreshQueued: false,
  weeklyTokenThreshold: Number(localStorage.getItem(WEEKLY_TOKEN_THRESHOLD_KEY) || 80),
  windowTokenThreshold: Number(localStorage.getItem(WINDOW_TOKEN_THRESHOLD_KEY) || 80),
  quotaNotificationsEnabled: {
    weekly: localStorage.getItem(WEEKLY_TOKEN_NOTIFICATIONS_KEY) === "true",
    window: localStorage.getItem(WINDOW_TOKEN_NOTIFICATIONS_KEY) === "true"
  },
  lastQuotaNotifiedPercent: {
    weekly: 0,
    window: 0
  }
};

const costCache = new Map();

const elements = {
  status: document.querySelector("#status-message"),
  stale: document.querySelector("#stale-message"),
  total: document.querySelector("#metric-total"),
  input: document.querySelector("#metric-input"),
  sessions: document.querySelector("#metric-sessions"),
  activeTime: document.querySelector("#metric-active-time"),
  date: document.querySelector("#filter-date"),
  model: document.querySelector("#filter-model"),
  project: document.querySelector("#filter-project"),
  session: document.querySelector("#filter-session"),
  sort: document.querySelector("#sort-key"),
  modelChart: document.querySelector("#model-chart"),
  costChart: document.querySelector("#cost-chart"),
  tokenChart: document.querySelector("#token-chart"),
  toolChart: document.querySelector("#tool-chart"),
  modelCount: document.querySelector("#model-count"),
  costPointCount: document.querySelector("#cost-point-count"),
  toolCount: document.querySelector("#tool-count"),
  estimateLabel: document.querySelector("#estimate-label"),
  table: document.querySelector("#usage-table"),
  empty: document.querySelector("#empty-state"),
  importFile: document.querySelector("#import-file"),
  importReport: document.querySelector("#import-report"),
  sourceLabel: document.querySelector("#source-label"),
  exportButton: document.querySelector("#export-button"),
  dateButtons: document.querySelectorAll(".period-button"),
  logSearch: document.querySelector("#log-search"),
  eventFilter: document.querySelector("#event-filter"),
  pageSize: document.querySelector("#page-size"),
  prevPage: document.querySelector("#prev-page"),
  nextPage: document.querySelector("#next-page"),
  pageStatus: document.querySelector("#page-status"),
  connectionBadge: document.querySelector("#connection-badge"),
  lastUpdated: document.querySelector("#last-updated"),
  totalTokenThreshold: document.querySelector("#total-token-threshold"),
  totalTokenThresholdSave: document.querySelector("#total-token-threshold-save"),
  totalTokenLimitStatus: document.querySelector("#total-token-limit-status"),
  totalTokenLimitLabel: document.querySelector("#total-token-limit-label"),
  totalTokenLimitPercent: document.querySelector("#total-token-limit-percent"),
  totalTokenLimitBar: document.querySelector("#total-token-limit-bar"),
  totalTokenLimitMarker: document.querySelector("#total-token-limit-marker"),
  totalTokenNotifyToggle: document.querySelector("#total-token-notify-toggle"),
  windowTokenThreshold: document.querySelector("#window-token-threshold"),
  windowTokenThresholdSave: document.querySelector("#window-token-threshold-save"),
  windowTokenLimitStatus: document.querySelector("#window-token-limit-status"),
  windowTokenLimitLabel: document.querySelector("#window-token-limit-label"),
  windowTokenLimitPercent: document.querySelector("#window-token-limit-percent"),
  windowTokenLimitBar: document.querySelector("#window-token-limit-bar"),
  windowTokenLimitMarker: document.querySelector("#window-token-limit-marker"),
  windowTokenNotifyToggle: document.querySelector("#window-token-notify-toggle")
};

init();

async function init() {
  const snapshot = await loadCodexSnapshot();
  if (snapshot.records.length) {
    state.records = snapshot.records;
    state.events = snapshot.events;
    state.codexLimits = snapshot.limits;
    state.runtime = snapshot.runtime;
    state.snapshotVersion = snapshot.version;
    state.dataSource = "codex";
    elements.sourceLabel.textContent = "Codex 로컬 세션";
  } else {
    state.records = await loadRecords();
    state.events = await loadCodexEvents();
  }
  bindEvents();
  updateQuotaNotificationButtons();
  refreshOptions();
  removeDeprecatedBudgetStorage();
  hydrateQuotaControls();
  render();
}

function bindEvents() {
  elements.date.addEventListener("change", () => updateFilter("dateRange", elements.date.value));
  elements.dateButtons.forEach((button) => {
    button.addEventListener("click", () => {
      elements.date.value = button.dataset.dateRange;
      updateFilter("dateRange", elements.date.value);
    });
  });
  elements.model.addEventListener("change", () => updateFilter("model", elements.model.value));
  elements.project.addEventListener("change", () => updateFilter("project", elements.project.value));
  elements.session.addEventListener("change", () => updateFilter("session", elements.session.value));
  elements.eventFilter.addEventListener("change", () => {
    state.eventFilter = elements.eventFilter.value;
    state.page = 1;
    render();
  });
  elements.sort.addEventListener("change", () => {
    state.sortKey = elements.sort.value;
    render();
  });
  elements.importFile.addEventListener("change", handleImport);
  elements.exportButton.addEventListener("click", exportSummary);
  elements.logSearch.addEventListener("input", () => {
    state.logSearch = elements.logSearch.value.trim().toLowerCase();
    state.page = 1;
    render();
  });
  elements.pageSize.value = String(state.pageSize);
  elements.pageSize.addEventListener("change", () => {
    state.pageSize = Number(elements.pageSize.value);
    localStorage.setItem(PAGE_SIZE_KEY, String(state.pageSize));
    state.page = 1;
    render();
  });
  elements.prevPage.addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    render();
  });
  elements.nextPage.addEventListener("click", () => {
    state.page += 1;
    render();
  });
  elements.totalTokenThresholdSave.addEventListener("click", () => saveQuotaThreshold("weekly"));
  elements.windowTokenThresholdSave.addEventListener("click", () => saveQuotaThreshold("window"));
  elements.totalTokenNotifyToggle.addEventListener("click", () => toggleQuotaNotifications("weekly"));
  elements.windowTokenNotifyToggle.addEventListener("click", () => toggleQuotaNotifications("window"));
  connectEvents();
}

async function loadRecords() {
  const codexRecords = await loadCodexRecords();
  if (codexRecords.length) {
    state.dataSource = "codex";
    elements.sourceLabel.textContent = "Codex 로컬 세션";
    return codexRecords;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return SAMPLE_USAGE.map(normalizeRecord);

  try {
    const parsed = JSON.parse(stored);
    return parsed.map(normalizeRecord);
  } catch {
    elements.status.textContent = "저장된 사용량 데이터가 올바르지 않아 안전한 샘플 데이터를 불러왔습니다.";
    return SAMPLE_USAGE.map(normalizeRecord);
  }
}

async function loadCodexRecords() {
  try {
    const response = await fetch("/api/snapshot", { cache: "no-store" });
    if (!response.ok) return [];
    const payload = await response.json();
    const rows = payload.usage;
    if (!Array.isArray(rows) || rows.length === 0) return [];
    state.snapshotVersion = payload.version || state.snapshotVersion;
    return rows.map(normalizeRecord);
  } catch {
    return [];
  }
}

async function loadCodexEvents() {
  try {
    const response = await fetch("/api/snapshot", { cache: "no-store" });
    if (!response.ok) return [];
    const payload = await response.json();
    const rows = payload.events;
    state.snapshotVersion = payload.version || state.snapshotVersion;
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function loadCodexSnapshot() {
  try {
    const response = await fetch("/api/snapshot", { cache: "no-store" });
    if (!response.ok) return emptySnapshot();
    const payload = await response.json();
    return {
      records: Array.isArray(payload.usage) ? payload.usage.map(normalizeRecord) : [],
      events: Array.isArray(payload.events) ? payload.events : [],
      limits: payload.limits || null,
      runtime: payload.runtime || { activeCodexCliCount: 0 },
      version: payload.version || ""
    };
  } catch {
    return emptySnapshot();
  }
}

function emptySnapshot() {
  return {
    records: [],
    events: [],
    limits: null,
    runtime: { activeCodexCliCount: 0 },
    version: ""
  };
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function updateFilter(key, value) {
  state.filters[key] = value;
  render();
}

function refreshOptions() {
  setOptions(elements.model, uniqueValues("model"), state.filters.model);
  setOptions(elements.project, uniqueValues("project"), state.filters.project);
  setOptions(elements.session, uniqueValues("session"), state.filters.session);
  setOptions(
    elements.eventFilter,
    [...new Set(state.events.map((event) => event.eventLabel || event.eventName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    state.eventFilter
  );
}

function uniqueValues(key) {
  return [...new Set(state.records.map((record) => record[key]))].sort((a, b) => a.localeCompare(b));
}

function setOptions(select, values, selected) {
  select.innerHTML = "";
  select.append(new Option("전체", "all"));
  for (const value of values) {
    select.append(new Option(value, value));
  }
  select.value = values.includes(selected) ? selected : "all";
  if (!values.includes(selected)) {
    const filterKey = select.id.replace("filter-", "");
    state.filters[filterKey] = "all";
  }
}

function render() {
  const filtered = filterRecords(state.records, {
    ...state.filters,
    dateRange: elements.date.value
  });
  const searched = filterLogSearch(filtered);
  const sorted = sortRecords(searched, state.sortKey, PRICING);
  const summary = summarizeRecords(filtered, PRICING);
  const dashboard = buildDashboard(filtered, state.events);
  const quota = buildQuota(state.records);
  const eventRows = filterEvents(dashboard.events);

  elements.status.textContent = filtered.length
    ? statusText()
    : "현재 필터에 맞는 사용 기록이 없습니다.";
  renderStaleState();
  renderMetrics(summary, dashboard, quota);
  renderQuotaPanels(quota);
  renderCostChart(dashboard.costData);
  renderTokenChart(dashboard.tokenData);
  renderBars(elements.modelChart, dashboard.modelData, "cost");
  renderBars(elements.toolChart, dashboard.toolData, "count");
  renderTable(eventRows.length ? eventRows : sorted.map(recordToEvent));
  renderReport();
  syncDateButtons();

  elements.modelCount.textContent = `${Object.keys(summary.byModel).length}개 모델`;
  elements.costPointCount.textContent = `${dashboard.costData.length}일`;
  elements.toolCount.textContent = `${dashboard.toolData.length}개`;
  elements.estimateLabel.textContent = summary.pricingLabels.join(" | ") || "사용 가능한 가격 기준 없음";
  elements.empty.hidden = sorted.length !== 0;
}

function syncDateButtons() {
  elements.dateButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.dateRange === elements.date.value);
  });
}

function filterLogSearch(records) {
  if (!state.logSearch) return records;
  return records.filter((record) =>
    [record.model, record.project, record.session, record.source]
      .some((value) => String(value || "").toLowerCase().includes(state.logSearch))
  );
}

function filterEvents(events) {
  return events
    .filter((event) => state.eventFilter === "all" || event.eventLabel === state.eventFilter || event.eventName === state.eventFilter)
    .filter((event) => {
      if (!state.logSearch) return true;
      return [event.eventLabel, event.model, event.project, event.session, event.toolName]
        .some((value) => String(value || "").toLowerCase().includes(state.logSearch));
    });
}

function renderStaleState() {
  if (state.dataSource === "codex") {
    const newest = state.records
      .map((record) => new Date(record.timestamp).getTime())
      .filter(Number.isFinite)
      .sort((a, b) => b - a)[0];
    if (!newest) {
      elements.stale.hidden = true;
      return;
    }
    const ageMinutes = Math.floor((Date.now() - newest) / 60000);
    elements.stale.hidden = ageMinutes < 60;
    elements.stale.textContent = `최근 Codex 토큰 이벤트가 ${ageMinutes}분 전 기록입니다.`;
    return;
  }

  const lastImportAt = localStorage.getItem(IMPORT_TIME_KEY);
  if (!lastImportAt) {
    elements.stale.hidden = true;
    return;
  }

  const ageMs = Date.now() - new Date(lastImportAt).getTime();
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  elements.stale.hidden = ageDays < 7;
  elements.stale.textContent = `가져온 데이터가 ${ageDays}일 전 데이터입니다.`;
}

function statusText() {
  if (state.dataSource === "codex") {
    return "로컬 Codex 세션 로그에서 토큰 사용량을 불러왔습니다.";
  }
  return "현재 필터 기준으로 대시보드가 갱신되었습니다.";
}

function renderMetrics(summary, dashboard, quota) {
  elements.total.textContent = formatQuotaMetric(quota.weeklyUsedPercent);
  elements.input.textContent = formatQuotaMetric(quota.windowUsedPercent);
  elements.sessions.textContent = String(dashboard.activeCodexCliCount);
  elements.activeTime.textContent = formatDuration(dashboard.activeTimeSeconds * 1000);
}

function formatQuotaMetric(usedPercent) {
  const percent = Number(usedPercent);
  return Number.isFinite(percent) ? `${formatPercent(percent)} 사용` : "한도 대기";
}

function renderBars(container, groups, valueKey = "totalTokens") {
  container.innerHTML = "";
  const max = Math.max(...groups.map((group) => Number(group[valueKey] || 0)), 1);
  for (const group of groups.sort((a, b) => Number(b[valueKey] || 0) - Number(a[valueKey] || 0))) {
    const value = Number(group[valueKey] || 0);
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span>${escapeHtml(group.label || group.model || group.tool || "-")}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(value / max) * 100}%"></div></div>
      <strong>${valueKey === "cost" ? formatMoney(value) : formatTokens(value)}</strong>
    `;
    container.append(row);
  }
}

function renderCostChart(groups) {
  elements.costChart.innerHTML = "";
  const max = Math.max(...groups.map((group) => group.cost), 1);
  for (const group of groups) {
    const column = document.createElement("div");
    column.className = "trend-column";
    column.style.setProperty("--height", `${Math.max(8, (group.cost / max) * 100)}%`);
    column.innerHTML = `<span>${formatShortDate(group.date)}</span><strong>${formatMoney(group.cost)}</strong>`;
    elements.costChart.append(column);
  }
}

function renderTokenChart(groups) {
  elements.tokenChart.innerHTML = "";
  renderBars(elements.tokenChart, groups, "tokens");
}

function renderTable(events) {
  elements.table.innerHTML = "";
  const pageCount = Math.max(1, Math.ceil(events.length / state.pageSize));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * state.pageSize;
  const pagedEvents = events.slice(start, start + state.pageSize);

  for (const event of pagedEvents) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(event.timestamp)}</td>
      <td><span class="event-badge">${escapeHtml(event.eventLabel || event.eventName || "-")}</span></td>
      <td>${escapeHtml(event.model || "-")}</td>
      <td>${event.costUsd ? formatMoney(event.costUsd) : "-"}</td>
      <td>${formatEventTokens(event)}</td>
      <td>${event.durationMs ? formatDuration(event.durationMs) : "-"}</td>
    `;
    elements.table.append(row);
  }

  elements.pageStatus.textContent = `${state.page} / ${pageCount} · 총 ${events.length}건`;
  elements.prevPage.disabled = state.page <= 1;
  elements.nextPage.disabled = state.page >= pageCount;
}

function renderReport() {
  if (!state.importReport) return;

  const { accepted, rejected, duplicates } = state.importReport;
  const lines = [
    `수락 ${accepted.length}건`,
    `거부 ${rejected.length}건`,
    `중복 제외 ${duplicates.length}건`
  ];
  const rejectionLines = rejected.map((item) => `${item.row}행: ${item.reason}`);
  const duplicateLines = duplicates.map((item) => `${item.row}행: 중복 ${item.id}`);
  elements.importReport.innerHTML = [...lines, ...rejectionLines, ...duplicateLines]
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  elements.status.textContent = "가져오기 데이터를 검증하는 중...";
  try {
    const text = await file.text();
    const rows = JSON.parse(text);
    const result = validateImportRows(rows, state.records);
    state.importReport = result;
    if (result.accepted.length) {
      state.records = [...state.records, ...result.accepted];
      state.dataSource = "import";
      saveRecords(state.records);
      localStorage.setItem(IMPORT_TIME_KEY, new Date().toISOString());
    }
    elements.sourceLabel.textContent = file.name;
    refreshOptions();
    render();
  } catch (error) {
    state.importReport = {
      accepted: [],
      rejected: [{ row: 0, reason: error.message }],
      duplicates: []
    };
    renderReport();
    elements.status.textContent = "가져오기에 실패했습니다. 올바른 JSON 파일인지 확인하세요.";
  } finally {
    event.target.value = "";
  }
}

function exportSummary() {
  const filtered = filterRecords(state.records, state.filters);
  const payload = buildExportPayload(filtered, state.filters, PRICING);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "codex-token-summary.json";
  link.click();
  URL.revokeObjectURL(url);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

function connectEvents() {
  if (!window.EventSource) {
    setConnection("disconnected", "실시간 미지원");
    return;
  }

  const eventStream = new EventSource("/events");
  state.eventSource = eventStream;
  eventStream.addEventListener("connected", (event) => {
    const payload = parseEventPayload(event);
    if (payload.version) state.snapshotVersion = payload.version;
    setConnection("connected", "실시간 연결됨");
  });
  eventStream.addEventListener("heartbeat", () => updateLastUpdated());
  eventStream.addEventListener("usage-updated", (event) => {
    const payload = parseEventPayload(event);
    if (payload.version && payload.version === state.snapshotVersion) return;
    refreshFromCodex(payload.version);
  });
  eventStream.addEventListener("error", () => setConnection("disconnected", "연결 재시도 중"));
}

async function refreshFromCodex(version = "") {
  if (state.refreshInFlight) {
    state.refreshQueued = true;
    return;
  }

  state.refreshInFlight = true;
  try {
    const snapshot = await loadCodexSnapshot();
    if (!snapshot.records.length || snapshot.version === state.snapshotVersion) return;
    state.records = snapshot.records;
    state.events = snapshot.events;
    state.codexLimits = snapshot.limits;
    state.runtime = snapshot.runtime;
    state.snapshotVersion = snapshot.version || version;
    state.dataSource = "codex";
    elements.sourceLabel.textContent = "Codex 로컬 세션";
    costCache.clear();
    refreshOptions();
    render();
    setConnection("connected", "실시간 갱신됨");
  } finally {
    state.refreshInFlight = false;
    if (state.refreshQueued) {
      state.refreshQueued = false;
      refreshFromCodex();
    }
  }
}

function parseEventPayload(event) {
  try {
    return JSON.parse(event.data || "{}");
  } catch {
    return {};
  }
}

function setConnection(status, text) {
  elements.connectionBadge.className = `connection-badge is-${status}`;
  elements.connectionBadge.textContent = text;
  updateLastUpdated();
}

function updateLastUpdated() {
  elements.lastUpdated.textContent = `마지막 확인 ${new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date())}`;
}

async function toggleQuotaNotifications(type) {
  if (state.quotaNotificationsEnabled[type]) {
    setQuotaNotificationsEnabled(type, false);
    return;
  }

  if (!("Notification" in window)) {
    elements.status.textContent = "이 브라우저는 웹 알림을 지원하지 않습니다.";
    updateQuotaNotificationButtons("unsupported");
    return;
  }

  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();

  setQuotaNotificationsEnabled(type, permission === "granted");
  updateQuotaNotificationButtons(permission);
}

function setQuotaNotificationsEnabled(type, enabled) {
  state.quotaNotificationsEnabled[type] = enabled;
  if (!enabled) {
    state.lastQuotaNotifiedPercent[type] = 0;
  }
  const storageKey = type === "weekly"
    ? WEEKLY_TOKEN_NOTIFICATIONS_KEY
    : WINDOW_TOKEN_NOTIFICATIONS_KEY;
  localStorage.setItem(storageKey, enabled ? "true" : "false");
  updateQuotaNotificationButtons();
}

function updateQuotaNotificationButtons(permission = "Notification" in window ? Notification.permission : "unsupported") {
  updateQuotaNotificationButton(elements.totalTokenNotifyToggle, state.quotaNotificationsEnabled.weekly, permission);
  updateQuotaNotificationButton(elements.windowTokenNotifyToggle, state.quotaNotificationsEnabled.window, permission);
}

function updateQuotaNotificationButton(button, enabled, permission) {
  button.classList.remove("is-on", "is-off", "is-blocked");
  if (permission === "denied") {
    button.textContent = "알림 차단됨";
    button.classList.add("is-blocked");
    button.setAttribute("aria-pressed", "false");
    button.disabled = true;
    return;
  }

  button.disabled = false;
  button.classList.add(enabled ? "is-on" : "is-off");
  button.setAttribute("aria-pressed", enabled ? "true" : "false");
  button.textContent = enabled ? "알림 켜짐" : "알림 꺼짐";
}

function maybeNotifyQuota(key, title, label, usedPct, threshold, resetAt) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!state.quotaNotificationsEnabled[key]) return;
  if (!Number.isFinite(usedPct) || usedPct < threshold) return;
  if (usedPct <= Number(state.lastQuotaNotifiedPercent[key] || 0)) return;

  state.lastQuotaNotifiedPercent[key] = usedPct;
  new Notification(title, {
    body: `${label} 사용률 ${usedPct.toFixed(1)}%가 임계치 ${threshold}%를 넘었습니다. 초기화 ${formatResetTime(resetAt)}`
  });
}

function buildDashboard(records, events) {
  const costByEventId = new Map(records.map((record) => {
    return [`event-${record.id}`, getRecordCost(record)];
  }));
  const scopedEvents = filterRawEvents(events).map((event) => ({
    ...event,
    costUsd: event.costUsd || costByEventId.get(event.id) || 0
  }));
  const today = new Date().toISOString().slice(0, 10);
  const activeTimeSeconds = scopedEvents.reduce((sum, event) => sum + Number(event.durationMs || 0), 0) / 1000;
  const todayRecords = records.filter((record) => record.timestamp.slice(0, 10) === today);
  const todaySummary = summarizeRecords(todayRecords, PRICING);

  return {
    activeCodexCliCount: Number(state.runtime.activeCodexCliCount || 0),
    activeTimeSeconds,
    todayCost: todaySummary.estimatedCost,
    todayTokens: todaySummary.totalTokens,
    costData: buildCostData(records),
    tokenData: buildTokenData(records),
    modelData: buildModelData(records),
    toolData: buildToolData(scopedEvents),
    events: [...scopedEvents].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  };
}

function filterRawEvents(events) {
  const now = new Date();
  let start = null;
  if (elements.date.value === "today") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (elements.date.value === "7d") {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (elements.date.value === "30d") {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return events.filter((event) => {
    const date = new Date(event.timestamp);
    return (!start || date >= start)
      && (!state.filters.model || state.filters.model === "all" || event.model === state.filters.model)
      && (!state.filters.project || state.filters.project === "all" || event.project === state.filters.project)
      && (!state.filters.session || state.filters.session === "all" || event.session === state.filters.session);
  });
}

function buildCostData(records) {
  const byDate = new Map();
  for (const record of records) {
    const date = record.timestamp.slice(0, 10);
    byDate.set(date, (byDate.get(date) || 0) + getRecordCost(record));
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cost]) => ({ date, cost }));
}

function buildTokenData(records) {
  return [
    { label: "입력", tokens: records.reduce((sum, record) => sum + record.inputTokens, 0) },
    { label: "출력", tokens: records.reduce((sum, record) => sum + record.outputTokens, 0) },
    { label: "캐시 읽기", tokens: records.reduce((sum, record) => sum + Number(record.cachedInputTokens || 0), 0) },
    { label: "추론", tokens: records.reduce((sum, record) => sum + Number(record.reasoningOutputTokens || 0), 0) }
  ].filter((item) => item.tokens > 0);
}

function buildModelData(records) {
  const byModel = new Map();
  for (const record of records) {
    const prev = byModel.get(record.model) || { label: record.model, cost: 0, tokens: 0, requests: 0 };
    prev.cost += getRecordCost(record);
    prev.tokens += record.inputTokens + record.outputTokens;
    prev.requests += 1;
    byModel.set(record.model, prev);
  }
  return [...byModel.values()].sort((a, b) => b.cost - a.cost);
}

function buildToolData(events) {
  const byTool = new Map();
  for (const event of events) {
    if (!event.toolName) continue;
    byTool.set(event.toolName, (byTool.get(event.toolName) || 0) + 1);
  }
  return [...byTool.entries()]
    .map(([tool, count]) => ({ label: shortToolName(tool), tool, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function recordToEvent(record) {
  return {
    timestamp: record.timestamp,
    eventName: "api_request",
    eventLabel: "API 요청",
    model: record.model,
    project: record.project,
    session: record.session,
    costUsd: getRecordCost(record),
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    durationMs: 0
  };
}

function getRecordCost(record) {
  const key = [
    record.id,
    record.model,
    record.inputTokens,
    record.outputTokens,
    record.cachedInputTokens,
    record.reasoningOutputTokens
  ].join(":");
  if (costCache.has(key)) return costCache.get(key);
  const cost = summarizeRecords([record], PRICING).estimatedCost;
  costCache.set(key, cost);
  return cost;
}

function hydrateQuotaControls() {
  elements.totalTokenThreshold.value = String(clampPercent(state.weeklyTokenThreshold));
  elements.windowTokenThreshold.value = String(clampPercent(state.windowTokenThreshold));
}

function saveQuotaThreshold(type) {
  if (type === "weekly") {
    state.weeklyTokenThreshold = clampPercent(Number(elements.totalTokenThreshold.value || 80));
    localStorage.setItem(WEEKLY_TOKEN_THRESHOLD_KEY, String(state.weeklyTokenThreshold));
  } else {
    state.windowTokenThreshold = clampPercent(Number(elements.windowTokenThreshold.value || 80));
    localStorage.setItem(WINDOW_TOKEN_THRESHOLD_KEY, String(state.windowTokenThreshold));
  }
  hydrateQuotaControls();
  render();
}

function removeDeprecatedBudgetStorage() {
  localStorage.removeItem("codex-monitoring.costBudget");
  localStorage.removeItem("codex-monitoring.tokenBudget");
  localStorage.removeItem("codex-monitoring.totalTokenLimit");
  localStorage.removeItem("codex-monitoring.windowTokenLimit");
}

function buildQuota(records) {
  const now = Date.now();
  const windows = getCodexLimitWindows(state.codexLimits);
  const weekStart = windows.week?.startAt?.getTime() || startOfWeek(new Date(now)).getTime();
  const windowStart = windows.primary?.startAt?.getTime() || startOfResetWindow(new Date(now), RESET_WINDOW_HOURS).getTime();
  const totalTokens = records.reduce((sum, record) => {
    const timestamp = new Date(record.timestamp).getTime();
    return Number.isFinite(timestamp) && timestamp >= weekStart
      ? sum + recordTotalTokens(record)
      : sum;
  }, 0);
  const windowTokens = records.reduce((sum, record) => {
    const timestamp = new Date(record.timestamp).getTime();
    return Number.isFinite(timestamp) && timestamp >= windowStart
      ? sum + recordTotalTokens(record)
      : sum;
  }, 0);

  return {
    totalTokens,
    windowTokens,
    weekResetAt: windows.week?.resetAt || new Date(weekStart + 7 * 24 * 60 * 60 * 1000),
    windowResetAt: windows.primary?.resetAt || new Date(windowStart + RESET_WINDOW_HOURS * 60 * 60 * 1000),
    weeklyUsedPercent: windows.week?.usedPercent ?? null,
    windowUsedPercent: windows.primary?.usedPercent ?? null,
    hasCodexLimits: Boolean(windows.primary || windows.week)
  };
}

function renderQuotaPanels(quota) {
  renderTokenLimitPanel({
    used: quota.totalTokens,
    threshold: state.weeklyTokenThreshold,
    status: elements.totalTokenLimitStatus,
    label: elements.totalTokenLimitLabel,
    percent: elements.totalTokenLimitPercent,
    bar: elements.totalTokenLimitBar,
    marker: elements.totalTokenLimitMarker,
    labelPrefix: "이번 주",
    resetAt: quota.weekResetAt,
    usedPercent: quota.weeklyUsedPercent,
    notificationKey: "weekly",
    notificationLabel: "주간 토큰 한도",
    notificationTitle: "Codex 주간 토큰 한도 임계치 초과"
  });
  renderTokenLimitPanel({
    used: quota.windowTokens,
    threshold: state.windowTokenThreshold,
    status: elements.windowTokenLimitStatus,
    label: elements.windowTokenLimitLabel,
    percent: elements.windowTokenLimitPercent,
    bar: elements.windowTokenLimitBar,
    marker: elements.windowTokenLimitMarker,
    labelPrefix: "현재 5시간",
    resetAt: quota.windowResetAt,
    usedPercent: quota.windowUsedPercent,
    notificationKey: "window",
    notificationLabel: "5시간 토큰 한도",
    notificationTitle: "Codex 5시간 토큰 한도 임계치 초과"
  });
}

function renderTokenLimitPanel({ used, threshold, status, label, percent, bar, marker, labelPrefix, resetAt, usedPercent, notificationKey, notificationLabel, notificationTitle }) {
  const hasCodexPercent = Number.isFinite(usedPercent);
  const usedPct = hasCodexPercent ? Math.min(100, Math.max(0, usedPercent)) : 0;
  const remainingPct = hasCodexPercent ? Math.max(0, 100 - usedPct) : 0;
  const thresholdPct = clampPercent(Number(threshold || 80));

  status.textContent = hasCodexPercent
    ? `/status 자동 · 사용 ${formatPercent(usedPct)} · 초기화 ${formatResetTime(resetAt)}`
    : "Codex 한도 대기";
  label.textContent = hasCodexPercent
    ? `${labelPrefix} /status 사용률 ${formatPercent(usedPct)}`
    : `${labelPrefix} 자동 한도 정보를 기다리는 중`;
  percent.textContent = hasCodexPercent ? `${formatPercent(remainingPct)} 남음` : "0% 남음";
  bar.style.width = `${usedPct}%`;
  bar.classList.toggle("is-alert", hasCodexPercent && usedPct >= thresholdPct);
  bar.classList.toggle("is-over", hasCodexPercent && usedPct >= 100);
  marker.style.left = `${thresholdPct}%`;
  maybeNotifyQuota(notificationKey, notificationTitle, notificationLabel, usedPct, thresholdPct, resetAt);
}

function recordTotalTokens(record) {
  return Number(record.totalTokens || Number(record.inputTokens || 0) + Number(record.outputTokens || 0));
}

function getCodexLimitWindows(limits) {
  const windows = [limits?.primary, limits?.secondary].filter(Boolean);
  const primary = windows.find((window) => Number(window.windowDurationMins) === 300)
    || windows.find((window) => Number(window.windowDurationMins) < 10080)
    || null;
  const week = windows.find((window) => Number(window.windowDurationMins) === 10080)
    || windows.find((window) => Number(window.windowDurationMins) > 300)
    || null;
  return {
    primary: normalizeLimitWindow(primary),
    week: normalizeLimitWindow(week)
  };
}

function normalizeLimitWindow(window) {
  if (!window?.windowDurationMins || !window?.resetsAt) return null;
  const resetAt = new Date(Number(window.resetsAt) * 1000);
  const startAt = new Date(resetAt.getTime() - Number(window.windowDurationMins) * 60 * 1000);
  return {
    usedPercent: Number(window.usedPercent),
    resetAt,
    startAt
  };
}

function startOfWeek(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + mondayOffset);
  return next;
}

function startOfResetWindow(date, hours) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  const currentHour = next.getHours();
  next.setHours(Math.floor(currentHour / hours) * hours);
  return next;
}

function formatResetTime(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatPercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) return "0%";
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(1)}%`;
}

function clampPercent(value) {
  return Math.min(100, Math.max(1, Number.isFinite(value) ? value : 80));
}

function formatEventTokens(event) {
  const input = Number(event.inputTokens || 0);
  const output = Number(event.outputTokens || 0);
  if (!input && !output) return "-";
  return `${formatTokens(input)} / ${formatTokens(output)}`;
}

function formatDuration(ms) {
  const value = Number(ms || 0);
  if (value >= 3600000) return `${(value / 3600000).toFixed(1)}h`;
  if (value >= 60000) return `${(value / 60000).toFixed(1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

function shortToolName(tool) {
  if (tool.includes("__")) return tool.split("__").pop();
  return tool.length > 18 ? `${tool.slice(0, 18)}…` : tool;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
