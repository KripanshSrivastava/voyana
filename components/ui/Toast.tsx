"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Minimal toast primitive — no dependencies, no context. A global event bus
 * lets any client component fire a toast via `toast.error(...)` / `toast.success(...)`
 * and a single <Toaster /> mounted per authenticated layout listens.
 *
 * Kept deliberately tiny because it exists purely to surface rollback errors
 * from optimistic UI updates; it is NOT a general-purpose notification system.
 */

type ToastKind = "error" | "success";
type ToastEntry = { id: number; kind: ToastKind; message: string };

const listeners = new Set<(t: ToastEntry) => void>();
let nextId = 1;

function emit(kind: ToastKind, message: string) {
  const entry: ToastEntry = { id: nextId++, kind, message };
  listeners.forEach((fn) => fn(entry));
}

export const toast = {
  error: (message: string) => emit("error", message),
  success: (message: string) => emit("success", message),
};

const AUTO_DISMISS_MS = 4000;

export function Toaster() {
  const [items, setItems] = useState<ToastEntry[]>([]);

  useEffect(() => {
    const onEntry = (entry: ToastEntry) => {
      setItems((s) => [...s, entry]);
      setTimeout(() => setItems((s) => s.filter((t) => t.id !== entry.id)), AUTO_DISMISS_MS);
    };
    listeners.add(onEntry);
    return () => {
      listeners.delete(onEntry);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg",
            t.kind === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {t.kind === "error"
            ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            className="opacity-60 hover:opacity-100"
            onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
