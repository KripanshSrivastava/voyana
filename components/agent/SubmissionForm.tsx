"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Input, Textarea, Select, Field, Button, Card } from "@/components/ui";
import { SingleImage } from "@/components/admin/ImageUploader";

/** Only handles Destination submissions inline — packages/tours get their
 *  own full editor at /agent/submissions/packages/new (pricing, gallery,
 *  itinerary, inclusions/exclusions, FAQs: same content depth as admin). */
export function SubmissionForm() {
  const router = useRouter();
  const [type, setType] = useState<"destination" | "package">("destination");
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, shortDescription, longDescription, heroImage }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not create submission.");
      setName(""); setShortDescription(""); setLongDescription(""); setHeroImage("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create submission.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold text-navy-900">New submission</h2>
      <Field label="What are you submitting?">
        <Select value={type} onChange={(e) => setType(e.target.value as "destination" | "package")}>
          <option value="destination">Destination</option>
          <option value="package">Package / Tour</option>
        </Select>
      </Field>

      {type === "package" ? (
        <Link
          href="/agent/submissions/packages/new"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Continue to package details
        </Link>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <Field label="Destination name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Short description"><Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} maxLength={400} /></Field>
          <Field label="Full description"><Textarea rows={4} value={longDescription} onChange={(e) => setLongDescription(e.target.value)} /></Field>
          <SingleImage value={heroImage} onChange={setHeroImage} folder="vendor-submissions" label="Image" endpoint="/api/agent/media" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" variant="brand" disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save as draft"}
          </Button>
          <p className="text-xs text-navy-400">Saved as a draft first — submit it for review from the list below when you&apos;re ready.</p>
        </form>
      )}
    </Card>
  );
}
