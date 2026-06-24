import { Router } from "express";
import { createCustomerSchema } from "@bubbleworks/shared";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { resolveBranchScope } from "../middleware/branch-scope.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export const customersRouter = Router();

customersRouter.use(requireAuth);

// GET /api/v1/customers - Retrieve all customers (filtered by search and branch scope)
customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, branchId } = req.query;
    
    // Resolve access scope: Cashier is locked to their branch; Admin can optionally filter
    const resolvedBranchId = resolveBranchScope(
      req.user!,
      typeof branchId === "string" ? branchId : undefined
    );

    const where: any = {};
    
    if (resolvedBranchId) {
      where.branchId = resolvedBranchId;
    }

    if (typeof search === "string" && search.trim() !== "") {
      const cleanSearch = search.trim();
      where.OR = [
        { name: { contains: cleanSearch, mode: "insensitive" } },
        { mobile: { contains: cleanSearch } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        branch: {
          select: { name: true, code: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ customers });
  }),
);

// GET /api/v1/customers/search - Smart search query filter
customersRouter.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { query, branchId } = req.query;
    if (typeof query !== "string" || query.trim() === "") {
      throw new HttpError(400, "Search query is required");
    }

    const resolvedBranchId = resolveBranchScope(
      req.user!,
      typeof branchId === "string" ? branchId : undefined
    );

    const where: any = {
      OR: [
        { name: { contains: query.trim(), mode: "insensitive" } },
        { mobile: { contains: query.trim() } },
      ],
    };

    if (resolvedBranchId) {
      where.branchId = resolvedBranchId;
    }

    const customers = await prisma.customer.findMany({
      where,
      take: 10,
      select: {
        id: true,
        name: true,
        mobile: true,
        address: true,
        branchId: true,
      },
    });

    res.json({ customers });
  }),
);

// POST /api/v1/customers - Register a new customer with duplicate mobile check
customersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createCustomerSchema.parse(req.body);
    
    // Check branch scope authority
    resolveBranchScope(req.user!, input.branchId);

    // Uniqueness: check if mobile number already exists inside the assigned branch scope
    const existingCustomer = await prisma.customer.findUnique({
      where: {
        branchId_mobile: {
          branchId: input.branchId,
          mobile: input.mobile,
        },
      },
    });

    if (existingCustomer) {
      throw new HttpError(409, "Customer with this mobile number already exists in this branch", {
        existingCustomerId: existingCustomer.id,
      });
    }

    const customer = await prisma.customer.create({
      data: input,
    });

    await writeAuditLog({
      userId: req.user?.id,
      branchId: customer.branchId,
      action: "CUSTOMER_ADDED",
      entityType: "customer",
      entityId: customer.id,
      metadata: { name: customer.name, mobile: customer.mobile },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({ customer });
  }),
);

// GET /api/v1/customers/:id - Fetch customer details
customersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        branch: { select: { name: true, code: true } },
      },
    });

    if (!customer) {
      throw new HttpError(404, "Customer not found");
    }

    resolveBranchScope(req.user!, customer.branchId);

    res.json({ customer });
  }),
);

// PATCH /api/v1/customers/:id - Update customer
customersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = createCustomerSchema.partial().parse(req.body);

    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });
    if (!customer) {
      throw new HttpError(404, "Customer not found");
    }

    resolveBranchScope(req.user!, customer.branchId);

    if (input.mobile && input.mobile !== customer.mobile) {
      const bid = input.branchId || customer.branchId;
      const existingCustomer = await prisma.customer.findUnique({
        where: {
          branchId_mobile: {
            branchId: bid,
            mobile: input.mobile,
          },
        },
      });
      if (existingCustomer) {
        throw new HttpError(409, "Customer with this mobile number already exists in this branch");
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: req.params.id },
      data: input,
    });

    await writeAuditLog({
      userId: req.user?.id,
      branchId: updatedCustomer.branchId,
      action: "CUSTOMER_UPDATED",
      entityType: "customer",
      entityId: updatedCustomer.id,
      metadata: { changedFields: Object.keys(input) },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ customer: updatedCustomer });
  }),
);

// DELETE /api/v1/customers/:id - Delete customer
customersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });
    if (!customer) {
      throw new HttpError(404, "Customer not found");
    }

    resolveBranchScope(req.user!, customer.branchId);

    await prisma.customer.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  }),
);

// GET /api/v1/customers/:id/profile - Fetch customer profile spends and orders
customersRouter.get(
  "/:id/profile",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });
    if (!customer) {
      throw new HttpError(404, "Customer not found");
    }

    resolveBranchScope(req.user!, customer.branchId);

    const orders = await prisma.order.findMany({
      where: { customerId: req.params.id },
      select: {
        id: true,
        billNumber: true,
        grandTotal: true,
        paidAmount: true,
        balanceAmount: true,
        orderDate: true,
        status: true,
      },
      orderBy: { orderDate: "desc" },
    });

    const totalOrders = orders.length;
    const totalAmountSpent = orders.reduce((sum, o) => sum + Number(o.paidAmount), 0);
    const outstandingBalance = orders.reduce((sum, o) => sum + Number(o.balanceAmount), 0);
    const lastVisit = orders[0] ? orders[0].orderDate : null;

    res.json({
      customer,
      stats: {
        totalOrders,
        totalAmountSpent,
        outstandingBalance,
        lastVisit,
      },
      orders,
    });
  }),
);
