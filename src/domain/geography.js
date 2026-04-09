const GEO_KEYWORDS = {
  US: [/\busa\b/i, /\bunited states\b/i, /\bnew york\b/i, /\bcalifornia\b/i],
  UK: [/\buk\b/i, /\bunited kingdom\b/i, /\blondon\b/i, /\bmanchester\b/i],
  CA: [/\bcanada\b/i, /\btoronto\b/i, /\bvancouver\b/i]
};

const ENGLISH_HINTS = [/\bassignment\b/i, /\btutor\b/i, /\bproject\b/i, /\bexam\b/i];

function scoreFromProfile(profileGeo) {
  const text = String(profileGeo || "");
  for (const [geo, patterns] of Object.entries(GEO_KEYWORDS)) {
    if (patterns.some((re) => re.test(text))) {
      return { geo, score: 0.6, signal: "profile" };
    }
  }

  return { geo: "", score: 0, signal: "profile" };
}

function scoreFromBehavior(behavior = {}) {
  const timezone = String(behavior.timezone || "").toUpperCase();
  if (timezone.includes("AMERICA") || timezone === "UTC-5" || timezone === "UTC-8") {
    return { geo: "US", score: 0.2, signal: "behavior" };
  }

  if (timezone.includes("EUROPE/LONDON") || timezone === "UTC+0") {
    return { geo: "UK", score: 0.2, signal: "behavior" };
  }

  if (timezone.includes("AMERICA/TORONTO") || timezone.includes("AMERICA/VANCOUVER")) {
    return { geo: "CA", score: 0.2, signal: "behavior" };
  }

  return { geo: "", score: 0, signal: "behavior" };
}

function scoreFromLanguage(content, language) {
  const lang = String(language || "").toLowerCase();
  if (lang && lang !== "en") {
    return { geo: "", score: 0, signal: "language" };
  }

  if (ENGLISH_HINTS.some((re) => re.test(content || ""))) {
    return { geo: "US", score: 0.2, signal: "language" };
  }

  return { geo: "", score: 0, signal: "language" };
}

function inferGeo({ profileGeo, behavior, text, language }) {
  const profile = scoreFromProfile(profileGeo);
  const behaviorScore = scoreFromBehavior(behavior);
  const languageScore = scoreFromLanguage(text, language);

  const bucket = new Map();

  for (const item of [profile, behaviorScore, languageScore]) {
    if (!item.geo) {
      continue;
    }

    const current = bucket.get(item.geo) || 0;
    bucket.set(item.geo, current + item.score);
  }

  let selectedGeo = "";
  let selectedScore = 0;
  for (const [geo, score] of bucket.entries()) {
    if (score > selectedScore) {
      selectedGeo = geo;
      selectedScore = score;
    }
  }

  return {
    geo: selectedGeo,
    confidence: selectedScore,
    signals: {
      profile,
      behavior: behaviorScore,
      language: languageScore
    }
  };
}

module.exports = {
  inferGeo
};
