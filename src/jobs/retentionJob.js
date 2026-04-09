const cron = require("node-cron");
const { applyRetention } = require("../services/retentionService");

function startRetentionJob(env, logger) {
  const expression = env.retentionCron;

  if (!cron.validate(expression)) {
    logger.warn({ expression }, "Invalid retention cron expression; skipping schedule");
    return null;
  }

  return cron.schedule(expression, async () => {
    try {
      const result = await applyRetention({
        leadsRetentionDays: env.leadsRetentionDays,
        logsRetentionDays: env.logsRetentionDays
      });
      logger.info({ result }, "Retention cleanup completed");
    } catch (error) {
      logger.error({ err: error }, "Retention cleanup failed");
    }
  });
}

module.exports = {
  startRetentionJob
};
