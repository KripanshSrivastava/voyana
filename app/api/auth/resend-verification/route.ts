import { handler, ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { issueCode, resendCooldownSeconds } from "@/lib/auth/verification";

export const POST = handler(async () => {
  const session = await getSession();
  if (!session) return fail("Please sign in again.", 401);
  if (session.role !== "AGENT") return fail("Not applicable to this account.", 400);
  if (session.emailVerified) return ok({ alreadyVerified: true });

  const cooldown = await resendCooldownSeconds(session.uid, "EMAIL_VERIFY");
  if (cooldown > 0) return fail(`Please wait ${cooldown}s before requesting another code.`, 429, { cooldown });

  const { sent } = await issueCode({ userId: session.uid, email: session.email, name: session.name, type: "EMAIL_VERIFY" });
  return ok({ sent, cooldown: 45 });
});
