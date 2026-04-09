# Social Media Advocate -- Engineering Specification (v2.0)

## 0. Locked Implementation Decisions (April 2026)

- Primary runtime: Node.js
- Future-ready hybrid: optional Python microservice for advanced scoring
- Initial external data sources: X + Reddit via APIs
- Source architecture: pluggable adapter interface for additional sources
- X ingestion contract: store `author_id` plus handle snapshot
- Reddit strategy: public API first, OAuth adapter pre-architected for migration
- Source of truth DB: MongoDB
- Required collections:
  - leads
  - outreach_logs
  - flags
  - users_interactions
- Required indexes:
  - username
  - intent_score
  - created_at

### Geography Inference

- Use hybrid scoring for geography inference:
  - profile signals
  - behavior signals
  - language signals

### Touch Limits (Hard Stop)

- Enforce hard stop when touch count reaches threshold within 7-day window (default: 3)
- Hard stop outcome: block sales outreach and log flag

### 3-Tier Classification Policy

- Tier 1 (Green, High Intent)
  - Examples: "Need help with statistics assignment", "Looking for a tutor ASAP", "Struggling with Python ML project"
  - Action: eligible for outreach
- Tier 2 (Yellow, Ambiguous)
  - Examples: "This assignment is killing me", "I don't understand this topic"
  - Action: soft engagement only (comment, clarifying question), no direct sales DM by default
- Tier 3 (Red, Disallowed but monitored)
  - Examples: "Do my exam", "I'll pay for answers", "Complete this for me"
  - Action: no sales outreach, log + track + optional ethical redirect

### Mandatory Human Review Rules

Must-go-to-human when any are true:

- Price estimate above threshold (default: USD 50+, or local equivalent)
- Disallowed or borderline signals
- Second or third touch to same user within policy window
- Attachments or external links are present
- High-value geography (US, UK, Canada)

### Auto-send Rules

Auto-send is allowed only when all are true:

- First contact
- Low risk
- Template-based
- No pricing included

### Outreach Mode

- Auto (safe zone): first contact, low risk, no pricing
- Queue (human approval): pricing, follow-ups, high-intent + high-value, or anything flagged

### Internal Admin Security Model

- Internal-only operations must be authenticated from day one
- Two-tier admin token model:
  - SYSTEM token: automation jobs (scheduler/maintenance)
  - HUMAN token: manual operations (including delete-on-request actions)

### Data Minimization and Retention

Store:

- Username
- Post excerpt (max 200 chars)
- Intent score
- Interaction history

Do not store:

- Full private messages (unless strictly necessary)
- Attachments
- Exam documents

Retention defaults:

- Leads: 30-60 days
- Logs: 90 days max
- Flags: retained longer for pattern learning

Required capability:

- Delete on request

## 1. API Contract Definitions

### POST /ingest/posts

**Description:** Accepts raw posts from social platforms

**Request**

``` json
{
  "platform": "twitter",
  "posts": [
    {
      "id": "123",
      "username": "user123",
      "text": "Need help with ML assignment urgent",
      "created_at": "2026-04-09T10:00:00Z"
    }
  ]
}
```

**Response**

``` json
{
  "status": "success",
  "ingested_count": 1
}
```

------------------------------------------------------------------------

### POST /process/score

**Description:** Scores posts for intent and safety

**Response**

``` json
{
  "post_id": "123",
  "intent_score": 85,
  "risk_flag": null,
  "recommended_action": "dm"
}
```

------------------------------------------------------------------------

### POST /outreach/send

**Description:** Sends or queues outreach

**Response**

``` json
{
  "status": "queued",
  "requires_human_review": true
}
```

------------------------------------------------------------------------

## 2. Database Schema

### PostgreSQL (Recommended)

#### Table: leads

  Column         Type        Description
  -------------- ----------- -----------------------------
  id             UUID        Primary key
  username       TEXT        User handle
  platform       TEXT        Source platform
  excerpt        TEXT        Post snippet
  intent_score   INT         Score
  status         TEXT        new / contacted / converted
  created_at     TIMESTAMP   Timestamp

#### Table: outreach_logs

  Column    Type
  --------- -----------
  id        UUID
  lead_id   UUID
  message   TEXT
  sent_at   TIMESTAMP

------------------------------------------------------------------------

### Optional: MongoDB (Flexible alternative)

``` json
{
  "lead_id": "uuid",
  "username": "user123",
  "history": [
    {"message": "...", "timestamp": "..."}
  ]
}
```

------------------------------------------------------------------------

## 3. CI/CD Pipeline (GitHub Actions)

### .github/workflows/main.yml

``` yaml
name: CI Pipeline

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - name: Install Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm install
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v3
      - run: docker build -t social-advocate .
```

------------------------------------------------------------------------

## 4. TDD Test Suite Structure

### Jest (Node.js)

    /tests
      intent.test.js
      safety.test.js
      outreach.test.js

### Example Test

``` javascript
test("flags cheating request", () => {
  const result = scoreIntent("do my exam");
  expect(result.score).toBe(0);
  expect(result.flag).toBe("high_risk_cheating");
});
```

------------------------------------------------------------------------

### PyTest (Python alternative)

``` python
def test_cheating_flag():
    result = score_intent("do my exam")
    assert result["score"] == 0
```

------------------------------------------------------------------------

## 5. Agent Architecture (Codex-Compatible)

### Prompt Chain Flow

1.  **Listener Agent**
    -   Input: raw posts
    -   Output: filtered posts
2.  **Scoring Agent**
    -   Adds intent score and flags
3.  **Decision Agent**
    -   Chooses action (DM, comment)
4.  **Message Agent**
    -   Generates outreach text
5.  **Supervisor Agent**
    -   Applies safety rules + human review routing

------------------------------------------------------------------------

### Example Prompt Chain

    INPUT → Listener → Scorer → Decision → Message Generator → Safety Filter → OUTPUT

------------------------------------------------------------------------

## 6. Queue System (Optional but Recommended)

-   Redis + BullMQ (Node)
-   Celery + Redis (Python)

Used for: - Scheduling outreach - Handling retries - Managing rate
limits

------------------------------------------------------------------------

## 7. Observability

-   Logs: Winston / Loguru
-   Metrics: Prometheus + Grafana
-   Alerts: Slack webhook

------------------------------------------------------------------------

## 8. Deployment Strategy

-   Docker container
-   Deploy on:
    -   AWS ECS / Lambda
    -   GCP Cloud Run
    -   DigitalOcean Apps

------------------------------------------------------------------------

## 9. Security

-   Use environment variables (.env)
-   Encrypt sensitive data
-   Validate all inputs
-   Rate limit endpoints

------------------------------------------------------------------------

## Final Thought

This is no longer just an idea --- it's a **production-ready AI system
blueprint**.

Built correctly, it becomes: - A lead-generation engine - A conversion
system - A scalable ethical business
