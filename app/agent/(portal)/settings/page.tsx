import { requireAgent } from "@/lib/guards";
import { PageHeader } from "@/components/admin/ui";
import { ChangePasswordForm } from "@/components/agent/ChangePasswordForm";

export default async function SettingsPage() {
  await requireAgent();
  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account security." />
      <ChangePasswordForm />
    </div>
  );
}
