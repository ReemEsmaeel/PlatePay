import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import {
  ApprovePaymentRequestBody,
  ApprovePaymentRequestParams,
  CreatePaymentRequestBody,
  GetPaymentRequestParams,
  ListPaymentRequestsQueryParams,
  RejectPaymentRequestBody,
  RejectPaymentRequestParams,
} from "@workspace/api-zod";
import { distanceMeters, kuwaitDateKey } from "../lib/geo";
import { plateForScenario } from "../lib/plate";
import { validate } from "../lib/validation";
import {
  requireAppUser,
  requireRole,
  type PlatePayRequest,
} from "../middlewares/auth";
import {
  AuditLogModel,
  MerchantModel,
  PaymentRequestModel,
  SpendingLimitModel,
  TransactionModel,
  UserModel,
  VehicleModel,
  WalletEntryModel,
  WalletModel,
} from "../models";

const router: IRouter = Router();

function requestJson(request: {
  _id: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  merchantName: string;
  driverId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  plateNumber: string;
  serviceCategory: string;
  amountFils: number;
  currency: string;
  description: string | null;
  orderReference: string | null;
  status: string;
  createdAt: Date;
  expiresAt: Date | null;
  decidedAt: Date | null;
}) {
  return {
    id: request._id.toString(),
    merchantId: request.merchantId.toString(),
    merchantName: request.merchantName,
    driverId: request.driverId.toString(),
    vehicleId: request.vehicleId.toString(),
    plateNumber: request.plateNumber,
    serviceCategory: request.serviceCategory,
    amountFils: request.amountFils,
    currency: request.currency,
    description: request.description,
    orderReference: request.orderReference,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    expiresAt: request.expiresAt?.toISOString() ?? null,
    decidedAt: request.decidedAt?.toISOString() ?? null,
  };
}

class PaymentRuleError extends Error {
  constructor(
    message: string,
    readonly statusCode = 409,
  ) {
    super(message);
  }
}

function respondWithPaymentError(error: unknown, res: import("express").Response) {
  if (error instanceof PaymentRuleError) {
    res.status(error.statusCode).json({ error: error.message });
    return true;
  }
  return false;
}

router.get(
  "/payment-requests",
  requireAppUser,
  requireRole("driver", "merchant"),
  async (req, res) => {
    const query = validate(ListPaymentRequestsQueryParams, req.query, res);
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

    const requests = await PaymentRequestModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const now = new Date();
    const expiredIds = requests
      .filter((request) => request.status === "pending" && request.expiresAt <= now)
      .map((request) => request._id);
    if (expiredIds.length > 0) {
      await PaymentRequestModel.updateMany(
        { _id: { $in: expiredIds }, status: "pending" },
        { $set: { status: "expired" } },
      );
      for (const request of requests) {
        if (expiredIds.some((id) => id.equals(request._id))) {
          request.status = "expired";
        }
      }
    }
    res.json(requests.map(requestJson));
  },
);

router.post(
  "/payment-requests",
  requireAppUser,
  requireRole("merchant"),
  async (req, res) => {
    const body = validate(CreatePaymentRequestBody, req.body, res);
    if (!body) return;
    const user = (req as PlatePayRequest).platepayUser!;
    const merchant = await MerchantModel.findOne({ userId: user._id });
    if (!merchant) {
      res.status(404).json({ error: "Create a merchant location before requesting payment." });
      return;
    }
    if (merchant.status !== "active" || merchant.verificationStatus !== "verified") {
      res.status(403).json({ error: "Merchant location must be active and verified." });
      return;
    }
    if (body.serviceCategory !== merchant.serviceCategory) {
      res.status(400).json({ error: "The request category must match your merchant profile." });
      return;
    }

    const normalizedPlate = plateForScenario(body.plateNumber, user.demoScenarioId);
    const vehicle = await VehicleModel.findOne({
      normalizedPlate,
      status: "active",
    });
    if (!vehicle) {
      res.status(404).json({ error: "No active PlatePay vehicle matches that plate." });
      return;
    }
    const driver = await UserModel.findOne({ _id: vehicle.userId, role: "driver", status: "active" });
    if (!driver) {
      res.status(404).json({ error: "The vehicle owner account is unavailable." });
      return;
    }
    const request = await PaymentRequestModel.create({
        merchantId: merchant._id,
        driverId: vehicle.userId,
        vehicleId: vehicle._id,
        merchantName: merchant.businessName,
        plateNumber: vehicle.plateNumber,
        normalizedPlate,
        serviceCategory: merchant.serviceCategory,
        amountFils: body.amountFils,
        currency: "KWD",
        description: body.description?.trim() || null,
        orderReference: body.orderReference?.trim() || null,
        status: "pending",
      });
    res.status(201).json(requestJson(request));
  },
);

