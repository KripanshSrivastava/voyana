"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Wallet, TrendingUp, Megaphone, MapPin,
  Package, Compass, Image as ImageIcon, Settings, LogOut, Menu, X, Plane, Inbox,
  Plug, ScrollText, LifeBuoy, Megaphone as MegaphoneIcon, ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GROUPS: { label: string; items: { href: string; label: string; icon: React.ElementType }[] }[] = [
  {
    label: "Operations",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/leads", label: "Leads", icon: Inbox },
      { href: "/admin/agents", label: "Agents", icon: Users },
      { href: "/admin/wallets", label: "Wallets", icon: Wallet },
      { href: "/admin/pricing", label: "Pricing", icon: Wallet },
      { href: "/admin/revenue", label: "Revenue", icon: TrendingUp },
      { href: "/admin/campaigns", label: "Marketing", icon: Megaphone },
      { href: "/admin/spam-reports", label: "Spam Reports", icon: LifeBuoy },
      { href: "/admin/vendor-ads", label: "Vendor Ads", icon: MegaphoneIcon },
    ],
  },
  {
    label: "Content (CMS)",
    items: [
      { href: "/admin/destinations", label: "Destinations", icon: MapPin },
      { href: "/admin/packages", label: "Packages", icon: Package },
      { href: "/admin/tours", label: "Tours", icon: Compass },
      { href: "/admin/media", label: "Media", icon: ImageIcon },
      { href: "/admin/moderation", label: "Content Moderation", icon: ClipboardCheck },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/integrations", label: "Integrations", icon: Plug },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">{g.label}</p>
          <div className="space-y-1">
            {g.items.map((it) => {
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
                  <it.icon className="h-4.5 w-4.5" />
                  {it.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-navy-950 lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <Plane className="h-5 w-5 -rotate-45 text-brand-300" />
          </span>
          <span className="text-lg font-bold text-white">Voyana</span>
          <span className="ml-1 rounded bg-brand-600/30 px-1.5 py-0.5 text-[10px] font-semibold text-brand-200">ADMIN</span>
        </div>
        {nav}
        <div className="border-t border-white/10 p-3">
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-navy-200 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4.5 w-4.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-navy-950">
            <div className="flex h-16 items-center justify-between px-5">
              <span className="text-lg font-bold text-white">Voyana</span>
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

      {/* Content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-navy-100 bg-white px-4 sm:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden"><Menu className="h-6 w-6 text-navy-700" /></button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-navy-500">Signed in as <span className="font-semibold text-navy-800">{name}</span></span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
