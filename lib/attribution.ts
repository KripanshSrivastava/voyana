"use client";

// Session-persistent marketing attribution capture.
// First-touch (source/campaign/landing) is preserved for the whole session;
// last-touch page is updated on every navigation.

export type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  campaignId?: string;
  adGroupId?: string;
  keyword?: string;
  creativeId?: string;
  device?: string;
  browser?: string;
  referrer?: string;
  landingPage?: string;
  firstPage?: string;
  lastPage?: string;
};

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

const KEY = "voyana_attr";

function read(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

function write(a: Attribution) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* storage may be unavailable */
  }
}

/** Call on every page load (client). Captures first-touch, updates last-touch. */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const existing = read();
  const params = new URLSearchParams(window.location.search);
  const here = window.location.pathname + window.location.search;

  const get = (k: string) => params.get(k) || undefined;

  const firstTouch: Attribution = {
    utmSource: existing.utmSource ?? get("utm_source"),
    utmMedium: existing.utmMedium ?? get("utm_medium"),
    utmCampaign: existing.utmCampaign ?? get("utm_campaign"),
    utmTerm: existing.utmTerm ?? get("utm_term"),
    utmContent: existing.utmContent ?? get("utm_content"),
    gclid: existing.gclid ?? get("gclid"),
    gbraid: existing.gbraid ?? get("gbraid"),
    wbraid: existing.wbraid ?? get("wbraid"),
    fbclid: existing.fbclid ?? get("fbclid"),
    campaignId: existing.campaignId ?? get("campaignid") ?? get("campaign_id"),
    adGroupId: existing.adGroupId ?? get("adgroupid") ?? get("adgroup_id"),
    keyword: existing.keyword ?? get("keyword"),
    creativeId: existing.creativeId ?? get("creative") ?? get("creativeid"),
    device: existing.device ?? detectDevice(),
    browser: existing.browser ?? (navigator.userAgent.slice(0, 120)),
    referrer: existing.referrer ?? (document.referrer || undefined),
    landingPage: existing.landingPage ?? here,
    firstPage: existing.firstPage ?? here,
  };

  const merged: Attribution = { ...firstTouch, lastPage: here };
  write(merged);
  return merged;
}

export function getAttribution(): Attribution {
  return read();
}

/**
 * Conversion tracking abstraction — ready for Google Ads / GA4 / Meta Pixel.
 * No-ops safely when tracking IDs are not configured.
 */
export function trackLeadConversion(payload: { leadCode: string; value?: number }) {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  };
  try {
    w.dataLayer?.push({ event: "lead_submitted", ...payload });
    w.gtag?.("event", "generate_lead", { lead_code: payload.leadCode, value: payload.value });
    w.fbq?.("track", "Lead", { value: payload.value, currency: "INR" });
  } catch {
    /* tracking is best-effort */
  }
}
