const { sendOutreach, queueForHumanReview } = require("../services/outreachService");
const { ingestPosts } = require("../services/leadService");
const { updateRuntimeStatus } = require("../utils/runtimeStatus");

async function processOutreachJob(job, env, logger) {
  const result = await sendOutreach(job.data, env);
  updateRuntimeStatus({
    lastProcessedJobs: {
      outreach: {
        jobId: String(job.id),
        at: new Date().toISOString()
      }
    }
  });
  logger.info({ jobId: job.id, result }, "Processed outreach job");
  return result;
}

async function processReviewJob(job, logger) {
  const result = await queueForHumanReview(job.data);
  updateRuntimeStatus({
    lastProcessedJobs: {
      review: {
        jobId: String(job.id),
        at: new Date().toISOString()
      }
    }
  });
  logger.info({ jobId: job.id, result }, "Processed review job");
  return result;
}

async function processIngestionJob(job, logger) {
  const result = await ingestPosts(job.data);
  updateRuntimeStatus({
    lastProcessedJobs: {
      ingestion: {
        jobId: String(job.id),
        at: new Date().toISOString()
      }
    }
  });
  logger.info({ jobId: job.id, result }, "Processed ingestion job");
  return result;
}

module.exports = {
  processOutreachJob,
  processReviewJob,
  processIngestionJob
};
