import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { saveMedia, MediaError } from "@/lib/media/storage";

/**
 * Agent-scoped image upload for content submissions. Reuses the exact same
 * saveMedia() core (validation, Supabase Storage, Media row) as the admin
 * media route — no duplicate upload system. The returned URL only becomes
 * attached to a submission via the agent's own destination/package PATCH
 * routes, which already enforce that the agent owns the submission — so an
 * uploaded image can never be attached to someone else's content.
 */
export const POST = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);

  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) return fail("No file provided.", 422);
  if (files.length > 1) return fail("Upload one image at a time.", 422);

  try {
    const saved = await saveMedia(files[0], "vendor-submissions");
    return ok([saved]);
  } catch (e) {
    if (e instanceof MediaError) return fail(e.message, 422);
    throw e;
  }
});
