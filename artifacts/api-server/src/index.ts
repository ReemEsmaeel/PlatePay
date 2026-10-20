import app from "./app";
import { logger } from "./lib/logger";
import { connectMongoDB } from "./db/mongo";
import { initializeStripe } from "./lib/stripeClient";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function connectWithRetry() {
  try {
    await connectMongoDB();
  } catch (error) {
    logger.error(
      { errorType: error instanceof Error ? error.name : "UnknownError" },
      "MongoDB connection failed. Account and payment routes return 503; public pages remain available.",
    );
    const retry = setTimeout(() => { void connectWithRetry(); }, 30_000);
    retry.unref();
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
void connectWithRetry();
void initializeStripe();
