import mongoose from "mongoose";
import { AuditLogModel, TransactionModel, UserModel, WalletEntryModel, WalletModel } from "../models";
import { WalletTopUpModel } from "../models/walletTopUp";
import { DEMO_USD_CENTS_PER_KWD, demoUsdCents } from "./demoFunding";

export class DemoWalletTopUpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface DemoWalletTopUpResult {
  status: "completed";
  amountFils: number;
  balanceFils: number;
  currency: "KWD";
  demoOnly: true;
  simulatedUsdCents: number;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: number }).code === 11000;
}

function resultFromWallet(
  amountFils: number,
  balanceFils: number,
  simulatedUsdCents: number,
): DemoWalletTopUpResult {
  return {
    status: "completed",
    amountFils,
    balanceFils,
    currency: "KWD",
    demoOnly: true,
    simulatedUsdCents,
  };
}

async function getCompletedRetry(
  userId: mongoose.Types.ObjectId,
  attemptKey: string,
  amountFils: number,
): Promise<DemoWalletTopUpResult | null> {
  const intent = await WalletTopUpModel.findOne({ userId, attemptKey });
  if (!intent) return null;
  if (intent.amountFils !== amountFils) {
    throw new DemoWalletTopUpError(409, "This demo top-up attempt was already used for a different amount.");
  }
  if (intent.fundingMode !== "demo_simulation" || !intent.creditedAt) return null;
  const wallet = await WalletModel.findOne({ userId });
  if (!wallet) throw new DemoWalletTopUpError(503, "The wallet is temporarily unavailable. Refresh and try again.");
  return resultFromWallet(
    amountFils,
    wallet.balanceFils,
    intent.checkoutAmountCents ?? demoUsdCents(amountFils),
  );
}

export async function simulateDemoWalletTopUp(
  userId: mongoose.Types.ObjectId,
  amountFils: number,
  attemptKey: string,
): Promise<DemoWalletTopUpResult> {
  const simulatedUsdCents = demoUsdCents(amountFils);
  const session = await mongoose.startSession();
  let result: DemoWalletTopUpResult | undefined;
  let duplicateKeyFailure: unknown;

  try {
    try {
      await session.withTransaction(async () => {
        const intent = await WalletTopUpModel.findOneAndUpdate(
          { userId, attemptKey },
          {
            $setOnInsert: {
              userId,
              attemptKey,
              amountFils,
              fundingMode: "demo_simulation",
              checkoutAmountCents: simulatedUsdCents,
              demoUsdCentsPerKwd: DEMO_USD_CENTS_PER_KWD,
            },
          },
          { session, upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
        );
        if (!intent) throw new DemoWalletTopUpError(503, "The demo top-up could not be started.");
        if (intent.amountFils !== amountFils) {
          throw new DemoWalletTopUpError(409, "This demo top-up attempt was already used for a different amount.");
        }
        if (intent.fundingMode !== "demo_simulation") {
          throw new DemoWalletTopUpError(409, "This top-up attempt belongs to a different payment flow. Choose the amount again.");
        }

        const user = await UserModel.findById(userId).session(session);
        if (!user) throw new DemoWalletTopUpError(404, "The wallet owner could not be found.");

        if (intent.creditedAt) {
          const wallet = await WalletModel.findOne({ userId }).session(session);
          if (!wallet) throw new DemoWalletTopUpError(503, "The wallet is temporarily unavailable. Refresh and try again.");
          result = resultFromWallet(
            amountFils,
            wallet.balanceFils,
            intent.checkoutAmountCents ?? simulatedUsdCents,
          );
          return;
        }

        const claim = await WalletTopUpModel.updateOne(
          { _id: intent._id, creditedAt: null },
          { $set: { creditedAt: new Date() } },
          { session },
        );
        if (!claim.modifiedCount) {
          const wallet = await WalletModel.findOne({ userId }).session(session);
          if (!wallet) throw new DemoWalletTopUpError(503, "The wallet is temporarily unavailable. Refresh and try again.");
          result = resultFromWallet(amountFils, wallet.balanceFils, simulatedUsdCents);
          return;
        }

        const wallet = await WalletModel.findOneAndUpdate(
          { userId },
          { $inc: { balanceFils: amountFils }, $setOnInsert: { userId, currency: "KWD" } },
          { session, upsert: true, new: true, setDefaultsOnInsert: true },
        );
        if (!wallet) throw new DemoWalletTopUpError(503, "The wallet could not be credited.");

        const amountKwd = (amountFils / 1000).toFixed(3);
        const amountUsd = (simulatedUsdCents / 100).toFixed(2);
        await WalletEntryModel.create([{
          userId,
          type: "wallet_top_up",
          status: "completed",
          amountFils,
          currency: "KWD",
          description: `Demo payment simulation (no real charge): USD ${amountUsd} shown → KWD ${amountKwd} credited`,
        }], { session });
        await TransactionModel.create([{
          driverId: userId,
          type: "wallet_top_up",
          status: "completed",
          amountFils,
          currency: "KWD",
        }], { session });
        await AuditLogModel.create([{
          actorId: user._id,
          actorName: user.displayName,
          action: "wallet.demo_top_up",
          targetType: "wallet_top_up",
          targetId: intent.id,
          details: {
            amountFils,
            simulatedUsdCents,
            demoUsdCentsPerKwd: DEMO_USD_CENTS_PER_KWD,
            noRealPayment: true,
          },
        }], { session });
        result = resultFromWallet(amountFils, wallet.balanceFils, simulatedUsdCents);
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      duplicateKeyFailure = error;
    }
  } finally {
    await session.endSession();
  }

  if (duplicateKeyFailure) {
    const retry = await getCompletedRetry(userId, attemptKey, amountFils);
    if (retry) return retry;
    throw new DemoWalletTopUpError(409, "This demo top-up is still processing. Refresh your wallet before retrying.");
  }
  if (!result) throw new DemoWalletTopUpError(503, "The demo top-up could not be confirmed. Refresh your wallet before retrying.");
  return result;
}
