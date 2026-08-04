"use client";

import { useEffect, useState } from "react";

const POLL_MS = 30_000;

/**
 * Sidebar unread-notification count. Starts from the server-rendered value,
 * then lightly polls while the tab is visible so a notification that arrives
 * mid-session (a matching lead alert, a new purchase, etc.) shows up without
 * a manual page reload. Polling pauses when the tab isn't visible.
 */
export function NotificationBadge({ initial }: { initial: number }) {
  const [unread, setUnread] = useState(initial);

  // The server-rendered `initial` only updates when this component's parent
  // re-renders (e.g. after router.refresh() following an account switch) —
  // resync local state then rather than keeping a stale count from before.
  useEffect(() => setUnread(initial), [initial]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      try {
        const res = await fetch("/api/account/notifications", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled && json.ok) setUnread(json.data.unread);
      } catch {
        // Transient network error — next tick tries again.
      }
    }

    function start() {
      if (timer) return;
      timer = setInterval(poll, POLL_MS);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    if (document.visibilityState === "visible") start();
    function onVisibility() {
      if (document.visibilityState === "visible") {
        poll();
        start();
      } else {
        stop();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (unread <= 0) return null;
  return <span className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>;
}
