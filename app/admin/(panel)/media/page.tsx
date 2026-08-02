import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

export default async function MediaPage() {
  const media = await prisma.media.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <PageHeader title="Media library" subtitle="Upload and manage images used across the site." />
      <MediaLibrary initial={media} />
    </div>
  );
}
