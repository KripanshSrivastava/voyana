"use client";

import { useRouter } from "next/navigation";
import { DestinationEditor, type DestinationFormValue } from "@/components/admin/DestinationEditor";

/** Thin wrapper around the admin DestinationEditor in vendor mode — gives
 *  agents the same content fields (gallery, starting price, FAQs) without
 *  the admin-only publish/feature/category/SEO controls. */
export function VendorDestinationEditor({
  id,
  initial,
  redirectTo,
}: {
  id?: string;
  initial?: DestinationFormValue;
  redirectTo: string;
}) {
  const router = useRouter();
  return <DestinationEditor id={id} initial={initial} vendorMode onSaved={() => router.push(redirectTo)} />;
}
