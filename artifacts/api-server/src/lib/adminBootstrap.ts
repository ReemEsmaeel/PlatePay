import { clerkClient } from "@clerk/express";
import mongoose from "mongoose";
import { AuditLogModel, UserModel } from "../models";
import { isTrustedAdminEmail } from "./adminPolicy";

/**
 * Runs against the current environment's Clerk tenant and MongoDB database.
 * A completed grant is never repeated, even if the role is later revoked.
 * Accounts that have not signed up yet are handled during profile creation.
 */
export async function seedConfiguredAdmin(): Promise<void> {
  const email = process.env.PLATEPAY_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return;
  const account = await UserModel.findOne({
    email,
    status: "active",
    initialAdminGrantedAt: null,
  });
  if (!account) return;
  const identity = await clerkClient.users.getUser(account.clerkUserId);
  const primaryEmail = identity.emailAddresses.find(
    (item) => item.id === identity.primaryEmailAddressId,
  );
  if (!isTrustedAdminEmail(primaryEmail)) return;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const granted = await UserModel.findOneAndUpdate(
        { _id: account._id, initialAdminGrantedAt: null, status: "active" },
        { $set: { role: "admin", initialAdminGrantedAt: new Date() } },
        { session, new: true },
      );
      if (!granted) return;
      await AuditLogModel.create([{
        actorId: granted._id,
        actorName: "Owner bootstrap",
        action: "admin.initial_access_granted",
        targetType: "account",
        targetId: granted._id.toString(),
        details: { source: "owner_configured_verified_email" },
      }], { session });
    });
  } finally {
    await session.endSession();
  }
}
