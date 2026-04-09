const pino = require("pino");

function createLogger(level = process.env.LOG_LEVEL || "info") {
  return pino({ level });
}

module.exports = {
  createLogger
};
