import { NextResponse } from "next/server";
import crypto from "crypto";
import { ingestLead } from "@/lib/leads/ingest";
import { logIntegration } from "@/lib/integrations/log";

/**
 * Meta (Facebook/Instagram) Lead Ads webhook.
 * Docs: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/
 * GET  = subscription verification (hub.challenge).
 * POST = leadgen change notification, signed with X-Hub-Signature-256.
 *
 * Env: META_VERIFY_TOKEN (subscription), META_APP_SECRET (signature).
 * Full field retrieval from a production notification requires a Graph API page
 * token (META_PAGE_TOKEN) — the code ingests inline field_data when present
 * (e.g. from the Lead Ads Testing Tool) and logs when a Graph fetch is needed.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

type MetaFieldEntry = { name?: string; values?: string[] };

function fieldVal(fields: MetaFieldEntry[], ...names: string[]): string | undefined {
  const want = names.map((n) => n.toLowerCase());
  for (const f of fields) {
    const key = (f.name || "").toLowerCase();
    if (want.some((w) => key.includes(w))) return f.values?.[0]?.trim() || undefined;
  }
  return undefined;
}

export async function POST(req: Request) {
  const raw = await req.text();

  // Verify signature when the app secret is configured.
  const secret = process.env.META_APP_SECRET;
  if (secret) {
    const sig = req.headers.get("x-hub-signature-256") || "";
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const ok = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) {
      await logIntegration({ integration: "meta", event: "webhook_verify", status: "FAILED", message: "Invalid signature" });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let body: { entry?: { changes?: { field?: string; value?: Record<string, unknown> }[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const value = change.value ?? {};
      const leadgenId = value.leadgen_id != null ? String(value.leadgen_id) : null;
      const fields = (value.field_data as MetaFieldEntry[] | undefined) ?? [];

      if (fields.length === 0) {
        // Production notifications carry only the id — a Graph API fetch is needed.
        await logIntegration({ integration: "meta", event: "lead_ingest", status: "FAILED", externalId: leadgenId, message: "field_data absent — Graph API retrieval (META_PAGE_TOKEN) required" });
        continue;
      }

      const phone = fieldVal(fields, "phone");
      const email = fieldVal(fields, "email");
      if (!phone && !email) {
        await logIntegration({ integration: "meta", event: "lead_ingest", status: "FAILED", externalId: leadgenId, message: "Missing phone and email" });
        continue;
      }
      try {
        await ingestLead({
          customerName: fieldVal(fields, "full_name", "name") || "(unknown)",
          phone: phone || "",
          email: email || null,
          destinationText: fieldVal(fields, "destination", "city") || "(not specified)",
          budget: (() => { const b = fieldVal(fields, "budget"); return b ? parseInt(b.replace(/[^\d]/g, ""), 10) || null : null; })(),
          source: "meta",
          sourceType: "meta_lead_form",
          externalId: leadgenId,
          status: "NEW",
          attribution: {
            utmSource: "meta",
            utmMedium: "paid_social",
            campaignId: value.campaign_id != null ? String(value.campaign_id) : null,
            creativeId: value.ad_id != null ? String(value.ad_id) : null,
          },
        });
      } catch (e) {
        await logIntegration({ integration: "meta", event: "lead_ingest", status: "FAILED", externalId: leadgenId, message: String(e) });
      }
    }
  }

  // Always 200 so Meta doesn't retry a delivered notification.
  return NextResponse.json({ ok: true });
}
