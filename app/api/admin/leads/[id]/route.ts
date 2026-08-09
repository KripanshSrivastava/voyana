import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireArea } from "@/lib/rbac";
import { LEAD_STATUSES, LEAD_QUALITIES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { runAutoBuyForLead } from "@/lib/leads/autobuy";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const session = await requireRole("ADMIN");
  requireArea(session, "leads");
  const { id } = await (ctx as Ctx).params;
  const body = await req.json();

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return fail("Lead not found.", 404);

  // Manual edit of customer/trip details.
  if (body.details) {
    const d = body.details as Record<string, unknown>;
    const detailData: Record<string, unknown> = {};
    if (typeof d.customerName === "string" && d.customerName.trim()) detailData.customerName = d.customerName.trim();
    if (typeof d.phone === "string" && d.phone.trim()) detailData.phone = d.phone.trim();
    if (typeof d.email === "string") detailData.email = d.email.trim() || null;
    if (typeof d.destinationText === "string" && d.destinationText.trim()) detailData.destinationText = d.destinationText.trim();
    if (typeof d.departureCity === "string") detailData.departureCity = d.departureCity.trim() || null;
    if (typeof d.tripType === "string") detailData.tripType = d.tripType.trim() || null;
    if (typeof d.message === "string") detailData.message = d.message.trim() || null;
    if (d.travelDate !== undefined) detailData.travelDate = d.travelDate ? new Date(d.travelDate as string) : null;
    if (d.travelers !== undefined) detailData.travelers = d.travelers ? Number(d.travelers) : null;
    if (d.adults !== undefined) detailData.adults = d.adults != null ? Number(d.adults) : null;
    if (d.children !== undefined) detailData.children = d.children != null ? Number(d.children) : null;
    if (d.budget !== undefined) detailData.budget = d.budget ? Number(d.budget) : null;
    if (typeof d.clientLocation === "string") detailData.clientLocation = d.clientLocation.trim() || null;
    if (typeof d.tripCategory === "string") {
      detailData.tripCategory = ["DOMESTIC", "INTERNATIONAL", "INBOUND"].includes(d.tripCategory) ? d.tripCategory : null;
    }

    if (Object.keys(detailData).length > 0) {
      await prisma.lead.update({ where: { id }, data: detailData });
      await prisma.leadStatusHistory.create({
        data: { leadId: id, toStatus: lead.status, actorType: "ADMIN", actorLabel: session.name, note: "Lead details updated manually" },
      });
      await logAudit({ actorType: "ADMIN", actorId: session.uid, actorLabel: session.name, action: "lead.details", entityType: "lead", entityId: id, metadata: { fields: Object.keys(detailData) } });
    }
    return ok({ id });
  }

  const data: Record<string, unknown> = {};

  if (typeof body.status === "string") {
    if (!LEAD_STATUSES.includes(body.status)) return fail("Invalid status.", 422);
    data.status = body.status;
  }
  if (typeof body.quality === "string") {
    if (!LEAD_QUALITIES.includes(body.quality)) return fail("Invalid quality.", 422);
    data.quality = body.quality;
    data.qualityOverride = true;
  }
  if (body.price !== undefined && body.price !== null && body.price !== "") {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return fail("Invalid price.", 422);
    data.price = Math.round(price);
  }
  if (typeof body.tripCategory === "string") {
    data.tripCategory = ["DOMESTIC", "INTERNATIONAL", "INBOUND"].includes(body.tripCategory) ? body.tripCategory : null;
  }
  if (typeof body.clientLocation === "string") data.clientLocation = body.clientLocation.trim() || null;

  if (Object.keys(data).length > 0) {
    await prisma.lead.update({ where: { id }, data });
    if (data.status && data.status !== lead.status) {
      await prisma.leadStatusHistory.create({
        data: {
          leadId: id,
          fromStatus: lead.status,
          toStatus: data.status as string,
          actorType: "ADMIN",
          actorLabel: session.name,
        },
      });
    }
    if (data.price !== undefined) {
      await prisma.leadStatusHistory.create({
        data: { leadId: id, toStatus: lead.status, actorType: "ADMIN", actorLabel: session.name, note: `Lead price set to ₹${data.price}` },
      });
    }
    await logAudit({
      actorType: "ADMIN", actorId: session.uid, actorLabel: session.name,
      action: data.price !== undefined ? "lead.price" : data.status ? "lead.status" : "lead.quality",
      entityType: "lead", entityId: id,
      metadata: { status: data.status, quality: data.quality, price: data.price },
    });
  }

  if (typeof body.note === "string" && body.note.trim()) {
    await prisma.leadNote.create({
      data: { leadId: id, authorType: "ADMIN", authorLabel: session.name, body: body.note.trim() },
    });
  }

  // A lead that just became priced/available may trigger auto-buy for eligible agents.
  if (data.price !== undefined || data.status === "AVAILABLE") {
    await runAutoBuyForLead(id);
  }

  return ok({ id });
});
