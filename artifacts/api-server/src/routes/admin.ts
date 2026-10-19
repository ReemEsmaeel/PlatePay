import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import {
  ListAdminAccountsQueryParams,
  ListAdminMerchantsQueryParams,
  ListAdminTransactionsQueryParams,
  UpdateAccountStatusBody,
  UpdateAccountStatusParams,
  UpdateMerchantStatusBody,
  UpdateMerchantStatusParams,
} from "@workspace/api-zod";
import { validate } from "../lib/validation";
import { requireAppUser, requireRole, type PlatePayRequest } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { AuditLogModel, MerchantModel, PaymentRequestModel, TransactionModel, UserModel, VehicleModel } from "../models";
import { AuthSessionModel } from "../models/auth";

const router: IRouter = Router();
router.use("/admin", requireAppUser, requireRole("admin"));

router.get("/admin/overview", async (_req, res) => {
  const [driverCount, merchantCount, vehicleCount, completedTransactionCount, values, pendingRequestCount] = await Promise.all([
    UserModel.countDocuments({ role: "driver" }),
    MerchantModel.countDocuments(),
    VehicleModel.countDocuments({ status: "active" }),
    TransactionModel.countDocuments({ status: "completed", type: "merchant_payment" }),
    TransactionModel.aggregate([
      { $match: { status: "completed", type: "merchant_payment" } },
      { $group: { _id: null, total: { $sum: "$amountFils" } } },
    ]),
    PaymentRequestModel.countDocuments({ status: "pending", expiresAt: { $gt: new Date() } }),
  ]);
  res.json({ driverCount, merchantCount, vehicleCount, completedTransactionCount, completedValueFils: values[0]?.total ?? 0, pendingRequestCount });
});

router.get("/admin/accounts", async (req, res) => {
  const query = validate(ListAdminAccountsQueryParams, req.query, res);
  if (!query) return;
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  const accounts = await UserModel.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  const vehicles = await VehicleModel.find({ userId: { $in: accounts.map((a) => a._id) } }).lean();
  res.json(accounts.map((account) => ({
    id: account._id.toString(), displayName: account.displayName, email: account.email,
    role: account.role, status: account.status, createdAt: account.createdAt.toISOString(),
    plateNumbers: vehicles.filter((v) => v.userId.equals(account._id)).map((v) => v.plateNumber),
  })));
});

router.patch("/admin/accounts/:accountId/status", async (req, res) => {
  const params = validate(UpdateAccountStatusParams, req.params, res);
  const body = validate(UpdateAccountStatusBody, req.body, res);
  if (!params || !body) return;
  const actor = (req as PlatePayRequest).platepayUser!;
  if (!mongoose.isValidObjectId(params.accountId)) {
    res.status(404).json({ error: "Account not found." }); return;
  }
  const account = await UserModel.findById(params.accountId);
  if (!account) { res.status(404).json({ error: "Account not found." }); return; }
  if (account.role === "admin" && body.status === "suspended") {
    res.status(400).json({ error: "Admin accounts cannot be suspended through this control." }); return;
  }
  account.status = body.status;
  await account.save();
  if (body.status === "suspended") {
    await AuthSessionModel.deleteMany({ accountId: account.authAccountId });
  }
  await writeAuditLog({ actorId: actor._id, actorName: actor.displayName, action: "account.status_changed", targetType: "account", targetId: account._id.toString(), details: { status: body.status } });
  const vehicles = await VehicleModel.find({ userId: account._id }).lean();
  res.json({ id: account._id.toString(), displayName: account.displayName, email: account.email, role: account.role, status: account.status, plateNumbers: vehicles.map((v) => v.plateNumber), createdAt: account.createdAt.toISOString() });
});

