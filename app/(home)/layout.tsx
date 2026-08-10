import type { Metadata } from "next";
import { Inter, Libre_Caslon_Text } from "next/font/google";
import { getPublicSettings } from "@/lib/settings";
import { AttributionTracker } from "@/components/site/AttributionTracker";
import { AnalyticsTags } from "@/components/site/AnalyticsTags";
import "./home.css";

/**
 * The homepage runs its own route group so it can own its chrome end-to-end:
 * its own fixed nav, its own footer, its own type stack and palette. The
 * `(site)` layout's SiteHeader/SiteFooter deliberately do NOT apply here —
 * the landing design ships a bespoke nav that transitions on scroll and a
 * minimal footer, and layering the shared chrome on top would double them up.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-home-sans",
  display: "swap",
});

const caslon = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-home-display",
  display: "swap",
});

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
    <div className={`mb-home ${inter.variable} ${caslon.variable}`}>
      <AnalyticsTags gaId={settings.gaId} googleAdsId={settings.googleAdsId} />
      <AttributionTracker />
      {children}
    </div>
  );
}
