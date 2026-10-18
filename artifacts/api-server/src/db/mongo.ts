import mongoose from "mongoose";
import { logger } from "../lib/logger";
import { getMongoSocks5Options } from "./mongoSocks5";
import {
  AuditLogModel, MerchantModel, PaymentRequestModel, SpendingLimitModel,
  TransactionModel, UserModel, VehicleModel, WalletEntryModel, WalletModel,
} from "../models";

let connectionPromise: Promise<typeof mongoose> | undefined;
let indexesInitialized = false;

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1 && indexesInitialized;
}

export async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required to start the PlatePay API.");
  }

  connectionPromise ??= mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15_000,
    autoIndex: false,
    ...getMongoSocks5Options(),
  });

  try {
    const connection = await connectionPromise;
    if (!indexesInitialized) {
      await Promise.all([
        UserModel, VehicleModel, MerchantModel, PaymentRequestModel, WalletModel,
        WalletEntryModel, SpendingLimitModel, TransactionModel, AuditLogModel,
      ].map((model) => model.createIndexes()));
      indexesInitialized = true;
    }
    logger.info("Connected to MongoDB");
    return connection;
  } catch (error) {
    connectionPromise = undefined;
    throw error;
  }
}
