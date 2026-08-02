import { LandingLeadExperience } from "@/components/site/LandingLeadExperience";
import { getFeaturedDestinations, getFeaturedPackages } from "@/lib/cms/queries";

export default async function HomePage() {
  const [destinations, packages, tours] = await Promise.all([
    getFeaturedDestinations(6),
    getFeaturedPackages("PACKAGE", 6),
    getFeaturedPackages("TOUR", 3),
  ]);

  const heroImage = destinations.find((d) => d.heroImage)?.heroImage ?? null;

  return (
    <LandingLeadExperience
      heroImage={heroImage}
      destinations={destinations.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        shortDescription: d.shortDescription,
        heroImage: d.heroImage,
        startingPrice: d.startingPrice,
        tripTypes: d.tripTypes,
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
