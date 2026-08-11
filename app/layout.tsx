import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { getPublicSettings } from "@/lib/settings";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans-var",
  display: "swap",
});

// Italic variants intentionally omitted — no component uses italic Fraunces,
// and italic-latin subset URLs on fonts.gstatic.com/v38 have been returning
// 404s from Vercel's build environment, breaking Turbopack production builds.
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display-var",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getPublicSettings();
  const title = s.defaultSeoTitle || `${s.brandName} — ${s.tagline}`;
  return {
    title: { default: title, template: `%s · ${s.brandName}` },
    description:
      s.defaultSeoDescription ||
      "Tell us where you want to go and get personalized travel options from vetted travel experts.",
    metadataBase: new URL("http://localhost:3100"),
    openGraph: { title, type: "website" },
    icons: s.faviconUrl ? { icon: s.faviconUrl } : undefined,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`h-full ${sans.variable} ${display.variable}`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