router.get("/admin/merchants", async (req, res) => {
  const query = validate(ListAdminMerchantsQueryParams, req.query, res);
  if (!query) return;
  const merchants = await MerchantModel.find(query.status ? { status: query.status } : {}).sort({ createdAt: -1 }).limit(200).lean();
  const owners = await UserModel.find({ _id: { $in: merchants.map((m) => m.userId) } }).lean();
  const ownerMap = new Map(owners.map((o) => [o._id.toString(), o]));
  res.json(merchants.map((m) => ({
    id: m._id.toString(), businessName: m.businessName, ownerName: ownerMap.get(m.userId.toString())?.displayName ?? "Unavailable",
    email: ownerMap.get(m.userId.toString())?.email ?? "", serviceCategory: m.serviceCategory, locationName: m.locationName,
    status: m.status, verificationStatus: m.verificationStatus, createdAt: m.createdAt.toISOString(),
  })));
});

router.patch("/admin/merchants/:merchantId/status", async (req, res) => {
  const params = validate(UpdateMerchantStatusParams, req.params, res);
  const body = validate(UpdateMerchantStatusBody, req.body, res);
  if (!params || !body) return;
  if (!body.status && !body.verificationStatus) { res.status(400).json({ error: "Select a status to update." }); return; }
  if (!mongoose.isValidObjectId(params.merchantId)) { res.status(404).json({ error: "Merchant not found." }); return; }
  const merchant = await MerchantModel.findById(params.merchantId);
  if (!merchant) { res.status(404).json({ error: "Merchant not found." }); return; }
  if (body.status) merchant.status = body.status;
  if (body.verificationStatus) merchant.verificationStatus = body.verificationStatus;
  await merchant.save();
  const actor = (req as PlatePayRequest).platepayUser!;
  await writeAuditLog({ actorId: actor._id, actorName: actor.displayName, action: "merchant.status_changed", targetType: "merchant", targetId: merchant._id.toString(), details: body });
  const owner = await UserModel.findById(merchant.userId);
  res.json({ id: merchant._id.toString(), businessName: merchant.businessName, ownerName: owner?.displayName ?? "Unavailable", email: owner?.email ?? "", serviceCategory: merchant.serviceCategory, locationName: merchant.locationName, status: merchant.status, verificationStatus: merchant.verificationStatus, createdAt: merchant.createdAt.toISOString() });
});

router.get("/admin/transactions", async (req, res) => {
  const query = validate(ListAdminTransactionsQueryParams, req.query, res);
  if (!query) return;
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.merchantId) {
    if (!mongoose.isValidObjectId(query.merchantId)) { res.status(400).json({ error: "Invalid merchant identifier." }); return; }
    filter.merchantId = query.merchantId;
  }
  if (query.dateFrom || query.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (query.dateFrom) createdAt.$gte = new Date(`${query.dateFrom}T00:00:00+03:00`);
    if (query.dateTo) createdAt.$lte = new Date(`${query.dateTo}T23:59:59.999+03:00`);
    if (Object.values(createdAt).some((date) => Number.isNaN(date.getTime()))) { res.status(400).json({ error: "Invalid date filter." }); return; }
    filter.createdAt = createdAt;
  }
  const transactions = await TransactionModel.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  const drivers = await UserModel.find({ _id: { $in: transactions.map((t) => t.driverId) } }).select("displayName").lean();
  const names = new Map(drivers.map((d) => [d._id.toString(), d.displayName]));
  res.json(transactions.map((t) => ({
    id: t._id.toString(), driverName: names.get(t.driverId.toString()) ?? "Unavailable", merchantName: t.merchantName || "Wallet top-up",
    plateNumber: t.plateNumber || "", serviceCategory: t.serviceCategory ?? null, amountFils: t.amountFils,
    currency: t.currency, status: t.status, createdAt: t.createdAt.toISOString(),
  })));
});

router.get("/admin/audit-logs", async (_req, res) => {
  const logs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json(logs.map((entry) => ({ id: entry._id.toString(), actorName: entry.actorName, action: entry.action, targetType: entry.targetType, targetId: entry.targetId, createdAt: entry.createdAt.toISOString() })));
});

export default router;
