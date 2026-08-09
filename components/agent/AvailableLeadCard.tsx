import Link from "next/link";
import { MapPin, Users, Baby, Calendar, Moon, Clock, ShoppingCart, Lock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { leadDisplayTitle, formatDMY, formatDMYTime } from "@/lib/leads/display";

/**
 * One row per lead in the Leads grid. The layout is a three-column strip —
 * trip details on the left, enquiry origin + time in the middle, an action
 * cell on the right — which matches the horizontal "International Lead"
 * board layout the client uses everywhere else in the product.
 *
 * The `lead` shape is intentionally the narrowest thing the row needs;
 * customer contact info stays server-side and is only revealed after
 * purchase on /agent/leads/[id].
 */
export type AvailableLeadCardData = {
  id: string;
  destinationText: string;
  destinationName?: string | null;
  tripType?: string | null;
  tripCategory?: string | null;
  travelers?: number | null;
  adults?: number | null;
  children?: number | null;
  nights?: number | null;
  requirements?: string | null;
  travelDate?: Date | null;
  travelDateText?: string | null;
  clientLocation?: string | null;
  departureCity?: string | null;
  createdAt: Date;
  assignmentCount: number;
  maxAgents: number;
};

export function AvailableLeadCard({
  lead,
  shared,
  exclusive,
  exclusiveOnly,
  canBuy,
  creditsAvailable,
  owned = false,
}: {
  lead: AvailableLeadCardData;
  shared: { priceInr: number; credits: number };
  exclusive: { priceInr: number; credits: number; eligible: boolean };
  exclusiveOnly: boolean;
  canBuy: boolean;
  creditsAvailable: number;
  /** True if the current agent has already bought this lead. Row swaps
   *  the Buy buttons for an "Open lead" link. */
  owned?: boolean;
}) {
  const title = leadDisplayTitle({
    destinationText: lead.destinationText,
    destinationName: lead.destinationName,
    tripType: lead.tripType,
    tripCategory: lead.tripCategory,
  });
  const adults = lead.adults ?? null;
  const children = lead.children ?? 0;
  const hasSplit = lead.adults != null || lead.children != null;
  const nights = lead.nights ?? null;
  const journey = lead.travelDate ? formatDMY(lead.travelDate) : (lead.travelDateText || null);
  const comingFrom = lead.clientLocation || lead.departureCity || null;
  const enquiryReceived = formatDMYTime(lead.createdAt);
  const isIntl = lead.tripCategory === "INTERNATIONAL";
  const full = lead.assignmentCount >= lead.maxAgents;

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center">
        {/* --- Left: title + trip details ---------------------------------- */}
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Link
              href={`/agent/leads/${lead.id}`}
              className="text-base font-semibold text-brand-700 hover:underline sm:text-lg"
            >
              {title}
            </Link>
            <Badge className={isIntl ? "bg-brand-50 text-brand-700 ring-brand-500/20" : "bg-navy-100 text-navy-700 ring-navy-500/20"}>
              {isIntl ? "International" : lead.tripCategory ? `${lead.tripCategory.charAt(0)}${lead.tripCategory.slice(1).toLowerCase()}` : "Trip"}
            </Badge>
            {owned && <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Already yours</Badge>}
          </div>
          <ul className="space-y-1 text-sm text-navy-700">
            {hasSplit ? (
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0 text-navy-400" />
                <span className="font-medium">Adult: {adults ?? 0}</span>
                <span className="mx-1 text-navy-300">·</span>
                <Baby className="h-4 w-4 shrink-0 text-navy-400" />
                <span className="font-medium">Child: {children}</span>
              </li>
            ) : (
              lead.travelers != null && (
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0 text-navy-400" />
                  <span className="font-medium">{lead.travelers} traveller{lead.travelers === 1 ? "" : "s"}</span>
                </li>
              )
            )}
            {journey && (
              <li className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-navy-400" />
                <span className="font-medium">Journey Date:</span> {journey}
              </li>
            )}
            {nights != null && nights > 0 && (
              <li className="flex items-center gap-2">
                <Moon className="h-4 w-4 shrink-0 text-navy-400" />
                <span className="font-medium">Duration:</span> {nights} Night{nights === 1 ? "" : "s"} / {nights + 1} Day{nights + 1 === 1 ? "" : "s"}
              </li>
            )}
          </ul>
        </div>

        {/* --- Middle: coming from + enquiry time -------------------------- */}
        <div className="min-w-0 space-y-1 text-sm text-navy-700 lg:border-l lg:border-navy-100 lg:pl-4">
          {comingFrom && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-navy-400" />
              <span className="font-medium">Coming From:</span> {comingFrom}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-navy-400" />
            <span className="font-medium">Enquiry Time:</span> {enquiryReceived}
          </div>
        </div>

        {/* --- Right: single action cell ----------------------------------- */}
        <div className="flex flex-col items-stretch gap-2 lg:min-w-[180px]">
          {owned ? (
            <Link
              href={`/agent/leads/${lead.id}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold uppercase tracking-wide text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" /> Open Lead
            </Link>
          ) : full ? (
            // Fully distributed — pill-shaped SOLD OUT tag matching the
            // reference board style. Keeps the row visible for social proof
            // but leaves no doubt that the slot is gone.
            <span className="inline-flex h-11 items-center justify-center rounded-full bg-navy-800 px-5 text-sm font-bold uppercase tracking-wider text-white">
              Sold out
            </span>
          ) : creditsAvailable === 0 ? (
            <Link
              href="/agent/wallet"
              className="inline-flex h-11 items-center justify-center rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Buy Lead Credits
            </Link>
          ) : (
            <BuyRowControls
              leadId={lead.id}
              shared={shared}
              exclusive={exclusive}
              exclusiveOnly={exclusiveOnly}
              canBuy={canBuy}
              creditsAvailable={creditsAvailable}
            />
          )}
          {!owned && !full && (
            <span className="text-center text-[11px] text-navy-400">
              {lead.maxAgents - lead.assignmentCount} slot{lead.maxAgents - lead.assignmentCount === 1 ? "" : "s"} left
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact in-row purchase controls. Wraps AgentControls' BuyLeadControls
 *  visually but keeps the row height consistent with the SOLD OUT / OPEN
 *  LEAD alternatives on the right side. */
function BuyRowControls({
  leadId,
  shared,
  exclusive,
  exclusiveOnly,
  canBuy,
  creditsAvailable,
}: {
  leadId: string;
  shared: { priceInr: number; credits: number };
  exclusive: { priceInr: number; credits: number; eligible: boolean };
  exclusiveOnly: boolean;
  canBuy: boolean;
  creditsAvailable: number;
}) {
  // Re-use the existing purchase behaviour via a link that opens the lead
  // detail page — that's where the full-fat Shared/Exclusive/Reason UI
  // already lives (with router.refresh on error to keep stale rows honest).
  // Keeps this row layout tight and matches the reference: one prominent
  // BUY NOW button per row.
  const sharedNoCredits = creditsAvailable < shared.credits;
  const exclNoCredits = creditsAvailable < exclusive.credits;
  const canBuySharedNow = canBuy && !sharedNoCredits && !exclusiveOnly;
  const canBuyExclusiveNow = canBuy && !exclNoCredits && exclusive.eligible;

  const primaryLabel = exclusiveOnly ? "Buy Exclusive" : canBuySharedNow ? "Buy Now" : canBuyExclusiveNow ? "Buy Exclusive" : "Buy Now";
  const primaryDisabled = !canBuy || (exclusiveOnly ? (!exclusive.eligible || exclNoCredits) : (sharedNoCredits && !canBuyExclusiveNow));

  // Card is a server component, so no onClick handlers here — disabled state
  // is expressed via pointer-events-none + aria-disabled, which is enough
  // because the whole card is a link into the lead detail page anyway.
  if (primaryDisabled) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-navy-100 px-5 text-sm font-bold uppercase tracking-wide text-navy-400"
      >
        {exclusiveOnly ? <Lock className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
        {primaryLabel}
      </span>
    );
  }
  return (
    <Link
      href={`/agent/leads/${leadId}`}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-sun-500 px-5 text-sm font-bold uppercase tracking-wide text-white hover:bg-sun-600"
    >
      {exclusiveOnly ? <Lock className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
      {primaryLabel}
    </Link>
  );
}
