import type { IncomingMessage, ServerResponse } from "node:http";
import app from "./app";
import { connectMongoDB } from "./db/mongo";
import { initializeStripe } from "./lib/stripeClient";
import { logger } from "./lib/logger";

// A request handler, not a listening server. Vercel manages HTTP and instance lifetime.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Cache-Control", "no-store");
  const pathname = new URL(req.url ?? "/", "https://platepay.invalid").pathname;
  try {
    if (pathname !== "/api/livez" && pathname !== "/api/stripe/webhook") {
      await connectMongoDB();
    }
    // Serverless requests must await initialization; no background retry timers.
    // Authentication and merchant operations don't depend on Stripe configuration.
    if (pathname === "/api/wallet" || pathname.startsWith("/api/wallet/topups/")) {
      await initializeStripe();
    }
  } catch (error) {
    logger.warn({ errorType: error instanceof Error ? error.name : "UnknownError" }, "Serverless API dependency unavailable");
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "PlatePay database is unavailable. No transaction has been processed." }));
    return;
  }
  return app(req, res);
}
