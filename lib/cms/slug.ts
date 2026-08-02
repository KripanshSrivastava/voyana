import { prisma } from "../db";
import { slugify } from "../utils";

export async function uniqueDestinationSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "destination";
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = await prisma.destination.findUnique({ where: { slug } });
    if (!found || found.id === excludeId) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

export async function uniquePackageSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "package";
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = await prisma.tourPackage.findUnique({ where: { slug } });
    if (!found || found.id === excludeId) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}
