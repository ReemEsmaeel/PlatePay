import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { isDatabaseReady } from "../db/mongo";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const connected = isDatabaseReady();
  const data = HealthCheckResponse.parse({ status: connected ? "ok" : "database_unavailable" });
  res.status(connected ? 200 : 503).json(data);
});

export default router;
