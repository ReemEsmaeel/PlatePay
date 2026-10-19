import express, { type Express, type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { assertSessionSecret } from "./lib/sessions";
import { requireSameOriginMutation } from "./middlewares/requestSecurity";

const app: Express = express();
assertSessionSecret();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cookieParser());
app.use("/api", (_req, res, next) => {
  res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  next();
});
app.use("/api", requireSameOriginMutation);
app.use(express.json({ limit: "16kb" }));

app.use("/api", router);
const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error?.type === "entity.parse.failed" || error?.type === "entity.too.large") {
    res.status(error.type === "entity.too.large" ? 413 : 400).json({ error: "Invalid request body." });
    return;
  }
  if (error?.name === "CastError" || error?.name === "ValidationError") {
    res.status(400).json({ error: "The request contains an invalid value." });
    return;
  }
  req.log.error({ errorType: error instanceof Error ? error.name : "UnknownError" }, "API request failed");
  res.status(500).json({ error: "The request could not be completed." });
};
app.use(errorHandler);

export default app;
