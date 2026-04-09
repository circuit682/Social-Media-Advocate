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
const { createLogger } = require("./utils/logger");

function createApp() {
  const app = express();
  const logger = createLogger();
  const sourceRegistry = createSourceRegistry(env);
  const touchLimiter = createTouchLimiter(env);

  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger }));
  app.use(createRateLimiter());

  app.get("/health", async (_req, res) => {
    const db = mongoose.connection.readyState === 1 ? "up" : "down";
    const queue = await getQueueHealth(env);
    res.json({
      status: db === "up" && queue.queue === "up" ? "ok" : "degraded",
      db,
      queue: queue.queue
    });
  });

  app.post("/ingest/posts", validateIngestPayload, async (req, res, next) => {
    try {
      const { platform, posts } = req.body;
      const job = await enqueueIngestionJob(env, {
        platform: platform.toLowerCase(),
        posts,
        maxExcerptLength: env.maxPostExcerptLength
      });

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

        return res.json({
          status: "queued",
          queue: "review",
          job_id: reviewJob.id,
          requires_human_review: true,
          review_reasons: plan.reviewReasons
        });
      }

      const outreachJob = await enqueueOutreachJob(env, plan.payload);

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
