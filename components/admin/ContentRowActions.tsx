"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, MoreVertical, Loader2 } from "lucide-react";

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

  async function togglePublish() {
    setBusy(true);
    try {
      await fetch(`/api/admin/${resource}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ __toggle: true, published: !published }),
      });
      router.refresh();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this item? Historical lead references are preserved, but this content will be removed from the site.")) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/${resource}/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
      setOpen(false);
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
            <button onClick={togglePublish} className="block w-full px-4 py-2 text-left text-sm text-navy-700 hover:bg-navy-50">
              {published ? "Unpublish" : "Publish"}
            </button>
            <button onClick={remove} className="block w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">Delete</button>
          </div>
        </>
      )}
    </div>
  );
}
