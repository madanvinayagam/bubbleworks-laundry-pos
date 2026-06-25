import { Router } from "express";
import { createServiceSchema } from "@bubbleworks/shared";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export const servicesRouter = Router();

servicesRouter.use(requireAuth);

// GET /api/v1/services - Get all services
servicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const isCashier = req.user?.role === "CASHIER";
    
    const services = await prisma.service.findMany({
      where: isCashier ? { status: "ACTIVE" } : undefined,
      orderBy: { name: "asc" },
    });
    
    res.json({ services });
  }),
);

// POST /api/v1/services - Create service (Admin only)
servicesRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = createServiceSchema.parse(req.body);

    const existingService = await prisma.service.findUnique({
      where: { name: input.name },
    });
    if (existingService) {
      throw new HttpError(409, "Service name already exists");
    }

    const service = await prisma.service.create({
      data: input,
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "service",
      entityId: service.id,
      metadata: { name: service.name, action: "create" },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({ service });
  }),
);

// PATCH /api/v1/services/:id - Update service (Admin only)
servicesRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = createServiceSchema.partial().parse(req.body);

    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
    });
    if (!service) {
      throw new HttpError(404, "Service not found");
    }

    if (input.name && input.name !== service.name) {
      const existingService = await prisma.service.findUnique({
        where: { name: input.name },
      });
      if (existingService) {
        throw new HttpError(409, "Service name already exists");
      }
    }

    const updatedService = await prisma.service.update({
      where: { id: req.params.id },
      data: input,
    });

    res.json({ service: updatedService });
  }),
);

// DELETE /api/v1/services/:id - Delete service (Admin only)
servicesRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
    });
    if (!service) {
      throw new HttpError(404, "Service not found");
    }

    await prisma.service.delete({
      where: { id: req.params.id },
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: "SETTINGS_UPDATED",
      entityType: "service",
      entityId: req.params.id,
      metadata: { action: "delete", name: service.name },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(204).send();
  }),
);

// POST /api/v1/services/:id/activate - Activate service (Admin only)
servicesRouter.post(
  "/:id/activate",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
    });
    if (!service) {
      throw new HttpError(404, "Service not found");
    }

    const updatedService = await prisma.service.update({
      where: { id: req.params.id },
      data: { status: "ACTIVE" },
    });

    res.json({ service: updatedService });
  }),
);

// POST /api/v1/services/:id/deactivate - Deactivate service (Admin only)
servicesRouter.post(
  "/:id/deactivate",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
    });
    if (!service) {
      throw new HttpError(404, "Service not found");
    }

    const updatedService = await prisma.service.update({
      where: { id: req.params.id },
      data: { status: "INACTIVE" },
    });

    res.json({ service: updatedService });
  }),
);
