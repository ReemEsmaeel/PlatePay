import { randomBytes, randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { AuthAccountModel, AuthRateLimitModel } from "../models/auth";
import { MerchantModel, PaymentRequestModel, SpendingLimitModel, TransactionModel, UserModel, VehicleModel, WalletModel } from "../models";
import { requireAppUser, type PlatePayRequest } from "../middlewares/auth";
import { endSession, findSessionAccount, privateHash, startSession } from "../lib/sessions";
import { hashPassword } from "../lib/password";
import { normalizePlate, plateForScenario } from "../lib/plate";

export const demoRouter = Router();
const jsonRecord = <T extends { _id: unknown }>(row: T) => {
  const { _id, ...rest } = row;
  return { ...rest, id: String(_id) };
};

async function demoPair(scenarioId: string) {
  const members = await UserModel.find({ demoScenarioId: scenarioId, status: "active" }).lean();
  const driver = members.find(member => member.role === "driver");
  const merchantUser = members.find(member => member.role === "merchant");
  const merchant = merchantUser && await MerchantModel.findOne({ userId: merchantUser._id }).lean();
  if (!driver || !merchantUser || !merchant) throw new Error("Demo accounts are unavailable.");
  return { driver, merchantUser, merchant };
}

async function state(scenarioId: string, role: string) {
  const { driver, merchant } = await demoPair(scenarioId);
  const [vehicle, wallet, requests, driverHistory, merchantHistory] = await Promise.all([
    VehicleModel.findOne({ userId: driver._id, status: "active" }).lean(),
    WalletModel.findOne({ userId: driver._id }).lean(),
    PaymentRequestModel.find({ driverId: driver._id, merchantId: merchant._id }).sort({ createdAt: -1 }).limit(30).lean(),
    TransactionModel.find({ driverId: driver._id, merchantId: merchant._id }).sort({ createdAt: -1 }).limit(30).lean(),
    TransactionModel.find({ merchantId: merchant._id, driverId: driver._id }).sort({ createdAt: -1 }).limit(30).lean(),
  ]);
  if (!vehicle || !wallet) throw new Error("Demo vehicle or wallet is unavailable.");
  return {
    role, plateNumber: vehicle.plateNumber, balanceFils: wallet.balanceFils,
    driverName: driver.displayName, merchantName: merchant.businessName,
    location: { latitude: merchant.latitude, longitude: merchant.longitude },
    requests: requests.map(jsonRecord),
    histories: { driver: driverHistory.map(jsonRecord), merchant: merchantHistory.map(jsonRecord) },
  };
}

demoRouter.post("/demo/start", async (req, res) => {
  const account = await findSessionAccount(req);
  if (account) {
    const user = await UserModel.findOne({ authAccountId: account._id });
    if (user?.demoScenarioId && user.status === "active") {
      res.json(await state(user.demoScenarioId, user.role)); return;
    }
    res.status(409).json({ error: "Sign out of your current account before starting a private demo." }); return;
  }
  const hour = Math.floor(Date.now() / 3_600_000);
  const bucketId = privateHash(`demo-start:${req.ip}:${hour}`);
  let bucket;
  try {
    bucket = await AuthRateLimitModel.findOneAndUpdate({ _id: bucketId }, {
      $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((hour + 2) * 3_600_000) },
    }, { upsert: true, new: true });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    bucket = await AuthRateLimitModel.findOneAndUpdate({ _id: bucketId }, { $inc: { count: 1 } }, { new: true });
  }
  if (!bucket || bucket.count > 12) {
    res.set("Retry-After", "3600").status(429).json({ error: "Too many new demos. Resume your existing demo or try again later." }); return;
  }
  const scenario = randomUUID();
  // No public demo password or shared account; all identities are server-owned.
  const passwordHash = await hashPassword(randomBytes(48).toString("base64url"));
  const transaction = await mongoose.startSession();
  try {
    await transaction.withTransaction(async () => {
      const accounts = await AuthAccountModel.create([
        { email: `demo-driver-${scenario}@platepay.example`, displayName: "Demo Driver", passwordHash, demoScenarioId: scenario },
        { email: `demo-merchant-${scenario}@platepay.example`, displayName: "Demo Merchant", passwordHash, demoScenarioId: scenario },
      ], { session: transaction, ordered: true });
      const users = await UserModel.create(accounts.map((created, index) => ({
        authAccountId: created._id, email: created.email, displayName: created.displayName,
        role: index === 0 ? "driver" : "merchant", status: "active", demoScenarioId: scenario,
      })), { session: transaction, ordered: true });
      const driver = users[0]!, merchantUser = users[1]!;
      await VehicleModel.create([{
        userId: driver._id, plateNumber: "1234567",
        normalizedPlate: plateForScenario("1234567", scenario), nickname: "Demo car", status: "active",
      }], { session: transaction });
      await MerchantModel.create([{
        userId: merchantUser._id, businessName: "Demo Seaside Drive-Thru",
        serviceCategory: "drive_thru", locationName: "Simulated Kuwait location",
        latitude: 29.3759, longitude: 47.9774, geofenceRadiusMeters: 150,
        status: "active", verificationStatus: "verified",
      }], { session: transaction });
      await WalletModel.create([{ userId: driver._id, balanceFils: 20_000, currency: "KWD" }], { session: transaction });
      await SpendingLimitModel.create([{
        userId: driver._id, dailyLimitFils: 100_000, perTransactionLimitFils: 20_000,
      }], { session: transaction });
      await startSession(req, res, String(merchantUser.authAccountId), transaction);
    });
  } finally { await transaction.endSession(); }
  res.status(201).json(await state(scenario, "merchant"));
});

