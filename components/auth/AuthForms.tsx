"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plane, KeyRound } from "lucide-react";
import { Button, Input, Field } from "@/components/ui";
import { broadcastAuthChange } from "@/lib/auth/broadcast";
import { createClient } from "@/lib/supabase/client";
import { Turnstile } from "@/components/auth/Turnstile";

function Shell({ title, subtitle, brandName = "Moksh Booking", logoUrl, children }: { title: string; subtitle?: string; brandName?: string; logoUrl?: string | null; children: React.ReactNode }) {
  return (
    // Cream ground + terracotta accent — matches the landing page palette.
    // Colors come from :root design tokens (see app/globals.css) so any theme
    // change to the landing reflows here without editing this shell.
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "var(--mb-bg)", color: "var(--mb-ink)" }}
    >
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2" style={{ color: "var(--mb-ink)" }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} className="h-9 w-auto" />
          ) : (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "var(--mb-accent)", color: "#fff" }}
            >
              <Plane className="h-5 w-5 -rotate-45" />
            </span>
          )}
          <span className="text-2xl font-bold" style={{ color: "var(--mb-ink)" }}>{brandName}</span>
        </Link>
        <div
          className="rounded-2xl p-8 shadow-lg"
          style={{ background: "#fff", border: "1px solid var(--mb-line)" }}
        >
          <h1 className="text-2xl font-bold" style={{ color: "var(--mb-ink)" }}>{title}</h1>
          {subtitle && <p className="mt-1 text-sm" style={{ color: "var(--mb-muted)" }}>{subtitle}</p>}
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  // Admin-only captcha: render nothing (and require nothing) if the site key
  // isn't configured, so an admin panel without Turnstile set up still logs
  // in normally rather than becoming unusable.
  const captchaRequired = role === "ADMIN" && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (captchaRequired && !captchaToken) {
      setError("Please complete the captcha.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, captchaToken }),
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

  // Admin-only alternative to password login. Supabase's WebAuthn ceremony
  // runs entirely client-side and sets the session cookie directly — if the
  // signed-in account turns out not to be an ADMIN, the /admin panel layout's
  // requireAdmin() guard bounces to /admin/login?error=wrong-role, the same
  // safety net that already covers a stale agent session in this browser.
  async function signInWithPasskey() {
    setError(null);
    setPasskeyLoading(true);
    try {
      const supabase = createClient();
      const { error: pkError } = await supabase.auth.signInWithPasskey();
      if (pkError) throw pkError;
      broadcastAuthChange();
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey sign-in failed.");
      setPasskeyLoading(false);
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
        {role === "AGENT" && (
          <div className="-mt-2 text-right">
            <Link
              href="/agent/forgot-password"
              className="text-sm hover:underline"
              style={{ color: "var(--mb-accent)" }}
            >
              Forgot password?
            </Link>
          </div>
        )}
        {role === "ADMIN" && captchaRequired && (
          <Turnstile onVerify={setCaptchaToken} />
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || (captchaRequired && !captchaToken)}
          style={{ background: "var(--mb-accent)", color: "#fff" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>
      {role === "ADMIN" && (
        <>
          <div className="my-4 flex items-center gap-3 text-xs uppercase" style={{ color: "var(--mb-muted)" }}>
            <div className="h-px flex-1" style={{ background: "var(--mb-line)" }} />
            or
            <div className="h-px flex-1" style={{ background: "var(--mb-line)" }} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={passkeyLoading}
            onClick={signInWithPasskey}
          >
            {passkeyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <KeyRound className="h-4 w-4" /> Sign in with a passkey
              </>
            )}
          </Button>
        </>
      )}
      {role === "AGENT" && (
        <p className="mt-5 text-center text-sm" style={{ color: "var(--mb-muted)" }}>
          New partner?{" "}
          <Link href="/agent/signup" className="font-semibold" style={{ color: "var(--mb-accent)" }}>Create an account</Link>
        </p>
      )}
    </Shell>
  );
}

// Agent signup now lives at components/agent/signup/AgentSignupForm.tsx (a
// premium, purpose-built two-column experience) — this file keeps only the
// shared login Shell/LoginForm used by both the admin and agent login pages.
