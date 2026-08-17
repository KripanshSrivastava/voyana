import { requireAdmin } from "@/lib/guards";
import { PageHeader } from "@/components/admin/ui";
import { PasskeyManager } from "@/components/admin/PasskeyManager";

export const metadata = { title: "Security", robots: { index: false } };

export default async function AdminSecurityPage() {
  // Personal account settings for whoever is signed in — no area gating,
  // every admin role manages their own passkeys.
  await requireAdmin();
  return (
    <div>
      <PageHeader title="Security" subtitle="Manage how you sign in to the admin panel." />
      <div className="mt-6 max-w-xl">
        <PasskeyManager />
      </div>
    </div>
  );
}
