import type { Metadata } from "next";
import { getPublishedPackages } from "@/lib/cms/queries";
import { PackageCard } from "@/components/site/ContentCards";
import { GetQuoteButton } from "@/components/site/GetQuoteButton";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = {
  title: "Tours",
  description: "Guided tours and experiences. Get personalized quotes from travel experts.",
};

export const revalidate = 300;

export default async function ToursPage() {
  const tours = await getPublishedPackages({ kind: "TOUR" });
  const destinationNames = [...new Set(tours.map((p) => p.destination?.name).filter((n): n is string => Boolean(n)))];
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 max-w-2xl">
        <h1 className="font-display text-4xl font-bold text-navy-900">Tours &amp; experiences</h1>
        <p className="mt-3 text-lg text-navy-500">
          Guided journeys worth the trip. Request a free quote to plan the details around you.
        </p>
      </header>
      {tours.length === 0 ? (
        <EmptyState
          title="No tours published yet"
          description="Tell us what you're planning and we'll help you design the right experience."
          action={<GetQuoteButton variant="primary" destinations={destinationNames}>Get Free Quotes</GetQuoteButton>}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((p) => (
            <PackageCard key={p.id} p={p} basePath="/tours" />
          ))}
        </div>
      )}
    </div>
  );
}
