import Link from "next/link";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { Badge, Card, EmptyState } from "@/components/ui";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { formatINR } from "@/lib/utils";
import { formatDMYTime } from "@/lib/leads/display";
import { CreditOrderActions } from "@/components/admin/CreditOrderActions";

/**
 * Manual credit-purchase orders — Admin review queue.
 *
 * Only surfaces provider="manual" orders. Legacy Razorpay orders keep
 * flowing through their own webhook path and never appear here.
 */
export default async function CreditOrdersPage() {
  const session = await requireAdmin();
  if (session.adminRole && !["SUPER_ADMIN", "FINANCE_ADMIN"].includes(session.adminRole)) {
    return <AccessRestricted area="Credit orders (Finance area only)" />;
  }

  const orders = await prisma.leadCreditPurchase.findMany({
    where: { provider: "manual" },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      agent: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  const pending = orders.filter((o) => o.status === "PENDING_REVIEW");
  const decided = orders.filter((o) => o.status !== "PENDING_REVIEW");

  return (
    <div>
      <PageHeader title="Credit orders" subtitle="Review manual payment submissions from agents. Approving grants credits atomically — replays are safe." />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-500">Awaiting review ({pending.length})</h2>
        {pending.length === 0 ? (
          <Card className="p-6">
            <EmptyState title="No pending payments" description="New agent payment submissions will appear here for review." />
          </Card>
        ) : (
          <div className="grid gap-4">
            {pending.map((o) => <OrderCard key={o.id} order={o} pending />)}
          </div>
        )}
      </section>

      {decided.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-500">Recent decisions</h2>
          <div className="grid gap-3">
            {decided.slice(0, 25).map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
        </section>
      )}
    </div>
  );
}

type OrderRow = Awaited<ReturnType<typeof prisma.leadCreditPurchase.findMany<{
  include: { agent: { include: { user: { select: { name: true; email: true } } } } };
}>>>[number];

function OrderCard({ order, pending }: { order: OrderRow; pending?: boolean }) {
  const badgeClass =
    order.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
    : order.status === "REJECTED" ? "bg-rose-50 text-rose-700 ring-rose-600/20"
    : order.status === "CANCELLED" ? "bg-navy-100 text-navy-700 ring-navy-500/20"
    : "bg-amber-50 text-amber-700 ring-amber-600/20";
  return (
    <Card className="p-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <span className="font-mono text-sm font-semibold text-navy-900">{order.orderId}</span>
            <Badge className={badgeClass}>{order.status.replace("_", " ")}</Badge>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
            <Row label="Agent" value={order.agent.user.name} />
            <Row label="Email" value={order.agent.user.email} />
            <Row label="Plan" value={order.packageName} />
            <Row label="Amount" value={formatINR(order.priceInr)} />
            <Row label="Credits" value={String(order.credits)} />
            <Row label="Reference" value={order.transactionReference || "—"} />
            <Row label="Submitted" value={formatDMYTime(order.createdAt)} />
            {order.reviewedAt && <Row label="Decided" value={formatDMYTime(order.reviewedAt)} />}
          </dl>
          {order.rejectionReason && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Rejection: {order.rejectionReason}</p>
          )}
          {order.paymentScreenshotUrl && (
            <Link
              href={order.paymentScreenshotUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
            >
              View payment screenshot ↗
            </Link>
          )}
        </div>
        {pending && <CreditOrderActions orderId={order.id} orderCode={order.orderId} />}
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="truncate font-medium text-navy-800">{value}</dd>
    </div>
  );
}
