import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/ui";

export const metadata = { title: "Request Received", robots: { index: false } };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-9 w-9" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-bold text-navy-900">
        Your travel request has been received.
      </h1>
      <p className="mt-3 text-navy-500">
        Travel experts will review your requirements and contact you with personalized options.
      </p>
      {code && (
        <div className="mt-6 rounded-xl border border-navy-100 bg-navy-50 px-5 py-3">
          <span className="text-sm text-navy-500">Your request ID</span>
          <div className="text-lg font-bold tracking-wide text-navy-900">{code}</div>
        </div>
      )}
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/" variant="outline">
          Back to home
        </ButtonLink>
        <ButtonLink href="/destinations" variant="brand">
          Explore destinations
        </ButtonLink>
      </div>
      <p className="mt-6 text-xs text-navy-400">
        Keep your request ID handy for reference. Need help now?{" "}
        <Link href="/contact" className="text-brand-700 underline">
          Contact us
        </Link>
        .
      </p>
    </div>
  );
}
