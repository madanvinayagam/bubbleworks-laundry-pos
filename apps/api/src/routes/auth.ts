import bcrypt from "bcryptjs";
import { Router } from "express";
import { loginSchema } from "@bubbleworks/shared";
import { prisma } from "../db/prisma.js";
import { requireAuth, signSessionToken } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { username: input.username },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new HttpError(401, "Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new HttpError(401, "Invalid credentials");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await writeAuditLog({
      userId: user.id,
      branchId: user.branchId ?? undefined,
      action: "LOGIN",
      entityType: "user",
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const sessionUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
    };

    res.json({
      token: signSessionToken(sessionUser),
      user: {
        ...sessionUser,
        name: user.name,
        branch: user.branch,
      },
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    res.json({ user });
  }),
);

authRouter.post("/logout", requireAuth, (_req, res) => {
  res.status(204).send();
});