router.get(
  "/payment-requests/:requestId",
  requireAppUser,
  requireRole("driver", "merchant"),
  async (req, res) => {
    const params = validate(GetPaymentRequestParams, req.params, res);
    if (!params) return;
    if (!mongoose.isValidObjectId(params.requestId)) {
      res.status(404).json({ error: "Payment request not found." });
      return;
    }
    const user = (req as PlatePayRequest).platepayUser!;
    const request = await PaymentRequestModel.findById(params.requestId);
    if (!request) {
      res.status(404).json({ error: "Payment request not found." });
      return;
    }
    const visible =
      user.role === "driver"
        ? request.driverId.equals(user._id)
        : (await MerchantModel.findOne({ userId: user._id }))?._id.equals(
            request.merchantId,
          );
    if (!visible) {
      res.status(404).json({ error: "Payment request not found." });
      return;
    }
    if (request.status === "pending" && request.expiresAt <= new Date()) {
      request.status = "expired";
      await request.save();
    }
    res.json(requestJson(request));
  },
);

router.post(
  "/payment-requests/:requestId/approve",
  requireAppUser,
  requireRole("driver"),
  async (req, res) => {
    const params = validate(ApprovePaymentRequestParams, req.params, res);
    const body = validate(ApprovePaymentRequestBody, req.body, res);
    if (!params || !body) return;
    if (!mongoose.isValidObjectId(params.requestId)) {
      res.status(404).json({ error: "Payment request not found." });
      return;
    }
    const user = (req as PlatePayRequest).platepayUser!;
    const existingTransaction = await TransactionModel.findOne({
      paymentRequestId: params.requestId,
      driverId: user._id,
      status: "completed",
    });
    if (existingTransaction) {
      const completedRequest = await PaymentRequestModel.findById(params.requestId);
      if (completedRequest) {
        res.json(requestJson(completedRequest));
        return;
      }
    }

    const session = await mongoose.startSession();
    let approvedId: mongoose.Types.ObjectId | undefined;
    try {
      await session.withTransaction(async () => {
        const now = new Date();
        const request = await PaymentRequestModel.findOne({
          _id: params.requestId,
          driverId: user._id,
          status: "pending",
          expiresAt: { $gt: now },
        }).session(session);
        if (!request) {
          const current = await PaymentRequestModel.findOne({
            _id: params.requestId,
            driverId: user._id,
          }).session(session);
          if (current?.status === "approved") {
            approvedId = current._id;
            return;
          }
          if (current?.status === "pending" && current.expiresAt <= now) {
            current.status = "expired";
            await current.save({ session });
            throw new PaymentRuleError("This payment request has expired.");
          }
          throw new PaymentRuleError("This payment request is no longer pending.");
        }

        const [merchant, vehicle] = await Promise.all([
          MerchantModel.findById(request.merchantId).session(session),
          VehicleModel.findOne({
            _id: request.vehicleId,
            userId: user._id,
            status: "active",
            normalizedPlate: request.normalizedPlate,
          }).session(session),
        ]);
        if (
          !merchant ||
          merchant.status !== "active" ||
          merchant.verificationStatus !== "verified" ||
          !vehicle
        ) {
          throw new PaymentRuleError("The merchant or linked vehicle is unavailable.", 403);
        }
        const activeAccounts = await UserModel.countDocuments({
          _id: { $in: [user._id, merchant.userId] },
          status: "active",
        }).session(session);
        if (activeAccounts !== 2) {
          throw new PaymentRuleError("The driver or merchant account is unavailable.", 403);
        }

        const distance = distanceMeters(
          { latitude: body.latitude, longitude: body.longitude },
          { latitude: merchant.latitude, longitude: merchant.longitude },
        );
        if (distance > merchant.geofenceRadiusMeters) {
          throw new PaymentRuleError(
            "Your phone location is outside this service location's allowed area.",
            403,
          );
        }

        const [wallet, limits] = await Promise.all([
          WalletModel.findOne({ userId: user._id }).session(session),
          SpendingLimitModel.findOne({ userId: user._id }).session(session),
        ]);
        if (!wallet) {
          throw new PaymentRuleError("Set up your wallet before approving a payment.", 409);
        }
        if (!limits) {
          throw new PaymentRuleError("Set up your spending limits before approving a payment.", 409);
        }
        if (request.amountFils > limits.perTransactionLimitFils) {
          throw new PaymentRuleError("This payment exceeds your per-transaction limit.");
        }

        const today = kuwaitDateKey(now);
        const spentToday = limits.spentOnDate === today ? limits.spentTodayFils : 0;
        if (spentToday + request.amountFils > limits.dailyLimitFils) {
          throw new PaymentRuleError("This payment would exceed your daily spending limit.");
        }

        const debitedWallet = await WalletModel.findOneAndUpdate(
          { _id: wallet._id, balanceFils: { $gte: request.amountFils } },
          { $inc: { balanceFils: -request.amountFils } },
          { new: true, session },
        );
        if (!debitedWallet) {
          throw new PaymentRuleError("Your wallet does not have enough balance.");
        }

        limits.spentOnDate = today;
        limits.spentTodayFils = spentToday + request.amountFils;
        await limits.save({ session });

        request.status = "approved";
        request.decidedAt = now;
        request.idempotencyKey = body.idempotencyKey;
        await request.save({ session });

        await TransactionModel.create(
          [
            {
              driverId: user._id,
              merchantId: merchant._id,
              vehicleId: vehicle._id,
              paymentRequestId: request._id,
              type: "merchant_payment",
              status: "completed",
              amountFils: request.amountFils,
              currency: "KWD",
              merchantName: merchant.businessName,
              plateNumber: vehicle.plateNumber,
              serviceCategory: merchant.serviceCategory,
            },
          ],
          { session },
        );
        await WalletEntryModel.create(
          [
            {
              userId: user._id,
              type: "merchant_payment",
              status: "completed",
              amountFils: -request.amountFils,
              currency: "KWD",
              description: `${merchant.businessName} payment`,
              paymentRequestId: request._id,
            },
          ],
          { session },
        );
        await AuditLogModel.create(
          [
            {
              actorId: user._id,
              actorName: user.displayName,
              action: "payment.approved",
              targetType: "payment_request",
              targetId: request._id.toString(),
              details: { amountFils: request.amountFils, merchantId: merchant._id.toString() },
            },
          ],
          { session },
        );
        approvedId = request._id;
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        const current = await PaymentRequestModel.findById(params.requestId);
        if (current?.status === "approved" && current.driverId.equals(user._id)) {
          res.json(requestJson(current));
          return;
        }
      }
      if (respondWithPaymentError(error, res)) return;
      throw error;
    } finally {
      await session.endSession();
    }
    const approved = approvedId
      ? await PaymentRequestModel.findById(approvedId)
      : null;
    if (!approved) {
      res.status(409).json({ error: "Payment approval did not complete." });
      return;
    }
    res.json(requestJson(approved));
  },
);

router.post(
  "/payment-requests/:requestId/reject",
  requireAppUser,
  requireRole("driver"),
  async (req, res) => {
    const params = validate(RejectPaymentRequestParams, req.params, res);
    const body = validate(RejectPaymentRequestBody, req.body ?? {}, res);
    if (!params || !body) return;
    if (!mongoose.isValidObjectId(params.requestId)) {
      res.status(404).json({ error: "Payment request not found." });
      return;
    }
    const user = (req as PlatePayRequest).platepayUser!;
    const request = await PaymentRequestModel.findOneAndUpdate(
      {
        _id: params.requestId,
        driverId: user._id,
        status: "pending",
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: "rejected",
          decidedAt: new Date(),
          rejectionReason: body.reason?.trim() || null,
        },
      },
      { new: true },
    );
    if (!request) {
      res.status(409).json({ error: "This payment request is no longer pending." });
      return;
    }
    await AuditLogModel.create({
      actorId: user._id,
      actorName: user.displayName,
      action: "payment.rejected",
      targetType: "payment_request",
      targetId: request._id.toString(),
      details: { reason: body.reason?.trim() || null },
    });
    res.json(requestJson(request));
  },
);

export default router;
