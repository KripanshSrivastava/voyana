import "server-only";
import { revalidatePath } from "next/cache";
import { invalidateCache } from "./publicCache";

// Common list sizes actually requested by the homepage/listing pages. Busting
// these covers the common case immediately; the 120s TTL in publicCache.ts is
// the safety net for any less common `take` value we don't enumerate here.
const DESTINATION_LIST_KEYS = ["featured-destinations:6", "featured-destinations:3", "featured-destinations:12"];
const PACKAGE_LIST_KEYS = [
  "featured-packages:PACKAGE:6", "featured-packages:PACKAGE:3", "featured-packages:PACKAGE:12",
  "featured-packages:TOUR:6", "featured-packages:TOUR:3", "featured-packages:TOUR:12",
];

/** Public pages that render destination data. Call after any destination
 *  create/update/delete/publish-toggle so the homepage reflects it immediately. */
export function revalidateDestinations(slug?: string) {
  revalidatePath("/");
  revalidatePath("/destinations");
  if (slug) revalidatePath(`/destinations/${slug}`);
  void invalidateCache(...DESTINATION_LIST_KEYS);
}

/** Public pages that render package/tour data. */
export function revalidatePackages(slug?: string, kind?: "PACKAGE" | "TOUR") {
  revalidatePath("/");
  revalidatePath("/packages");
  revalidatePath("/tours");
  if (slug) revalidatePath(`/${kind === "TOUR" ? "tours" : "packages"}/${slug}`);
  void invalidateCache(...PACKAGE_LIST_KEYS);
}

/** Site settings affect the header/footer/tracking on every public page. */
export function revalidateSiteSettings() {
  revalidatePath("/", "layout");
  void invalidateCache("site-settings");
}
