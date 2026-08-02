"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Input, Textarea, Field, Button, Card } from "@/components/ui";
import { SingleImage, GalleryImages } from "@/components/admin/ImageUploader";
import { StringListEditor, FaqListEditor, type FaqItem } from "@/components/admin/ListEditors";
import { slugify } from "@/lib/utils";

export type DestinationFormValue = {
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  heroImage: string;
  gallery: string[];
  startingPrice: string;
  bestTime: string;
  tripTypes: string[];
  highlights: string[];
  faqs: FaqItem[];
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
  published: boolean;
  featured: boolean;
  sortOrder: string;
};

export const emptyDestination: DestinationFormValue = {
  name: "", slug: "", shortDescription: "", longDescription: "", heroImage: "", gallery: [],
  startingPrice: "", bestTime: "", tripTypes: [], highlights: [], faqs: [],
  seoTitle: "", seoDescription: "", noindex: false, published: false, featured: false, sortOrder: "0",
};

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-navy-300 text-brand-600 focus:ring-brand-500" />
      {label}
    </label>
  );
}

export function DestinationEditor({ id, initial }: { id?: string; initial?: DestinationFormValue }) {
  const router = useRouter();
  const [f, setF] = useState<DestinationFormValue>(initial ?? emptyDestination);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof DestinationFormValue>(k: K, v: DestinationFormValue[K]) => setF((s) => ({ ...s, [k]: v }));

  async function save(publishNow?: boolean) {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...f,
        slug: f.slug || slugify(f.name),
        startingPrice: f.startingPrice ? Number(f.startingPrice) : null,
        sortOrder: Number(f.sortOrder) || 0,
        published: publishNow ?? f.published,
      };
      const res = await fetch(id ? `/api/admin/destinations/${id}` : "/api/admin/destinations", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      router.push("/admin/destinations");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-navy-900">Basics</h2>
          <div className="space-y-4">
            <Field label="Destination name">
              <Input value={f.name} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
            </Field>
            <Field label="Slug" hint="Used in the URL: /destinations/your-slug">
              <Input value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
            </Field>
            <Field label="Short description">
              <Textarea rows={2} value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
            </Field>
            <Field label="Long description">
              <Textarea rows={5} value={f.longDescription} onChange={(e) => set("longDescription", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-navy-900">Images</h2>
          <SingleImage value={f.heroImage} onChange={(v) => set("heroImage", v)} folder="destinations" />
          <GalleryImages value={f.gallery} onChange={(v) => set("gallery", v)} folder="destinations" />
        </Card>

        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-navy-900">Details</h2>
          <StringListEditor label="Highlights" items={f.highlights} onChange={(v) => set("highlights", v)} placeholder="e.g. Shikara ride on Dal Lake" />
          <StringListEditor label="Popular trip types" items={f.tripTypes} onChange={(v) => set("tripTypes", v)} placeholder="e.g. Honeymoon" />
          <FaqListEditor items={f.faqs} onChange={(v) => set("faqs", v)} />
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-navy-900">SEO</h2>
          <Field label="SEO title"><Input value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
          <Field label="SEO description"><Textarea rows={2} value={f.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></Field>
          <Toggle label="No-index (hide from search engines)" checked={f.noindex} onChange={(v) => set("noindex", v)} />
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-navy-900">Publish</h2>
          <Field label="Starting price (₹)"><Input type="number" value={f.startingPrice} onChange={(e) => set("startingPrice", e.target.value)} /></Field>
          <Field label="Best time to visit"><Input value={f.bestTime} onChange={(e) => set("bestTime", e.target.value)} placeholder="e.g. Mar–Oct" /></Field>
          <Field label="Sort order"><Input type="number" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} /></Field>
          <div className="space-y-2 border-t border-navy-100 pt-3">
            <Toggle label="Published (visible on site)" checked={f.published} onChange={(v) => set("published", v)} />
            <Toggle label="Featured on homepage" checked={f.featured} onChange={(v) => set("featured", v)} />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="space-y-2 pt-2">
            <Button variant="brand" className="w-full" disabled={busy || !f.name} onClick={() => save()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save</>}
            </Button>
            {!f.published && (
              <Button variant="primary" className="w-full" disabled={busy || !f.name} onClick={() => save(true)}>
                Save &amp; publish
              </Button>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
