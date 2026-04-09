const DISALLOWED_PATTERNS = [
  /do my exam/i,
  /pay for answers/i,
  /complete this for me/i,
  /take my test/i,
  /write my assignment/i,
  /finish this coursework for me/i
];

function evaluateSafety(text) {
  const source = String(text || "");
  const matchedPattern = DISALLOWED_PATTERNS.find((pattern) => pattern.test(source));

  if (matchedPattern) {
    return {
      disallowed: true,
      flag: "high_risk_cheating",
      pipelineTag: "MONITOR_ONLY"
    };
  }

  return {
    disallowed: false,
    flag: null,
    pipelineTag: "STANDARD"
  };
}

module.exports = {
  evaluateSafety
};
