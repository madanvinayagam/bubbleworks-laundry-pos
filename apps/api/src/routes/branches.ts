import { Router } from "express";
import { createBranchSchema } from "@bubbleworks/shared";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export const branchesRouter = Router();

branchesRouter.use(requireAuth);
branchesRouter.use(requireRole("ADMIN"));

// GET /api/v1/branches - Get all branches
branchesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ branches });
  }),
);

// POST /api/v1/branches - Create branch
branchesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createBranchSchema.parse(req.body);

    const existingBranch = await prisma.branch.findUnique({
      where: { code: input.code },
    });
    if (existingBranch) {
      throw new HttpError(409, "Branch code already exists");
    }

    const branch = await prisma.branch.create({
      data: input,
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "BRANCH_ADDED",
      entityType: "branch",
      entityId: branch.id,
      metadata: { branchName: branch.name, branchCode: branch.code },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({ branch });
  }),
);

// GET /api/v1/branches/:id - Get branch by ID
branchesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const branch = await prisma.branch.findUnique({
      where: { id: req.params.id },
    });

    if (!branch) {
      throw new HttpError(404, "Branch not found");
    }

    res.json({ branch });
  }),
);

// PATCH /api/v1/branches/:id - Update branch
branchesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = createBranchSchema.partial().parse(req.body);

    const branch = await prisma.branch.findUnique({
      where: { id: req.params.id },
    });
    if (!branch) {
      throw new HttpError(404, "Branch not found");
    }

    if (input.code && input.code !== branch.code) {
      const existingBranch = await prisma.branch.findUnique({
        where: { code: input.code },
      });
      if (existingBranch) {
        throw new HttpError(409, "Branch code already exists");
      }
    }

    const updatedBranch = await prisma.branch.update({
      where: { id: req.params.id },
      data: input,
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "branch",
      entityId: updatedBranch.id,
      metadata: { changedFields: Object.keys(input) },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ branch: updatedBranch });
  }),
);

// POST /api/v1/branches/:id/activate - Activate branch
branchesRouter.post(
  "/:id/activate",
  asyncHandler(async (req, res) => {
    const branch = await prisma.branch.findUnique({
      where: { id: req.params.id },
    });
    if (!branch) {
      throw new HttpError(404, "Branch not found");
    }

    const updatedBranch = await prisma.branch.update({
      where: { id: req.params.id },
      data: { status: "ACTIVE" },
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "branch",
      entityId: updatedBranch.id,
      metadata: { status: "ACTIVE" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ branch: updatedBranch });
  }),
);

// POST /api/v1/branches/:id/deactivate - Deactivate branch
branchesRouter.post(
  "/:id/deactivate",
  asyncHandler(async (req, res) => {
    const branch = await prisma.branch.findUnique({
      where: { id: req.params.id },
    });
    if (!branch) {
      throw new HttpError(404, "Branch not found");
    }

    const updatedBranch = await prisma.branch.update({
      where: { id: req.params.id },
      data: { status: "INACTIVE" },
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "branch",
      entityId: updatedBranch.id,
      metadata: { status: "INACTIVE" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ branch: updatedBranch });
  }),
);

// GET /api/v1/branches/:id/orders - View branch orders
branchesRouter.get(
  "/:id/orders",
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { branchId: req.params.id },
      orderBy: { orderDate: "desc" },
      include: {
        customer: {
          select: { name: true, mobile: true },
        },
      },
    });
    res.json({ orders });
  }),
);

// GET /api/v1/branches/:id/revenue - View branch revenue
branchesRouter.get(
  "/:id/revenue",
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { branchId: req.params.id },
      select: { grandTotal: true, paidAmount: true },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.paidAmount), 0);
    const totalSales = orders.reduce((sum, order) => sum + Number(order.grandTotal), 0);

    res.json({
      branchId: req.params.id,
      totalRevenue,
      totalSales,
      orderCount: orders.length,
    });
  }),
);
