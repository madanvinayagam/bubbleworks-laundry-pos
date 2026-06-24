import cors from "cors";
import express from "express";
import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { createRequire } from "node:module";
import { corsOrigins } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { branchesRouter } from "./routes/branches.js";
import { usersRouter } from "./routes/users.js";
import { servicesRouter } from "./routes/services.js";
import { settingsRouter } from "./routes/settings.js";
import { customersRouter } from "./routes/customers.js";
import { ordersRouter } from "./routes/orders.js";
import { reportsRouter } from "./routes/reports.js";
import { dangerZoneRouter } from "./routes/danger-zone.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

const require = createRequire(import.meta.url);
const helmet = require("helmet") as () => RequestHandler;

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.json({
      status: "ok",
      service: "bubbleworks-api",
      checkedAt: new Date().toISOString(),
    });
  });

  app.use(
    "/api/v1/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use("/api/health", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/branches", branchesRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/services", servicesRouter);
  app.use("/api/v1/settings", settingsRouter);
  app.use("/api/v1/customers", customersRouter);
  app.use("/api/v1/orders", ordersRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/danger-zone", dangerZoneRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
