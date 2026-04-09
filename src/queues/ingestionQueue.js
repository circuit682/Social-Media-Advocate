const { Queue } = require("bullmq");
const { getRedisConnection } = require("./queueClient");

const INGESTION_QUEUE_NAME = "ingestion-jobs";

function getIngestionQueue(env) {
  return new Queue(INGESTION_QUEUE_NAME, {
    connection: getRedisConnection(env)
  });
}

async function enqueueIngestionJob(env, data) {
  const queue = getIngestionQueue(env);
  return queue.add("ingest", data, {
    removeOnComplete: 50,
    removeOnFail: 100
  });
}

module.exports = {
  INGESTION_QUEUE_NAME,
  getIngestionQueue,
  enqueueIngestionJob
};
