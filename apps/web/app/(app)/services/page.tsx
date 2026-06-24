"use client";

import { useEffect, useState } from "react";
import { 
  Scissors, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Edit3, 
  X, 
  Plus,
  Percent,
  IndianRupee
} from "lucide-react";
import { 
  getServices, 
  createService, 
  updateService, 
  deleteService, 
  activateService, 
  deactivateService,
  type Service 
} from "@/lib/api";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  // Form input states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricingType, setPricingType] = useState<"PER_PIECE" | "PER_KG">("PER_PIECE");
  const [defaultRate, setDefaultRate] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getServices();
      setServices(data.services);
    } catch (err: any) {
      setError(err.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedService(null);
    setName("");
    setDescription("");
    setPricingType("PER_PIECE");
    setDefaultRate("");
    setGstRate("18");
    setStatus("ACTIVE");
    setError("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    setSelectedService(service);
    setName(service.name);
    setDescription(service.description);
    setPricingType(service.pricingType);
    setDefaultRate(String(service.defaultRate));
    setGstRate(String(service.gstRate));
    setStatus(service.status);
    setError("");
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (service: Service) => {
    try {
      if (service.status === "ACTIVE") {
        await deactivateService(service.id);
      } else {
        await activateService(service.id);
      }
      fetchServices();
    } catch (err: any) {
      alert(err.message || "Failed to update service status");
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Are you sure you want to permanently delete the service "${service.name}"?`)) {
      return;
    }
    try {
      await deleteService(service.id);
      fetchServices();
    } catch (err: any) {
      alert(err.message || "Failed to delete service");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormLoading(true);

    try {
      const payload = {
        name,
        description,
        pricingType,
        defaultRate: Number(defaultRate),
        gstRate: Number(gstRate),
        status
      };

      if (selectedService) {
        await updateService(selectedService.id, payload);
      } else {
        await createService(payload);
      }
      setIsFormOpen(false);
      fetchServices();
    } catch (err: any) {
      setError(err.message || "Failed to save service");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Services</h1>
          <p className="text-sm text-muted">Create service categories, configure pricing models (Per Piece or Per KG), and GST defaults.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow hover:opacity-90 transition-all"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {error && !isFormOpen && (
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
                  <th className="px-5 py-4">Service Category</th>
                  <th className="px-5 py-4">Pricing Type</th>
                  <th className="px-5 py-4">Default Rate</th>
                  <th className="px-5 py-4">GST Rate</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.length > 0 ? (
                  services.map((service) => (
                    <tr key={service.id} className="border-t border-line hover:bg-background/50 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <div className="font-semibold text-ink flex items-center gap-1.5">
                            {service.name}
                          </div>
                          {service.description && (
                            <div className="text-xs text-muted mt-0.5 max-w-sm truncate">
                              {service.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                          service.pricingType === "PER_KG" ? "bg-[#e0f2fe] text-[#0369a1]" : "bg-[#f3e8ff] text-[#6b21a8]"
                        }`}>
                          {service.pricingType === "PER_KG" ? "Per KG" : "Per Piece"}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-ink">
                        ₹{Number(service.defaultRate).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-muted">
                        <div className="flex items-center gap-0.5">
                          <span>{service.gstRate}%</span>
                          <Percent size={11} className="text-muted/60" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span 
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                            service.status === "ACTIVE" 
                              ? "bg-[#edf7f6] text-brand border-brand/10" 
                              : "bg-background text-muted border-line"
                          }`}
                        >
                          {service.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(service)}
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted"
                            title={service.status === "ACTIVE" ? "Deactivate Service" : "Activate Service"}
                          >
                            {service.status === "ACTIVE" ? (
                              <ToggleRight size={18} className="text-brand" />
                            ) : (
                              <ToggleLeft size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(service)}
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted"
                            title="Edit Service"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(service)}
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-danger hover:border-danger/20 hover:bg-[#fff1ef]"
                            title="Delete Service"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted">
                      No services found. Click "Add Service" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-xl relative animate-scale-in">
            <button 
              onClick={() => setIsFormOpen(false)}
              className="absolute right-4 top-4 text-muted hover:text-ink focus-ring rounded-md p-1"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-ink mb-4">
              {selectedService ? "Edit Service Category" : "Add Service Category"}
            </h2>
            {error && (
              <div className="mb-4 rounded-md bg-[#fff1ef] px-3 py-2 text-sm text-danger border border-danger/10">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Service Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                  placeholder="e.g. Dry Cleaning"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="focus-ring w-full rounded-md border border-line p-3 text-sm bg-white"
                  placeholder="Optional brief details about this service"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pricing Model</label>
                <select
                  value={pricingType}
                  onChange={(e) => setPricingType(e.target.value as "PER_PIECE" | "PER_KG")}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                >
                  <option value="PER_PIECE">Per Piece (e.g. Shirts, Pants)</option>
                  <option value="PER_KG">Per KG (e.g. Wash & Fold bulk load)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Default Rate (₹)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted">
                      <IndianRupee size={14} />
                    </div>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={defaultRate}
                      onChange={(e) => setDefaultRate(e.target.value)}
                      className="focus-ring h-10 w-full rounded-md border border-line pl-8 pr-3 text-sm bg-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">GST Tax Rate (%)</label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={gstRate}
                      onChange={(e) => setGstRate(e.target.value)}
                      className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                      placeholder="18"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted">
                      <Percent size={13} />
                    </div>
                  </div>
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
                  onClick={() => setIsFormOpen(false)}
                  className="focus-ring h-10 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="focus-ring h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {formLoading ? "Saving..." : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
