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
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
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
