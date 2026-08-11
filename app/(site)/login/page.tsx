import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPublicSettings } from "@/lib/settings";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Agent Sign in" };

/**
 * Public /login is the AGENT sign-in surface. Admins have their own separate
 * URL (/admin/login) — they are not exposed here so vendor traffic never
 * lands on an admin-branded page by accident. Existing agent sessions are
 * redirected straight to their dashboard.
 */
export default async function LoginPage() {
  const [session, settings] = await Promise.all([getSession(), getPublicSettings()]);
  if (session?.role === "AGENT") redirect("/agent/dashboard");
  if (session?.role === "ADMIN") redirect("/admin/dashboard");
  return (
    <LoginForm
      role="AGENT"
      title="Agent sign in"
      subtitle="Access your lead marketplace, wallet and support tickets."
      redirectTo="/agent/dashboard"
      brandName={settings.brandName}
      logoUrl={settings.logoUrl}
    />
  );
}
