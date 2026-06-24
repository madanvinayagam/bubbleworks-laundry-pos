"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, 
  Search, 
  Phone, 
  MapPin, 
  Building2, 
  Eye, 
  Edit3, 
  Trash2, 
  X, 
  Plus,
  AlertTriangle
} from "lucide-react";
import { 
  getCustomers, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer,
  getBranches,
  ApiError,
  type Customer,
  type Branch
} from "@/lib/api";
import { loadSession } from "@/lib/session";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  
  // Session details
  const [isAdmin, setIsAdmin] = useState(false);
  const [myBranchId, setMyBranchId] = useState("");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Duplicate alert modal states
  const [duplicateError, setDuplicateError] = useState("");
  const [existingCustomerId, setExistingCustomerId] = useState<string | null>(null);

  // Form input states
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [branchId, setBranchId] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setIsAdmin(session.user.role === "ADMIN");
      setMyBranchId(session.user.branchId || "");
    }
    fetchData();
  }, []);

  const fetchData = async (searchVal = "") => {
    setLoading(true);
    setError("");
    try {
      const session = loadSession();
      const admin = session?.user?.role === "ADMIN";

      const data = await getCustomers(searchVal);
      setCustomers(data.customers);

      // Only admins can access the branches endpoint
      if (admin) {
        const branchesData = await getBranches();
        setBranches(branchesData.branches.filter(b => b.status === "ACTIVE"));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load customers list");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(search);
  };

  const handleOpenCreate = () => {
    setSelectedCustomer(null);
    setName("");
    setMobile("");
    setAddress("");
    setBranchId(isAdmin ? (branches[0]?.id || "") : myBranchId);
    setError("");
    setDuplicateError("");
    setExistingCustomerId(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setName(customer.name);
    setMobile(customer.mobile);
    setAddress(customer.address);
    setBranchId(customer.branchId);
    setError("");
    setDuplicateError("");
    setExistingCustomerId(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to permanently delete the customer "${customer.name}"?`)) {
      return;
    }
    try {
      await deleteCustomer(customer.id);
      fetchData(search);
    } catch (err: any) {
      alert(err.message || "Failed to delete customer");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDuplicateError("");
    setExistingCustomerId(null);
    setFormLoading(true);

    const payload = {
      name,
      mobile,
      address,
      branchId: isAdmin ? branchId : myBranchId
    };

    try {
      if (selectedCustomer) {
        await updateCustomer(selectedCustomer.id, payload);
      } else {
        await createCustomer(payload);
      }
      setIsFormOpen(false);
      fetchData(search);
    } catch (err: any) {
      if (err instanceof ApiError && err.message.includes("exists")) {
        setDuplicateError(err.message);
        const existingId = err.details && typeof err.details === "object"
          ? (err.details as { existingCustomerId?: string }).existingCustomerId
          : undefined;
        setExistingCustomerId(existingId ?? null);
      } else {
        setError(err.message || "Failed to save customer");
      }
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Customers</h1>
          <p className="text-sm text-muted">Register customer accounts, search profiles, and inspect spending histories.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow hover:opacity-90 transition-all"
        >
          <Plus size={16} />
          Add Customer
        </button>
      </div>

      {/* Search Filter */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by name or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus-ring h-10 w-full rounded-md border border-line pl-10 pr-3 text-sm bg-white"
          />
        </div>
        <button
          type="submit"
          className="focus-ring h-10 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:bg-background"
        >
          Search
        </button>
      </form>

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
                  <th className="px-5 py-4">Customer Info</th>
                  <th className="px-5 py-4">Contact Mobile</th>
                  <th className="px-5 py-4">Address</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <tr key={customer.id} className="border-t border-line hover:bg-background/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-ink">{customer.name}</div>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className="text-muted/60" />
                          <span>{customer.mobile}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        <div className="flex items-center gap-1.5 max-w-xs truncate">
                          <MapPin size={13} className="text-muted/60" />
                          <span>{customer.address || "No address provided"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted"
                            title="View Spending Profile"
                          >
                            <Eye size={14} />
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(customer)}
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted"
                            title="Edit Details"
                          >
                            <Edit3 size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(customer)}
                              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-danger hover:border-danger/20 hover:bg-[#fff1ef]"
                              title="Delete Customer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-muted">
                      No customers found. Click "Add Customer" to create one.
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
              {selectedCustomer ? "Edit Customer Info" : "Register Customer"}
            </h2>

            {duplicateError ? (
              <div className="mb-4 rounded-md bg-[#fffbeb] p-3 text-sm text-[#8a6d3b] border border-[#faebcc] flex flex-col gap-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <span>{duplicateError}</span>
                </div>
                {existingCustomerId && (
                  <Link
                    href={`/customers/${existingCustomerId}`}
                    className="focus-ring self-start inline-flex h-8 items-center rounded bg-brand px-3 text-xs font-semibold text-white hover:opacity-90"
                  >
                    View Existing Customer Profile
                  </Link>
                )}
              </div>
            ) : error ? (
              <div className="mb-4 rounded-md bg-[#fff1ef] px-3 py-2 text-sm text-danger border border-danger/10">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                  placeholder="e.g. John Doe"
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
                <label className="block text-sm font-medium mb-1">Address (Optional)</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="focus-ring w-full rounded-md border border-line p-3 text-sm bg-white"
                  placeholder="Billing address details"
                />
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
                  disabled={formLoading || !!duplicateError}
                  className="focus-ring h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {formLoading ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
