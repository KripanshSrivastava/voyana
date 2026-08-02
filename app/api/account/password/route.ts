import { createClient } from "@supabase/supabase-js";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

/** Change the signed-in user's password via Supabase Auth. Requires the current
 *  password (verified with a throwaway sign-in) before updating. */
export const POST = handler(async (req: Request) => {
  const session = await requireRole("AGENT", "ADMIN");
  const { currentPassword, newPassword } = changePasswordSchema.parse(await req.json());

  // Verify the current password without disturbing the active session.
  const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: verifyErr } = await verifier.auth.signInWithPassword({ email: session.email, password: currentPassword });
  if (verifyErr) return fail("Your current password is incorrect.", 401);

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return fail(error.message, 400);

  await logAudit({ actorType: session.role === "ADMIN" ? "ADMIN" : "AGENT", actorId: session.uid, actorLabel: session.name, action: "account.password_change", entityType: session.role === "ADMIN" ? "agent" : "agent", entityId: session.uid });
  return ok({ changed: true });
});
