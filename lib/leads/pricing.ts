import "server-only";

/**
 * ONE authoritative pricing calculation for every lead purchase.
 * Every call site — Available Leads UI, purchase route, auto-buy, receipts,
 * admin display — must go through here. Never trust a price sent from the
 * client; the server always re-computes.
 *
 * All prices are denominated in **Lead Credits** — the number an admin
 * enters in Site Settings for e.g. "Shared domestic" is the credit cost
 * charged to the agent for that lead. Rupees are never surfaced to agents.
 * Never zero credits: a lead priced at 0 in settings still costs 1 credit
 * to unlock the customer's contact details, so a mis-configured setting
 * can't be used to drain leads for nothing.
 *
 * NOTE: the schema field is still named `priceInr` and `LeadAssignment.price`
 * for legacy reasons — the *value* is now the credit count directly. Keeping
 * the field name avoids a wide-blast-radius rename; a follow-up migration
 * can rename the columns once every consumer is confirmed reading it as
 * credits.
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

/** Credit cost the agent is charged for this purchase type on this lead. */
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

/** Credit cost for a stored price value. Historically this converted rupees
 *  to credits at 1:100; the pricing model is now credits-directly, so the
 *  stored value IS the credit count. Kept as a function (rather than inlining
 *  the raw field) so a future change of denomination has a single edit site
 *  and existing callers keep working unchanged. Never zero. */
export function priceToCredits(storedPrice: number): number {
  return Math.max(1, Math.floor(storedPrice));
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
 *  Currently: NONE. International leads used to be exclusive-only, but the
 *  policy changed to let vendors buy them as shared too so smaller agents
 *  can still afford to bid on premium enquiries. Kept as a helper so the
 *  policy has a single edit site if it ever comes back. */
export function requiresExclusive(_tripCategory: string | null | undefined): boolean {
  return false;
}
