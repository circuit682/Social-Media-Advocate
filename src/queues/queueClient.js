const IORedis = require("ioredis");

let connection;

function getRedisConnection(env) {
  if (!connection) {
    connection = new IORedis(env.redisUrl || {
      host: env.redisHost,
      port: env.redisPort,
      maxRetriesPerRequest: null
    });
  }

  return connection;
}

async function getQueueHealth(env) {
  try {
    const redis = getRedisConnection(env);
    const pong = await redis.ping();
    return {
      queue: pong === "PONG" ? "up" : "degraded"
    };
  } catch (_error) {
    return {
      queue: "down"
    };
  }
}

module.exports = {
  getRedisConnection,
  getQueueHealth
};
