import { Router } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { resolveBranchScope } from "../middleware/branch-scope.js";
import { asyncHandler } from "../utils/async-handler.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get(
  "/pdf",
  asyncHandler(async (req, res) => {
    const { branchId, startDate, endDate } = req.query;

    const resolvedBranchId = resolveBranchScope(
      req.user!,
      typeof branchId === "string" ? branchId : undefined
    );

    const where: any = {};
    if (resolvedBranchId) {
      where.branchId = resolvedBranchId;
    }

    if (typeof startDate === "string" && startDate !== "") {
      where.orderDate = { ...where.orderDate, gte: new Date(startDate) };
    }
    if (typeof endDate === "string" && endDate !== "") {
      where.orderDate = { ...where.orderDate, lte: new Date(endDate) };
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        grandTotal: true,
        gstAmount: true,
        paidAmount: true,
        balanceAmount: true,
        orderDate: true,
        paymentStatus: true,
        status: true,
        billNumber: true,
      },
    });

    let totalRevenue = 0;
    let totalGst = 0;
    let totalReceived = 0;
    let totalBalance = 0;

    orders.forEach((o) => {
      totalRevenue += Number(o.grandTotal);
      totalGst += Number(o.gstAmount);
      totalReceived += Number(o.paidAmount);
      totalBalance += Number(o.balanceAmount);
    });

    const settings = await prisma.setting.findFirst({
      where: { id: "global" },
    });

    const doc = new (PDFDocument as any)({ size: "A4", margin: 40 });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => {
      const result = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=laundry-report.pdf`);
      res.send(result);
    });

    // Header
    doc.fontSize(22).font("Helvetica-Bold").text(settings?.businessName || "Bubbleworks", { align: "center" });
    doc.fontSize(14).font("Helvetica").text("Business Analytics Report", { align: "center" });
    if (startDate && endDate) {
      doc.fontSize(10).text(`Period: ${startDate} to ${endDate}`, { align: "center" });
    }
    doc.moveDown(2);

    // Summary Cards (in a grid)
    const cardY = doc.y;
    doc.rect(40, cardY, 150, 60).stroke();
    doc.fontSize(10).text("TOTAL REVENUE", 50, cardY + 12);
    doc.fontSize(14).font("Helvetica-Bold").text(`INR ${totalRevenue.toFixed(2)}`, 50, cardY + 30);

    doc.rect(210, cardY, 150, 60).stroke();
    doc.font("Helvetica").fontSize(10).text("PAID RECEIVED", 220, cardY + 12);
    doc.fontSize(14).font("Helvetica-Bold").text(`INR ${totalReceived.toFixed(2)}`, 220, cardY + 30);

    doc.rect(380, cardY, 150, 60).stroke();
    doc.font("Helvetica").fontSize(10).text("OUTSTANDING DUE", 390, cardY + 12);
    doc.fontSize(14).font("Helvetica-Bold").text(`INR ${totalBalance.toFixed(2)}`, 390, cardY + 30);

    doc.moveDown(5);

    // Tax summary
    doc.font("Helvetica").fontSize(11).text(`GST Tax Collected: INR ${totalGst.toFixed(2)}`);
    doc.text(`Total Orders Count: ${orders.length}`);
    doc.moveDown(2);

    // List of Orders Table
    doc.fontSize(12).font("Helvetica-Bold").text("Billed Transaction Ledger");
    doc.moveDown();

    const billX = 40;
    const dateX = 180;
    const statusX = 300;
    const amountX = 420;
    const tableY = doc.y;

    doc.fontSize(10).text("Bill Number", billX, tableY);
    doc.text("Order Date", dateX, tableY);
    doc.text("Payment Status", statusX, tableY);
    doc.text("Grand Total", amountX, tableY);

    doc.y = tableY + 15;
    doc.moveTo(40, doc.y).lineTo(520, doc.y).stroke();
    doc.moveDown();

    orders.slice(0, 30).forEach((order) => {
      const rowY = doc.y;
      doc.font("Helvetica").text(order.billNumber, billX, rowY);
      doc.text(new Date(order.orderDate).toLocaleDateString(), dateX, rowY);
      doc.text(order.paymentStatus, statusX, rowY);
      doc.text(`INR ${Number(order.grandTotal).toFixed(2)}`, amountX, rowY);
      doc.y = rowY + 15;
    });

    if (orders.length > 30) {
      doc.fontSize(9).text(`...and ${orders.length - 30} more orders logged in this range.`, billX, doc.y + 10);
    }

    doc.end();
  }),
);

reportsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { branchId, startDate, endDate } = req.query;

    const resolvedBranchId = resolveBranchScope(
      req.user!,
      typeof branchId === "string" ? branchId : undefined
    );

    const where: any = {};
    if (resolvedBranchId) {
      where.branchId = resolvedBranchId;
    }

    if (typeof startDate === "string" && startDate !== "") {
      where.orderDate = { ...where.orderDate, gte: new Date(startDate) };
    }
    if (typeof endDate === "string" && endDate !== "") {
      where.orderDate = { ...where.orderDate, lte: new Date(endDate) };
    }

    // 1. Get summary aggregates
    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        grandTotal: true,
        gstAmount: true,
        paidAmount: true,
        balanceAmount: true,
        orderDate: true,
        paymentStatus: true,
        status: true,
      },
    });

    const totalOrdersCount = orders.length;
    let totalRevenue = 0;
    let totalGst = 0;
    let totalReceived = 0;
    let totalBalance = 0;

    orders.forEach((o) => {
      totalRevenue += Number(o.grandTotal);
      totalGst += Number(o.gstAmount);
      totalReceived += Number(o.paidAmount);
      totalBalance += Number(o.balanceAmount);
    });

    // 2. Payments details breakdown
    const payments = await prisma.payment.findMany({
      where: resolvedBranchId ? { branchId: resolvedBranchId } : {},
      select: {
        method: true,
        amount: true,
        paidAt: true,
      },
    });

    const paymentMethods: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      CREDIT: 0,
    };

    payments.forEach((p) => {
      if (paymentMethods[p.method] !== undefined) {
        paymentMethods[p.method] += Number(p.amount);
      }
    });

    // 3. Status breakdown
    const statusBreakdown: Record<string, number> = {
      RECEIVED: 0,
      WASHING: 0,
      DRYING: 0,
      IRONING: 0,
      READY: 0,
      DELIVERED: 0,
    };

    orders.forEach((o) => {
      if (statusBreakdown[o.status] !== undefined) {
        statusBreakdown[o.status]++;
      }
    });

    // 4. Over time (Daily charts - e.g., last 30 days or filtered range)
    // Group orders by date (YYYY-MM-DD)
    const dailyDataMap: Record<string, { date: string; revenue: number; gst: number; orders: number }> = {};
    orders.forEach((o) => {
      const dateStr = o.orderDate.toISOString().split("T")[0];
      if (!dailyDataMap[dateStr]) {
        dailyDataMap[dateStr] = { date: dateStr, revenue: 0, gst: 0, orders: 0 };
      }
      dailyDataMap[dateStr].revenue += Number(o.grandTotal);
      dailyDataMap[dateStr].gst += Number(o.gstAmount);
      dailyDataMap[dateStr].orders += 1;
    });

    const dailyData = Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      summary: {
        totalOrders: totalOrdersCount,
        totalRevenue,
        totalGst,
        totalReceived,
        totalBalance,
      },
      paymentMethods,
      statusBreakdown,
      dailyData,
    });
  }),
);
