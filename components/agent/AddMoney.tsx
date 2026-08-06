"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { formatINR } from "@/lib/utils";

declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } }
}

type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  priceInr: number;
};

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function AddMoney({ packages }: { packages: CreditPackage[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function start(packageId: string) {
    setBusy(packageId);
    setMessage(null);
    try {
      const res = await fetch("/api/agent/wallet/topup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId }) });
      const json = await res.json();
      if (res.status === 503) { setMessage(json.error || "Online payments are not connected yet."); return; }
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not start payment");

      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) { setMessage("Could not load the payment window. Please try again."); return; }

      const rzp = new window.Razorpay({
        key: json.data.keyId,
        order_id: json.data.orderId,
        amount: json.data.amount * 100,
        currency: json.data.currency,
        name: "Moksh Booking",
        description: json.data.packageName,
        handler: () => {
          setMessage("Payment received. Your Lead Credits will update after verification.");
          setTimeout(() => router.refresh(), 2500);
        },
      });
      rzp.open();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {packages.map((pkg) => {
          const cost = Math.round(pkg.priceInr / pkg.credits);
          return (
            <Card key={pkg.id} className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">{pkg.credits} Lead Credits</div>
              <h3 className="mt-2 text-xl font-bold text-navy-900">{pkg.name}</h3>
              <div className="mt-4 text-3xl font-bold text-navy-900">{formatINR(pkg.priceInr)}</div>
              <div className="mt-1 text-sm text-navy-500">{formatINR(cost)} per lead</div>
              <div className="mt-4 text-sm text-navy-600">{pkg.credits.toLocaleString("en-IN")} lead purchases</div>
              <Button variant="brand" className="mt-5 w-full" onClick={() => start(pkg.id)} disabled={busy === pkg.id}>
                {busy === pkg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Buy {pkg.credits} Credits
              </Button>
            </Card>
          );
        })}
      </div>
      {message && <p className="rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-600">{message}</p>}
    </div>
  );
}
