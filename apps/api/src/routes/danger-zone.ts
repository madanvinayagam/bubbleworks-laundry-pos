import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

export const dangerZoneRouter = Router();

dangerZoneRouter.use(requireAuth);

dangerZoneRouter.post(
  "/clear",
  asyncHandler(async (req, res) => {
    if (req.user!.role !== "ADMIN") {
      throw new HttpError(403, "Only ADMIN can clear transaction data");
    }

    const { confirmText } = req.body;
    if (confirmText !== "CONFIRM DELETE") {
      throw new HttpError(400, "Verification mismatch. Please type CONFIRM DELETE");
    }

    // Delete transaction records in order
    await prisma.$transaction([
      prisma.printLog.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.customer.deleteMany(),
      prisma.numberSequence.deleteMany(),
    ]);

    res.json({ message: "All transaction tables cleared successfully" });
  }),
);
