"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  getOrders, 
  getBranches, 
  updateOrderStatus, 
  Order, 
  Branch 
} from "@/lib/api";
import { loadSession } from "@/lib/session";
import { 
  Search, 
  Plus, 
  Calendar, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  AlertTriangle,
  Loader2,
  Clock
} from "lucide-react";

export default function OrdersPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  
  // Search and Filters
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Status Change State
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    getOrders({
      search,
      branchId: branchId || undefined,
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      page,
      limit: 10,
    })
      .then((res) => {
        setOrders(res.orders);
        setPagination(res.pagination);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load orders", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    if (!s) {
      router.push("/login");
      return;
    }

    if (s.user?.role === "ADMIN") {
      getBranches()
        .then((res) => setBranches(res.branches))
        .catch((err) => console.error("Failed to load branches", err));
    }
  }, [router]);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, page, branchId, status, paymentStatus]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (session) {
        setPage(1);
        loadData();
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await updateOrderStatus(id, newStatus);
      // Update local state
      setOrders(orders.map((o) => (o.id === id ? { ...o, status: newStatus as any } : o)));
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update status: " + (err instanceof Error ? err.message : "unknown"));
    } finally {
      setUpdatingId(null);
    }
  };

  const isOverdue = (order: Order) => {
    if (order.status === "DELIVERED") return false;
    const deliveryDate = new Date(order.expectedDeliveryDate);
    return deliveryDate < new Date();
  };

  if (!session) return null;

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order Transactions</h1>
          <p className="text-sm text-muted">Manage laundry workflows, print receipts and update item status</p>
        </div>
        {session?.user?.role !== "ADMIN" && (
          <button
            onClick={() => router.push("/billing/new")}
            className="focus-ring flex h-10 items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-md hover:bg-brand/90"
          >
            <Plus className="h-4.5 w-4.5" />
            Create New Bill
          </button>
        )}
      </div>

      {/* Filter and search bar */}
      <div className="rounded-md border border-line bg-surface p-4 shadow-panel flex flex-col md:flex-row gap-3.5 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted" />
          <input
            className="focus-ring h-10 w-full rounded-md border border-line pl-9 pr-3 text-sm bg-white"
            placeholder="Search invoice / customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end">
          {session.user?.role === "ADMIN" && (
            <select
              className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm"
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <select
            className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Workflow Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="WASHING">Washing</option>
            <option value="DRYING">Drying</option>
            <option value="IRONING">Ironing</option>
            <option value="READY">Ready</option>
            <option value="DELIVERED">Delivered</option>
          </select>

          <select
            className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm"
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Payments</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Orders Grid/Table */}
      <div className="rounded-md border border-line bg-surface shadow-panel overflow-hidden">
        {loading ? (
          <div className="flex h-60 items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
            <span className="text-sm text-muted">Retrieving bills...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center gap-1.5 p-6">
            <Clock className="h-8 w-8 text-muted" />
            <p className="text-sm font-semibold text-gray-700">No order matches found</p>
            <p className="text-xs text-muted">Try adjusting search parameters or create a new laundry bill.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-gray-50/50 text-muted">
                  <th className="px-5 py-3 font-semibold">Bill / Token</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Order Date</th>
                  <th className="px-5 py-3 font-semibold">Delivery Date</th>
                  <th className="px-5 py-3 font-semibold">Total Amount</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Workflow Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => {
                  const overdue = isOverdue(order);
                  const isReady = order.status === "READY";
                  const isDelivered = order.status === "DELIVERED";
                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-gray-50/75 transition-colors ${
                        overdue 
                          ? "bg-[#fff1ef]/50 text-red-950" 
                          : isReady 
                          ? "bg-[#fffbeb]/50 text-amber-950 font-medium" 
                          : isDelivered 
                          ? "bg-gray-50/30 text-gray-500 opacity-80" 
                          : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-800 font-mono">{order.billNumber}</div>
                        <div className="text-xs text-muted font-mono">{order.tokenNumber}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-800">{order.customer?.name || "Deleted Customer"}</div>
                        <div className="text-xs text-muted font-mono">{order.customer?.mobile}</div>
                      </td>
                      <td className="px-5 py-3.5 text-muted font-mono text-xs">
                        {new Date(order.orderDate).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 text-xs font-mono text-muted">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                        </div>
                        {overdue && (
                          <div className="flex items-center gap-0.5 text-red-600 font-semibold text-[10px] uppercase mt-0.5">
                            <AlertTriangle className="h-3 w-3" /> Overdue
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-900 font-mono">
                        INR {Number(order.grandTotal).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          order.paymentStatus === "PAID" 
                            ? "bg-green-50 text-green-700 border border-green-100" 
                            : order.paymentStatus === "PARTIAL"
                            ? "bg-orange-50 text-orange-700 border border-orange-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {updatingId === order.id ? (
                          <div className="flex items-center gap-1 text-xs text-muted">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating...
                          </div>
                        ) : (
                          <select
                            disabled={order.status === "DELIVERED"}
                            className={`text-xs font-semibold rounded border px-2 py-1 bg-white outline-none cursor-pointer ${
                              order.status === "DELIVERED"
                                ? "border-gray-200 text-gray-500 bg-gray-50 cursor-not-allowed"
                                : order.status === "READY"
                                ? "border-green-200 text-green-700 bg-green-50/50"
                                : "border-line text-gray-700"
                            }`}
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          >
                            <option value="RECEIVED">Received</option>
                            <option value="WASHING">Washing</option>
                            <option value="DRYING">Drying</option>
                            <option value="IRONING">Ironing</option>
                            <option value="READY">Ready</option>
                            <option value="DELIVERED">Delivered</option>
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => router.push(`/orders/${order.id}/print`)}
                          className="focus-ring inline-flex items-center justify-center h-8 w-8 rounded-md border border-line bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 shadow-sm"
                          title="Print Receipt"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3.5 bg-gray-50/30 text-sm">
            <span className="text-muted">
              Page <span className="font-semibold text-gray-800">{pagination.page}</span> of{" "}
              <span className="font-semibold text-gray-800">{pagination.totalPages}</span> (Total {pagination.total} orders)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="focus-ring flex items-center justify-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className="focus-ring flex items-center justify-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
