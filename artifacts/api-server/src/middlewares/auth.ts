import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type { Types } from "mongoose";
import { UserModel } from "../models";

export type AppRole = "driver" | "merchant" | "admin";

export interface AppUser {
  _id: Types.ObjectId;
  clerkUserId: string;
  email: string;
  displayName: string;
  role: AppRole;
  status: "active" | "suspended";
}

export interface PlatePayRequest extends Request {
  clerkUserId?: string;
  platepayUser?: AppUser;
}

export async function requireClerkSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  (req as PlatePayRequest).clerkUserId = userId;
  next();
}

export async function requireAppUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }

  try {
    const user = await UserModel.findOne({ clerkUserId: userId });
    if (!user) {
      res.status(404).json({ error: "Complete your PlatePay profile first." });
      return;
    }
    if (user.status !== "active") {
      res.status(403).json({ error: "This PlatePay account is suspended." });
      return;
    }
    (req as PlatePayRequest).clerkUserId = userId;
    (req as PlatePayRequest).platepayUser = user as unknown as AppUser;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as PlatePayRequest).platepayUser;
    if (!user) {
      res.status(401).json({ error: "Sign in to continue." });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "Your account does not have access to this area." });
      return;
    }
    next();
  };
}
