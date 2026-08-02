import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { saveMedia, MediaError } from "@/lib/media/storage";
import { prisma } from "@/lib/db";

export const GET = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const folder = new URL(req.url).searchParams.get("folder") ?? undefined;
  const media = await prisma.media.findMany({
    where: folder ? { folder } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok(media);
});

export const POST = handler(async (req: Request) => {
  await requireRole("ADMIN");
  const form = await req.formData();
  const folder = (form.get("folder") as string) || "general";
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) return fail("No file provided.", 422);

  try {
    const saved = [];
    for (const file of files) {
      saved.push(await saveMedia(file, folder));
    }
    return ok(saved);
  } catch (e) {
    if (e instanceof MediaError) return fail(e.message, 422);
    throw e;
  }
});
