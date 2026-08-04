import { handler, ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { verifyCode } from "@/lib/auth/verification";

/** Consumes the pending TWO_FA token for the CURRENT session's user. Once
 *  consumed, agentAuthGate() stops blocking this session — there's no
 *  separate "session upgrade" step because the Supabase session cookie was
 *  already valid; this just clears the app-level gate that was holding it. */
export const POST = handler(async (req: Request) => {
  const session = await getSession();
  if (!session) return fail("Please sign in again.", 401);
  if (session.role !== "AGENT") return fail("Not applicable to this account.", 400);

  const { code } = await req.json();
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return fail("Enter the 6-digit code.", 422);

  const result = await verifyCode(session.uid, "TWO_FA", code);
  if (result === "OK") return ok({ verified: true });
  if (result === "NONE_PENDING") return fail("No sign-in code is pending. Please sign in again.", 400);
  if (result === "EXPIRED") return fail("This code has expired. Request a new one.", 410);
  if (result === "TOO_MANY_ATTEMPTS") return fail("Too many incorrect attempts. Request a new code.", 429);
  return fail("Incorrect code. Please try again.", 400);
});
