const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  port: toNumber(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI,
  priceThresholdUsd: toNumber(process.env.PRICE_THRESHOLD_USD, 50),
  maxTouchesPerSevenDays: toNumber(process.env.MAX_TOUCHES_PER_7_DAYS, 3),
  redisUrl: process.env.REDIS_URL || "",
  redisHost: process.env.REDIS_HOST || "127.0.0.1",
  redisPort: toNumber(process.env.REDIS_PORT, 6379),
  retentionCron: process.env.RETENTION_CRON || "0 3 * * *",
  highValueGeos: (process.env.HIGH_VALUE_GEOS || "US,UK,CA")
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean),
  xBearerToken: process.env.X_BEARER_TOKEN || "",
  redditClientId: process.env.REDDIT_CLIENT_ID || "",
  redditClientSecret: process.env.REDDIT_CLIENT_SECRET || "",
  redditUserAgent: process.env.REDDIT_USER_AGENT || "social-media-advocate/0.1",
  internalApiKey: process.env.INTERNAL_API_KEY || "",
  systemAdminToken: process.env.SYSTEM_ADMIN_TOKEN || "",
  humanAdminToken: process.env.HUMAN_ADMIN_TOKEN || "",
  maxPostExcerptLength: toNumber(process.env.MAX_POST_EXCERPT_LENGTH, 200),
  leadsRetentionDays: toNumber(process.env.LEADS_RETENTION_DAYS, 60),
  logsRetentionDays: toNumber(process.env.LOGS_RETENTION_DAYS, 90)
};

module.exports = { env };
