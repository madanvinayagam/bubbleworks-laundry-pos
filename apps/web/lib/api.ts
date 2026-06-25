import { loadSession } from "./session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ApiSession = {
  token: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: "ADMIN" | "CASHIER";
    branchId: string | null;
    branch?: {
      id: string;
      name: string;
      code: string;
    } | null;
  };
};

export type Branch = {
  id: string;
  name: string;
  code: string;
  address: string;
  mobile: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  name: string;
  mobile: string;
  username: string;
  role: "ADMIN" | "CASHIER";
  status: "ACTIVE" | "DISABLED";
  branchId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  branch?: {
    name: string;
    code: string;
  } | null;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  pricingType: "PER_PIECE" | "PER_KG";
  defaultRate: number;
  gstRate: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
};

export type GlobalSettings = {
  id: string;
  businessName: string;
  logoUrl: string | null;
  address: string;
  mobile: string;
  gstNumber: string;
  defaultGstRate: number;
  printerSize: "MM_58" | "MM_80";
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  id: string;
  branchId: string;
  name: string;
  mobile: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  branch?: {
    name: string;
    code: string;
  } | null;
};

export type CustomerProfile = {
  customer: Customer;
  stats: {
    totalOrders: number;
    totalAmountSpent: number;
    outstandingBalance: number;
    lastVisit: string | null;
  };
  orders: Array<{
    id: string;
    billNumber: string;
    grandTotal: number;
    paidAmount: number;
    balanceAmount: number;
    orderDate: string;
    status: string;
  }>;
};

export class ApiError extends Error {
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.details = details;
  }
}

// Generic request helper with automatic Auth headers
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = loadSession();
  const headers = new Headers(options.headers);

  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = "An error occurred";
    let details: unknown;
    try {
      const data = await response.json();
      details = data.details;
      if (data.details?.fieldErrors) {
        const fieldErrors = data.details.fieldErrors;
        const messages = Object.keys(fieldErrors).map(
          (field) => `${field}: ${fieldErrors[field].join(", ")}`
        );
        message = messages.join("; ");
      } else {
        message = data.error || message;
      }
    } catch {
      // Ignore fallback
    }
    throw new ApiError(message, details);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// 1. Auth Endpoint
