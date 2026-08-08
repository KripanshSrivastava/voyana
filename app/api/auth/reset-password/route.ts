import { handler, ok, fail } from "@/lib/api";
import { redeemPasswordReset } from "@/lib/auth/password-reset";

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

/** Consumes a reset token and sets the new password. Same policy enforced
 *  as at signup — see lib/validation.ts::agentSignupSchema. Never logs the
 *  token or password. */
export const POST = handler(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

  if (!token) return fail("Reset link is missing or invalid.", 400);
  if (!newPassword) return fail("Enter a new password.", 422);
  if (newPassword !== confirmPassword) return fail("Passwords do not match.", 422);
  if (!PASSWORD_POLICY.test(newPassword)) {
    return fail("Password must be at least 8 characters and include upper case, lower case, a number, and a special character.", 422);
  }

  const result = await redeemPasswordReset(token, newPassword);
  if (result.ok) return ok({ reset: true });

  const reason = result.reason;
  if (reason === "EXPIRED") return fail("This reset link has expired. Request a new one.", 410);
  if (reason === "USED") return fail("This reset link has already been used. Request a new one.", 410);
  return fail("This reset link is invalid. Request a new one.", 400);
});
