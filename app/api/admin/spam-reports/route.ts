import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";

export const GET = handler(async (req: Request) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "support");

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const vendor = url.searchParams.get("vendor") || undefined;
  const leadId = url.searchParams.get("leadId") || undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const search = url.searchParams.get("search") || undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (leadId) where.leadId = { contains: leadId, mode: "insensitive" };
  if (vendor) where.agent = { OR: [{ companyName: { contains: vendor, mode: "insensitive" } }, { user: { name: { contains: vendor, mode: "insensitive" } } }] };
  if (search) where.OR = [{ reason: { contains: search, mode: "insensitive" } }, { notes: { contains: search, mode: "insensitive" } }, { leadId: { contains: search, mode: "insensitive" } }];
  if (from || to) where.createdAt = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };

  const [total, items] = await Promise.all([
    prisma.spamReport.count({ where: where as never }),
    prisma.spamReport.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        lead: { select: { id: true, code: true, destinationText: true, price: true } },
        agent: { include: { user: { select: { name: true, email: true } } } },
      },
    }),
  ]);

  return ok({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
});