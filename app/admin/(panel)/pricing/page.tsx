import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { LeadCreditPackagesManager } from "@/components/admin/LeadCreditPackagesManager";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/utils";

export default async function AdminPricingPage() {
  const session = await requireAdmin();
  // Only the Main Admin (Super Admin) manages Lead Credit pricing — shown
  // in-page, never a thrown error or a silent redirect.
  if (session.adminRole && session.adminRole !== "SUPER_ADMIN") {
    return <AccessRestricted area="Pricing (Main Admin only)" />;
  }

  const [packages, sold, used, balances, revenue] = await Promise.all([
    prisma.leadCreditPackage.findMany({ orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.leadCreditLedger.aggregate({ _sum: { creditAmount: true }, where: { type: "CREDIT_PURCHASE" } }),
    prisma.leadCreditLedger.aggregate({ _sum: { creditAmount: true }, where: { type: "LEAD_PURCHASE" } }),
    prisma.agentCreditBalance.aggregate({ _sum: { balance: true } }),
    prisma.leadCreditPurchase.aggregate({ _sum: { priceInr: true }, where: { status: "PAID" } }),
  ]);

  const usedCredits = Math.abs(used._sum.creditAmount ?? 0);

  return (
    <div>
      <PageHeader title="Pricing" subtitle="Lead Credit Packages for vendor purchases." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Lead Credits Sold" value={sold._sum.creditAmount ?? 0} accent="brand" />
        <StatCard label="Credits Used" value={usedCredits} accent="emerald" />
        <StatCard label="Credits Remaining" value={balances._sum.balance ?? 0} accent="navy" />
        <StatCard label="Revenue from Packages" value={formatINR(revenue._sum.priceInr ?? 0)} accent="sun" />
      </div>

      {packages.length === 0 ? (
        <EmptyState title="No Lead Credit packages" description="Run the seed or migration to create the two MVP packages." />
      ) : (
        <LeadCreditPackagesManager packages={packages} />
      )}
    </div>
  );
}
