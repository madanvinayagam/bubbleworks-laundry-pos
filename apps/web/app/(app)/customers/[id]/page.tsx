"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  CreditCard, 
  Coins, 
  Calendar,
  ChevronRight,
  Clock
} from "lucide-react";
import { getCustomerProfile, type CustomerProfile } from "@/lib/api";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function CustomerProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCustomerProfile(id);
      setProfile(data);
    } catch (err: any) {
      setError(err.message || "Failed to load customer profile details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case "PAID":
        return "bg-[#edf7f6] text-brand border-brand/10";
      case "PARTIAL":
        return "bg-[#fffbe8] text-[#8a6d3b] border-[#faebcc]";
      default:
        return "bg-[#fff1ef] text-danger border-danger/10";
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/customers"
          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Customer Profile</h1>
          <p className="text-sm text-muted">Inspect customer spending habits, credit accounts, and previous orders.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-[#fff1ef] p-4 text-sm text-danger border border-danger/10">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      ) : profile ? (
        <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
          
          {/* Left panel: Info */}
          <div className="rounded-lg border border-line bg-surface p-5 shadow-panel h-fit space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-line">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e9f2f1] text-brand">
                <User size={24} />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-ink">{profile.customer.name}</h2>
                <span className="text-xs text-muted">Customer ID: {profile.customer.id.slice(0, 8)}...</span>
              </div>
            </div>

            <div className="space-y-3 text-sm text-ink">
              <div className="flex items-center gap-2.5">
                <Phone size={15} className="text-muted" />
                <span>{profile.customer.mobile}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin size={15} className="text-muted shrink-0 mt-0.5" />
                <span>{profile.customer.address || "No address details specified"}</span>
              </div>
            </div>
          </div>

          {/* Right panel: Spends and history */}
          <div className="space-y-6">
            
            {/* Spends widgets */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <div className="rounded-lg border border-line bg-surface p-4 shadow-panel">
                <div className="flex items-center gap-1.5 text-muted text-xs font-semibold mb-1 uppercase">
                  <ShoppingBag size={12} />
                  <span>Total Orders</span>
                </div>
                <div className="text-xl font-bold text-ink">{profile.stats.totalOrders}</div>
              </div>
              
              <div className="rounded-lg border border-line bg-surface p-4 shadow-panel">
                <div className="flex items-center gap-1.5 text-muted text-xs font-semibold mb-1 uppercase">
                  <CreditCard size={12} />
                  <span>Total Spent</span>
                </div>
                <div className="text-xl font-bold text-brand">₹{profile.stats.totalAmountSpent.toFixed(2)}</div>
              </div>

              <div className="rounded-lg border border-line bg-surface p-4 shadow-panel">
                <div className="flex items-center gap-1.5 text-muted text-xs font-semibold mb-1 uppercase">
                  <Coins size={12} />
                  <span>Due Credit</span>
                </div>
                <div className={`text-xl font-bold ${profile.stats.outstandingBalance > 0 ? "text-danger" : "text-ink"}`}>
                  ₹{profile.stats.outstandingBalance.toFixed(2)}
                </div>
              </div>

              <div className="rounded-lg border border-line bg-surface p-4 shadow-panel">
                <div className="flex items-center gap-1.5 text-muted text-xs font-semibold mb-1 uppercase">
                  <Calendar size={12} />
                  <span>Last Visit</span>
                </div>
                <div className="text-sm font-bold text-ink py-0.5">
                  {profile.stats.lastVisit ? formatDate(profile.stats.lastVisit) : "Never"}
                </div>
              </div>
            </div>

            {/* Order history table */}
            <div className="rounded-lg border border-line bg-surface shadow-panel overflow-hidden">
              <div className="border-b border-line px-5 py-4 bg-[#eef3f1] font-semibold text-ink">
                Order History
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-line bg-background font-semibold text-muted">
                    <tr>
                      <th className="px-5 py-3">Bill Number</th>
                      <th className="px-5 py-3">Order Date</th>
                      <th className="px-5 py-3">Grand Total</th>
                      <th className="px-5 py-3">Paid Amount</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.orders.length > 0 ? (
                      profile.orders.map((order) => (
                        <tr key={order.id} className="border-b border-line hover:bg-background/40 transition-colors">
                          <td className="px-5 py-3 font-semibold text-ink">{order.billNumber}</td>
                          <td className="px-5 py-3 text-muted">{formatDate(order.orderDate)}</td>
                          <td className="px-5 py-3 font-medium text-ink">₹{Number(order.grandTotal).toFixed(2)}</td>
                          <td className="px-5 py-3 text-muted">₹{Number(order.paidAmount).toFixed(2)}</td>
                          <td className="px-5 py-3">
                            <span 
                              className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border ${getStatusStyle(order.status)}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              href={`/orders/${order.id}`}
                              className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted"
                            >
                              <ChevronRight size={15} />
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-muted">
                          No previous orders found for this customer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-muted">Customer details not available.</div>
      )}
    </section>
  );
}
