"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Compass, Lock, MapPin, ShieldCheck, Sparkles, UserCheck, Users, Scale, X, Loader2, Clock, ArrowUpRight, ChevronDown } from "lucide-react";
import { CmsImage } from "@/components/site/CmsImage";
import { WorldBackdrop } from "@/components/site/WorldBackdrop";
import { Reveal } from "@/components/site/Reveal";
import { Badge, Button, Field, Input, Select } from "@/components/ui";
import { getAttribution, trackLeadConversion } from "@/lib/attribution";
import { cn, formatINR, parseJson } from "@/lib/utils";

const CARD_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px";

type Destination = {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  heroImage?: string | null;
  startingPrice?: number | null;
  tripTypes?: string | null;
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

type ModalState = {
  open: boolean;
  destination?: string;
  nonce: number;
};

export function LandingLeadExperience({
  destinations,
  packages,
  tours,
  heroImage,
  vendors = [],
  vendorAds = [],
}: {
  destinations: Destination[];
  packages: PackageItem[];
  tours: PackageItem[];
  heroImage?: string | null;
  vendors?: Vendor[];
  vendorAds?: VendorAdItem[];
}) {
  const [modal, setModal] = useState<ModalState>({ open: false, nonce: 0 });
  const destinationNames = useMemo(() => {
    const names = new Set<string>();
    for (const d of destinations) names.add(d.name);
    for (const p of [...packages, ...tours]) if (p.destination?.name) names.add(p.destination.name);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [destinations, packages, tours]);

  // Real categories only — derived from each destination's actual tripTypes, in
  // first-seen order. Each tile links to the destination that offers it.
  const categories = useMemo(() => {
    const seen = new Map<string, Destination>();
    for (const d of destinations) {
      for (const type of parseJson<string[]>(d.tripTypes, [])) {
        if (type && !seen.has(type)) seen.set(type, d);
      }
    }
    return [...seen.entries()].slice(0, 6).map(([label, d]) => ({ label, destination: d }));
  }, [destinations]);

  const bannerImage = heroImage ?? destinations.find((d) => d.heroImage)?.heroImage ?? null;

  function openLeadModal(destination?: string) {
    setModal((current) => ({ open: true, destination, nonce: current.nonce + 1 }));
  }

  useEffect(() => {
    const handler = () => openLeadModal();
    window.addEventListener("voyana:open-lead-modal", handler);
    return () => window.removeEventListener("voyana:open-lead-modal", handler);
  }, []);

  return (
    <>
      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
        <div className="absolute inset-0 -z-10 hero-gradient">
          {heroImage ? (
            <>
              <CmsImage src={heroImage} alt="" priority sizes="100vw" className="h-full w-full" imgClassName="ken-burns opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-navy-950/55 to-navy-950/90" />
            </>
          ) : (
            <WorldBackdrop id="wb-hero" className="h-full w-full opacity-90" />
          )}
          <div className="absolute inset-0 hero-grain opacity-60" />
        </div>

        <div className="mx-auto w-full max-w-4xl px-4 py-24 text-center text-white sm:px-6 lg:px-8">
          <span className="rise rise-1 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-brand-200 backdrop-blur">
            <Sparkles className="h-4 w-4" /> Personalized trips, planned by experts
          </span>
          <h1 className="rise rise-2 mt-6 text-balance font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Your Next Great Escape<br className="hidden sm:block" /> Starts Here.
          </h1>
          <p className="rise rise-3 mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-navy-100/90 sm:text-xl">
            Find a journey worth remembering. Tell us where — our travel experts handle the rest.
          </p>
          <div className="rise rise-4 mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" variant="primary" size="lg" className="press shadow-lg shadow-sun-500/25" onClick={() => openLeadModal()}>
              Plan My Trip <ArrowRight className="h-5 w-5" />
            </Button>
            <Button type="button" variant="outline" size="lg" className="press border-white/25 bg-white/5 text-white backdrop-blur hover:bg-white/15" onClick={() => document.getElementById("popular-destinations")?.scrollIntoView({ behavior: "smooth" })}>
              Explore Destinations
            </Button>
          </div>
          <div className="rise rise-5 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-navy-200/80">
            <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-brand-300" /> Your details stay private</span>
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-brand-300" /> Max 2 experts per request</span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Scroll to explore"
          onClick={() => document.getElementById("popular-destinations")?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 animate-bounce flex-col items-center gap-1 text-white/70 transition-colors hover:text-white sm:flex"
        >
          <span className="text-xs font-medium uppercase tracking-widest">Scroll</span>
          <ChevronDown className="h-5 w-5" />
        </button>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Compass, title: "Tell us your trip", body: "Share destination, city, nights and contact details in under a minute." },
            { icon: Users, title: "Experts reach out", body: "Vetted travel professionals send you tailored options and pricing." },
            { icon: ShieldCheck, title: "You choose", body: "Compare freely. No pressure, no spam. Your details stay protected." },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 80} className="rounded-3xl border border-navy-100 bg-white p-6 shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-navy-900">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-navy-500">{f.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {destinations.length > 0 && (
        <Section id="popular-destinations" title="Where are you dreaming of going?" subtitle="Handpicked places our travel experts know inside out.">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {destinations.map((d, i) => (
              <Reveal key={d.id} delay={(i % 3) * 90} className={i % 3 === 0 ? "sm:col-span-2" : ""}>
                <DestinationLeadCard d={d} big={i % 3 === 0} onSelect={openLeadModal} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="relative isolate flex min-h-[420px] items-center justify-center overflow-hidden rounded-[2rem] px-6 py-20 text-center text-white sm:px-12">
          <div className="absolute inset-0 -z-10 hero-gradient">
            {bannerImage ? (
              <>
                <CmsImage src={bannerImage} alt="" sizes="(max-width: 640px) 100vw, min(100vw, 1280px)" className="h-full w-full" imgClassName="ken-burns opacity-45" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/45 to-navy-950/70" />
              </>
            ) : (
              <WorldBackdrop id="wb-banner" className="h-full w-full opacity-90" />
            )}
            <div className="absolute inset-0 hero-grain opacity-50" />
          </div>
          <div className="max-w-xl">
            <p className="font-display text-2xl italic leading-snug sm:text-3xl">
              &ldquo;Some journeys become your best memories.&rdquo;
            </p>
            <Button type="button" variant="primary" size="lg" className="press mt-7 shadow-lg shadow-sun-500/25" onClick={() => openLeadModal()}>
              Explore <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </Reveal>
      </section>

      {categories.length > 0 && (
        <Section id="experiences" title="Choose your kind of escape" subtitle="Every trip starts with a feeling. What's yours?">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c, i) => (
              <Reveal key={c.label} delay={(i % 6) * 70}>
                <button
                  type="button"
                  onClick={() => openLeadModal(c.destination.name)}
                  className="group relative block aspect-[3/4] w-full overflow-hidden rounded-2xl bg-navy-950 text-left shadow-sm transition-shadow duration-300 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <CmsImage src={c.destination.heroImage} alt={c.label} placeholderLabel={c.label} sizes="(max-width: 640px) 50vw, 200px" className="h-full w-full" imgClassName="transition-transform duration-[900ms] ease-out group-hover:scale-110" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-3 font-display text-sm font-semibold text-white sm:text-base">{c.label}</span>
                </button>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {(packages.length > 0 || tours.length > 0) && (
        <Section title="Featured travel experiences" subtitle="Real itineraries our experts have put together — enquire and we'll tailor it to you.">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...packages, ...tours].map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 90}>
                <PackageLeadCard p={p} onSelect={openLeadModal} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {vendorAds.length > 0 && (
        <Section title="Featured offers from our partners" subtitle="Promoted by verified travel partners on Moksh Booking.">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vendorAds.map((ad, i) => (
              <Reveal key={ad.id} delay={(i % 3) * 90}>
                <a
                  href={ad.landingUrl || "#"}
                  target={ad.landingUrl ? "_blank" : undefined}
                  rel={ad.landingUrl ? "noopener noreferrer sponsored" : undefined}
                  onClick={(e) => { if (!ad.landingUrl) { e.preventDefault(); openLeadModal(ad.destination ?? undefined); } }}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <CmsImage src={ad.imageUrl} alt={ad.title} placeholderLabel={ad.title} sizes={CARD_SIZES} className="h-44 w-full" />
                  <div className="flex flex-1 flex-col p-5">
                    <span className="text-xs font-medium uppercase tracking-wide text-brand-600">Sponsored · {ad.vendorName}</span>
                    <h3 className="mt-1 font-display text-lg font-semibold text-navy-900">{ad.title}</h3>
                    {ad.description && <p className="mt-1 line-clamp-2 text-sm text-navy-500">{ad.description}</p>}
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {vendors.length > 0 && (
        <Section title="Our verified travel partners" subtitle="Real travel businesses, vetted and approved by the Moksh Booking team.">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((v, i) => (
              <Reveal key={v.id} delay={(i % 3) * 90} className="flex items-center gap-4 rounded-3xl border border-navy-100 bg-white p-5 shadow-sm">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-navy-50 text-lg font-bold text-navy-700">
                  {v.profileImage ? (
                    <CmsImage src={v.profileImage} alt={v.companyName} className="h-full w-full" />
                  ) : (
                    v.companyName.charAt(0).toUpperCase()
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-semibold text-navy-900">
                    {v.companyName}
                    <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" aria-label="Verified partner" />
                  </div>
                  <p className="truncate text-sm text-navy-500">{[v.city, v.state].filter(Boolean).join(", ") || "Verified partner"}</p>
                  {v.website && <a href={v.website} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">Visit website</a>}
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <section className="section-fade">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold text-navy-900 sm:text-4xl">How Moksh Booking works</h2>
            <p className="mt-3 text-navy-500">Four simple steps between you and your next trip.</p>
          </Reveal>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Tell us about your trip", d: "Destination, city, nights and contact details." },
              { n: "02", t: "We match experts", d: "Your request goes to a few vetted professionals." },
              { n: "03", t: "Compare your options", d: "Receive tailored itineraries and pricing." },
              { n: "04", t: "Choose what works", d: "Pick the option that fits you best." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90} className="relative">
                <div className="font-display text-5xl font-semibold text-brand-200">{s.n}</div>
                <h3 className="mt-3 font-display text-lg font-semibold text-navy-900">{s.t}</h3>
                <p className="mt-1 text-sm text-navy-500">{s.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Lock, t: "Your details stay private", d: "We never publish your request or sell it to unlimited agents." },
            { icon: UserCheck, t: "Only vetted experts", d: "Your request is shared with a small number of selected professionals." },
            { icon: Scale, t: "You're free to choose", d: "Compare options with no obligation. One request, never a spam blast." },
          ].map((f, i) => (
            <Reveal key={f.t} delay={i * 80} className="flex gap-4 rounded-3xl border border-navy-100 bg-white p-6 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-brand-300">
                <f.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold text-navy-900">{f.t}</h3>
                <p className="mt-1 text-sm text-navy-500">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto mb-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] px-6 py-20 text-center text-white sm:px-12">
          <div className="absolute inset-0 -z-10 hero-gradient">
            {bannerImage ? (
              <>
                <CmsImage src={bannerImage} alt="" sizes="(max-width: 640px) 100vw, min(100vw, 1280px)" className="h-full w-full" imgClassName="ken-burns opacity-45" />
                <div className="absolute inset-0 bg-gradient-to-br from-navy-950/85 via-navy-900/70 to-brand-900/70" />
              </>
            ) : (
              <WorldBackdrop id="wb-final" className="h-full w-full opacity-90" />
            )}
            <div className="absolute inset-0 hero-grain opacity-50" />
          </div>
          <Reveal>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Where will you go next?</h2>
            <p className="mx-auto mt-3 max-w-xl text-navy-100/90">
              Your next unforgettable journey could start right here.
            </p>
            <div className="mt-8 flex justify-center">
              <Button type="button" variant="primary" size="lg" className="press shadow-lg shadow-sun-500/25" onClick={() => openLeadModal()}>
                Plan My Trip <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <LeadPopupModal
        key={modal.nonce}
        open={modal.open}
        selectedDestination={modal.destination}
        destinations={destinationNames}
        onClose={() => setModal((current) => ({ ...current, open: false }))}
      />
    </>
  );
}

function DestinationLeadCard({ d, big, priority, onSelect }: { d: Destination; big?: boolean; priority?: boolean; onSelect: (destination: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(d.name)}
      className={cn(
        "group relative block w-full overflow-hidden rounded-3xl border border-navy-100 bg-navy-950 text-left shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-navy-900/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        big ? "h-[26rem] sm:h-[30rem]" : "h-72"
      )}
    >
      <CmsImage src={d.heroImage} alt={d.name} placeholderLabel={d.name} priority={priority} sizes={big ? "(max-width: 640px) 100vw, min(100vw, 1280px)" : CARD_SIZES} className="h-full w-full" imgClassName="transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white transition-transform duration-300 group-hover:-translate-y-1 sm:p-6">
        <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-white/70">
          <MapPin className="h-3.5 w-3.5" /> Destination
        </div>
        <h3 className={cn("mt-1 font-display font-semibold", big ? "text-3xl sm:text-4xl" : "text-2xl")}>{d.name}</h3>
        {d.shortDescription && <p className={cn("mt-1.5 max-w-md text-white/80", big ? "text-sm sm:text-base" : "text-sm line-clamp-1")}>{d.shortDescription}</p>}
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-white/95">
            Plan this trip <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
          <span className="text-sm font-medium text-white/70">{d.startingPrice ? <>From {formatINR(d.startingPrice)}</> : "Get a quote"}</span>
        </div>
      </div>
    </button>
  );
}

function PackageLeadCard({ p, priority, onSelect }: { p: PackageItem; priority?: boolean; onSelect: (destination?: string) => void }) {
  const hero = p.heroImage || p.images?.find((i) => i.isHero)?.url || p.images?.[0]?.url || null;
  const duration = p.durationText || (p.durationDays ? `${p.durationDays}D${p.durationNights ? ` / ${p.durationNights}N` : ""}` : null);
  const price = p.offerPrice ?? p.startingPrice;
  const hasDiscount = Boolean(p.offerPrice && p.startingPrice && p.offerPrice < p.startingPrice);
  const destination = p.destination?.name || packageTitleDestination(p.title);

  return (
    <button
      type="button"
      onClick={() => onSelect(destination)}
      className="group flex w-full flex-col overflow-hidden rounded-3xl border border-navy-100 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-navy-200 hover:shadow-xl hover:shadow-navy-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="relative">
        <CmsImage src={hero} alt={p.title} placeholderLabel={p.title} priority={priority} sizes={CARD_SIZES} className="h-52 w-full" imgClassName="transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]" />
        {hasDiscount && (
          <span className="absolute left-4 top-4 rounded-full bg-sun-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            Save {formatINR(p.startingPrice! - p.offerPrice!)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3 text-xs font-medium text-navy-400">
          {p.destination?.name && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p.destination.name}</span>}
          {duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {duration}</span>}
        </div>
        <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold text-navy-900 transition-colors group-hover:text-brand-700">{p.title}</h3>
        {p.shortDescription && <p className="mt-1 line-clamp-2 text-sm text-navy-500">{p.shortDescription}</p>}
        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            {price ? (
              <>
                <span className="text-xs text-navy-400">Starting from</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-navy-900">{formatINR(price)}</span>
                  {hasDiscount && <span className="text-sm text-navy-400 line-through">{formatINR(p.startingPrice)}</span>}
                </div>
              </>
            ) : (
              <span className="text-sm font-semibold text-brand-700">Get a quote</span>
            )}
          </div>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-navy-700 transition-colors duration-200 group-hover:text-brand-700">
            Enquire <ArrowUpRight className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

function LeadPopupModal({ open, selectedDestination, destinations, onClose }: { open: boolean; selectedDestination?: string; destinations: string[]; onClose: () => void }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ name: string; destination: string } | null>(null);
  const [form, setForm] = useState({
    customerName: "",
    destinationText: selectedDestination ?? "",
    departureCity: "",
    nights: "5",
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

  const titleDestination = form.destinationText || selectedDestination;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function validate(): string | null {
    if (form.customerName.trim().length < 2) return "Please enter your full name.";
    if (form.destinationText.trim().length < 2) return "Please select a destination.";
    if (form.departureCity.trim().length < 2) return "Please enter your city.";
    const nights = Number(form.nights);
    if (!Number.isInteger(nights) || nights < 1 || nights > 60) return "Please enter a valid number of nights.";
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
          nights: Number(form.nights),
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
    <div className={cn("fixed inset-0 z-[80] flex items-end justify-center bg-navy-950/55 px-3 py-4 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:px-6", open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")}>
      <div className={cn("max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[1.5rem] border border-white/30 bg-white p-5 shadow-2xl shadow-navy-950/30 transition-all duration-200 sm:p-6", open ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0")}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <Badge className="bg-brand-50 text-brand-700 ring-brand-600/20">Free travel quote</Badge>
            <h2 className="mt-3 font-display text-2xl font-semibold text-navy-900">
              Plan your {titleDestination ? `${titleDestination} ` : ""}trip
            </h2>
            <p className="mt-1 text-sm text-navy-500">Tell us a few details and we&apos;ll help you plan it.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-500 hover:bg-navy-100 hover:text-navy-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        {status === "success" && submitted ? (
          <div className="rounded-2xl bg-brand-50 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-brand-600" />
            <h3 className="mt-3 text-xl font-semibold text-navy-900">Enquiry received!</h3>
            <p className="mt-2 text-sm text-navy-600">Thanks, {submitted.name}.</p>
            <p className="mt-1 text-sm text-navy-600">We&apos;ve received your request for {submitted.destination}. Our team will contact you shortly.</p>
            <Button type="button" variant="brand" className="mt-5" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Full Name">
              <Input autoFocus value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Your full name" autoComplete="name" />
            </Field>
            <Field label="Destination">
              <Select value={form.destinationText} onChange={(e) => set("destinationText", e.target.value)} required>
                <option value="">Select Destination</option>
                {destinations.map((destination) => <option key={destination} value={destination}>{destination}</option>)}
                {form.destinationText && !destinations.includes(form.destinationText) && <option value={form.destinationText}>{form.destinationText}</option>}
              </Select>
            </Field>
            <Field label="Which city are you travelling from?">
              <Input value={form.departureCity} onChange={(e) => set("departureCity", e.target.value)} placeholder="Delhi, Mumbai, Bangalore" autoComplete="address-level2" />
            </Field>
            <Field label="How many nights?">
              <Input type="number" min={1} max={60} inputMode="numeric" value={form.nights} onChange={(e) => set("nights", e.target.value)} />
            </Field>
            <Field label="Phone Number">
              <Input type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
            </Field>
            <Field label="Email Address">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" autoComplete="email" />
            </Field>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}
            <Button type="submit" variant="primary" size="lg" className="mt-2 w-full" disabled={status === "submitting"}>
              {status === "submitting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : "Get My Travel Quote"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Section({ id, title, subtitle, children }: { id?: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Reveal className="mb-8">
        <h2 className="font-display text-3xl font-semibold text-navy-900 sm:text-[2rem]">{title}</h2>
        {subtitle && <p className="mt-2 text-navy-500">{subtitle}</p>}
      </Reveal>
      {children}
    </section>
  );
}

function packageTitleDestination(title: string): string | undefined {
  const first = title.split(/[-|:]/)[0]?.replace(/\b(package|tour|trip|escape|holiday)\b/gi, "").trim();
  return first && first.length > 1 ? first : undefined;
}
