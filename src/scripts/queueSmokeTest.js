const { env } = require("../config/env");
const { connectToMongo } = require("../db/mongo");
const { createLogger } = require("../utils/logger");
const { enqueueIngestionJob } = require("../queues/ingestionQueue");
const { enqueueOutreachJob, enqueueReviewJob } = require("../queues/outreachQueue");
const { updateRuntimeStatus } = require("../utils/runtimeStatus");

async function run() {
  const logger = createLogger();

  await connectToMongo(env.mongoUri);

  const ingestionJob = await enqueueIngestionJob(env, {
    platform: "x",
    posts: [
      {
        post_id: "smoke-ingest-1",
        author_id: "smoke-user",
        handle: "smoke-user",
        text: "Looking for a tutor ASAP",
        timestamp: new Date().toISOString(),
        platform: "x",
        language: "en"
      }
    ],
    maxExcerptLength: env.maxPostExcerptLength
  });

  const outreachJob = await enqueueOutreachJob(env, {
    postId: "smoke-outreach-1",
    templateBased: true,
    includesPricing: false,
    priceEstimateUsd: 0
  });

  const reviewJob = await enqueueReviewJob(env, {
    postId: "smoke-review-1",
    templateBased: true,
    includesPricing: true,
    priceEstimateUsd: 75,
    reason: "smoke_test_review"
  });

  updateRuntimeStatus({
    lastSmokeTestAt: new Date().toISOString(),
    lastSmokeTestJobs: {
      ingestionJobId: String(ingestionJob.id),
      outreachJobId: String(outreachJob.id),
      reviewJobId: String(reviewJob.id)
    }
  });

  logger.info(
    {
      ingestionJobId: ingestionJob.id,
      outreachJobId: outreachJob.id,
      reviewJobId: reviewJob.id
    },
    "Queue smoke test jobs enqueued"
  );

  process.stdout.write("Queue smoke test completed\n");
  process.exit(0);
}

run().catch((error) => {
  process.stderr.write(`Queue smoke test failed: ${error.message}\n`);
  process.exit(1);
});
