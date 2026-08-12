import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPendingTwoFactor, resendCooldownSeconds } from "@/lib/auth/verification";
import { OtpVerifyForm } from "@/components/auth/OtpVerifyForm";

export const metadata = { title: "Verify sign-in", robots: { index: false } };

export default async function VerifyTwoFactorPage() {
  const session = await getSession();
  if (!session || session.role !== "AGENT") redirect("/agent/login");
  if (!session.twoFactorEnabled || !(await hasPendingTwoFactor(session.uid))) redirect("/agent/dashboard");

  const cooldown = await resendCooldownSeconds(session.uid, "TWO_FA");

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "var(--mb-bg)", color: "var(--mb-ink)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-lg"
        style={{ background: "#fff", border: "1px solid var(--mb-line)" }}
      >
        <OtpVerifyForm
          title="Enter your security code"
          subtitle="We sent a 6-digit code"
          email={session.email}
          verifyUrl="/api/auth/verify-2fa"
          resendUrl="/api/auth/resend-2fa"
          redirectTo="/agent/dashboard"
          initialCooldown={cooldown}
          resendLabel="Resend security code"
        />
      </div>
    </div>
  );
}
