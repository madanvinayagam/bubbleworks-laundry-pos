import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export const productsRouter = Router();

productsRouter.use(requireAuth);

const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// GET /api/v1/products - Get all products
productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const isCashier = req.user?.role === "CASHIER";
    const products = await prisma.product.findMany({
      where: isCashier ? { status: "ACTIVE" } : undefined,
      orderBy: { name: "asc" },
    });
    res.json({ products });
  }),
);

// POST /api/v1/products - Create a product (Admin only)
productsRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = productSchema.parse(req.body);

    const existing = await prisma.product.findUnique({
      where: { name: input.name },
    });
    if (existing) {
      throw new HttpError(409, "Product name already exists");
    }

    const product = await prisma.product.create({
      data: input,
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "product",
      entityId: product.id,
      metadata: { name: product.name, action: "create" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({ product });
  }),
);

// PATCH /api/v1/products/:id - Update product (Admin only)
productsRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = productSchema.partial().parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    if (!product) {
      throw new HttpError(404, "Product not found");
    }

    if (input.name && input.name !== product.name) {
      const existing = await prisma.product.findUnique({
        where: { name: input.name },
      });
      if (existing) {
        throw new HttpError(409, "Product name already exists");
      }
    }

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: input,
    });

    res.json({ product: updated });
  }),
);

// DELETE /api/v1/products/:id - Delete product (Admin only)
productsRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    if (!product) {
      throw new HttpError(404, "Product not found");
    }

    await prisma.product.delete({
      where: { id: req.params.id },
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "product",
      entityId: req.params.id,
      metadata: { name: product.name, action: "delete" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(204).send();
  }),
);
