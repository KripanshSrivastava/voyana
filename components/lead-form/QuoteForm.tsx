"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button, Input, Textarea, Field } from "@/components/ui";
import { TRIP_TYPES, REQUIREMENTS } from "@/lib/constants";
import { getAttribution, trackLeadConversion } from "@/lib/attribution";
import { cn } from "@/lib/utils";

export type QuotePrefill = {
  destination?: string;
  tripType?: string;
  destinationId?: string;
  packageId?: string;
  packageName?: string;
};

type State = {
  destinationText: string;
  departureCity: string;
  travelDate: string;
  adults: string;
  children: string;
  budget: string;
  tripType: string;
  requirements: string[];
  message: string;
  customerName: string;
  phone: string;
  email: string;
};

const STEPS = [
  "Destination",
  "Departure",
  "Dates",
  "Travelers",
  "Budget",
  "Trip type",
  "Requirements",
  "Contact",
];

export function QuoteForm({ prefill }: { prefill?: QuotePrefill }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<State>({
    destinationText: prefill?.destination ?? "",
    departureCity: "",
    travelDate: "",
    adults: "2",
    children: "0",
    budget: "",
    tripType: prefill?.tripType ?? "",
    requirements: [],
    message: "",
    customerName: "",
    phone: "",
    email: "",
  });

  const set = (patch: Partial<State>) => setForm((f) => ({ ...f, ...patch }));
  const toggleReq = (r: string) =>
    set({
      requirements: form.requirements.includes(r)
        ? form.requirements.filter((x) => x !== r)
        : [...form.requirements, r],
    });

  function canAdvance(): boolean {
    if (step === 0) return form.destinationText.trim().length > 1;
    if (step === 7) return form.customerName.trim().length > 1 && form.phone.trim().length >= 7;
    return true;
  }

  const next = () => {
    setError(null);
    if (!canAdvance()) {
      setError(step === 0 ? "Tell us where you'd like to go." : "Name and phone are required.");
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  async function submit() {
    if (!canAdvance()) {
      setError("Name and phone are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          phone: form.phone,
          email: form.email || undefined,
          destinationText: form.destinationText,
          departureCity: form.departureCity || undefined,
          travelDate: form.travelDate || undefined,
          // Send both the split and the total — total feeds legacy consumers
          // (older analytics, admin summaries) while adults/children are the
          // richer breakdown displayed in every new lead surface.
          adults: form.adults ? Number(form.adults) : undefined,
          children: form.children ? Number(form.children) : undefined,
          travelers: (Number(form.adults) || 0) + (Number(form.children) || 0) || undefined,
          budget: form.budget ? Number(form.budget) : undefined,
          tripType: form.tripType || undefined,
          requirements: form.requirements,
          message: form.message || undefined,
          destinationId: prefill?.destinationId,
          packageId: prefill?.packageId,
          attribution: getAttribution(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Submission failed");
      }
      trackLeadConversion({ leadCode: json.data.code, value: form.budget ? Number(form.budget) : undefined });
      router.push(`/request-quote/success?code=${encodeURIComponent(json.data.code)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-lg sm:p-8">
      {prefill?.packageName && (
        <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
          Planning around <strong>{prefill.packageName}</strong> — we&apos;ve pre-filled it for you.
        </p>
      )}

      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-navy-500">
          <span>
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div key={step} className="min-h-[180px] animate-fade-up">
        {step === 0 && (
          <Field label="Where do you want to go?">
            <Input
              autoFocus
              placeholder="e.g. Kashmir, Bali, Manali"
              value={form.destinationText}
              onChange={(e) => set({ destinationText: e.target.value })}
            />
          </Field>
        )}
        {step === 1 && (
          <Field label="Which city are you departing from?" hint="Optional but helps agents quote flights.">
            <Input
              autoFocus
              placeholder="e.g. Delhi, Mumbai"
              value={form.departureCity}
              onChange={(e) => set({ departureCity: e.target.value })}
            />
          </Field>
        )}
        {step === 2 && (
          <Field label="When do you plan to travel?" hint="Approximate is fine.">
            <Input
              type="date"
              value={form.travelDate}
              onChange={(e) => set({ travelDate: e.target.value })}
            />
          </Field>
        )}
        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="How many adults?" hint="12 years and above.">
              <Input
                type="number"
                min={1}
                value={form.adults}
                onChange={(e) => set({ adults: e.target.value })}
              />
            </Field>
            <Field label="How many children?" hint="Under 12 years.">
              <Input
                type="number"
                min={0}
                value={form.children}
                onChange={(e) => set({ children: e.target.value })}
              />
            </Field>
          </div>
        )}
        {step === 4 && (
          <Field label="What's your approximate budget (per trip, ₹)?" hint="Optional.">
            <Input
              type="number"
              min={0}
              placeholder="e.g. 50000"
              value={form.budget}
              onChange={(e) => set({ budget: e.target.value })}
            />
          </Field>
        )}
        {step === 5 && (
          <Field label="What kind of trip is this?">
            <div className="flex flex-wrap gap-2">
              {TRIP_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set({ tripType: t })}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    form.tripType === t
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-navy-200 text-navy-600 hover:bg-navy-50"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
        )}
        {step === 6 && (
          <Field label="What do you need help with?">
            <div className="flex flex-wrap gap-2">
              {REQUIREMENTS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleReq(r)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    form.requirements.includes(r)
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-navy-200 text-navy-600 hover:bg-navy-50"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <Field label="Anything else we should know?">
                <Textarea
                  rows={3}
                  placeholder="Special requests, hotel preferences, occasions…"
                  value={form.message}
                  onChange={(e) => set({ message: e.target.value })}
                />
              </Field>
            </div>
          </Field>
        )}
        {step === 7 && (
          <div className="space-y-4">
            <Field label="Your name">
              <Input
                autoFocus
                placeholder="Full name"
                value={form.customerName}
                onChange={(e) => set({ customerName: e.target.value })}
              />
            </Field>
            <Field label="Phone number">
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
            </Field>
            <Field label="Email" hint="Optional — for detailed itineraries.">
              <Input
                type="email"
                placeholder="you@email.com"
                value={form.email}
                onChange={(e) => set({ email: e.target.value })}
              />
            </Field>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600" role="alert" aria-live="polite">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="md" onClick={back} disabled={step === 0 || submitting}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" variant="brand" size="md" onClick={next}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="primary" size="lg" onClick={submit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Get Free Quotes
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
