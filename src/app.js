const express = require("express");
const pinoHttp = require("pino-http");
const mongoose = require("mongoose");

const { env } = require("./config/env");
const { createSourceRegistry } = require("./ingestion/sourceRegistry");
const { scoreLead, planOutreach } = require("./services/outreachService");
const { applyRetention, deleteOnRequest } = require("./services/retentionService");
const { requireInternalAdmin } = require("./api/adminAuth");
const { validateIngestPayload } = require("./api/validators/postValidator");
const { createTouchLimiter } = require("./middleware/touchLimiter");
const { createRateLimiter } = require("./middleware/rateLimiter");
const { enqueueIngestionJob } = require("./queues/ingestionQueue");
const { enqueueOutreachJob, enqueueReviewJob } = require("./queues/outreachQueue");
const { getQueueHealth } = require("./queues/queueClient");
const { decideOutreachJob } = require("./domain/decisionEngine");
const { classifyPost } = require("./domain/classification");
const { evaluateSafety } = require("./domain/safetyEngine");
const { Lead } = require("./db/models");
const { createLogger } = require("./utils/logger");
const { readRuntimeStatus } = require("./utils/runtimeStatus");

function createApp() {
  const app = express();
  const logger = createLogger();
  const sourceRegistry = createSourceRegistry(env);
  const touchLimiter = createTouchLimiter(env);

  const requireDebugKey = (req, res, next) => {
    const internalKey = req.header("x-internal-key");
    if (!env.internalApiKey || internalKey !== env.internalApiKey) {
      return res.status(403).json({ error: "internal access denied" });
    }

    return next();
  };

  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger }));
  app.use(createRateLimiter());

  app.get("/health", async (_req, res) => {
    const db = mongoose.connection.readyState === 1 ? "up" : "down";
    const queue = await getQueueHealth(env);
    const ops = readRuntimeStatus();
    res.json({
      status: db === "up" && queue.queue === "up" ? "ok" : "degraded",
      db,
      queue: queue.queue,
      ops
    });
  });

  app.get("/health/ops", (_req, res) => {
    const ops = readRuntimeStatus();
    res.json({ status: "ok", ops });
  });

  app.get("/debug", requireDebugKey, (_req, res) => {
    res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Social Media Advocate Debug</title>
    <style>
      body { font-family: Segoe UI, sans-serif; margin: 2rem; line-height: 1.4; }
      h1 { margin-bottom: 0.5rem; }
      a { display: inline-block; margin-right: 1rem; margin-bottom: 1rem; }
      pre { background: #f5f7fa; padding: 1rem; border-radius: 8px; overflow: auto; }
      button { padding: 0.5rem 0.8rem; cursor: pointer; }
    </style>
  </head>
  <body>
    <h1>Debug Tools</h1>
    <p>Use the quick actions below to test ingestion and verify Mongo writes.</p>
    <a href="/test-ingest" target="_blank" rel="noreferrer">Run /test-ingest</a>
    <a href="/debug/db-count" target="_blank" rel="noreferrer">Open /debug/db-count</a>
    <div>
      <button id="run">Run Both</button>
    </div>
    <h2>Latest Results</h2>
    <pre id="output">Click "Run Both" to fetch live data.</pre>
    <script>
      const output = document.getElementById("output");
      document.getElementById("run").addEventListener("click", async () => {
        try {
          const ingest = await fetch("/test-ingest").then((r) => r.json());
          const db = await fetch("/debug/db-count").then((r) => r.json());
          output.textContent = JSON.stringify({ ingest, db }, null, 2);
        } catch (error) {
          output.textContent = error.message;
        }
      });
    </script>
  </body>
</html>`);
  });

  app.get("/debug/db-count", requireDebugKey, async (_req, res, next) => {
    try {
      const count = await Lead.countDocuments();
      const latest = await Lead.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("postId platform createdAt username");

      return res.json({
        status: "ok",
        collection: "leads",
        count,
        latest
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/test-ingest", async (_req, res, next) => {
    try {
      const { ingestLead } = require("./services/leadService");
      const testPostId = `test-ingest-${Date.now()}`;

      const mockPost = {
        post_id: testPostId,
        author_id: "123",
        handle: "@student123",
        text: "I need help with my assignment urgently",
        platform: "x",
        timestamp: new Date()
      };

      const safety = evaluateSafety(mockPost.text);
      const classification = classifyPost(mockPost.text);
      let risk = "LOW_INTENT";
      let action = "MONITOR";

      if (safety.disallowed || classification.tier === "red") {
        risk = "DISALLOWED";
        action = "BLOCK";
      } else if (classification.intentScore >= 80) {
        risk = "HIGH_INTENT";
        action = "OUTREACH";
      } else if (classification.intentScore >= 50) {
        risk = "MEDIUM_INTENT";
        action = "REVIEW";
      }

      const result = await ingestLead(mockPost);

      return res.json({
        ingestedCount: result.ingestedCount,
        score: classification.intentScore,
        risk,
        action,
        stored: result.ingestedCount > 0
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/ingest/posts", validateIngestPayload, async (req, res, next) => {
    try {
      const { platform, posts } = req.body;
      const job = await enqueueIngestionJob(env, {
        platform: platform.toLowerCase(),
        posts,
        maxExcerptLength: env.maxPostExcerptLength
      });

      req.log.info({ jobId: job.id, platform }, "Ingestion job queued");

      return res.json({ status: "queued", job_id: job.id, ingested_count: posts.length });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/ingest/fetch", async (req, res, next) => {
    try {
      const { source, params = {} } = req.body;
      const adapter = sourceRegistry.get(source);

      if (!adapter) {
        return res.status(400).json({ error: `unsupported source: ${source}` });
      }

      const posts = await adapter.fetchRecentPosts(params);
      const job = await enqueueIngestionJob(env, {
        platform: source.toLowerCase(),
        posts,
        maxExcerptLength: env.maxPostExcerptLength
      });

      req.log.info({ jobId: job.id, source }, "Fetched posts queued for ingestion");

      return res.json({
        status: "success",
        source,
        fetched_count: posts.length,
        queue_status: "queued",
        job_id: job.id
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/process/score", async (req, res, next) => {
    try {
      const { post_id: postId } = req.body;
      if (!postId) {
        return res.status(400).json({ error: "post_id is required" });
      }

      const result = await scoreLead(postId);
      return res.json({
        post_id: result.postId,
        intent_score: result.intentScore,
        risk_flag: result.riskFlag,
        recommended_action: result.recommendedAction
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/outreach/send", touchLimiter, async (req, res, next) => {
    try {
      const {
        post_id: postId,
        template_based: templateBased = true,
        includes_pricing: includesPricing = false,
        price_estimate_usd: priceEstimateUsd = 0
      } = req.body;

      if (!postId) {
        return res.status(400).json({ error: "post_id is required" });
      }

      const plan = await planOutreach(
        {
          postId,
          templateBased,
          includesPricing,
          priceEstimateUsd
        },
        env
      );

      const decision = decideOutreachJob({
        lead: plan.lead,
        requiresHumanReview: plan.requiresHumanReview
      });

      if (decision.jobType === "review") {
        const reviewJob = await enqueueReviewJob(env, {
          ...plan.payload,
          reason: decision.reason
        });

        req.log.warn(
          { postId, jobId: reviewJob.id, reason: decision.reason },
          "Outreach routed to review queue"
        );

        return res.json({
          status: "queued",
          queue: "review",
          job_id: reviewJob.id,
          requires_human_review: true,
          review_reasons: plan.reviewReasons
        });
      }

      const outreachJob = await enqueueOutreachJob(env, plan.payload);

      req.log.info({ postId, jobId: outreachJob.id }, "Outreach routed to outreach queue");

      return res.json({
        status: "queued",
        queue: "outreach",
        job_id: outreachJob.id,
        requires_human_review: false,
        review_reasons: []
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/privacy/delete", requireInternalAdmin(env, ["HUMAN"]), async (req, res, next) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ error: "username is required" });
      }

      const result = await deleteOnRequest(username);
      return res.json({ status: "deleted", ...result });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/maintenance/retention", requireInternalAdmin(env, ["SYSTEM", "HUMAN"]), async (_req, res, next) => {
    try {
      const result = await applyRetention({
        leadsRetentionDays: env.leadsRetentionDays,
        logsRetentionDays: env.logsRetentionDays
      });
      return res.json({ status: "ok", ...result });
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    const message = error?.message || "Internal server error";
    const statusCode = message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ error: message });
  });

  return app;
}

module.exports = { createApp };
