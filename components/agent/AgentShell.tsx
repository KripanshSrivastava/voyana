"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Briefcase, Wallet, User, LogOut, Menu, X, Plane, AlertTriangle, Bell, Settings, BadgeCheck, SlidersHorizontal, LifeBuoy, Megaphone, FilePlus2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { broadcastAuthChange } from "@/lib/auth/broadcast";
import { AuthSync } from "@/components/auth/AuthSync";
import { NotificationBadge } from "@/components/agent/NotificationBadge";

const BASE_NAV = [
  { href: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent/leads", label: "Available Leads", icon: ShoppingBag },
  { href: "/agent/purchases", label: "My Leads", icon: Briefcase },
  { href: "/agent/preferences", label: "Alerts & Auto-Buy", icon: SlidersHorizontal },
  { href: "/agent/wallet", label: "Lead Credits", icon: Wallet },
  { href: "/agent/notifications", label: "Notifications", icon: Bell },
  { href: "/agent/support", label: "Support", icon: LifeBuoy },
  { href: "/agent/profile", label: "Profile", icon: User },
  { href: "/agent/settings", label: "Settings", icon: Settings },
];
const ADS_NAV = { href: "/agent/ads", label: "My Ads", icon: Megaphone };
const SUBMISSIONS_NAV = { href: "/agent/submissions", label: "Add Your Package", icon: FilePlus2 };

export function AgentShell({
  name,
  company,
  credits,
  status,
  verified = false,
  unread = 0,
  adsEnabled = false,
  submissionsEnabled = false,
  brandName,
  logoUrl,
  children,
}: {
  name: string;
  company: string;
  credits: number;
  status: string;
  verified?: boolean;
  unread?: number;
  adsEnabled?: boolean;
  submissionsEnabled?: boolean;
  brandName: string;
  logoUrl?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const NAV = [...BASE_NAV, ...(submissionsEnabled ? [SUBMISSIONS_NAV] : []), ...(adsEnabled ? [ADS_NAV] : [])];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    broadcastAuthChange();
    router.push("/agent/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-600 text-white" : "text-navy-200 hover:bg-white/10 hover:text-white"
            )}
          >
            <it.icon className="h-4.5 w-4.5" /> {it.label}
            {it.href === "/agent/notifications" && <NotificationBadge initial={unread} />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-navy-50">
      <AuthSync />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-navy-950 lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} className="h-8 w-auto" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><Plane className="h-5 w-5 -rotate-45 text-brand-300" /></span>
          )}
          <span className="text-lg font-bold text-white">{brandName}</span>
          <span className="ml-1 rounded bg-brand-600/30 px-1.5 py-0.5 text-[10px] font-semibold text-brand-200">AGENT</span>
        </div>
        <div className="mx-3 mb-2 rounded-xl bg-white/5 p-3">
          <div className="text-xs text-navy-300">Lead Credits</div>
          <div className="text-lg font-bold text-white">{credits.toLocaleString("en-IN")}</div>
        </div>
        {nav}
        <div className="border-t border-white/10 p-3">
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-navy-200 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4.5 w-4.5" /> Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-navy-950">
            <div className="flex h-16 items-center justify-between px-5">
              <span className="text-lg font-bold text-white">{brandName}</span>
              <button onClick={() => setOpen(false)} className="text-white"><X className="h-5 w-5" /></button>
            </div>
            {nav}
            <div className="border-t border-white/10 p-3">
              <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-navy-200 hover:bg-white/10">
                <LogOut className="h-4.5 w-4.5" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-navy-100 bg-white px-4 sm:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden"><Menu className="h-6 w-6 text-navy-700" /></button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <Link href="/agent/wallet" className="hidden rounded-full border border-navy-200 px-3 py-1.5 text-sm font-semibold text-navy-700 hover:bg-navy-50 sm:inline-flex">
              Lead Credits: {credits.toLocaleString("en-IN")}
            </Link>
            <Link href="/agent/wallet" className="hidden rounded-full bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 sm:inline-flex">
              Buy Credits
            </Link>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-navy-800">
                {company}
                {verified && <BadgeCheck className="h-4 w-4 text-emerald-500" aria-label="Verified Partner" />}
              </div>
              <div className="text-xs text-navy-400">{name}</div>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">{company.charAt(0).toUpperCase()}</span>
          </div>
        </header>

        {status !== "APPROVED" && (
          <div className="flex items-center gap-2 bg-amber-50 px-6 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {status === "PENDING" && "Your account is pending admin approval. You can browse leads but can't purchase yet."}
            {status === "SUSPENDED" && "Your account is suspended. Contact the admin to restore access."}
            {status === "REJECTED" && "Your application was not approved. Contact the admin for details."}
          </div>
        )}

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