demoRouter.use("/demo", requireAppUser, (req, res, next) => {
  if (!(req as PlatePayRequest).platepayUser!.demoScenarioId) {
    res.status(404).json({ error: "This account is not a guided demo account." }); return;
  }
  next();
});
demoRouter.get("/demo", async (req, res) => {
  const user = (req as PlatePayRequest).platepayUser!;
  res.json(await state(user.demoScenarioId!, user.role));
});
demoRouter.post("/demo/switch", async (req, res) => {
  const role = req.body?.role;
  if (!["driver", "merchant"].includes(role) || Object.keys(req.body ?? {}).some(key => key !== "role")) {
    res.status(400).json({ error: "Choose demo driver or merchant." }); return;
  }
  const user = (req as PlatePayRequest).platepayUser!;
  const { driver, merchantUser } = await demoPair(user.demoScenarioId!);
  await startSession(req, res, String((role === "driver" ? driver : merchantUser).authAccountId));
  res.json(await state(user.demoScenarioId!, role));
});
demoRouter.patch("/demo/plate", async (req, res) => {
  const user = (req as PlatePayRequest).platepayUser!;
  if (user.role !== "merchant") { res.status(403).json({ error: "Switch to the demo merchant to read a plate." }); return; }
  const plate = typeof req.body?.plateNumber === "string" ? normalizePlate(req.body.plateNumber) : "";
  if (!/^\d{2,8}$/.test(plate)) { res.status(400).json({ error: "Review the Kuwait plate: enter 2–8 digits without spaces." }); return; }
  const { driver } = await demoPair(user.demoScenarioId!);
  if (await PaymentRequestModel.exists({ driverId: driver._id })) {
    res.status(409).json({ error: "The demo plate cannot change after a payment request. Start a new demo to try another plate." }); return;
  }
  await VehicleModel.updateOne({ userId: driver._id, status: "active" }, {
    $set: { plateNumber: plate, normalizedPlate: plateForScenario(plate, user.demoScenarioId) },
  });
  res.json(await state(user.demoScenarioId!, user.role));
});
demoRouter.post("/demo/end", async (req: Request, res: Response) => {
  await endSession(req, res);
  res.json({ success: true });
});
