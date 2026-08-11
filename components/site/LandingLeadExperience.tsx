"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plane, Phone, Mail, MapPin, ShieldCheck } from "lucide-react";
// lucide-react@1.x has no brand-logo icons — use react-icons/fa for the four
// socials the SiteSetting.socials JSON captures.
import { FaFacebookF, FaInstagram, FaTwitter, FaYoutube, FaPinterestP, FaLinkedinIn } from "react-icons/fa";
import { CmsImage } from "@/components/site/CmsImage";
import { getAttribution, trackLeadConversion } from "@/lib/attribution";
import { formatINR } from "@/lib/utils";

type LandingContact = {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  footerText: string | null;
  socials: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    pinterest?: string;
    linkedin?: string;
  };
};

/* ------------------------------------------------------------------------ */
/*  Types                                                                    */
/* ------------------------------------------------------------------------ */

type Destination = {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  heroImage?: string | null;
  startingPrice?: number | null;
  tripTypes?: string | null;
  category?: string | null;
  _count?: { packages: number };
};

type PackageItem = {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  heroImage?: string | null;
  startingPrice?: number | null;
  offerPrice?: number | null;
  durationText?: string | null;
  durationDays?: number | null;
  durationNights?: number | null;
  destination?: { name: string } | null;
  images?: { url: string; isHero: boolean }[];
};

type Vendor = {
  id: string;
  companyName: string;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  profileImage?: string | null;
};

type VendorAdItem = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  landingUrl?: string | null;
  destination?: string | null;
  vendorName: string;
};

type ModalPrefill = {
  destination?: string;
  travelDate?: string;
  nights?: string;
  travelers?: string;
};

type ModalState = { open: boolean; prefill?: ModalPrefill; nonce: number };

/** Options rendered in the hero's Nights select. Kept short and human-shaped —
 *  agents want to plan around whole-week trips first, everything else can be
 *  picked in the modal step. Values are integer nights so they round-trip
 *  through the LeadPopupModal.nights state unchanged. */
const HERO_NIGHTS_OPTIONS = [
  { value: "3", label: "3 nights" },
  { value: "4", label: "4 nights" },
  { value: "5", label: "5 nights" },
  { value: "6", label: "6 nights" },
  { value: "7", label: "7 nights" },
  { value: "10", label: "10 nights" },
  { value: "14", label: "14 nights" },
];

const HERO_TRAVELLER_OPTIONS = [
  { value: "1", label: "1 Adult" },
  { value: "2", label: "2 Adults" },
  { value: "3", label: "3 Adults" },
  { value: "4", label: "4 Adults" },
  { value: "5", label: "5 Adults" },
  { value: "6", label: "6+ Adults" },
];

const TRIP_TABS = ["Holiday Packages", "Custom Trip", "Group Tours", "Honeymoon"] as const;

const DURATION_OPTIONS = [
  { value: "2", label: "2 Nights / 3 Days" },
  { value: "3", label: "3 Nights / 4 Days" },
  { value: "4", label: "4 Nights / 5 Days" },
  { value: "5", label: "5 Nights / 6 Days" },
  { value: "6", label: "6 Nights / 7 Days" },
  { value: "7", label: "7 Nights / 8 Days" },
  { value: "10", label: "10 Nights / 11 Days" },
];

/* ------------------------------------------------------------------------ */
/*  Shared inline style fragments (exact values from the design comp)        */
/* ------------------------------------------------------------------------ */

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1px solid oklch(0.85 0.01 55)",
  borderRadius: 6,
  fontSize: 14,
  fontFamily: "var(--font-home-sans), sans-serif",
  boxSizing: "border-box",
  background: "#fff",
  color: "var(--mb-ink)",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--mb-muted)",
  marginBottom: 6,
};

/* ------------------------------------------------------------------------ */
/*  Root                                                                     */
/* ------------------------------------------------------------------------ */

