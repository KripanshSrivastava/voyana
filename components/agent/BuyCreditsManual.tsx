"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Loader2, ArrowLeft, Upload } from "lucide-react";
import { Button, Card, Input, Field } from "@/components/ui";
import { formatINR } from "@/lib/utils";

/**
 * Agent-facing manual payment flow:
 *   1) Pick a plan   → 2) Scan QR + upload proof + enter reference → 3) Await admin review
 *
 * The QR image and price come from the admin-configured LeadCreditPackage
 * (paymentQrUrl + priceInr) — never hardcoded, never client-supplied.
 * The API rechecks the plan server-side, so any tampered payload is neutralised.
 */
export type PlanCard = {
  id: string;
  name: string;
  credits: number;
  priceInr: number;
  paymentQrUrl: string | null;
};

export function BuyCreditsManual({ packages }: { packages: PlanCard[] }) {
  const router = useRouter();
  const [step, setStep] = useState<"CHOOSE" | "PAY">("CHOOSE");
  const [chosen, setChosen] = useState<PlanCard | null>(null);
  const [reference, setReference] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ orderCode: string } | null>(null);

  function choose(p: PlanCard) {
    setChosen(p);
    setStep("PAY");
    setError(null);
  }

  function back() {
    setStep("CHOOSE");
    setChosen(null);
    setReference("");
    setScreenshot(null);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen) return;
    if (reference.trim().length < 3) { setError("Enter your payment reference (UPI ref, bank ref, etc.)."); return; }
    if (!screenshot) { setError("Upload a screenshot of your payment."); return; }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("packageId", chosen.id);
      form.set("transactionReference", reference);
      form.set("screenshot", screenshot);
      const res = await fetch("/api/agent/credits/order", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not submit payment.");
      setSubmitted({ orderCode: json.data.orderCode });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit payment.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Check className="h-6 w-6" />
        </span>
        <h3 className="mt-3 text-lg font-semibold text-navy-900">Payment submitted</h3>
        <p className="mt-1 text-sm text-navy-500">
          Order <span className="font-mono font-semibold text-navy-800">{submitted.orderCode}</span> is now under review by the Moksh Booking team. You&apos;ll be notified as soon as it&apos;s approved and your credits are added.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(null); back(); }}>
          Submit another payment
        </Button>
      </div>
    );
  }

  if (step === "CHOOSE" || !chosen) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {packages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => choose(p)}
            className="group flex flex-col items-start rounded-2xl border-2 border-navy-100 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-lg"
          >
            <div className="font-display text-3xl font-bold text-navy-900">{p.credits.toLocaleString("en-IN")} Credits</div>
            <div className="mt-1 text-2xl font-semibold text-navy-700">{formatINR(p.priceInr)}</div>
            <div className="mt-3 text-sm text-navy-500">
              {p.credits > 0 ? `${formatINR(Math.round(p.priceInr / p.credits))} / credit` : ""}
            </div>
            <div className="mt-auto pt-4">
              <span className="inline-flex items-center rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 group-hover:bg-brand-600 group-hover:text-white">
                Buy Credits →
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={back} className="mb-4 inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <ArrowLeft className="h-4 w-4" /> Back to plans
      </button>

      <Card className="p-6">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide text-navy-400">Scan &amp; pay</div>
            <div className="mt-2 text-2xl font-bold text-navy-900">{formatINR(chosen.priceInr)}</div>
            <div className="text-sm text-navy-500">{chosen.credits.toLocaleString("en-IN")} Credits</div>
            <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-navy-200 bg-navy-50 p-4">
              {chosen.paymentQrUrl ? (
                <Image
                  src={chosen.paymentQrUrl}
                  alt={`Payment QR for ${chosen.name}`}
                  width={220}
                  height={220}
                  className="rounded-lg"
                  unoptimized
                />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center px-4 text-center text-xs text-navy-400">
                  QR not yet configured. Contact support to buy credits for this plan.
                </div>
              )}
            </div>
            <p className="mt-3 max-w-[220px] text-xs text-navy-400">
              Scan with any UPI app. After paying, upload the screenshot and reference on the right.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-navy-900">Confirm your payment</h3>
              <p className="text-sm text-navy-500">Credits are added after the Moksh Booking team verifies your payment.</p>
            </div>

            <Field label="Payment reference number" hint="UPI reference, bank transaction number, etc.">
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. 412345678901"
                required
                autoComplete="off"
              />
            </Field>

            <Field label="Payment screenshot" hint="JPG, PNG or WEBP up to 5 MB.">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-navy-200 bg-navy-50 px-4 py-6 text-sm text-navy-600 hover:border-brand-500 hover:bg-brand-50/40">
                <Upload className="h-4 w-4" />
                {screenshot ? screenshot.name : "Choose file"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                  required
                />
              </label>
            </Field>

            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}

            <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy || !chosen.paymentQrUrl}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit payment for review"}
            </Button>
            {!chosen.paymentQrUrl && (
              <p className="text-xs text-amber-600 text-center">
                This plan doesn&apos;t have a QR configured yet, so payments can&apos;t be submitted.
              </p>
            )}
          </form>
        </div>
      </Card>
    </div>
  );
}
