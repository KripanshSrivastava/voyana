import { Plane, ShieldCheck, Globe2, Clock } from "lucide-react";
import { signupStats, signupTrustPoints } from "@/lib/config/signupStats";

const TRUST_ICONS = [Globe2, ShieldCheck, Globe2, ShieldCheck];

export function SignupShowcase({ brandName, logoUrl }: { brandName: string; logoUrl?: string | null }) {
  return (
    <div
      className="relative hidden h-full flex-col justify-between overflow-hidden p-10 lg:flex lg:p-12"
      style={{ background: "var(--mb-surface)", color: "var(--mb-ink)" }}
    >
      {/* Warm terracotta glow instead of the old cool blue/orange gradient. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, oklch(0.65 0.13 40 / 0.15), transparent 55%), radial-gradient(circle at 80% 75%, oklch(0.75 0.09 32 / 0.12), transparent 50%)",
        }}
      />

      <div className="flex items-center gap-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={brandName} className="h-8 w-auto" />
        ) : (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "var(--mb-accent)", color: "#fff" }}
          >
            <Plane className="h-5 w-5 -rotate-45" />
          </span>
        )}
        <span className="text-lg font-bold" style={{ color: "var(--mb-ink)" }}>{brandName}</span>
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl" style={{ color: "var(--mb-ink)" }}>
          Grow Your Travel Business With Better Leads
        </h1>
        <p className="mt-4 max-w-md" style={{ color: "var(--mb-muted)" }}>
          Connect with qualified travel enquiries and grow your business with {brandName}.
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-6">
          {signupStats.map((s) => (
            <div key={s.label}>
              <dt className="sr-only">{s.label}</dt>
              <dd className="font-display text-2xl font-bold sm:text-3xl" style={{ color: "var(--mb-ink)" }}>{s.value}</dd>
              <div className="mt-0.5 text-sm" style={{ color: "var(--mb-muted-2)" }}>{s.label}</div>
            </div>
          ))}
        </dl>
      </div>

      <ul className="space-y-3">
        {signupTrustPoints.map((point, i) => {
          const Icon = TRUST_ICONS[i] ?? Clock;
          return (
            <li key={point} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--mb-muted)" }}>
              <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--mb-accent)" }} />
              {point}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
