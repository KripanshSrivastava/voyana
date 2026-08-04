import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resendCooldownSeconds } from "@/lib/auth/verification";
import { OtpVerifyForm } from "@/components/auth/OtpVerifyForm";

export const metadata = { title: "Verify your email", robots: { index: false } };

export default async function VerifyEmailPage() {
  const session = await getSession();
  if (!session || session.role !== "AGENT") redirect("/agent/login");
  if (session.emailVerified) redirect("/agent/dashboard");

  const cooldown = await resendCooldownSeconds(session.uid, "EMAIL_VERIFY");

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        <OtpVerifyForm
          title="Verify your email"
          subtitle="We sent a 6-digit code"
          email={session.email}
          verifyUrl="/api/auth/verify-email"
          resendUrl="/api/auth/resend-verification"
          redirectTo="/agent/dashboard"
          initialCooldown={cooldown}
          resendLabel="Resend verification email"
        />
      </div>
    </div>
  );
}
