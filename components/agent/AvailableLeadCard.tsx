import Link from "next/link";
import { MapPin, Users, Baby, Calendar, Clock, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui";
import { BuyLeadControls } from "@/components/agent/AgentControls";
import { leadDisplayTitle, leadTravellersLabel, leadDurationLabel, formatDMY, formatDMYTime } from "@/lib/leads/display";

/**
 * Presentational card for one available lead. Same component used by the
 * Agent Dashboard "Available now" section AND the full /agent/leads page,
 * so both surfaces stay in sync and there's no duplicate rendering logic.
 *
 * The `lead` shape is intentionally the narrowest thing the card needs —
 * pass only trip metadata (title/destination/date/duration/enquiry time)
 * and the pre-computed prices. Customer contact info stays server-side and
 * is only revealed after purchase on /agent/leads/[id].
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
}: {
  lead: AvailableLeadCardData;
  shared: { priceInr: number; credits: number };
  exclusive: { priceInr: number; credits: number; eligible: boolean };
  exclusiveOnly: boolean;
  canBuy: boolean;
  creditsAvailable: number;
}) {
  const title = leadDisplayTitle({
    destinationText: lead.destinationText,
    destinationName: lead.destinationName,
    tripType: lead.tripType,
    tripCategory: lead.tripCategory,
  });
  const travellers = leadTravellersLabel({
    travelers: lead.travelers,
    adults: lead.adults,
    children: lead.children,
  });
  const hasSplit = lead.adults != null || lead.children != null;
  const duration = leadDurationLabel({ nights: lead.nights, requirements: lead.requirements });
  const journey = lead.travelDate ? formatDMY(lead.travelDate) : (lead.travelDateText || null);
  const enquiryReceived = formatDMYTime(lead.createdAt);
  const destination = lead.destinationName || lead.destinationText;
  const isIntl = lead.tripCategory === "INTERNATIONAL";
  const full = lead.assignmentCount >= lead.maxAgents;

  return (
    <div className="flex flex-col rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <Link href={`/agent/leads/${lead.id}`} className="text-base font-semibold text-navy-900 hover:text-brand-700">
          {title}
        </Link>
        <Badge className={isIntl ? "bg-brand-50 text-brand-700 ring-brand-500/20 shrink-0" : "bg-navy-100 text-navy-700 ring-navy-500/20 shrink-0"}>
          {isIntl ? "International" : lead.tripCategory ? `${lead.tripCategory.charAt(0)}${lead.tripCategory.slice(1).toLowerCase()}` : "Trip"}
        </Badge>
      </div>

      <dl className="space-y-1.5 text-sm">
        <Row icon={<MapPin className="h-4 w-4" />} label="Destination" value={destination} />
        {/* When the traveller breakdown is captured, show adults and children
            on separate rows — agents quote very differently for a family of 4
            (2A+2C) vs a group of 4 adults. Falls back to the combined label
            when the split isn't known (older/imported leads). */}
        {hasSplit ? (
          <>
            <Row icon={<Users className="h-4 w-4" />} label="Adults" value={String(lead.adults ?? 0)} />
            <Row icon={<Baby className="h-4 w-4" />} label="Children" value={String(lead.children ?? 0)} />
          </>
        ) : (
          travellers && <Row icon={<Users className="h-4 w-4" />} label="Travellers" value={travellers} />
        )}
        {journey && <Row icon={<Calendar className="h-4 w-4" />} label="Journey date" value={journey} />}
        {duration && <Row icon={<Clock className="h-4 w-4" />} label="Duration" value={duration} />}
      </dl>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-navy-400">
          <ClipboardList className="h-3.5 w-3.5" />
          Enquiry received {enquiryReceived}
        </span>
        <Badge className={full ? "bg-rose-50 text-rose-700 ring-rose-600/20" : "bg-teal-50 text-teal-700 ring-teal-600/20"}>
          {lead.assignmentCount}/{lead.maxAgents} sold
        </Badge>
      </div>

      {creditsAvailable === 0 ? (
        <Link
          href="/agent/wallet"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Buy Lead Credits
        </Link>
      ) : (
        <BuyLeadControls
          leadId={lead.id}
          className="mt-4"
          shared={{ priceInr: shared.priceInr, credits: shared.credits }}
          exclusive={{ priceInr: exclusive.priceInr, credits: exclusive.credits, eligible: exclusive.eligible }}
          exclusiveOnly={exclusiveOnly}
          disabled={!canBuy || full}
          disabledReason={!canBuy ? "Account not approved" : full ? "Fully distributed" : undefined}
          creditsAvailable={creditsAvailable}
        />
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-1.5 text-navy-400">{icon} {label}</dt>
      <dd className="font-medium text-navy-800">{value}</dd>
    </div>
  );
}
