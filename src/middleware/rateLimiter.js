function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100 } = {}) {
  const hits = new Map();

  return function rateLimiter(req, res, next) {
    const key = req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress || "anonymous";
    const now = Date.now();
    const windowStart = now - windowMs;
    const existing = hits.get(key) || [];
    const recent = existing.filter((timestamp) => timestamp >= windowStart);

    if (recent.length >= max) {
      return res.status(429).json({ error: "RATE_LIMIT_EXCEEDED" });
    }

    recent.push(now);
    hits.set(key, recent);
    return next();
  };
}

module.exports = {
  createRateLimiter
};
