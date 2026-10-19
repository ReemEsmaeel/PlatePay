import { Router, type IRouter, type RequestHandler } from "express";
import mongoose from "mongoose";
import { LoginAccountBody, RegisterAccountBody } from "@workspace/api-zod";
import { AuthAccountModel, AuthRateLimitModel } from "../models/auth";
import { UserModel } from "../models";
import { dummyPasswordHash, hashPassword, verifyPassword } from "../lib/password";
import { endSession, findSessionAccount, privateHash, startSession } from "../lib/sessions";

const router: IRouter = Router();
const publicAccount = (account: { _id: unknown; email: string; displayName: string }) => ({
  id: String(account._id), email: account.email, displayName: account.displayName,
});
const noStore: RequestHandler = (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); };
router.use("/auth", noStore);

const rateLimit: RequestHandler = async (req, res, next) => {
  const period = 15 * 60 * 1000;
  const window = Math.floor(Date.now() / period);
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase().slice(0, 254) : "";
  for (const [key, limit] of [[`ip:${req.ip}`, 50], [`email:${email}`, 10]] as const) {
    const id = privateHash(`auth:${key}:${window}`);
    let bucket;
    try {
      bucket = await AuthRateLimitModel.findOneAndUpdate(
        { _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * period) } },
        { upsert: true, new: true },
      );
    } catch (error) {
      // Concurrent first requests can race on a newly-created unique bucket.
      if ((error as { code?: number }).code !== 11000) throw error;
      bucket = await AuthRateLimitModel.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { new: true });
    }
    if (!bucket || bucket.count > limit) {
      res.set("Retry-After", String(Math.ceil(((window + 1) * period - Date.now()) / 1000)));
      res.status(429).json({ error: "Too many sign-in attempts. Please try again later." }); return;
    }
  }
  next();
};
function normalizedInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const input = body as Record<string, unknown>;
  return {
    ...input,
    email: typeof input.email === "string" ? input.email.trim().toLowerCase() : input.email,
    ...(typeof input.displayName === "string" ? { displayName: input.displayName.trim() } : {}),
  };
}
router.get("/auth/session", async (req, res) => {
  const account = await findSessionAccount(req);
  if (account) {
    const profile = await UserModel.findOne({ authAccountId: account._id }).select("status").lean();
    if (profile?.status === "suspended") {
      await endSession(req, res);
      res.json({ account: null }); return;
    }
  }
  res.json({ account: account ? publicAccount(account) : null });
});
router.post("/auth/register", rateLimit, async (req, res) => {
  const parsed = RegisterAccountBody.strict().safeParse(normalizedInput(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email, a name, and a password between 12 and 128 characters." }); return;
  }
  const { email, password, displayName } = parsed.data;
  if (await AuthAccountModel.exists({ email })) {
    res.status(409).json({ error: "An account already uses that email. Please sign in." }); return;
  }
  const passwordHash = await hashPassword(password);
  const transaction = await mongoose.startSession();
  try {
    let account;
    // Account + session creation are atomic, so a failed registration cannot strand an account.
    await transaction.withTransaction(async () => {
      const [created] = await AuthAccountModel.create([{ email, displayName, passwordHash }], { session: transaction });
      account = created;
      await startSession(req, res, String(created!._id), transaction);
    });
    if (!account) throw new Error("Account creation did not complete.");
    res.status(201).json({ account: publicAccount(account) });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ error: "An account already uses that email. Please sign in." }); return;
    }
    throw error;
  } finally { await transaction.endSession(); }
});
router.post("/auth/login", rateLimit, async (req, res) => {
  const parsed = LoginAccountBody.strict().safeParse(normalizedInput(req.body));
  if (!parsed.success) { res.status(400).json({ error: "Enter a valid email and password." }); return; }
  const { email, password } = parsed.data;
  const account = await AuthAccountModel.findOne({ email }).select("+passwordHash");
  const correct = await verifyPassword(password, account?.passwordHash ?? dummyPasswordHash);
  if (!account || !correct) {
    res.status(401).json({ error: "Email or password is incorrect." }); return;
  }
  const profile = await UserModel.findOne({ authAccountId: account._id }).select("status").lean();
  if (profile?.status === "suspended") {
    res.status(403).json({ error: "This PlatePay account is suspended." }); return;
  }
  await startSession(req, res, String(account._id));
  res.json({ account: publicAccount(account) });
});
router.post("/auth/logout", async (req, res) => {
  await endSession(req, res); res.status(204).end();
});
export default router;
