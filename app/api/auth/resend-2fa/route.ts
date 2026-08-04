import { handler, ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { hasPendingTwoFactor, issueCode, resendCooldownSeconds } from "@/lib/auth/verification";

export const POST = handler(async () => {
  const session = await getSession();
  if (!session) return fail("Please sign in again.", 401);
  if (session.role !== "AGENT" || !session.twoFactorEnabled) return fail("Not applicable to this account.", 400);
  if (!(await hasPendingTwoFactor(session.uid))) return fail("No sign-in code is pending. Please sign in again.", 400);

  const cooldown = await resendCooldownSeconds(session.uid, "TWO_FA");
  if (cooldown > 0) return fail(`Please wait ${cooldown}s before requesting another code.`, 429, { cooldown });

  const { sent } = await issueCode({ userId: session.uid, email: session.email, name: session.name, type: "TWO_FA" });
  return ok({ sent, cooldown: 45 });
});
