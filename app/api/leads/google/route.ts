import { NextResponse } from "next/server";
import { ingestLead } from "@/lib/leads/ingest";
import { logIntegration } from "@/lib/integrations/log";

/**
 * Google Ads native Lead Form webhook.
 * Docs: https://support.google.com/google-ads/answer/9047107 (webhook payload).
 * Configure in Google Ads: Webhook URL = <APP_URL>/api/leads/google, and a Key
 * that must match env GOOGLE_LEADS_WEBHOOK_KEY.
 *
 * Payload shape:
 * {
 *   lead_id, api_version, form_id, campaign_id, gcl_id, adgroup_id, creative_id,
 *   google_key, is_test, user_column_data: [{ column_id, string_value }]
 * }
 */
type GoogleColumn = { column_id?: string; column_name?: string; string_value?: string };
type GooglePayload = {
  lead_id?: string;
  google_key?: string;
  is_test?: boolean;
  gcl_id?: string;
  campaign_id?: string | number;
  adgroup_id?: string | number;
  creative_id?: string | number;
  user_column_data?: GoogleColumn[];
};

function pick(cols: GoogleColumn[], ...ids: string[]): string | undefined {
  const norm = (s?: string) => (s || "").toUpperCase().replace(/[^A-Z]/g, "");
  const wanted = ids.map(norm);
  for (const c of cols) {
    const key = norm(c.column_id) || norm(c.column_name);
    if (wanted.some((w) => key.includes(w))) return c.string_value?.trim() || undefined;
  }
  return undefined;
}

export async function POST(req: Request) {
  let payload: GooglePayload;
  try {
    payload = await req.json();
  } catch {
    await logIntegration({ integration: "google", event: "lead_ingest", status: "FAILED", message: "Invalid JSON body" });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate the shared key.
  const expected = process.env.GOOGLE_LEADS_WEBHOOK_KEY;
  if (expected && payload.google_key !== expected) {
    await logIntegration({ integration: "google", event: "webhook_verify", status: "FAILED", externalId: payload.lead_id, message: "Invalid google_key" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cols = payload.user_column_data ?? [];
  const name = pick(cols, "FULL_NAME", "FIRST_NAME", "NAME");
  const phone = pick(cols, "PHONE_NUMBER", "PHONE");
  const email = pick(cols, "EMAIL");
  const destination = pick(cols, "DESTINATION", "CITY", "WHERE");
  const budget = pick(cols, "BUDGET");
  const travelers = pick(cols, "TRAVELERS", "PAX", "PEOPLE");
  const adults = pick(cols, "ADULTS", "ADULT_COUNT");
  const children = pick(cols, "CHILDREN", "KIDS", "CHILD_COUNT");

  if (!phone && !email) {
    await logIntegration({ integration: "google", event: "lead_ingest", status: "FAILED", externalId: payload.lead_id, message: "Missing phone and email" });
    return NextResponse.json({ error: "Missing contact field" }, { status: 422 });
  }

  try {
    const { lead, alreadyExisted } = await ingestLead({
      customerName: name || "(unknown)",
      phone: phone || "",
      email: email || null,
      destinationText: destination || "(not specified)",
      budget: budget ? parseInt(budget.replace(/[^\d]/g, ""), 10) || null : null,
      travelers: travelers ? parseInt(travelers, 10) || null : null,
      adults: adults ? parseInt(adults, 10) || null : null,
      children: children ? parseInt(children, 10) || null : null,
      source: "google",
      sourceType: "google_lead_form",
      externalId: payload.lead_id ? String(payload.lead_id) : null,
      status: "NEW",
      attribution: {
        utmSource: "google",
        utmMedium: "cpc",
        gclid: payload.gcl_id || null,
        campaignId: payload.campaign_id != null ? String(payload.campaign_id) : null,
        adGroupId: payload.adgroup_id != null ? String(payload.adgroup_id) : null,
        creativeId: payload.creative_id != null ? String(payload.creative_id) : null,
      },
    });
    return NextResponse.json({ ok: true, lead_id: lead.code, duplicate: alreadyExisted });
  } catch (e) {
    await logIntegration({ integration: "google", event: "lead_ingest", status: "FAILED", externalId: payload.lead_id, message: String(e) });
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}
