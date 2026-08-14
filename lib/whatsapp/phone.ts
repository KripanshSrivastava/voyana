/**
 * Phone-number normalisation for WhatsApp.
 *
 * WhatsApp addresses every recipient by an E.164-style number WITHOUT the
 * leading `+` — e.g. `919876543210`. Our lead/agent records store whatever
 * the user typed: `+91 98765 43210`, `098765 43210`, `9876543210`, and so on.
 *
 * This module is deliberately separate from the send client so it can be
 * unit-tested without mocking any network layer.
 */

/** Default country calling code applied to bare local numbers. India. */
const DEFAULT_COUNTRY_CODE = "91";

/** Plausible E.164 length bounds (excluding the `+`). */
const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

/**
 * Convert a stored phone string into the digits-only form WhatsApp expects.
 * Returns `null` when the input can't be salvaged — callers MUST treat null
 * as "don't attempt to send" rather than substituting a fallback, so we never
 * message a stranger because of a typo in a lead.
 *
 *   "+91 98765 43210" -> "919876543210"
 *   "098765 43210"    -> "919876543210"   (strips trunk 0, adds 91)
 *   "9876543210"      -> "919876543210"   (bare 10-digit Indian mobile)
 *   "44 20 7946 0958" -> "442079460958"   (already has a country code)
 *   "12345"           -> null             (too short)
 */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Keep digits only. A leading "+" carries no information once we know the
  // rest already includes a country code.
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Strip international dialling prefixes: "00" (ITU) or a single trunk "0".
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");

  if (!digits) return null;

  // A bare 10-digit number is an Indian mobile with the country code omitted.
  // Anything longer is assumed to already carry its own country code — we do
  // NOT try to guess, because prefixing a foreign number would silently send
  // to the wrong person.
  if (digits.length === 10) digits = DEFAULT_COUNTRY_CODE + digits;

  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;
  return digits;
}

/**
 * Build a click-to-chat deep link. Works with no API access at all — this is
 * what powers the agent's "message the customer" button (feature C).
 * `text` is URL-encoded; WhatsApp pre-fills the composer but the agent still
 * presses send, so this is not a business-initiated message and needs no
 * template approval.
 */
export function whatsAppDeepLink(phone: string | null | undefined, text?: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  const base = `https://wa.me/${number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
