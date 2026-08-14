"use client";

import { useEffect, useId, useState } from "react";
import { getAttribution, trackLeadConversion } from "@/lib/attribution";

/**
 * The single enquiry form used across the ENTIRE public site — the landing
 * page hero/cards, and every "Get Free Quotes" button on /destinations,
 * /packages, /tours and their detail pages. Previously those surfaces sent
 * visitors to a separate full-page 9-step wizard (/request-quote) styled in
 * the old navy palette, so the form a visitor saw depended on which page
 * they clicked from. This is the fix: one modal, one style, everywhere.
 *
 * `/request-quote` itself is untouched and still reachable directly (e.g.
 * existing ad campaign links) — it just isn't linked from anywhere in the
 * nav anymore.
 */

export type ModalPrefill = {
  destination?: string;
  travelDate?: string;
  nights?: string;
  travelers?: string;
  /** CMS ids, when the enquiry originated from a specific destination or
   *  package page — threaded through to /api/leads so the lead stays linked
   *  to the content that generated it. */
  destinationId?: string;
  packageId?: string;
};

const DURATION_OPTIONS = [
  { value: "2", label: "2 Nights / 3 Days" },
  { value: "3", label: "3 Nights / 4 Days" },
  { value: "4", label: "4 Nights / 5 Days" },
  { value: "5", label: "5 Nights / 6 Days" },
  { value: "6", label: "6 Nights / 7 Days" },
  { value: "7", label: "7 Nights / 8 Days" },
  { value: "10", label: "10 Nights / 11 Days" },
];

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1px solid oklch(0.85 0.01 55)",
  borderRadius: 6,
  fontSize: 14,
  fontFamily: "var(--font-home-sans, inherit), sans-serif",
  boxSizing: "border-box",
  background: "#fff",
  color: "var(--mb-ink)",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--mb-muted)",
  marginBottom: 6,
};

