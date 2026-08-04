import { requireAgent } from "@/lib/guards";
import { PageHeader } from "@/components/admin/ui";
import { ChangePasswordForm } from "@/components/agent/ChangePasswordForm";
import { SecurityToggle } from "@/components/agent/SecurityToggle";

export default async function SettingsPage() {
  const { session } = await requireAgent();
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account security." />
      <ChangePasswordForm />
      <SecurityToggle initial={session.twoFactorEnabled} />
    </div>
  );
}