export function LandingLeadExperience({
  brandName = "MokshBooking",
  logoUrl,
  destinations,
  packages,
  tours,
  heroImage,
  // `vendors` is still accepted on the props type but intentionally not
  // destructured — the "Our verified travel partners" section was removed
  // until at least one agent is APPROVED + VERIFIED. Restore the destructure
  // when the section is re-added; the parent already passes it through.
  vendorAds = [],
  contact,
}: {
  brandName?: string;
  /** Uploaded brand logo from SiteSetting.logoUrl. When present, renders in
   *  place of the fallback plane mark in nav and footer. */
  logoUrl?: string | null;
  destinations: Destination[];
  packages: PackageItem[];
  tours: PackageItem[];
  heroImage?: string | null;
  vendors?: Vendor[];
  vendorAds?: VendorAdItem[];
  /** Contact + social + trust metadata rendered in the footer. Sourced from
   *  SiteSetting via getPublicSettings() so admin edits reflow immediately. */
  contact?: LandingContact;
}) {
  const [modal, setModal] = useState<ModalState>({ open: false, nonce: 0 });
  const [scrolled, setScrolled] = useState(false);
  const [parallax, setParallax] = useState(0);
  const [activeTab, setActiveTab] = useState<(typeof TRIP_TABS)[number]>("Holiday Packages");
  const [activePromo, setActivePromo] = useState(0);

  // Hero search bar: local state, no server calls until the user clicks Get
  // Quote and the modal opens with these values pre-filled. Keeps the hero
  // fast to interact with and avoids sending partial enquiries.
  const [heroSearch, setHeroSearch] = useState({
    destination: "",
    travelDate: "",
    nights: "5",
    travelers: "2",
  });

  const destinationNames = useMemo(() => {
    const names = new Set<string>();
    for (const d of destinations) names.add(d.name);
    for (const p of [...packages, ...tours]) if (p.destination?.name) names.add(p.destination.name);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [destinations, packages, tours]);

  const bannerImage = heroImage ?? destinations.find((d) => d.heroImage)?.heroImage ?? null;

  // Promo strip is driven by vendor ads that carry an image. Ads without a
  // background would render as an empty grey band, so they're filtered out.
  const promos = useMemo(() => {
    const withImages = vendorAds.filter((ad) => ad.imageUrl);
    if (withImages.length > 0) {
      return withImages.slice(0, 3).map((ad) => ({
        id: ad.id,
        imageUrl: ad.imageUrl!,
        eyebrow: `SPONSORED · ${ad.vendorName.toUpperCase()}`,
        headline: ad.title,
        cta: "View Offer",
        destination: ad.destination ?? undefined,
        landingUrl: ad.landingUrl ?? undefined,
      }));
    }
    if (!bannerImage) return [];
    return [
      {
        id: "default",
        imageUrl: bannerImage,
        eyebrow: "PLAN AHEAD",
        headline: "Expert-planned packages, built around how you travel",
        cta: "Get a Quote",
        destination: undefined as string | undefined,
        landingUrl: undefined as string | undefined,
      },
    ];
  }, [vendorAds, bannerImage]);

  const openLeadModal = useCallback((prefill?: ModalPrefill | string) => {
    // Back-compat: DestinationCard/PackageCard still call this with a bare
    // string. Normalise both shapes into the ModalPrefill object.
    const normalised: ModalPrefill | undefined = typeof prefill === "string"
      ? { destination: prefill }
      : prefill;
    setModal((current) => ({ open: true, prefill: normalised, nonce: current.nonce + 1 }));
  }, []);

  const openLeadModalFromHero = useCallback(() => {
    openLeadModal({
      destination: heroSearch.destination.trim() || undefined,
      travelDate: heroSearch.travelDate || undefined,
      nights: heroSearch.nights || undefined,
      travelers: heroSearch.travelers || undefined,
    });
  }, [heroSearch, openLeadModal]);

  useEffect(() => {
    const handler = () => openLeadModal();
    window.addEventListener("voyana:open-lead-modal", handler);
    return () => window.removeEventListener("voyana:open-lead-modal", handler);
  }, [openLeadModal]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      setParallax(Math.min(window.scrollY * 0.18, 100));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (promos.length <= 1) return;
    const timer = setInterval(() => setActivePromo((c) => (c + 1) % promos.length), 5000);
    return () => clearInterval(timer);
  }, [promos.length]);

  const navLinkColor = scrolled ? "var(--mb-ink)" : "#fff";

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/*  Nav — transparent gradient over the hero, cream + blur on scroll */}
      {/* ---------------------------------------------------------------- */}
      {/* Scroll state is expressed as a data attribute rather than inline
          styles so the responsive rules in LandingStyles can override padding
          cleanly — inline styles would otherwise force every breakpoint
          override to use !important. */}
      <nav className="mb-nav" data-scrolled={scrolled ? "true" : "false"}>
        <div className="mb-nav-brand">
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: navLinkColor }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandName} style={{ height: 32, width: "auto", display: "block" }} />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  width: 32,
                  height: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  background: scrolled ? "var(--mb-accent)" : "rgba(255,255,255,0.15)",
                  color: "#fff",
                  transition: "background 200ms",
                }}
              >
                <Plane style={{ width: 16, height: 16, transform: "rotate(-45deg)" }} />
              </span>
            )}
            <h1 style={{ fontSize: 22, letterSpacing: "0.2px", color: navLinkColor, margin: 0 }}>{brandName}</h1>
          </Link>
        </div>
        <div className="mb-nav-links">
          <Link href="/" style={{ color: navLinkColor }}>Home</Link>
          <a href="#destinations" style={{ color: navLinkColor }}>Destinations</a>
          <Link href="/tours" style={{ color: navLinkColor }}>Tours</Link>
          <Link href="/packages" style={{ color: navLinkColor }}>Packages</Link>
          <a href="#how-it-works" style={{ color: navLinkColor }}>How It Works</a>
          <Link href="/about" style={{ color: navLinkColor }}>About</Link>
        </div>
        <div className="mb-nav-actions">
          <Link href="/login" style={{ color: navLinkColor }}>Login</Link>
          <button type="button" onClick={() => openLeadModal()} className="mb-btn-accent mb-nav-cta">
            Get Started
          </button>
        </div>
      </nav>

      {/* ---------------------------------------------------------------- */}
      {/*  Hero — 44% dark panel + image with floating status cards          */}
      {/* ---------------------------------------------------------------- */}
      <header className="mb-hero">
        <div className="mb-hero-panel">
          <h2
            style={{
              fontSize: "clamp(34px,4.2vw,52px)",
              lineHeight: 1.12,
              color: "#fff",
              marginBottom: 22,
            }}
          >
            Your Journey Starts With the Right Booking.
          </h2>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "var(--mb-on-dark)", marginBottom: 34 }}>
            Discover destinations, connect with trusted travel professionals, and turn your travel plans into unforgettable experiences.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => document.getElementById("destinations")?.scrollIntoView({ behavior: "smooth" })}
              className="mb-btn-cream"
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--mb-ink)",
                background: "#fff",
                padding: "14px 28px",
                borderRadius: 5,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Explore Destinations
            </button>
            <button
              type="button"
              onClick={() => openLeadModal()}
              className="mb-btn-ghost"
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "#fff",
                background: "transparent",
                border: "1px solid oklch(0.9 0.01 40 / 0.6)",
                padding: "13px 27px",
                borderRadius: 5,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Plan My Trip
            </button>
          </div>
        </div>

        <div style={{ position: "relative", flex: "1 1 auto", minWidth: 0 }}>
          {bannerImage ? (
            <CmsImage src={bannerImage} alt="" priority sizes="(max-width: 900px) 100vw, 56vw" className="absolute inset-0 h-full w-full" />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "oklch(0.3 0.02 30)" }} />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, oklch(0.15 0.02 30 / 0.3) 0%, transparent 30%, oklch(0.15 0.02 30 / 0.35) 100%)",
              pointerEvents: "none",
            }}
          />

          <div
            className="mb-hero-cards"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              transform: `translateY(${-parallax}px)`,
              left: 17,
              top: 40,
            }}
          >
            <div
              style={{
                position: "absolute",
                right: 48,
                top: 70,
                width: 240,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 26px 48px oklch(0.1 0.02 30 / 0.3)",
                padding: "16px 18px",
                zIndex: 2,
                pointerEvents: "auto",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--mb-accent)", fontWeight: 600, letterSpacing: "0.4px", marginBottom: 6 }}>
                NEW ENQUIRY
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Dubai Holiday · 2 Adults</div>
              <div style={{ fontSize: 12.5, color: "var(--mb-muted)" }}>5 nights · Travel 18 Sep</div>
            </div>

            <div
              style={{
                position: "absolute",
                right: 80,
                top: 240,
                width: 210,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 26px 48px oklch(0.1 0.02 30 / 0.3)",
                padding: "16px 18px",
                zIndex: 2,
                pointerEvents: "auto",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Goa, India</div>
                <div style={{ fontSize: 12, color: "var(--mb-muted)" }}>4N/5D</div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--mb-muted)", marginBottom: 10 }}>Family trip · Starting ₹14,000</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--mb-accent)" }}>Get Quote →</div>
            </div>

            <div
              style={{
                position: "absolute",
                right: 44,
                bottom: 56,
                width: 250,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 26px 48px oklch(0.1 0.02 30 / 0.3)",
                padding: "16px 18px",
                zIndex: 2,
                pointerEvents: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mb-green)" }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.4 0.015 30)", letterSpacing: "0.3px" }}>
                  BOOKING CONFIRMED
                </div>
              </div>
              <div style={{ fontSize: 13.5, color: "var(--mb-muted)" }}>Rajasthan Heritage Tour · 6N/7D</div>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/*  Search bar — overlaps the hero bottom edge                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="mb-search-wrap">
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 30px 60px oklch(0.15 0.02 30 / 0.22)",
            border: "1px solid var(--mb-line-2)",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", borderBottom: "1px solid var(--mb-line-2)", flexWrap: "wrap" }}>
            {TRIP_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "16px 26px",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  color: activeTab === tab ? "var(--mb-accent)" : "var(--mb-muted)",
                  background: "none",
                  borderTop: "none",
                  borderRight: "none",
                  borderLeft: "none",
                  borderBottomWidth: 2,
                  borderBottomStyle: "solid",
                  borderBottomColor: activeTab === tab ? "var(--mb-accent)" : "transparent",
                  fontFamily: "inherit",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Editable hero search. Each cell holds a real input; clicking
              Get Quote opens the enquiry modal pre-filled with these values
              so the user only needs to add their name + phone + email. */}
          <form
            className="mb-search-grid"
            onSubmit={(e) => { e.preventDefault(); openLeadModalFromHero(); }}
          >
            <SearchFacetInput label="DESTINATION">
              <input
                type="text"
                list="mb-hero-destinations"
                placeholder="Where to?"
                value={heroSearch.destination}
                onChange={(e) => setHeroSearch((s) => ({ ...s, destination: e.target.value }))}
                className="mb-search-input"
                autoComplete="off"
              />
              <datalist id="mb-hero-destinations">
                {destinationNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </SearchFacetInput>
            <SearchFacetInput label="TRAVEL DATE">
              <input
                type="date"
                value={heroSearch.travelDate}
                onChange={(e) => setHeroSearch((s) => ({ ...s, travelDate: e.target.value }))}
                className="mb-search-input"
                min={new Date().toISOString().slice(0, 10)}
              />
            </SearchFacetInput>
            <SearchFacetInput label="NIGHTS">
              <select
                value={heroSearch.nights}
                onChange={(e) => setHeroSearch((s) => ({ ...s, nights: e.target.value }))}
                className="mb-search-input"
              >
                {HERO_NIGHTS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </SearchFacetInput>
            <SearchFacetInput label="TRAVELERS" last>
              <select
                value={heroSearch.travelers}
                onChange={(e) => setHeroSearch((s) => ({ ...s, travelers: e.target.value }))}
                className="mb-search-input"
              >
                {HERO_TRAVELLER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </SearchFacetInput>
            <div className="mb-search-cta">
              <button type="submit" className="mb-btn-accent mb-quote-btn">
                Get Quote
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/*  Destinations                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section id="destinations" className="mb-section-destinations">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 52, gap: 16, flexWrap: "wrap" }}>
          <h2 className="mb-h2">Where do you want to go?</h2>
          <Link href="/destinations" style={{ fontSize: 14.5, fontWeight: 500 }}>View all destinations →</Link>
        </div>
        {destinations.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--mb-muted)", border: "1px solid var(--mb-line)", borderRadius: 8, padding: 40, textAlign: "center", background: "#fff" }}>
            Destinations are being curated by the {brandName} team. Check back shortly.
          </p>
        ) : (
          <div className="mb-grid-4" style={{ perspective: 1200 }}>
            {destinations.slice(0, 8).map((d) => (
              <DestinationCard key={d.id} d={d} onSelect={openLeadModal} />
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/*  Promo carousel                                                   */}
      {/* ---------------------------------------------------------------- */}
      {promos.length > 0 && (
        <section className="mb-section-promo">
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", height: 220 }}>
            {promos.map((promo, i) => {
              const isActive = i === activePromo;
              return (
                <div
                  key={promo.id}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    opacity: isActive ? 1 : 0,
                    transition: "opacity 0.6s ease",
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                >
                  <CmsImage src={promo.imageUrl} alt={promo.headline} sizes="(max-width: 900px) 100vw, 1224px" className="absolute inset-0 h-full w-full" />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(90deg, oklch(0.15 0.02 30 / 0.72) 0%, oklch(0.15 0.02 30 / 0.35) 55%, oklch(0.15 0.02 30 / 0.1) 100%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div className="mb-promo-content">
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.4px", color: "var(--mb-accent-light)", marginBottom: 10 }}>
                      {promo.eyebrow}
                    </div>
                    <h3 style={{ fontSize: 26, color: "#fff", marginBottom: 10, lineHeight: 1.2 }}>{promo.headline}</h3>
                    {promo.landingUrl ? (
                      <a
                        href={promo.landingUrl}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="mb-btn-cream"
                        style={{ display: "inline-block", fontSize: 14, fontWeight: 500, color: "var(--mb-ink)", background: "#fff", padding: "11px 22px", borderRadius: 6 }}
                      >
                        {promo.cta}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openLeadModal(promo.destination)}
                        className="mb-btn-cream"
                        style={{ fontSize: 14, fontWeight: 500, color: "var(--mb-ink)", background: "#fff", padding: "11px 22px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        {promo.cta}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {promos.length > 1 && (
              <div style={{ position: "absolute", bottom: 16, left: 48, zIndex: 3, display: "flex", gap: 8 }}>
                {promos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Show promo ${i + 1}`}
                    onClick={() => setActivePromo(i)}
                    style={{
                      width: i === activePromo ? 22 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: i === activePromo ? "#fff" : "oklch(1 0 0 / 0.45)",
                      cursor: "pointer",
                      transition: "width 0.3s ease",
                      border: "none",
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/*  Popular Tour Packages                                            */}
      {/* ---------------------------------------------------------------- */}
      {(packages.length > 0 || tours.length > 0) && (
        <section className="mb-section-packages">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <h2 className="mb-h2">Popular Tour Packages</h2>
          </div>
          <p style={{ fontSize: 14.5, color: "var(--mb-muted)", maxWidth: 560, margin: "0 0 44px" }}>
            Fixed itineraries with flights, stays, and sightseeing bundled in — different from a destination enquiry, where we build the trip around you.
          </p>
          <div className="mb-grid-3">
            {[...packages, ...tours].slice(0, 6).map((p) => (
              <PackageCard key={p.id} p={p} onSelect={openLeadModal} />
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/*  How it works                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section id="how-it-works" className="mb-section-how">
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <h2 className="mb-h2" style={{ marginBottom: 60 }}>How {brandName} works</h2>
          <div className="mb-grid-4-wide">
            {[
              { n: "01", t: "Tell us your plan", d: "Share where you want to go, when, and with whom." },
              { n: "02", t: "We connect your enquiry", d: "Your request reaches relevant travel professionals." },
              { n: "03", t: "Travel professionals respond", d: "Compare options built around your budget and preferences." },
              { n: "04", t: "Choose and book your trip", d: "Confirm with the professional you trust most." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div style={{ fontFamily: "var(--font-home-display), serif", fontSize: 15, color: "var(--mb-accent)", marginBottom: 18 }}>
                  {s.n}
                </div>
                <h3 style={{ fontSize: 20, marginBottom: 10 }}>{s.t}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--mb-muted)" }}>{s.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/*  Why MokshBooking                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="mb-section-why">
        <h2 className="mb-h2" style={{ marginBottom: 56 }}>Why {brandName}</h2>
        <div className="mb-grid-why">
          {[
            { t: "Trusted Travel Professionals", d: "Connect with professional travel partners." },
            { t: "Smart Enquiry Matching", d: "Your requirements reach relevant professionals." },
            { t: "Domestic & International", d: "Explore trips across India and worldwide." },
            { t: "Faster Responses", d: "Get travel options without hours of searching." },
            { t: "Personalized Trips", d: "Built around your budget and preferences." },
            { t: "Easy Booking", d: "A simple enquiry-to-booking experience." },
          ].map((f, i) => (
            <Reveal key={f.t} delay={i * 0.06}>
              <div style={{ display: "flex", gap: 18 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    border: "1.5px solid var(--mb-accent)",
                    flex: "none",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--mb-accent)",
                      transform: "translate(-50%,-50%)",
                    }}
                  />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, marginBottom: 8 }}>{f.t}</h3>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--mb-muted)" }}>{f.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Verified partners section intentionally removed until at least one
          vendor is APPROVED + VERIFIED. When that happens, restore the
          block using the `vendors` prop already threaded through. */}

      <LandingFooter brandName={brandName} logoUrl={logoUrl} contact={contact} />

      <LeadPopupModal
        key={modal.nonce}
        open={modal.open}
        prefill={modal.prefill}
        destinations={destinationNames}
        onClose={() => setModal((current) => ({ ...current, open: false }))}
      />

      <LandingStyles />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/*  Sub-components                                                           */
/* ------------------------------------------------------------------------ */

/** One cell of the hero search bar. The label is fixed, the value slot
 *  accepts any control (text input, date input, native select). Native
 *  controls stay borderless and inherit typography from CSS so they read
 *  like text in the design comp instead of chrome-heavy form fields. */
function SearchFacetInput({ label, last, children }: { label: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={last ? "mb-facet mb-facet-last" : "mb-facet"}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.3px", color: "var(--mb-muted-2)", marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

/** Pointer-tilt wrapper used by both card grids — writes `transform` directly
 *  so it composes with the CSS hover shadow without fighting it. */
function useTilt() {
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateY(-4px)`;
  }, []);
  const onMouseLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = "";
  }, []);
  return { onMouseMove, onMouseLeave };
}

function DestinationCard({ d, onSelect }: { d: Destination; onSelect: (destination: string) => void }) {
  const tilt = useTilt();
  const tag = d.category === "INTERNATIONAL" ? "International" : d.category === "INBOUND" ? "Inbound" : "Domestic";
  const duration = d._count?.packages ? `${d._count.packages} pkg${d._count.packages === 1 ? "" : "s"}` : null;

  return (
    <div
      {...tilt}
      onClick={() => onSelect(d.name)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(d.name); } }}
      className="mb-card"
      style={{
        borderRadius: 8,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid var(--mb-line)",
        cursor: "pointer",
      }}
    >
      <div style={{ position: "relative", height: 190, overflow: "hidden" }}>
        <CmsImage src={d.heroImage} alt={d.name} placeholderLabel={d.name} sizes="(max-width: 900px) 100vw, 300px" className="absolute inset-0 h-full w-full mb-zoom" />
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.3px",
            color: "#fff",
            background: "var(--mb-scrim)",
            padding: "4px 10px",
            borderRadius: 4,
            pointerEvents: "none",
          }}
        >
          {tag}
        </div>
      </div>
      <div style={{ padding: "18px 18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 8 }}>
          <h3 style={{ fontSize: 19 }}>{d.name}</h3>
          {duration && <span style={{ fontSize: 12, color: "var(--mb-muted)", flex: "none" }}>{duration}</span>}
        </div>
        {d.shortDescription && (
          <p className="mb-clamp-2" style={{ fontSize: 13.5, color: "var(--mb-muted)", lineHeight: 1.5, margin: "0 0 14px" }}>
            {d.shortDescription}
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--mb-line-2)", paddingTop: 14 }}>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--mb-muted-2)", letterSpacing: "0.3px" }}>STARTING FROM</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{d.startingPrice ? formatINR(d.startingPrice) : "On request"}</div>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--mb-accent)", display: "flex", alignItems: "center", gap: 4 }}>
            Get Quote <span>→</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function PackageCard({ p, onSelect }: { p: PackageItem; onSelect: (destination?: string) => void }) {
  const tilt = useTilt();
  const hero = p.heroImage || p.images?.find((i) => i.isHero)?.url || p.images?.[0]?.url || null;
  const duration =
    p.durationText ||
    (p.durationNights && p.durationDays
      ? `${p.durationNights}N/${p.durationDays}D`
      : p.durationDays
      ? `${p.durationDays}D`
      : null);
  const price = p.offerPrice ?? p.startingPrice;
  const destination = p.destination?.name ?? undefined;

  return (
    <div
      {...tilt}
      onClick={() => onSelect(destination)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(destination); } }}
      className="mb-card"
      style={{
        borderRadius: 8,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid var(--mb-line)",
        cursor: "pointer",
      }}
    >
      <div style={{ position: "relative", height: 150, overflow: "hidden" }}>
        <CmsImage src={hero} alt={p.title} placeholderLabel={p.title} sizes="(max-width: 900px) 100vw, 400px" className="absolute inset-0 h-full w-full mb-zoom" />
      </div>
      <div style={{ padding: 18 }}>
        <h3 style={{ fontSize: 17, marginBottom: 6 }}>{p.title}</h3>
        <div style={{ fontSize: 12.5, color: "var(--mb-muted)", marginBottom: 12 }}>
          {[destination, duration].filter(Boolean).join(" · ")}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--mb-line-2)", paddingTop: 14 }}>
          <div>
            <div style={{ fontSize: 10.5, color: "var(--mb-muted-2)", letterSpacing: "0.3px" }}>PACKAGE PRICE</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{price ? formatINR(price) : "On request"}</div>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--mb-accent)" }}>View Itinerary →</span>
        </div>
      </div>
    </div>
  );
}

/** IntersectionObserver-driven fade-up, matching the comp's `data-reveal`. */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px 100px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={visible ? "mb-reveal is-visible" : "mb-reveal"}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/*  Landing footer — brand + explore/travel-agents/support columns +          */
/*  address/phone/email + social icons + secure-payment trust badge +         */
/*  privacy/terms row. Everything text-based comes from SiteSetting via the   */
/*  contact prop, so admin edits reflow the next revalidate cycle.            */
/* ------------------------------------------------------------------------ */

function LandingFooter({ brandName, logoUrl, contact }: { brandName: string; logoUrl?: string | null; contact?: LandingContact }) {
  const year = new Date().getFullYear();
  const socials = contact?.socials ?? {};
  const socialLinks = [
    { key: "facebook", href: socials.facebook, Icon: FaFacebookF, label: "Facebook" },
    { key: "instagram", href: socials.instagram, Icon: FaInstagram, label: "Instagram" },
    { key: "twitter", href: socials.twitter, Icon: FaTwitter, label: "Twitter" },
    { key: "youtube", href: socials.youtube, Icon: FaYoutube, label: "YouTube" },
    { key: "pinterest", href: socials.pinterest, Icon: FaPinterestP, label: "Pinterest" },
    { key: "linkedin", href: socials.linkedin, Icon: FaLinkedinIn, label: "LinkedIn" },
  ].filter((s) => s.href);

  return (
    <footer className="mb-landing-footer">
      <div className="mb-landing-footer-inner">
        {/* Brand block --------------------------------------------------- */}
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandName} style={{ height: 40, width: "auto", display: "block" }} />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  background: "var(--mb-accent)",
                  color: "#fff",
                }}
              >
                <Plane style={{ width: 18, height: 18, transform: "rotate(-45deg)" }} />
              </span>
            )}
            <h3 style={{ fontSize: 20, margin: 0, color: "var(--mb-ink)" }}>{brandName}</h3>
          </div>
          <p style={{ fontSize: 14, color: "var(--mb-muted)", lineHeight: 1.6, maxWidth: 300, margin: "0 0 18px" }}>
            {contact?.footerText || "Your trip. Your way. Trusted travel professionals crafting journeys around you."}
          </p>
          {/* Trust badge --------------------------------------------------- */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--mb-surface)",
              border: "1px solid var(--mb-line)",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 12.5,
              color: "var(--mb-ink)",
            }}
          >
            <ShieldCheck style={{ width: 14, height: 14, color: "var(--mb-green)" }} />
            <span style={{ fontWeight: 500 }}>Secure &amp; encrypted enquiries</span>
          </div>
        </div>

        {/* Explore column -------------------------------------------------- */}
        <div>
          <h4 className="mb-landing-footer-heading">Explore</h4>
          <ul className="mb-landing-footer-list">
            <li><Link href="/destinations">Destinations</Link></li>
            <li><Link href="/tours">Tours</Link></li>
            <li><Link href="/packages">Packages</Link></li>
            <li><Link href="/how-it-works">How It Works</Link></li>
            <li><Link href="/about">About</Link></li>
          </ul>
        </div>

        {/* Travel Agents column ------------------------------------------- */}
        <div>
          <h4 className="mb-landing-footer-heading">Travel Agents</h4>
          <ul className="mb-landing-footer-list">
            <li><Link href="/login?intent=agent">Vendor Login</Link></li>
            <li><Link href="/agent/signup">Become a Partner</Link></li>
            <li><Link href="/contact">Vendor Support</Link></li>
          </ul>
        </div>

        {/* Support / Contact column --------------------------------------- */}
        <div>
          <h4 className="mb-landing-footer-heading">Support</h4>
          <ul className="mb-landing-footer-list mb-landing-footer-contact">
            {contact?.phone && (
              <li>
                <a href={`tel:${contact.phone}`}>
                  <Phone style={{ width: 14, height: 14, color: "var(--mb-accent)" }} />
                  <span>{contact.phone}</span>
                </a>
              </li>
            )}
            {contact?.email && (
              <li>
                <a href={`mailto:${contact.email}`}>
                  <Mail style={{ width: 14, height: 14, color: "var(--mb-accent)" }} />
                  <span>{contact.email}</span>
                </a>
              </li>
            )}
            {contact?.address && (
              <li className="mb-landing-footer-address">
                <MapPin style={{ width: 14, height: 14, color: "var(--mb-accent)", marginTop: 3 }} />
                <span>{contact.address}</span>
              </li>
            )}
            <li>
              <Link href="/contact">
                <span style={{ fontSize: 13.5 }}>Contact us →</span>
              </Link>
            </li>
          </ul>

          {socialLinks.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              {socialLinks.map(({ key, href, Icon, label }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="mb-landing-footer-social"
                >
                  <Icon style={{ width: 15, height: 15 }} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legal row ------------------------------------------------------ */}
      <div className="mb-landing-footer-legal">
        <span>© {year} {brandName}. All rights reserved.</span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------------ */
/*  Enquiry modal — exact design chrome, existing lead payload               */
/* ------------------------------------------------------------------------ */

function LeadPopupModal({
  open,
  prefill,
  destinations,
  onClose,
}: {
  open: boolean;
  /** Values pre-filled from the hero search bar (or a card click). Only the
   *  fields the caller knew about are seeded — the rest keep their defaults. */
  prefill?: ModalPrefill;
  destinations: string[];
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ name: string; destination: string } | null>(null);
  const [form, setForm] = useState({
    customerName: "",
    destinationText: prefill?.destination ?? "",
    departureCity: "",
    travelDate: prefill?.travelDate ?? "",
    nights: prefill?.nights ?? "5",
    adults: prefill?.travelers ?? "2",
    children: "0",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const titleDestination = form.destinationText || prefill?.destination;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function validate(): string | null {
    if (form.customerName.trim().length < 2) return "Please enter your full name.";
    if (form.destinationText.trim().length < 2) return "Please select a destination.";
    if (form.departureCity.trim().length < 2) return "Please enter your city.";
    const nights = Number(form.nights);
    if (!Number.isInteger(nights) || nights < 1 || nights > 60) return "Please choose a trip duration.";
    const adults = Number(form.adults);
    if (!Number.isInteger(adults) || adults < 1 || adults > 99) return "Please enter how many adults are travelling.";
    const children = Number(form.children || 0);
    if (!Number.isInteger(children) || children < 0 || children > 99) return "Please enter a valid children count (0 if none).";
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return "Please enter a valid phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Please enter a valid email address.";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadFormType: "landing-popup",
          customerName: form.customerName,
          destinationText: form.destinationText,
          departureCity: form.departureCity,
          travelDate: form.travelDate || undefined,
          nights: Number(form.nights),
          adults: Number(form.adults),
          children: Number(form.children || 0),
          travelers: Number(form.adults) + Number(form.children || 0),
          phone: form.phone,
          email: form.email,
          requirements: [`${Number(form.nights)} nights`],
          attribution: getAttribution(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Submission failed");
      trackLeadConversion({ leadCode: json.data.code });
      setSubmitted({ name: form.customerName.trim(), destination: form.destinationText.trim() });
      setStatus("success");
    } catch {
      setError("We couldn't submit your request. Please check your details and try again.");
      setStatus("idle");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0.15 0.02 30 / 0.55)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 10,
          width: 460,
          maxWidth: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 40px 80px oklch(0.1 0.02 30 / 0.35)",
          padding: "32px 32px 28px",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 20,
            right: 22,
            fontSize: 18,
            color: "var(--mb-muted-3)",
            cursor: "pointer",
            background: "none",
            border: "none",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {status === "success" && submitted ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.4px", color: "var(--mb-accent)", fontWeight: 600, marginBottom: 8 }}>
              ENQUIRY RECEIVED
            </div>
            <h2 style={{ fontSize: 24, marginBottom: 12 }}>Thanks, {submitted.name}.</h2>
            <p style={{ fontSize: 14, color: "var(--mb-muted)", lineHeight: 1.6, marginBottom: 24 }}>
              We&apos;ve received your request for {submitted.destination}. Our travel professionals will contact you shortly.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mb-btn-accent"
              style={{ fontSize: 15, fontWeight: 500, color: "#fff", background: "var(--mb-accent)", padding: "13px 28px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, letterSpacing: "0.4px", color: "var(--mb-accent)", fontWeight: 600, marginBottom: 8 }}>
              TRAVEL ENQUIRY
            </div>
            <h2 style={{ fontSize: 24, marginBottom: 24 }}>
              Plan your trip{titleDestination ? ` to ${titleDestination}` : ""}
            </h2>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={LABEL_STYLE}>Full Name</label>
                  <input autoFocus type="text" placeholder="Your name" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Traveling From</label>
                  <input type="text" placeholder="Your city" value={form.departureCity} onChange={(e) => set("departureCity", e.target.value)} style={INPUT_STYLE} />
                </div>
              </div>

              <div>
                <label style={LABEL_STYLE}>Destination</label>
                <select value={form.destinationText} onChange={(e) => set("destinationText", e.target.value)} style={INPUT_STYLE}>
                  <option value="">Select Destination</option>
                  {destinations.map((destination) => (
                    <option key={destination} value={destination}>{destination}</option>
                  ))}
                  {form.destinationText && !destinations.includes(form.destinationText) && (
                    <option value={form.destinationText}>{form.destinationText}</option>
                  )}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={LABEL_STYLE}>Travel Date</label>
                  <input type="date" value={form.travelDate} onChange={(e) => set("travelDate", e.target.value)} style={{ ...INPUT_STYLE, color: "var(--mb-muted)" }} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Duration</label>
                  <select value={form.nights} onChange={(e) => set("nights", e.target.value)} style={INPUT_STYLE}>
                    {DURATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={LABEL_STYLE}>Adults</label>
                  <input type="number" min={1} max={99} value={form.adults} onChange={(e) => set("adults", e.target.value)} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Children</label>
                  <input type="number" min={0} max={99} value={form.children} onChange={(e) => set("children", e.target.value)} style={INPUT_STYLE} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={LABEL_STYLE}>Phone Number</label>
                  <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set("phone", e.target.value)} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Email Address</label>
                  <input type="email" placeholder="you@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} style={INPUT_STYLE} />
                </div>
              </div>

              {error && (
                <p role="alert" style={{ fontSize: 13, color: "oklch(0.5 0.18 20)", background: "oklch(0.96 0.03 20)", padding: "10px 12px", borderRadius: 6, margin: 0 }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mb-btn-accent"
                style={{
                  textAlign: "center",
                  marginTop: 8,
                  fontSize: 15,
                  fontWeight: 500,
                  color: "#fff",
                  background: "var(--mb-accent)",
                  padding: 13,
                  borderRadius: 6,
                  border: "none",
                  cursor: status === "submitting" ? "not-allowed" : "pointer",
                  opacity: status === "submitting" ? 0.7 : 1,
                  fontFamily: "inherit",
                }}
              >
                {status === "submitting" ? "Submitting…" : "Submit Enquiry"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/*  Layout + hover CSS that inline styles can't express                      */
/* ------------------------------------------------------------------------ */

function LandingStyles() {
  return (
    <style>{`
      /* --- Nav ------------------------------------------------------- */
      .mb-nav {
        position: fixed; top: 0; left: 0; right: 0; z-index: 100;
        display: flex; align-items: center; justify-content: space-between;
        column-gap: 24px; padding: 22px 48px;
        background: linear-gradient(180deg, oklch(0.12 0.015 30 / 0.75), oklch(0.12 0.015 30 / 0));
        border-bottom: 1px solid transparent;
        transition: all 0.3s ease;
      }
      .mb-nav[data-scrolled="true"] {
        padding: 12px 48px;
        background: oklch(0.975 0.007 60 / 0.94);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--mb-line);
      }
      .mb-nav-brand { display: flex; align-items: baseline; gap: 8px; flex: none; }
      .mb-nav-links {
        display: flex; align-items: center; gap: clamp(12px,2vw,32px);
        flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden;
        justify-content: center; font-size: clamp(12px,1.1vw,14.5px);
      }
      .mb-nav-links a { opacity: 0.9; }
      .mb-nav-links a:hover { opacity: 1; }
      .mb-nav-actions {
        display: flex; align-items: center; gap: clamp(10px,1.5vw,20px);
        flex: none; white-space: nowrap; font-size: clamp(12px,1.1vw,14.5px);
      }
      .mb-nav-cta {
        font-weight: 500; color: #fff; background: var(--mb-accent);
        padding: 10px clamp(14px,2vw,22px); border-radius: 5px; border: none;
        cursor: pointer; font-size: inherit; font-family: inherit;
      }

      /* --- Search bar cells ------------------------------------------ */
      .mb-facet { padding: 18px 24px; border-right: 1px solid var(--mb-line-3); }
      .mb-facet-last { border-right: none; }
      .mb-search-cta { display: flex; align-items: center; padding: 0 22px; }
      .mb-quote-btn {
        font-size: 14.5px; font-weight: 500; color: #fff; background: var(--mb-accent);
        padding: 14px 26px; border-radius: 6px; white-space: nowrap; border: none;
        cursor: pointer; width: 100%; font-family: inherit;
      }
      /* Native inputs styled to blend into the search cells — no default
         form chrome, just the same 15px medium text the old static value
         div used. Focus ring is minimal (accent underline) so the hero
         stays clean. */
      .mb-search-input {
        width: 100%;
        border: none;
        background: transparent;
        padding: 0;
        margin: 0;
        font-size: 15px;
        font-weight: 500;
        color: var(--mb-ink);
        font-family: inherit;
        appearance: none;
        -webkit-appearance: none;
        cursor: pointer;
      }
      .mb-search-input:focus { outline: none; color: var(--mb-accent); }
      .mb-search-input::placeholder { color: var(--mb-muted-2); font-weight: 400; }
      /* Date inputs on Chrome show a picker indicator we want to keep clickable
         but visually low-key. */
      .mb-search-input[type="date"]::-webkit-calendar-picker-indicator {
        cursor: pointer; opacity: 0.55;
      }
      /* Selects still get a caret via the native UI — Firefox and Safari need
         it too. */
      select.mb-search-input { padding-right: 16px; }

      .mb-h2 { font-size: 38px; color: var(--mb-ink); }

      .mb-hero { position: relative; height: 82vh; min-height: 580px; overflow: hidden; display: flex; }
      .mb-hero-panel {
        flex: 0 0 44%; min-width: 420px; background: var(--mb-ink); position: relative; z-index: 2;
        display: flex; flex-direction: column; justify-content: center; padding: 0 clamp(32px,5vw,64px);
      }
      .mb-search-wrap { position: relative; z-index: 5; max-width: 1180px; margin: -52px auto 0; padding: 0 48px; }
      .mb-search-grid { display: grid; grid-template-columns: 1.4fr 1fr 0.8fr 0.8fr auto; gap: 0; align-items: stretch; }
      .mb-section-destinations { padding: 80px 48px 110px; max-width: 1320px; margin: 0 auto; }
      .mb-section-promo { padding: 0 48px; max-width: 1320px; margin: 0 auto 110px; }
      .mb-promo-content { position: relative; z-index: 2; padding: 0 48px; max-width: 560px; }
      .mb-section-packages { padding: 0 48px 110px; max-width: 1320px; margin: 0 auto; }
      .mb-section-how { padding: 110px 48px; background: var(--mb-surface); }
      .mb-section-why { padding: 110px 48px; max-width: 1320px; margin: 0 auto; }
      .mb-section-vendors { padding: 0 48px 110px; max-width: 1320px; margin: 0 auto; }

      /* --- Landing footer -------------------------------------------- */
      .mb-landing-footer {
        border-top: 1px solid var(--mb-line);
        background: var(--mb-surface);
        margin-top: 48px;
      }
      .mb-landing-footer-inner {
        max-width: 1320px; margin: 0 auto;
        padding: 64px 48px 40px;
        display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.2fr; gap: 48px;
      }
      .mb-landing-footer-heading {
        font-size: 13px; font-weight: 600; color: var(--mb-ink);
        letter-spacing: 0.5px; text-transform: uppercase; margin: 6px 0 16px;
      }
      .mb-landing-footer-list { list-style: none; padding: 0; margin: 0; }
      .mb-landing-footer-list li { margin-bottom: 10px; font-size: 14px; }
      .mb-landing-footer-list a {
        color: var(--mb-muted); text-decoration: none; transition: color 150ms;
        display: inline-flex; align-items: center; gap: 8px;
      }
      .mb-landing-footer-list a:hover { color: var(--mb-ink); }
      .mb-landing-footer-contact li { margin-bottom: 12px; }
      .mb-landing-footer-address { display: flex; gap: 8px; color: var(--mb-muted); font-size: 13.5px; line-height: 1.5; }
      .mb-landing-footer-social {
        display: inline-flex; width: 34px; height: 34px; align-items: center; justify-content: center;
        border-radius: 8px; background: #fff; border: 1px solid var(--mb-line);
        color: var(--mb-muted); transition: all 150ms;
      }
      .mb-landing-footer-social:hover { color: var(--mb-accent); border-color: var(--mb-accent); }
      .mb-landing-footer-legal {
        border-top: 1px solid var(--mb-line);
        max-width: 1320px; margin: 0 auto;
        padding: 20px 48px;
        display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
        font-size: 12.5px; color: var(--mb-muted);
      }
      .mb-landing-footer-legal a { color: var(--mb-muted); text-decoration: none; }
      .mb-landing-footer-legal a:hover { color: var(--mb-ink); }
      .mb-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 28px; }
      .mb-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; }
      .mb-grid-4-wide { display: grid; grid-template-columns: repeat(4,1fr); gap: 40px; }
      .mb-grid-why { display: grid; grid-template-columns: repeat(3,1fr); gap: 32px 40px; }
      .mb-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

      .mb-btn-accent:hover { background: var(--mb-accent-dark); }
      .mb-btn-cream:hover { background: var(--mb-cream-hover); }
      .mb-btn-ghost:hover { border-color: #fff; background: oklch(1 0 0 / 0.08); }

      @media (max-width: 1100px) {
        .mb-grid-4, .mb-grid-4-wide { grid-template-columns: repeat(2,1fr); }
        .mb-grid-3, .mb-grid-why { grid-template-columns: repeat(2,1fr); }
      }

      @media (max-width: 900px) {
        .mb-nav, .mb-nav[data-scrolled="true"] { padding-left: 20px; padding-right: 20px; }
        .mb-nav-links { display: none; }
        .mb-hero { flex-direction: column; height: auto; min-height: 0; }
        .mb-hero-panel { flex: none; min-width: 0; width: 100%; padding: 110px 24px 56px; }
        .mb-hero > div:last-child { height: 320px; }
        .mb-hero-cards { display: none; }
        .mb-search-wrap { padding: 0 20px; margin-top: 24px; }
        .mb-search-grid { grid-template-columns: 1fr 1fr; }
        .mb-facet { border-right: none; border-bottom: 1px solid var(--mb-line-3); }
        .mb-search-cta { grid-column: 1 / -1; padding: 16px 20px; }
        .mb-section-destinations { padding: 56px 20px 72px; }
        .mb-section-promo { padding: 0 20px; margin-bottom: 72px; }
        .mb-promo-content { padding: 0 24px; }
        .mb-section-packages { padding: 0 20px 72px; }
        .mb-section-how { padding: 72px 20px; }
        .mb-section-why { padding: 72px 20px; }
        .mb-section-vendors { padding: 0 20px 72px; }
        .mb-landing-footer-inner {
          padding: 48px 20px 32px; grid-template-columns: 1fr 1fr; gap: 32px;
        }
        .mb-landing-footer-legal { padding: 20px; flex-direction: column; text-align: center; gap: 10px; }
        .mb-h2 { font-size: 28px; }
      }

      @media (max-width: 620px) {
        .mb-grid-4, .mb-grid-3, .mb-grid-4-wide, .mb-grid-why { grid-template-columns: 1fr; }
        .mb-search-grid { grid-template-columns: 1fr; }
        .mb-landing-footer-inner { grid-template-columns: 1fr; }
      }

      @media (prefers-reduced-motion: reduce) {
        .mb-reveal { opacity: 1; transform: none; transition: none; }
        .mb-card, .mb-card img, .mb-card .mb-zoom { transition: none; }
      }
    `}</style>
  );
}
