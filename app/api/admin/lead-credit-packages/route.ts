import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const int = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : NaN;
};

function requireSuperAdmin(session: { adminRole?: string | null }) {
  if (session.adminRole && session.adminRole !== "SUPER_ADMIN") {
    throw Object.assign(new Error("Only the Main Admin can manage Lead Credit pricing."), { status: 403 });
  }
}

export const GET = handler(async () => {
  const session = await requireRole("ADMIN");
  requireSuperAdmin(session);
  const packages = await prisma.leadCreditPackage.findMany({ orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] });
  return ok({ packages });
});

export const PATCH = handler(async (req: Request) => {
  const session = await requireRole("ADMIN");
  requireSuperAdmin(session);
  const body = await req.json();
  const id = String(body.id || "");
  if (!id) return fail("Package id is required.", 422);

  const credits = int(body.credits);
  const priceInr = int(body.priceInr);
  const displayOrder = int(body.displayOrder);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const isActive = Boolean(body.isActive);

  if (!name) return fail("Package name is required.", 422);
  if (!Number.isInteger(credits) || credits <= 0) return fail("Enter a valid credit quantity.", 422);
  if (!Number.isInteger(priceInr) || priceInr <= 0) return fail("Enter a valid package price.", 422);
  if (!Number.isInteger(displayOrder)) return fail("Enter a valid display order.", 422);

  if (isActive) {
    const activeCount = await prisma.leadCreditPackage.count({ where: { isActive: true, id: { not: id } } });
    if (activeCount >= 2) return fail("Only 2 active Lead Credit packages are allowed for the MVP.", 409);
  }

  const pkg = await prisma.leadCreditPackage.update({
    where: { id },
    data: { name, credits, priceInr, isActive, displayOrder },
  });

  await logAudit({ actorType: "ADMIN", actorId: session.uid, actorLabel: session.name, action: "credits.package.update", entityType: "wallet", entityId: id, metadata: { name, credits, priceInr, isActive, displayOrder } });
  return ok({ package: pkg });
});
