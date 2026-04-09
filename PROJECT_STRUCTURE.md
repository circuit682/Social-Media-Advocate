# Project Structure Index

This file documents the current workspace layout and what each directory/file is responsible for.

## Root

- `.env.example`: Template environment variables for local configuration, auth tokens, thresholds, and retention settings.
- `package.json`: Node.js project manifest, scripts, dependencies, and Jest config.
- `package-lock.json`: Exact dependency lockfile for reproducible installs.
- `README.md`: High-level project usage and feature overview.
- `PROJECT_STRUCTURE.md`: This structure and file responsibility index.
- `social_media_advocate_project.md`: Product blueprint and implementation direction.
- `social_media_advocate_engineering_spec.md`: Detailed engineering specification and locked policy decisions.

## src/

Main application code for API server, domain logic, data ingestion, and services.

### src/app.js

- Express app setup.
- API routes for ingestion, scoring, outreach, privacy delete, and retention maintenance.
- Central error handling.

### src/server.js

- Process entrypoint.
- Connects to MongoDB, boots HTTP server.

### src/api/

Request-layer helpers and middleware.

- `src/api/adminAuth.js`: Internal endpoint auth using internal key + two-tier admin tokens (SYSTEM/HUMAN).

### src/config/

Runtime configuration and environment parsing.

- `src/config/env.js`: Loads `.env`, parses numeric settings, and exposes runtime config object.

### src/db/

Database integration and schemas.

- `src/db/mongo.js`: MongoDB connection bootstrap via Mongoose.
- `src/db/models.js`: Mongoose schemas/models for `leads`, `outreach_logs`, `flags`, and `users_interactions`, including indexes.

### src/domain/

Pure policy/business logic modules.

- `src/domain/classification.js`: 3-tier intent/risk classification rules (green/yellow/red).
- `src/domain/geography.js`: Hybrid geography inference from profile/behavior/language signals.
- `src/domain/humanReviewPolicy.js`: Human review gates, auto-send eligibility, and hard-stop touch-limit rule.

### src/ingestion/

External source integration and adapter wiring.

- `src/ingestion/sourceRegistry.js`: Pluggable source registry for current and future providers.

#### src/ingestion/sources/

Concrete source adapters.

- `src/ingestion/sources/baseSource.js`: Base adapter contract interface.
- `src/ingestion/sources/xSource.js`: X recent-search ingestion, includes author_id + handle snapshot enrichment.
- `src/ingestion/sources/redditSource.js`: Reddit public API ingestion (v1 default).
- `src/ingestion/sources/redditOAuthSource.js`: Reddit OAuth adapter prepared for future migration.

### src/services/

Orchestration layer combining domain logic + database operations.

- `src/services/leadService.js`: Lead ingestion pipeline, initial scoring, geo inference persistence, disallowed flag creation.
- `src/services/outreachService.js`: Re-scoring, human review checks, hard-stop enforcement, outreach logging, interaction tracking.
- `src/services/retentionService.js`: Retention cleanup and delete-on-request data removal operations.

## tests/

Jest unit tests for policy-critical logic.

- `tests/classification.test.js`: Verifies tier/risk classification behavior.
- `tests/humanReviewPolicy.test.js`: Verifies review gating, auto-send criteria, and hard-stop threshold behavior.
- `tests/adminAuth.test.js`: Verifies SYSTEM/HUMAN token resolution behavior.

## Notes

- `node_modules/` exists locally after install and is intentionally not documented here.
- Current codebase is Node.js-first with pre-architected extension points for future adapters/services.
