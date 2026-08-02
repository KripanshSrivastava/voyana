import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { agentProfileSchema } from "@/lib/validation";

/** Vendor updates their own personal + company profile. Verification fields and
 *  account status are admin-only and never writable here. */
export const PATCH = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const d = agentProfileSchema.parse(await req.json());

  await prisma.agent.update({
    where: { id: session.agentId },
    data: {
      firstName: d.firstName || null,
      lastName: d.lastName || null,
      phone: d.phone,
      personalEmail: d.personalEmail || null,
      profileImage: d.profileImage || null,
      companyName: d.companyName,
      state: d.state || null,
      city: d.city || null,
      companyAddress: d.companyAddress || null,
      companyEmail: d.companyEmail || null,
      contactPerson: d.contactPerson || null,
      contactNo: d.contactNo || null,
      website: d.website || null,
      socials: d.socials ? JSON.stringify(d.socials) : null,
      lowWalletThreshold: d.lowWalletThreshold ?? null,
    },
  });

  // Optionally keep the display name in sync when both names are given.
  const displayName = [d.firstName, d.lastName].filter(Boolean).join(" ").trim();
  if (displayName) {
    await prisma.user.update({ where: { id: session.uid }, data: { name: displayName } });
  }

  return ok({ saved: true });
});
