const { classifyPost } = require("../src/domain/classification");

describe("classifyPost", () => {
  test("returns red tier for disallowed cheating requests", () => {
    const result = classifyPost("Can you do my exam for me?");

    expect(result.tier).toBe("red");
    expect(result.intentScore).toBe(0);
    expect(result.riskFlag).toBe("high_risk_cheating");
  });

  test("returns green tier for high intent tutoring requests", () => {
    const result = classifyPost("Looking for a tutor ASAP for statistics");

    expect(result.tier).toBe("green");
    expect(result.intentScore).toBeGreaterThanOrEqual(80);
  });

  test("returns yellow tier for ambiguous requests", () => {
    const result = classifyPost("This assignment is killing me");

    expect(result.tier).toBe("yellow");
    expect(result.recommendedAction).toBe("comment_clarify");
  });
});
