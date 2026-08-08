"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, Eye, EyeOff, ShieldCheck, Plane } from "lucide-react";
import { Button, Input, Field } from "@/components/ui";
import { PasswordStrength, passwordMeetsPolicy } from "@/components/agent/signup/PasswordStrength";

/**
 * Reset-password form shown after a valid token has been server-verified in
 * the parent page. The raw token is passed here as a prop, POSTed back to
 * the API, and never displayed. Once the reset succeeds, the user is sent
 * to the login page — session state is intentionally NOT auto-established
 * (safer to require an explicit sign-in with the new password).
 */
export function ResetPasswordForm({
  token,
  email,
  brandName = "Moksh Booking",
  logoUrl,
}: {
  token: string;
  email: string;
  brandName?: string;
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordMeetsPolicy(password)) {
      setError("Password doesn't meet the requirements below.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password, confirmPassword: confirm }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not reset password.");
      setDone(true);
      setTimeout(() => router.push("/agent/login"), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Check className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Password updated</h1>
        <p className="mt-2 text-sm text-navy-500">Redirecting you to sign in…</p>
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
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Set a new password</h1>
        <p className="mt-1.5 text-sm text-navy-500">
          Resetting the password for <strong className="text-navy-800">{email}</strong>.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="New password">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              autoFocus
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-navy-400 hover:text-navy-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </Field>

        <Field label="Confirm new password">
          <Input
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}

        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
        </Button>
      </form>
    </div>
  );
}
