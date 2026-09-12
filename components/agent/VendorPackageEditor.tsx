"use client";

import { useRouter } from "next/navigation";
import { PackageEditor, type PackageFormValue } from "@/components/admin/PackageEditor";

/** Thin wrapper around the admin PackageEditor in vendor mode — gives agents
 *  the same content fields (pricing, gallery, itinerary, inclusions/
 *  exclusions, FAQs) without the admin-only publish/feature/SEO controls. */
export function VendorPackageEditor({
  id,
  kind,
  destinations,
  initial,
  redirectTo,
}: {
  id?: string;
  kind: "PACKAGE" | "TOUR";
  destinations: { id: string; name: string }[];
  initial?: PackageFormValue;
  redirectTo: string;
}) {
  const router = useRouter();
  return (
    <PackageEditor
      id={id}
      kind={kind}
      destinations={destinations}
      initial={initial}
      vendorMode
      onSaved={() => router.push(redirectTo)}
    />
  );
}
