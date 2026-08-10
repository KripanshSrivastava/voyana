import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { ADMIN_ROLES } from "@/lib/constants";
import { sendEmail, emailConfigured } from "@/lib/email/mailer";
import { adminInviteEmail } from "@/lib/email/templates";

/**
 * Admin-user management. Only the Main Admin (SUPER_ADMIN) may create or
 * list other admins — everything here bypasses the usual area-based RBAC
 * because "creating admins" is inherently a superuser concern.
 *
 * Onboarding flow: we create the local User row first, then trigger
 * Supabase's built-in invite email (`inviteUserByEmail`). The invitee gets
 * a magic link, clicks it, lands on /admin/set-password with an authenticated
 * Supabase session, and sets their own password. No password ever travels
 * over email. If the Supabase call fails we roll back the local User row so
 * we never end up with an orphan.
 */

function requireSuperAdmin(session: { adminRole?: string | null }) {
  // An ADMIN with no adminRole is treated as SUPER_ADMIN (matches rbac.ts).
  if (session.adminRole && session.adminRole !== "SUPER_ADMIN") {
    throw Object.assign(new Error("Only the Main Admin can manage admin users."), { status: 403 });
  }
}

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GET = handler(async () => {
  const session = await requireRole("ADMIN");
  requireSuperAdmin(session);

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: [{ createdAt: "desc" }],
    // Only what the listing table renders — no passwordHash, no authId echo.
    select: {
      id: true,
      email: true,
      name: true,
      adminRole: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return ok({ admins, currentAdminId: session.uid });
});

export const POST = handler(async (req: Request) => {
  const session = await requireRole("ADMIN");
  requireSuperAdmin(session);

  const body = await req.json().catch(() => ({}));
  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const rawName = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const rawRole = typeof body.adminRole === "string" ? body.adminRole : "";

  if (!rawEmail || !EMAIL_RE.test(rawEmail)) return fail("Enter a valid email address.", 422);
  if (!rawName) return fail("Full name is required.", 422);
  if (!(ADMIN_ROLES as readonly string[]).includes(rawRole)) return fail("Pick a valid admin role.", 422);

  // Reject duplicates up front. If an admin needs to re-invite a lapsed
  // account, they should delete or reset that user first — silently
  // re-inviting would let anyone with the SUPER_ADMIN role reset an
  // existing admin's session by clicking one button, which is a surprise.
  const existing = await prisma.user.findUnique({ where: { email: rawEmail }, select: { id: true, role: true } });
  if (existing) {
    return fail(
      existing.role === "ADMIN"
        ? "An admin with that email already exists."
        : "Another account already uses that email.",
      409,
    );
  }

  // Create the local User row FIRST so getSession() can self-heal the authId
  // via the email fallback when the invitee first authenticates. emailVerified
  // stays true — admins bypass the app-level verification gate the same way
  // pre-existing admin rows do.
  const created = await prisma.user.create({
    data: {
      email: rawEmail,
      name: rawName,
      role: "ADMIN",
      adminRole: rawRole,
      emailVerified: true,
    },
    select: { id: true, email: true, name: true, adminRole: true, createdAt: true },
  });

  // Two-step invite:
  //   1. generateLink({ type: "invite" }) creates the Supabase auth user
  //      and returns an action_link WITHOUT sending Supabase's default
  //      email. This lets us keep the outbound sender consistent with the
  //      rest of the platform (Resend, our brand template).
  //   2. sendEmail() delivers our own branded invite through Resend.
  // Any failure at either step rolls back everything it created so we
  // never leave an orphan (User row without auth identity, or auth user
  // with no User row, or auth user that never got the email).
  let supabaseAuthUserId: string | null = null;
  let actionLink: string | null = null;
  const supabaseAdmin = createSupabaseAdmin();
  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: rawEmail,
      options: {
        redirectTo: `${appUrl()}/admin/set-password`,
        data: { name: rawName, role: "ADMIN", adminRole: rawRole },
      },
    });
    if (error) throw error;
    supabaseAuthUserId = data.user?.id ?? null;
    actionLink = data.properties?.action_link ?? null;
    if (!actionLink) throw new Error("Supabase did not return an invite link.");
  } catch (e) {
    await prisma.user.delete({ where: { id: created.id } }).catch(() => {});
    const message = e instanceof Error ? e.message : "Could not create the invite.";
    const status = /already/i.test(message) ? 409 : 502;
    return fail(message, status);
  }

  // Deliver our own branded email via Resend. `sendEmail` never throws — it
  // returns { ok, skipped }. `skipped:true` means RESEND_API_KEY isn't set,
  // which is fine in dev — we return the action_link in the response so a
  // developer can click through without a mail provider.
  const emailResult = await sendEmail({
    to: rawEmail,
    ...adminInviteEmail({
      name: rawName,
      adminRole: rawRole,
      inviterName: session.name,
      link: actionLink,
    }),
    category: "account",
  });

  if (!emailResult.ok && !emailResult.skipped) {
    // Real send failure. Roll back the auth user AND the User row so the
    // admin can safely retry with the same email.
    if (supabaseAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(supabaseAuthUserId).catch(() => {});
    }
    await prisma.user.delete({ where: { id: created.id } }).catch(() => {});
    return fail("Could not deliver the invite email. Please try again.", 502);
  }

  await logAudit({
    actorType: "ADMIN",
    actorId: session.uid,
    actorLabel: session.name,
    action: "admin.invite",
    entityType: "agent", // AuditLog.entityType has no "user" — closest existing bucket.
    entityId: created.id,
    metadata: { email: rawEmail, adminRole: rawRole, emailDelivered: emailResult.ok && !emailResult.skipped },
  });

  // In dev (no RESEND_API_KEY), surface the action_link so the developer can
  // click through without a mail provider. In production this branch never
  // returns the link — a working provider is required.
  const devInviteLink = !emailConfigured() ? actionLink : undefined;
  return ok({ admin: created, devInviteLink });
});
