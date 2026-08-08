import { handler, ok, fail } from "@/lib/api";
import { requestPasswordReset } from "@/lib/auth/password-reset";

/**
 * Public endpoint — no authentication required.
 *
 * Intentionally returns the same success response whether or not the email
 * exists in our database. This prevents email-enumeration: an attacker
 * probing the endpoint learns nothing about which addresses are registered.
 * The actual email is only sent when a real matching user is found.
 */
export const POST = handler(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email address.", 422);

  await requestPasswordReset(email);
  return ok({ sent: true });
});
