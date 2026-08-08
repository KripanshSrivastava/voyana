import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "../db";
import { sendEmail } from "../email/mailer";
import { passwordResetEmail } from "../email/templates";
import { hashCode, verifyCodeHash } from "./otp";
import { createSupabaseAdmin } from "../supabase/admin";

/**
 * Password reset flow, deliberately kept separate from OTP verification:
 *  - The user is NOT logged in when they click the reset link, so lookups
 *    must be by the URL token's hash, not by user id.
 *  - The token is a 32-byte hex string (256 bits of entropy) — long enough
 *    to be safely used in a link that can be forwarded through email
 *    without any additional per-user throttling on the reset endpoint.
 *  - The raw token is emailed once; only its sha256 is stored. If a lookup
 *    ever leaks, an attacker gets the hash — insufficient to reset any
 *    account.
 *  - Old tokens for the same user are invalidated on issue so only the
 *    latest link works. Successful redemption consumes the token; replaying
 *    the same link fails.
 *  - The request endpoint MUST NOT reveal whether the email exists — it
 *    always responds with the same message. Enumeration cost is zero.
 */

const TOKEN_BYTES = 32;
const EXPIRES_MINUTES = 30;

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "");
}

/**
 * If the email matches a real user, issue a reset token and email the link.
 * If it doesn't, silently succeed — the caller (API route) reports the same
 * "we'll email you if the account exists" response either way so the endpoint
 * can't be used to enumerate registered emails.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true, name: true, email: true } });
  if (!user) return; // Silent no-op — do not reveal that the email is unknown.

  // Invalidate any previously issued reset tokens so only the newest link works.
  await prisma.verificationToken.updateMany({
    where: { userId: user.id, type: "PASSWORD_RESET", consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const rawToken = randomBytes(TOKEN_BYTES).toString("hex");
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      type: "PASSWORD_RESET",
      codeHash: hashCode(rawToken),
      expiresAt: new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000),
    },
  });

  const link = `${appUrl()}/agent/reset-password?token=${rawToken}`;
  await sendEmail({
    to: user.email,
    ...passwordResetEmail({ name: user.name, link, expiresMinutes: EXPIRES_MINUTES }),
    category: "account",
  });
  // Best-effort: sendEmail already never throws. If the email provider is
  // down, the token is still valid — the user can request again once mail
  // is back. Never log the raw token.
}

export type PasswordResetResult =
  | { ok: true; email: string }
  | { ok: false; reason: "INVALID" | "EXPIRED" | "USED" };

/**
 * Validate a reset link token WITHOUT consuming it — used by the reset
 * page's server render to decide whether to show the "expired link"
 * message or the actual form.
 */
export async function inspectResetToken(rawToken: string): Promise<PasswordResetResult> {
  if (!rawToken || typeof rawToken !== "string") return { ok: false, reason: "INVALID" };
  const record = await prisma.verificationToken.findFirst({
    where: { type: "PASSWORD_RESET", codeHash: hashCode(rawToken) },
    include: { user: { select: { email: true } } },
  });
  if (!record) return { ok: false, reason: "INVALID" };
  if (record.consumedAt) return { ok: false, reason: "USED" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "EXPIRED" };
  return { ok: true, email: record.user.email };
}

/**
 * Consume a reset token and update the user's Supabase Auth password.
 * Atomic to the extent Prisma + Supabase allow: the token is marked
 * consumed BEFORE the Supabase call, so a Supabase failure doesn't allow
 * a second attempt with the same link. If Supabase fails, the user must
 * request a new link — that's the safe fallback, not a security regression.
 */
export async function redeemPasswordReset(rawToken: string, newPassword: string): Promise<PasswordResetResult> {
  if (!rawToken) return { ok: false, reason: "INVALID" };
  const record = await prisma.verificationToken.findFirst({
    where: { type: "PASSWORD_RESET", codeHash: hashCode(rawToken) },
    include: { user: { select: { id: true, authId: true, email: true } } },
  });
  if (!record) return { ok: false, reason: "INVALID" };
  if (record.consumedAt) return { ok: false, reason: "USED" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "EXPIRED" };
  if (!verifyCodeHash(rawToken, record.codeHash)) return { ok: false, reason: "INVALID" };
  if (!record.user.authId) return { ok: false, reason: "INVALID" };

  // Mark consumed first — a Supabase failure is preferable to leaving a
  // reusable token behind.
  await prisma.verificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } });

  const admin = createSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(record.user.authId, { password: newPassword });
  if (error) {
    // Token is already consumed. User has to request a new link. Never
    // log the raw token or password — Supabase's error is safe to surface.
    console.error("[password-reset] supabase updateUserById failed:", error.message);
    return { ok: false, reason: "INVALID" };
  }
  return { ok: true, email: record.user.email };
}
