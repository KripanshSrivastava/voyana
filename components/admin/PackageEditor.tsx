"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Input, Textarea, Select, Field, Button, Card } from "@/components/ui";
import { SingleImage, GalleryImages } from "@/components/admin/ImageUploader";
import { StringListEditor, FaqListEditor, ItineraryEditor, type FaqItem, type ItineraryItem } from "@/components/admin/ListEditors";
import { slugify } from "@/lib/utils";

export type PackageFormValue = {
  kind: "PACKAGE" | "TOUR";
  title: string;
  slug: string;
  destinationId: string;
  shortDescription: string;
  longDescription: string;
  heroImage: string;
  gallery: string[];
  durationDays: string;
  durationNights: string;
  startingPrice: string;
  offerPrice: string;
  priceLabel: string;
  hotelCategory: string;
  accommodation: string;
  transport: string;
  activities: string[];
  tripType: string;
  difficulty: string;
  itinerary: ItineraryItem[];
  inclusions: string[];
  exclusions: string[];
  faqs: FaqItem[];
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
  published: boolean;
  featured: boolean;
  sortOrder: string;
};

export function emptyPackage(kind: "PACKAGE" | "TOUR"): PackageFormValue {
  return {
    kind, title: "", slug: "", destinationId: "", shortDescription: "", longDescription: "",
    heroImage: "", gallery: [], durationDays: "", durationNights: "", startingPrice: "", offerPrice: "",
    priceLabel: "", hotelCategory: "", accommodation: "", transport: "", activities: [], tripType: "",
    difficulty: "", itinerary: [], inclusions: [], exclusions: [], faqs: [], seoTitle: "", seoDescription: "",
    noindex: false, published: false, featured: false, sortOrder: "0",
  };
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-navy-300 text-brand-600 focus:ring-brand-500" />
      {label}
    </label>
  );
}

export function PackageEditor({
  id,
  kind,
  destinations,
  initial,
}: {
  id?: string;
  kind: "PACKAGE" | "TOUR";
  destinations: { id: string; name: string }[];
  initial?: PackageFormValue;
}) {
  const router = useRouter();
  const noun = kind === "TOUR" ? "tour" : "package";
  const [f, setF] = useState<PackageFormValue>(initial ?? emptyPackage(kind));
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof PackageFormValue>(k: K, v: PackageFormValue[K]) => setF((s) => ({ ...s, [k]: v }));

  async function save(publishNow?: boolean) {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...f,
        slug: f.slug || slugify(f.title),
        destinationId: f.destinationId || null,
        durationDays: f.durationDays ? Number(f.durationDays) : null,
        durationNights: f.durationNights ? Number(f.durationNights) : null,
        startingPrice: f.startingPrice ? Number(f.startingPrice) : null,
        offerPrice: f.offerPrice ? Number(f.offerPrice) : null,
        sortOrder: Number(f.sortOrder) || 0,
        published: publishNow ?? f.published,
      };
      const res = await fetch(id ? `/api/admin/packages/${id}` : "/api/admin/packages", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      router.push(kind === "TOUR" ? "/admin/tours" : "/admin/packages");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
      <div className="space-y-6">
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-navy-900">Basics</h2>
          <Field label={`${noun[0].toUpperCase() + noun.slice(1)} title`}>
            <Input value={f.title} onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
          </Field>
          <Field label="Slug" hint={`/${kind === "TOUR" ? "tours" : "packages"}/your-slug`}>
            <Input value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
          </Field>
          <Field label="Destination">
            <Select value={f.destinationId} onChange={(e) => set("destinationId", e.target.value)}>
              <option value="">— None —</option>
              {destinations.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </Select>
          </Field>
          <Field label="Short description"><Textarea rows={2} value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} /></Field>
          <Field label="Full description"><Textarea rows={5} value={f.longDescription} onChange={(e) => set("longDescription", e.target.value)} /></Field>
        </Card>

        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-navy-900">Images</h2>
          <SingleImage value={f.heroImage} onChange={(v) => set("heroImage", v)} folder="packages" />
          <GalleryImages value={f.gallery} onChange={(v) => set("gallery", v)} folder="packages" />
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-navy-900">Stay & transport</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hotel category"><Input value={f.hotelCategory} onChange={(e) => set("hotelCategory", e.target.value)} placeholder="e.g. 4-star / Deluxe" /></Field>
            <Field label="Trip type"><Input value={f.tripType} onChange={(e) => set("tripType", e.target.value)} placeholder="e.g. Honeymoon" /></Field>
          </div>
          <Field label="Accommodation details"><Textarea rows={2} value={f.accommodation} onChange={(e) => set("accommodation", e.target.value)} /></Field>
          <Field label="Transport details"><Textarea rows={2} value={f.transport} onChange={(e) => set("transport", e.target.value)} /></Field>
          <StringListEditor label="Activities" items={f.activities} onChange={(v) => set("activities", v)} placeholder="e.g. Gondola ride" />
        </Card>

        <Card className="p-6"><ItineraryEditor items={f.itinerary} onChange={(v) => set("itinerary", v)} /></Card>

        <Card className="p-6 space-y-5">
          <StringListEditor label="Inclusions" items={f.inclusions} onChange={(v) => set("inclusions", v)} placeholder="e.g. Daily breakfast" />
          <StringListEditor label="Exclusions" items={f.exclusions} onChange={(v) => set("exclusions", v)} placeholder="e.g. Airfare" />
        </Card>

        <Card className="p-6"><FaqListEditor items={f.faqs} onChange={(v) => set("faqs", v)} /></Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-navy-900">SEO</h2>
          <Field label="SEO title"><Input value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
          <Field label="SEO description"><Textarea rows={2} value={f.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></Field>
          <Toggle label="No-index (hide from search engines)" checked={f.noindex} onChange={(v) => set("noindex", v)} />
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-navy-900">Pricing & publish</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starting price (₹)"><Input type="number" value={f.startingPrice} onChange={(e) => set("startingPrice", e.target.value)} /></Field>
            <Field label="Offer price (₹)"><Input type="number" value={f.offerPrice} onChange={(e) => set("offerPrice", e.target.value)} /></Field>
          </div>
          <Field label="Price label"><Input value={f.priceLabel} onChange={(e) => set("priceLabel", e.target.value)} placeholder="e.g. Starting from" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Days"><Input type="number" value={f.durationDays} onChange={(e) => set("durationDays", e.target.value)} /></Field>
            <Field label="Nights"><Input type="number" value={f.durationNights} onChange={(e) => set("durationNights", e.target.value)} /></Field>
          </div>
          <Field label="Sort order"><Input type="number" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} /></Field>
          <div className="space-y-2 border-t border-navy-100 pt-3">
            <Toggle label="Published (visible on site)" checked={f.published} onChange={(v) => set("published", v)} />
            <Toggle label="Featured on homepage" checked={f.featured} onChange={(v) => set("featured", v)} />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="space-y-2 pt-2">
            <Button variant="brand" className="w-full" disabled={busy || !f.title} onClick={() => save()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save</>}
            </Button>
            {!f.published && (
              <Button variant="primary" className="w-full" disabled={busy || !f.title} onClick={() => save(true)}>Save &amp; publish</Button>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
