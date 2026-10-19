import { createHmac, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import type { ClientSession } from "mongoose";
import { AuthAccountModel, AuthSessionModel } from "../models/auth";

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export function assertSessionSecret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters. Configure it through Secrets.");
  }
}
export function privateHash(value: string) {
  assertSessionSecret();
  return createHmac("sha256", process.env.SESSION_SECRET!).update(value).digest("hex");
}
function secureRequest(req: Request) {
  return req.secure || process.env.NODE_ENV === "production";
}
export function sessionCookieName(req: Request) {
  return secureRequest(req) ? "__Host-platepay_session" : "platepay_session";
}
export function sessionToken(req: Request): string | undefined {
  const value = req.cookies?.[sessionCookieName(req)];
  return typeof value === "string" && /^[a-zA-Z0-9_-]{43}$/.test(value) ? value : undefined;
}
export async function startSession(req: Request, res: Response, accountId: string, transaction?: ClientSession) {
  // Rotate any incoming session; never accept a client-chosen identifier.
  const previous = sessionToken(req);
  if (previous) await AuthSessionModel.deleteOne({ tokenHash: privateHash(previous) }, { session: transaction });
  const token = randomBytes(32).toString("base64url");
  await AuthSessionModel.create([{
    tokenHash: privateHash(token), accountId, expiresAt: new Date(Date.now() + SESSION_MS),
  }], { session: transaction });
  res.cookie(sessionCookieName(req), token, {
    httpOnly: true, secure: secureRequest(req), sameSite: "lax", path: "/", maxAge: SESSION_MS,
  });
}
export async function findSessionAccount(req: Request) {
  const token = sessionToken(req);
  if (!token) return null;
  const session = await AuthSessionModel.findOne({
    tokenHash: privateHash(token), expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;
  return AuthAccountModel.findById(session.accountId);
}
export async function endSession(req: Request, res: Response) {
  const token = sessionToken(req);
  if (token) await AuthSessionModel.deleteOne({ tokenHash: privateHash(token) });
  res.clearCookie(sessionCookieName(req), {
    httpOnly: true, secure: secureRequest(req), sameSite: "lax", path: "/",
  });
}
