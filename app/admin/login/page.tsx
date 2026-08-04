import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPublicSettings } from "@/lib/settings";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Admin Sign in", robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [session, settings] = await Promise.all([getSession(), getPublicSettings()]);
  if (session?.role === "ADMIN") redirect("/admin/dashboard");
  const { error } = await searchParams;
  return (
    <div>
      {error === "wrong-role" && (
        <p className="mx-auto mb-4 max-w-sm rounded-lg bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-800">
          This browser is signed in with a different account. Sign in as admin below.
        </p>
      )}
      <LoginForm
        role="ADMIN"
        title="Admin sign in"
        subtitle="Operations, leads and content management."
        redirectTo="/admin/dashboard"
        brandName={settings.brandName}
        logoUrl={settings.logoUrl}
      />
    </div>
  );
}
