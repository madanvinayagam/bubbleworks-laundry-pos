"use client";

import { useEffect, useState } from "react";
import { 
  Building2, 
  MapPin, 
  Phone, 
  ToggleLeft, 
  ToggleRight, 
  Edit3, 
  TrendingUp, 
  X,
  Plus
} from "lucide-react";
import { 
  getBranches, 
  createBranch, 
  updateBranch, 
  activateBranch, 
  deactivateBranch,
  getBranchRevenue,
  type Branch 
} from "@/lib/api";

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [branchStats, setBranchStats] = useState<{ totalRevenue: number; totalSales: number; orderCount: number } | null>(null);
  
  // Form input states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [formLoading, setFormLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getBranches();
      setBranches(data.branches);
    } catch (err: any) {
      setError(err.message || "Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedBranch(null);
    setName("");
    setCode("");
    setAddress("");
    setMobile("");
    setStatus("ACTIVE");
    setError("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setName(branch.name);
    setCode(branch.code);
    setAddress(branch.address);
    setMobile(branch.mobile);
    setStatus(branch.status);
    setError("");
    setIsFormOpen(true);
  };

  const handleOpenStats = async (branch: Branch) => {
    setSelectedBranch(branch);
    setStatsLoading(true);
    setIsStatsOpen(true);
    setBranchStats(null);
    try {
      const data = await getBranchRevenue(branch.id);
      setBranchStats(data);
    } catch (err: any) {
      setError(err.message || "Failed to load branch statistics");
    } finally {
      setStatsLoading(false);
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    try {
      if (branch.status === "ACTIVE") {
        await deactivateBranch(branch.id);
      } else {
        await activateBranch(branch.id);
      }
      fetchBranches();
    } catch (err: any) {
      alert(err.message || "Failed to update branch status");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormLoading(true);

    try {
      const payload = { name, code, address, mobile, status };
      if (selectedBranch) {
        await updateBranch(selectedBranch.id, payload);
      } else {
        await createBranch(payload);
      }
      setIsFormOpen(false);
      fetchBranches();
    } catch (err: any) {
      setError(err.message || "Failed to save branch");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Branches</h1>
          <p className="text-sm text-muted">Manage system branches, operational status, and sales metrics.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow hover:opacity-90 transition-all"
        >
          <Plus size={16} />
          Add Branch
        </button>
      </div>

      {error && !isFormOpen && !isStatsOpen && (
        <div className="rounded-md bg-[#fff1ef] p-4 text-sm text-danger border border-danger/10">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.length > 0 ? (
            branches.map((branch) => (
              <div 
                key={branch.id} 
                className="relative overflow-hidden rounded-lg border border-line bg-surface p-5 shadow-panel transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e9f2f1] text-brand">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink">{branch.name}</h3>
                      <span className="inline-block rounded bg-[#eef3f1] px-1.5 py-0.5 text-xs font-semibold text-muted">
                        {branch.code}
                      </span>
                    </div>
                  </div>
                  <span 
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                      branch.status === "ACTIVE" 
                        ? "bg-[#edf7f6] text-brand border-brand/10" 
                        : "bg-background text-muted border-line"
                    }`}
                  >
                    {branch.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-muted">
                  <div className="flex items-center gap-2">
                    <MapPin size={15} />
                    <span className="truncate">{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={15} />
                    <span>{branch.mobile}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                  <button
                    onClick={() => handleToggleStatus(branch)}
                    className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-brand"
                    title={branch.status === "ACTIVE" ? "Deactivate Branch" : "Activate Branch"}
                  >
                    {branch.status === "ACTIVE" ? (
                      <>
                        <ToggleRight size={20} className="text-brand" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={20} className="text-muted" />
                        <span>Inactive</span>
                      </>
                    )}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenStats(branch)}
                      className="focus-ring flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted"
                      title="View Performance"
                    >
                      <TrendingUp size={15} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(branch)}
                      className="focus-ring flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted"
                      title="Edit Branch"
                    >
                      <Edit3 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-lg border border-dashed border-line p-10 text-center text-muted">
              No branches found. Click "Add Branch" to create one.
            </div>
          )}
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
              {selectedBranch ? "Edit Branch" : "Add Branch"}
            </h2>
            {error && (
              <div className="mb-4 rounded-md bg-[#fff1ef] px-3 py-2 text-sm text-danger border border-danger/10">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Branch Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                  placeholder="e.g. Erode Bypass"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Branch Code (Max 12 chars)</label>
                <input
                  required
                  type="text"
                  maxLength={12}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!!selectedBranch}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white uppercase disabled:opacity-60"
                  placeholder="e.g. ERD"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  required
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="focus-ring w-full rounded-md border border-line p-3 text-sm bg-white"
                  placeholder="Street name, City, Zip"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mobile Number</label>
                <input
                  required
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                  placeholder="e.g. +91 9876543210"
                />
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
                  {formLoading ? "Saving..." : "Save Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Modal Dialog */}
      {isStatsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-xl relative animate-scale-in">
            <button 
              onClick={() => setIsStatsOpen(false)}
              className="absolute right-4 top-4 text-muted hover:text-ink focus-ring rounded-md p-1"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-ink mb-1">Branch Performance</h2>
            <p className="text-xs text-muted mb-4">{selectedBranch?.name} ({selectedBranch?.code})</p>
            
            {statsLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand border-t-transparent" />
              </div>
            ) : branchStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-line bg-background p-3.5">
                    <span className="text-xs text-muted block mb-1">Total Revenue</span>
                    <span className="text-xl font-bold text-brand">₹{branchStats.totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="rounded-md border border-line bg-background p-3.5">
                    <span className="text-xs text-muted block mb-1">Total Sales</span>
                    <span className="text-xl font-bold text-ink">₹{branchStats.totalSales.toFixed(2)}</span>
                  </div>
                </div>
                <div className="rounded-md border border-line bg-background p-3.5">
                  <span className="text-xs text-muted block mb-1">Total Orders</span>
                  <span className="text-xl font-bold text-ink">{branchStats.orderCount} bills</span>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsStatsOpen(false)}
                    className="focus-ring h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-center py-6 text-muted">Failed to load performance metrics</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
