# Tasks: Codex Token Usage Dashboard

**Input**: Design documents from `/specs/001-token-usage-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: Include Node tests for usage accounting and import safety.

## Phase 1: Setup

**Purpose**: Create the static web app structure and project metadata.

- [X] T001 Create source, test, and documentation structure in `src/`, `tests/`, and `docs/`
- [X] T002 Create project metadata and test command in `package.json`
- [X] T003 Create ignore rules for local artifacts in `.gitignore`

---

## Phase 2: Foundational

**Purpose**: Shared data, calculation, validation, and safety logic required by all stories.

- [X] T004 Create sample usage and pricing data in `src/data.js`
- [X] T005 Implement token aggregation, filtering, sorting, cost estimation, import validation, and export helpers in `src/usage.js`
- [X] T006 Add data-safety guardrails for rejected sensitive fields in `src/usage.js`
- [X] T007 Add unit tests for aggregation, filtering, import rejection, duplicate handling, and export safety in `tests/usage.test.js`

**Checkpoint**: Core usage logic is testable without the browser UI.

---

## Phase 3: User Story 1 - View Usage Overview (Priority: P1) MVP

**Goal**: Show immediate totals, estimated cost, model breakdown, and trend from sample data.

**Independent Test**: Open `index.html` and verify overview cards, model chart, trend chart, and empty state behavior.

- [X] T008 [US1] Create dashboard shell and overview markup in `index.html`
- [X] T009 [US1] Implement overview rendering and empty/loading/error/stale states in `src/app.js`
- [X] T010 [US1] Style dashboard layout, cards, charts, and responsive behavior in `src/styles.css`

**Checkpoint**: User can understand token usage within 30 seconds from sample data.

---

## Phase 4: User Story 2 - Filter and Inspect Usage (Priority: P2)

**Goal**: Let users diagnose usage by date range, model, project, session, and sorted details.

**Independent Test**: Apply each filter and sort option and verify totals, charts, and table rows update consistently.

- [X] T011 [US2] Add filter and sort controls to `index.html`
- [X] T012 [US2] Implement filter state, table rendering, and sorting interactions in `src/app.js`
- [X] T013 [US2] Add filter toolbar and detail table styling in `src/styles.css`

**Checkpoint**: User can identify highest-usage sessions and models.

---

## Phase 5: User Story 3 - Import and Export Safe Usage Data (Priority: P3)

**Goal**: Support masked JSON imports and sensitive-field-safe summary exports.

**Independent Test**: Import valid metadata, reject sensitive fields, and export a filtered summary with no unsafe fields.

- [X] T014 [US3] Add import, validation report, reset, and export controls to `index.html`
- [X] T015 [US3] Implement localStorage persistence, import handling, rejection report, reset, and export download in `src/app.js`
- [X] T016 [US3] Style import/export controls and validation reports in `src/styles.css`

**Checkpoint**: User can work with local masked data without exposing sensitive content.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 Update usage documentation in `docs/usage-data.md`
- [X] T018 Run `npm test` and fix any failures
- [X] T019 Run a local static server and verify the quickstart flow
- [X] T020 Verify token accounting totals, estimates, and source labels
- [X] T021 Verify loading, empty, error, and stale-data UI states

---

## Dependencies & Execution Order

- Phase 1 must complete before Phase 2.
- Phase 2 blocks all user story work.
- US1 is the MVP and should complete before US2 and US3.
- US2 and US3 can be implemented independently after US1.
- Polish depends on selected user stories being complete.

## Parallel Opportunities

- T004 and T007 can evolve in parallel after the contract is stable.
- T013 and T016 touch different CSS sections and can be parallelized.
- Documentation T017 can run alongside final manual verification.

## Implementation Strategy

1. Complete setup and core usage logic.
2. Deliver US1 as the independently useful MVP.
3. Add filtering/detail inspection for US2.
4. Add import/export safety workflow for US3.
5. Validate with automated tests and quickstart.
