const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");

const { env } = require("./config/env");
const { createSourceRegistry } = require("./ingestion/sourceRegistry");
const { ingestPosts } = require("./services/leadService");
const { scoreLead, sendOutreach } = require("./services/outreachService");
const { applyRetention, deleteOnRequest } = require("./services/retentionService");
const { requireInternalAdmin } = require("./api/adminAuth");

function createApp() {
  const app = express();
  const logger = pino({ level: "info" });
  const sourceRegistry = createSourceRegistry(env);

  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/ingest/posts", async (req, res, next) => {
    try {
      const { platform, posts } = req.body;
      if (!platform || !Array.isArray(posts)) {
        return res.status(400).json({ error: "platform and posts are required" });
      }

      const result = await ingestPosts({
        platform: platform.toLowerCase(),
        posts,
        maxExcerptLength: env.maxPostExcerptLength
      });

      return res.json({ status: "success", ingested_count: result.ingestedCount });
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
      const result = await ingestPosts({
        platform: source.toLowerCase(),
        posts,
        maxExcerptLength: env.maxPostExcerptLength
      });

      return res.json({
        status: "success",
        source,
        fetched_count: posts.length,
        ingested_count: result.ingestedCount
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

  app.post("/outreach/send", async (req, res, next) => {
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

      const result = await sendOutreach(
        {
          postId,
          templateBased,
          includesPricing,
          priceEstimateUsd
        },
        env
      );

      return res.json({
        status: result.status,
        requires_human_review: result.requiresHumanReview,
        review_reasons: result.reviewReasons
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
