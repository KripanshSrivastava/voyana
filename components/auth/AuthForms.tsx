"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plane } from "lucide-react";
import { Button, Input, Field } from "@/components/ui";
import { broadcastAuthChange } from "@/lib/auth/broadcast";

function Shell({ title, subtitle, brandName = "Moksh Booking", logoUrl, children }: { title: string; subtitle?: string; brandName?: string; logoUrl?: string | null; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} className="h-9 w-auto" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Plane className="h-5 w-5 -rotate-45 text-brand-300" />
            </span>
          )}
          <span className="text-2xl font-bold text-white">{brandName}</span>
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function LoginForm({
  role,
  title,
  subtitle,
  redirectTo,
  brandName,
  logoUrl,
}: {
  role: "ADMIN" | "AGENT";
  title: string;
  subtitle?: string;
  redirectTo: string;
  brandName?: string;
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Login failed");
      broadcastAuthChange();
      if (json.data?.requiresEmailVerification) router.push("/agent/verify-email");
      else if (json.data?.requiresTwoFactor) router.push("/agent/verify-2fa");
      else router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <Shell title={title} subtitle={subtitle} brandName={brandName} logoUrl={logoUrl}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>
      {role === "AGENT" && (
        <p className="mt-5 text-center text-sm text-navy-500">
          New partner?{" "}
          <Link href="/agent/signup" className="font-semibold text-brand-700">Create an account</Link>
        </p>
      )}
    </Shell>
  );
}

// Agent signup now lives at components/agent/signup/AgentSignupForm.tsx (a
// premium, purpose-built two-column experience) — this file keeps only the
// shared login Shell/LoginForm used by both the admin and agent login pages.
