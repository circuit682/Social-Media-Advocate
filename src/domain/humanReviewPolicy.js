function mustGoToHumanReview({
  classification,
  priceEstimateUsd,
  priceThresholdUsd,
  touchCount,
  hasAttachments,
  hasExternalLinks,
  geo,
  highValueGeos,
  isBorderline
}) {
  if (priceEstimateUsd > priceThresholdUsd) {
    return { required: true, reasons: ["pricing_over_threshold"] };
  }

  const reasons = [];

  if (classification.tier === "red" || isBorderline) {
    reasons.push("disallowed_or_borderline");
  }

  if (touchCount >= 2) {
    reasons.push("repeat_touch_pattern");
  }

  if (hasAttachments || hasExternalLinks) {
    reasons.push("attachments_or_links_present");
  }

  if (highValueGeos.includes((geo || "").toUpperCase())) {
    reasons.push("high_value_geography");
  }

  return {
    required: reasons.length > 0,
    reasons
  };
}

function isAutoSendEligible({
  firstContact,
  lowRisk,
  templateBased,
  includesPricing
}) {
  return Boolean(firstContact && lowRisk && templateBased && !includesPricing);
}

function isTouchHardStopped({ touchCount, maxTouchesPerSevenDays }) {
  return touchCount >= maxTouchesPerSevenDays;
}

module.exports = {
  mustGoToHumanReview,
  isAutoSendEligible,
  isTouchHardStopped
};
