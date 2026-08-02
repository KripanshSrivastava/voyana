"use client";

import { useState, useRef } from "react";
import { Upload, X, Star, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

async function uploadFiles(files: FileList, folder: string): Promise<string[]> {
  const fd = new FormData();
  fd.set("folder", folder);
  Array.from(files).forEach((f) => fd.append("file", f));
  const res = await fetch("/api/admin/media", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
  return (json.data as { url: string }[]).map((m) => m.url);
}

export function SingleImage({
  value,
  onChange,
  folder = "general",
  label = "Hero image",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const [url] = await uploadFiles(files, folder);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy-700">{label}</label>
      {value ? (
        <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-navy-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-44 w-full object-cover" />
          <button type="button" onClick={() => onChange("")} className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-44 w-full max-w-sm flex-col items-center justify-center rounded-xl border-2 border-dashed border-navy-200 text-navy-400 hover:border-brand-400 hover:text-brand-500"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Upload className="h-6 w-6" /><span className="mt-1 text-sm">Upload image</span></>}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handle(e.target.files)} />
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
      <p className="mt-1 text-xs text-navy-400">JPG, PNG or WEBP · max 5 MB</p>
    </div>
  );
}

export function GalleryImages({
  value,
  onChange,
  folder = "general",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const urls = await uploadFiles(files, folder);
      onChange([...value, ...urls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const setHero = (i: number) => {
    const next = [...value];
    const [pick] = next.splice(i, 1);
    onChange([pick, ...next]);
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy-700">Gallery images</label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((url, i) => (
          <div key={url + i} className={cn("relative overflow-hidden rounded-xl border", i === 0 ? "border-brand-400" : "border-navy-200")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-28 w-full object-cover" />
            {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">Hero</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 px-1 py-1">
              <div className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-white hover:bg-white/20"><ArrowLeft className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-white hover:bg-white/20"><ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex gap-1">
                {i !== 0 && <button type="button" onClick={() => setHero(i)} className="rounded p-1 text-white hover:bg-white/20"><Star className="h-3.5 w-3.5" /></button>}
                <button type="button" onClick={() => remove(i)} className="rounded p-1 text-white hover:bg-white/20"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-navy-200 text-navy-400 hover:border-brand-400 hover:text-brand-500"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-5 w-5" /><span className="mt-1 text-xs">Add</span></>}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => handle(e.target.files)} />
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
      <p className="mt-1 text-xs text-navy-400">First image is used as the hero. Reorder with the arrows.</p>
    </div>
  );
}
