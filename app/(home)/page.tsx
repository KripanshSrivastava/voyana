import { LandingLeadExperience } from "@/components/site/LandingLeadExperience";
import { getFeaturedDestinations, getFeaturedPackages, getPublicVendors, getPublicVendorAds } from "@/lib/cms/queries";
import { getPublicSettings } from "@/lib/settings";
import { getFlags } from "@/lib/flags";

// ISR: render at most once every 5 minutes. Admin mutations already call
// revalidatePath("/") via lib/cache/revalidate.ts, so edits show up sooner.
export const revalidate = 300;

export default async function HomePage() {
  const [destinations, packages, tours, settings, vendors, flags] = await Promise.all([
    getFeaturedDestinations(8),
    getFeaturedPackages("PACKAGE", 6),
    getFeaturedPackages("TOUR", 3),
    getPublicSettings(),
    getPublicVendors(6),
    getFlags(),
  ]);
  // vendorAdsEnabled is a site-wide toggle, not a per-ad filter — only query
  // ads at all when the flag is on, so a disabled flag hides them completely.
  const vendorAds = flags.vendorAdsEnabled ? await getPublicVendorAds(6) : [];

  // The landing hero is an EXPLICIT admin setting — never inferred from a
  // destination's photo. Uploading a Kashmir image must never change this.
  const heroImage = settings.heroImage ?? null;

  return (
    <LandingLeadExperience
      brandName={settings.brandName}
      heroImage={heroImage}
      vendors={vendors.map((v) => ({
        id: v.id,
        companyName: v.companyName,
        city: v.city,
        state: v.state,
        website: v.website,
        profileImage: v.profileImage,
      }))}
      vendorAds={vendorAds.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        imageUrl: a.imageUrl,
        landingUrl: a.landingUrl,
        destination: a.destination,
        vendorName: a.agent.companyName,
      }))}
      destinations={destinations.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        shortDescription: d.shortDescription,
        heroImage: d.heroImage,
        startingPrice: d.startingPrice,
        tripTypes: d.tripTypes,
        category: d.category,
        _count: d._count,
      }))}
      packages={packages.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        shortDescription: p.shortDescription,
        heroImage: p.heroImage,
        startingPrice: p.startingPrice,
        offerPrice: p.offerPrice,
        durationText: p.durationText,
        durationDays: p.durationDays,
        durationNights: p.durationNights,
        destination: p.destination ? { name: p.destination.name } : null,
        images: p.images.map((i) => ({ url: i.url, isHero: i.isHero })),
      }))}
      tours={tours.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        shortDescription: p.shortDescription,
        heroImage: p.heroImage,
        startingPrice: p.startingPrice,
        offerPrice: p.offerPrice,
        durationText: p.durationText,
        durationDays: p.durationDays,
        durationNights: p.durationNights,
        destination: p.destination ? { name: p.destination.name } : null,
        images: p.images.map((i) => ({ url: i.url, isHero: i.isHero })),
      }))}
    />
  );
}
