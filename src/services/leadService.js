const { classifyPost } = require("../domain/classification");
const { inferGeo } = require("../domain/geography");
const { evaluateSafety } = require("../domain/safetyEngine");
const { Lead, Flag } = require("../db/models");
const { buildFingerprint } = require("../utils/fingerprint");
const { createLogger } = require("../utils/logger");

const logger = createLogger();

async function ingestPosts({ platform, posts, maxExcerptLength }) {
  const ops = posts.map((post) => {
    const postId = post.post_id || post.id;
    const authorId = post.author_id || post.authorId || post.username;
    const handle = post.handle || post.handleSnapshot || post.username || authorId;
    const timestamp = post.timestamp || post.created_at;
    const fingerprint = buildFingerprint(platform, postId, post.text);
    const safety = evaluateSafety(post.text);
    const baseClassification = classifyPost(post.text);
    const classification = safety.disallowed
      ? {
          intentScore: 0,
          tier: "red",
          riskFlag: safety.flag,
          recommendedAction: "no_sales_outreach"
        }
      : baseClassification;
    const excerpt = String(post.text || "").slice(0, maxExcerptLength);
    const geoInference = inferGeo({
      profileGeo: post.profileGeo,
      behavior: post.behavior,
      text: post.text,
      language: post.language
    });

    return {
      updateOne: {
        filter: { fingerprint },
        update: {
          $setOnInsert: {
            username: handle,
            platform,
            postId,
            fingerprint,
            excerpt,
            intentScore: classification.intentScore,
            tier: classification.tier,
            riskFlag: classification.riskFlag,
            status: classification.tier === "red" ? "disallowed" : "new",
            geo: post.geo || geoInference.geo || "",
            metadata: {
              createdAtSource: timestamp,
              externalLinks: post.externalLinks || [],
              hasAttachments: Boolean(post.hasAttachments),
              authorId,
              handleSnapshot: handle,
              geoSignals: geoInference.signals,
              geoConfidence: geoInference.confidence,
              pipelineTag: safety.pipelineTag
            }
          }
        },
        upsert: true
      }
    };
  });

  if (!ops.length) {
    return { ingestedCount: 0 };
  }

  const result = await Lead.bulkWrite(ops, { ordered: false });

  const insertedCount = result?.upsertedCount || 0;
  const duplicateCount = Math.max(posts.length - insertedCount, 0);

  if (duplicateCount > 0) {
    logger.info({ platform, duplicateCount }, "Duplicate posts skipped during ingestion");
  }

  if (insertedCount > 0) {
    const disallowedLeads = await Lead.find({
      platform,
      postId: { $in: posts.map((p) => p.post_id || p.id) },
      tier: "red"
    }).select("_id riskFlag");

    if (disallowedLeads.length) {
      logger.warn(
        { platform, disallowedCount: disallowedLeads.length },
        "Disallowed leads detected during ingestion"
      );

      await Flag.insertMany(
        disallowedLeads.map((lead) => ({
          leadId: lead._id,
          flagType: lead.riskFlag || "policy_flag",
          details: "Disallowed intent detected during ingestion",
          severity: "high"
        }))
      );
    }
  }

  return {
    ingestedCount: insertedCount
  };
}

module.exports = {
  ingestPosts
};
