import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Admin Sign in", robots: { index: false } };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.role === "ADMIN") redirect("/admin/dashboard");
  return (
    <LoginForm
      role="ADMIN"
      title="Admin sign in"
      subtitle="Operations, leads and content management."
      redirectTo="/admin/dashboard"
    />
  );
}
