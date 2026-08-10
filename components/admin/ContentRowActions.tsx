"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, MoreVertical, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";

export function ContentRowActions({
  resource,
  id,
  published,
  editHref,
  previewHref,
}: {
  resource: "destinations" | "packages";
  id: string;
  published: boolean;
  editHref: string;
  previewHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Local mirror of `published` so we can flip it instantly and roll back
  // without waiting for the parent server component to re-render. The row
  // stays visually consistent even before router.refresh() completes.
  const [pubState, setPubState] = useState(published);

  async function togglePublish() {
    if (busy) return;
    const next = !pubState;
    const previous = pubState;
    setPubState(next);
    setBusy(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/admin/${resource}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ __toggle: true, published: next }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Could not update publish state.");
      }
      router.refresh();
    } catch (e) {
      setPubState(previous);
      toast.error(e instanceof Error ? e.message : "Could not update publish state.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    if (!confirm("Delete this item? Historical lead references are preserved, but this content will be removed from the site.")) return;
    setBusy(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/admin/${resource}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Could not delete.");
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex items-center justify-end gap-1">
      <Link href={editHref} className="rounded-lg p-2 text-navy-500 hover:bg-navy-100" title="Edit"><Pencil className="h-4 w-4" /></Link>
      <Link href={previewHref} target="_blank" className="rounded-lg p-2 text-navy-500 hover:bg-navy-100" title="Preview"><Eye className="h-4 w-4" /></Link>
      <button onClick={() => setOpen((v) => !v)} className="rounded-lg p-2 text-navy-500 hover:bg-navy-100">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-navy-100 bg-white py-1 shadow-lg">
            <button onClick={togglePublish} disabled={busy} className="block w-full px-4 py-2 text-left text-sm text-navy-700 hover:bg-navy-50 disabled:opacity-50">
              {pubState ? "Unpublish" : "Publish"}
            </button>
            <button onClick={remove} className="block w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">Delete</button>
          </div>
        </>
      )}
    </div>
  );
}
