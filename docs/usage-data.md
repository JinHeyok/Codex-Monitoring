# Usage Data

Codex Token Monitor works with safe metadata only. Do not import API keys,
authentication tokens, raw prompts, raw responses, customer data, internal hosts,
or infrastructure details.

## Import JSON

Use a JSON array of records:

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

Allowed fields are `id`, `timestamp`, `model`, `inputTokens`, `outputTokens`,
`project`, `session`, `source`, and `pricingKey`.

## Export JSON

Exports contain filtered summary totals and pricing labels only. They do not
include row-level prompts, responses, secrets, or customer data.

## Cost Estimates

Costs are estimates based on the pricing basis displayed in the dashboard. Review
the pricing label before using totals for budget decisions.
