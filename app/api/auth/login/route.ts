import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth";
import { issueCode } from "@/lib/auth/verification";
import { rateLimit, rateLimitResponse, ipFromRequest } from "@/lib/rate-limit";
import { checkLoginLockout, recordLoginFailure, clearLoginFailures } from "@/lib/auth/lockout";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import type { Role } from "@/lib/constants";

/**
 * Login endpoint — three layers of abuse protection on top of Supabase Auth:
 *
 * 1. **IP rate limit** (broad): 15 attempts per minute from a single IP.
 *    Blocks credential-stuffing sprays that iterate through many emails.
 * 2. **Per-email rate limit** (narrow): 8 attempts per 5 minutes for the same
 *    email. Blocks steady drips against a single known account.
 * 3. **Progressive lockout on email**: increments a Redis counter on every
 *    failed sign-in; at 8 failures the email is locked out for 15 minutes.
 *
 * All three fail OPEN if Redis is unreachable — see the individual modules
 * for the rationale. Supabase itself is the ultimate authority; these layers
 * exist to slow abuse before it even reaches Supabase.
 */
export const POST = handler(async (req: Request) => {
  const body = await req.json();
  const data = loginSchema.parse(body);
  const email = data.email.toLowerCase();
  const intendedRole = (body.role as Role | undefined) ?? undefined;
  const ip = ipFromRequest(req);

  // Layer 0 — CAPTCHA, admin login only. Supabase's own captcha protection
  // is a project-wide GoTrue setting (would also gate agent/customer auth),
  // so it's verified here instead — scoped strictly to the admin portal.
  if (intendedRole === "ADMIN") {
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
    if (!(await verifyTurnstileToken(captchaToken, ip))) {
      return fail("Captcha verification failed. Please try again.", 400);
    }
  }

  // Layer 1 — IP rate limit. Broad, catches spraying.
  const ipLimit = await rateLimit({ key: `login:ip:${ip}`, windowSeconds: 60, max: 15 });
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit);

  // Layer 2 — per-email rate limit. Narrower, catches sustained probing.
  const emailLimit = await rateLimit({ key: `login:email:${email}`, windowSeconds: 300, max: 8 });
  if (!emailLimit.allowed) return rateLimitResponse(emailLimit);

  // Layer 3 — hard lockout check BEFORE hitting Supabase, so parallel requests
  // can't bypass the lockout by all racing through auth at once.
  const lockout = await checkLoginLockout(email);
  if (lockout.locked) {
    return new Response(
      JSON.stringify({ ok: false, error: "Too many failed attempts. Please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(lockout.retryAfterSeconds) } },
    );
  }

  // Authenticate with Supabase Auth (sets the session cookies on success).
  const supabase = await createSupabaseServer();
  const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password: data.password });
  if (error || !signIn.user) {
    const failInfo = await recordLoginFailure(email);
    // The delaySeconds is advisory — the client (or a well-behaved CLI) can
    // use it to space subsequent attempts. We never sleep server-side here.
    return fail("Invalid email or password.", 401, failInfo.delaySeconds > 0 ? { retryAfterSeconds: failInfo.delaySeconds } : undefined);
  }

  // Load the app profile for role gating + authId linkage.
  const user = await prisma.user.findUnique({ where: { email }, include: { agent: true } });
  if (!user) {
    await signOut();
    await recordLoginFailure(email);
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

  // Successful sign-in — clear failure counter so honest typos don't accumulate.
  await clearLoginFailures(email);

  // Agent verification gates — checked directly here (not via agentAuthGate,
  // which only checks whether a 2FA challenge is PENDING; on a fresh login
  // with 2FA enabled none has been issued yet, so it must be issued here).
  if (user.role === "AGENT") {
    if (!user.emailVerified) {
      return ok({ role: user.role, agentStatus: user.agent?.status ?? null, requiresEmailVerification: true });
    }
    if (user.twoFactorEnabled) {
      const twoFa = await issueCode({ userId: user.id, email: user.email, name: user.name, type: "TWO_FA" });
      // Surface a diagnostic when the code exists in the DB but never left
      // the mail queue — otherwise the user sits on /agent/verify-2fa
      // wondering why the email never arrives.
      return ok({
        role: user.role,
        agentStatus: user.agent?.status ?? null,
        requiresTwoFactor: true,
        emailDelivered: twoFa.delivered,
      });
    }
  }

  return ok({ role: user.role, agentStatus: user.agent?.status ?? null });
});
