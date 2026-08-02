import { prisma } from "../db";

/**
 * Generates the next sequential lead code, e.g. LD-2026-000042.
 * Uses the current lead count for the year; collisions are avoided by the
 * unique constraint on Lead.code and a small retry loop at the call site.
 */
export async function generateLeadCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LD-${year}-`;
  const last = await prisma.lead.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const lastSeq = last ? parseInt(last.code.slice(prefix.length), 10) : 0;
  const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}
