import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPublicSettings } from "@/lib/settings";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Agent Sign in", robots: { index: false } };

export default async function AgentLoginPage() {
  const [session, settings] = await Promise.all([getSession(), getPublicSettings()]);
  if (session?.role === "AGENT") redirect("/agent/dashboard");
  return (
    <LoginForm
      role="AGENT"
      title="Agent sign in"
      subtitle="Access your lead marketplace and wallet."
      redirectTo="/agent/dashboard"
      brandName={settings.brandName}
      logoUrl={settings.logoUrl}
    />
  );
}
