"use client";

import { useEffect, useState } from "react";
import { 
  Settings, 
  Building2, 
  Percent, 
  Printer, 
  Key, 
  Save, 
  AlertCircle, 
  CheckCircle 
} from "lucide-react";
import { 
  getSettings, 
  updateBusinessSettings, 
  updateTaxSettings, 
  updatePrinterSettings,
  resetUserPassword,
  updateUser
} from "@/lib/api";
import { loadSession, saveSession } from "@/lib/session";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [currentUserId, setCurrentUserId] = useState("");

  // Business settings states
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [businessLoading, setBusinessLoading] = useState(false);

  // Tax settings states
  const [defaultGstRate, setDefaultGstRate] = useState("");
  const [taxLoading, setTaxLoading] = useState(false);

  // Printer settings states
  const [printerSize, setPrinterSize] = useState<"MM_58" | "MM_80">("MM_80");
  const [printerLoading, setPrinterLoading] = useState(false);

  // Security profile & password states
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setRole(session.user.role);
      setCurrentUserId(session.user.id);
      setDisplayName(session.user.name);
      setUsername(session.user.username);
    }
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSettings();
      const s = data.settings;
      setBusinessName(s.businessName);
      setLogoUrl(s.logoUrl ?? "");
      setAddress(s.address);
      setMobile(s.mobile);
      setGstNumber(s.gstNumber);
      setDefaultGstRate(String(s.defaultGstRate));
      setPrinterSize(s.printerSize);
    } catch (err: any) {
      setError(err.message || "Failed to load global configurations");
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleUpdateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusinessLoading(true);
    try {
      await updateBusinessSettings({
        businessName,
        logoUrl: logoUrl || null,
        address,
        mobile,
        gstNumber
      });
      showSuccess("Business profile updated successfully");
    } catch (err: any) {
      setError(err.message || "Failed to save business settings");
    } finally {
      setBusinessLoading(false);
    }
  };

  const handleUpdateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTaxLoading(true);
    try {
      await updateTaxSettings(Number(defaultGstRate));
      showSuccess("Default GST rate updated successfully");
    } catch (err: any) {
      setError(err.message || "Failed to save tax settings");
    } finally {
      setTaxLoading(false);
    }
  };

  const handleUpdatePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPrinterLoading(true);
    try {
      await updatePrinterSettings(printerSize);
      showSuccess("Default thermal print size updated successfully");
    } catch (err: any) {
      setError(err.message || "Failed to save printer settings");
    } finally {
      setPrinterLoading(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (newPassword && newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      // 1. Update Profile (Name & Username)
      await updateUser(currentUserId, {
        name: displayName,
        username: username,
      });

      // Update local storage session
      const session = loadSession();
      if (session) {
        session.user.name = displayName;
        session.user.username = username;
        saveSession(session);
        // Dispatch event so other components (e.g. app-shell) know to re-render
        window.dispatchEvent(new Event("session-updated"));
      }

      // 2. Update Password if provided
      if (newPassword) {
        await resetUserPassword(currentUserId, newPassword);
        setNewPassword("");
        setConfirmPassword("");
      }

      showSuccess("Account credentials updated successfully");
    } catch (err: any) {
      setError(err.message || "Failed to update account settings");
    } finally {
      setPasswordLoading(false);
    }
  };

  const isAdmin = role === "ADMIN";

  return (
    <section className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="text-sm text-muted">Manage business identity, GST tax defaults, receipt size formats, and password security.</p>
      </div>

      {success && (
        <div className="rounded-md bg-[#edf7f6] p-4 text-sm text-brand border border-brand/10 flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-[#fff1ef] p-4 text-sm text-danger border border-danger/10 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6">
          
          {/* Business Settings */}
          <div className="rounded-lg border border-line bg-surface p-5 shadow-panel">
            <div className="flex items-center gap-2 border-b border-line pb-3 mb-4">
              <Building2 size={18} className="text-brand" />
              <h2 className="text-lg font-semibold text-ink">Business Profile</h2>
            </div>
            
            <form onSubmit={handleUpdateBusiness} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Business Name</label>
                  <input
                    required
                    disabled={!isAdmin}
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">GST Number (Optional)</label>
                  <input
                    disabled={!isAdmin}
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white disabled:opacity-60"
                    placeholder="e.g. 33AAAAA1111A1Z1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Logo URL (Optional)</label>
                <input
                  disabled={!isAdmin}
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white disabled:opacity-60"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Business Address</label>
                  <input
                    required
                    disabled={!isAdmin}
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Number</label>
                  <input
                    required
                    disabled={!isAdmin}
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white disabled:opacity-60"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={businessLoading}
                    className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-60"
                  >
                    <Save size={16} />
                    {businessLoading ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            
            {/* Tax Settings */}
            <div className="rounded-lg border border-line bg-surface p-5 shadow-panel flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-line pb-3 mb-4">
                  <Percent size={18} className="text-brand" />
                  <h2 className="text-lg font-semibold text-ink">Tax Settings</h2>
                </div>
                
                <form onSubmit={handleUpdateTax} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Default GST Rate (%)</label>
                    <div className="relative">
                      <input
                        required
                        disabled={!isAdmin}
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={defaultGstRate}
                        onChange={(e) => setDefaultGstRate(e.target.value)}
                        className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white disabled:opacity-60"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted">
                        <Percent size={13} />
                      </div>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={taxLoading}
                        className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-60"
                      >
                        <Save size={16} />
                        {taxLoading ? "Saving..." : "Save GST Rate"}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Printer Settings */}
            <div className="rounded-lg border border-line bg-surface p-5 shadow-panel flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-line pb-3 mb-4">
                  <Printer size={18} className="text-brand" />
                  <h2 className="text-lg font-semibold text-ink">Printer Settings</h2>
                </div>
                
                <form onSubmit={handleUpdatePrinter} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Default Receipt Width</label>
                    <select
                      disabled={!isAdmin}
                      value={printerSize}
                      onChange={(e) => setPrinterSize(e.target.value as "MM_58" | "MM_80")}
                      className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white disabled:opacity-60"
                    >
                      <option value="MM_80">3 Inch Thermal Printer (80 mm)</option>
                      <option value="MM_58">2 Inch Thermal Printer (58 mm)</option>
                    </select>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={printerLoading}
                        className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-60"
                      >
                        <Save size={16} />
                        {printerLoading ? "Saving..." : "Save Width"}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>

          </div>

          {/* Account Profile & Credentials */}
          <div className="rounded-lg border border-line bg-surface p-5 shadow-panel">
            <div className="flex items-center gap-2 border-b border-line pb-3 mb-4">
              <Key size={18} className="text-brand" />
              <h2 className="text-lg font-semibold text-ink">Account Settings</h2>
            </div>
            
            <form onSubmit={handleUpdateAccount} className="space-y-4 max-w-md">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <input
                    required
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username (Login ID)</label>
                  <input
                    required
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Password (Optional - Min 8 characters)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                  placeholder="Enter new password to change"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="focus-ring h-10 w-full rounded-md border border-line px-3 text-sm bg-white"
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-60"
                >
                  <Save size={16} />
                  {passwordLoading ? "Saving..." : "Save Account Settings"}
                </button>
              </div>
            </form>
          </div>

        </div>
      )}
    </section>
  );
}
