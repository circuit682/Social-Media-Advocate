const { env } = require("./config/env");
const { connectToMongo } = require("./db/mongo");
const { createApp } = require("./app");
const { createLogger } = require("./utils/logger");
const { startRetentionJob } = require("./jobs/retentionJob");
const { getQueueHealth } = require("./queues/queueClient");

async function start() {
  const logger = createLogger();
  await connectToMongo(env.mongoUri);

  startRetentionJob(env, logger);

  const app = createApp();
  app.listen(env.port, () => {
    logger.info({ port: env.port }, "Server listening");
  });

  const queueHealth = await getQueueHealth(env);
  logger.info({ db: "up", queue: queueHealth.queue }, "Startup health");
}

start().catch((error) => {
  process.stderr.write(`Startup failed: ${error.message}\n`);
  process.exit(1);
});
