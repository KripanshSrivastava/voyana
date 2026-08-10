import type { Metadata } from "next";
import { ClipboardList, Users, MessagesSquare, PlaneTakeoff } from "lucide-react";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "How It Works" };
export const revalidate = 3600;

const STEPS = [
  { icon: ClipboardList, title: "Share your trip", body: "Tell us your destination, dates, travelers and budget in a couple of minutes." },
  { icon: Users, title: "We match experts", body: "Your request is reviewed and shared with a small number of vetted travel professionals." },
  { icon: MessagesSquare, title: "Get personalized options", body: "Experts reach out with tailored itineraries and pricing. Compare freely." },
  { icon: PlaneTakeoff, title: "Book with confidence", body: "Choose the option that fits you best and travel your way." },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <header className="text-center">
        <h1 className="font-display text-4xl font-bold text-navy-900">How Moksh Booking works</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-navy-500">
          We&apos;re not a booking engine — we connect travelers with trusted experts who plan trips
          around what you actually want.
        </p>
      </header>

      <div className="mt-12 space-y-6">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex gap-5 rounded-2xl border border-navy-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <s.icon className="h-6 w-6" />
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">Step {i + 1}</span>
              <h3 className="text-lg font-semibold text-navy-900">{s.title}</h3>
              <p className="mt-1 text-navy-600">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <ButtonLink href="/request-quote" variant="primary" size="lg">Get Free Quotes</ButtonLink>
      </div>
    </div>
  );
}
