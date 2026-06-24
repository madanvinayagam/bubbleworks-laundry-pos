"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  getServices, 
  searchCustomers, 
  createCustomer, 
  createOrder, 
  getOrderNumberPreview,
  getSettings,
  Service, 
  Customer 
} from "@/lib/api";
import { loadSession } from "@/lib/session";
import { calculateBillingTotals, BillingItemInput, PaymentMethod } from "@bubbleworks/shared";
import { Search, Plus, Trash2, CheckCircle2, User, Loader2, Printer, Keyboard, Sparkles } from "lucide-react";

export default function NewBillPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Customer State
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isRegisteringCustomer, setIsRegisteringCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [customerError, setCustomerError] = useState("");

  // Order Details
  const [cart, setCart] = useState<Array<{
    lineId: string;
    serviceId: string;
    serviceName: string;
    pricingType: "PER_PIECE" | "PER_KG";
    quantity: number;
    weightKg: number;
    rate: number;
    isCustom?: boolean;
  }>>([]);
  
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [billNumberPreview, setBillNumberPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Round-Off state is manual only
  const [roundOff, setRoundOff] = useState<number>(0);

  // Draft item row state
  const [itemSearch, setItemSearch] = useState("");
  const [draftQty, setDraftQty] = useState(1);
  const [draftRate, setDraftRate] = useState(0);
  const [draftSelectedService, setDraftSelectedService] = useState<Service | null>(null);
  const [isItemFieldFocused, setIsItemFieldFocused] = useState(false);
  const [activeItemSuggestionIndex, setActiveItemSuggestionIndex] = useState(0);
  const itemInputRef = useRef<HTMLInputElement | null>(null);
  const [itemDropdownStyle, setItemDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const toLocalDatetimeInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    if (!s) {
      router.push("/login");
      return;
    }

    const now = new Date();
    setOrderDate(toLocalDatetimeInput(now));

    // Default expected delivery date to 2 days from now at 12:00 PM
    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    twoDaysLater.setHours(12, 0, 0, 0);
    setExpectedDeliveryDate(toLocalDatetimeInput(twoDaysLater));

    Promise.all([getServices(), getSettings()])
      .then(([{ services: list }, { settings: set }]) => {
        setServices(list.filter((serv) => serv.status === "ACTIVE"));
        setSettings(set);
        return getOrderNumberPreview(s?.user?.branchId || undefined);
      })
      .then((preview) => {
        setBillNumberPreview(preview.billNumber);
        setSaveError("");
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load initial billing data", err);
        setBillNumberPreview("");
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    if (saveError) {
      setSaveError("");
    }
  }, [selectedCustomer, cart, discountAmount, roundOff, paidAmount, paymentMethod, notes, orderDate, expectedDeliveryDate]);

  // Customer search debounced suggestions
  useEffect(() => {
    if (customerSearch.trim().length < 2 || selectedCustomer) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      searchCustomers(customerSearch, session?.user?.branchId || undefined)
        .then((res) => {
          setSearchResults(res.customers);
        })
        .catch((err) => console.error("Customer search error", err));
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [customerSearch, selectedCustomer, session]);

  // Calculate POS summary mapping
  const billingItems: BillingItemInput[] = cart.map((item) => ({
    serviceId: item.serviceId.startsWith("custom-") ? undefined : item.serviceId,
    serviceName: item.serviceName,
    pricingType: item.pricingType,
    quantity: item.pricingType === "PER_PIECE" ? item.quantity : undefined,
    weightKg: item.pricingType === "PER_KG" ? item.weightKg : undefined,
    rate: item.rate,
  }));

  const totals = calculateBillingTotals({
    items: billingItems,
    discountAmount,
    gstRate: settings?.defaultGstRate ?? 18,
    paidAmount,
    roundOff,
  });

  // Auto-update paidAmount if pay in full is appropriate (non-credit modes)
  useEffect(() => {
    if (paymentMethod !== "CREDIT") {
      setPaidAmount(totals.grandTotal);
    }
  }, [totals.grandTotal, paymentMethod]);

  // Keyboard Shortcuts (Alt+S = save/print, Alt+C = focus customer, Alt+F = focus item picker)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveBill();
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        const searchInput = document.getElementById("customer-search-input");
        if (searchInput) (searchInput as HTMLInputElement).focus();
      }
      if (e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        const itemInput = document.getElementById("item-search-input");
        if (itemInput) (itemInput as HTMLInputElement).focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, selectedCustomer, discountAmount, paidAmount, paymentMethod, notes, expectedDeliveryDate, roundOff]);

  const normalizedItemSearch = itemSearch.trim().toLowerCase();
  const itemSuggestions = services
    .filter((service) => !normalizedItemSearch || service.name.toLowerCase().includes(normalizedItemSearch))
    .sort((a, b) => {
      if (!normalizedItemSearch) {
        return a.name.localeCompare(b.name);
      }
      const aStarts = a.name.toLowerCase().startsWith(normalizedItemSearch);
      const bStarts = b.name.toLowerCase().startsWith(normalizedItemSearch);
      if (aStarts !== bStarts) {
        return aStarts ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, 8);
  const isItemDropdownOpen = isItemFieldFocused && services.length > 0;
  const draftUnitLabel = draftSelectedService?.pricingType === "PER_KG" ? "Weight (kg)" : "Pieces";

  const handleItemSearchChange = (value: string) => {
    setItemSearch(value);
    setActiveItemSuggestionIndex(0);
    if (!draftSelectedService || value.trim().toLowerCase() !== draftSelectedService.name.toLowerCase()) {
      setDraftSelectedService(null);
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isItemDropdownOpen || itemSuggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddDraftItem();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveItemSuggestionIndex((prev) => (prev + 1) % itemSuggestions.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveItemSuggestionIndex((prev) => (prev - 1 + itemSuggestions.length) % itemSuggestions.length);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const active = itemSuggestions[activeItemSuggestionIndex] ?? itemSuggestions[0];
      if (active) {
        handleSelectSuggestion(active);
      } else {
        handleAddDraftItem();
      }
      return;
    }

    if (e.key === "Escape") {
      setIsItemFieldFocused(false);
      setActiveItemSuggestionIndex(0);
    }
  };

  useLayoutEffect(() => {
    if (!isItemDropdownOpen || !itemInputRef.current) {
      setItemDropdownStyle(null);
      return;
    }

    const updatePosition = () => {
      const rect = itemInputRef.current?.getBoundingClientRect();
      if (!rect) return;

      setItemDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isItemDropdownOpen, itemSearch]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-sm text-muted">Loading POS terminal...</p>
      </div>
    );
  }

  // Cart operations
  const addCartItem = (item: {
    lineId: string;
    serviceId: string;
    serviceName: string;
    pricingType: "PER_PIECE" | "PER_KG";
    quantity: number;
    weightKg: number;
    rate: number;
    isCustom?: boolean;
  }) => {
    setCart([...cart, item]);
  };

  const resetDraftItem = () => {
    setItemSearch("");
    setDraftQty(1);
    setDraftRate(0);
    setDraftSelectedService(null);
    setActiveItemSuggestionIndex(0);
  };

  const handleSelectSuggestion = (service: Service) => {
    setDraftSelectedService(service);
    setItemSearch(service.name);
    setDraftRate(Number(service.defaultRate));
    setDraftQty(service.pricingType === "PER_KG" ? 1 : 1);
    setActiveItemSuggestionIndex(0);
    setIsItemFieldFocused(false);
  };

  const handleAddDraftItem = () => {
    const name = itemSearch.trim();
    if (!name) return;

    const selected =
      draftSelectedService ??
      services.find((service) => service.name.toLowerCase() === name.toLowerCase()) ??
      null;
    addCartItem({
      serviceId: selected?.id ?? `custom-${Date.now()}`,
      lineId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      serviceName: name,
      pricingType: selected?.pricingType ?? "PER_PIECE",
      quantity: selected?.pricingType === "PER_KG" ? 0 : Math.max(1, draftQty),
      weightKg: selected?.pricingType === "PER_KG" ? Math.max(0.1, draftQty) : 0,
      rate: draftRate,
      isCustom: !selected,
    });
    resetDraftItem();
    window.setTimeout(() => {
      itemInputRef.current?.focus();
    }, 0);
  };

  const updateCartItem = (serviceId: string, field: "quantity" | "weightKg" | "rate" | "serviceName", value: any) => {
    setCart(
      cart.map((item) => {
        if (item.lineId !== serviceId) return item;
        return {
          ...item,
          [field]: field === "serviceName" ? value : Math.max(0, parseFloat(value) || 0),
        };
      })
    );
  };

  const adjustQty = (serviceId: string, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.lineId !== serviceId) return item;
        if (item.pricingType === "PER_PIECE") {
          return { ...item, quantity: Math.max(1, item.quantity + delta) };
        } else {
          const newWeight = Math.max(0.1, Math.round((item.weightKg + delta * 0.5) * 100) / 100);
          return { ...item, weightKg: newWeight };
        }
      })
    );
  };

  const removeFromCart = (serviceId: string) => {
    setCart(cart.filter((item) => item.lineId !== serviceId));
  };

  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError("");
    if (!newCustomerName || !newCustomerMobile) {
      setCustomerError("Name and mobile are required");
      return;
    }
    try {
      const { customer } = await createCustomer({
        name: newCustomerName,
        mobile: newCustomerMobile,
        address: newCustomerAddress,
        branchId: session?.user?.branchId || "",
      });
      setSelectedCustomer(customer);
      setCustomerSearch(`${customer.name} (${customer.mobile})`);
      setIsRegisteringCustomer(false);
      setNewCustomerName("");
      setNewCustomerMobile("");
      setNewCustomerAddress("");
    } catch (err: any) {
      setCustomerError(err.message || "Failed to register customer");
    }
  };

  const handleSaveBill = async () => {
    setSaveError("");
    if (!selectedCustomer) {
      setSaveError("Please select or register a customer first.");
      return;
    }
    if (cart.length === 0) {
      setSaveError("Please add at least one service to the cart.");
      return;
    }
    setIsSaving(true);
    try {
      const input = {
        branchId: session?.user?.branchId || "",
        customerId: selectedCustomer.id,
        orderDate: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
        expectedDeliveryDate: new Date(expectedDeliveryDate).toISOString(),
        discountAmount,
        roundOff,
        gstRate: settings?.defaultGstRate ?? 18,
        paymentMethod,
        paidAmount,
        notes,
        items: cart.map((i) => ({
          serviceId: i.serviceId.startsWith("custom-") ? undefined : i.serviceId,
          serviceName: i.serviceName,
          pricingType: i.pricingType,
          quantity: i.pricingType === "PER_PIECE" ? i.quantity : undefined,
          weightKg: i.pricingType === "PER_KG" ? i.weightKg : undefined,
          rate: i.rate,
        })),
      };

      const res = await createOrder(input);
      // Open the dedicated preview/print page
      router.push(`/orders/${res.order.id}/print`);
      setIsSaving(false);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save the order");
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6 print:p-0 print:m-0">
      {/* Page Header (Hidden in Print) */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            Bubbleworks Laundry POS
          </h1>
        </div>
      </div>

      {saveError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600 print:hidden">
          {saveError}
        </div>
      )}

      {/* FULL WIDTH DASHBOARD BODY (Hidden in Print) */}
      <div className="space-y-6 print:hidden">
        {/* Card 1: Customer details & Order Parameters */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <User className="h-5 w-5 text-brand" />
              Customer Details & Configuration
            </h2>
            {!isRegisteringCustomer && !selectedCustomer && (
              <button
                onClick={() => setIsRegisteringCustomer(true)}
                className="focus-ring flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Quick Register New Customer
              </button>
            )}
          </div>

          {isRegisteringCustomer ? (
            <form onSubmit={handleRegisterCustomer} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Customer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Full Customer Name"
                    className="focus-ring h-10 w-full rounded-md border border-slate-200 px-3 text-sm bg-white"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Number"
                    className="focus-ring h-10 w-full rounded-md border border-slate-200 px-3 text-sm bg-white"
                    value={newCustomerMobile}
                    onChange={(e) => setNewCustomerMobile(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Street Address</label>
                  <input
                    type="text"
                    placeholder="Street Address (Optional)"
                    className="focus-ring h-10 w-full rounded-md border border-slate-200 px-3 text-sm bg-white"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                  />
                </div>
              </div>
              {customerError && <p className="text-xs text-red-600">{customerError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="focus-ring h-9 rounded-md bg-brand px-4 text-xs font-semibold text-white hover:opacity-90"
                >
                  Register and Select
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegisteringCustomer(false)}
                  className="focus-ring h-9 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Row 1: Customer Search — full width */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Search Customer</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    id="customer-search-input"
                    className="focus-ring h-11 w-full rounded-md border border-slate-200 pl-10 pr-16 text-sm bg-white"
                    placeholder="Search by mobile number or name..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      if (selectedCustomer) {
                        setSelectedCustomer(null);
                        setCustomerSearch("");
                        setCart([]);
                        setDiscountAmount(0);
                        setPaidAmount(0);
                      }
                    }}
                  />
                  {selectedCustomer && (
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch("");
                      }}
                      className="absolute right-3 top-3.5 text-xs text-red-500 hover:text-red-700 font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-18 z-20 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                    {searchResults.map((cust) => (
                      <button
                        key={cust.id}
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setCustomerSearch(`${cust.name} (${cust.mobile})`);
                          setSearchResults([]);
                        }}
                        className="flex w-full flex-col px-4 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-800">{cust.name}</span>
                        <span className="text-xs text-slate-500">{cust.mobile}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50/50 px-3 py-2 text-sm text-green-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    <span>Selected: <span className="font-semibold">{selectedCustomer.name}</span> &mdash; {selectedCustomer.mobile}</span>
                  </div>
                )}
              </div>

              {/* Row 2: Order meta - 3 columns */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {/* Bill No - auto generated */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bill No.</label>
                  <div className="flex h-11 items-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 text-sm font-mono text-slate-700 select-none">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand/60" />
                    {billNumberPreview || "Loading bill number..."}
                  </div>
                </div>

                {/* Order Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Order Date</label>
                  <input
                    type="datetime-local"
                    className="focus-ring h-11 w-full rounded-md border border-slate-200 px-3 text-sm bg-white font-mono"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>

                {/* Expected Delivery Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Delivery Date</label>
                  <input
                    type="datetime-local"
                    className="focus-ring h-11 w-full rounded-md border border-slate-200 px-3 text-sm bg-white font-mono"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  />
                </div>

                {/* Remark */}
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Remark</label>
                  <input
                    type="text"
                    placeholder="Stain notes, special instructions..."
                    className="focus-ring h-11 w-full rounded-md border border-slate-200 px-3 text-sm bg-white"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Card 2: Cart Items */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Order Items</h2>
              <p className="mt-1 text-xs text-slate-500">Search, pick, and add items in one quick row.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[46%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold text-xs uppercase">
                  <th className="pb-3">Item</th>
                  <th className="pb-3 text-center">Pieces / Weight</th>
                  <th className="pb-3 text-right">Price</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="group bg-slate-50/40">
                  <td className="relative py-3.5 pr-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="item-search-input"
                        ref={itemInputRef}
                        type="text"
                        className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus-ring"
                        placeholder="Search item name"
                        value={itemSearch}
                        onChange={(e) => handleItemSearchChange(e.target.value)}
                        onFocus={() => {
                          setIsItemFieldFocused(true);
                          setActiveItemSuggestionIndex(0);
                        }}
                        onBlur={() => {
                          window.setTimeout(() => setIsItemFieldFocused(false), 150);
                        }}
                        onKeyDown={handleItemKeyDown}
                      />
                    </div>
                  </td>
                  <td className="py-3.5">
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase leading-none tracking-wide text-slate-500">
                        {draftUnitLabel}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="focus-ring h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-center text-sm font-mono"
                        value={draftQty}
                        onChange={(e) => setDraftQty(Math.max(0, parseFloat(e.target.value) || 0))}
                      />
                    </div>
                  </td>
                  <td className="py-3.5">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="focus-ring h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-right text-sm font-mono"
                      value={draftRate}
                      onChange={(e) => setDraftRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </td>
                  <td className="py-3.5 text-right font-semibold text-slate-900 font-mono">
                    ₹ {(draftQty * draftRate).toFixed(2)}
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      onClick={handleAddDraftItem}
                      className="focus-ring inline-flex h-9 items-center rounded-md bg-brand px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      disabled={!itemSearch.trim()}
                    >
                      Add
                    </button>
                  </td>
                </tr>

                {cart.length > 0 ? (
                  cart.map((item) => {
                    const amount = item.pricingType === "PER_KG" ? item.weightKg * item.rate : item.quantity * item.rate;
                    return (
                      <tr key={item.lineId} className="group hover:bg-slate-50/30">
                        <td className="py-3.5 pr-4 font-semibold text-slate-800">
                          <input
                            type="text"
                            value={item.serviceName}
                            onChange={(e) => updateCartItem(item.lineId, "serviceName", e.target.value)}
                            className="focus-ring h-11 w-full rounded-md border border-slate-200 px-3 text-sm bg-white"
                            placeholder="Item name"
                          />
                        </td>
                        <td className="py-3.5">
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold uppercase leading-none tracking-wide text-slate-500">
                              {item.pricingType === "PER_KG" ? "Weight (kg)" : "Pieces"}
                            </div>
                            {item.pricingType === "PER_KG" ? (
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="focus-ring h-10 w-full rounded-md border border-slate-200 px-3 text-center text-sm bg-white font-mono"
                                value={item.weightKg}
                                onChange={(e) => updateCartItem(item.lineId, "weightKg", parseFloat(e.target.value) || 0)}
                              />
                            ) : (
                              <input
                                type="number"
                                min="0"
                                className="focus-ring h-10 w-full rounded-md border border-slate-200 px-3 text-center text-sm bg-white font-mono"
                                value={item.quantity}
                                onChange={(e) => updateCartItem(item.lineId, "quantity", parseInt(e.target.value) || 0)}
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-3.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="focus-ring h-11 w-full rounded-md border border-slate-200 px-3 text-right text-sm bg-white font-mono"
                            value={item.rate}
                            onChange={(e) => updateCartItem(item.lineId, "rate", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-3.5 text-right font-semibold text-slate-900 font-mono">
                          ₹ {amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.lineId)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors focus-ring"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-0 py-8 text-center text-sm text-slate-400">
                      No items added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {typeof document !== "undefined" && isItemDropdownOpen && itemDropdownStyle && createPortal(
            <div
              className="fixed z-50 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
              style={{
                top: itemDropdownStyle.top,
                left: itemDropdownStyle.left,
                width: itemDropdownStyle.width,
              }}
              onWheelCapture={(e) => e.stopPropagation()}
            >
              <div className="max-h-48 overscroll-contain overflow-y-auto divide-y divide-slate-100">
                {itemSuggestions.length > 0 ? (
                  itemSuggestions.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestion(service);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                        itemSuggestions[activeItemSuggestionIndex]?.id === service.id ? "bg-slate-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{service.name}</div>
                        <div className="text-xs text-slate-500">
                          {service.pricingType === "PER_KG" ? "Per kg" : "Per piece"}
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-500">₹ {Number(service.defaultRate).toFixed(2)}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500">No item matches this text.</div>
                )}
              </div>
              <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                Use Enter to pick the highlighted item, or + Add Item to keep the typed name.
              </div>
            </div>,
            document.body
          )}
        </div>
        {/* Card 3: Checkout Calculations & Adjustments */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800">Checkout & Calculations</h2>
            <p className="text-xs text-slate-500">A compact summary first, then payment controls.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>₹ {totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-slate-500">
                  <label className="shrink-0">Discount</label>
                  <div className="flex h-9 w-28 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5">
                    <span className="text-sm text-slate-400">₹</span>
                    <input
                      type="number"
                      className="w-full bg-transparent text-right outline-none"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Taxable Value</span>
                  <span>₹ {totals.taxableAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>CGST ({totals.gstRate / 2}%)</span>
                  <span>₹ {totals.cgstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>SGST ({totals.gstRate / 2}%)</span>
                  <span>₹ {totals.sgstAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-dashed border-slate-200 pt-4">
                  <label className="shrink-0 font-semibold text-slate-700">Round Off</label>
                  <div className="flex h-9 w-28 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5">
                    <span className="text-sm text-slate-400">₹</span>
                    <input
                      type="number"
                      step="0.05"
                      className="w-full bg-transparent text-right outline-none"
                      value={roundOff}
                      onChange={(e) => {
                        setRoundOff(parseFloat(e.target.value) || 0);
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-end justify-between border-t border-slate-200 pt-4">
                  <span className="text-sm font-semibold uppercase tracking-wide text-slate-700">Grand Total</span>
                  <span className="font-mono text-2xl font-bold text-slate-900">₹ {totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Mode</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(["CASH", "UPI", "CARD", "CREDIT"] as PaymentMethod[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setPaymentMethod(mode);
                          if (mode === "CREDIT") {
                            setPaidAmount(0);
                          } else {
                            setPaidAmount(totals.grandTotal);
                          }
                        }}
                        className={"focus-ring h-9 rounded-md border px-3 text-xs font-bold transition-colors " + (paymentMethod === mode ? "border-brand bg-brand/5 text-brand" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paid Amount</label>
                    {paymentMethod !== "CREDIT" && (
                      <button
                        type="button"
                        onClick={() => setPaidAmount(totals.grandTotal)}
                        className="text-[10px] font-bold text-brand hover:underline"
                      >
                        Pay Full
                      </button>
                    )}
                  </div>
                  <div className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3">
                    <span className="text-sm font-mono text-slate-400">₹</span>
                    <input
                      type="number"
                      disabled={paymentMethod === "CREDIT"}
                      className="w-full bg-transparent text-right text-sm font-semibold outline-none disabled:opacity-40"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>

                <div className={"flex items-center justify-between rounded-md border px-3 py-2 text-sm " + (totals.balanceAmount > 0 ? "border-orange-100 bg-orange-50" : "border-emerald-100 bg-emerald-50")}>
                  <span className="text-slate-500">Balance Due</span>
                  <span className={"font-mono font-bold " + (totals.balanceAmount > 0 ? "text-orange-600" : "text-emerald-700")}>
                    ₹ {totals.balanceAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end print:hidden">
          <button
            onClick={handleSaveBill}
            disabled={isSaving}
            className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-6 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4" />
                Save & Preview Receipt
              </>
            )}
          </button>
        </div>

      </div>
    </section>
  );
}
