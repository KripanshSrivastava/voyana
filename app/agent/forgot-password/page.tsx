import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPublicSettings } from "@/lib/settings";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Reset your password", robots: { index: false } };

export default async function ForgotPasswordPage() {
  const [session, settings] = await Promise.all([getSession(), getPublicSettings()]);
  if (session?.role === "AGENT") redirect("/agent/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        <ForgotPasswordForm brandName={settings.brandName} logoUrl={settings.logoUrl} />
      </div>
    </div>
  );
}
