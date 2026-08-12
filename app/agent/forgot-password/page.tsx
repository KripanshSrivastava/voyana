import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPublicSettings } from "@/lib/settings";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Reset your password", robots: { index: false } };

export default async function ForgotPasswordPage() {
  const [session, settings] = await Promise.all([getSession(), getPublicSettings()]);
  if (session?.role === "AGENT") redirect("/agent/dashboard");
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "var(--mb-bg)", color: "var(--mb-ink)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-lg"
        style={{ background: "#fff", border: "1px solid var(--mb-line)" }}
      >
        <ForgotPasswordForm brandName={settings.brandName} logoUrl={settings.logoUrl} />
      </div>
    </div>
  );
}
