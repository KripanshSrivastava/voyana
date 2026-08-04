import { Plane, ShieldCheck, Globe2, Clock } from "lucide-react";
import { signupStats, signupTrustPoints } from "@/lib/config/signupStats";

const TRUST_ICONS = [Globe2, ShieldCheck, Globe2, ShieldCheck];

export function SignupShowcase({ brandName, logoUrl }: { brandName: string; logoUrl?: string | null }) {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-navy-950 p-10 text-white lg:flex lg:p-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.18),transparent_55%),radial-gradient(circle_at_80%_75%,rgba(59,130,246,0.15),transparent_50%)]" />

      <div className="flex items-center gap-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={brandName} className="h-8 w-auto" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <Plane className="h-5 w-5 -rotate-45 text-brand-300" />
          </span>
        )}
        <span className="text-lg font-bold">{brandName}</span>
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
          Grow Your Travel Business With Better Leads
        </h1>
        <p className="mt-4 max-w-md text-navy-200">
          Connect with qualified travel enquiries and grow your business with {brandName}.
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-6">
          {signupStats.map((s) => (
            <div key={s.label}>
              <dt className="sr-only">{s.label}</dt>
              <dd className="font-display text-2xl font-bold text-white sm:text-3xl">{s.value}</dd>
              <div className="mt-0.5 text-sm text-navy-300">{s.label}</div>
            </div>
          ))}
        </dl>
      </div>

      <ul className="space-y-3">
        {signupTrustPoints.map((point, i) => {
          const Icon = TRUST_ICONS[i] ?? Clock;
          return (
            <li key={point} className="flex items-center gap-2.5 text-sm text-navy-200">
              <Icon className="h-4 w-4 shrink-0 text-brand-300" />
              {point}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
