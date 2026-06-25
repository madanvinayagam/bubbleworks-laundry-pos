import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export const addonsRouter = Router();

addonsRouter.use(requireAuth);

const addonSchema = z.object({
  name: z.string().trim().min(1).max(120),
  rate: z.coerce.number().nonnegative(),
  unit: z.string().trim().min(1).max(20),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// GET /api/v1/addons - Get all addons
addonsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const isCashier = req.user?.role === "CASHIER";
    
    const addons = await prisma.addOn.findMany({
      where: isCashier ? { status: "ACTIVE" } : undefined,
      orderBy: { name: "asc" },
    });
    res.json({ addons });
  }),
);

// POST /api/v1/addons - Create an addon (Admin only)
addonsRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = addonSchema.parse(req.body);

    const existing = await prisma.addOn.findUnique({
      where: { name: input.name },
    });
    if (existing) {
      throw new HttpError(409, "Add-on name already exists");
    }

    const addon = await prisma.addOn.create({
      data: input,
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "addon",
      entityId: addon.id,
      metadata: { name: addon.name, rate: addon.rate, unit: addon.unit, action: "create" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({ addon });
  }),
);

// PATCH /api/v1/addons/:id - Update addon (Admin only)
addonsRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = addonSchema.partial().parse(req.body);

    const addon = await prisma.addOn.findUnique({
      where: { id: req.params.id },
    });
    if (!addon) {
      throw new HttpError(404, "Add-on not found");
    }

    if (input.name && input.name !== addon.name) {
      const existing = await prisma.addOn.findUnique({
        where: { name: input.name },
      });
      if (existing) {
        throw new HttpError(409, "Add-on name already exists");
      }
    }

    const updated = await prisma.addOn.update({
      where: { id: req.params.id },
      data: input,
    });

    res.json({ addon: updated });
  }),
);

// DELETE /api/v1/addons/:id - Delete addon (Admin only)
addonsRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const addon = await prisma.addOn.findUnique({
      where: { id: req.params.id },
    });
    if (!addon) {
      throw new HttpError(404, "Add-on not found");
    }

    await prisma.addOn.delete({
      where: { id: req.params.id },
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "addon",
      entityId: req.params.id,
      metadata: { action: "delete" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(204).send();
  }),
);
