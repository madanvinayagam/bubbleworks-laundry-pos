"use client";

import { useEffect, useState } from "react";
import { 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Edit3, 
  X, 
  Plus,
  Percent,
  IndianRupee,
  Layers,
  Shirt,
  Tags,
  TableProperties,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { 
  getServices, 
  createService, 
  updateService, 
  deleteService, 
  activateService, 
  deactivateService,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getRates,
  createRate,
  updateRate,
  deleteRate,
  getAddOns,
  createAddOn,
  updateAddOn,
  deleteAddOn,
  type Service,
  type Product,
  type ItemCategory,
  type ServiceRate,
  type AddOn
} from "@/lib/api";

export default function ServicesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Data lists
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [rates, setRates] = useState<ServiceRate[]>([]);

  // Modal open states
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);

  // Form Field States
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [rateServiceId, setRateServiceId] = useState("");
  const [rateProductId, setRateProductId] = useState("");
  const [rateCategoryId, setRateCategoryId] = useState("");
  const [rateUnit, setRateUnit] = useState("piece");
  const [rateValue, setRateValue] = useState("");
  const [rateGstRate, setRateGstRate] = useState("18");

  // Inline dynamic creation fields
  const [isNewService, setIsNewService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [rData, sData, pData, cData] = await Promise.all([
        getRates(),
        getServices(),
        getProducts(),
        getCategories(),
      ]);
      setRates(rData.rates);
      setServices(sData.services);
      setProducts(pData.products);
      setCategories(cData.categories);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditItem(null);
    setStatus("ACTIVE");
    
    // Rates default resets
    setRateServiceId(services.filter(s => s.status === "ACTIVE")[0]?.id || "");
    setRateProductId("");
    setRateCategoryId("");
    setRateUnit("piece");
    setRateValue("");
    setRateGstRate("18");

    // Dynamic resets
    setIsNewService(false);
    setNewServiceName("");
    setIsNewProduct(false);
    setNewProductName("");
    setIsNewCategory(false);
    setNewCategoryName("");

    setError("");
    setIsOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setStatus(item.status || "ACTIVE");

    setRateServiceId(item.serviceId);
    setRateProductId(item.productId || "");
    setRateCategoryId(item.categoryId || "");
    setRateUnit(item.unit);
    setRateValue(String(item.rate));
    setRateGstRate(String(item.gstRate));

    // Dynamic resets
    setIsNewService(false);
    setNewServiceName("");
    setIsNewProduct(false);
    setNewProductName("");
    setIsNewCategory(false);
    setNewCategoryName("");

    setError("");
    setIsOpen(true);
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const nextStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await updateRate(item.id, { status: nextStatus });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to toggle status");
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Are you sure you want to permanently delete this rate combination?`)) {
      return;
    }
    try {
      await deleteRate(item.id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete item");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormLoading(true);

    try {
      let serviceId = rateServiceId;
      let productId = rateProductId || null;
      let categoryId = rateCategoryId || null;

      // 1. Handle Inline Service Creation
      if (isNewService) {
        if (!newServiceName.trim()) {
          throw new Error("Please enter a service name");
        }
        // Check if service already exists in list (case insensitive match)
        const matchedService = services.find(s => s.name.toLowerCase() === newServiceName.trim().toLowerCase());
        if (matchedService) {
          serviceId = matchedService.id;
        } else {
          const res = await createService({ name: newServiceName.trim(), description: "", status: "ACTIVE" });
          serviceId = res.service.id;
        }
      }

      // 2. Handle Inline Product Creation
      if (isNewProduct) {
        if (!newProductName.trim()) {
          throw new Error("Please enter a product name");
        }
        // Check if product already exists
        const matchedProduct = products.find(p => p.name.toLowerCase() === newProductName.trim().toLowerCase());
        if (matchedProduct) {
          productId = matchedProduct.id;
        } else {
          const res = await createProduct({ name: newProductName.trim(), description: "", status: "ACTIVE" });
          productId = res.product.id;
        }
      }

      // 3. Handle Inline Category Creation
      if (isNewCategory) {
        if (!newCategoryName.trim()) {
          throw new Error("Please enter a category name");
        }
        // Check if category already exists
        const matchedCategory = categories.find(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase());
        if (matchedCategory) {
          categoryId = matchedCategory.id;
        } else {
          const res = await createCategory({ name: newCategoryName.trim() });
          categoryId = res.category.id;
        }
      }

      if (!serviceId) {
        throw new Error("Service is required");
      }

      const payload = {
        serviceId,
        productId,
        categoryId,
        unit: rateUnit,
        rate: Number(rateValue),
        gstRate: Number(rateGstRate),
        status,
      };

      if (editItem) {
        await updateRate(editItem.id, payload);
      } else {
        await createRate(payload);
      }

      setIsOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to save rate");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Catalog & Services</h1>
          <p className="text-sm text-muted">Configure your laundry service categories, product variants, and matrix pricing rates in a unified catalog table.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow hover:opacity-90 transition-all"
        >
          <Plus size={16} />
          Add Catalog Rate
        </button>
      </div>

      {error && !isOpen && (
        <div className="rounded-md bg-[#fff1ef] p-4 text-sm text-danger border border-danger/10">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-sm">
              <thead className="bg-[#eef3f1] font-semibold text-muted">
                <tr>
                  <th className="w-12 px-5 py-4">#</th>
                  <th className="px-5 py-4">Service Category</th>
                  <th className="px-5 py-4">Product Variant</th>
                  <th className="px-5 py-4">Item Category</th>
                  <th className="px-5 py-4">Unit</th>
                  <th className="px-5 py-4">Unit Price</th>
                  <th className="px-5 py-4">GST Rate</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rates.length > 0 ? (
                  rates.map((item, index) => (
                    <tr key={item.id} className="border-t border-line hover:bg-background/50 transition-colors">
                      <td className="px-5 py-4 font-medium text-muted font-mono">{index + 1}</td>
                      <td className="px-5 py-4 font-semibold text-ink">{item.service?.name}</td>
                      <td className="px-5 py-4 text-muted">{item.product?.name || <span className="italic text-slate-400">Standard Service</span>}</td>
                      <td className="px-5 py-4 text-muted">{item.category?.name || "—"}</td>
                      <td className="px-5 py-4 text-muted font-mono">{item.unit}</td>
                      <td className="px-5 py-4 font-semibold text-ink">₹{Number(item.rate).toFixed(2)}</td>
                      <td className="px-5 py-4 text-muted">{item.gstRate}%</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                          item.status === "ACTIVE" ? "bg-[#edf7f6] text-brand border-brand/10" : "bg-background text-muted border-line"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted"
                            title={item.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          >
                            {item.status === "ACTIVE" ? <ToggleRight size={18} className="text-brand" /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted"
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-danger hover:border-danger/20 hover:bg-[#fff1ef]"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-muted">No pricing matrix rates found. Click "Add Catalog Rate" to create one.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-xl relative animate-scale-in">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-muted hover:text-ink focus-ring rounded-md p-1"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-ink mb-4">
              {editItem ? "Edit Catalog Item" : "Add Catalog Item"}
            </h2>
            {error && (
              <div className="mb-4 rounded-md bg-[#fff1ef] px-3 py-2 text-sm text-danger border border-danger/10">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* UNIFIED MATRIX RATE FORM */}
              <div>
                <label className="block text-sm font-medium mb-1">Service Category (Required)</label>
                {!editItem ? (
                  <div className="space-y-2">
                    <div className="flex gap-4">
                      <label className="inline-flex items-center text-xs text-muted gap-1 cursor-pointer">
                        <input
                          type="radio"
                          checked={!isNewService}
                          onChange={() => setIsNewService(false)}
                          className="text-brand focus:ring-brand"
                        />
                        Choose Existing
                      </label>
                      <label className="inline-flex items-center text-xs text-muted gap-1 cursor-pointer">
                        <input
                          type="radio"
                          checked={isNewService}
                          onChange={() => setIsNewService(true)}
                          className="text-brand focus:ring-brand"
                        />
                        Create New
                      </label>
                    </div>

                    {!isNewService ? (
                      <select
                        required
                        value={rateServiceId}
                        onChange={(e) => setRateServiceId(e.target.value)}
                        className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                      >
                        <option value="">Select Service</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        required
                        type="text"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                        placeholder="Enter new service name (e.g. Wash & Iron)"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    disabled
                    type="text"
                    value={editItem.service?.name || ""}
                    className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-background opacity-60"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Product Variant (Optional)</label>
                {!editItem ? (
                  <div className="space-y-2">
                    <div className="flex gap-4">
                      <label className="inline-flex items-center text-xs text-muted gap-1 cursor-pointer">
                        <input
                          type="radio"
                          checked={!isNewProduct}
                          onChange={() => setIsNewProduct(false)}
                          className="text-brand focus:ring-brand"
                        />
                        Choose / None
                      </label>
                      <label className="inline-flex items-center text-xs text-muted gap-1 cursor-pointer">
                        <input
                          type="radio"
                          checked={isNewProduct}
                          onChange={() => setIsNewProduct(true)}
                          className="text-brand focus:ring-brand"
                        />
                        Create New
                      </label>
                    </div>

                    {!isNewProduct ? (
                      <select
                        value={rateProductId}
                        onChange={(e) => setRateProductId(e.target.value)}
                        className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                      >
                        <option value="">Standard Service (None)</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        required
                        type="text"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                        placeholder="Enter new product variant (e.g. Shirt)"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    disabled
                    type="text"
                    value={editItem.product?.name || "Standard Service (None)"}
                    className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-background opacity-60"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Item Category (Optional)</label>
                {!editItem ? (
                  <div className="space-y-2">
                    <div className="flex gap-4">
                      <label className="inline-flex items-center text-xs text-muted gap-1 cursor-pointer">
                        <input
                          type="radio"
                          checked={!isNewCategory}
                          onChange={() => setIsNewCategory(false)}
                          className="text-brand focus:ring-brand"
                        />
                        Choose / None
                      </label>
                      <label className="inline-flex items-center text-xs text-muted gap-1 cursor-pointer">
                        <input
                          type="radio"
                          checked={isNewCategory}
                          onChange={() => setIsNewCategory(true)}
                          className="text-brand focus:ring-brand"
                        />
                        Create New
                      </label>
                    </div>

                    {!isNewCategory ? (
                      <select
                        value={rateCategoryId}
                        onChange={(e) => setRateCategoryId(e.target.value)}
                        className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                      >
                        <option value="">None / Standard</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        required
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                        placeholder="Enter new category (e.g. Men)"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    disabled
                    type="text"
                    value={editItem.category?.name || "None / Standard"}
                    className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-background opacity-60"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Pricing Unit</label>
                <input
                  required
                  type="text"
                  value={rateUnit}
                  onChange={(e) => setRateUnit(e.target.value)}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                  placeholder="e.g. piece, kg, pair, set, pack"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {["per kg", "per piece", "per pair", "per set", "per pack", "depends"].map((unitOption) => (
                    <button
                      key={unitOption}
                      type="button"
                      onClick={() => setRateUnit(unitOption)}
                      className={`px-2 py-0.5 text-xs rounded border transition-all ${
                        rateUnit === unitOption 
                          ? "bg-brand/10 border-brand text-brand font-semibold" 
                          : "bg-background border-line text-muted hover:text-ink"
                      }`}
                    >
                      {unitOption}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Rate / Unit (₹)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted">
                      <IndianRupee size={14} />
                    </div>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={rateValue}
                      onChange={(e) => setRateValue(e.target.value)}
                      className="focus-ring h-10 w-full rounded-md border border-line pl-8 pr-3 text-sm bg-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">GST Rate (%)</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={rateGstRate}
                    onChange={(e) => setRateGstRate(e.target.value)}
                    className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                    placeholder="18"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="focus-ring h-10 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="focus-ring h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {formLoading ? "Saving..." : "Save Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
