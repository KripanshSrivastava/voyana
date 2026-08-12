import { handler, ok, fail } from "@/lib/api";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { rateLimit, rateLimitResponse, ipFromRequest } from "@/lib/rate-limit";

/**
 * Public endpoint — no authentication required.
 *
 * Intentionally returns the same success response whether or not the email
 * exists in our database. This prevents email-enumeration: an attacker
 * probing the endpoint learns nothing about which addresses are registered.
 * The actual email is only sent when a real matching user is found.
 *
 * Rate limiting: two layers so we protect both a single email being probed
 * (prevents spamming the mailbox) and general endpoint abuse (prevents an
 * attacker running through a large dictionary from one host).
 */
export const POST = handler(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email address.", 422);

  const ip = ipFromRequest(req);
  const ipLimit = await rateLimit({ key: `forgot:ip:${ip}`, windowSeconds: 60 * 10, max: 10 });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit);
  const emailLimit = await rateLimit({ key: `forgot:email:${email}`, windowSeconds: 60 * 60, max: 5 });
  if (!emailLimit.allowed) return rateLimitResponse(emailLimit);

  await requestPasswordReset(email);
  return ok({ sent: true });
});
