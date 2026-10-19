import type { NextFunction, Request, Response } from "express";
import type { Types } from "mongoose";
import { UserModel } from "../models";
import { findSessionAccount } from "../lib/sessions";

export type AppRole = "driver" | "merchant" | "admin";
export interface AppUser {
  _id: Types.ObjectId;
  authAccountId: Types.ObjectId;
  email: string;
  displayName: string;
  role: AppRole;
  status: "active" | "suspended";
}
export interface PlatePayRequest extends Request {
  authAccount?: { _id: Types.ObjectId; email: string; displayName: string };
  platepayUser?: AppUser;
}
export async function requireSession(req: Request, res: Response, next: NextFunction) {
  const account = await findSessionAccount(req);
  if (!account) { res.status(401).json({ error: "Sign in to continue." }); return; }
  (req as PlatePayRequest).authAccount = account;
  next();
}
export async function requireAppUser(req: Request, res: Response, next: NextFunction) {
  const account = await findSessionAccount(req);
  if (!account) { res.status(401).json({ error: "Sign in to continue." }); return; }
  const user = await UserModel.findOne({ authAccountId: account._id });
  if (!user) { res.status(404).json({ error: "Complete your PlatePay profile first." }); return; }
  if (user.status !== "active") {
    res.status(403).json({ error: "This PlatePay account is suspended." }); return;
  }
  (req as PlatePayRequest).authAccount = account;
  (req as PlatePayRequest).platepayUser = user as unknown as AppUser;
  next();
}
export function requireRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as PlatePayRequest).platepayUser;
    if (!user) { res.status(401).json({ error: "Sign in to continue." }); return; }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "Your account does not have access to this area." }); return;
    }
    next();
  };
}
