import type { Metadata } from "next";
import { getPublishedPackages } from "@/lib/cms/queries";
import { PackageCard } from "@/components/site/ContentCards";
import { EmptyState, ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Travel Packages",
  description: "Browse curated travel packages and get personalized quotes from experts.",
};

export default async function PackagesPage() {
  const packages = await getPublishedPackages({ kind: "PACKAGE" });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 max-w-2xl">
        <h1 className="font-display text-4xl font-bold text-navy-900">Travel packages</h1>
        <p className="mt-3 text-lg text-navy-500">
          Ready-made itineraries you can tailor into your perfect trip. Every package is a starting point — get a free quote to customize.
        </p>
      </header>
      {packages.length === 0 ? (
        <EmptyState
          title="No packages published yet"
          description="Tell us what you're planning and we'll help you create the right trip."
          action={<ButtonLink href="/request-quote" variant="primary">Get Free Quotes</ButtonLink>}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <PackageCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