export function LeadPopupModal({
  open,
  prefill,
  destinations,
  onClose,
}: {
  open: boolean;
  /** Values pre-filled from the hero search bar, a card click, or the page
   *  the modal was opened from. Only the fields the caller knew about are
   *  seeded — the rest keep their defaults. */
  prefill?: ModalPrefill;
  /** Known destination names for the autocomplete dropdown. When omitted
   *  (any page that doesn't have a full destination list on hand) the field
   *  degrades to a plain text input rather than an empty dropdown. */
  destinations?: string[];
  onClose: () => void;
}) {
  const datalistId = useId();
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ name: string; destination: string } | null>(null);
  const [form, setForm] = useState({
    customerName: "",
    destinationText: prefill?.destination ?? "",
    departureCity: "",
    travelDate: prefill?.travelDate ?? "",
    nights: prefill?.nights ?? "5",
    adults: prefill?.travelers ?? "2",
    children: "0",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const titleDestination = form.destinationText || prefill?.destination;
  const hasDestinationList = (destinations?.length ?? 0) > 0;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function validate(): string | null {
    if (form.customerName.trim().length < 2) return "Please enter your full name.";
    if (form.destinationText.trim().length < 2) return "Please select a destination.";
    if (form.departureCity.trim().length < 2) return "Please enter your city.";
    const nights = Number(form.nights);
    if (!Number.isInteger(nights) || nights < 1 || nights > 60) return "Please choose a trip duration.";
    const adults = Number(form.adults);
    if (!Number.isInteger(adults) || adults < 1 || adults > 99) return "Please enter how many adults are travelling.";
    const children = Number(form.children || 0);
    if (!Number.isInteger(children) || children < 0 || children > 99) return "Please enter a valid children count (0 if none).";
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return "Please enter a valid phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Please enter a valid email address.";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadFormType: "landing-popup",
          customerName: form.customerName,
          destinationText: form.destinationText,
          departureCity: form.departureCity,
          travelDate: form.travelDate || undefined,
          nights: Number(form.nights),
          adults: Number(form.adults),
          children: Number(form.children || 0),
          travelers: Number(form.adults) + Number(form.children || 0),
          phone: form.phone,
          email: form.email,
          requirements: [`${Number(form.nights)} nights`],
          destinationId: prefill?.destinationId,
          packageId: prefill?.packageId,
          attribution: getAttribution(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Submission failed");
      trackLeadConversion({ leadCode: json.data.code });
      setSubmitted({ name: form.customerName.trim(), destination: form.destinationText.trim() });
      setStatus("success");
    } catch {
      setError("We couldn't submit your request. Please check your details and try again.");
      setStatus("idle");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0.15 0.02 30 / 0.55)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 10,
          width: 460,
          maxWidth: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 40px 80px oklch(0.1 0.02 30 / 0.35)",
          padding: "32px 32px 28px",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 20,
            right: 22,
            fontSize: 18,
            color: "var(--mb-muted-3)",
            cursor: "pointer",
            background: "none",
            border: "none",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {status === "success" && submitted ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.4px", color: "var(--mb-accent)", fontWeight: 600, marginBottom: 8 }}>
              ENQUIRY RECEIVED
            </div>
            <h2 style={{ fontSize: 24, marginBottom: 12 }}>Thanks, {submitted.name}.</h2>
            <p style={{ fontSize: 14, color: "var(--mb-muted)", lineHeight: 1.6, marginBottom: 24 }}>
              We&apos;ve received your request for {submitted.destination}. Our travel professionals will contact you shortly.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mb-btn-accent"
              style={{ fontSize: 15, fontWeight: 500, color: "#fff", background: "var(--mb-accent)", padding: "13px 28px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, letterSpacing: "0.4px", color: "var(--mb-accent)", fontWeight: 600, marginBottom: 8 }}>
              TRAVEL ENQUIRY
            </div>
            <h2 style={{ fontSize: 24, marginBottom: 24 }}>
              Plan your trip{titleDestination ? ` to ${titleDestination}` : ""}
            </h2>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={LABEL_STYLE}>Full Name</label>
                  <input autoFocus type="text" placeholder="Your name" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Traveling From</label>
                  <input type="text" placeholder="Your city" value={form.departureCity} onChange={(e) => set("departureCity", e.target.value)} style={INPUT_STYLE} />
                </div>
              </div>

              <div>
                <label style={LABEL_STYLE}>Destination</label>
                {hasDestinationList ? (
                  <select value={form.destinationText} onChange={(e) => set("destinationText", e.target.value)} style={INPUT_STYLE}>
                    <option value="">Select Destination</option>
                    {destinations!.map((destination) => (
                      <option key={destination} value={destination}>{destination}</option>
                    ))}
                    {form.destinationText && !destinations!.includes(form.destinationText) && (
                      <option value={form.destinationText}>{form.destinationText}</option>
                    )}
                  </select>
                ) : (
                  <>
                    <input
                      type="text"
                      list={datalistId}
                      placeholder="Where do you want to go?"
                      value={form.destinationText}
                      onChange={(e) => set("destinationText", e.target.value)}
                      style={INPUT_STYLE}
                      autoComplete="off"
                    />
                    <datalist id={datalistId} />
                  </>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={LABEL_STYLE}>Travel Date</label>
                  <input type="date" value={form.travelDate} onChange={(e) => set("travelDate", e.target.value)} style={{ ...INPUT_STYLE, color: "var(--mb-muted)" }} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Duration</label>
                  <select value={form.nights} onChange={(e) => set("nights", e.target.value)} style={INPUT_STYLE}>
                    {DURATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={LABEL_STYLE}>Adults</label>
                  <input type="number" min={1} max={99} value={form.adults} onChange={(e) => set("adults", e.target.value)} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Children</label>
                  <input type="number" min={0} max={99} value={form.children} onChange={(e) => set("children", e.target.value)} style={INPUT_STYLE} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={LABEL_STYLE}>Phone Number</label>
                  <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set("phone", e.target.value)} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Email Address</label>
                  <input type="email" placeholder="you@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} style={INPUT_STYLE} />
                </div>
              </div>

              {error && (
                <p role="alert" style={{ fontSize: 13, color: "oklch(0.5 0.18 20)", background: "oklch(0.96 0.03 20)", padding: "10px 12px", borderRadius: 6, margin: 0 }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mb-btn-accent"
                style={{
                  textAlign: "center",
                  marginTop: 8,
                  fontSize: 15,
                  fontWeight: 500,
                  color: "#fff",
                  background: "var(--mb-accent)",
                  padding: 13,
                  borderRadius: 6,
                  border: "none",
                  cursor: status === "submitting" ? "not-allowed" : "pointer",
                  opacity: status === "submitting" ? 0.7 : 1,
                  fontFamily: "inherit",
                }}
              >
                {status === "submitting" ? "Submitting…" : "Submit Enquiry"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
