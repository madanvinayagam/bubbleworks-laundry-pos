import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
});

// GET /api/v1/categories - Get all categories
categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await prisma.itemCategory.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ categories });
  }),
);

// POST /api/v1/categories - Create a category (Admin only)
categoriesRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = categorySchema.parse(req.body);

    const existing = await prisma.itemCategory.findUnique({
      where: { name: input.name },
    });
    if (existing) {
      throw new HttpError(409, "Category name already exists");
    }

    const category = await prisma.itemCategory.create({
      data: input,
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "category",
      entityId: category.id,
      metadata: { name: category.name, action: "create" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({ category });
  }),
);

// PATCH /api/v1/categories/:id - Update category (Admin only)
categoriesRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = categorySchema.partial().parse(req.body);

    const category = await prisma.itemCategory.findUnique({
      where: { id: req.params.id },
    });
    if (!category) {
      throw new HttpError(404, "Category not found");
    }

    if (input.name && input.name !== category.name) {
      const existing = await prisma.itemCategory.findUnique({
        where: { name: input.name },
      });
      if (existing) {
        throw new HttpError(409, "Category name already exists");
      }
    }

    const updated = await prisma.itemCategory.update({
      where: { id: req.params.id },
      data: input,
    });

    res.json({ category: updated });
  }),
);

// DELETE /api/v1/categories/:id - Delete category (Admin only)
categoriesRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const category = await prisma.itemCategory.findUnique({
      where: { id: req.params.id },
    });
    if (!category) {
      throw new HttpError(404, "Category not found");
    }

    await prisma.itemCategory.delete({
      where: { id: req.params.id },
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "category",
      entityId: req.params.id,
      metadata: { name: category.name, action: "delete" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(204).send();
  }),
);
