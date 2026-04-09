const {
  mustGoToHumanReview,
  isAutoSendEligible,
  isTouchHardStopped
} = require("../src/domain/humanReviewPolicy");

describe("human review policy", () => {
  test("requires review for pricing above threshold", () => {
    const result = mustGoToHumanReview({
      classification: { tier: "green" },
      priceEstimateUsd: 100,
      priceThresholdUsd: 50,
      touchCount: 0,
      hasAttachments: false,
      hasExternalLinks: false,
      geo: "KE",
      highValueGeos: ["US", "UK", "CA"],
      isBorderline: false
    });

    expect(result.required).toBe(true);
    expect(result.reasons).toContain("pricing_over_threshold");
  });

  test("requires review for second touch and high value geo", () => {
    const result = mustGoToHumanReview({
      classification: { tier: "green" },
      priceEstimateUsd: 0,
      priceThresholdUsd: 50,
      touchCount: 2,
      hasAttachments: false,
      hasExternalLinks: false,
      geo: "US",
      highValueGeos: ["US", "UK", "CA"],
      isBorderline: false
    });

    expect(result.required).toBe(true);
    expect(result.reasons).toContain("repeat_touch_pattern");
    expect(result.reasons).toContain("high_value_geography");
  });

  test("allows auto-send only in safe zone", () => {
    expect(
      isAutoSendEligible({
        firstContact: true,
        lowRisk: true,
        templateBased: true,
        includesPricing: false
      })
    ).toBe(true);

    expect(
      isAutoSendEligible({
        firstContact: false,
        lowRisk: true,
        templateBased: true,
        includesPricing: false
      })
    ).toBe(false);
  });

  test("enforces hard stop at max touch threshold", () => {
    expect(
      isTouchHardStopped({
        touchCount: 3,
        maxTouchesPerSevenDays: 3
      })
    ).toBe(true);

    expect(
      isTouchHardStopped({
        touchCount: 2,
        maxTouchesPerSevenDays: 3
      })
    ).toBe(false);
  });
});
