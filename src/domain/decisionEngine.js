function decideOutreachJob({ lead, requiresHumanReview }) {
  if (lead.tier === "red" || lead.status === "disallowed") {
    return {
      jobType: "review",
      reason: "disallowed_or_monitor_only"
    };
  }

  if (requiresHumanReview) {
    return {
      jobType: "review",
      reason: "requires_human_review"
    };
  }

  return {
    jobType: "outreach",
    reason: "eligible_for_template_outreach"
  };
}

module.exports = {
  decideOutreachJob
};
