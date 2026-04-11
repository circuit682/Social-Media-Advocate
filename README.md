# Social Media Advocate (Node.js Core)

A Node.js-first implementation for ethical lead discovery and outreach.

## What is implemented (80% loop)

- Ingest raw posts or fetch from pluggable sources (`x`, `reddit`)
- X ingestion stores `author_id` plus handle snapshot
- Reddit starts with public API and includes pre-architected OAuth adapter (`reddit_oauth`)
- Classify posts into 3 tiers: green, yellow, red
- Infer geography using hybrid signals (profile + behavior + language)
- Enforce human-review boundaries
- Enforce hard stop when touch count reaches max threshold in 7-day window
- Auto-send only in the low-risk safe zone
- Store in MongoDB collections:
  - `leads`
  - `outreach_logs`
  - `flags`
  - `users_interactions`
- Privacy controls:
  - delete-on-request endpoint
  - retention cleanup endpoint
  - internal-only admin auth with two token tiers (SYSTEM, HUMAN)

## API

- `POST /ingest/posts`
- `POST /ingest/fetch`
- `POST /process/score`
- `POST /outreach/send`
- `POST /privacy/delete`
- `POST /maintenance/retention`
- `GET /health`
- `GET /health/ops`

## Internal Admin Model

- SYSTEM token: automation jobs
- HUMAN token: manual operations
- Internal endpoints require:
  - `x-internal-key`
  - admin token via `x-admin-token` or `Authorization: Bearer <token>`

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy env file and adjust values:

```bash
copy .env.example .env
```

3. Start server:

```bash
npm run dev
```

The app listens on port `5000` by default.

4. Run queue smoke test (requires Mongo + Redis):

```bash
npm run queue:smoke
```

To test the X bearer token against a custom endpoint, set `X_TEST_ENDPOINT` in `.env` and run `npm run x:test`.

## Notes

- This system intentionally blocks disallowed academic dishonesty requests.
- A future Python microservice can be added for advanced scoring without changing the Node.js core APIs.
- Structured logs are emitted for ingestion queue events, outreach routing decisions, disallowed safety blocks, and dedup skips.
- Runtime operations status is exposed via `/health` and `/health/ops`, including:
  - `lastSmokeTestAt`
  - `lastSmokeTestJobs`
  - `lastProcessedJobs` (ingestion/outreach/review)