export async function login(input: { username: string; password: string }): Promise<ApiSession> {
  return request<ApiSession>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// 2. Branches Endpoints
export async function getBranches(): Promise<{ branches: Branch[] }> {
  return request<{ branches: Branch[] }>("/api/v1/branches");
}

export async function createBranch(input: Omit<Branch, "id" | "createdAt" | "updatedAt">): Promise<{ branch: Branch }> {
  return request<{ branch: Branch }>("/api/v1/branches", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBranch(id: string, input: Partial<Omit<Branch, "id" | "createdAt" | "updatedAt">>): Promise<{ branch: Branch }> {
  return request<{ branch: Branch }>(`/api/v1/branches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function activateBranch(id: string): Promise<{ branch: Branch }> {
  return request<{ branch: Branch }>(`/api/v1/branches/${id}/activate`, {
    method: "POST",
  });
}

export async function deactivateBranch(id: string): Promise<{ branch: Branch }> {
  return request<{ branch: Branch }>(`/api/v1/branches/${id}/deactivate`, {
    method: "POST",
  });
}

export async function getBranchOrders(id: string): Promise<{ orders: any[] }> {
  return request<{ orders: any[] }>(`/api/v1/branches/${id}/orders`);
}

export async function getBranchRevenue(id: string): Promise<{ branchId: string; totalRevenue: number; totalSales: number; orderCount: number }> {
  return request<{ branchId: string; totalRevenue: number; totalSales: number; orderCount: number }>(`/api/v1/branches/${id}/revenue`);
}

// 3. Users / Cashiers Endpoints
export async function getUsers(): Promise<{ users: User[] }> {
  return request<{ users: User[] }>("/api/v1/users");
}

export async function createCashier(input: { name: string; mobile: string; username: string; password?: string; branchId: string }): Promise<{ user: User }> {
  return request<{ user: User }>("/api/v1/users/cashiers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateUser(id: string, input: Partial<Omit<User, "id" | "role" | "status" | "createdAt">> & { password?: string }): Promise<{ user: User }> {
  return request<{ user: User }>(`/api/v1/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function resetUserPassword(id: string, password: string): Promise<void> {
  return request<void>(`/api/v1/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function enableUser(id: string): Promise<{ user: Partial<User> }> {
  return request<{ user: Partial<User> }>(`/api/v1/users/${id}/enable`, {
    method: "POST",
  });
}

export async function disableUser(id: string): Promise<{ user: Partial<User> }> {
  return request<{ user: Partial<User> }>(`/api/v1/users/${id}/disable`, {
    method: "POST",
  });
}

// 4. Services Endpoints
export async function getServices(): Promise<{ services: Service[] }> {
  return request<{ services: Service[] }>("/api/v1/services");
}

export async function createService(input: Omit<Service, "id" | "createdAt" | "updatedAt">): Promise<{ service: Service }> {
  return request<{ service: Service }>("/api/v1/services", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateService(id: string, input: Partial<Omit<Service, "id" | "createdAt" | "updatedAt">>): Promise<{ service: Service }> {
  return request<{ service: Service }>(`/api/v1/services/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteService(id: string): Promise<void> {
  return request<void>(`/api/v1/services/${id}`, {
    method: "DELETE",
  });
}

export async function activateService(id: string): Promise<{ service: Service }> {
  return request<{ service: Service }>(`/api/v1/services/${id}/activate`, {
    method: "POST",
  });
}

export async function deactivateService(id: string): Promise<{ service: Service }> {
  return request<{ service: Service }>(`/api/v1/services/${id}/deactivate`, {
    method: "POST",
  });
}

// 5. Settings Endpoints
export async function getSettings(): Promise<{ settings: GlobalSettings }> {
  return request<{ settings: GlobalSettings }>("/api/v1/settings");
}

export async function updateBusinessSettings(input: { businessName: string; logoUrl?: string | null; address: string; mobile: string; gstNumber?: string }): Promise<{ settings: GlobalSettings }> {
  return request<{ settings: GlobalSettings }>("/api/v1/settings/business", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateTaxSettings(defaultGstRate: number): Promise<{ settings: GlobalSettings }> {
  return request<{ settings: GlobalSettings }>("/api/v1/settings/tax", {
    method: "PATCH",
    body: JSON.stringify({ defaultGstRate }),
  });
}

export async function updatePrinterSettings(printerSize: "MM_58" | "MM_80"): Promise<{ settings: GlobalSettings }> {
  return request<{ settings: GlobalSettings }>("/api/v1/settings/printer", {
    method: "PATCH",
    body: JSON.stringify({ printerSize }),
  });
}

// 6. Customers Endpoints
export async function getCustomers(search?: string, branchId?: string): Promise<{ customers: Customer[] }> {
  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (branchId) queryParams.set("branchId", branchId);
  return request<{ customers: Customer[] }>(`/api/v1/customers?${queryParams.toString()}`);
}

export async function searchCustomers(query: string, branchId?: string): Promise<{ customers: Customer[] }> {
  const queryParams = new URLSearchParams({ query });
  if (branchId) queryParams.set("branchId", branchId);
  return request<{ customers: Customer[] }>(`/api/v1/customers/search?${queryParams.toString()}`);
}

export async function createCustomer(input: Omit<Customer, "id" | "createdAt" | "updatedAt" | "branch">): Promise<{ customer: Customer }> {
  return request<{ customer: Customer }>("/api/v1/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCustomer(id: string, input: Partial<Omit<Customer, "id" | "createdAt" | "updatedAt" | "branch">>): Promise<{ customer: Customer }> {
  return request<{ customer: Customer }>(`/api/v1/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteCustomer(id: string): Promise<void> {
  return request<void>(`/api/v1/customers/${id}`, {
    method: "DELETE",
  });
}

export async function getCustomerProfile(id: string): Promise<CustomerProfile> {
  return request<CustomerProfile>(`/api/v1/customers/${id}/profile`);
}

export type Order = {
  id: string;
  branchId: string;
  customerId: string;
  createdById: string;
  billNumber: string;
  tokenNumber: string;
  status: "RECEIVED" | "WASHING" | "DRYING" | "IRONING" | "READY" | "DELIVERED";
  orderDate: string;
  expectedDeliveryDate: string;
  deliveredDate: string | null;
  subtotal: number;
  discountAmount: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  notes: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    name: string;
    mobile: string;
  };
  branch?: {
    name: string;
    code: string;
  };
};

export type OrderItemInput = {
  serviceId?: string;
  serviceName: string;
  pricingType: "PER_PIECE" | "PER_KG";
  quantity?: number;
  weightKg?: number;
  rate: number;
};

export type CreateOrderInput = {
  branchId: string;
  customerId: string;
  orderDate?: string;
  expectedDeliveryDate: string;
  discountAmount: number;
  gstRate: number;
  paymentMethod: "CASH" | "UPI" | "CARD" | "CREDIT";
  paidAmount: number;
  notes?: string;
  items: OrderItemInput[];
};

// 7. Orders Endpoints
export async function getOrders(params: {
  search?: string;
  branchId?: string;
  status?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{
  orders: Order[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set("search", params.search);
  if (params.branchId) queryParams.set("branchId", params.branchId);
  if (params.status) queryParams.set("status", params.status);
  if (params.paymentStatus) queryParams.set("paymentStatus", params.paymentStatus);
  if (params.page) queryParams.set("page", String(params.page));
  if (params.limit) queryParams.set("limit", String(params.limit));

  return request<{
    orders: Order[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/api/v1/orders?${queryParams.toString()}`);
}

export async function getOrderNumberPreview(branchId?: string): Promise<{
  billNumber: string;
  tokenNumber: string;
  sequenceDate: string;
}> {
  const queryParams = new URLSearchParams();
  if (branchId) queryParams.set("branchId", branchId);
  const suffix = queryParams.toString() ? `?${queryParams.toString()}` : "";
  return request<{
    billNumber: string;
    tokenNumber: string;
    sequenceDate: string;
  }>(`/api/v1/orders/preview${suffix}`);
}

export async function createOrder(input: CreateOrderInput): Promise<{ order: Order }> {
  return request<{ order: Order }>("/api/v1/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getOrder(id: string): Promise<{
  order: Order & {
    items: Array<{
      id: string;
      serviceNameSnapshot: string;
      pricingType: "PER_PIECE" | "PER_KG";
      quantity: number | null;
      weightKg: number | null;
      rate: number;
      amount: number;
    }>;
    payments: Array<{
      id: string;
      method: string;
      amount: number;
      paidAt: string;
      receivedBy: { name: string };
    }>;
    printLogs: Array<{
      id: string;
      printType: string;
      printCount: number;
      printedAt: string;
      user: { name: string };
    }>;
  };
}> {
  return request<{
    order: Order & {
      items: any[];
      payments: any[];
      printLogs: any[];
    };
  }>(`/api/v1/orders/${id}`);
}

export async function updateOrderStatus(id: string, status: string): Promise<{ order: Order }> {
  return request<{ order: Order }>(`/api/v1/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function recordOrderPrint(id: string): Promise<any> {
  return request<any>(`/api/v1/orders/${id}/print`, {
    method: "POST",
  });
}

export async function recordOrderReprint(id: string): Promise<any> {
  return request<any>(`/api/v1/orders/${id}/reprint`, {
    method: "POST",
  });
}

export async function downloadInvoicePdf(id: string, billNumber: string): Promise<void> {
  const session = loadSession();
  const token = session?.token;
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${API_URL}/api/v1/orders/${id}/pdf`, {
    headers
  });
  if (!response.ok) {
    throw new Error("Failed to download PDF invoice");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${billNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadReportsPdf(branchId?: string, startDate?: string, endDate?: string): Promise<void> {
  const session = loadSession();
  const token = session?.token;
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const queryParams = new URLSearchParams();
  if (branchId) queryParams.set("branchId", branchId);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${API_URL}/api/v1/reports/pdf?${queryParams.toString()}`, {
    headers
  });
  if (!response.ok) {
    throw new Error("Failed to download reports PDF");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laundry-report-${startDate || "all"}-to-${endDate || "all"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function getReports(branchId?: string, startDate?: string, endDate?: string): Promise<any> {
  const queryParams = new URLSearchParams();
  if (branchId) queryParams.set("branchId", branchId);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);
  return request<any>(`/api/v1/reports?${queryParams.toString()}`);
}




export async function clearTransactionData(confirmText: string): Promise<any> {
  return request<any>("/api/v1/danger-zone/clear", {
    method: "POST",
    body: JSON.stringify({ confirmText }),
  });
}

export async function getPublicOrderStatus(billNumber: string, mobile: string): Promise<any> {
  const queryParams = new URLSearchParams({ billNumber, mobile });
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${API_URL}/api/v1/orders/public/status?${queryParams.toString()}`);
  if (!response.ok) {
    let message = "Failed to fetch order status";
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}
