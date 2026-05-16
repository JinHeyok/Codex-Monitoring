# Feature Specification: Codex Token Usage Dashboard

**Feature Branch**: `001-token-usage-dashboard`  
**Created**: 2026-05-14  
**Status**: Draft  
**Input**: User description: "프로젝트 웹을 하나 만들건데 Codex의 토큰 사용량을 모니터링 하는 걸 기반으로 만들거야"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Usage Overview (Priority: P1)

A user opens the web app and immediately sees total Codex token usage, estimated
cost, and recent trend for the selected time range.

**Why this priority**: This is the core monitoring value and the minimum useful
slice of the product.

**Independent Test**: Load safe sample usage data, open the dashboard, and verify
that totals, trend direction, and model breakdown are visible without setup.

**Acceptance Scenarios**:

1. **Given** usage records exist, **When** the user opens the dashboard, **Then**
   total input tokens, output tokens, combined tokens, and estimated cost are shown.
2. **Given** no usage records exist, **When** the user opens the dashboard,
   **Then** an empty state explains how to add safe sample or imported data.

---

### User Story 2 - Filter and Inspect Usage (Priority: P2)

A user filters usage by date range, model, project label, and session to find
which work consumed the most tokens.

**Why this priority**: Users need to diagnose spikes and compare usage sources.

**Independent Test**: Apply each filter to a multi-session dataset and verify
that totals, charts, and detail rows update consistently.

**Acceptance Scenarios**:

1. **Given** records span multiple days and models, **When** the user applies a
   model filter, **Then** all totals and visualizations reflect only that model.
2. **Given** a token spike exists, **When** the user sorts sessions by total
   tokens, **Then** the highest-usage sessions appear first.

---

### User Story 3 - Import and Export Safe Usage Data (Priority: P3)

A user imports masked Codex usage records and exports filtered summaries for
budget review or team reporting.

**Why this priority**: Monitoring becomes useful with real project data, while
exports support sharing without exposing sensitive content.

**Independent Test**: Import a masked file, verify rejected sensitive fields are
reported, then export a filtered summary that contains only approved metadata.

**Acceptance Scenarios**:

1. **Given** a valid masked usage file, **When** the user imports it, **Then**
   records are added and source information is retained.
2. **Given** an import contains disallowed sensitive fields, **When** the user
   imports it, **Then** the app rejects or masks those fields and explains why.

### Edge Cases

- Imported rows have missing token counts, unknown model names, or invalid dates.
- Estimated cost cannot be calculated because pricing data is unavailable.
- Filters produce no matching records.
- Duplicate records are imported more than once.
- Very large usage files are imported and need visible progress or recovery.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display total input tokens, output tokens, combined
  tokens, estimated cost, and record count for a selected time range.
- **FR-002**: System MUST show usage breakdowns by model, project label, date,
  and session when those fields are present.
- **FR-003**: Users MUST be able to filter usage by date range, model, project
  label, and session.
- **FR-004**: Users MUST be able to sort detailed usage records by date, token
  count, estimated cost, model, and project label.
- **FR-005**: System MUST support safe sample data so the dashboard can be
  evaluated without real Codex usage records.
- **FR-006**: System MUST import usage records that contain only approved
  metadata and MUST reject or mask secrets, raw prompts, customer data, and
  unmasked internal infrastructure details.
- **FR-007**: System MUST label estimated costs and identify the pricing basis
  used for each estimate.
- **FR-008**: Users MUST be able to export filtered summaries without sensitive
  fields.
- **FR-009**: System MUST provide clear loading, empty, error, and stale-data
  states.

### Key Entities *(include if feature involves data)*

- **Usage Record**: A single Codex usage event with timestamp, model, input token
  count, output token count, project label, session identifier, source, and
  optional estimate metadata.
- **Usage Summary**: Aggregated totals for a selected time range and filter set.
- **Pricing Basis**: The rate information used to estimate cost for a model and
  time period.
- **Import Batch**: A user-provided collection of usage records with validation
  status, source label, and rejected-field details.

### Data Safety *(mandatory for usage-monitoring features)*

- Collected metadata: timestamp, model, token counts, estimated cost, project
  label, session identifier, source label, and import status.
- Excluded or masked data: API keys, auth tokens, raw prompts, raw responses,
  customer personal data, internal hosts, and unmasked infrastructure details.
- Estimates MUST be clearly labeled and tied to the pricing basis shown to users.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can understand total token usage and estimated cost for the
  current dataset within 30 seconds of opening the dashboard.
- **SC-002**: A user can identify the top five highest-usage sessions within 60
  seconds using filters and sorting.
- **SC-003**: 100% of exported summaries exclude secrets, raw prompt/response
  content, customer data, and unmasked infrastructure details.
- **SC-004**: Import validation reports all rejected rows or fields with a clear
  reason before data is added to the dashboard.
- **SC-005**: Dashboard totals remain internally consistent across overview,
  charts, and detail rows for the same filter set.

## Assumptions

- Target users are individual developers or small teams reviewing Codex usage.
- The first version can operate with local sample or imported metadata rather
  than direct account billing integration.
- Pricing data may be manually configured or bundled as reference data and must
  be visible when used for estimates.
- Raw conversation content is out of scope for v1.
