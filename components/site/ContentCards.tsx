import Link from "next/link";
import { MapPin, Clock, ArrowUpRight } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { CmsImage } from "@/components/site/CmsImage";

const CARD_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px";

export function DestinationCard({
  d,
  priority = false,
}: {
  priority?: boolean;
  d: {
    name: string;
    slug: string;
    shortDescription?: string | null;
    heroImage?: string | null;
    startingPrice?: number | null;
    _count?: { packages: number };
  };
}) {
  return (
    <Link
      href={`/destinations/${d.slug}`}
      className="group relative block overflow-hidden rounded-3xl border border-navy-100 bg-navy-950 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-navy-900/10"
    >
      <CmsImage
        src={d.heroImage}
        alt={d.name}
        placeholderLabel={d.name}
        priority={priority}
        sizes={CARD_SIZES}
        className="h-72 w-full"
        imgClassName="transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white transition-transform duration-300 group-hover:-translate-y-1">
        <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-white/70">
          <MapPin className="h-3.5 w-3.5" /> Destination
        </div>
        <h3 className="mt-1 font-display text-2xl font-semibold">{d.name}</h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-medium text-white/90">
            {d.startingPrice ? <>From {formatINR(d.startingPrice)}</> : "Explore trips"}
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-colors group-hover:bg-sun-500">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function PackageCard({
  p,
  basePath = "/packages",
  priority = false,
}: {
  basePath?: string;
  priority?: boolean;
  p: {
    title: string;
    slug: string;
    shortDescription?: string | null;
    heroImage?: string | null;
    startingPrice?: number | null;
    offerPrice?: number | null;
    durationText?: string | null;
    durationDays?: number | null;
    durationNights?: number | null;
    destination?: { name: string } | null;
    images?: { url: string; isHero: boolean }[];
  };
}) {
  const hero =
    p.heroImage || p.images?.find((i) => i.isHero)?.url || p.images?.[0]?.url || null;
  const duration =
    p.durationText ||
    (p.durationDays ? `${p.durationDays}D${p.durationNights ? ` / ${p.durationNights}N` : ""}` : null);
  const price = p.offerPrice ?? p.startingPrice;
  const hasDiscount = p.offerPrice && p.startingPrice && p.offerPrice < p.startingPrice;

  return (
    <Link
      href={`${basePath}/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-navy-200 hover:shadow-xl hover:shadow-navy-900/5"
    >
      <div className="relative">
        <CmsImage
          src={hero}
          alt={p.title}
          placeholderLabel={p.title}
          priority={priority}
          sizes={CARD_SIZES}
          className="h-52 w-full"
          imgClassName="transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
        />
        {hasDiscount && (
          <span className="absolute left-4 top-4 rounded-full bg-sun-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            Save {formatINR(p.startingPrice! - p.offerPrice!)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3 text-xs font-medium text-navy-400">
          {p.destination?.name && (
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p.destination.name}</span>
          )}
          {duration && (
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {duration}</span>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold text-navy-900 transition-colors group-hover:text-brand-700">
          {p.title}
        </h3>
        {p.shortDescription && (
          <p className="mt-1 line-clamp-2 text-sm text-navy-500">{p.shortDescription}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            {price ? (
              <>
                <span className="text-xs text-navy-400">Starting from</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-navy-900">{formatINR(price)}</span>
                  {hasDiscount && <span className="text-sm text-navy-400 line-through">{formatINR(p.startingPrice)}</span>}
                </div>
              </>
            ) : (
              <span className="text-sm font-semibold text-brand-700">Get a quote</span>
            )}
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-50 text-navy-400 transition-all duration-300 group-hover:bg-brand-600 group-hover:text-white">
            <ArrowUpRight className="h-4.5 w-4.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
