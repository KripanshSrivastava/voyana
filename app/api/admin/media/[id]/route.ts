import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { deleteMedia, findMediaUsage } from "@/lib/media/storage";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handler(async (req: Request, ctx: Ctx) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return fail("Media not found.", 404);

  const force = new URL(req.url).searchParams.get("force") === "1";
  const usage = await findMediaUsage(media.url);
  if (usage.used && !force) {
    return fail("This image is in use by published content. Delete it anyway?", 409, { usage });
  }

  await deleteMedia(id);
  return ok({ id });
});
