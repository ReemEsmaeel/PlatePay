import { clerkClient } from "@clerk/express";
import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import {
  CreateProfileBody,
  CreateVehicleBody,
  DeleteVehicleParams,
  ListServicesQueryParams,
  UpdateVehicleBody,
  UpdateVehicleParams,
} from "@workspace/api-zod";
import {
  MerchantModel,
  SpendingLimitModel,
  UserModel,
  VehicleModel,
  WalletModel,
} from "../models";
import {
  requireAppUser,
  requireClerkSession,
  requireRole,
  type PlatePayRequest,
} from "../middlewares/auth";
import { normalizePlate } from "../lib/plate";
import { validate } from "../lib/validation";

const router: IRouter = Router();

function profileJson(user: {
  _id: mongoose.Types.ObjectId;
  clerkUserId: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  createdAt: Date;
}) {
  return {
    id: user._id.toString(),
    clerkUserId: user.clerkUserId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

function vehicleJson(vehicle: {
  _id: mongoose.Types.ObjectId;
  plateNumber: string;
  normalizedPlate: string;
  nickname: string | null;
  status: string;
  createdAt: Date;
}) {
  return {
    id: vehicle._id.toString(),
    plateNumber: vehicle.plateNumber,
    normalizedPlate: vehicle.normalizedPlate,
    nickname: vehicle.nickname ?? null,
    status: vehicle.status,
    createdAt: vehicle.createdAt.toISOString(),
  };
}

router.get("/auth/me", requireAppUser, async (req, res) => {
  const user = (req as PlatePayRequest).platepayUser!;
  const profile = await UserModel.findById(user._id);
  if (!profile) {
    res.status(404).json({ error: "PlatePay profile not found." });
    return;
  }
  res.json(profileJson(profile));
});

router.post("/auth/profile", requireClerkSession, async (req, res) => {
  const body = validate(CreateProfileBody, req.body, res);
  if (!body) return;
  const clerkUserId = (req as PlatePayRequest).clerkUserId!;

  try {
    const existing = await UserModel.findOne({ clerkUserId });
    if (existing) {
      res.status(409).json({ error: "A PlatePay profile already exists." });
      return;
    }

    const identity = await clerkClient.users.getUser(clerkUserId);
    const primaryEmail =
      identity.emailAddresses.find(
        (item) => item.id === identity.primaryEmailAddressId,
      )?.emailAddress ?? identity.emailAddresses[0]?.emailAddress;
    if (!primaryEmail) {
      res.status(400).json({ error: "Add a verified email to your Clerk account first." });
      return;
    }

    const session = await mongoose.startSession();
    let created:
      | Awaited<ReturnType<typeof UserModel.create>>[number]
      | undefined;
    try {
      await session.withTransaction(async () => {
        const [user] = await UserModel.create(
          [
            {
              clerkUserId,
              email: primaryEmail,
              displayName: body.displayName.trim(),
              role: body.role,
              status: "active",
            },
          ],
          { session },
        );
        created = user;
        if (body.role === "driver") {
          await WalletModel.updateOne(
            { userId: user._id },
            { $setOnInsert: { userId: user._id, balanceFils: 0, currency: "KWD" } },
            { upsert: true, session },
          );
          await SpendingLimitModel.updateOne(
            { userId: user._id },
            { $setOnInsert: { userId: user._id } },
            { upsert: true, session },
          );
        }
      });
    } finally {
      await session.endSession();
    }
    if (!created) {
      res.status(500).json({ error: "Unable to create the PlatePay profile." });
      return;
    }
    res.status(201).json(profileJson(created));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({ error: "A PlatePay profile already exists." });
      return;
    }
    throw error;
  }
});

router.get(
  "/vehicles",
  requireAppUser,
  requireRole("driver"),
  async (req, res) => {
    const user = (req as PlatePayRequest).platepayUser!;
    const vehicles = await VehicleModel.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(vehicles.map(vehicleJson));
  },
);

router.post(
  "/vehicles",
  requireAppUser,
  requireRole("driver"),
  async (req, res) => {
    const body = validate(CreateVehicleBody, req.body, res);
    if (!body) return;
    const user = (req as PlatePayRequest).platepayUser!;
    const normalizedPlate = normalizePlate(body.plateNumber);
    if (normalizedPlate.length < 2) {
      res.status(400).json({ error: "Enter a valid vehicle plate." });
      return;
    }
    try {
      const vehicle = await VehicleModel.create({
        userId: user._id,
        plateNumber: body.plateNumber.trim(),
        normalizedPlate,
        nickname: body.nickname?.trim() || null,
        status: "active",
      });
      res.status(201).json(vehicleJson(vehicle));
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        res.status(409).json({ error: "This plate is already linked to a PlatePay account." });
        return;
      }
      throw error;
    }
  },
);

router.patch(
  "/vehicles/:vehicleId",
  requireAppUser,
  requireRole("driver"),
  async (req, res) => {
    const params = validate(UpdateVehicleParams, req.params, res);
    const body = validate(UpdateVehicleBody, req.body, res);
    if (!params || !body) return;
    const user = (req as PlatePayRequest).platepayUser!;
    const update: Record<string, unknown> = {};
    if (body.plateNumber !== undefined) {
      update.plateNumber = body.plateNumber.trim();
      update.normalizedPlate = normalizePlate(body.plateNumber);
    }
    if (body.nickname !== undefined) update.nickname = body.nickname?.trim() || null;
    if (body.status !== undefined) update.status = body.status;
    try {
      const vehicle = await VehicleModel.findOneAndUpdate(
        { _id: params.vehicleId, userId: user._id },
        { $set: update },
        { new: true, runValidators: true },
      );
      if (!vehicle) {
        res.status(404).json({ error: "Vehicle not found." });
        return;
      }
      res.json(vehicleJson(vehicle));
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        res.status(409).json({ error: "This plate is already linked to a PlatePay account." });
        return;
      }
      throw error;
    }
  },
);

router.delete(
  "/vehicles/:vehicleId",
  requireAppUser,
  requireRole("driver"),
  async (req, res) => {
    const params = validate(DeleteVehicleParams, req.params, res);
    if (!params) return;
    const user = (req as PlatePayRequest).platepayUser!;
    const vehicle = await VehicleModel.findOneAndUpdate(
      { _id: params.vehicleId, userId: user._id, status: "active" },
      { $set: { status: "inactive" } },
    );
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found." });
      return;
    }
    res.status(204).end();
  },
);

router.get("/services", async (req, res) => {
  const query = validate(ListServicesQueryParams, req.query, res);
  if (!query) return;
  const filter: Record<string, unknown> = {
    status: "active",
    verificationStatus: "verified",
  };
  if (query.category) filter.serviceCategory = query.category;
  const merchants = await MerchantModel.find(filter).sort({ businessName: 1 }).lean();
  const owners = await UserModel.find({
    _id: { $in: merchants.map((merchant) => merchant.userId) },
    status: "active",
  })
    .select("_id displayName")
    .lean();
  const ownerNames = new Map(owners.map((owner) => [owner._id.toString(), owner.displayName]));
  res.json(
    merchants.map((merchant) => ({
      id: merchant._id.toString(),
      merchantName: merchant.businessName || ownerNames.get(merchant.userId.toString()) || "Merchant",
      category: merchant.serviceCategory,
      locationName: merchant.locationName,
      latitude: merchant.latitude,
      longitude: merchant.longitude,
      geofenceRadiusMeters: merchant.geofenceRadiusMeters,
    })),
  );
});

export default router;
