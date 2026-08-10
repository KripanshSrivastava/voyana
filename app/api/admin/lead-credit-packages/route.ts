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

// Create a fresh credit package. Kept intentionally minimal — the admin fills
// in name/credits/price/QR/etc. after creation via the PATCH row-editor. New
// packages default to inactive so they don't leak to agents before the admin
// has finalised pricing and uploaded the payment QR.
export const POST = handler(async (req: Request) => {
  const session = await requireRole("ADMIN");
  requireSuperAdmin(session);
  const body = await req.json();

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const credits = int(body.credits);
  const priceInr = int(body.priceInr);
  const displayOrder = Number.isFinite(int(body.displayOrder)) ? int(body.displayOrder) : 100;
  const isActive = Boolean(body.isActive);

  if (!name) return fail("Package name is required.", 422);
  if (!Number.isInteger(credits) || credits <= 0) return fail("Enter a valid credit quantity.", 422);
  if (!Number.isInteger(priceInr) || priceInr <= 0) return fail("Enter a valid package price.", 422);

  const pkg = await prisma.leadCreditPackage.create({
    data: { name, credits, priceInr, isActive, displayOrder },
  });
  await logAudit({ actorType: "ADMIN", actorId: session.uid, actorLabel: session.name, action: "credits.package.create", entityType: "wallet", entityId: pkg.id, metadata: { name, credits, priceInr, isActive, displayOrder } });
  return ok({ package: pkg });
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
  // Payment QR URL: uploaded via /api/admin/media, we only store the URL.
  // Validated as http(s) so no javascript: URIs can sneak in when the img
  // is rendered on the agent-facing purchase page.
  let paymentQrUrl: string | null = null;
  if (typeof body.paymentQrUrl === "string" && body.paymentQrUrl.trim().length > 0) {
    const raw = body.paymentQrUrl.trim();
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return fail("Payment QR URL must start with https://.", 422);
      paymentQrUrl = parsed.toString().slice(0, 500);
    } catch {
      return fail("Payment QR URL is not a valid URL.", 422);
    }
  }

  if (!name) return fail("Package name is required.", 422);
  if (!Number.isInteger(credits) || credits <= 0) return fail("Enter a valid credit quantity.", 422);
  if (!Number.isInteger(priceInr) || priceInr <= 0) return fail("Enter a valid package price.", 422);
  if (!Number.isInteger(displayOrder)) return fail("Enter a valid display order.", 422);

  const pkg = await prisma.leadCreditPackage.update({
    where: { id },
    data: { name, credits, priceInr, isActive, displayOrder, paymentQrUrl },
  });

  await logAudit({ actorType: "ADMIN", actorId: session.uid, actorLabel: session.name, action: "credits.package.update", entityType: "wallet", entityId: id, metadata: { name, credits, priceInr, isActive, displayOrder, hasQr: Boolean(paymentQrUrl) } });
  return ok({ package: pkg });
});
