"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, Trash2, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Media = { id: string; url: string; originalName: string; size: number; folder: string; createdAt: string | Date };

export function MediaLibrary({ initial }: { initial: Media[] }) {
  const [items, setItems] = useState<Media[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("folder", "library");
      Array.from(files).forEach((f) => fd.append("file", f));
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
      setItems((prev) => [...json.data, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, force = false) {
    const res = await fetch(`/api/admin/media/${id}${force ? "?force=1" : ""}`, { method: "DELETE" });
    const json = await res.json();
    if (res.status === 409) {
      if (confirm(`${json.error} This image is used by published content.`)) return remove(id, true);
      return;
    }
    if (res.ok && json.ok) setItems((prev) => prev.filter((m) => m.id !== id));
  }

  function copy(url: string) {
    navigator.clipboard?.writeText(window.location.origin + url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-navy-500">{items.length} image{items.length === 1 ? "" : "s"} in the library.</p>
        <Button variant="brand" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> Upload</>}
        </Button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      </div>
      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 py-16 text-center text-navy-500">
          No images uploaded yet. Upload images to reuse across destinations, packages and tours.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <div key={m.id} className="group overflow-hidden rounded-xl border border-navy-100 bg-white shadow-sm">
              <div className="relative h-32 bg-navy-50">
                <Image src={m.url} alt={m.originalName} fill sizes="240px" className="object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => copy(m.url)} className="rounded-lg bg-white/90 p-2 text-navy-700 hover:bg-white" title="Copy URL">
                    {copied === m.url ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button onClick={() => remove(m.id)} className="rounded-lg bg-white/90 p-2 text-rose-600 hover:bg-white" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium text-navy-700" title={m.originalName}>{m.originalName}</p>
                <p className="text-[11px] text-navy-400">{(m.size / 1024).toFixed(0)} KB · {formatDate(m.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
