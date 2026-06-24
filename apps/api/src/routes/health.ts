import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";

export const healthRouter = Router();

healthRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      service: "bubbleworks-api",
      checkedAt: new Date().toISOString(),
    });
  }),
);
