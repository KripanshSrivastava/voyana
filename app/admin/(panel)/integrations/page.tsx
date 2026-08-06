import Link from "next/link";
import { Globe, Share2, BarChart3, Mail, CreditCard, Webhook, ScrollText, CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { Card, Badge } from "@/components/ui";

const APP_URL = process.env.APP_URL || "http://localhost:3100";

export default async function IntegrationsPage() {
  const settings = await getSiteSettings();
  const [recent, counts] = await Promise.all([
    prisma.integrationLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.integrationLog.groupBy({ by: ["integration", "status"], _count: true }),
  ]);

  const countFor = (integration: string, status: string) =>
    counts.filter((c) => c.integration === integration && c.status === status).reduce((s, c) => s + c._count, 0);

  const items = [
    {
      key: "google_ads", name: "Google Ads (tracking)", icon: Globe,
      connected: Boolean(settings.googleAdsId),
      detail: settings.googleAdsId ? "Conversion tag active" : "Add a Google Ads ID in Settings",
      note: "Enhanced Conversions for Leads fire on submission via the site tag.",
    },
    {
      key: "google", name: "Google Lead Forms", icon: Webhook,
      connected: Boolean(process.env.GOOGLE_LEADS_WEBHOOK_KEY),
      detail: process.env.GOOGLE_LEADS_WEBHOOK_KEY ? "Webhook key configured" : "Set GOOGLE_LEADS_WEBHOOK_KEY",
      webhook: `${APP_URL}/api/leads/google`,
    },
    {
      key: "meta", name: "Meta Lead Ads", icon: Share2,
      connected: Boolean(process.env.META_APP_SECRET && process.env.META_VERIFY_TOKEN),
      detail: process.env.META_APP_SECRET ? "App secret + verify token set" : "Set META_APP_SECRET & META_VERIFY_TOKEN",
      webhook: `${APP_URL}/api/leads/meta`,
    },
    {
      key: "analytics", name: "Analytics (GA4)", icon: BarChart3,
      connected: Boolean(settings.gaId),
      detail: settings.gaId ? "GA4 tag active" : "Add a GA4 ID in Settings",
    },
    {
      key: "email", name: "Transactional Email", icon: Mail,
      connected: Boolean(process.env.RESEND_API_KEY),
      detail: process.env.RESEND_API_KEY ? "Resend connected" : "Set RESEND_API_KEY (senders come from EMAIL_SEND_DOMAIN)",
      note: "Emails are best-effort — a failure never blocks lead creation.",
    },
    {
      key: "api", name: "Internal Lead API", icon: Webhook,
      connected: Boolean(process.env.VOYANA_API_KEY),
      detail: process.env.VOYANA_API_KEY ? "API key configured" : "Set VOYANA_API_KEY",
      webhook: `${APP_URL}/api/v1/leads`,
    },
    {
      key: "payment", name: "Payments (Razorpay)", icon: CreditCard,
      connected: Boolean(process.env.RAZORPAY_KEY_ID),
      detail: process.env.RAZORPAY_KEY_ID ? "Gateway connected" : "Not connected — wallet is admin-credited for now",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Lead sources and services. Secrets live only in server env — never shown here."
        action={<Link href="/admin/integrations/logs" className="inline-flex items-center gap-2 rounded-lg border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"><ScrollText className="h-4 w-4" /> View logs</Link>}
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => (
          <Card key={it.key} className="p-5">
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><it.icon className="h-5 w-5" /></span>
              {it.connected ? (
                <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20"><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Connected</Badge>
              ) : (
                <Badge className="bg-navy-100 text-navy-500 ring-navy-500/20"><XCircle className="mr-1 h-3.5 w-3.5" /> Not connected</Badge>
              )}
            </div>
            <h3 className="mt-3 font-semibold text-navy-900">{it.name}</h3>
            <p className="mt-1 text-sm text-navy-500">{it.detail}</p>
            {it.webhook && (
              <code className="mt-3 block truncate rounded-lg bg-navy-50 px-2.5 py-1.5 text-xs text-navy-600" title={it.webhook}>{it.webhook}</code>
            )}
            {(countFor(it.key, "SUCCESS") > 0 || countFor(it.key, "FAILED") > 0) && (
              <div className="mt-3 flex gap-3 text-xs">
                <span className="text-emerald-600">{countFor(it.key, "SUCCESS")} ok</span>
                <span className="text-rose-600">{countFor(it.key, "FAILED")} failed</span>
                {countFor(it.key, "DUPLICATE") > 0 && <span className="text-amber-600">{countFor(it.key, "DUPLICATE")} dupe</span>}
              </div>
            )}
            {it.note && <p className="mt-3 text-xs text-navy-400">{it.note}</p>}
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">Recent integration events</h2>
          <Link href="/admin/integrations/logs" className="text-sm font-medium text-brand-700 hover:underline">All logs</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-navy-400">No integration events yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b border-navy-50 py-2 text-sm last:border-0">
                <div className="flex items-center gap-2">
                  <Badge className={l.status === "SUCCESS" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : l.status === "FAILED" ? "bg-rose-50 text-rose-700 ring-rose-600/20" : "bg-amber-50 text-amber-700 ring-amber-600/20"}>{l.status}</Badge>
                  <span className="font-medium capitalize text-navy-700">{l.integration}</span>
                  <span className="text-navy-400">{l.event}</span>
                </div>
                <span className="text-xs text-navy-400">{l.message}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
