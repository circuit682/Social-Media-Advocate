const pino = require("pino");
const { Worker } = require("bullmq");

const { env } = require("../config/env");
const { connectToMongo } = require("../db/mongo");
const { OUTREACH_QUEUE_NAME, REVIEW_QUEUE_NAME } = require("../queues/outreachQueue");
const { INGESTION_QUEUE_NAME } = require("../queues/ingestionQueue");
const { getRedisConnection } = require("../queues/queueClient");
const { processOutreachJob, processReviewJob, processIngestionJob } = require("./workerProcessors");

async function startWorker() {
  const logger = pino({ level: "info" });

  await connectToMongo(env.mongoUri);

  const connection = getRedisConnection(env);

  const outreachWorker = new Worker(
    OUTREACH_QUEUE_NAME,
    async (job) => processOutreachJob(job, env, logger),
    { connection }
  );

  const ingestionWorker = new Worker(
    INGESTION_QUEUE_NAME,
    async (job) => processIngestionJob(job, logger),
    { connection }
  );

  const reviewWorker = new Worker(
    REVIEW_QUEUE_NAME,
    async (job) => processReviewJob(job, logger),
    { connection }
  );

  outreachWorker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, err: error }, "Outreach job failed");
  });

  reviewWorker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, err: error }, "Review job failed");
  });

  ingestionWorker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, err: error }, "Ingestion job failed");
  });

  logger.info("Outreach worker started");
}

startWorker().catch((error) => {
  process.stderr.write(`Worker startup failed: ${error.message}\n`);
  process.exit(1);
});
