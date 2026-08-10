import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getFlags } from "@/lib/flags";
import { getPublicSettings } from "@/lib/settings";
import { AgentShell } from "@/components/agent/AgentShell";
import { Toaster } from "@/components/ui/Toast";

export const metadata = { title: "Agent Portal", robots: { index: false } };

export default async function AgentPortalLayout({ children }: { children: React.ReactNode }) {
  const { session, agent } = await requireAgent();
  const [unread, flags, settings] = await Promise.all([
    prisma.notification.count({ where: { userId: session.uid, read: false } }),
    getFlags(),
    getPublicSettings(),
  ]);
  return (
    <AgentShell
      // Keyed by the authenticated session's user id: if another tab of this
      // browser switches accounts (same shared cookies), a router.refresh()
      // here (see AuthSync) re-renders this layout for the new session, and
      // the key change forces React to fully remount the shell and every
      // child below it — including client forms like PreferencesForm that
      // hold their own local state — instead of leaving stale data from the
      // previous account sitting in memory.
      key={session.uid}
      name={session.name}
      company={agent.companyName}
      credits={agent.creditBalance?.balance ?? 0}
      status={agent.status}
      verified={agent.verificationStatus === "VERIFIED"}
      unread={unread}
      adsEnabled={flags.vendorAdsEnabled}
      submissionsEnabled={flags.packageMarketplaceEnabled}
      brandName={settings.brandName}
      logoUrl={settings.logoUrl}
    >
      {children}
      <Toaster />
    </AgentShell>
  );
}
