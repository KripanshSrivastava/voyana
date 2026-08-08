import "server-only";

/**
 * ONE authoritative pricing calculation for every lead purchase.
 * Every call site — Available Leads UI, purchase route, auto-buy, receipts,
 * admin display — must go through here. Never trust a price sent from the
 * client; the server always re-computes.
 *
 * Rupee price is derived from four admin-configurable SiteSetting fields.
 * Credit cost is derived from the rupee price (1 credit = ₹100, matching
 * the existing LEAD_100 / LEAD_150 credit packages — round up so ₹150
 * costs 2 credits, not "1.5"). Never zero credits: a free-priced lead
 * (₹0) still costs 1 credit to unlock the customer's contact details, so
 * abuse via "free" pricing can't drain leads for nothing.
 */

export type PurchaseType = "SHARED" | "EXCLUSIVE";

export type PricingSettings = {
  priceSharedDomestic: number;
  priceSharedInternational: number;
  priceExclusiveDomestic: number;
  priceExclusiveInternational: number;
  defaultLeadPrice: number;
};

/** Was this lead classified as international? */
function isInternational(tripCategory: string | null | undefined): boolean {
  return tripCategory === "INTERNATIONAL";
}

/** Rupee price the agent is charged for this purchase type on this lead. */
export function computeLeadPrice(params: {
  tripCategory: string | null | undefined;
  purchaseType: PurchaseType;
  settings: PricingSettings;
}): number {
  const intl = isInternational(params.tripCategory);
  if (params.purchaseType === "EXCLUSIVE") {
    return intl ? params.settings.priceExclusiveInternational : params.settings.priceExclusiveDomestic;
  }
  return intl ? params.settings.priceSharedInternational : params.settings.priceSharedDomestic;
}

/** Credit cost for a rupee price (1 credit = ₹100, minimum 1 credit). */
export function priceToCredits(priceInr: number): number {
  return Math.max(1, Math.ceil(priceInr / 100));
}

/** Convenience: both together, for consumers that need both numbers. */
export function computeLeadCharge(params: {
  tripCategory: string | null | undefined;
  purchaseType: PurchaseType;
  settings: PricingSettings;
}): { priceInr: number; credits: number } {
  const priceInr = computeLeadPrice(params);
  return { priceInr, credits: priceToCredits(priceInr) };
}

/** Only fresh (unsold) leads can be bought exclusively — otherwise "exclusive"
 *  would be a lie to the buyer, since another agent already has the customer.
 *  Enforced server-side in purchaseLead(); the UI should also disable the
 *  Buy Exclusive button when assignmentCount > 0. */
export function exclusiveEligible(assignmentCount: number): boolean {
  return assignmentCount === 0;
}

/** Some lead types are sold exclusively only — no shared distribution.
 *  Currently: INTERNATIONAL leads. The single source of truth for this
 *  rule; consumed by purchaseLead() (rejects SHARED at the transaction),
 *  the Available Leads UI (hides the Buy Shared button), and the auto-buy
 *  service (skips international leads because auto-buy only does SHARED). */
export function requiresExclusive(tripCategory: string | null | undefined): boolean {
  return tripCategory === "INTERNATIONAL";
}
