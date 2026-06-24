"use client";

import { useEffect, useState } from "react";
import { 
  UserCog, 
  Phone, 
  MapPin, 
  Building2, 
  Key, 
  ToggleLeft, 
  ToggleRight, 
  Edit3, 
  X, 
  Plus, 
  CheckCircle, 
  Clock 
} from "lucide-react";
import { 
  getUsers, 
  createCashier, 
  updateUser, 
  enableUser, 
  disableUser, 
  resetUserPassword,
  getBranches,
  type User,
  type Branch
} from "@/lib/api";

export default function CashiersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  
  // Form input states
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const usersData = await getUsers();
      const branchesData = await getBranches();
      
      // Filter out disabled branches for selection
      const activeBranches = branchesData.branches.filter(b => b.status === "ACTIVE");
      
      setUsers(usersData.users);
      setBranches(activeBranches);
    } catch (err: any) {
      setError(err.message || "Failed to load cashier accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setName("");
    setMobile("");
    setUsername("");
    setPassword("");
    setBranchId(branches[0]?.id || "");
    setError("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setName(user.name);
    setMobile(user.mobile);
    setUsername(user.username);
    setPassword("");
    setBranchId(user.branchId || "");
    setError("");
    setIsFormOpen(true);
  };

  const handleOpenPassword = (user: User) => {
    setSelectedUser(user);
    setPassword("");
    setError("");
    setIsPasswordOpen(true);
  };

  const handleToggleStatus = async (user: User) => {
    try {
      if (user.status === "ACTIVE") {
        await disableUser(user.id);
      } else {
        await enableUser(user.id);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to update cashier status");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormLoading(true);

    try {
      if (selectedUser) {
        await updateUser(selectedUser.id, { name, mobile, username, branchId });
      } else {
        if (!password) {
          throw new Error("Password is required for new Cashiers");
        }
        await createCashier({ name, mobile, username, password, branchId });
      }
      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to save cashier user");
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setError("");
    setFormLoading(true);
    try {
      await resetUserPassword(selectedUser.id, password);
      setIsPasswordOpen(false);
      alert("Password reset successfully");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Cashiers</h1>
          <p className="text-sm text-muted">Create cashier accounts, assign branches, and toggle system access.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          disabled={branches.length === 0}
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50 transition-all"
        >
          <Plus size={16} />
          Add Cashier
        </button>
      </div>

      {branches.length === 0 && !loading && (
        <div className="rounded-md bg-[#fffbeb] p-4 text-sm text-[#8a6d3b] border border-[#faebcc]">
          ⚠️ You must create and activate at least one branch before you can register cashiers.
        </div>
      )}

      {error && !isFormOpen && !isPasswordOpen && (
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
                  <th className="px-5 py-4">Cashier Info</th>
                  <th className="px-5 py-4">Username</th>
                  <th className="px-5 py-4">Assigned Branch</th>
                  <th className="px-5 py-4">Last Login</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="border-t border-line hover:bg-background/50 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <div className="font-semibold text-ink flex items-center gap-1.5">
                            {user.name}
                            {user.role === "ADMIN" && (
                              <span className="rounded bg-[#edf7f6] px-1 py-0.5 text-[10px] font-bold text-brand uppercase">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
                            <Phone size={11} />
                            <span>{user.mobile}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted">{user.username}</td>
                      <td className="px-5 py-4">
                        {user.branch ? (
                          <div className="flex items-center gap-1.5 text-ink">
                            <Building2 size={14} className="text-brand" />
                            <span>{user.branch.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted italic">All Branches</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-muted flex items-center gap-1.5 py-6">
                        <Clock size={13} />
                        <span>{formatDate(user.lastLoginAt)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span 
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                            user.status === "ACTIVE" 
                              ? "bg-[#edf7f6] text-brand border-brand/10" 
                              : "bg-[#fff1ef] text-danger border-danger/10"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={user.role === "ADMIN"}
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted disabled:opacity-40"
                            title={user.status === "ACTIVE" ? "Disable Login" : "Enable Login"}
                          >
                            {user.status === "ACTIVE" ? (
                              <ToggleRight size={18} className="text-brand" />
                            ) : (
                              <ToggleLeft size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenPassword(user)}
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted"
                            title="Reset Password"
                          >
                            <Key size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white hover:bg-background text-muted"
                            title="Edit Cashier"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted">
                      No cashier users found.
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
              {selectedUser ? "Edit Cashier Account" : "Add Cashier Account"}
            </h2>
            {error && (
              <div className="mb-4 rounded-md bg-[#fff1ef] px-3 py-2 text-sm text-danger border border-danger/10">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                  placeholder="e.g. Dhinesh Kumar"
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
                <label className="block text-sm font-medium mb-1">Login Username</label>
                <input
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!!selectedUser}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white disabled:opacity-60"
                  placeholder="e.g. dhinesh_cashier"
                />
              </div>
              
              {!selectedUser && (
                <div>
                  <label className="block text-sm font-medium mb-1">Login Password (Min 8 chars)</label>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                    placeholder="Enter password"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Assigned Branch</label>
                <select
                  required
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
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
                  {formLoading ? "Saving..." : "Save Cashier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal Dialog */}
      {isPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-xl relative animate-scale-in">
            <button 
              onClick={() => setIsPasswordOpen(false)}
              className="absolute right-4 top-4 text-muted hover:text-ink focus-ring rounded-md p-1"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-ink mb-1">Reset Password</h2>
            <p className="text-xs text-muted mb-4">Set a new login password for {selectedUser?.name}</p>
            {error && (
              <div className="mb-4 rounded-md bg-[#fff1ef] px-3 py-2 text-sm text-danger border border-danger/10">
                {error}
              </div>
            )}
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">New Password (Min 8 chars)</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                  placeholder="Enter new password"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordOpen(false)}
                  className="focus-ring h-10 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="focus-ring h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {formLoading ? "Updating..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
