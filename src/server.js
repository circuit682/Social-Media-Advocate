const { env } = require("./config/env");
const { connectToMongo } = require("./db/mongo");
const { createApp } = require("./app");

async function start() {
  await connectToMongo(env.mongoUri);

  const app = createApp();
  app.listen(env.port, () => {
    process.stdout.write(`Server listening on port ${env.port}\n`);
  });
}

start().catch((error) => {
  process.stderr.write(`Startup failed: ${error.message}\n`);
  process.exit(1);
});
