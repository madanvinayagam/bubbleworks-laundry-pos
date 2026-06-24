"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getPublicOrderStatus } from "@/lib/api";
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Phone, 
  MapPin, 
  Shirt, 
  Sparkles, 
  Flame, 
  Activity,
  Smile,
  Truck
} from "lucide-react";

const STAGES = [
  { key: "RECEIVED", label: "Received", desc: "Order has been scanned & cataloged", icon: Shirt },
  { key: "WASHING", label: "Washing", desc: "Currently in washing cycle", icon: Sparkles },
  { key: "DRYING", label: "Drying", desc: "Tumbled dry & moisture checks", icon: Activity },
  { key: "IRONING", label: "Ironing", desc: "Steam pressed & processed", icon: Flame },
  { key: "READY", label: "Ready", desc: "Folded & ready for pickup", icon: Smile },
  { key: "DELIVERED", label: "Delivered", desc: "Successfully picked up by client", icon: Truck },
];

function StatusLookup() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [billNumber, setBillNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");

  const doLookup = (bill: string, phone: string) => {
    setLoading(true);
    setError("");
    setOrder(null);
    getPublicOrderStatus(bill, phone)
      .then((res) => {
        setOrder(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "No order matches this bill number & phone");
        setLoading(false);
      });
  };

  useEffect(() => {
    const bill = searchParams.get("bill");
    const phone = searchParams.get("phone");
    if (bill && phone) {
      setBillNumber(bill);
      setMobile(phone);
      doLookup(bill, phone);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNumber || !mobile) {
      setError("Please fill out both bill number and mobile number.");
      return;
    }
    // Update query params without reloading
    const params = new URLSearchParams();
    params.set("bill", billNumber.trim());
    params.set("phone", mobile.trim());
    router.push(`/orders/status?${params.toString()}`);
  };

  // Find active step index
  const activeIndex = order ? STAGES.findIndex((s) => s.key === order.status) : -1;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 bg-gradient-to-r from-brand to-cyan-600 bg-clip-text text-transparent">
          Bubbleworks Laundry
        </h1>
        <p className="text-sm text-gray-500">Track order progress from wash to delivery in real time</p>
      </div>

      {/* Query Form */}
      <div className="rounded-xl border border-line bg-white p-5 shadow-sm space-y-4">
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted uppercase">Bill Number</label>
            <input
              type="text"
              className="focus-ring h-10 rounded-md border border-line px-3 text-sm bg-gray-50/50"
              placeholder="e.g. MAIN-20260623-0001"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted uppercase">Customer Mobile</label>
            <input
              type="tel"
              className="focus-ring h-10 rounded-md border border-line px-3 text-sm bg-gray-50/50"
              placeholder="e.g. 9876543210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="focus-ring flex h-10 items-center justify-center gap-1.5 rounded-md bg-brand px-5 text-sm font-semibold text-white shadow hover:bg-brand/90 self-end disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Search className="h-4.5 w-4.5" />}
            Track Order
          </button>
        </form>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 text-red-600" />
            {error}
          </div>
        )}
      </div>

      {/* Lookup results */}
      {order && (
        <div className="space-y-6">
          {/* Status Tracker Graphic */}
          <div className="rounded-xl border border-line bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-line pb-4 gap-2">
              <div>
                <span className="text-xs font-bold text-brand font-mono">TOKEN: {order.tokenNumber}</span>
                <h2 className="text-xl font-bold text-gray-800 mt-0.5">Order Status: <span className="text-brand">{order.status}</span></h2>
              </div>
              <div className="text-xs text-muted font-mono sm:text-right">
                <div>Order Date: {new Date(order.orderDate).toLocaleDateString()}</div>
                <div>Expected Pick-up: <span className="font-semibold text-gray-700">{new Date(order.expectedDeliveryDate).toLocaleDateString()}</span></div>
              </div>
            </div>

            {/* Stages Progression */}
            <div className="relative pt-4">
              {/* Desktop Progress Line */}
              <div className="absolute left-6 right-6 top-10 hidden h-1 bg-gray-200 sm:block">
                <div 
                  className="h-full bg-brand transition-all duration-500"
                  style={{ width: `${(activeIndex / (STAGES.length - 1)) * 100}%` }}
                />
              </div>

              {/* Steps Layout */}
              <div className="grid gap-6 sm:grid-cols-6 text-center">
                {STAGES.map((stage, idx) => {
                  const Icon = stage.icon;
                  const isDone = idx <= activeIndex;
                  const isCurrent = idx === activeIndex;
                  return (
                    <div key={stage.key} className="flex sm:flex-col items-center gap-4 sm:gap-2 relative z-1">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 ${
                        isCurrent 
                          ? "border-brand bg-brand text-white ring-4 ring-brand/10 shadow-md scale-110" 
                          : isDone 
                          ? "border-brand bg-brand/10 text-brand font-semibold" 
                          : "border-line bg-gray-50 text-gray-400"
                      }`}>
                        {isDone && !isCurrent ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="text-left sm:text-center space-y-0.5">
                        <p className={`text-sm font-semibold ${isDone ? "text-gray-800" : "text-gray-400"}`}>
                          {stage.label}
                        </p>
                        <p className="text-[10px] text-muted max-w-[100px] leading-tight hidden sm:block mx-auto">
                          {stage.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Details & Items Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Items list */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-800">laundry Bag Items</h3>
              <div className="divide-y divide-line text-sm">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-2.5">
                    <div>
                      <div className="font-medium text-gray-800">{item.serviceNameSnapshot}</div>
                      <div className="text-xs text-muted font-mono">{item.pricingType}</div>
                    </div>
                    <span className="font-semibold text-gray-700 font-mono mt-1">
                      {item.pricingType === "PER_KG" ? `${Number(item.weightKg).toFixed(2)} kg` : `${item.quantity} units`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Branch info & Contact */}
            <div className="rounded-xl border border-line bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-800">Branch Details</h3>
                <div className="space-y-2.5 text-sm text-gray-600">
                  <div className="flex gap-2">
                    <MapPin className="h-4.5 w-4.5 text-muted mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-800">{order.branch.name}</p>
                      <p className="text-xs text-muted leading-tight">{order.branch.address}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Phone className="h-4.5 w-4.5 text-muted" />
                    <span className="font-mono">{order.branch.mobile}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-xs text-muted border border-line leading-relaxed">
                If you have questions regarding your order status, please contact the branch directly using the phone number listed above.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicStatusPage() {
  return (
    <main className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6">
      <Suspense fallback={
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm text-muted">Booting customer lookup terminal...</p>
        </div>
      }>
        <StatusLookup />
      </Suspense>
    </main>
  );
}
