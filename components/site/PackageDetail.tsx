import { Check, X, Clock, MapPin, Hotel, Bus, Star } from "lucide-react";
import { Gallery } from "@/components/site/Gallery";
import { GetQuoteButton } from "@/components/site/GetQuoteButton";
import { formatINR, parseJson } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

type FullPackage = Prisma.TourPackageGetPayload<{
  include: {
    destination: { select: { name: true; slug: true } };
    images: true;
    itinerary: true;
    inclusions: true;
    exclusions: true;
    faqs: true;
  };
}>;

export function PackageDetail({ p, basePath }: { p: FullPackage; basePath: string }) {
  const galleryImages = [
    ...(p.heroImage ? [p.heroImage] : []),
    ...p.images.map((i) => i.url),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const activities = parseJson<string[]>(p.activities, []);
  const price = p.offerPrice ?? p.startingPrice;
  const hasDiscount = p.offerPrice && p.startingPrice && p.offerPrice < p.startingPrice;
  const duration =
    p.durationText ||
    (p.durationDays ? `${p.durationDays} Days${p.durationNights ? ` / ${p.durationNights} Nights` : ""}` : null);

  const quotePrefill = {
    destination: p.destination?.name,
    destinationId: p.destinationId ?? undefined,
    packageId: p.id,
  };
  const quoteDestinations = p.destination ? [p.destination.name] : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-navy-400">
        <span>{p.kind === "TOUR" ? "Tours" : "Packages"}</span>
        {p.destination && <> · {p.destination.name}</>}
      </nav>

      <Gallery images={galleryImages} title={p.title} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-navy-500">
            {p.destination && (
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {p.destination.name}</span>
            )}
            {duration && <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {duration}</span>}
            {p.tripType && <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{p.tripType}</span>}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-navy-900 sm:text-4xl">{p.title}</h1>

          {(p.longDescription || p.shortDescription) && (
            <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-navy-700">
              {p.longDescription || p.shortDescription}
            </p>
          )}

          {(p.hotelCategory || p.accommodation || p.transport) && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {(p.hotelCategory || p.accommodation) && (
                <div className="rounded-xl border border-navy-100 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-navy-900"><Hotel className="h-4 w-4 text-brand-600" /> Accommodation</h3>
                  {p.hotelCategory && <p className="mt-1 text-sm font-medium text-navy-700">{p.hotelCategory}</p>}
                  {p.accommodation && <p className="mt-1 text-sm text-navy-500">{p.accommodation}</p>}
                </div>
              )}
              {p.transport && (
                <div className="rounded-xl border border-navy-100 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-navy-900"><Bus className="h-4 w-4 text-brand-600" /> Transport</h3>
                  <p className="mt-1 text-sm text-navy-500">{p.transport}</p>
                </div>
              )}
            </div>
          )}

          {activities.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-navy-900">Activities</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {activities.map((a) => (
                  <span key={a} className="flex items-center gap-1 rounded-full bg-navy-50 px-3 py-1.5 text-sm text-navy-700">
                    <Star className="h-3.5 w-3.5 text-sun-500" /> {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {p.itinerary.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold text-navy-900">Itinerary</h2>
              <ol className="mt-4 space-y-4 border-l-2 border-navy-100 pl-6">
                {p.itinerary.map((it) => (
                  <li key={it.id} className="relative">
                    <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {it.day}
                    </span>
                    <h3 className="font-semibold text-navy-900">{it.title}</h3>
                    {it.description && <p className="mt-1 text-sm text-navy-600">{it.description}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(p.inclusions.length > 0 || p.exclusions.length > 0) && (
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {p.inclusions.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-navy-900">Inclusions</h2>
                  <ul className="mt-3 space-y-2">
                    {p.inclusions.map((i) => (
                      <li key={i.id} className="flex items-start gap-2 text-navy-700">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> {i.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {p.exclusions.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-navy-900">Exclusions</h2>
                  <ul className="mt-3 space-y-2">
                    {p.exclusions.map((e) => (
                      <li key={e.id} className="flex items-start gap-2 text-navy-600">
                        <X className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" /> {e.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {p.faqs.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold text-navy-900">FAQs</h2>
              <div className="mt-4 divide-y divide-navy-100 rounded-2xl border border-navy-100">
                {p.faqs.map((f) => (
                  <details key={f.id} className="px-5 py-4">
                    <summary className="cursor-pointer list-none font-medium text-navy-900">{f.question}</summary>
                    <p className="mt-2 text-navy-600">{f.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-lg">
            {price ? (
              <>
                <span className="text-sm text-navy-500">{p.priceLabel || "Starting from"}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-navy-900">{formatINR(price)}</span>
                  {hasDiscount && <span className="text-navy-400 line-through">{formatINR(p.startingPrice)}</span>}
                </div>
                <p className="mt-1 text-xs text-navy-400">per person · taxes may apply</p>
              </>
            ) : (
              <span className="text-lg font-semibold text-brand-700">Custom pricing</span>
            )}
            <GetQuoteButton variant="primary" size="lg" className="mt-5 w-full" prefill={quotePrefill} destinations={quoteDestinations}>
              Get Free Quotes
            </GetQuoteButton>
            <GetQuoteButton variant="outline" size="md" className="mt-3 w-full" prefill={quotePrefill} destinations={quoteDestinations}>
              Plan a similar trip
            </GetQuoteButton>
            <p className="mt-4 text-center text-xs text-navy-400">
              This is not a checkout. Request a free, no-obligation quote and an expert will tailor it to you.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
