# Usage Data Contract

## Import Format

The app accepts a JSON array of usage records. Only these fields are allowed:

```json
[
  {
    "id": "session-001-turn-001",
    "timestamp": "2026-05-14T09:00:00.000Z",
    "model": "gpt-5.4",
    "inputTokens": 2400,
    "outputTokens": 900,
    "project": "codex-monitoring",
    "session": "session-001",
    "source": "masked-export",
    "pricingKey": "default"
  }
]
```

## Rejected Fields

Imports must reject or omit records containing sensitive field names such as:

- `apiKey`, `token`, `secret`, `authorization`, `cookie`
- `prompt`, `response`, `message`, `conversation`
- `email`, `phone`, `customerName`
- `host`, `ip`, `vpn`, `internalUrl`

## Export Format

Exports contain filtered summary metadata only:

```json
{
  "generatedAt": "2026-05-14T10:00:00.000Z",
  "filters": {
    "dateRange": "last-30-days",
    "model": "all",
    "project": "all",
    "session": "all"
  },
  "summary": {
    "recordCount": 12,
    "inputTokens": 12000,
    "outputTokens": 8000,
    "totalTokens": 20000,
    "estimatedCost": 0.12,
    "currency": "USD"
  },
  "estimateLabel": "Estimated cost based on displayed pricing basis"
}
```
