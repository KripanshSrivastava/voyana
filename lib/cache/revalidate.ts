import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { invalidateCache } from "./publicCache";
import { CMS_TAGS } from "../cms/queries";

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
  revalidateTag(CMS_TAGS.destinations, "max");
  void invalidateCache(...DESTINATION_LIST_KEYS);
}

/** Public pages that render package/tour data. */
export function revalidatePackages(slug?: string, kind?: "PACKAGE" | "TOUR") {
  revalidatePath("/");
  revalidatePath("/packages");
  revalidatePath("/tours");
  if (slug) revalidatePath(`/${kind === "TOUR" ? "tours" : "packages"}/${slug}`);
  revalidateTag(CMS_TAGS.packages, "max");
  void invalidateCache(...PACKAGE_LIST_KEYS);
}

/** Site settings affect the header/footer/tracking on every public page. */
export function revalidateSiteSettings() {
  revalidatePath("/", "layout");
  // Flushes Next's own data cache too (used by getPublicSettings via
  // unstable_cache). Without this, the layout would serve stale settings
  // until the 120s tag TTL elapsed.
  // Next 16 requires a profile arg; "max" = stale-while-revalidate.
  revalidateTag("site-settings", "max");
  void invalidateCache("site-settings");
}

/** Call after an agent's verification status changes — affects the public
 *  vendor showcase on the homepage. */
export function revalidateVendors() {
  revalidatePath("/");
  revalidateTag(CMS_TAGS.vendors, "max");
  void invalidateCache("public-vendors:6");
}

/** Call after a vendor ad is approved/rejected/paused/expired. */
export function revalidateVendorAds() {
  revalidatePath("/");
  revalidateTag(CMS_TAGS.vendorAds, "max");
  void invalidateCache("public-vendor-ads:6");
}
