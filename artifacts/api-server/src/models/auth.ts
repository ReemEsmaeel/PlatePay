import mongoose, { Schema } from "mongoose";

const accountSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  displayName: { type: String, required: true, trim: true, maxlength: 100 },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: true, versionKey: false });

const sessionSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  accountId: { type: Schema.Types.ObjectId, ref: "PlatePayAuthAccount", required: true, index: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, versionKey: false });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const rateLimitSchema = new Schema({
  _id: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthAccountModel = mongoose.models.PlatePayAuthAccount ??
  mongoose.model("PlatePayAuthAccount", accountSchema);
export const AuthSessionModel = mongoose.models.PlatePayAuthSession ??
  mongoose.model("PlatePayAuthSession", sessionSchema);
export const AuthRateLimitModel = mongoose.models.PlatePayAuthRateLimit ??
  mongoose.model("PlatePayAuthRateLimit", rateLimitSchema);
