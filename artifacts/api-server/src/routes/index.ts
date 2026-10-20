import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import merchantRouter from "./merchant";
import paymentRequestsRouter from "./paymentRequests";
import walletRouter from "./wallet";
import adminRouter from "./admin";
import authRouter from "./auth";
import { demoRouter } from "./demo";
import { isDatabaseReady } from "../db/mongo";

const router: IRouter = Router();

router.use(healthRouter);
router.use((_req, res, next) => {
  if (!isDatabaseReady()) {
    res.status(503).json({ error: "PlatePay database is unavailable. No transaction has been processed." });
    return;
  }
  next();
});
router.use(authRouter);
router.use(demoRouter);
router.use(profileRouter);
router.use(merchantRouter);
router.use(paymentRequestsRouter);
router.use(walletRouter);
router.use(adminRouter);

export default router;
