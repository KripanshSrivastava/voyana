import type { Metadata } from "next";
import { getPublishedDestinations } from "@/lib/cms/queries";
import { DestinationCard } from "@/components/site/ContentCards";
import { GetQuoteButton } from "@/components/site/GetQuoteButton";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = {
  title: "Destinations",
  description: "Explore travel destinations and get personalized quotes from experts.",
};

export const revalidate = 300;

export default async function DestinationsPage() {
  const destinations = await getPublishedDestinations({ featuredFirst: true });
  // Already loaded for the grid — free autocomplete data for the modal, no extra query.
  const destinationNames = destinations.map((d) => d.name);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 max-w-2xl">
        <h1 className="font-display text-4xl font-bold text-navy-900">Destinations</h1>
        <p className="mt-3 text-lg text-navy-500">
          Find your next escape and tell us what you&apos;re planning — we&apos;ll connect you with experts.
        </p>
      </header>

      {destinations.length === 0 ? (
        <EmptyState
          title="Destinations are being updated"
          description="Tell us where you'd like to go and we'll help you plan the right trip."
          action={<GetQuoteButton variant="primary" destinations={destinationNames}>Get Free Quotes</GetQuoteButton>}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((d) => (
            <DestinationCard key={d.id} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}
