"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getReports, getOrders, getBranches, Branch, Order } from "@/lib/api";
import { loadSession } from "@/lib/session";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";
import { 
  TrendingUp, 
  IndianRupee, 
  CreditCard, 
  ShoppingBag, 
  Percent, 
  Calendar, 
  Loader2, 
  ArrowRight,
  Clock,
  Printer
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [branchId, setBranchId] = useState("");

  const loadDashboardData = () => {
    setLoading(true);
    // Fetch last 30 days of data for the dashboard
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    Promise.all([
      getReports(branchId || undefined, startDate, endDate),
      getOrders({ branchId: branchId || undefined, page: 1, limit: 5 })
    ])
      .then(([rep, ords]) => {
        setReportData(rep);
        setRecentOrders(ords.orders);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dashboard data", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    // Suppress harmless Recharts ResizeObserver loop limit errors from showing up in dev overlays
    const handleResizeError = (e: ErrorEvent) => {
      if (
        e.message?.includes("ResizeObserver loop limit exceeded") ||
        e.message?.includes("ResizeObserver loop completed with undelivered notifications")
      ) {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("error", handleResizeError);

    const s = loadSession();
    setSession(s);
    if (!s) {
      window.removeEventListener("error", handleResizeError);
      router.push("/login");
      return;
    }

    if (s.user?.role === "ADMIN") {
      getBranches()
        .then((res) => setBranches(res.branches))
        .catch((err) => console.error("Failed to load branches", err));
    }

    return () => {
      window.removeEventListener("error", handleResizeError);
    };
  }, [router]);

  useEffect(() => {
    if (session) {
      loadDashboardData();
    }
  }, [session, branchId]);

  if (!session) return null;

  const summary = reportData?.summary || {
    totalOrders: 0,
    totalRevenue: 0,
    totalGst: 0,
    totalReceived: 0,
    totalBalance: 0,
  };

  const dailyTrendData = reportData?.dailyData || [];
  const statusBreakdown = reportData?.statusBreakdown || {
    RECEIVED: 0,
    WASHING: 0,
    DRYING: 0,
    IRONING: 0,
    READY: 0,
    DELIVERED: 0,
  };
  const activeProcessingCount = 
    (statusBreakdown.RECEIVED || 0) + 
    (statusBreakdown.WASHING || 0) + 
    (statusBreakdown.DRYING || 0) + 
    (statusBreakdown.IRONING || 0);

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview Dashboard</h1>
          <p className="text-sm text-muted">Branch status overview, active queues and billing highlights</p>
        </div>
        <div className="flex items-center gap-3">
          {session.user?.role === "ADMIN" && (
            <select
              className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm font-semibold"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">All Branches Overview</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          {session?.user?.role !== "ADMIN" && (
            <button
              onClick={() => router.push("/billing/new")}
              className="focus-ring flex h-10 items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-md hover:bg-brand/90"
            >
              New laundry Bill
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-80 items-center justify-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
          <span className="text-sm text-muted">Loading overview ledger...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI 1: Billed Revenue */}
            <div className="rounded-md border border-line bg-surface p-4 shadow-panel space-y-1">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold">Today's Sales Revenue</span>
                <IndianRupee className="h-4.5 w-4.5 text-brand" />
              </div>
              <p className="text-xl font-bold font-mono text-gray-900">₹ {Number(summary.totalRevenue).toFixed(2)}</p>
              <p className="text-[10px] text-muted">Billed overall orders totals</p>
            </div>

            {session.user?.role === "ADMIN" ? (
              <>
                {/* Admin KPI 2: Payment Received */}
                <div className="rounded-md border border-line bg-surface p-4 shadow-panel space-y-1">
                  <div className="flex items-center justify-between text-muted">
                    <span className="text-xs font-semibold">Payment Received</span>
                    <CreditCard className="h-4.5 w-4.5 text-emerald-600" />
                  </div>
                  <p className="text-xl font-bold font-mono text-emerald-600">₹ {Number(summary.totalReceived).toFixed(2)}</p>
                  <p className="text-[10px] text-muted">Settled cashier cashflows</p>
                </div>

                {/* Admin KPI 3: Outstanding Balances */}
                <div className="rounded-md border border-line bg-surface p-4 shadow-panel space-y-1">
                  <div className="flex items-center justify-between text-muted">
                    <span className="text-xs font-semibold">Outstanding Balances</span>
                    <TrendingUp className="h-4.5 w-4.5 text-orange-600" />
                  </div>
                  <p className="text-xl font-bold font-mono text-orange-600">₹ {Number(summary.totalBalance).toFixed(2)}</p>
                  <p className="text-[10px] text-muted">Partial and credit bills</p>
                </div>
              </>
            ) : (
              <>
                {/* Cashier KPI 2: Ready for Pickup */}
                <div className="rounded-md border border-line bg-surface p-4 shadow-panel space-y-1">
                  <div className="flex items-center justify-between text-muted">
                    <span className="text-xs font-semibold">Ready for Pickup</span>
                    <Clock className="h-4.5 w-4.5 text-amber-500" />
                  </div>
                  <p className="text-xl font-bold font-mono text-amber-500">{statusBreakdown.READY || 0}</p>
                  <p className="text-[10px] text-muted">Orders awaiting customer delivery</p>
                </div>

                {/* Cashier KPI 3: Processing in Laundry */}
                <div className="rounded-md border border-line bg-surface p-4 shadow-panel space-y-1">
                  <div className="flex items-center justify-between text-muted">
                    <span className="text-xs font-semibold">Active Processing</span>
                    <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
                  </div>
                  <p className="text-xl font-bold font-mono text-indigo-600">{activeProcessingCount}</p>
                  <p className="text-[10px] text-muted">Items washing, drying, or ironing</p>
                </div>
              </>
            )}

            {/* KPI 4: Active Queue Totals */}
            <div className="rounded-md border border-line bg-surface p-4 shadow-panel space-y-1">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold">Active Orders Queue</span>
                <ShoppingBag className="h-4.5 w-4.5 text-brand" />
              </div>
              <p className="text-xl font-bold font-mono text-gray-900">{summary.totalOrders}</p>
              <p className="text-[10px] text-muted">Total active process tokens</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            {/* Sales Chart */}
            <div className="rounded-md border border-line bg-surface p-5 shadow-panel">
              <h3 className="text-sm font-semibold mb-4 text-gray-800">Sales Trend (Last 30 Days)</h3>
              <div className="h-64 w-full">
                {dailyTrendData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    No active transaction history yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dailyTrendData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#087f8c" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#087f8c" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF" 
                        fontSize={9} 
                        tickLine={false}
                        tickFormatter={(tick) => {
                          try {
                            const d = new Date(tick);
                            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                          } catch {
                            return tick;
                          }
                        }}
                      />
                      <YAxis stroke="#9CA3AF" fontSize={9} tickLine={false} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#087f8c" 
                        fillOpacity={1} 
                        fill="url(#dashboardRevenue)" 
                        strokeWidth={2}
                        name="Sales (₹)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recent Orders Panel */}
            <div className="rounded-md border border-line bg-surface p-5 shadow-panel space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="text-sm font-semibold text-gray-800">Recent Transactions</h3>
                <button
                  onClick={() => router.push("/orders")}
                  className="flex items-center gap-1 text-xs text-brand font-semibold hover:underline"
                >
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {recentOrders.length === 0 ? (
                <div className="flex h-52 flex-col items-center justify-center gap-1 p-4 border border-dashed border-line bg-white/50 rounded-md">
                  <Clock className="h-6 w-6 text-muted" />
                  <p className="text-xs text-muted">No transactions registered today.</p>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {recentOrders.map((ord) => (
                    <div 
                      key={ord.id} 
                      onClick={() => router.push(`/orders/${ord.id}/print`)}
                      className="flex items-center justify-between py-3 hover:bg-gray-50/50 cursor-pointer px-2 rounded-md transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-800 font-mono">{ord.billNumber}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            ord.status === "DELIVERED"
                              ? "bg-green-50 text-green-700 border border-green-100"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted leading-none">
                          {ord.customer?.name} ({ord.customer?.mobile})
                        </p>
                      </div>
                      <div className="text-right space-y-0.5 font-mono">
                        <p className="text-xs font-semibold text-gray-900">₹ {Number(ord.grandTotal).toFixed(0)}</p>
                        <p className="text-[10px] text-muted">{ord.paymentStatus}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
