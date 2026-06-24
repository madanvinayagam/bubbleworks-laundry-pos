import { Router } from "express";
import {
  createOrderSchema,
  calculateBillingTotals,
  formatBillNumber,
  formatTokenNumber,
  type BillingItemInput
} from "@bubbleworks/shared";
import PDFDocument from "pdfkit";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { resolveBranchScope } from "../middleware/branch-scope.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { writeAuditLog } from "../utils/audit.js";

export const ordersRouter = Router();

// GET /api/v1/orders/public/status - Public order status lookup
ordersRouter.get(
  "/public/status",
  asyncHandler(async (req, res) => {
    const { billNumber, mobile } = req.query;
    if (typeof billNumber !== "string" || typeof mobile !== "string") {
      throw new HttpError(400, "Bill number and mobile number are required");
    }

    const order = await prisma.order.findFirst({
      where: {
        billNumber: billNumber.trim(),
        customer: {
          mobile: mobile.trim(),
        },
      },
      include: {
        customer: {
          select: { name: true, mobile: true },
        },
        branch: {
          select: { name: true, address: true, mobile: true },
        },
        items: {
          select: {
            serviceNameSnapshot: true,
            pricingType: true,
            quantity: true,
            weightKg: true,
          },
        },
      },
    });

    if (!order) {
      throw new HttpError(404, "Order not found with provided details");
    }

    res.json({
      billNumber: order.billNumber,
      tokenNumber: order.tokenNumber,
      status: order.status,
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      deliveredDate: order.deliveredDate,
      customer: {
        name: order.customer.name,
      },
      branch: {
        name: order.branch.name,
        address: order.branch.address,
        mobile: order.branch.mobile,
      },
      items: order.items,
    });
  }),
);

ordersRouter.use(requireAuth);

// GET /api/v1/orders/preview - Preview the next bill/token numbers for the branch
ordersRouter.get(
  "/preview",
  asyncHandler(async (req, res) => {
    const requestedBranchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
    const resolvedBranchId = resolveBranchScope(req.user!, requestedBranchId);

    if (!resolvedBranchId) {
      throw new HttpError(400, "Branch is required to preview order numbers");
    }

    const branch = await prisma.branch.findUnique({
      where: { id: resolvedBranchId },
      select: { code: true },
    });

    if (!branch) {
      throw new HttpError(404, "Branch not found");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sequence = await prisma.numberSequence.findUnique({
      where: {
        branchId_sequenceDate: {
          branchId: resolvedBranchId,
          sequenceDate: today,
        },
      },
    });

    const nextBillNumber = formatBillNumber(branch.code, today, (sequence?.billLastNumber ?? 0) + 1);
    const nextTokenNumber = formatTokenNumber(today, (sequence?.tokenLastNumber ?? 0) + 1);

    res.json({
      billNumber: nextBillNumber,
      tokenNumber: nextTokenNumber,
      sequenceDate: today.toISOString(),
    });
  }),
);

// GET /api/v1/orders - Paginated search and list of orders
ordersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, branchId, status, paymentStatus, page = "1", limit = "15" } = req.query;
    
    const resolvedBranchId = resolveBranchScope(
      req.user!,
      typeof branchId === "string" ? branchId : undefined
    );

    const where: any = {};
    if (resolvedBranchId) {
      where.branchId = resolvedBranchId;
    }
    if (typeof status === "string" && status !== "") {
      where.status = status;
    }
    if (typeof paymentStatus === "string" && paymentStatus !== "") {
      where.paymentStatus = paymentStatus;
    }

    if (typeof search === "string" && search.trim() !== "") {
      const cleanSearch = search.trim();
      where.OR = [
        { billNumber: { contains: cleanSearch, mode: "insensitive" } },
        { tokenNumber: { contains: cleanSearch, mode: "insensitive" } },
        {
          customer: {
            OR: [
              { name: { contains: cleanSearch, mode: "insensitive" } },
              { mobile: { contains: cleanSearch } },
            ],
          },
        },
      ];
    }

    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.max(1, parseInt(limit as string) || 15);
    const skip = (p - 1) * l;

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: l,
        orderBy: { orderDate: "desc" },
        include: {
          customer: {
            select: { name: true, mobile: true },
          },
          branch: {
            select: { name: true, code: true },
          },
        },
      }),
    ]);

    res.json({
      orders,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    });
  }),
);

