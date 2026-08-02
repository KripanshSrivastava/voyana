"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, ShieldCheck, Wallet, ShoppingBag, Info } from "lucide-react";
import { Card, Button, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

type N = { id: string; type: string; title: string; body: string | null; href: string | null; read: boolean; createdAt: string };

const ICONS: Record<string, typeof Bell> = { verification: ShieldCheck, wallet: Wallet, purchase: ShoppingBag, lead: ShoppingBag, system: Info };

export function NotificationList({ initial }: { initial: N[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const hasUnread = items.some((n) => !n.read);

  async function markAll() {
    setItems((s) => s.map((n) => ({ ...n, read: true })));
    await fetch("/api/account/notifications/read-all", { method: "POST" });
    router.refresh();
  }
  async function markOne(id: string) {
    setItems((s) => s.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch(`/api/account/notifications/${id}/read`, { method: "POST" });
    router.refresh();
  }

  if (items.length === 0) return <EmptyState title="No notifications yet" description="Lead alerts, wallet updates and verification news will appear here." />;

  return (
    <div>
      {hasUnread && <div className="mb-4 flex justify-end"><Button variant="ghost" onClick={markAll}><Check className="h-4 w-4" /> Mark all read</Button></div>}
      <div className="space-y-2">
        {items.map((n) => {
          const Icon = ICONS[n.type] ?? Bell;
          const inner = (
            <div className="flex items-start gap-3">
              <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", n.read ? "bg-navy-50 text-navy-400" : "bg-brand-50 text-brand-600")}><Icon className="h-4.5 w-4.5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("truncate", n.read ? "text-navy-600" : "font-semibold text-navy-900")}>{n.title}</p>
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                </div>
                {n.body && <p className="mt-0.5 text-sm text-navy-500">{n.body}</p>}
                <p className="mt-1 text-xs text-navy-400">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </div>
          );
          return (
            <Card key={n.id} className={cn("p-4 transition-colors", !n.read && "border-brand-100 bg-brand-50/30")} onClick={() => !n.read && markOne(n.id)} role="button">
              {n.href ? <Link href={n.href} onClick={() => markOne(n.id)}>{inner}</Link> : inner}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
