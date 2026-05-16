# Implementation Plan: Codex Token Usage Dashboard

**Branch**: `001-token-usage-dashboard` | **Date**: 2026-05-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-token-usage-dashboard/spec.md`

## Summary

Build a local-first web dashboard for monitoring Codex token usage from safe
sample data or masked imported metadata. The app focuses on totals, trends,
model/project/session breakdowns, filtering, sorting, import validation, and
sensitive-field-safe exports.

## Technical Context

**Language/Version**: HTML, CSS, JavaScript running in modern browsers; Node.js for tests  
**Primary Dependencies**: None for runtime; built with browser platform APIs  
**Storage**: Browser localStorage for imported metadata; bundled safe sample data  
**Testing**: Node.js built-in test runner for pure data logic; browser manual quickstart  
**Target Platform**: Local desktop browser  
**Project Type**: Static web application  
**Performance Goals**: Update dashboard interactions within 200ms for 5,000 usage records  
**Constraints**: No secrets, raw prompts, customer data, or unmasked infrastructure details stored  
**Scale/Scope**: Single-user local monitoring for individual developers or small teams

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Privacy-first token data: PASS. Import schema accepts only usage metadata and rejects sensitive keys.
- Accurate usage accounting: PASS. Cost estimates are labeled and tied to pricing basis records.
- Testable user journeys: PASS. Overview, filtering, import/export, and aggregation logic are testable.
- Observable operations: PASS. UI plan includes loading, empty, error, and stale-data states.
- Simple local-first delivery: PASS. No external service or remote persistence is required.

## Project Structure

### Documentation (this feature)

```text
specs/001-token-usage-dashboard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── usage-data-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
index.html
src/
├── app.js
├── data.js
├── styles.css
└── usage.js
tests/
└── usage.test.js
package.json
```

**Structure Decision**: Use a static single-page app with reusable usage
calculation logic in `src/usage.js`, sample data in `src/data.js`, DOM behavior
in `src/app.js`, and focused Node tests in `tests/usage.test.js`.

## Complexity Tracking

No constitution violations require justification.

## Phase 0: Research

See [research.md](./research.md).

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md), [usage-data-contract.md](./contracts/usage-data-contract.md),
and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- Privacy-first token data: PASS. Contract lists allowed fields and rejected sensitive fields.
- Accurate usage accounting: PASS. Aggregation and pricing basis are first-class data rules.
- Testable user journeys: PASS. Quickstart and unit tests map to the three user stories.
- Observable operations: PASS. UI states are explicitly represented in implementation tasks.
- Simple local-first delivery: PASS. Static files can run without package installation or services.
