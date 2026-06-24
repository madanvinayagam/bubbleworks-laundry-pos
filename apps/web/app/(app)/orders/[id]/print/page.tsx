"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  getOrder, 
  getSettings,
  recordOrderPrint, 
  recordOrderReprint, 
  downloadInvoicePdf 
} from "@/lib/api";
import { loadSession } from "@/lib/session";
import { Loader2, Printer, Download, ArrowLeft, RefreshCw } from "lucide-react";

export default function OrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [session, setSession] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printerSize, setPrinterSize] = useState<"MM_58" | "MM_80">("MM_80");
  const [printStatus, setPrintStatus] = useState<"idle" | "printing" | "success" | "error">("idle");

  const loadData = () => {
    setError("");
    Promise.all([getOrder(orderId), getSettings()])
      .then(([{ order: o }, { settings: s }]) => {
        setOrder(o);
        setSettings(s);
        setPrinterSize(s?.printerSize || "MM_80");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load order printable receipt");
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
    loadData();
  }, [orderId, router]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 no-print">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-sm text-muted">Retrieving order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-600 no-print">
        <p className="font-semibold">Error Loading Invoice</p>
        <p>{error || "Order details could not be found."}</p>
        <button
          onClick={loadData}
          className="mt-3 flex items-center gap-1.5 font-semibold text-brand hover:underline text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry Loading
        </button>
      </div>
    );
  }

  const handlePrint = async () => {
    setPrintStatus("printing");
    try {
      // Determine if there is already an ORIGINAL print log for this order
      const hasOriginalPrint = order.printLogs.some((l: any) => l.printType === "ORIGINAL");
      
      if (!hasOriginalPrint) {
        await recordOrderPrint(order.id);
      } else {
        await recordOrderReprint(order.id);
      }
      
      // Reload print logs counters
      const { order: updated } = await getOrder(order.id);
      setOrder(updated);
      
      // Trigger browser print
      window.print();
      setPrintStatus("success");
    } catch (err) {
      console.error(err);
      setPrintStatus("error");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadInvoicePdf(order.id, order.billNumber);
    } catch (err: any) {
      alert(err.message || "Failed to download PDF invoice");
    }
  };

  const hasPrintedOriginal = order.printLogs.some((l: any) => l.printType === "ORIGINAL");
  
  // Status check URL for customer QR code
  // Generate a URL on the domain that shows order status lookup
  const webDomain = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const orderLookupUrl = `${webDomain}/orders/status?bill=${order.billNumber}&phone=${order.customer.mobile}`;

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          /* Hide sidebar, navigation and header wrappers */
          nav, header, aside, .no-print, button, footer {
            display: none !important;
          }
          /* Full page width, reset padding and background */
          body, main, #root, div {
            background: white !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-container {
            width: ${printerSize === "MM_58" ? "58mm" : "80mm"} !important;
            padding: 2mm !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
            color: black !important;
            margin: 0 auto !important;
          }
          .print-header {
            font-size: 16px !important;
          }
          .print-mono {
            font-family: monospace !important;
          }
        }
      `}</style>

      <section className="space-y-6">
        {/* Controls Panel (Hidden in Print) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4 no-print">
          <div>
            <button
              onClick={() => router.push("/orders")}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-gray-800 font-semibold mb-1"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Orders
            </button>
            <h1 className="text-2xl font-bold tracking-tight">Print Receipt</h1>
            <p className="text-sm text-muted">Invoice configuration and print terminal logging</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {/* Size Selector */}
            <div className="flex rounded-md border border-line p-1 bg-surface">
              <button
                onClick={() => setPrinterSize("MM_80")}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  printerSize === "MM_80" ? "bg-white text-gray-800 shadow-sm" : "text-muted hover:text-gray-800"
                }`}
              >
                80 mm
              </button>
              <button
                onClick={() => setPrinterSize("MM_58")}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  printerSize === "MM_58" ? "bg-white text-gray-800 shadow-sm" : "text-muted hover:text-gray-800"
                }`}
              >
                58 mm
              </button>
            </div>
            {/* Action Buttons */}
            <button
              onClick={handlePrint}
              className="focus-ring flex h-10 items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-md hover:bg-brand/90"
            >
              <Printer className="h-4.5 w-4.5" />
              {hasPrintedOriginal ? "Reprint Invoice" : "Print Invoice"}
            </button>
            <button
              onClick={handleDownloadPdf}
              className="focus-ring flex h-10 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:bg-gray-50 text-gray-700"
            >
              <Download className="h-4.5 w-4.5" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Info Card (Hidden in Print) */}
        <div className="rounded-md border border-line bg-surface p-4 text-sm space-y-2 no-print shadow-panel">
          <h2 className="font-semibold text-gray-800">Print Tracker Log Details</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <span className="text-muted">Total Copies:</span>{" "}
              <span className="font-semibold font-mono text-gray-800">
                {order.printLogs.reduce((acc: number, l: any) => acc + l.printCount, 0)}
              </span>
            </div>
            <div>
              <span className="text-muted">Original Printed:</span>{" "}
              <span className="font-semibold">
                {hasPrintedOriginal ? "Yes" : "No (Pending Print)"}
              </span>
            </div>
            <div>
              <span className="text-muted">Reprints Counts:</span>{" "}
              <span className="font-semibold font-mono text-gray-800">
                {order.printLogs.filter((l: any) => l.printType === "REPRINT").length}
              </span>
            </div>
          </div>
          {order.printLogs.length > 0 && (
            <div className="pt-2 border-t border-line text-xs space-y-1 text-muted max-h-24 overflow-y-auto">
              {order.printLogs.map((log: any) => (
                <div key={log.id} className="flex justify-between font-mono">
                  <span>{log.printType} - {log.user.name}</span>
                  <span>{new Date(log.printedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Receipt Page View (Active Print Block) */}
        <div className="flex justify-center bg-gray-100 p-6 no-print rounded-lg border border-dashed border-line">
          <div 
            className="bg-white p-6 shadow-md border border-line print-container"
            style={{ width: printerSize === "MM_58" ? "58mm" : "80mm" }}
          >
            {/* Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-300">
              <h2 className="text-lg font-bold print-header tracking-tight">
                {settings?.businessName || "Bubbleworks"}
              </h2>
              {settings?.address && <p className="text-xs text-gray-600">{settings.address}</p>}
              {settings?.mobile && <p className="text-xs text-gray-600">Mobile: {settings.mobile}</p>}
              {settings?.gstNumber && <p className="text-xs text-gray-600 font-mono">GST: {settings.gstNumber}</p>}
            </div>

            {/* Receipt metadata */}
            <div className="py-3 text-xs space-y-1 border-b border-dashed border-gray-300 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Bill No:</span>
                <span className="font-semibold">{order.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Token No:</span>
                <span className="font-semibold">{order.tokenNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span>{new Date(order.orderDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Deliv Date:</span>
                <span>{new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-100">
                <span className="text-gray-500">Cust Name:</span>
                <span className="font-semibold">{order.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mobile:</span>
                <span>{order.customer.mobile}</span>
              </div>
              {order.customer.address && (
                <div className="flex flex-col text-left">
                  <span className="text-gray-500">Address:</span>
                  <span className="text-gray-700 leading-tight">{order.customer.address}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <table className="w-full text-left text-xs py-3 border-b border-dashed border-gray-300">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-1 font-semibold">Service</th>
                  <th className="py-1 text-right font-semibold">Qty/Wt</th>
                  <th className="py-1 text-right font-semibold">Rate</th>
                  <th className="py-1 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {order.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-1.5 font-medium">{item.serviceNameSnapshot}</td>
                    <td className="py-1.5 text-right">
                      {item.pricingType === "PER_KG" ? `${Number(item.weightKg).toFixed(2)} kg` : item.quantity}
                    </td>
                    <td className="py-1.5 text-right">{Number(item.rate).toFixed(0)}</td>
                    <td className="py-1.5 text-right">{Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations and payment status */}
            <div className="py-3 text-xs space-y-1.5 border-b border-dashed border-gray-300 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal:</span>
                <span>INR {Number(order.subtotal).toFixed(2)}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>- INR {Number(order.discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">CGST ({Number(order.gstRate) / 2}%):</span>
                <span>INR {(Number(order.gstAmount) / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SGST ({Number(order.gstRate) / 2}%):</span>
                <span>INR {(Number(order.gstAmount) / 2).toFixed(2)}</span>
              </div>
              {Number((order as any).roundOff || 0) !== 0 && (
                <div className="flex justify-between text-gray-600">
                  <span className="text-gray-500">Round Off:</span>
                  <span>{Number((order as any).roundOff) > 0 ? "+" : ""} INR {Number((order as any).roundOff).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-gray-200 border-dashed">
                <span>Grand Total:</span>
                <span>INR {Number(order.grandTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-100 text-gray-600">
                <span>Paid Amount:</span>
                <span>INR {Number(order.paidAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-orange-600 font-semibold">
                <span>Balance Due:</span>
                <span>INR {Number(order.balanceAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Payment:</span>
                <span className={order.paymentStatus === "PAID" ? "text-green-600" : "text-orange-600"}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="py-2.5 text-xs text-left border-b border-dashed border-gray-300">
                <span className="font-semibold text-gray-600 font-mono">Remarks:</span>
                <p className="text-gray-700 italic leading-snug mt-0.5">{order.notes}</p>
              </div>
            )}

            {/* QR Code Status & Footer */}
            <div className="text-center pt-4 space-y-3">
              <p className="text-xs text-gray-500 font-mono">Scan QR to track order status</p>
              <div className="flex justify-center">
                <img 
                  src={`https://chart.googleapis.com/chart?chs=130x130&cht=qr&chl=${encodeURIComponent(orderLookupUrl)}&choe=UTF-8`}
                  alt="QR Code Status Track"
                  className="border border-gray-200 p-1.5 rounded bg-white w-32 h-32"
                />
              </div>
              <p className="text-xs text-gray-600 font-semibold italic mt-2">
                Thank you for your business!
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
