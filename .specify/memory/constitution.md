<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- Template principle 1 -> I. Privacy-First Token Data
- Template principle 2 -> II. Accurate Usage Accounting
- Template principle 3 -> III. Testable User Journeys
- Template principle 4 -> IV. Observable Operations
- Template principle 5 -> V. Simple Local-First Delivery
Added sections:
- Product Constraints
- Development Workflow
Removed sections: none
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
Follow-up TODOs: none
-->
# Codex Monitoring Constitution

## Core Principles

### I. Privacy-First Token Data
The product MUST never require users to paste API keys, session tokens,
conversation contents, customer data, or unmasked internal infrastructure
details. Token usage records MUST be limited to non-sensitive metadata needed
for monitoring, such as timestamp, model, operation type, token counts, cost
estimates, and project labels.

### II. Accurate Usage Accounting
Every usage metric MUST be traceable to an explicit source, calculation rule, or
user-provided import. Estimated costs MUST be labeled as estimates and MUST show
the pricing basis used. Aggregations MUST preserve enough detail for users to
reconcile totals by date, model, project, and session.

### III. Testable User Journeys
Each feature MUST define independently testable user journeys before
implementation. Core flows for importing, viewing, filtering, and exporting
usage data MUST have automated tests or documented manual verification when
automation is not yet practical.

### IV. Observable Operations
The application MUST expose clear loading, empty, error, and stale-data states.
Data processing failures MUST be visible to the user with actionable recovery
steps. Internal logs MUST avoid secrets and raw prompt content.

### V. Simple Local-First Delivery
The first implementation SHOULD favor a simple local web app that works without
external services unless a feature explicitly requires them. Added services,
background jobs, or remote persistence MUST be justified by a user scenario and
captured in the implementation plan.

## Product Constraints

The product is a web experience for monitoring Codex token usage. It MUST support
safe sample data and masked imports for development and demonstrations. Any
configuration examples MUST use placeholders such as `<TOKEN>`, `<HOST>`, and
`<PROJECT_ID>`. The UI MUST prioritize fast scanning of usage totals, trends,
model breakdowns, and budget signals over marketing content.

## Development Workflow

Work proceeds through Spec Kit phases: constitution, specification, plan, tasks,
then implementation. Specifications define user value and acceptance criteria
without selecting frameworks. Plans document architecture, data handling,
security assumptions, and validation strategy. Tasks remain small, ordered, and
traceable to user stories.

## Governance

This constitution supersedes conflicting repository practices. Amendments require
a documented rationale, version update, and review of affected templates and
feature specs. Compliance is checked during planning and before implementation.
Versioning follows semantic versioning: MAJOR for incompatible governance
changes, MINOR for new or expanded principles, and PATCH for clarifications.

**Version**: 1.0.0 | **Ratified**: 2026-05-14 | **Last Amended**: 2026-05-14
