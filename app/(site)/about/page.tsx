import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui";
import { getPublicSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const s = await getPublicSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-navy-900">About {s.brandName}</h1>
      <p className="mt-5 text-lg leading-relaxed text-navy-700">
        {s.brandName} exists to make trip planning simple and personal. Instead of endless searching,
        you tell us what you want — and we connect you with vetted travel experts who craft options
        around your destination, dates and budget.
      </p>
      <p className="mt-4 text-lg leading-relaxed text-navy-700">
        Our promise is simple: <strong>{s.tagline}</strong> No pressure, no spam, and your details are
        only ever shared with a small number of trusted professionals.
      </p>
      <h2 className="mt-10 text-2xl font-bold text-navy-900">Why travelers choose us</h2>
      <ul className="mt-4 space-y-3 text-navy-700">
        <li>• Personalized options matched to your real requirements</li>
        <li>• A curated network of vetted travel experts</li>
        <li>• Total transparency — compare freely before you decide</li>
        <li>• Your privacy respected at every step</li>
      </ul>
      <div className="mt-10">
        <ButtonLink href="/request-quote" variant="primary" size="lg">Start planning</ButtonLink>
      </div>
    </div>
  );
}
