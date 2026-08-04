"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const RULES = [
  { key: "length", label: "Minimum 8 characters", test: (p: string) => p.length >= 8 },
  { key: "upper", label: "Uppercase character", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", label: "Lowercase character", test: (p: string) => /[a-z]/.test(p) },
  { key: "number", label: "Number", test: (p: string) => /\d/.test(p) },
  { key: "special", label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export function passwordMeetsPolicy(password: string): boolean {
  return RULES.every((r) => r.test(password));
}

export function PasswordStrength({ password }: { password: string }) {
  const passed = RULES.filter((r) => r.test(password)).length;
  const pct = (passed / RULES.length) * 100;
  const color = passed <= 2 ? "bg-rose-500" : passed <= 4 ? "bg-amber-500" : "bg-emerald-500";

  if (!password) return null;

  return (
    <div className="mt-2" aria-live="polite">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
        <div className={cn("h-full rounded-full transition-all duration-300", color)} style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.key} className={cn("flex items-center gap-1", ok ? "text-emerald-600" : "text-navy-400")}>
              {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
