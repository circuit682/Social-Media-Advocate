const { classifyPost } = require("../domain/classification");
const { inferGeo } = require("../domain/geography");
const { Lead, Flag } = require("../db/models");

async function ingestPosts({ platform, posts, maxExcerptLength }) {
  const ops = posts.map((post) => {
    const classification = classifyPost(post.text);
    const excerpt = String(post.text || "").slice(0, maxExcerptLength);
    const geoInference = inferGeo({
      profileGeo: post.profileGeo,
      behavior: post.behavior,
      text: post.text,
      language: post.language
    });

    return {
      updateOne: {
        filter: { platform, postId: post.id },
        update: {
          $setOnInsert: {
            username: post.username,
            platform,
            postId: post.id,
            excerpt,
            intentScore: classification.intentScore,
            tier: classification.tier,
            riskFlag: classification.riskFlag,
            status: classification.tier === "red" ? "disallowed" : "new",
            geo: post.geo || geoInference.geo || "",
            metadata: {
              createdAtSource: post.created_at,
              externalLinks: post.externalLinks || [],
              hasAttachments: Boolean(post.hasAttachments),
              authorId: post.authorId || "",
              handleSnapshot: post.handleSnapshot || post.username,
              geoSignals: geoInference.signals,
              geoConfidence: geoInference.confidence
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

  if (insertedCount > 0) {
    const disallowedLeads = await Lead.find({
      platform,
      postId: { $in: posts.map((p) => p.id) },
      tier: "red"
    }).select("_id riskFlag");

    if (disallowedLeads.length) {
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
