import type { RequestHandler } from "express";

/** No cross-origin CORS access. Browser mutations require a non-simple header. */
export const requireSameOriginMutation: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  if (req.get("x-platepay-request") !== "1" || req.get("sec-fetch-site") === "cross-site") {
    res.status(403).json({ error: "This request must originate from PlatePay." }); return;
  }
  const origin = req.get("origin");
  if (origin) {
    try {
      const actual = new URL(origin);
      const expectedHost = (req.get("x-forwarded-host") ?? req.get("host") ?? "").split(",")[0]!.trim();
      const configuredOrigin = process.env.APP_ORIGIN;
      if (configuredOrigin ? actual.origin !== new URL(configuredOrigin).origin :
          !["http:", "https:"].includes(actual.protocol) || actual.host !== expectedHost) {
        res.status(403).json({ error: "This request must originate from PlatePay." }); return;
      }
    } catch { res.status(403).json({ error: "Invalid request origin." }); return; }
  }
  next();
};
