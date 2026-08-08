import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getPublicSettings } from "@/lib/settings";
import { inspectResetToken, type PasswordResetResult } from "@/lib/auth/password-reset";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Set a new password", robots: { index: false } };

/**
 * Rendered at /agent/reset-password?token=<raw-token>. Server-inspects the
 * token BEFORE showing the form so we can render a friendly "link expired"
 * state without wasting a click. The token is never rendered back into the
 * page — the form re-sends it in the POST body only.
 */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token }, settings] = await Promise.all([searchParams, getPublicSettings()]);
  const rawToken = typeof token === "string" ? token : "";
  const inspection: PasswordResetResult = rawToken
    ? await inspectResetToken(rawToken)
    : { ok: false, reason: "INVALID" };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        {inspection.ok ? (
          <ResetPasswordForm token={rawToken} email={inspection.email} brandName={settings.brandName} logoUrl={settings.logoUrl} />
        ) : (
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">
              {inspection.reason === "EXPIRED"
                ? "This link has expired"
                : inspection.reason === "USED"
                  ? "This link has already been used"
                  : "This link is invalid"}
            </h1>
            <p className="mt-2 text-sm text-navy-500">
              Reset links expire 30 minutes after they&apos;re issued and can only be used once. Request a fresh link and try again.
            </p>
            <Link
              href="/agent/forgot-password"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-brand-600 px-6 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Request a new link
            </Link>
            <div className="mt-4">
              <Link href="/agent/login" className="text-sm text-navy-500 hover:text-navy-800">
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
