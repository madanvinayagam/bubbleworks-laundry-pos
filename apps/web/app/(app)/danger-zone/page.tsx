"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearTransactionData } from "@/lib/api";
import { loadSession } from "@/lib/session";
import { 
  AlertOctagon, 
  Loader2, 
  CheckCircle2, 
  Trash2 
} from "lucide-react";

export default function DangerZonePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    if (!s) {
      router.push("/login");
      return;
    }
  }, [router]);

  if (!session) return null;

  if (session.user?.role !== "ADMIN") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-600 shadow-panel flex items-start gap-3">
        <AlertOctagon className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <h2 className="font-semibold">Access Privilege Restriction</h2>
          <p className="mt-1 text-red-700">Only Admins can access Danger Zone database reset configurations.</p>
        </div>
      </div>
    );
  }

  const handleClear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (confirmText !== "CONFIRM DELETE") {
      setError("Please type exactly CONFIRM DELETE to perform truncation.");
      return;
    }

    const doubleCheck = window.confirm(
      "EXTREME WARNING: You are about to DELETE all customers, orders, payments, print logs, and audit logs. This cannot be undone. Are you absolutely certain?"
    );
    if (!doubleCheck) return;

    setLoading(true);
    try {
      await clearTransactionData(confirmText);
      setSuccess("All transactional ledger data has been successfully truncated.");
      setConfirmText("");
    } catch (err: any) {
      setError(err.message || "Failed to clear transaction database");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Danger Zone</h1>
          <p className="text-sm text-muted">Dangerous actions that permanently modify or clean the database</p>
        </div>
      </div>

      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-center gap-2">
          <AlertOctagon className="h-4.5 w-4.5 text-red-600" />
          {error}
        </div>
      )}

      <div className="rounded-md border border-red-200 bg-red-50/50 p-5 shadow-panel space-y-4">
        <div className="flex items-start gap-3">
          <AlertOctagon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-red-800">Clear Transactional Ledgers</h2>
            <p className="text-xs text-red-700 leading-relaxed">
              This action will completely delete all Customer profiles, Bills/Orders transactions, Payment logs, Print logs, and Audit history records. Standard Master values like Cashiers, Services rates, Branches definitions, and Settings WILL NOT be deleted.
            </p>
          </div>
        </div>

        <form onSubmit={handleClear} className="space-y-3 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-red-800 uppercase tracking-wider">
              TYPE "CONFIRM DELETE" TO PROCEED
            </label>
            <input
              className="focus-ring h-10 w-full rounded-md border border-red-200 px-3 text-sm bg-white font-semibold font-mono placeholder:font-sans placeholder:font-normal"
              placeholder="CONFIRM DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || confirmText !== "CONFIRM DELETE"}
            className="focus-ring flex h-10 w-full items-center justify-center gap-2 rounded-md bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                Truncating tables...
              </>
            ) : (
              <>
                <Trash2 className="h-4.5 w-4.5" />
                Truncate Transaction Data
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
