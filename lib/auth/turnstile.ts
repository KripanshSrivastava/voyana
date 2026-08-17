import "server-only";

/**
 * Cloudflare Turnstile verification — admin login only.
 *
 * Supabase's own captcha protection is a project-wide GoTrue setting: turning
 * it on would also gate agent and customer sign-in/sign-up, which isn't what
 * was asked for. Verifying the same provider ourselves, scoped to the one
 * route that calls this (app/api/auth/login/route.ts, intendedRole==="ADMIN"),
 * gets the same bot protection without touching agent/customer auth at all.
 */
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Fail closed — a misconfigured secret must not silently disable the
    // one check that was explicitly asked for.
    console.error("[turnstile] TURNSTILE_SECRET_KEY not set — rejecting admin login until configured");
    return false;
  }
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    console.error("[turnstile] siteverify request failed:", e);
    return false;
  }
}
