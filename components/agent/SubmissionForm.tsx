"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Input, Textarea, Select, Field, Button, Card } from "@/components/ui";
import { SingleImage } from "@/components/admin/ImageUploader";

export function SubmissionForm({ destinations }: { destinations: { id: string; name: string }[] }) {
  const router = useRouter();
  const [type, setType] = useState<"destination" | "package">("destination");
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [kind, setKind] = useState<"PACKAGE" | "TOUR">("PACKAGE");
  const [durationDays, setDurationDays] = useState("");
  const [durationNights, setDurationNights] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = type === "destination"
        ? { name, shortDescription, longDescription, heroImage }
        : { title: name, shortDescription, longDescription, destinationId: destinationId || null, kind, durationDays: durationDays ? Number(durationDays) : null, durationNights: durationNights ? Number(durationNights) : null, heroImage };
      const res = await fetch(`/api/agent/${type === "destination" ? "destinations" : "packages"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not create submission.");
      setName(""); setShortDescription(""); setLongDescription(""); setDestinationId(""); setDurationDays(""); setDurationNights(""); setHeroImage("");
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
      <form onSubmit={submit} className="space-y-4">
        <Field label="What are you submitting?">
          <Select value={type} onChange={(e) => setType(e.target.value as "destination" | "package")}>
            <option value="destination">Destination</option>
            <option value="package">Package / Tour</option>
          </Select>
        </Field>
        <Field label={type === "destination" ? "Destination name" : "Package title"}>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        {type === "package" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type">
              <Select value={kind} onChange={(e) => setKind(e.target.value as "PACKAGE" | "TOUR")}>
                <option value="PACKAGE">Package</option>
                <option value="TOUR">Tour</option>
              </Select>
            </Field>
            <Field label="Days"><Input type="number" min={0} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} /></Field>
            <Field label="Nights"><Input type="number" min={0} value={durationNights} onChange={(e) => setDurationNights(e.target.value)} /></Field>
          </div>
        )}
        {type === "package" && destinations.length > 0 && (
          <Field label="Destination (optional)">
            <Select value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
              <option value="">—</option>
              {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Short description"><Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} maxLength={400} /></Field>
        <Field label="Full description"><Textarea rows={4} value={longDescription} onChange={(e) => setLongDescription(e.target.value)} /></Field>
        <SingleImage value={heroImage} onChange={setHeroImage} folder="vendor-submissions" label="Image" endpoint="/api/agent/media" />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" variant="brand" disabled={busy || !name.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save as draft"}
        </Button>
        <p className="text-xs text-navy-400">Saved as a draft first — submit it for review from the list below when you&apos;re ready.</p>
      </form>
    </Card>
  );
}
