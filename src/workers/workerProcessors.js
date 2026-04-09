const { sendOutreach, queueForHumanReview } = require("../services/outreachService");
const { ingestPosts } = require("../services/leadService");

async function processOutreachJob(job, env, logger) {
  const result = await sendOutreach(job.data, env);
  logger.info({ jobId: job.id, result }, "Processed outreach job");
  return result;
}

async function processReviewJob(job, logger) {
  const result = await queueForHumanReview(job.data);
  logger.info({ jobId: job.id, result }, "Processed review job");
  return result;
}

async function processIngestionJob(job, logger) {
  const result = await ingestPosts(job.data);
  logger.info({ jobId: job.id, result }, "Processed ingestion job");
  return result;
}

module.exports = {
  processOutreachJob,
  processReviewJob,
  processIngestionJob
};
