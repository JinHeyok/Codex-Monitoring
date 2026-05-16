# Quickstart: Codex Token Usage Dashboard

## Run Locally

Open `index.html` in a browser, or serve the directory with a local static server:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Test Logic

```bash
npm test
```

## Manual Verification

1. Open the dashboard and confirm sample data shows total input tokens, output
   tokens, combined tokens, estimated cost, model breakdown, and recent trend.
2. Change date, model, project, and session filters and confirm all totals and
   charts update consistently.
3. Sort the detail table by tokens and confirm the highest-usage records rise.
4. Import a valid masked JSON file matching `contracts/usage-data-contract.md`.
5. Import a file containing a rejected field such as `prompt` and confirm the
   app reports the rejection without storing the sensitive value.
6. Export the filtered summary and confirm no raw prompts, responses, secrets,
   or customer data appear.
