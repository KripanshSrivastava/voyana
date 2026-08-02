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

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
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
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`h-full ${sans.variable} ${display.variable}`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
