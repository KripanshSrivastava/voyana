import type { Metadata } from "next";
import { QuoteForm } from "@/components/lead-form/QuoteForm";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Get Free Travel Quotes",
  description: "Share your trip requirements and get personalized options from vetted travel experts.",
};

export default async function RequestQuotePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-8">
      <div>
        <h1 className="font-display text-4xl font-bold text-navy-900">
          Plan your trip, your way
        </h1>
        <p className="mt-4 text-lg text-navy-500">
          Answer a few quick questions and travel experts will reach out with personalized options.
          It&apos;s free and there&apos;s no obligation.
        </p>
        <ul className="mt-8 space-y-4">
          {[
            "100% free — no booking fees to request quotes",
            "Personalized options matched to your budget",
            "Your details are only shared with vetted experts",
            "Compare freely before you decide",
          ].map((t) => (
            <li key={t} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <span className="text-navy-700">{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <QuoteForm
        prefill={{
          destination: str(sp.destination),
          tripType: str(sp.tripType),
          destinationId: str(sp.destinationId),
          packageId: str(sp.packageId),
          packageName: str(sp.package),
        }}
      />
    </div>
  );
}
