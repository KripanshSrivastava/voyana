import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { saveMedia, MediaError } from "@/lib/media/storage";
import { createManualOrder } from "@/lib/credits/manual-payment";

/**
 * Agent submits a manual payment order.
 *
 * Multipart body:
 *  - packageId              (string, required)
 *  - transactionReference   (string, required, 3..120)
 *  - screenshot             (File,   required, JPG/PNG/WEBP, ≤5MB — validated by saveMedia)
 *
 * SECURITY:
 *  - Price/credits are NEVER read from the request. The manual-payment
 *    service re-reads the package from the DB (server side) and computes
 *    the amount from there. Anything the client sends as `amount`/`credits`
 *    is ignored.
 *  - The screenshot goes to Supabase Storage via the same saveMedia used
 *    for admin media (validated MIME + size limit).
 *  - The order is created for `session.agentId` only — an agent cannot
 *    forge `agentId` in the payload.
 */
export const POST = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);

  const form = await req.formData();
  const packageId = String(form.get("packageId") ?? "");
  const transactionReference = String(form.get("transactionReference") ?? "").trim();
  const screenshot = form.get("screenshot");
  if (!packageId) return fail("Choose a plan.", 422);
  if (transactionReference.length < 3) return fail("Enter your payment reference number.", 422);
  if (!(screenshot instanceof File) || screenshot.size === 0) return fail("Upload your payment screenshot.", 422);

  let uploadedUrl: string;
  try {
    const media = await saveMedia(screenshot, "payment-proofs");
    uploadedUrl = media.url;
  } catch (e) {
    if (e instanceof MediaError) return fail(e.message, 422);
    throw e;
  }

  const result = await createManualOrder({
    agentId: session.agentId,
    packageId,
    transactionReference,
    paymentScreenshotUrl: uploadedUrl,
  });
  if (!result.ok) {
    if (result.reason === "PACKAGE_NOT_FOUND") return fail("Selected plan no longer exists.", 404);
    if (result.reason === "PACKAGE_INACTIVE") return fail("This plan is no longer available.", 400);
    return fail("Could not submit payment.", 400);
  }
  return ok({ orderId: result.orderId, orderCode: result.orderCode });
});
