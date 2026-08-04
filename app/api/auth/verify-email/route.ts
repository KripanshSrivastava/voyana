import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { verifyCode, resendCooldownSeconds } from "@/lib/auth/verification";

/** Must be logged in (any state) — the code is checked against the CURRENT
 *  session's own user, never a client-supplied user/email, so one account
 *  can't be used to verify another. */
export const POST = handler(async (req: Request) => {
  const session = await getSession();
  if (!session) return fail("Please sign in again.", 401);
  if (session.role !== "AGENT") return fail("Not applicable to this account.", 400);
  if (session.emailVerified) return ok({ alreadyVerified: true });

  const { code } = await req.json();
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return fail("Enter the 6-digit code.", 422);

  const result = await verifyCode(session.uid, "EMAIL_VERIFY", code);
  if (result === "OK") {
    await prisma.user.update({ where: { id: session.uid }, data: { emailVerified: true, emailVerifiedAt: new Date() } });
    return ok({ verified: true });
  }
  if (result === "NONE_PENDING") return fail("No verification code is pending. Request a new one.", 400);
  if (result === "EXPIRED") return fail("This code has expired. Request a new one.", 410);
  if (result === "TOO_MANY_ATTEMPTS") return fail("Too many incorrect attempts. Request a new code.", 429);
  return fail("Incorrect code. Please try again.", 400);
});

export const GET = handler(async () => {
  const session = await getSession();
  if (!session) return fail("Please sign in again.", 401);
  const cooldown = await resendCooldownSeconds(session.uid, "EMAIL_VERIFY");
  return ok({ verified: session.emailVerified, email: session.email, cooldown });
});
