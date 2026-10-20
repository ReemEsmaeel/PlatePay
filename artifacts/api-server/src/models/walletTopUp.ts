import { model, Schema } from "mongoose";

// An application funding intent, not a copy of the Stripe payment database.
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "PlatePayUser", required: true },
  attemptKey: { type: String, required: true },
  amountFils: { type: Number, min: 1000, max: 1_000_000, required: true },
  checkoutAmountCents: { type: Number, min: 1 },
  demoUsdCentsPerKwd: { type: Number, min: 1 },
  stripeSessionId: { type: String, default: null },
  creditedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });
schema.index({ userId: 1, attemptKey: 1 }, { unique: true });
schema.index({ stripeSessionId: 1 }, { unique: true, partialFilterExpression: { stripeSessionId: { $type: "string" } } });
export const WalletTopUpModel = model("PlatePayWalletTopUp", schema);
