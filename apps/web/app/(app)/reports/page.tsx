"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getReports, getBranches, Branch, downloadReportsPdf } from "@/lib/api";
import { loadSession } from "@/lib/session";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from "recharts";
import { 
  TrendingUp, 
  IndianRupee, 
  CreditCard, 
  ShoppingBag, 
  Percent, 
  Calendar, 
  Loader2, 
  RefreshCw,
  Download,
  Printer
} from "lucide-react";

const COLORS = ["#087f8c", "#06B6D4", "#F59E0B", "#EF4444"];

export default function ReportsPage() {
  const [session, setSession] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Filters
  const [branchId, setBranchId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadData = () => {
    setLoading(true);
    setError("");

    getReports(
      branchId || undefined,
      startDate || undefined,
      endDate || undefined
    )
      .then((res) => {
        setReportData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load report analytics");
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
      return;
    }

    // Set default date filter (e.g. last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
    setEndDate(new Date().toISOString().split("T")[0]);

    if (s.user?.role === "ADMIN") {
      getBranches()
        .then((res) => setBranches(res.branches))
        .catch((err) => console.error("Failed to load branches", err));
    }

    return () => {
      window.removeEventListener("error", handleResizeError);
    };
  }, []);

  useEffect(() => {
    if (session && startDate && endDate) {
      loadData();
    }
  }, [session, branchId, startDate, endDate]);

  if (!session) return null;

  // Formatting calculations
  const summary = reportData?.summary || {
    totalOrders: 0,
    totalRevenue: 0,
    totalGst: 0,
    totalReceived: 0,
    totalBalance: 0,
  };

  // Payment methods chart data
  const paymentMethodsData = reportData?.paymentMethods
    ? Object.keys(reportData.paymentMethods).map((key) => ({
        name: key,
        value: reportData.paymentMethods[key],
      }))
    : [];

  // Status breakdown data
  const statusData = reportData?.statusBreakdown
    ? Object.keys(reportData.statusBreakdown).map((key) => ({
        name: key,
        value: reportData.statusBreakdown[key],
      }))
    : [];

  const dailyTrendData = reportData?.dailyData || [];

  const handleExportCSV = () => {
    if (!reportData) return;
    
    // Construct CSV Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Metric,Value\n";
    csvContent += `Total Orders,${summary.totalOrders}\n`;
    csvContent += `Total Revenue,${summary.totalRevenue}\n`;
    csvContent += `Total Received,${summary.totalReceived}\n`;
    csvContent += `Total Balance,${summary.totalBalance}\n`;
    csvContent += `GST Collected,${summary.totalGst}\n\n`;

    csvContent += "Daily Trend Date,Daily Revenue,Daily GST,Daily Orders\n";
    dailyTrendData.forEach((day: any) => {
      csvContent += `${day.date},${day.revenue},${day.gst},${day.orders}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laundry_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!reportData) return;
    setDownloadingPdf(true);
    setError("");
    try {
      await downloadReportsPdf(
        branchId || undefined,
        startDate || undefined,
        endDate || undefined
      );
    } catch (err: any) {
      setError(err.message || "Failed to download PDF report");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          nav, header, aside, .no-print, button {
            display: none !important;
          }
          body, main, #root {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .lg\\:pl-64 {
            padding-left: 0 !important;
          }
        }
      `}</style>
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Analytics</h1>
          <p className="text-sm text-muted">Real-time revenue tracking, tax compliance and payment audits</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="rounded-md border border-line bg-surface p-4 shadow-panel flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3.5 w-full md:w-auto">
          {session.user?.role === "ADMIN" && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted uppercase">Branch</label>
              <select
                className="focus-ring h-9 rounded-md border border-line bg-white px-2.5 text-xs font-semibold"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted uppercase">From Date</label>
            <input
              type="date"
              className="focus-ring h-9 rounded-md border border-line bg-white px-2.5 text-xs font-semibold font-mono"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted uppercase">To Date</label>
            <input
              type="date"
              className="focus-ring h-9 rounded-md border border-line bg-white px-2.5 text-xs font-semibold font-mono"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 self-end md:self-auto no-print">
          <button
            onClick={loadData}
            className="focus-ring flex h-9 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          
          <button
            onClick={handleExportPDF}
            disabled={!reportData || downloadingPdf}
            className="focus-ring flex h-9 items-center justify-center gap-1.5 rounded-md bg-brand px-3.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {downloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export PDF
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!reportData}
            className="focus-ring flex h-9 items-center justify-center gap-1.5 rounded-md bg-brand px-3.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-80 items-center justify-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
          <span className="text-sm text-muted">Compiling business report...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-md border border-line bg-surface p-4 shadow-panel space-y-1">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold">Total Revenue</span>
                <IndianRupee className="h-4.5 w-4.5 text-brand" />
              </div>
              <p className="text-xl font-bold font-mono">₹ {Number(summary.totalRevenue).toFixed(2)}</p>
              <p className="text-[10px] text-muted">Net sales including GST</p>
            </div>

            <div className="rounded-md border border-line bg-surface p-4 shadow-panel space-y-1">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold">Paid Received</span>
                <CreditCard className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <p className="text-xl font-bold font-mono text-emerald-600 font-semibold">₹ {Number(summary.totalReceived).toFixed(2)}</p>
              <p className="text-[10px] text-muted">Settled cashier payments</p>
            </div>

            <div className="rounded-md border border-line bg-surface p-4 shadow-panel space-y-1">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold">Balance Due</span>
                <TrendingUp className="h-4.5 w-4.5 text-orange-600" />
              </div>
              <p className="text-xl font-bold font-mono text-orange-600 font-semibold">₹ {Number(summary.totalBalance).toFixed(2)}</p>
              <p className="text-[10px] text-muted">Credit and partial receipts</p>
            </div>

            <div className="rounded-md border border-line bg-surface p-4 shadow-panel space-y-1">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold">Tax Collected</span>
                <Percent className="h-4.5 w-4.5 text-cyan-600" />
              </div>
              <p className="text-xl font-bold font-mono">₹ {Number(summary.totalGst).toFixed(2)}</p>
              <p className="text-[10px] text-muted">Total CGST / SGST (18%)</p>
            </div>

            <div className="rounded-md border border-line bg-surface p-4 shadow-panel space-y-1">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold">Billed Orders</span>
                <ShoppingBag className="h-4.5 w-4.5 text-amber-500" />
              </div>
              <p className="text-xl font-bold font-mono">{summary.totalOrders}</p>
              <p className="text-[10px] text-muted">Completed transaction tokens</p>
            </div>
          </div>

          {/* Revenue Trend Over Time */}
          <div className="rounded-md border border-line bg-surface p-5 shadow-panel">
            <h3 className="text-sm font-semibold mb-4 text-gray-800">Sales & Revenue Trend</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dailyTrendData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#087f8c" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#087f8c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF" 
                    fontSize={10} 
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
                  <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: "6px" }}
                    labelStyle={{ fontWeight: "bold", fontSize: "11px" }}
                    itemStyle={{ fontSize: "11px" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#087f8c" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    strokeWidth={2.5}
                    name="Revenue (₹)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown grids */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Payment Method Distribution */}
            <div className="rounded-md border border-line bg-surface p-5 shadow-panel flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold mb-4 text-gray-800">Billed Payment Modes</h3>
                <div className="h-60 flex items-center justify-center">
                  {paymentMethodsData.length === 0 || paymentMethodsData.every(d => d.value === 0) ? (
                    <p className="text-xs text-muted">No payments captured for this range.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethodsData.filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {paymentMethodsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `₹ ${value}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div className="flex justify-center gap-4 text-xs font-mono pt-4 border-t border-line mt-2">
                {paymentMethodsData.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span 
                      className="h-3 w-3 rounded" 
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                    />
                    <span>{item.name}: ₹ {Number(item.value).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow Status Distribution */}
            <div className="rounded-md border border-line bg-surface p-5 shadow-panel">
              <h3 className="text-sm font-semibold mb-4 text-gray-800">Workflow Load Distribution</h3>
              <div className="h-60 flex items-center justify-center">
                {statusData.length === 0 || statusData.every(d => d.value === 0) ? (
                  <p className="text-xs text-muted">No active order metrics available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={9} tickLine={false} />
                      <YAxis stroke="#9CA3AF" fontSize={9} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#087f8c" radius={[4, 4, 0, 0]} name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
