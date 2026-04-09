# Social Media Advocate for Ethical Academic Support

## Implementation Direction (Locked)

- Runtime: Node.js core services
- Data ingestion sources for v1: X + Reddit APIs
- Data source design: pluggable adapters for future expansion
- X data lock: store author_id + handle snapshot
- Reddit lock: public API now, OAuth adapter pre-architected
- Database: MongoDB as source of truth
- Outreach mode: both auto-send and human queue with strict boundaries
- Delivery target: implement 80% of the operational loop before advanced features
- Geography inference: hybrid scoring (profile + behavior + language)
- Touch policy: hard stop enforcement at threshold (default 3 touches / 7 days)
- Internal admin model: SYSTEM token for automation, HUMAN token for manual operations

### Mandatory Human Review Conditions

- Price estimate above threshold
- Borderline/disallowed risk signals
- Second or third touch
- Attachments or external links present
- High-value geographies (US, UK, Canada)

### Auto-Send Safe Zone

- First contact
- Low risk
- Template-based message
- No pricing included

## Overview

This project builds an AI-powered system that automates discovery,
qualification, and outreach to potential clients seeking **ethical
academic support services** (tutoring, research help, editing, exam
preparation guidance).

It explicitly **rejects academic dishonesty** (e.g., doing exams or
assignments for students).

------------------------------------------------------------------------

## Core Objectives

-   Discover high-intent leads from social platforms
-   Qualify and prioritize leads using intent scoring
-   Generate ethical outreach messages
-   Maintain compliance with platform policies and privacy laws
-   Integrate human-in-the-loop review

------------------------------------------------------------------------

## System Architecture

### Components

1.  **Data Ingestion Layer**
    -   APIs: Twitter/X, LinkedIn, Reddit
    -   Collect recent posts (last 48 hours)
2.  **Processing Engine**
    -   Keyword matching
    -   Intent scoring (0--100)
    -   Risk detection (cheating, copyright)
3.  **Decision Engine**
    -   Action: DM, comment, follow, save
    -   Template selection
    -   Human review flagging
4.  **Outreach Engine**
    -   Sends messages within rate limits
    -   Tracks user interaction history
5.  **Storage**
    -   Leads metadata (no sensitive data)
    -   Logs and analytics

------------------------------------------------------------------------

## Safety & Ethics

### Hard Rules

-   NO completing exams/tests for users
-   NO providing answers for submission
-   REFUSE unethical requests with alternative help

### Example Refusal

"I can't complete exams or submit work for someone else, but I can help
you prepare or understand the material."

------------------------------------------------------------------------

## TDD (Test-Driven Development) Approach

### Workflow

1.  Write failing test
2.  Implement minimal logic
3.  Refactor safely

### Sample Test Cases

-   Detect "do my exam" → flag as high risk
-   Detect "need tutor urgently" → high intent score
-   Ensure max 3 touches per user in 7 days

------------------------------------------------------------------------

## Dockerization

### Why Docker?

-   Consistent environment
-   Easy deployment
-   Isolation of dependencies

### Sample Dockerfile

``` dockerfile
FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "social-advocate.js"]
```

### docker-compose (optional)

``` yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
```

------------------------------------------------------------------------

## Tech Stack

-   Node.js / Python
-   REST APIs
-   Cron jobs / schedulers
-   Optional: Redis (queue), MongoDB/Postgres (storage)

------------------------------------------------------------------------

## Data Flow

1.  Fetch posts
2.  Score intent
3.  Apply safety filters
4.  Generate outreach
5.  Send or queue for review
6.  Log results

------------------------------------------------------------------------

## Metrics

-   Leads found
-   Messages sent
-   Replies
-   Conversions
-   Conversion rate

------------------------------------------------------------------------

## Future Enhancements

-   AI-powered sentiment analysis
-   Auto A/B testing of messages
-   Multi-account scaling
-   Dashboard UI

------------------------------------------------------------------------

## Final Note

This system is designed to be **powerful but ethical**, balancing
automation with human judgment.

It should **augment human effort, not replace responsibility**.
