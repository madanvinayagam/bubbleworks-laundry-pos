import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);
usersRouter.use(requireRole("ADMIN"));

const createCashierSchema = z.object({
  name: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(7).max(20),
  username: z.string().trim().min(3).max(80),
  password: z.string().min(8).max(200),
  branchId: z.string().uuid(),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  mobile: z.string().trim().min(7).max(20).optional(),
  username: z.string().trim().min(3).max(80).optional(),
  branchId: z.string().uuid().optional(),
  password: z.string().min(8).max(200).optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8).max(200),
});

// GET /api/v1/users - Get all users
usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { role: "CASHIER" },
      select: {
        id: true,
        name: true,
        mobile: true,
        username: true,
        role: true,
        status: true,
        branchId: true,
        lastLoginAt: true,
        createdAt: true,
        branch: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  }),
);

// POST /api/v1/users/cashiers - Create a cashier user
usersRouter.post(
  "/cashiers",
  asyncHandler(async (req, res) => {
    const input = createCashierSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { username: input.username },
    });
    if (existingUser) {
      throw new HttpError(409, "Username already exists");
    }

    const branch = await prisma.branch.findUnique({
      where: { id: input.branchId },
    });
    if (!branch) {
      throw new HttpError(400, "Branch not found");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        mobile: input.mobile,
        username: input.username,
        passwordHash,
        role: "CASHIER",
        branchId: input.branchId,
        createdById: req.user?.id,
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        username: true,
        role: true,
        status: true,
        branchId: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "CASHIER_CREATED",
      entityType: "user",
      entityId: user.id,
      metadata: { username: user.username, branchName: branch.name },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({ user });
  }),
);

// PATCH /api/v1/users/:id - Edit user details
usersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { password, ...otherInput } = updateUserSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    if (otherInput.username && otherInput.username !== user.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username: otherInput.username },
      });
      if (existingUser) {
        throw new HttpError(409, "Username already exists");
      }
    }

    if (otherInput.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: otherInput.branchId },
      });
      if (!branch) {
        throw new HttpError(400, "Branch not found");
      }
    }

    const updateData: any = { ...otherInput };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        mobile: true,
        username: true,
        role: true,
        status: true,
        branchId: true,
        updatedAt: true,
      },
    });

    res.json({ user: updatedUser });
  }),
);

// POST /api/v1/users/:id/reset-password - Reset password for user
usersRouter.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash },
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "user",
      entityId: user.id,
      metadata: { field: "password" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(204).send();
  }),
);

// POST /api/v1/users/:id/enable - Enable cashier
usersRouter.post(
  "/:id/enable",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        username: true,
        status: true,
      },
    });

    res.json({ user: updatedUser });
  }),
);

// POST /api/v1/users/:id/disable - Disable cashier
usersRouter.post(
  "/:id/disable",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    if (user.role === "ADMIN") {
      throw new HttpError(400, "Cannot disable an admin user");
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: "DISABLED" },
      select: {
        id: true,
        name: true,
        username: true,
        status: true,
      },
    });

    res.json({ user: updatedUser });
  }),
);
