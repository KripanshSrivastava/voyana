import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth";
import { issueCode } from "@/lib/auth/verification";
import type { Role } from "@/lib/constants";

export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const data = loginSchema.parse(body);
  const email = data.email.toLowerCase();
  const intendedRole = (body.role as Role | undefined) ?? undefined;

  // Authenticate with Supabase Auth (sets the session cookies on success).
  const supabase = await createSupabaseServer();
  const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password: data.password });
  if (error || !signIn.user) {
    return fail("Invalid email or password.", 401);
  }

  // Load the app profile for role gating + authId linkage.
  const user = await prisma.user.findUnique({ where: { email }, include: { agent: true } });
  if (!user) {
    await signOut();
    return fail("Invalid email or password.", 401);
  }
  if (!user.authId) {
    await prisma.user.update({ where: { id: user.id }, data: { authId: signIn.user.id } });
  }

  // Portal gating.
  if (intendedRole === "ADMIN" && user.role !== "ADMIN") {
    await signOut();
    return fail("This login is for administrators only.", 403);
  }
  if (intendedRole === "AGENT" && user.role !== "AGENT") {
    await signOut();
    return fail("This login is for travel agents. Use the admin login instead.", 403);
  }

  // Agent verification gates — checked directly here (not via agentAuthGate,
  // which only checks whether a 2FA challenge is PENDING; on a fresh login
  // with 2FA enabled none has been issued yet, so it must be issued here).
  if (user.role === "AGENT") {
    if (!user.emailVerified) {
      return ok({ role: user.role, agentStatus: user.agent?.status ?? null, requiresEmailVerification: true });
    }
    if (user.twoFactorEnabled) {
      await issueCode({ userId: user.id, email: user.email, name: user.name, type: "TWO_FA" });
      return ok({ role: user.role, agentStatus: user.agent?.status ?? null, requiresTwoFactor: true });
    }
  }

  return ok({ role: user.role, agentStatus: user.agent?.status ?? null });
});
