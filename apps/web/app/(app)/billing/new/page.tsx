"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  getServices, 
  getProducts,
  getCategories,
  getRates,
  searchCustomers, 
  createCustomer, 
  createOrder, 
  getOrderNumberPreview,
  getSettings,
  Service, 
  Product,
  ItemCategory,
  ServiceRate,
  Customer 
} from "@/lib/api";
import { loadSession } from "@/lib/session";
import { calculateBillingTotals, calculateItemAmount, BillingItemInput, PaymentMethod } from "@bubbleworks/shared";
import { Search, Plus, Trash2, CheckCircle2, User, Loader2, Printer, Sparkles, Layers, Box, Tag, Sliders, CheckSquare, PlusCircle, IndianRupee } from "lucide-react";

interface SearchableSelectProps<T> {
  options: T[];
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => string;
  value: T | null;
  onChange: (value: T | null) => void;
  placeholder: string;
  disabled?: boolean;
  showNoneOption?: boolean;
  noneLabel?: string;
}

function SearchableSelect<T>({
  options,
  getOptionLabel,
  getOptionValue,
  value,
  onChange,
  placeholder,
  disabled = false,
  showNoneOption = false,
  noneLabel = "None"
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value ? getOptionLabel(value) : "");
  }, [value, getOptionLabel]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch(value ? getOptionLabel(value) : "");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [value, getOptionLabel]);

  const filtered = options.filter(option => 
    getOptionLabel(option).toLowerCase().includes(search.toLowerCase())
  );

  const items = showNoneOption ? [null, ...filtered] : filtered;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < items.length) {
        onChange(items[highlightedIndex] as T | null);
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSearch(value ? getOptionLabel(value) : "");
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="focus-ring h-10 w-full rounded-md border border-slate-200 px-3 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed font-medium text-slate-800"
      />
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {items.map((item, idx) => {
            const isNone = item === null;
            const isSelected = isNone ? value === null : (value ? getOptionValue(value) === getOptionValue(item) : false);
            const isHighlighted = highlightedIndex === idx;
            return (
              <button
                key={isNone ? "none-val" : getOptionValue(item)}
                type="button"
                onClick={() => {
                  onChange(item as T | null);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${
                  isHighlighted 
                    ? "bg-slate-100 text-slate-900" 
                    : isSelected 
                      ? "bg-brand/5 text-brand font-bold" 
                      : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {isNone ? noneLabel : getOptionLabel(item)}
              </button>
            );
          })}
          {items.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400 italic">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewBillPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [rates, setRates] = useState<ServiceRate[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [builderUnit, setBuilderUnit] = useState("piece");

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
    serviceRateId?: string;
    serviceName: string;
    productName?: string | null;
    category?: string | null;
    unit: string;
    rate: number;
    gstRate: number;
    quantity?: number;
    weightKg?: number;
    addOns: Array<{
      addOnId?: string;
      addOnName: string;
      rate: number;
    }>;
  }>>([]);

  // Catalog Builder State
  const [activeBuilderTab, setActiveBuilderTab] = useState<"catalog" | "custom">("catalog");
  const [builderService, setBuilderService] = useState<Service | null>(null);
  const [builderProduct, setBuilderProduct] = useState<Product | null>(null);
  const [builderCategory, setBuilderCategory] = useState<ItemCategory | null>(null);
  const [builderQty, setBuilderQty] = useState<number>(1);
  const [builderWeight, setBuilderWeight] = useState<number>(1);
  const [builderCustomRate, setBuilderCustomRate] = useState<number | null>(null);

  // Custom Item State
  const [customItemName, setCustomItemName] = useState("");
  const [customItemUnit, setCustomItemUnit] = useState("piece");
  const [customItemQty, setCustomItemQty] = useState(1);
  const [customItemWeight, setCustomItemWeight] = useState(1);
  const [customItemRate, setCustomItemRate] = useState(0);
  
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [billNumberPreview, setBillNumberPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Round-Off state is manual only
  const [roundOff, setRoundOff] = useState<number>(0);

  // GST rate — initialized from admin settings, overridable per bill
  const [gstRate, setGstRate] = useState<number>(18);



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

    Promise.all([
      getServices(),
      getProducts(),
      getCategories(),
      getRates(),
      getSettings()
    ])
      .then(([
        { services: list },
        { products: prodList },
        { categories: catList },
        { rates: rateList },
        { settings: set }
      ]) => {
        setServices(list.filter((serv) => serv.status === "ACTIVE"));
        setProducts(prodList.filter((p) => p.status === "ACTIVE"));
        setCategories(catList);
        setRates(rateList.filter((r) => r.status === "ACTIVE"));
        setSettings(set);
        setGstRate(set.defaultGstRate ?? 18);
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
  }, [selectedCustomer, cart, discountAmount, roundOff, notes, orderDate, expectedDeliveryDate]);

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
    serviceRateId: item.serviceRateId,
    serviceName: item.serviceName,
    productName: item.productName,
    category: item.category,
    unit: item.unit,
    rate: item.rate,
    gstRate: item.gstRate,
    quantity: item.quantity,
    weightKg: item.weightKg,
    addOns: item.addOns,
  }));

  const totals = calculateBillingTotals({
    items: billingItems,
    discountAmount,
    gstRate,
    roundOff,
  });

  // Keyboard Shortcuts (Alt+S = save/print, Alt+C = focus customer)
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
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, selectedCustomer, discountAmount, notes, expectedDeliveryDate, roundOff]);

    // Auto-selection filters for step-by-step matrix selection
  const serviceRates = rates.filter(r => r.serviceId === builderService?.id);

  const availableProducts = products.filter(p => 
    serviceRates.some(r => r.productId === p.id)
  );

  const hasNullProductRate = serviceRates.some(r => r.productId === null);

  const productRates = serviceRates.filter(r => 
    builderProduct ? r.productId === builderProduct.id : r.productId === null
  );

  const availableCategories = categories.filter(c => 
    productRates.some(r => r.categoryId === c.id)
  );

  const hasNullCategoryRate = productRates.some(r => r.categoryId === null);

  useEffect(() => {
    if (!builderService) {
      setBuilderProduct(null);
      setBuilderCategory(null);
      setBuilderCustomRate(null);
      return;
    }

    const sRates = rates.filter(r => r.serviceId === builderService.id);
    
    // Auto-select None/None if there's exactly 1 rate with no product and category
    if (sRates.length === 1 && sRates[0].productId === null && sRates[0].categoryId === null) {
      setBuilderProduct(null);
      setBuilderCategory(null);
      setBuilderCustomRate(sRates[0].rate);
      return;
    }

    const availProds = products.filter(p => sRates.some(r => r.productId === p.id));
    const hasNullProd = sRates.some(r => r.productId === null);

    if (availProds.length === 0 && hasNullProd) {
      setBuilderProduct(null);
    } else {
      setBuilderProduct(null);
      setBuilderCategory(null);
      setBuilderCustomRate(null);
    }
  }, [builderService, rates, products]);

  useEffect(() => {
    if (!builderService) return;
    
    const sRates = rates.filter(r => r.serviceId === builderService.id);
    const pRates = sRates.filter(r => 
      builderProduct ? r.productId === builderProduct.id : r.productId === null
    );

    const availCats = categories.filter(c => pRates.some(r => r.categoryId === c.id));
    const hasNullCat = pRates.some(r => r.categoryId === null);

    if (availCats.length === 0 && hasNullCat) {
      setBuilderCategory(null);
    } else {
      setBuilderCategory(null);
    }
    setBuilderCustomRate(null);
  }, [builderProduct, builderService, rates, categories]);

  const resolvedRate = (() => {
    if (!builderService) return null;
    const sRates = rates.filter(r => r.serviceId === builderService.id);
    const pRates = sRates.filter(r => 
      builderProduct ? r.productId === builderProduct.id : r.productId === null
    );
    return pRates.find(r => 
      builderCategory ? r.categoryId === builderCategory.id : r.categoryId === null
    ) || null;
  })();

  const activeRate = builderCustomRate !== null ? builderCustomRate : (resolvedRate?.rate ?? 0);

  useEffect(() => {
    if (resolvedRate) {
      setBuilderUnit(resolvedRate.unit);
    } else {
      setBuilderUnit("piece");
    }
  }, [resolvedRate]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-sm text-muted">Loading POS terminal...</p>
      </div>
    );
  }



  const handleBuilderAddItem = () => {
    if (!builderService || !resolvedRate) return;
    const isKg = builderUnit.toLowerCase() === "kg" || builderUnit.toLowerCase() === "per kg";
    
    setCart([
      ...cart,
      {
        lineId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        serviceRateId: resolvedRate.id,
        serviceName: builderService.name,
        productName: builderProduct?.name || null,
        category: builderCategory?.name || null,
        unit: builderUnit,
        rate: activeRate,
        gstRate: resolvedRate.gstRate,
        quantity: isKg ? undefined : builderQty,
        weightKg: isKg ? builderWeight : undefined,
        addOns: []
      }
    ]);

    // Clear selections except service to let cashier quickly input more items of same service
    setBuilderProduct(null);
    setBuilderCategory(null);
    setBuilderQty(1);
    setBuilderWeight(1);
    setBuilderCustomRate(null);
  };

  const handleCustomAddItem = () => {
    if (!customItemName.trim()) return;
    const isKg = customItemUnit.toLowerCase() === "kg" || customItemUnit.toLowerCase() === "per kg";
    
    setCart([
      ...cart,
      {
        lineId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        serviceName: customItemName.trim(),
        productName: null,
        category: null,
        unit: customItemUnit,
        rate: customItemRate,
        gstRate,
        quantity: isKg ? undefined : customItemQty,
        weightKg: isKg ? customItemWeight : undefined,
        addOns: []
      }
    ]);
    
    setCustomItemName("");
    setCustomItemQty(1);
    setCustomItemWeight(1);
    setCustomItemRate(0);
  };

  const updateCartItem = (lineId: string, field: "quantity" | "weightKg" | "rate", value: number) => {
    setCart(
      cart.map((item) => {
        if (item.lineId !== lineId) return item;
        return {
          ...item,
          [field]: Math.max(0, value),
        };
      })
    );
  };

  const removeFromCart = (lineId: string) => {
    setCart(cart.filter((item) => item.lineId !== lineId));
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
        gstRate,
        paymentMethod: "CASH" as const,
        paidAmount: totals.grandTotal,
        notes,
        items: cart.map((i) => ({
          serviceRateId: i.serviceRateId,
          serviceName: i.serviceName,
          productName: i.productName,
          category: i.category,
          unit: i.unit,
          quantity: i.quantity,
          weightKg: i.weightKg,
          rate: i.rate,
          gstRate: i.gstRate,
          addOns: i.addOns,
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


        {/* Card 2: Interactive Item Selector & Cart Items */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Add Order Items</h2>
              <p className="mt-0.5 text-xs text-slate-500">Configure catalog services with product/category parameters, or add ad-hoc items.</p>
            </div>
            {/* Tabs for Catalog Builder vs Custom Builder */}
            <div className="flex rounded-lg bg-slate-100 p-0.5 self-start">
              <button
                type="button"
                onClick={() => setActiveBuilderTab("catalog")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeBuilderTab === "catalog" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                Catalog Matrix
              </button>
              <button
                type="button"
                onClick={() => setActiveBuilderTab("custom")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeBuilderTab === "custom" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Custom Item
              </button>
            </div>
          </div>

          {/* Builder Body */}
          {activeBuilderTab === "catalog" ? (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column: Form Controls */}
              <div className="space-y-4 rounded-xl bg-slate-50/50 p-5 border border-slate-200/60">
                {/* Service Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    Service Name
                  </label>
                  <SearchableSelect
                    options={services}
                    getOptionLabel={(s) => s.name}
                    getOptionValue={(s) => s.id}
                    value={builderService}
                    onChange={(s) => {
                      setBuilderService(s);
                      setBuilderProduct(null);
                      setBuilderCategory(null);
                    }}
                    placeholder="Search & select service..."
                  />
                </div>

                {/* Product & Category Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Box className="h-3.5 w-3.5 text-slate-400" />
                      Product Variant
                    </label>
                    <SearchableSelect
                      options={availableProducts}
                      getOptionLabel={(p) => p.name}
                      getOptionValue={(p) => p.id}
                      value={builderProduct}
                      onChange={(p) => {
                        setBuilderProduct(p);
                        setBuilderCategory(null);
                      }}
                      placeholder={builderService ? "Select product..." : "Select service first"}
                      disabled={!builderService}
                      showNoneOption={hasNullProductRate}
                      noneLabel="None (Direct Rate)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-slate-400" />
                      Category
                    </label>
                    <SearchableSelect
                      options={availableCategories}
                      getOptionLabel={(c) => c.name}
                      getOptionValue={(c) => c.id}
                      value={builderCategory}
                      onChange={(c) => setBuilderCategory(c)}
                      placeholder={builderProduct ? "Select category..." : builderService ? "Select product first" : "Select service first"}
                      disabled={!builderService || !builderProduct}
                      showNoneOption={hasNullCategoryRate}
                      noneLabel="None (Direct Rate)"
                    />
                  </div>
                </div>

                {/* Pricing, Unit & Quantity */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200/40">
                  {/* Rate Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="focus-ring h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-mono text-slate-800 font-semibold"
                      value={builderCustomRate !== null ? builderCustomRate : (resolvedRate?.rate ?? 0)}
                      onChange={(e) => setBuilderCustomRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      disabled={!builderService || !resolvedRate}
                    />
                  </div>

                  {/* Unit Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</label>
                    <select
                      className="focus-ring h-10 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 capitalize disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                      value={builderUnit}
                      onChange={(e) => setBuilderUnit(e.target.value)}
                      disabled={!builderService || !resolvedRate}
                    >
                      <option value="piece">Piece</option>
                      <option value="kg">kg</option>
                      <option value="pair">Pair</option>
                      <option value="set">Set</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>

                  {/* Quantity / Weight Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {builderUnit.toLowerCase() === "kg" || builderUnit.toLowerCase() === "per kg" ? "Weight (kg)" : "Quantity"}
                    </label>
                    {builderUnit.toLowerCase() === "kg" || builderUnit.toLowerCase() === "per kg" ? (
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        className="focus-ring h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-mono font-semibold"
                        value={builderWeight}
                        onChange={(e) => setBuilderWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                        disabled={!builderService || !resolvedRate}
                      />
                    ) : (
                      <input
                        type="number"
                        min="1"
                        className="focus-ring h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-mono font-semibold"
                        value={builderQty}
                        onChange={(e) => setBuilderQty(Math.max(1, parseInt(e.target.value) || 0))}
                        disabled={!builderService || !resolvedRate}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Estimation Preview and Action Button */}
              <div className="space-y-4 rounded-xl bg-slate-50 p-6 border border-slate-100 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Calculations Preview</h3>
                  <div className="text-xs text-slate-500 font-medium bg-white p-3 rounded-lg border border-slate-200/60 min-h-16 flex items-center justify-center">
                    {builderService && resolvedRate ? (
                      <div className="w-full space-y-1 text-slate-600 text-sm">
                        <div className="flex justify-between">
                          <span>Service Selected:</span>
                          <span className="font-semibold text-slate-800">{builderService.name}</span>
                        </div>
                        {builderProduct && (
                          <div className="flex justify-between">
                            <span>Product:</span>
                            <span className="font-semibold text-slate-800">{builderProduct.name}</span>
                          </div>
                        )}
                        {builderCategory && (
                          <div className="flex justify-between">
                            <span>Category:</span>
                            <span className="font-semibold text-slate-800">{builderCategory.name}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1.5 text-xs text-slate-500 font-normal">
                          <span>Formula:</span>
                          <span>{builderUnit.toLowerCase() === "kg" || builderUnit.toLowerCase() === "per kg" ? `${builderWeight} kg` : `${builderQty} pcs`} x ₹{activeRate}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="italic text-slate-400">Complete service matches above</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Estimated Total</span>
                    <span className="text-2xl font-bold text-slate-900 font-mono">
                      ₹ {(() => {
                        if (!builderService || !resolvedRate) return "0.00";
                        const units = builderUnit.toLowerCase() === "kg" || builderUnit.toLowerCase() === "per kg" ? builderWeight : builderQty;
                        return (units * activeRate).toFixed(2);
                      })()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBuilderAddItem}
                    className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50 transition-opacity"
                    disabled={!builderService || !resolvedRate}
                  >
                    <Plus className="h-4.5 w-4.5" />
                    Add Item to Bill
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Custom Item Builder */
            <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/40 p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Item Name</label>
                  <input
                    type="text"
                    placeholder="Enter custom service/product name..."
                    className="focus-ring h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Unit</label>
                  <select
                    className="focus-ring h-10 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 capitalize"
                    value={customItemUnit}
                    onChange={(e) => setCustomItemUnit(e.target.value)}
                  >
                    <option value="piece">Piece</option>
                    <option value="kg">kg</option>
                    <option value="pair">Pair</option>
                    <option value="set">Set</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    {customItemUnit.toLowerCase() === "kg" ? "Weight (kg)" : "Quantity"}
                  </label>
                  <input
                    type="number"
                    min={customItemUnit.toLowerCase() === "kg" ? "0.1" : "1"}
                    step={customItemUnit.toLowerCase() === "kg" ? "0.1" : "1"}
                    className="focus-ring h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-mono font-semibold"
                    value={customItemUnit.toLowerCase() === "kg" ? customItemWeight : customItemQty}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (customItemUnit.toLowerCase() === "kg") {
                        setCustomItemWeight(val);
                      } else {
                        setCustomItemQty(Math.max(1, Math.round(val)));
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-1.5 w-full sm:w-44">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="focus-ring h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-mono font-semibold"
                    value={customItemRate}
                    onChange={(e) => setCustomItemRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Item Total</span>
                  <span className="text-2xl font-bold text-slate-900 font-mono">
                    ₹ {((customItemUnit.toLowerCase() === "kg" ? customItemWeight : customItemQty) * customItemRate).toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCustomAddItem}
                  disabled={!customItemName.trim()}
                  className="focus-ring flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-6 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50 self-end sm:self-center"
                >
                  <Plus className="h-4 w-4" />
                  Add Custom Item
                </button>
              </div>
            </div>
          )}

          {/* Cart Table List */}
          <div className="border-t border-slate-100 pt-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-700">Selected Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[42%]" />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold text-[11px] uppercase tracking-wider pb-2">
                    <th className="pb-3">Item Description</th>
                    <th className="pb-3 text-center">Qty / Weight</th>
                    <th className="pb-3 text-right">Unit Rate (₹)</th>
                    <th className="pb-3 text-right">Amount (₹)</th>
                    <th className="pb-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.length > 0 ? (
                    cart.map((item) => {
                      const isKg = item.unit.toLowerCase() === "kg" || item.unit.toLowerCase() === "per kg";
                      const amount = calculateItemAmount(item);
                      return (
                        <tr key={item.lineId} className="group hover:bg-slate-50/40">
                          <td className="py-3.5 pr-4">
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-800 text-sm">
                                {item.serviceName}
                                {item.productName && ` - ${item.productName}`}
                                {item.category && ` [${item.category}]`}
                              </div>

                            </div>
                          </td>
                          <td className="py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isKg ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  className="focus-ring h-9 w-20 rounded-md border border-slate-200 px-2 text-center text-sm bg-white font-mono font-semibold"
                                  value={item.weightKg ?? 1}
                                  onChange={(e) => updateCartItem(item.lineId, "weightKg", parseFloat(e.target.value) || 0)}
                                />
                              ) : (
                                <input
                                  type="number"
                                  min="1"
                                  className="focus-ring h-9 w-20 rounded-md border border-slate-200 px-2 text-center text-sm bg-white font-mono font-semibold"
                                  value={item.quantity ?? 1}
                                  onChange={(e) => updateCartItem(item.lineId, "quantity", parseInt(e.target.value) || 0)}
                                />
                              )}
                              <span className="text-xs text-slate-500 font-bold select-none capitalize">
                                {item.unit}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="focus-ring h-9 w-24 rounded-md border border-slate-200 px-2 text-right text-sm bg-white font-mono font-semibold"
                              value={item.rate}
                              onChange={(e) => updateCartItem(item.lineId, "rate", parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="py-3.5 text-right font-bold text-slate-900 font-mono text-sm">
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
                      <td colSpan={5} className="px-0 py-8 text-center text-sm text-slate-400 font-medium italic">
                        No billing items added yet. Configure above and click "Add Item".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Card 3: Checkout Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          {/* Card Header — matches Card 1 & Card 2 style */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-brand" />
              Order Summary
            </h2>
            {billNumberPreview && (
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                Bill #{billNumberPreview}
              </span>
            )}
          </div>

          {/* Summary Rows */}
          <div className="space-y-0">
            {/* Subtotal */}
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-sm text-slate-500 font-medium">Subtotal</span>
              <span className="text-sm font-semibold text-slate-800 font-mono">₹ {totals.subtotal.toFixed(2)}</span>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-500 font-medium">Discount (₹)</label>
              <div className="flex h-10 w-36 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 focus-within:border-brand focus-within:bg-white transition-colors">
                <span className="text-sm text-slate-400 select-none">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-transparent text-right outline-none text-sm font-semibold text-slate-800 font-mono"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
            </div>

            {/* GST — editable % with live ₹ calculation */}
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-500 font-medium">GST</label>
                <div className="flex h-8 w-20 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 focus-within:border-brand focus-within:bg-white transition-colors">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="w-full bg-transparent text-center outline-none text-sm font-semibold text-slate-800 font-mono"
                    value={gstRate}
                    onChange={(e) => setGstRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  />
                  <span className="text-xs text-slate-400 select-none font-bold">%</span>
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-800 font-mono">₹ {(totals.cgstAmount + totals.sgstAmount).toFixed(2)}</span>
            </div>

            {/* Round Off */}
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <label className="text-sm text-slate-500 font-medium">Round Off (₹)</label>
              <div className="flex h-10 w-36 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 focus-within:border-brand focus-within:bg-white transition-colors">
                <span className="text-sm text-slate-400 select-none">₹</span>
                <input
                  type="number"
                  step="0.05"
                  className="w-full bg-transparent text-right outline-none text-sm font-semibold text-slate-800 font-mono"
                  value={roundOff}
                  onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Grand Total */}
            <div className="flex items-center justify-between mt-4 rounded-xl bg-slate-900 px-5 py-4 text-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Grand Total</p>
                <p className="text-xs text-slate-500 font-medium">incl. all taxes</p>
              </div>
              <span className="text-3xl font-bold font-mono tracking-tight">₹ {totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Save Button */}
          <div className="print:hidden">
            <button
              type="button"
              onClick={handleSaveBill}
              disabled={isSaving}
              className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  Save &amp; Preview Receipt
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
