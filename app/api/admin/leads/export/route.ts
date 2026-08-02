import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole, AuthError } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  try {
    const session = await requireRole("ADMIN");
    requireArea(session, "leads");
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    throw e;
  }

  const url = new URL(req.url);
  const where: Prisma.LeadWhereInput = {};
  const status = url.searchParams.get("status");
  const quality = url.searchParams.get("quality");
  const q = url.searchParams.get("q");
  if (status) where.status = status;
  if (quality) where.quality = quality;
  if (q) {
    where.OR = [
      { code: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } },
      { destinationText: { contains: q } }, { customerName: { contains: q } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      assignments: { include: { agent: { select: { companyName: true } } } },
      payments: { select: { amount: true } },
    },
  });

  const headers = [
    "Lead ID", "Date", "Customer", "Phone", "Email", "Destination", "Travel Date",
    "Budget", "Travelers", "Trip Type", "Source", "Campaign", "Status", "Quality",
    "Assigned Agents", "Revenue", "Interested Package",
  ];

  const rows = leads.map((l) => [
    l.code, formatDate(l.createdAt), l.customerName, l.phone, l.email ?? "",
    l.destinationText, l.travelDate ? formatDate(l.travelDate) : l.travelDateText ?? "",
    l.budget ?? "", l.travelers ?? "", l.tripType ?? "", l.utmSource ?? "direct", l.utmCampaign ?? "",
    l.status, l.quality,
    l.assignments.map((a) => a.agent.companyName).join(" | "),
    l.payments.reduce((s, p) => s + p.amount, 0),
    l.packageSnapshotName ?? "",
  ]);

  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="voyana-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
