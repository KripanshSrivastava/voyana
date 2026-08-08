"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Check, KeyRound, Plane } from "lucide-react";
import { Button, Input, Field } from "@/components/ui";

/**
 * Password-reset request form.
 * Deliberately shows a generic "check your inbox" message whether or not
 * the email is registered — the backend endpoint (see
 * app/api/auth/forgot-password/route.ts) matches this behaviour so the
 * page cannot be used to enumerate registered addresses.
 */
export function ForgotPasswordForm({ brandName = "Moksh Booking", logoUrl }: { brandName?: string; logoUrl?: string | null }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not send reset email.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Check className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Check your inbox</h1>
        <p className="mt-2 text-sm text-navy-500">
          If an account with <strong className="text-navy-800">{email}</strong> exists, we&apos;ve sent a password reset link. It expires in 30 minutes.
        </p>
        <p className="mt-4 text-xs text-navy-400">
          Didn&apos;t get it? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => { setSent(false); setError(null); }}
            className="font-semibold text-brand-700 hover:underline"
          >
            try a different email
          </button>
          .
        </p>
        <div className="mt-6">
          <Link href="/agent/login" className="text-sm text-navy-500 hover:text-navy-800">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/" className="mb-6 flex items-center justify-center gap-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={brandName} className="h-9 w-auto" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white">
            <Plane className="h-5 w-5 -rotate-45 text-brand-300" />
          </span>
        )}
        <span className="text-2xl font-bold text-navy-900">{brandName}</span>
      </Link>

      <div className="mb-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <KeyRound className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Reset your password</h1>
        <p className="mt-1.5 text-sm text-navy-500">Enter the email you use to sign in and we&apos;ll send you a reset link.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus
          />
        </Field>

        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}

        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/agent/login" className="text-sm text-navy-500 hover:text-navy-800">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
