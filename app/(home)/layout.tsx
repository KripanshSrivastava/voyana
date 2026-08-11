import type { Metadata } from "next";
import { getPublicSettings } from "@/lib/settings";
import { AttributionTracker } from "@/components/site/AttributionTracker";
import { AnalyticsTags } from "@/components/site/AnalyticsTags";
import "./home.css";

/**
 * The homepage runs its own route group so it can own its chrome end-to-end:
 * its own fixed nav, its own footer, its own hero. Typography and color
 * palette are now SHARED with the /(site) pages via the root layout — a
 * unified visitor experience — so this file no longer imports its own fonts.
 */

export async function generateMetadata(): Promise<Metadata> {
  const s = await getPublicSettings();
  return {
    title: s.defaultSeoTitle || `${s.brandName} — ${s.tagline}`,
    description:
      s.defaultSeoDescription ||
      "Discover destinations, connect with trusted travel professionals, and turn your travel plans into unforgettable experiences.",
  };
}

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSettings();
  return (
    <div className="mb-home">
      <AnalyticsTags gaId={settings.gaId} googleAdsId={settings.googleAdsId} />
      <AttributionTracker />
      {children}
    </div>
  );
}
