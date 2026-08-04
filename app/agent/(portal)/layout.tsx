import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getFlags } from "@/lib/flags";
import { AgentShell } from "@/components/agent/AgentShell";

export const metadata = { title: "Agent Portal", robots: { index: false } };

export default async function AgentPortalLayout({ children }: { children: React.ReactNode }) {
  const { session, agent } = await requireAgent();
  const [unread, flags] = await Promise.all([
    prisma.notification.count({ where: { userId: session.uid, read: false } }),
    getFlags(),
  ]);
  return (
    <AgentShell
      name={session.name}
      company={agent.companyName}
      credits={agent.creditBalance?.balance ?? 0}
      status={agent.status}
      verified={agent.verificationStatus === "VERIFIED"}
      unread={unread}
      adsEnabled={flags.vendorAdsEnabled}
      submissionsEnabled={flags.packageMarketplaceEnabled}
    >
      {children}
    </AgentShell>
  );
}