// POST /api/v1/orders - Create a billing order transaction
ordersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createOrderSchema.parse(req.body);
    const orderDate = (input as typeof input & { orderDate?: string }).orderDate;

    // Verify cashier belongs to the requested branch
    resolveBranchScope(req.user!, input.branchId);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify customer exists
      const customer = await tx.customer.findUnique({
        where: { id: input.customerId },
      });
      if (!customer) {
        throw new HttpError(404, "Customer not found");
      }

      // 2. Fetch branch details
      const branch = await tx.branch.findUnique({
        where: { id: input.branchId },
      });
      if (!branch || branch.status !== "ACTIVE") {
        throw new HttpError(400, "Branch is inactive or does not exist");
      }

      // 3. Lock and generate next sequential numbers for today
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Truncate time to date key

      let sequence = await tx.numberSequence.findUnique({
        where: {
          branchId_sequenceDate: {
            branchId: input.branchId,
            sequenceDate: today,
          },
        },
      });

      if (!sequence) {
        sequence = await tx.numberSequence.create({
          data: {
            branchId: input.branchId,
            sequenceDate: today,
            billLastNumber: 1,
            tokenLastNumber: 1,
          },
        });
      } else {
        sequence = await tx.numberSequence.update({
          where: { id: sequence.id },
          data: {
            billLastNumber: { increment: 1 },
            tokenLastNumber: { increment: 1 },
          },
        });
      }

      const billNumber = formatBillNumber(branch.code, today, sequence.billLastNumber);
      const tokenNumber = formatTokenNumber(today, sequence.tokenLastNumber);

      // 4. Calculate total amounts
      const totals = calculateBillingTotals(input);

      // 5. Create Order entry
      const order = await tx.order.create({
        data: {
          branchId: input.branchId,
          customerId: input.customerId,
          createdById: req.user!.id,
          billNumber,
          tokenNumber,
          status: "RECEIVED",
          orderDate: orderDate ? new Date(orderDate) : new Date(),
          expectedDeliveryDate: new Date(input.expectedDeliveryDate),
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          roundOff: totals.roundOff,
          gstRate: totals.gstRate,
          gstAmount: totals.gstAmount,
          grandTotal: totals.grandTotal,
          paidAmount: totals.paidAmount,
          balanceAmount: totals.balanceAmount,
          paymentStatus: totals.paymentStatus,
          notes: input.notes,
        },
      });

      // 6. Create OrderItem entries
      const orderItemsData = input.items.map((item: BillingItemInput) => {
        const itemAmount = item.pricingType === "PER_KG" 
          ? (item.weightKg ?? 0) * item.rate 
          : (item.quantity ?? 0) * item.rate;

        return {
          orderId: order.id,
          serviceId: item.serviceId,
          serviceNameSnapshot: item.serviceName,
          pricingType: item.pricingType,
          quantity: item.quantity,
          weightKg: item.weightKg,
          rate: item.rate,
          amount: itemAmount,
        };
      });

      await tx.orderItem.createMany({
        data: orderItemsData,
      });

      // 7. Create Payment log if paidAmount > 0
      if (totals.paidAmount > 0) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            branchId: input.branchId,
            method: input.paymentMethod,
            amount: totals.paidAmount,
            receivedById: req.user!.id,
          },
        });
      }

      return order;
    });

    res.status(201).json({ order: result });
  }),
);

