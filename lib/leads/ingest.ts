import "server-only";
import { prisma } from "../db";
import { scoreLead } from "./scoring";
import { generateLeadCode } from "./code";
import { getSiteSettings } from "../settings";
import { logIntegration } from "../integrations/log";
import { logAudit } from "../audit";
import { sendEmail } from "../email/mailer";
import { customerLeadReceived, adminNewLead } from "../email/templates";
import { runLeadAlerts } from "./alerts";
import { runAutoBuyForLead } from "./autobuy";
import { sendWhatsAppTemplate } from "../whatsapp/client";
import { customerEnquiryAckTemplate } from "../whatsapp/templates";

export type IngestAttribution = {
  utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null;
  utmTerm?: string | null; utmContent?: string | null;
  gclid?: string | null; gbraid?: string | null; wbraid?: string | null; fbclid?: string | null;
  campaignId?: string | null; adGroupId?: string | null; keyword?: string | null; creativeId?: string | null;
  device?: string | null; browser?: string | null;
  referrer?: string | null; landingPage?: string | null; firstPage?: string | null; lastPage?: string | null;
};

export type IngestInput = {
  customerName: string;
  phone: string;
  email?: string | null;
  destinationText: string;
  departureCity?: string | null;
  travelDate?: Date | string | null;
  travelDateText?: string | null;
  travelers?: number | null;
  adults?: number | null;
  children?: number | null;
  nights?: number | null;
  budget?: number | null;
  tripType?: string | null;
  requirements?: string[];
  message?: string | null;
  source: string;
  sourceType: string;
  externalId?: string | null;
  attribution?: IngestAttribution;
  destinationId?: string | null;
  packageId?: string | null;
  status?: string;
  initialPrice?: number | null;
  actorType?: "ADMIN" | "SYSTEM";
  actorLabel?: string | null;
};

export type IngestResult = { lead: { id: string; code: string }; duplicate: boolean; alreadyExisted: boolean };

const INTEGRATION_SOURCES = new Set(["google", "meta", "api", "partner"]);

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3100";
}

/**
 * Single entry point for creating a lead from ANY channel.
 * Storing the lead is the only step that can fail the caller; every secondary
 * task (integration log, audit, email) is best-effort and never blocks or
 * rolls back the lead.
 */
