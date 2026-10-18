import mongoose from "mongoose";
import { logger } from "../lib/logger";

let connectionPromise: Promise<typeof mongoose> | undefined;

export async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required to start the PlatePay API.");
  }

  connectionPromise ??= mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15_000,
    autoIndex: process.env.NODE_ENV !== "production",
  });

  try {
    const connection = await connectionPromise;
    logger.info("Connected to MongoDB");
    return connection;
  } catch (error) {
    connectionPromise = undefined;
    throw error;
  }
}
