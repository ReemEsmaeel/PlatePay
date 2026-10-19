import mongoose from "mongoose";
import { AuditLogModel, UserModel } from "../models";
import { AuthAccountModel } from "../models/auth";
import { verifyPassword } from "./password";

/** Operator-only function: never exposed through a public API or run automatically. */
export async function grantConfiguredAdmin(password: string): Promise<void> {
  const email = process.env.PLATEPAY_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("Configure PLATEPAY_ADMIN_EMAIL before running this command.");
  const account = await AuthAccountModel.findOne({ email }).select("+passwordHash");
  if (!account || !await verifyPassword(password, account.passwordHash)) {
    throw new Error("The configured account and password did not match. No access was granted.");
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const user = await UserModel.findOneAndUpdate(
        { authAccountId: account._id, status: "active", initialAdminGrantedAt: null },
        { $set: { role: "admin", initialAdminGrantedAt: new Date() } },
        { session, new: true },
      );
      if (!user) throw new Error("Complete an active profile first. Previously granted access is not automatically restored.");
      await AuditLogModel.create([{
        actorId: user._id, actorName: "Owner CLI", action: "admin.initial_access_granted",
        targetType: "account", targetId: user._id.toString(),
        details: { source: "operator_command_with_password_proof" },
      }], { session });
    });
  } finally { await session.endSession(); }
}
