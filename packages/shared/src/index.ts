import { z } from "zod";

export const userRoles = ["ADMIN", "CASHIER"] as const;
export const userStatuses = ["ACTIVE", "DISABLED"] as const;
export const branchStatuses = ["ACTIVE", "INACTIVE"] as const;
export const serviceStatuses = ["ACTIVE", "INACTIVE"] as const;
export const pricingTypes = ["PER_PIECE", "PER_KG"] as const;
export const orderStatuses = [
  "RECEIVED",
  "WASHING",
  "DRYING",
  "IRONING",
  "READY",
  "DELIVERED",
] as const;
export const paymentMethods = ["CASH", "UPI", "CARD", "CREDIT"] as const;
export const paymentStatuses = ["PAID", "PARTIAL", "UNPAID"] as const;
export const printerSizes = ["MM_58", "MM_80"] as const;
export const auditActions = [
  "LOGIN",
  "BILL_CREATED",
  "BILL_EDITED",
  "BILL_REPRINTED",
  "CUSTOMER_ADDED",
  "CUSTOMER_UPDATED",
  "BRANCH_ADDED",
  "CASHIER_CREATED",
  "SETTINGS_UPDATED",
  "DATA_CLEARED",
] as const;

export type UserRole = (typeof userRoles)[number];
export type UserStatus = (typeof userStatuses)[number];
export type BranchStatus = (typeof branchStatuses)[number];
export type ServiceStatus = (typeof serviceStatuses)[number];
export type PricingType = (typeof pricingTypes)[number];
export type OrderStatus = (typeof orderStatuses)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type PrinterSize = (typeof printerSizes)[number];
export type AuditAction = (typeof auditActions)[number];

export const userRoleSchema = z.enum(userRoles);
export const paymentMethodSchema = z.enum(paymentMethods);
export const orderStatusSchema = z.enum(orderStatuses);

export const loginSchema = z.object({
  username: z.string().trim().min(3).max(80),
  password: z.string().min(8).max(200),
});

export const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(12).toUpperCase(),
  address: z.string().trim().min(2).max(500),
  mobile: z.string().trim().min(7).max(20),
  status: z.enum(branchStatuses).default("ACTIVE"),
});

export const createCustomerSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(7).max(20),
  address: z.string().trim().max(500).optional().default(""),
});

export const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(""),
  pricingType: z.enum(pricingTypes),
  defaultRate: z.coerce.number().nonnegative(),
  gstRate: z.coerce.number().min(0).max(100).default(18),
  status: z.enum(serviceStatuses).default("ACTIVE"),
});

export const billingItemSchema = z.object({
  serviceId: z.string().uuid().optional(),
  serviceName: z.string().trim().min(1).max(120),
  pricingType: z.enum(pricingTypes),
  quantity: z.coerce.number().int().nonnegative().optional(),
  weightKg: z.coerce.number().nonnegative().optional(),
  rate: z.coerce.number().nonnegative(),
});

export const createOrderSchema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid(),
  orderDate: z.string().datetime().optional(),
  expectedDeliveryDate: z.string().datetime(),
  discountAmount: z.coerce.number().nonnegative().default(0),
  roundOff: z.coerce.number().default(0),
  gstRate: z.coerce.number().min(0).max(100).default(18),
  paymentMethod: paymentMethodSchema,
  paidAmount: z.coerce.number().nonnegative().default(0),
  notes: z.string().trim().max(1000).optional().default(""),
  items: z.array(billingItemSchema).min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type BillingItemInput = z.infer<typeof billingItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export type BillingTotals = {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  gstAmount: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
};

export function calculateItemAmount(item: BillingItemInput): number {
  const unitCount = item.pricingType === "PER_KG" ? item.weightKg ?? 0 : item.quantity ?? 0;
  return roundMoney(unitCount * item.rate);
}

export function calculateBillingTotals(input: {
  items: BillingItemInput[];
  discountAmount?: number;
  gstRate?: number;
  paidAmount?: number;
  roundOff?: number;
}): BillingTotals {
  const subtotal = roundMoney(input.items.reduce((sum, item) => sum + calculateItemAmount(item), 0));
  const discountAmount = roundMoney(Math.min(input.discountAmount ?? 0, subtotal));
  const taxableAmount = roundMoney(subtotal - discountAmount);
  
  const gstRate = input.gstRate ?? 18;
  const halfGstRate = gstRate / 2;
  const cgstAmount = roundMoney(taxableAmount * (halfGstRate / 100));
  const sgstAmount = roundMoney(taxableAmount * (halfGstRate / 100));
  const gstAmount = roundMoney(cgstAmount + sgstAmount);
  
  const roundOff = input.roundOff ?? 0;
  const grandTotal = roundMoney(taxableAmount + gstAmount + roundOff);
  const paidAmount = roundMoney(Math.min(input.paidAmount ?? grandTotal, grandTotal));
  const balanceAmount = roundMoney(grandTotal - paidAmount);
  const paymentStatus: PaymentStatus =
    balanceAmount === 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    gstRate,
    cgstAmount,
    sgstAmount,
    gstAmount,
    roundOff,
    grandTotal,
    paidAmount,
    balanceAmount,
    paymentStatus,
  };
}

export function formatBillNumber(branchCode: string, date: Date, sequence: number): string {
  return `${branchCode.toUpperCase()}-${formatDateKey(date)}-${String(sequence).padStart(4, "0")}`;
}

export function formatTokenNumber(date: Date, sequence: number): string {
  return `TKN-${formatDateKey(date)}-${String(sequence).padStart(4, "0")}`;
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