export async function ingestLead(input: IngestInput): Promise<IngestResult> {
  const settings = await getSiteSettings();
  const integration = mapIntegration(input.source);

  const requirements = input.requirements ?? [];
  const travelDate = input.travelDate ? new Date(input.travelDate) : null;
  const phone = input.phone.trim();
  const email = input.email?.trim() || null;

  // Idempotency: a provider lead we've already ingested returns the original.
  if (input.externalId) {
    const existing = await prisma.lead.findFirst({
      where: { source: input.source, externalId: input.externalId },
      select: { id: true, code: true },
    });
    if (existing) {
      if (integration) {
        await logIntegration({ integration, event: "lead_ingest", status: "DUPLICATE", leadId: existing.id, externalId: input.externalId, message: "Idempotent replay ignored" });
      }
      return { lead: existing, duplicate: false, alreadyExisted: true };
    }
  }

  const { score, quality } = scoreLead({
    phone, email, destinationText: input.destinationText, travelDate,
    budget: input.budget ?? null, travelers: input.travelers ?? null,
    requirements, message: input.message ?? null, utmSource: input.attribution?.utmSource ?? input.source,
  });

  // Soft duplicate detection (never destructive) — links to the original.
  const windowStart = new Date(Date.now() - settings.leadExpiryHours * 60 * 60 * 1000);
  const dupe = await prisma.lead.findFirst({
    where: {
      createdAt: { gte: windowStart },
      destinationText: { equals: input.destinationText },
      OR: [{ phone }, ...(email ? [{ email }] : [])],
    },
    select: { id: true, code: true },
    orderBy: { createdAt: "desc" },
  });

  // Package snapshot so the lead survives later content edits.
  let packageSnapshotName: string | null = null;
  let packageSnapshotPrice: number | null = null;
  if (input.packageId) {
    const pkg = await prisma.tourPackage.findUnique({
      where: { id: input.packageId },
      select: { title: true, offerPrice: true, startingPrice: true },
    });
    if (pkg) { packageSnapshotName = pkg.title; packageSnapshotPrice = pkg.offerPrice ?? pkg.startingPrice ?? null; }
  }

  // Category classification (DOMESTIC | INTERNATIONAL | INBOUND) is curated
  // per-destination by admins (Destination.category), not guessable from
  // free text — carry it onto the lead so category-based alert/auto-buy
  // rules can match leads at ingestion time, not only after manual admin edit.
  let tripCategory: string | null = null;
  if (input.destinationId) {
    const destination = await prisma.destination.findUnique({ where: { id: input.destinationId }, select: { category: true } });
    tripCategory = destination?.category ?? null;
  }

  const a = input.attribution ?? {};
  // Prefer the newer day-based setting; fall back to legacy hours if unset/zero.
  const validityMs = settings.leadValidityDays > 0
    ? settings.leadValidityDays * 24 * 60 * 60 * 1000
    : settings.leadExpiryHours * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + validityMs);
  const status = input.status ?? "NEW";

  let created: { id: string; code: string } | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = await generateLeadCode();
    try {
      created = await prisma.lead.create({
        data: {
          code,
          customerName: input.customerName,
          phone,
          email,
          destinationText: input.destinationText,
          departureCity: input.departureCity || null,
          clientLocation: input.departureCity || null,
          travelDate,
          travelDateText: input.travelDateText || null,
          travelers: input.travelers ?? null,
          adults: input.adults ?? null,
          children: input.children ?? null,
          nights: input.nights ?? null,
          budget: input.budget ?? null,
          tripType: input.tripType || null,
          requirements: JSON.stringify(requirements),
          message: input.message || null,
          status,
          quality,
          qualityScore: score,
          price: input.initialPrice ?? settings.defaultLeadPrice,
          tripCategory,
          isDuplicate: Boolean(dupe),
          duplicateOfId: dupe?.id ?? null,
          maxAgents: settings.leadMaxAgents,
          expiresAt,
          source: input.source,
          sourceType: input.sourceType,
          externalId: input.externalId || null,
          destinationId: input.destinationId || null,
          packageId: input.packageId || null,
          packageSnapshotName,
          packageSnapshotPrice,
          utmSource: a.utmSource || null,
          utmMedium: a.utmMedium || null,
          utmCampaign: a.utmCampaign || null,
          utmTerm: a.utmTerm || null,
          utmContent: a.utmContent || null,
          gclid: a.gclid || null,
          gbraid: a.gbraid || null,
          wbraid: a.wbraid || null,
          fbclid: a.fbclid || null,
          campaignId: a.campaignId || null,
          adGroupId: a.adGroupId || null,
          keyword: a.keyword || null,
          creativeId: a.creativeId || null,
          device: a.device || null,
          browser: a.browser || null,
          referrer: a.referrer || null,
          landingPage: a.landingPage || null,
          firstPage: a.firstPage || null,
          lastPage: a.lastPage || null,
          statusHistory: {
            create: {
              toStatus: status,
              actorType: input.actorType ?? "SYSTEM",
              actorLabel: input.actorLabel ?? null,
              note: `Lead ingested from ${input.source} (${input.sourceType})`,
            },
          },
        },
        select: { id: true, code: true },
      });
      break;
    } catch (e) {
      if (attempt === 3) throw e;
    }
  }
  if (!created) throw new Error("Lead creation failed");

  // --- Secondary tasks: best-effort, never block or fail the lead ---
  // Previously ran serially (~6 sequential awaits including 2 SMTP round-trips).
  // Now fan out in parallel; failures in any one are logged but never bubble
  // up. Auto-buy still runs strictly last — it purchases against the lead and
  // must see any alert-driven activity in a consistent post-fan-out state.
  const adminEmail = process.env.ADMIN_EMAIL;
  const sideEffects: Promise<unknown>[] = [
    logAudit({ actorType: input.actorType ?? "SYSTEM", actorLabel: input.actorLabel, action: "lead.create", entityType: "lead", entityId: created.id, metadata: { source: input.source, sourceType: input.sourceType, quality } }),
    runLeadAlerts(created.id),
  ];
  if (integration) {
    sideEffects.push(logIntegration({ integration, event: "lead_ingest", status: "SUCCESS", leadId: created.id, externalId: input.externalId, message: dupe ? "Created (possible duplicate flagged)" : "Created" }));
  }
  if (email) {
    const t = customerLeadReceived({ name: input.customerName, code: created.code, destination: input.destinationText });
    sideEffects.push(sendEmail({ to: email, ...t, category: "leads" }));
  }
  // WhatsApp acknowledgement to the customer. Fires for every ingestion
  // channel (website form, Google/Meta lead ads, partner API) because a
  // customer who filled a form anywhere expects to hear back. Skips itself
  // when the phone can't be normalised or WhatsApp isn't configured.
  sideEffects.push(
    customerEnquiryAckTemplate({
      customerName: input.customerName,
      destination: input.destinationText,
      leadCode: created.code,
    }).then((tpl) => sendWhatsAppTemplate(phone, tpl, "customer_ack", { leadId: created!.id })),
  );
  if (adminEmail) {
    const t = adminNewLead({ code: created.code, destination: input.destinationText, quality, source: input.source, budget: input.budget ?? null, url: `${appUrl()}/admin/leads/${created.id}` });
    sideEffects.push(sendEmail({ to: adminEmail, ...t, category: "leads" }));
  }
  await Promise.allSettled(sideEffects);

  // A freshly-priced lead is immediately purchasable — give auto-buy-enabled
  // agents first shot at it (best-effort, non-blocking). Kept sequential after
  // the fan-out so auto-buy sees a settled state (consistent assignmentCount).
  await runAutoBuyForLead(created.id);

  return { lead: created, duplicate: Boolean(dupe), alreadyExisted: false };
}

/** Classify a website-form lead's marketing source from its attribution. */
export function detectWebsiteSource(a: IngestAttribution | undefined): string {
  if (!a) return "direct";
  const s = (a.utmSource || "").toLowerCase();
  if (a.gclid || a.gbraid || a.wbraid || s === "google" || a.utmMedium === "cpc") return "google";
  if (a.fbclid || ["meta", "facebook", "fb", "instagram", "ig"].includes(s)) return "meta";
  if (a.utmMedium === "organic" || s === "organic" || s === "seo") return "organic";
  if (s) return s;
  if (a.referrer && !a.referrer.includes("localhost")) return "referral";
  return "direct";
}

function mapIntegration(source: string): "google" | "meta" | "api" | null {
  if (source === "google") return "google";
  if (source === "meta") return "meta";
  if (INTEGRATION_SOURCES.has(source)) return "api";
  return null;
}
