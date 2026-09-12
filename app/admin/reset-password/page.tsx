import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getPublicSettings } from "@/lib/settings";
import { inspectResetToken, type PasswordResetResult } from "@/lib/auth/password-reset";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Set a new password", robots: { index: false } };

/**
 * Rendered at /admin/reset-password?token=<raw-token>. Same token flow as
 * /agent/reset-password (password-reset.ts is role-agnostic — it looks up
 * by email only) with admin-appropriate copy/links.
 */
export default async function AdminResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token }, settings] = await Promise.all([searchParams, getPublicSettings()]);
  const rawToken = typeof token === "string" ? token : "";
  const inspection: PasswordResetResult = rawToken
    ? await inspectResetToken(rawToken)
    : { ok: false, reason: "INVALID" };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "var(--mb-bg)", color: "var(--mb-ink)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-lg"
        style={{ background: "#fff", border: "1px solid var(--mb-line)" }}
      >
        {inspection.ok ? (
          <ResetPasswordForm
            token={rawToken}
            email={inspection.email}
            brandName={settings.brandName}
            logoUrl={settings.logoUrl}
            loginHref="/admin/login"
          />
        ) : (
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold" style={{ color: "var(--mb-ink)" }}>
              {inspection.reason === "EXPIRED"
                ? "This link has expired"
                : inspection.reason === "USED"
                  ? "This link has already been used"
                  : "This link is invalid"}
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--mb-muted)" }}>
              Reset links expire 60 minutes after they&apos;re issued and can only be used once. Request a fresh link and try again.
            </p>
            <Link
              href="/admin/forgot-password"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold"
              style={{ background: "var(--mb-accent)", color: "#fff" }}
            >
              Request a new link
            </Link>
            <div className="mt-4">
              <Link href="/admin/login" className="text-sm hover:underline" style={{ color: "var(--mb-muted)" }}>
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
