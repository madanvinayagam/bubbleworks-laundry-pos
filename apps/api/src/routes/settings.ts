import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

const businessSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  logoUrl: z.string().url().optional().nullable(),
  address: z.string().trim().min(2).max(500),
  mobile: z.string().trim().min(7).max(20),
  gstNumber: z.string().trim().max(30).optional().default(""),
});

const taxSettingsSchema = z.object({
  defaultGstRate: z.coerce.number().min(0).max(100),
});

const printerSettingsSchema = z.object({
  printerSize: z.enum(["MM_58", "MM_80"]),
});

// GET /api/v1/settings - Get settings (Admin and Cashier)
settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.setting.findUnique({
      where: { id: "global" },
    });

    if (!settings) {
      throw new HttpError(404, "Settings not initialized");
    }

    res.json({ settings });
  }),
);

// PATCH /api/v1/settings/business - Update business settings (Admin only)
settingsRouter.patch(
  "/business",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = businessSettingsSchema.parse(req.body);

    const settings = await prisma.setting.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        ...input,
      },
      update: input,
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "settings",
      entityId: "global",
      metadata: { update: "business" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ settings });
  }),
);

// PATCH /api/v1/settings/tax - Update tax settings (Admin only)
settingsRouter.patch(
  "/tax",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = taxSettingsSchema.parse(req.body);

    const settings = await prisma.setting.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        businessName: "Bubbleworks",
        defaultGstRate: input.defaultGstRate,
      },
      update: {
        defaultGstRate: input.defaultGstRate,
      },
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "settings",
      entityId: "global",
      metadata: { update: "tax", defaultGstRate: input.defaultGstRate },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ settings });
  }),
);

// PATCH /api/v1/settings/printer - Update printer settings (Admin only)
settingsRouter.patch(
  "/printer",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = printerSettingsSchema.parse(req.body);

    const settings = await prisma.setting.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        businessName: "Bubbleworks",
        printerSize: input.printerSize,
      },
      update: {
        printerSize: input.printerSize,
      },
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "settings",
      entityId: "global",
      metadata: { update: "printer", printerSize: input.printerSize },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ settings });
  }),
);