// GET /api/v1/orders/:id - Fetch full order details
ordersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        branch: true,
        items: true,
        payments: {
          include: {
            receivedBy: { select: { name: true } },
          },
        },
        printLogs: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!order) {
      throw new HttpError(404, "Order not found");
    }

    resolveBranchScope(req.user!, order.branchId);

    res.json({ order });
  }),
);

// PATCH /api/v1/orders/:id/status - Update order workflow state
ordersRouter.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status) {
      throw new HttpError(400, "Status is required");
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!order) {
      throw new HttpError(404, "Order not found");
    }

    resolveBranchScope(req.user!, order.branchId);

    const updateData: any = { status };
    if (status === "DELIVERED") {
      updateData.deliveredDate = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await writeAuditLog({
      userId: req.user?.id,
      branchId: order.branchId,
      action: "BILL_EDITED",
      entityType: "order",
      entityId: order.id,
      metadata: { transition: `status -> ${status}` },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ order: updatedOrder });
  }),
);

// POST /api/v1/orders/:id/print - Register original print
ordersRouter.post(
  "/:id/print",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!order) {
      throw new HttpError(404, "Order not found");
    }
    resolveBranchScope(req.user!, order.branchId);

    const printLog = await prisma.printLog.create({
      data: {
        orderId: order.id,
        userId: req.user!.id,
        printType: "ORIGINAL",
        printCount: 1,
      },
    });

    res.json({ printLog });
  }),
);

// POST /api/v1/orders/:id/reprint - Register reprint log
ordersRouter.post(
  "/:id/reprint",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!order) {
      throw new HttpError(404, "Order not found");
    }
    resolveBranchScope(req.user!, order.branchId);

    const reprintCount = await prisma.printLog.count({
      where: {
        orderId: order.id,
        printType: "REPRINT",
      },
    });

    const printLog = await prisma.printLog.create({
      data: {
        orderId: order.id,
        userId: req.user!.id,
        printType: "REPRINT",
        printCount: reprintCount + 1,
      },
    });

    await writeAuditLog({
      userId: req.user?.id,
      branchId: order.branchId,
      action: "BILL_REPRINTED",
      entityType: "order",
      entityId: order.id,
      metadata: { billNumber: order.billNumber, reprintCount: reprintCount + 1 },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ printLog });
  }),
);

