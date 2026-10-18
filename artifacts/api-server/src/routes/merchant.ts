import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import {
  GetMerchantProfileResponse,
  GetMerchantDashboardResponse,
  UpdateMerchantProfileBody,
  UpdateMerchantProfileResponse,
} from "@workspace/api-zod";
import {
  MerchantModel,
  PaymentRequestModel,
  TransactionModel,
} from "../models";
import {
  requireAppUser,
  requireRole,
  type PlatePayRequest,
} from "../middlewares/auth";
import { validate } from "../lib/validation";

const router: IRouter = Router();

function merchantJson(merchant: {
  _id: mongoose.Types.ObjectId;
  businessName: string;
  serviceCategory: string;
  locationName: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  status: string;
  verificationStatus: string;
}) {
  return {
    id: merchant._id.toString(),
    businessName: merchant.businessName,
    serviceCategory: merchant.serviceCategory,
    locationName: merchant.locationName,
    latitude: merchant.latitude,
    longitude: merchant.longitude,
    geofenceRadiusMeters: merchant.geofenceRadiusMeters,
    status: merchant.status,
    verificationStatus: merchant.verificationStatus,
  };
}

router.get(
  "/merchant/profile",
  requireAppUser,
  requireRole("merchant"),
  async (req, res) => {
    const user = (req as PlatePayRequest).platepayUser!;
    const merchant = await MerchantModel.findOne({ userId: user._id });
    if (!merchant) {
      res.status(404).json({ error: "Set up your merchant profile to continue." });
      return;
    }
    res.json(GetMerchantProfileResponse.parse(merchantJson(merchant)));
  },
);

router.put(
  "/merchant/profile",
  requireAppUser,
  requireRole("merchant"),
  async (req, res) => {
    const body = validate(UpdateMerchantProfileBody, req.body, res);
    if (!body) return;
    const user = (req as PlatePayRequest).platepayUser!;
    const merchant = await MerchantModel.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          ...body,
          verificationStatus: "pending",
        },
        $setOnInsert: { userId: user._id, status: "active" },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    res.json(UpdateMerchantProfileResponse.parse(merchantJson(merchant)));
  },
);

router.get(
  "/merchant/dashboard",
  requireAppUser,
  requireRole("merchant"),
  async (req, res) => {
    const user = (req as PlatePayRequest).platepayUser!;
    const merchant = await MerchantModel.findOne({ userId: user._id });
    if (!merchant) {
      res.status(404).json({ error: "Set up your merchant profile to continue." });
      return;
    }
    const [completedPayments, completedValue, pendingRequests, requests] =
      await Promise.all([
        TransactionModel.countDocuments({
          merchantId: merchant._id,
          type: "merchant_payment",
          status: "completed",
        }),
        TransactionModel.aggregate([
          {
            $match: {
              merchantId: merchant._id,
              type: "merchant_payment",
              status: "completed",
            },
          },
          { $group: { _id: null, total: { $sum: "$amountFils" } } },
        ]),
        PaymentRequestModel.countDocuments({
          merchantId: merchant._id,
          status: "pending",
        }),
        PaymentRequestModel.find({ merchantId: merchant._id })
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
      ]);

    const result = {
      merchant: merchantJson(merchant),
      completedPayments,
      completedValueFils: completedValue[0]?.total ?? 0,
      pendingRequests,
      recentRequests: requests.map((request) => ({
        id: request._id.toString(),
        merchantId: merchant._id.toString(),
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
      })),
    };
    res.json(GetMerchantDashboardResponse.parse(result));
  },
);

export default router;
