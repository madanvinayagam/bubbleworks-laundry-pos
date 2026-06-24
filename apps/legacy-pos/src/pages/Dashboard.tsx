import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadOrders, removeOrder, removeAllOrders } from "@/store/orders";
import { useState as useReactState } from "react";
import { Order } from "@/types";
import { formatDateTime, formatINR } from "@/utils/format";
import { Link, useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useReactState<string | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const location = useLocation();

  const deleteAllOrders = async () => {
    setError(null);
    // Optimistically clear UI
    setOrders([]);
    try {
      await removeAllOrders();
    } catch (err) {
      setError("Failed to delete all orders. Please try again.");
      // Optionally reload from backend to restore UI
      setOrders(await loadOrders());
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      const fetchedOrders = await loadOrders();
      setOrders(fetchedOrders);
    };
    fetchOrders();
  }, [location]);

  const onDelete = async (id: string) => {
    setError(null);
    // Make a copy of previous orders for rollback
    const prevOrders = [...orders];
    setOrders((prev) => prev.filter((order) => order.id !== id));
    try {
      await removeOrder(id);
    } catch (err) {
      setError("Failed to delete order. Please try again.");
      setOrders(prevOrders);
    }
  };

  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    const data = orders.map((order) => {
      const subtotal = order.items.reduce((s, it) => s + it.qty * it.price, 0);
      const roundOff = order.roundOff || 0;
      const total = subtotal + roundOff;
      return {
        "Order Number": order.id,
        Customer: order.customerName || "-",
        Remark: order.remark || "-",
        Items: order.items.map((item) => `${item.name} (Qty: ${item.qty})`).join(", "),
        Subtotal: formatINR(subtotal),
        "Round Off": formatINR(roundOff),
        Total: formatINR(total),
        OrderDate: formatDateTime(order.createdAt),
        DeliveryDate: order.deliveryDate ? formatDateTime(order.deliveryDate) : "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, `orders_export_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportToPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    doc.text("Orders Export", 14, 15);

    autoTable(doc, {
      startY: 20,
      head: [["Order Number", "Customer", "Remark", "Items", "Subtotal", "Round Off", "Total", "Order Date", "Delivery Date"]],
      body: orders.map((order) => {
        const subtotal = order.items.reduce((s, it) => s + it.qty * it.price, 0);
        const roundOff = order.roundOff || 0;
        const total = subtotal + roundOff;
        return [
          order.id,
          order.customerName || "-",
          order.remark || "-",
          order.items.map((item) => `${item.name} (Qty: ${item.qty})`).join(", "),
          formatINR(subtotal),
          formatINR(roundOff),
          formatINR(total),
          formatDateTime(order.createdAt),
          order.deliveryDate ? formatDateTime(order.deliveryDate) : "-",
        ];
      }),
    });

  doc.save(`orders_export_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <main className="min-h-screen bg-background">
      <Seo title="Dashboard | Laundry & Dry Wash POS" description="View all transactions and reprint receipts." canonicalPath="/dashboard" />
      <header className="container py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">All Orders ({orders.length})</h1>
        <div className="flex gap-2 flex-wrap justify-end w-full md:w-auto">
          <Button className="w-full md:w-auto" onClick={exportToExcel}>Export to Excel</Button>
          <Button className="w-full md:w-auto" onClick={exportToPDF}>Export to PDF</Button>
          <Button className="w-full md:w-auto" variant="secondary" onClick={() => navigate("/order")}>New Order</Button>
          <Button className="w-full md:w-auto" variant="outline" onClick={() => navigate("/login")}>Back</Button>
        </div>
      </header>

      <section className="container pb-12">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              <div className="space-y-3">
                {orders.map((o) => {
                  const subtotal = o.items.reduce((s, it) => s + it.qty * it.price, 0);
                  const roundOff = o.roundOff || 0;
                  const total = subtotal + roundOff;
                  return (
                    <Card key={o.id} className="border">
                      <CardContent className="py-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{o.id}</span>
                          <span className="text-sm text-muted-foreground">{formatDateTime(o.createdAt)}</span>
                        </div>
                        <div className="text-sm">Customer: {o.customerName || "-"}</div>
                        {o.remark && <div className="text-sm">Remark: {o.remark}</div>}
                        <div className="text-sm">
                          Items:{" "}
                          {o.items.map((item) => (
                            <div key={item.id} className="ml-2">
                              - {item.name} (Qty: {item.qty})
                            </div>
                          ))}
                        </div>
                        <div className="text-sm">Subtotal: {formatINR(subtotal)}</div>
                        {roundOff !== 0 && <div className="text-sm">Round Off: {formatINR(roundOff)}</div>}
                        <div className="text-base font-medium">Total: {formatINR(total)}</div>
                        <div className="pt-2 grid grid-cols-2 gap-2">
                          <Button size="sm" className="w-full" asChild>
                            <Link to={`/print/${encodeURIComponent(o.id)}`} state={{ order: o }}>Print</Link>
                          </Button>
                          <Button size="sm" className="w-full" variant="destructive" onClick={() => onDelete(o.id)}>Delete</Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {orders.length === 0 && (
                  <div className="py-6 text-center text-muted-foreground">No orders yet. Create your first one.</div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-4">Order Number</th>
                      <th className="py-2 pr-4">Customer</th>
                      <th className="py-2 pr-4">Remark</th>
                      <th className="py-2 pr-4">Items</th>
                      <th className="py-2 pr-4">Subtotal</th>
                      <th className="py-2 pr-4">Round Off</th>
                      <th className="py-2 pr-4">Total</th>
                      <th className="py-2 pr-4">Order Date</th>
                      <th className="py-2 pr-4">Delivery Date</th>
                      <th className="py-2 pr-0 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const subtotal = o.items.reduce((s, it) => s + it.qty * it.price, 0);
                      const roundOff = o.roundOff || 0;
                      const total = subtotal + roundOff;
                      return (
                        <tr key={o.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{o.id}</td>
                          <td className="py-2 pr-4">{o.customerName || "-"}</td>
                          <td className="py-2 pr-4">{o.remark || "-"}</td>
                          <td className="py-2 pr-4">
                            {o.items.map((item) => (
                              <div key={item.id}>
                                {item.name} (Qty: {item.qty})
                              </div>
                            ))}
                          </td>
                          <td className="py-2 pr-4">{formatINR(subtotal)}</td>
                          <td className="py-2 pr-4">{formatINR(roundOff)}</td>
                          <td className="py-2 pr-4">{formatINR(total)}</td>
                          <td className="py-2 pr-4">{formatDateTime(o.createdAt)}</td>
                          <td className="py-2 pr-4">{o.deliveryDate ? formatDateTime(o.deliveryDate) : ""}</td>
                          <td className="py-2 pr-0 text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" asChild>
                                <Link to={`/print/${encodeURIComponent(o.id)}`} state={{ order: o }}>Print</Link>
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => onDelete(o.id)}>Delete</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-6 text-center text-muted-foreground">No orders yet. Create your first one.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {error && (
              <div className="text-red-600 mb-2">{error}</div>
            )}
            {orders.length > 0 && (
              <div className="mt-4">
                <Button size="sm" variant="destructive" onClick={deleteAllOrders}>Delete All</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
