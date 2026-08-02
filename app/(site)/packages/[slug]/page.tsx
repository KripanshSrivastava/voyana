import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPackageBySlug } from "@/lib/cms/queries";
import { PackageDetail } from "@/components/site/PackageDetail";
import { prisma } from "@/lib/db";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.tourPackage.findFirst({ where: { slug, published: true, kind: "PACKAGE" } });
  if (!p) return { title: "Package not found" };
  return {
    title: p.seoTitle || p.title,
    description: p.seoDescription || p.shortDescription || undefined,
    alternates: { canonical: `/packages/${p.slug}` },
    robots: p.noindex ? { index: false } : undefined,
    openGraph: { images: p.heroImage ? [p.heroImage] : undefined },
  };
}

export default async function PackagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPackageBySlug(slug, "PACKAGE");
  if (!p) notFound();
  return <PackageDetail p={p} basePath="/packages" />;
}
