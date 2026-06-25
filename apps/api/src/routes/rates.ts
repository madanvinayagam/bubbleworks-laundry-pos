import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export const ratesRouter = Router();

ratesRouter.use(requireAuth);

const rateSchema = z.object({
  serviceId: z.string().uuid(),
  productId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  unit: z.string().trim().min(1).max(20),
  rate: z.coerce.number().nonnegative(),
  gstRate: z.coerce.number().min(0).max(100).default(18),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// GET /api/v1/rates - Get all service rates in the matrix
ratesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const isCashier = req.user?.role === "CASHIER";
    
    const rates = await prisma.serviceRate.findMany({
      where: isCashier ? { status: "ACTIVE" } : undefined,
      include: {
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: [
        { service: { name: "asc" } },
        { product: { name: "asc" } },
      ],
    });
    res.json({ rates });
  }),
);

// POST /api/v1/rates - Create a service rate (Admin only)
ratesRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = rateSchema.parse(req.body);

    // Verify service exists
    const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
    if (!service) throw new HttpError(400, "Service not found");

    // Verify product exists if provided
    if (input.productId) {
      const product = await prisma.product.findUnique({ where: { id: input.productId } });
      if (!product) throw new HttpError(400, "Product not found");
    }

    // Verify category exists if provided
    if (input.categoryId) {
      const category = await prisma.itemCategory.findUnique({ where: { id: input.categoryId } });
      if (!category) throw new HttpError(400, "Category not found");
    }

    // Check for existing duplicate unique combination
    const existing = await prisma.serviceRate.findFirst({
      where: {
        serviceId: input.serviceId,
        productId: input.productId || null,
        categoryId: input.categoryId || null,
      },
    });
    if (existing) {
      throw new HttpError(409, "A rate for this Service, Product, and Category combination already exists");
    }

    const rate = await prisma.serviceRate.create({
      data: {
        serviceId: input.serviceId,
        productId: input.productId || null,
        categoryId: input.categoryId || null,
        unit: input.unit,
        rate: input.rate,
        gstRate: input.gstRate,
        status: input.status,
      },
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "rate",
      entityId: rate.id,
      metadata: { serviceId: rate.serviceId, rate: rate.rate, unit: rate.unit, action: "create" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({ rate });
  }),
);

// PATCH /api/v1/rates/:id - Update rate (Admin only)
ratesRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = rateSchema.partial().parse(req.body);

    const rate = await prisma.serviceRate.findUnique({
      where: { id: req.params.id },
    });
    if (!rate) {
      throw new HttpError(404, "Rate not found");
    }

    // If changing the unique combo, verify it doesn't conflict
    const finalServiceId = input.serviceId ?? rate.serviceId;
    const finalProductId = input.productId === undefined ? rate.productId : input.productId;
    const finalCategoryId = input.categoryId === undefined ? rate.categoryId : input.categoryId;

    if (
      finalServiceId !== rate.serviceId ||
      finalProductId !== rate.productId ||
      finalCategoryId !== rate.categoryId
    ) {
      const conflicting = await prisma.serviceRate.findFirst({
        where: {
          id: { not: req.params.id },
          serviceId: finalServiceId,
          productId: finalProductId,
          categoryId: finalCategoryId,
        },
      });
      if (conflicting) {
        throw new HttpError(409, "A rate for this Service, Product, and Category combination already exists");
      }
    }

    const updated = await prisma.serviceRate.update({
      where: { id: req.params.id },
      data: {
        serviceId: input.serviceId,
        productId: input.productId === undefined ? undefined : input.productId,
        categoryId: input.categoryId === undefined ? undefined : input.categoryId,
        unit: input.unit,
        rate: input.rate,
        gstRate: input.gstRate,
        status: input.status,
      },
    });

    res.json({ rate: updated });
  }),
);

// DELETE /api/v1/rates/:id - Delete rate (Admin only)
ratesRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const rate = await prisma.serviceRate.findUnique({
      where: { id: req.params.id },
    });
    if (!rate) {
      throw new HttpError(404, "Rate not found");
    }

    await prisma.serviceRate.delete({
      where: { id: req.params.id },
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "rate",
      entityId: req.params.id,
      metadata: { action: "delete" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(204).send();
  }),
);
