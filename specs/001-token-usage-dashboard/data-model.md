# Data Model: Codex Token Usage Dashboard

## UsageRecord

- `id`: stable unique identifier for deduplication.
- `timestamp`: ISO date-time when usage occurred.
- `model`: model name or label.
- `inputTokens`: non-negative integer.
- `outputTokens`: non-negative integer.
- `project`: optional project label.
- `session`: optional session identifier.
- `source`: `sample`, `import`, or another non-sensitive source label.
- `pricingKey`: optional reference to a pricing basis.

Validation:
- Token counts must be finite non-negative integers.
- Timestamp must parse as a valid date.
- Unknown optional labels are displayed as `Unlabeled`.
- Duplicate `id` values are ignored during import.

## PricingBasis

- `key`: stable pricing identifier.
- `label`: user-visible pricing description.
- `inputPerMillion`: estimated input-token rate.
- `outputPerMillion`: estimated output-token rate.
- `currency`: display currency.

Validation:
- Rates must be non-negative numbers.
- Estimates are always labeled as estimates in the UI and exports.

## UsageSummary

- `recordCount`: count after filters are applied.
- `inputTokens`: total input tokens.
- `outputTokens`: total output tokens.
- `totalTokens`: combined token count.
- `estimatedCost`: sum of record-level estimates.
- `byModel`, `byProject`, `byDate`, `bySession`: grouped summary collections.

## ImportBatch

- `accepted`: sanitized usage records.
- `rejected`: rows or fields rejected with reasons.
- `duplicates`: records ignored because the `id` already exists.
- `createdAt`: import timestamp.

State transitions:
- `selected file` -> `validated` -> `accepted with report` or `rejected with report`.
