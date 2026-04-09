const { Lead, OutreachLog, UserInteraction, Flag } = require("../db/models");
const { classifyPost } = require("../domain/classification");
const { evaluateSafety } = require("../domain/safetyEngine");
const {
  mustGoToHumanReview,
  isAutoSendEligible,
  isTouchHardStopped
} = require("../domain/humanReviewPolicy");
const { createLogger } = require("../utils/logger");

const logger = createLogger();

function buildTemplateMessage(lead) {
  if (lead.tier === "yellow") {
    return "Thanks for sharing. Are you looking for tutoring support to understand the topic better?";
  }

  return "Hi, we offer ethical tutoring and project guidance. If helpful, I can share how support works.";
}

async function scoreLead(postId) {
  const lead = await Lead.findOne({ postId });
  if (!lead) {
    throw new Error("Lead not found");
  }

  const classification = classifyPost(lead.excerpt);
  lead.intentScore = classification.intentScore;
  lead.tier = classification.tier;
  lead.riskFlag = classification.riskFlag;
  if (classification.tier === "red") {
    lead.status = "disallowed";
  }
  await lead.save();

  return {
    postId: lead.postId,
    intentScore: lead.intentScore,
    riskFlag: lead.riskFlag,
    recommendedAction: classification.recommendedAction
  };
}

async function planOutreach({ postId, templateBased = true, includesPricing = false, priceEstimateUsd = 0 }, env) {
  const lead = await Lead.findOne({ postId });
  if (!lead) {
    throw new Error("Lead not found");
  }

  const safety = evaluateSafety(lead.excerpt);
  const touchCount = await UserInteraction.countDocuments({
    username: lead.username,
    platform: lead.platform,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });

  if (isTouchHardStopped({ touchCount, maxTouchesPerSevenDays: env.maxTouchesPerSevenDays })) {
    logger.warn({ postId, touchCount }, "Outreach blocked by hard touch limit");

    return {
      lead,
      blocked: true,
      requiresHumanReview: true,
      reviewReasons: ["hard_stop_touch_limit"],
      payload: {
        postId,
        templateBased,
        includesPricing,
        priceEstimateUsd
      }
    };
  }

  const hasExternalLinks = Boolean(lead.metadata?.externalLinks?.length);
  const hasAttachments = Boolean(lead.metadata?.hasAttachments);
  const isBorderline = lead.tier === "yellow" && lead.intentScore >= 50;
  const reviewDecision = mustGoToHumanReview({
    classification: { tier: lead.tier },
    priceEstimateUsd,
    priceThresholdUsd: env.priceThresholdUsd,
    touchCount,
    hasAttachments,
    hasExternalLinks,
    geo: lead.geo,
    highValueGeos: env.highValueGeos,
    isBorderline
  });

  const firstContact = touchCount === 0;
  const lowRisk = lead.tier === "green" && !lead.riskFlag && !safety.disallowed;
  const autoEligible = isAutoSendEligible({
    firstContact,
    lowRisk,
    templateBased,
    includesPricing
  });

  return {
    lead,
    blocked: safety.disallowed,
    requiresHumanReview: safety.disallowed || reviewDecision.required || !autoEligible,
    reviewReasons: safety.disallowed
      ? ["disallowed_or_monitor_only"]
      : reviewDecision.reasons,
    payload: {
      postId,
      templateBased,
      includesPricing,
      priceEstimateUsd
    }
  };
}

async function queueForHumanReview({ postId, includesPricing = false, priceEstimateUsd = 0, reason = "requires_human_review" }) {
  const lead = await Lead.findOne({ postId });
  if (!lead) {
    throw new Error("Lead not found");
  }

  const message = buildTemplateMessage(lead);
  const outreachLog = await OutreachLog.create({
    leadId: lead._id,
    message,
    mode: "queue",
    sentAt: null,
    queuedAt: new Date(),
    containsPricing: includesPricing,
    priceEstimateUsd
  });

  await Flag.create({
    leadId: lead._id,
    flagType: "human_review_required",
    details: reason,
    severity: "medium"
  });

  lead.status = "queued";
  await lead.save();

  return {
    status: "queued",
    outreachLogId: outreachLog._id.toString()
  };
}

async function sendOutreach({
  postId,
  templateBased = true,
  includesPricing = false,
  priceEstimateUsd = 0
}, env) {
  const lead = await Lead.findOne({ postId });
  if (!lead) {
    throw new Error("Lead not found");
  }

  const safety = evaluateSafety(lead.excerpt);
  if (safety.disallowed) {
    logger.warn({ postId }, "Outreach blocked by safety engine");

    lead.status = "disallowed";
    await lead.save();

    return {
      status: "blocked",
      requiresHumanReview: true,
      outreachLogId: null,
      reviewReasons: ["disallowed_or_monitor_only"]
    };
  }

  const touchCount = await UserInteraction.countDocuments({
    username: lead.username,
    platform: lead.platform,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });

  if (isTouchHardStopped({ touchCount, maxTouchesPerSevenDays: env.maxTouchesPerSevenDays })) {
    logger.warn({ postId, touchCount }, "Outreach blocked during send by hard touch limit");

    await Flag.create({
      leadId: lead._id,
      flagType: "hard_stop_touch_limit",
      details: `Touch count ${touchCount} reached hard stop threshold`,
      severity: "high"
    });

    lead.status = "disallowed";
    await lead.save();

    return {
      status: "blocked",
      requiresHumanReview: true,
      outreachLogId: null,
      reviewReasons: ["hard_stop_touch_limit"]
    };
  }

  const hasExternalLinks = Boolean(lead.metadata?.externalLinks?.length);
  const hasAttachments = Boolean(lead.metadata?.hasAttachments);
  const isBorderline = lead.tier === "yellow" && lead.intentScore >= 50;
  const reviewDecision = mustGoToHumanReview({
    classification: { tier: lead.tier },
    priceEstimateUsd,
    priceThresholdUsd: env.priceThresholdUsd,
    touchCount,
    hasAttachments,
    hasExternalLinks,
    geo: lead.geo,
    highValueGeos: env.highValueGeos,
    isBorderline
  });

  const firstContact = touchCount === 0;
  const lowRisk = lead.tier === "green" && !lead.riskFlag;
  const autoEligible = isAutoSendEligible({
    firstContact,
    lowRisk,
    templateBased,
    includesPricing
  });

  const queueRequired = reviewDecision.required || !autoEligible;
  const mode = queueRequired ? "queue" : "auto";
  const message = buildTemplateMessage(lead);

  const outreachLog = await OutreachLog.create({
    leadId: lead._id,
    message,
    mode,
    queuedAt: queueRequired ? new Date() : null,
    sentAt: queueRequired ? null : new Date(),
    containsPricing: includesPricing,
    priceEstimateUsd
  });

  await UserInteraction.create({
    username: lead.username,
    platform: lead.platform,
    leadId: lead._id,
    interactionType: lead.tier === "yellow" ? "comment" : "dm",
    channel: mode
  });

  if (reviewDecision.required) {
    await Flag.create({
      leadId: lead._id,
      flagType: "human_review_required",
      details: reviewDecision.reasons.join(","),
      severity: "medium"
    });
  }

  lead.status = queueRequired ? "queued" : "contacted";
  await lead.save();

  return {
    status: queueRequired ? "queued" : "sent",
    requiresHumanReview: queueRequired,
    outreachLogId: outreachLog._id.toString(),
    reviewReasons: reviewDecision.reasons
  };
}

module.exports = {
  scoreLead,
  planOutreach,
  queueForHumanReview,
  sendOutreach
};
