const HIGH_INTENT_PATTERNS = [
  /need help with .*assignment/i,
  /looking for a tutor/i,
  /struggling with .*project/i,
  /need tutor urgently/i
];

const AMBIGUOUS_PATTERNS = [
  /assignment is killing me/i,
  /i do not understand/i,
  /struggling with/i,
  /need help/i
];

const DISALLOWED_PATTERNS = [
  /do my exam/i,
  /pay for answers/i,
  /complete this for me/i,
  /take my test/i,
  /do my assignment/i
];

function classifyPost(text) {
  const source = (text || "").trim();

  if (!source) {
    return {
      intentScore: 0,
      tier: "yellow",
      riskFlag: "empty_text",
      recommendedAction: "review"
    };
  }

  const disallowed = DISALLOWED_PATTERNS.some((re) => re.test(source));
  if (disallowed) {
    return {
      intentScore: 0,
      tier: "red",
      riskFlag: "high_risk_cheating",
      recommendedAction: "no_sales_outreach"
    };
  }

  const highIntent = HIGH_INTENT_PATTERNS.some((re) => re.test(source));
  if (highIntent) {
    return {
      intentScore: 85,
      tier: "green",
      riskFlag: null,
      recommendedAction: "dm"
    };
  }

  const ambiguous = AMBIGUOUS_PATTERNS.some((re) => re.test(source));
  if (ambiguous) {
    return {
      intentScore: 55,
      tier: "yellow",
      riskFlag: "ambiguous_intent",
      recommendedAction: "comment_clarify"
    };
  }

  return {
    intentScore: 30,
    tier: "yellow",
    riskFlag: null,
    recommendedAction: "monitor"
  };
}

module.exports = {
  classifyPost
};
