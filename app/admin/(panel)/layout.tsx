import { requireAdmin } from "@/lib/guards";
import { getPublicSettings } from "@/lib/settings";
import { AdminShell } from "@/components/admin/AdminShell";
import { Toaster } from "@/components/ui/Toast";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const [session, settings] = await Promise.all([requireAdmin(), getPublicSettings()]);
  return (
    // Keyed by user id — see the matching comment in app/agent/(portal)/layout.tsx.
    <AdminShell key={session.uid} name={session.name} adminRole={session.adminRole ?? null} brandName={settings.brandName} logoUrl={settings.logoUrl}>
      {children}
      <Toaster />
    </AdminShell>
  );
}
