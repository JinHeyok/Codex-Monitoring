# Research: Codex Token Usage Dashboard

## Decision: Static Local-First Web App

**Rationale**: The first version needs fast local iteration, no secrets, and no
server-side account integration. Static files satisfy the monitoring workflow
with sample/imported metadata and reduce deployment complexity.

**Alternatives considered**:
- Full-stack web app: rejected for v1 because remote persistence is not needed.
- Desktop app: rejected because browser delivery is simpler and sufficient.

## Decision: Browser localStorage for Imported Metadata

**Rationale**: Users can keep imported usage metadata locally between sessions
without introducing a database or backend service.

**Alternatives considered**:
- IndexedDB: useful for larger datasets, but unnecessary for the expected v1 scale.
- Server database: rejected because it introduces privacy and deployment overhead.

## Decision: Strict Import Allowlist

**Rationale**: Usage monitoring only needs metadata. Importing by allowlist makes
it easier to reject API keys, auth tokens, raw prompts, responses, and customer data.

**Alternatives considered**:
- Best-effort masking after import: rejected because unsafe data could be stored first.

## Decision: Labeled Cost Estimates

**Rationale**: Pricing can change and imported records may span multiple rates.
Every estimate must show the pricing basis used so users can reconcile totals.

**Alternatives considered**:
- Hide costs: rejected because budget monitoring is a core dashboard use case.
