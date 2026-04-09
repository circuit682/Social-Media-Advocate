const { Queue } = require("bullmq");
const { getRedisConnection } = require("./queueClient");

const OUTREACH_QUEUE_NAME = "outreach-jobs";
const REVIEW_QUEUE_NAME = "review-jobs";

function getOutreachQueue(env) {
  return new Queue(OUTREACH_QUEUE_NAME, {
    connection: getRedisConnection(env)
  });
}

function getReviewQueue(env) {
  return new Queue(REVIEW_QUEUE_NAME, {
    connection: getRedisConnection(env)
  });
}

async function enqueueOutreachJob(env, data) {
  const queue = getOutreachQueue(env);
  return queue.add("outreach", data, {
    removeOnComplete: 200,
    removeOnFail: 200
  });
}

async function enqueueReviewJob(env, data) {
  const queue = getReviewQueue(env);
  return queue.add("review", data, {
    removeOnComplete: 200,
    removeOnFail: 200
  });
}

module.exports = {
  OUTREACH_QUEUE_NAME,
  REVIEW_QUEUE_NAME,
  getOutreachQueue,
  getReviewQueue,
  enqueueOutreachJob,
  enqueueReviewJob
};
