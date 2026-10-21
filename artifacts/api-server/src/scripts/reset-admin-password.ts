import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import mongoose from "mongoose";
import { connectMongoDB } from "../db/mongo";
import { AuthAccountModel, AuthSessionModel } from "../models/auth";
import { hashPassword } from "../lib/password";

async function main() {
  if (!process.stdin.isTTY) {
    throw new Error("Run this command in an interactive terminal. Do not pass passwords as arguments.");
  }

  const email = process.env.PLATEPAY_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error("Configure PLATEPAY_ADMIN_EMAIL before running this command.");
  }

  await connectMongoDB();
  const account = await AuthAccountModel.findOne({ email }).select("_id");
  if (!account) {
    throw new Error("No account exists for the configured administrator email. No changes were made.");
  }

  const mutedOutput = new Writable({
    write(_chunk, _encoding, done) { done(); },
  });
  const prompt = createInterface({ input: process.stdin, output: mutedOutput, terminal: true });
  let password: string;
  let confirmation: string;
  try {
    process.stdout.write("New password (8–128 characters, hidden): ");
    password = await prompt.question("");
    process.stdout.write("Confirm new password (hidden): ");
    confirmation = await prompt.question("");
  } finally {
    prompt.close();
    process.stdout.write("\n");
  }

  if (password.length < 8 || password.length > 128) {
    throw new Error("Password must be between 8 and 128 characters. No changes were made.");
  }
  if (password !== confirmation) {
    throw new Error("Passwords did not match. No changes were made.");
  }

  const passwordHash = await hashPassword(password);
  const session = await mongoose.startSession();
  let invalidatedSessions = 0;
  try {
    await session.withTransaction(async () => {
      const update = await AuthAccountModel.updateOne(
        { _id: account._id, email },
        { $set: { passwordHash } },
        { session },
      );
      if (update.matchedCount !== 1) {
        throw new Error("The configured administrator account changed. No password was reset.");
      }
      const deleted = await AuthSessionModel.deleteMany({ accountId: account._id }, { session });
      invalidatedSessions = deleted.deletedCount;
    });
  } finally {
    await session.endSession();
  }

  process.stdout.write(
    `Password reset for the configured administrator account. ${invalidatedSessions} existing session(s) invalidated; account roles and other data were unchanged.\n`,
  );
}

main()
  .catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : "Admin password reset failed."}\n`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
