import Script from "next/script";

/**
 * Injects the Google tag (gtag.js) for GA4 and/or Google Ads only when an ID is
 * configured in admin Settings. Loads after the page is interactive so it never
 * blocks first render. Conversions fire via trackLeadConversion() in lib/attribution.
 */
export function AnalyticsTags({ gaId, googleAdsId }: { gaId?: string | null; googleAdsId?: string | null }) {
  const primary = gaId || googleAdsId;
  if (!primary) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${primary}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());
${gaId ? `gtag('config','${gaId}');` : ""}
${googleAdsId ? `gtag('config','${googleAdsId}',{'allow_enhanced_conversions':true});` : ""}`}
      </Script>
    </>
  );
}
