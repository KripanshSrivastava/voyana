import "server-only";
import { getSiteSettings } from "./settings";

export type FeatureFlags = {
  vendorAdsEnabled: boolean;
  autoBuyEnabled: boolean;
  supportEnabled: boolean;
  packageMarketplaceEnabled: boolean;
};

export async function getFlags(): Promise<FeatureFlags> {
  const s = await getSiteSettings();
  return {
    vendorAdsEnabled: s.vendorAdsEnabled,
    autoBuyEnabled: s.autoBuyEnabled,
    supportEnabled: s.supportEnabled,
    packageMarketplaceEnabled: s.packageMarketplaceEnabled,
  };
}
