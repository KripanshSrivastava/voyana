"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check } from "lucide-react";
import { Input, Textarea, Field, Button, Card } from "@/components/ui";
import { SingleImage } from "@/components/admin/ImageUploader";

export type SettingsValue = {
  brandName: string; tagline: string; logoUrl: string; faviconUrl: string; heroImage: string;
  phone: string; whatsapp: string; email: string; address: string;
  facebook: string; instagram: string; twitter: string; youtube: string;
  defaultLeadPrice: string; leadMaxAgents: string; leadExpiryHours: string;
  footerText: string; defaultSeoTitle: string; defaultSeoDescription: string;
  gaId: string; metaPixelId: string; googleAdsId: string;
};

export function SettingsForm({ initial }: { initial: SettingsValue }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof SettingsValue>(k: K, v: SettingsValue[K]) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: f.brandName, tagline: f.tagline, logoUrl: f.logoUrl, faviconUrl: f.faviconUrl, heroImage: f.heroImage,
          phone: f.phone, whatsapp: f.whatsapp, email: f.email, address: f.address,
          socials: { facebook: f.facebook, instagram: f.instagram, twitter: f.twitter, youtube: f.youtube },
          defaultLeadPrice: Number(f.defaultLeadPrice), leadMaxAgents: Number(f.leadMaxAgents), leadExpiryHours: Number(f.leadExpiryHours),
          footerText: f.footerText, defaultSeoTitle: f.defaultSeoTitle, defaultSeoDescription: f.defaultSeoDescription,
          gaId: f.gaId, metaPixelId: f.metaPixelId, googleAdsId: f.googleAdsId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-navy-900">Brand</h2>
        <Field label="Brand name"><Input value={f.brandName} onChange={(e) => set("brandName", e.target.value)} /></Field>
        <Field label="Tagline"><Input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
        <SingleImage value={f.logoUrl} onChange={(v) => set("logoUrl", v)} folder="brand" label="Logo" />
        <SingleImage value={f.faviconUrl} onChange={(v) => set("faviconUrl", v)} folder="brand" label="Favicon" />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-navy-900">Landing page hero</h2>
        <p className="text-sm text-navy-500">The background image on the homepage. This is completely separate from destination/package images — uploading here is the only way to change it.</p>
        <SingleImage value={f.heroImage} onChange={(v) => set("heroImage", v)} folder="hero" label="Hero / background image" />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-navy-900">Contact</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="WhatsApp"><Input value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+91…" /></Field>
        </div>
        <Field label="Email"><Input value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Address"><Textarea rows={2} value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-navy-900">Lead defaults</h2>
        <Field label="Default lead price (₹)"><Input type="number" value={f.defaultLeadPrice} onChange={(e) => set("defaultLeadPrice", e.target.value)} /></Field>
        <Field label="Max agents per lead"><Input type="number" value={f.leadMaxAgents} onChange={(e) => set("leadMaxAgents", e.target.value)} /></Field>
        <Field label="Lead expiry (hours)"><Input type="number" value={f.leadExpiryHours} onChange={(e) => set("leadExpiryHours", e.target.value)} /></Field>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-navy-900">Social & tracking</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Facebook"><Input value={f.facebook} onChange={(e) => set("facebook", e.target.value)} /></Field>
          <Field label="Instagram"><Input value={f.instagram} onChange={(e) => set("instagram", e.target.value)} /></Field>
          <Field label="Twitter / X"><Input value={f.twitter} onChange={(e) => set("twitter", e.target.value)} /></Field>
          <Field label="YouTube"><Input value={f.youtube} onChange={(e) => set("youtube", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="GA4 ID"><Input value={f.gaId} onChange={(e) => set("gaId", e.target.value)} placeholder="G-…" /></Field>
          <Field label="Meta Pixel"><Input value={f.metaPixelId} onChange={(e) => set("metaPixelId", e.target.value)} /></Field>
          <Field label="Google Ads"><Input value={f.googleAdsId} onChange={(e) => set("googleAdsId", e.target.value)} placeholder="AW-…" /></Field>
        </div>
      </Card>

      <Card className="p-6 space-y-4 lg:col-span-2">
        <h2 className="font-semibold text-navy-900">SEO & footer</h2>
        <Field label="Default SEO title"><Input value={f.defaultSeoTitle} onChange={(e) => set("defaultSeoTitle", e.target.value)} /></Field>
        <Field label="Default SEO description"><Textarea rows={2} value={f.defaultSeoDescription} onChange={(e) => set("defaultSeoDescription", e.target.value)} /></Field>
        <Field label="Footer text"><Input value={f.footerText} onChange={(e) => set("footerText", e.target.value)} /></Field>
      </Card>

      <div className="flex items-center gap-3 lg:col-span-2">
        <Button type="submit" variant="brand" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save settings</>}
        </Button>
        {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> Saved</span>}
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>
    </form>
  );
}
