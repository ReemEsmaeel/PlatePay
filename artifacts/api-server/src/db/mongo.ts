import mongoose from "mongoose";
import { logger } from "../lib/logger";
import { getMongoSocks5Options } from "./mongoSocks5";
import { AuthAccountModel, AuthRateLimitModel, AuthSessionModel } from "../models/auth";
import { WalletTopUpModel } from "../models/walletTopUp";
import {
  AuditLogModel, MerchantModel, PaymentRequestModel, SpendingLimitModel,
  TransactionModel, UserModel, VehicleModel, WalletEntryModel, WalletModel,
} from "../models";

let connectionPromise: Promise<typeof mongoose> | undefined;
let indexesInitialized = false;
let initializationPromise: Promise<typeof mongoose> | undefined;

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1 && indexesInitialized;
}

export function connectMongoDB() {
  if (isDatabaseReady()) return Promise.resolve(mongoose);
  initializationPromise ??= initializeMongoDB().finally(() => { initializationPromise = undefined; });
  return initializationPromise;
}

async function initializeMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required to start the PlatePay API.");
  }

  if (mongoose.connection.readyState === 0) connectionPromise = undefined;
  connectionPromise ??= mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15_000,
    autoIndex: false,
    maxPoolSize: 5,
    minPoolSize: 0,
    maxIdleTimeMS: 30_000,
    ...getMongoSocks5Options(),
  });

  try {
    const connection = await connectionPromise;
    if (!indexesInitialized) {
      // No user records are deleted. Refuse a silent migration if legacy users exist.
      const users = await mongoose.connection.db!.listCollections({ name: UserModel.collection.name }).toArray();
      if (users.length && await UserModel.collection.indexExists("clerkUserId_1")) {
        if (await UserModel.collection.countDocuments({ clerkUserId: { $exists: true } })) {
          throw new Error("Existing legacy accounts require an explicit ownership-preserving migration.");
        }
        await UserModel.collection.dropIndex("clerkUserId_1");
      }
      await Promise.all([
        AuthAccountModel, AuthSessionModel, AuthRateLimitModel,
        UserModel, VehicleModel, MerchantModel, PaymentRequestModel, WalletModel,
        WalletEntryModel, SpendingLimitModel, TransactionModel, AuditLogModel, WalletTopUpModel,
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