// GET /api/v1/orders/:id/pdf - Return server-side PDF generator buffer
ordersRouter.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        branch: true,
        items: true,
      },
    });
    if (!order) {
      throw new HttpError(404, "Order not found");
    }
    resolveBranchScope(req.user!, order.branchId);

    const settings = await prisma.setting.findFirst({
      where: { id: "global" },
    });

    const businessName = settings?.businessName || "Bubbleworks";
    const businessAddress = settings?.address || "";
    const businessMobile = settings?.mobile || "";
    const businessGst = settings?.gstNumber || "";

    const doc = new (PDFDocument as any)({ size: "A4", margin: 40 });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => {
      const result = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.billNumber}.pdf`);
      res.send(result);
    });

    // Render Header
    doc.fontSize(20).text(businessName, { align: "center" });
    if (businessAddress) doc.fontSize(10).text(businessAddress, { align: "center" });
    if (businessMobile) doc.fontSize(10).text(`Mobile: ${businessMobile}`, { align: "center" });
    if (businessGst) doc.fontSize(10).text(`GST: ${businessGst}`, { align: "center" });

    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Bill details in two columns
    const leftColX = 40;
    const rightColX = 300;
    const detailsY = doc.y;

    doc.fontSize(12).text(`Bill No: ${order.billNumber}`, leftColX, detailsY);
    doc.text(`Token No: ${order.tokenNumber}`, leftColX, detailsY + 18);
    doc.text(`Order Date: ${order.orderDate.toLocaleDateString()}`, leftColX, detailsY + 36);

    doc.text(`Customer: ${order.customer.name}`, rightColX, detailsY);
    doc.text(`Mobile: ${order.customer.mobile}`, rightColX, detailsY + 18);
    doc.text(`Delivery Date: ${order.expectedDeliveryDate.toLocaleDateString()}`, rightColX, detailsY + 36);

    doc.text(`Status: ${order.status}`, leftColX, detailsY + 54);

    doc.y = detailsY + 80;
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Table Header
    const itemX = 40;
    const typeX = 220;
    const qtyX = 300;
    const rateX = 380;
    const amountX = 460;
    const tableY = doc.y;

    doc.fontSize(10).font("Helvetica-Bold").text("Service", itemX, tableY);
    doc.font("Helvetica").text("Pricing Type", typeX, tableY);
    doc.text("Qty / Wt", qtyX, tableY);
    doc.text("Rate", rateX, tableY);
    doc.text("Amount", amountX, tableY);

    doc.y = tableY + 15;
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Table Rows
    order.items.forEach((item) => {
      const rowY = doc.y;
      doc.text(item.serviceNameSnapshot, itemX, rowY);
      doc.text(item.pricingType, typeX, rowY);
      
      const qtyWt = item.pricingType === "PER_KG" 
        ? `${item.weightKg} kg` 
        : `${item.quantity}`;
      doc.text(qtyWt, qtyX, rowY);
      doc.text(`INR ${item.rate}`, rateX, rowY);
      doc.text(`INR ${item.amount}`, amountX, rowY);
      doc.y = rowY + 15;
    });

    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    // Totals on the right side
    const totalsY = doc.y;
    let currentY = doc.y;
    const totalLabelX = 350;
    const totalValX = 460;

    doc.text("Subtotal:", totalLabelX, currentY);
    doc.text(`INR ${Number(order.subtotal).toFixed(2)}`, totalValX, currentY);
    currentY += 15;

    if (Number(order.discountAmount) > 0) {
      doc.text("Discount:", totalLabelX, currentY);
      doc.text(`- INR ${Number(order.discountAmount).toFixed(2)}`, totalValX, currentY);
      currentY += 15;
    }

    const halfGstRate = Number(order.gstRate) / 2;
    const halfGstAmount = Number(order.gstAmount) / 2;

    doc.text(`CGST (${halfGstRate}%):`, totalLabelX, currentY);
    doc.text(`INR ${halfGstAmount.toFixed(2)}`, totalValX, currentY);
    currentY += 15;

    doc.text(`SGST (${halfGstRate}%):`, totalLabelX, currentY);
    doc.text(`INR ${halfGstAmount.toFixed(2)}`, totalValX, currentY);
    currentY += 15;

    if (Number((order as any).roundOff || 0) !== 0) {
      const rOff = Number((order as any).roundOff || 0);
      doc.text("Round Off:", totalLabelX, currentY);
      doc.text(`${rOff > 0 ? "+" : ""} INR ${rOff.toFixed(2)}`, totalValX, currentY);
      currentY += 15;
    }

    currentY += 5;
    doc.fontSize(12).font("Helvetica-Bold").text("Grand Total:", totalLabelX, currentY);
    doc.text(`INR ${Number(order.grandTotal).toFixed(2)}`, totalValX, currentY);
    doc.fontSize(10).font("Helvetica");
    currentY += 20;

    doc.text("Paid Amount:", totalLabelX, currentY);
    doc.text(`INR ${Number(order.paidAmount).toFixed(2)}`, totalValX, currentY);
    currentY += 15;

    doc.text("Balance Amount:", totalLabelX, currentY);
    doc.text(`INR ${Number(order.balanceAmount).toFixed(2)}`, totalValX, currentY);
    currentY += 15;

    doc.text("Payment Status:", totalLabelX, currentY);
    doc.text(`${order.paymentStatus}`, totalValX, currentY);    // Left side note
    doc.text("Notes:", leftColX, totalsY);
    doc.fontSize(9).text(order.notes || "None", leftColX, totalsY + 15, { width: 280 });

    doc.end();
  }),
);
