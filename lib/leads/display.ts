/**
 * Presentation helpers for turning raw Lead rows into agent-facing labels.
 * Used by Available Leads, Agent Dashboard, and My Leads so all three
 * surfaces show the same title/duration for the same enquiry.
 *
 * Deliberately does NOT expose the customer's phone/email/name/address —
 * those are locked behind purchase. Only trip metadata is safe to render
 * before purchase.
 */

const TRIP_TYPE_LABELS: Record<string, string> = {
  family: "Family Trip",
  honeymoon: "Honeymoon",
  couple: "Couple Trip",
  friends: "Friends Trip",
  group: "Group Trip",
  solo: "Solo Trip",
  business: "Business Trip",
  adventure: "Adventure Trip",
  religious: "Religious Trip",
  pilgrimage: "Pilgrimage",
  leisure: "Leisure Trip",
};

/** Human-friendly enquiry title. Never returns the lead code or the customer's
 *  name — this is the pre-purchase display where privacy matters. */
export function leadDisplayTitle(input: {
  destinationText?: string | null;
  destinationName?: string | null;
  tripType?: string | null;
  tripCategory?: string | null;
}): string {
  const destination = (input.destinationName || input.destinationText || "").trim();
  const tripTypeKey = (input.tripType || "").trim().toLowerCase();
  const tripTypeLabel = TRIP_TYPE_LABELS[tripTypeKey];

  if (destination && tripTypeLabel) return `${destination} ${tripTypeLabel} Enquiry`;
  if (destination) return `${destination} Holiday Enquiry`;
  if (tripTypeLabel) return `${tripTypeLabel} Enquiry`;
  return "Travel Enquiry";
}

/** "Adults 2 · Children 1" or fallback to "3 travellers" when the split
 *  isn't captured. Returns null when no headcount is known. */
export function leadTravellersLabel(input: {
  travelers?: number | null;
  adults?: number | null;
  children?: number | null;
}): string | null {
  const hasSplit = input.adults != null || input.children != null;
  if (hasSplit) {
    const a = input.adults ?? 0;
    const c = input.children ?? 0;
    if (a === 0 && c === 0) return null;
    if (c === 0) return `${a} adult${a === 1 ? "" : "s"}`;
    if (a === 0) return `${c} child${c === 1 ? "" : "ren"}`;
    return `${a} adult${a === 1 ? "" : "s"} · ${c} child${c === 1 ? "" : "ren"}`;
  }
  if (input.travelers) return `${input.travelers} traveller${input.travelers === 1 ? "" : "s"}`;
  return null;
}

/** "5 Nights / 6 Days" style. Falls back to a "nights" phrase parsed out of
 *  the free-form requirements array for leads created before the dedicated
 *  `nights` column existed. Returns null when duration is unknown. */
export function leadDurationLabel(input: {
  nights?: number | null;
  requirements?: string[] | string | null;
}): string | null {
  if (input.nights && input.nights > 0) return `${input.nights} nights / ${input.nights + 1} days`;
  // Older leads: nights lived inside the requirements JSON array as a free
  // text tag like "5 nights". Best-effort parse — never throws.
  try {
    const arr = typeof input.requirements === "string"
      ? (JSON.parse(input.requirements || "[]") as string[])
      : (input.requirements ?? []);
    for (const entry of arr) {
      const m = /^(\d+)\s+nights?$/i.exec(entry ?? "");
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > 0) return `${n} nights / ${n + 1} days`;
      }
    }
  } catch { /* ignore parse errors */ }
  return null;
}

/** DD/MM/YYYY (Indian convention — matches the rest of the app). */
export function formatDMY(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** DD/MM/YYYY • HH:MM AM/PM in the local timezone. */
export function formatDMYTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const dmy = formatDMY(d);
  const hh24 = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = hh24 >= 12 ? "PM" : "AM";
  const hh12 = String(((hh24 + 11) % 12) + 1).padStart(2, "0");
  return `${dmy} • ${hh12}:${mins} ${ampm}`;
}
