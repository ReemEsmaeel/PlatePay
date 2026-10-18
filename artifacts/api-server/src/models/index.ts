import mongoose, { Schema, type InferSchemaType } from "mongoose";

const serviceCategories = ["drive_thru", "fuel", "parking", "car_wash", "other"] as const;
const accountStatuses = ["active", "suspended"] as const;

const userSchema = new Schema(
  {
    clerkUserId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    role: { type: String, enum: ["driver", "merchant", "admin"], required: true },
    status: { type: String, enum: accountStatuses, default: "active", required: true },
  },
  { timestamps: true, versionKey: false },
);

const vehicleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "PlatePayUser", required: true, index: true },
    plateNumber: { type: String, required: true, trim: true },
    normalizedPlate: { type: String, required: true, uppercase: true, trim: true },
    nickname: { type: String, default: null, trim: true, maxlength: 60 },
    status: { type: String, enum: ["active", "inactive"], default: "active", required: true },
  },
  { timestamps: true, versionKey: false },
);
vehicleSchema.index({ normalizedPlate: 1 }, { unique: true });
vehicleSchema.index({ userId: 1, status: 1 });

const merchantSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "PlatePayUser", required: true, unique: true, index: true },
    businessName: { type: String, required: true, trim: true, maxlength: 120 },
    serviceCategory: { type: String, enum: serviceCategories, required: true },
    locationName: { type: String, required: true, trim: true, maxlength: 120 },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    geofenceRadiusMeters: { type: Number, required: true, min: 25, max: 5000, default: 150 },
    status: { type: String, enum: accountStatuses, default: "active", required: true },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

const paymentRequestSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "PlatePayMerchant", required: true, index: true },
    driverId: { type: Schema.Types.ObjectId, ref: "PlatePayUser", required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: "PlatePayVehicle", required: true },
    merchantName: { type: String, required: true },
    plateNumber: { type: String, required: true },
    normalizedPlate: { type: String, required: true, index: true },
    serviceCategory: { type: String, enum: serviceCategories, required: true },
    amountFils: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ["KWD"], default: "KWD", required: true },
    description: { type: String, default: null, maxlength: 240 },
    orderReference: { type: String, default: null, maxlength: 80 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired", "failed"],
      default: "pending",
      required: true,
      index: true,
    },
    idempotencyKey: { type: String, default: null },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) },
    decidedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null, maxlength: 240 },
  },
  { timestamps: true, versionKey: false },
);
paymentRequestSchema.index({ driverId: 1, status: 1, createdAt: -1 });
paymentRequestSchema.index({ merchantId: 1, createdAt: -1 });

const walletSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "PlatePayUser", required: true, unique: true, index: true },
    balanceFils: { type: Number, min: 0, default: 0, required: true },
    currency: { type: String, enum: ["KWD"], default: "KWD", required: true },
  },
  { timestamps: true, versionKey: false },
);

const walletEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "PlatePayUser", required: true, index: true },
    type: { type: String, enum: ["merchant_payment", "wallet_top_up", "refund"], required: true },
    status: { type: String, enum: ["pending", "completed", "rejected", "failed", "refunded"], required: true },
    amountFils: { type: Number, required: true },
    currency: { type: String, enum: ["KWD"], default: "KWD", required: true },
    description: { type: String, required: true },
    paymentRequestId: { type: Schema.Types.ObjectId, ref: "PlatePayPaymentRequest", default: null },
    stripeSessionId: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);
walletEntrySchema.index(
  { paymentRequestId: 1 },
  { unique: true, partialFilterExpression: { paymentRequestId: { $type: "objectId" } } },
);
walletEntrySchema.index({ userId: 1, createdAt: -1 });
walletEntrySchema.index(
  { stripeSessionId: 1 },
  { unique: true, partialFilterExpression: { stripeSessionId: { $type: "string" } } },
);

const spendingLimitSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "PlatePayUser", required: true, unique: true, index: true },
    dailyLimitFils: { type: Number, min: 1000, max: 10_000_000, default: 100_000, required: true },
    perTransactionLimitFils: { type: Number, min: 100, max: 1_000_000, default: 20_000, required: true },
    spentTodayFils: { type: Number, min: 0, default: 0, required: true },
    spentOnDate: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false },
);

const transactionSchema = new Schema(
  {
    driverId: { type: Schema.Types.ObjectId, ref: "PlatePayUser", required: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: "PlatePayMerchant", default: null, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: "PlatePayVehicle", default: null },
    paymentRequestId: { type: Schema.Types.ObjectId, ref: "PlatePayPaymentRequest", default: null },
    type: { type: String, enum: ["merchant_payment", "wallet_top_up", "refund"], required: true },
    status: { type: String, enum: ["pending", "completed", "rejected", "failed", "refunded"], required: true, index: true },
    amountFils: { type: Number, required: true },
    currency: { type: String, enum: ["KWD"], default: "KWD", required: true },
    merchantName: { type: String, default: "" },
    plateNumber: { type: String, default: "" },
    serviceCategory: { type: String, enum: [...serviceCategories, null], default: null },
    stripeSessionId: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);
transactionSchema.index({ driverId: 1, createdAt: -1 });
transactionSchema.index({ merchantId: 1, createdAt: -1 });
transactionSchema.index(
  { paymentRequestId: 1 },
  { unique: true, partialFilterExpression: { paymentRequestId: { $type: "objectId" } } },
);
transactionSchema.index(
  { stripeSessionId: 1 },
  { unique: true, partialFilterExpression: { stripeSessionId: { $type: "string" } } },
);

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "PlatePayUser", required: true, index: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);
auditLogSchema.index({ createdAt: -1 });

function model<T>(name: string, schema: Schema<T>) {
  return (mongoose.models[name] as mongoose.Model<T> | undefined) ??
    mongoose.model<T>(name, schema);
}

export const UserModel = model("PlatePayUser", userSchema);
export const VehicleModel = model("PlatePayVehicle", vehicleSchema);
export const MerchantModel = model("PlatePayMerchant", merchantSchema);
export const PaymentRequestModel = model("PlatePayPaymentRequest", paymentRequestSchema);
export const WalletModel = model("PlatePayWallet", walletSchema);
export const WalletEntryModel = model("PlatePayWalletEntry", walletEntrySchema);
export const SpendingLimitModel = model("PlatePaySpendingLimit", spendingLimitSchema);
export const TransactionModel = model("PlatePayTransaction", transactionSchema);
export const AuditLogModel = model("PlatePayAuditLog", auditLogSchema);

export type UserDocument = InferSchemaType<typeof userSchema>;
export type VehicleDocument = InferSchemaType<typeof vehicleSchema>;
export type MerchantDocument = InferSchemaType<typeof merchantSchema>;
