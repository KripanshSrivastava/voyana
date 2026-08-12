import { requireAgent } from "@/lib/guards";
import { PageHeader } from "@/components/admin/ui";
import { ChangePasswordForm } from "@/components/agent/ChangePasswordForm";
import { SecurityToggle } from "@/components/agent/SecurityToggle";

/**
 * Security-specific controls (2FA + password) live on their own route so the
 * sidebar can distinguish "Security" from generic "Settings". /agent/settings
 * still redirects here for backward compatibility with older bookmarks.
 */
export default async function AgentSecurityPage() {
  const { session } = await requireAgent();
  return (
    <div className="space-y-6">
      <PageHeader title="Security" subtitle="Change your password and manage two-factor authentication." />
      <ChangePasswordForm />
      <SecurityToggle initial={session.twoFactorEnabled} />
    </div>
  );
}
