"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, ShieldCheck, Wallet, ShoppingBag, Info } from "lucide-react";
import { Card, Button, EmptyState } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type N = { id: string; type: string; title: string; body: string | null; href: string | null; read: boolean; createdAt: string };

const ICONS: Record<string, typeof Bell> = { verification: ShieldCheck, wallet: Wallet, purchase: ShoppingBag, lead: ShoppingBag, system: Info };

/**
 * Notification list with true optimistic updates:
 *  - "Mark all read" and per-row "mark read" flip local state instantly.
 *  - The POST fires in the background; a failure rolls back only the ids
 *    that were actually changed by this action (so unrelated toggles from
 *    another tab or a concurrent auto-fetch aren't clobbered).
 *  - `inFlightIds` prevents duplicate submissions when a user clicks the
 *    same unread card twice or drags across "Mark all read" mid-request.
 */
export function NotificationList({ initial }: { initial: N[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const inFlight = useRef<Set<string>>(new Set());
  const [markAllBusy, setMarkAllBusy] = useState(false);
  const hasUnread = items.some((n) => !n.read);

  async function markAll() {
    if (markAllBusy) return;
    const previouslyUnread = items.filter((n) => !n.read).map((n) => n.id);
    if (previouslyUnread.length === 0) return;
    setMarkAllBusy(true);
    setItems((s) => s.map((n) => ({ ...n, read: true })));
    try {
      const res = await fetch("/api/account/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error("Could not mark all as read.");
      router.refresh();
    } catch (e) {
      // Restore only the ids we actually flipped, in case something else
      // updated the list in the meantime.
      const flipped = new Set(previouslyUnread);
      setItems((s) => s.map((n) => (flipped.has(n.id) ? { ...n, read: false } : n)));
      toast.error(e instanceof Error ? e.message : "Could not mark all as read.");
    } finally {
      setMarkAllBusy(false);
    }
  }
  async function markOne(id: string) {
    if (inFlight.current.has(id)) return;
    const target = items.find((n) => n.id === id);
    if (!target || target.read) return;
    inFlight.current.add(id);
    setItems((s) => s.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      const res = await fetch(`/api/account/notifications/${id}/read`, { method: "POST" });
      if (!res.ok) throw new Error("Could not mark as read.");
      router.refresh();
    } catch (e) {
      setItems((s) => s.map((n) => (n.id === id ? { ...n, read: false } : n)));
      toast.error(e instanceof Error ? e.message : "Could not mark as read.");
    } finally {
      inFlight.current.delete(id);
    }
  }

  if (items.length === 0) return <EmptyState title="No notifications yet" description="Lead alerts, wallet updates and verification news will appear here." />;

  return (
    <div>
      {hasUnread && <div className="mb-4 flex justify-end"><Button variant="ghost" onClick={markAll} disabled={markAllBusy}><Check className="h-4 w-4" /> Mark all read</Button></div>}
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
