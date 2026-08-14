import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, Check, MapPin } from "lucide-react";
import { getDestinationBySlug } from "@/lib/cms/queries";
import { getPublishedPackages } from "@/lib/cms/queries";
import { PackageCard } from "@/components/site/ContentCards";
import { GetQuoteButton } from "@/components/site/GetQuoteButton";
import { EmptyState } from "@/components/ui";
import { parseJson } from "@/lib/utils";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // Shares the request-scoped cache with the page body — one DB read total.
  const d = await getDestinationBySlug(slug);
  if (!d) return { title: "Destination not found" };
  return {
    title: d.seoTitle || d.name,
    description: d.seoDescription || d.shortDescription || undefined,
    alternates: { canonical: `/destinations/${d.slug}` },
    robots: d.noindex ? { index: false } : undefined,
    openGraph: { images: d.heroImage ? [d.heroImage] : undefined },
  };
}

export default async function DestinationDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getDestinationBySlug(slug);
  if (!d) notFound();

  const highlights = parseJson<string[]>(d.highlights, []);
  const tripTypes = parseJson<string[]>(d.tripTypes, []);
  const faqs = parseJson<{ question: string; answer: string }[]>(d.faqs, []);
  const tours = await getPublishedPackages({ kind: "TOUR", destinationId: d.id });
  const packages = d.packages.filter((p) => p.kind === "PACKAGE");

  const quotePrefill = { destination: d.name, destinationId: d.id };
  const quoteDestinations = [d.name];

  return (
    <>
      {/* Hero */}
      <section className="relative h-[42vh] min-h-[320px] w-full overflow-hidden">
        {d.heroImage ? (
          <Image src={d.heroImage} alt={d.name} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-navy-900 to-brand-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm text-white backdrop-blur">
            <MapPin className="h-4 w-4" /> Destination
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold text-white sm:text-5xl">{d.name}</h1>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.6fr_1fr] lg:px-8">
        <div>
          {d.longDescription ? (
            <p className="whitespace-pre-line text-lg leading-relaxed text-navy-700">{d.longDescription}</p>
          ) : (
            d.shortDescription && <p className="text-lg text-navy-700">{d.shortDescription}</p>
          )}

          {highlights.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-navy-900">Highlights</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-navy-700">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {faqs.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold text-navy-900">Frequently asked questions</h2>
              <div className="mt-4 divide-y divide-navy-100 rounded-2xl border border-navy-100">
                {faqs.map((f, i) => (
                  <details key={i} className="group px-5 py-4">
                    <summary className="cursor-pointer list-none font-medium text-navy-900">{f.question}</summary>
                    <p className="mt-2 text-navy-600">{f.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            {d.startingPrice && (
              <p className="text-sm text-navy-500">
                Trips from <span className="text-2xl font-bold text-navy-900">₹{d.startingPrice.toLocaleString("en-IN")}</span>
              </p>
            )}
            {d.bestTime && (
              <p className="mt-3 flex items-center gap-2 text-sm text-navy-600">
                <Calendar className="h-4 w-4 text-brand-600" /> Best time: {d.bestTime}
              </p>
            )}
            {tripTypes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {tripTypes.map((t) => (
                  <span key={t} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">{t}</span>
                ))}
              </div>
            )}
            <GetQuoteButton variant="primary" size="lg" className="mt-6 w-full" prefill={quotePrefill} destinations={quoteDestinations}>
              Get Free Quotes
            </GetQuoteButton>
          </div>
        </aside>
      </div>

      {/* Packages */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold text-navy-900">Packages in {d.name}</h2>
        <div className="mt-6">
          {packages.length === 0 ? (
            <EmptyState
              title="Packages are being updated"
              description={`Tell us what you're planning for ${d.name} and we'll help you create the right trip.`}
              action={<GetQuoteButton variant="primary" prefill={quotePrefill} destinations={quoteDestinations}>Get Free Quotes</GetQuoteButton>}
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((p) => (
                <PackageCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {tours.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-navy-900">Tours in {d.name}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((p) => (
              <PackageCard key={p.id} p={p} basePath="/tours" />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
