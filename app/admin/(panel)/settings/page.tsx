import { getSiteSettings, type Socials } from "@/lib/settings";
import { requireAdmin } from "@/lib/guards";
import { canAccess } from "@/lib/rbac";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm, type SettingsValue } from "@/components/admin/SettingsForm";
import { FeatureFlagsCard } from "@/components/admin/FeatureFlagsCard";
import { parseJson } from "@/lib/utils";

export default async function SettingsPage() {
  const session = await requireAdmin();
  if (!canAccess(session, "settings")) return <AccessRestricted area="Settings" />;
  const s = await getSiteSettings();
  const socials = parseJson<Socials>(s.socials, {});
  const flags = {
    vendorAdsEnabled: s.vendorAdsEnabled,
    autoBuyEnabled: s.autoBuyEnabled,
    supportEnabled: s.supportEnabled,
    packageMarketplaceEnabled: s.packageMarketplaceEnabled,
  };
  const initial: SettingsValue = {
    brandName: s.brandName, tagline: s.tagline, logoUrl: s.logoUrl ?? "", faviconUrl: s.faviconUrl ?? "", heroImage: s.heroImage ?? "",
    phone: s.phone ?? "", whatsapp: s.whatsapp ?? "", email: s.email ?? "", address: s.address ?? "",
    facebook: socials.facebook ?? "", instagram: socials.instagram ?? "", twitter: socials.twitter ?? "", youtube: socials.youtube ?? "",
    pinterest: socials.pinterest ?? "", linkedin: socials.linkedin ?? "",
    defaultLeadPrice: String(s.defaultLeadPrice), leadMaxAgents: String(s.leadMaxAgents), leadExpiryHours: String(s.leadExpiryHours),
    leadValidityDays: String(s.leadValidityDays),
    priceSharedDomestic: String(s.priceSharedDomestic),
    priceSharedInternational: String(s.priceSharedInternational),
    priceExclusiveDomestic: String(s.priceExclusiveDomestic),
    priceExclusiveInternational: String(s.priceExclusiveInternational),
    adCostPerClickCredits: String(s.adCostPerClickCredits),
    footerText: s.footerText ?? "", defaultSeoTitle: s.defaultSeoTitle ?? "", defaultSeoDescription: s.defaultSeoDescription ?? "",
    gaId: s.gaId ?? "", metaPixelId: s.metaPixelId ?? "", googleAdsId: s.googleAdsId ?? "",
  };
  return (
    <div>
      <PageHeader title="Settings" subtitle="Brand, contact details, lead defaults and tracking." />
      <div className="grid gap-6 lg:grid-cols-2">
        <FeatureFlagsCard initial={flags} />
      </div>
      <div className="mt-6">
        <SettingsForm initial={initial} />
      </div>
    </div>
  );
}
