import { getPublicSettings } from "@/lib/settings";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { AttributionTracker } from "@/components/site/AttributionTracker";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { MobileCta } from "@/components/site/MobileCta";
import { AnalyticsTags } from "@/components/site/AnalyticsTags";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <AnalyticsTags gaId={settings.gaId} googleAdsId={settings.googleAdsId} />
      <AttributionTracker />
      <SiteHeader brandName={settings.brandName} logoUrl={settings.logoUrl} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <SiteFooter settings={settings} />
      <WhatsAppButton number={settings.whatsapp} />
      <MobileCta />
    </div>
  );
}
