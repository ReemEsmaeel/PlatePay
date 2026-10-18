import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import {
  CreateWalletTopUpCheckoutBody,
  GetTransactionReceiptParams,
  ListTransactionsQueryParams,
  UpdateSpendingLimitsBody,
} from "@workspace/api-zod";
import { kuwaitDateKey } from "../lib/geo";
import { validate } from "../lib/validation";
import {
  requireAppUser,
  requireRole,
  type PlatePayRequest,
} from "../middlewares/auth";
import {
  MerchantModel,
  SpendingLimitModel,
  TransactionModel,
  WalletEntryModel,
  WalletModel,
} from "../models";

const router: IRouter = Router();

function transactionJson(transaction: {
  _id: mongoose.Types.ObjectId;
  type: string;
  status: string;
  amountFils: number;
  currency: string;
  merchantName: string | null;
  plateNumber: string | null;
  serviceCategory: string | null;
  createdAt: Date;
}) {
  return {
    id: transaction._id.toString(),
    type: transaction.type,
    status: transaction.status,
    amountFils: transaction.amountFils,
    currency: transaction.currency,
    merchantName: transaction.merchantName || null,
    plateNumber: transaction.plateNumber || null,
    serviceCategory: transaction.serviceCategory || null,
    createdAt: transaction.createdAt.toISOString(),
  };
}

function limitsJson(limits: {
  dailyLimitFils: number;
  perTransactionLimitFils: number;
  spentTodayFils: number;
  spentOnDate: string;
}) {
  const spentTodayFils =
    limits.spentOnDate === kuwaitDateKey() ? limits.spentTodayFils : 0;
  return {
    dailyLimitFils: limits.dailyLimitFils,
    perTransactionLimitFils: limits.perTransactionLimitFils,
    spentTodayFils,
    remainingTodayFils: Math.max(0, limits.dailyLimitFils - spentTodayFils),
    currency: "KWD",
  };
}

router.get(
  "/wallet",
  requireAppUser,
  requireRole("driver"),
  async (req, res) => {
    const user = (req as PlatePayRequest).platepayUser!;
    const wallet = await WalletModel.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id, balanceFils: 0, currency: "KWD" } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    const entries = await WalletEntryModel.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json({
      balanceFils: wallet.balanceFils,
      currency: wallet.currency,
      recentEntries: entries.map((entry) => ({
        id: entry._id.toString(),
        type: entry.type,
        amountFils: entry.amountFils,
        currency: entry.currency,
        status: entry.status,
        description: entry.description,
        createdAt: entry.createdAt.toISOString(),
      })),
    });
  },
);

router.post(
  "/wallet/topups/checkout",
  requireAppUser,
  requireRole("driver"),
  async (req, res) => {
    const body = validate(CreateWalletTopUpCheckoutBody, req.body, res);
    if (!body) return;
    res.status(503).json({
      error:
        "Stripe test checkout is not connected yet. Connect Stripe to enable wallet top-ups.",
      requestedAmountFils: body.amountFils,
    });
  },
);

router.get(
  "/spending-limits",
  requireAppUser,
  requireRole("driver"),
  async (req, res) => {
    const user = (req as PlatePayRequest).platepayUser!;
    const limits = await SpendingLimitModel.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    res.json(limitsJson(limits));
  },
);

router.put(
  "/spending-limits",
  requireAppUser,
  requireRole("driver"),
  async (req, res) => {
    const body = validate(UpdateSpendingLimitsBody, req.body, res);
    if (!body) return;
    if (body.perTransactionLimitFils > body.dailyLimitFils) {
      res.status(400).json({
        error: "The per-transaction limit cannot exceed the daily limit.",
      });
      return;
    }
    const user = (req as PlatePayRequest).platepayUser!;
    const limits = await SpendingLimitModel.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          dailyLimitFils: body.dailyLimitFils,
          perTransactionLimitFils: body.perTransactionLimitFils,
        },
        $setOnInsert: { userId: user._id },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    res.json(limitsJson(limits));
  },
);

router.get(
  "/transactions",
  requireAppUser,
  requireRole("driver", "merchant"),
  async (req, res) => {
    const query = validate(ListTransactionsQueryParams, req.query, res);
    if (!query) return;
    const user = (req as PlatePayRequest).platepayUser!;
    const filter: Record<string, unknown> =
      user.role === "driver" ? { driverId: user._id } : {};
    if (user.role === "merchant") {
      const merchant = await MerchantModel.findOne({ userId: user._id });
      if (!merchant) {
        res.json([]);
        return;
      }
      filter.merchantId = merchant._id;
    }
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    const transactions = await TransactionModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(transactions.map(transactionJson));
  },
);

router.get(
  "/transactions/:transactionId/receipt",
  requireAppUser,
  requireRole("driver", "merchant"),
  async (req, res) => {
    const params = validate(GetTransactionReceiptParams, req.params, res);
    if (!params) return;
    if (!mongoose.isValidObjectId(params.transactionId)) {
      res.status(404).json({ error: "Receipt not found." });
      return;
    }
    const user = (req as PlatePayRequest).platepayUser!;
    const filter: Record<string, unknown> = { _id: params.transactionId };
    if (user.role === "driver") {
      filter.driverId = user._id;
    } else {
      const merchant = await MerchantModel.findOne({ userId: user._id });
      if (!merchant) {
        res.status(404).json({ error: "Receipt not found." });
        return;
      }
      filter.merchantId = merchant._id;
    }
    const transaction = await TransactionModel.findOne(filter);
    if (!transaction) {
      res.status(404).json({ error: "Receipt not found." });
      return;
    }
    const merchant = transaction.merchantId
      ? await MerchantModel.findById(transaction.merchantId).select("locationName")
      : null;
    res.json({
      receiptNumber: `PP-${transaction.createdAt.getUTCFullYear()}-${transaction._id
        .toString()
        .slice(-6)
        .toUpperCase()}`,
      transaction: transactionJson(transaction),
      merchantLocation: merchant?.locationName ?? null,
    });
  },
);

export default router;
