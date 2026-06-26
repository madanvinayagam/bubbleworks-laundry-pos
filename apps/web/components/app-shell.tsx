"use client";

import clsx from "clsx";
import {
  ArchiveRestore,
  Banknote,
  Building2,
  ClipboardList,
  Gauge,
  History,
  Loader2,
  LogOut,
  ReceiptText,
  Scissors,
  Settings,
  ShieldAlert,
  Users,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ApiSession } from "@/lib/api";
import { clearSession, loadSession } from "@/lib/session";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/billing/new", label: "New Bill", icon: ReceiptText },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/services", label: "Services", icon: Scissors },
  { href: "/branches", label: "Branches", icon: Building2 },
  { href: "/cashiers", label: "Cashiers", icon: UserCog },
  { href: "/reports", label: "Reports", icon: Banknote },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/danger-zone", label: "Danger Zone", icon: ShieldAlert },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<ApiSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setSession(loadSession());
    };
    setSession(loadSession());
    setIsLoaded(true);
    window.addEventListener("session-updated", handleUpdate);
    return () => {
      window.removeEventListener("session-updated", handleUpdate);
    };
  }, []);

  // Enforce page-level client-side role guards
  useEffect(() => {
    if (session) {
      const role = session.user?.role;
      const adminOnlyRoutes = ["/services", "/settings", "/branches", "/cashiers", "/reports", "/danger-zone"];
      const isTryingToAccessAdminRoute = adminOnlyRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      if (role === "CASHIER" && isTryingToAccessAdminRoute) {
        router.replace("/dashboard");
      }
    }
  }, [session, pathname, router]);

  // Redirect to login if session is loaded and is null
  useEffect(() => {
    if (isLoaded && !session) {
      router.push("/login");
    }
  }, [isLoaded, session, router]);

  const onLogout = () => {
    clearSession();
    router.push("/login");
  };

  if (!isLoaded || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-ink">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <span className="text-sm text-muted font-medium">Loading session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-surface px-3 py-4 lg:block">
        <div className="mb-5 px-3">
          <div className="text-lg font-semibold">Bubbleworks</div>
          <div className="text-sm text-muted">{session?.user.branch?.code ?? "Admin Console"}</div>
        </div>
        <nav className="space-y-1">
          {navItems
            .filter((item) => {
              const role = session?.user?.role;
              if (role === "ADMIN") {
                return item.href !== "/billing/new";
              }
              if (role === "CASHIER") {
                return !["/services", "/settings", "/branches", "/cashiers", "/reports", "/danger-zone"].includes(item.href);
              }
              return true;
            })
            .map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium focus-ring",
                    active ? "bg-brand text-white" : "text-ink hover:bg-[#e9f2f1]",
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-line bg-surface px-4 shadow-panel md:px-6">
          <div>
            <div className="text-sm text-muted">{session?.user.role ?? "ADMIN"}</div>
            <div className="font-semibold">{session?.user.name ?? "Bubbleworks Admin"}</div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium hover:bg-background"
          >
            <LogOut size={17} aria-hidden="true" />
            Logout
          </button>
        </header>
        <main className="px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}
