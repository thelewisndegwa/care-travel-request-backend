const createApp = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/database");

async function startServer() {
  await connectDatabase(env.mongodbUri);

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
