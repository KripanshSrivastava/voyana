import "server-only";
import { prisma } from "../db";
import { sendEmail } from "../email/mailer";
import { verifyEmailCode, twoFactorCode } from "../email/templates";
import { generateOtp, hashCode, verifyCodeHash } from "./otp";

export type VerificationType = "EMAIL_VERIFY" | "TWO_FA";

const RESEND_COOLDOWN_MS = 45_000;
const MAX_ATTEMPTS = 5;
const EXPIRES_MINUTES = Number(process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES) || 15;
const TWO_FA_EXPIRES_MINUTES = 10;

function expiryFor(type: VerificationType): Date {
  const minutes = type === "TWO_FA" ? TWO_FA_EXPIRES_MINUTES : EXPIRES_MINUTES;
  return new Date(Date.now() + minutes * 60 * 1000);
}

/** Most recent token of this type for this user, regardless of consumed state. */
async function latestToken(userId: string, type: VerificationType) {
  return prisma.verificationToken.findFirst({ where: { userId, type }, orderBy: { createdAt: "desc" } });
}

/** Seconds remaining before another code may be requested; 0 if clear to send. */
export async function resendCooldownSeconds(userId: string, type: VerificationType): Promise<number> {
  const last = await latestToken(userId, type);
  if (!last) return 0;
  const elapsed = Date.now() - last.createdAt.getTime();
  return Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000));
}

/**
 * Issues a fresh code, invalidating any previous unconsumed token of the same
 * type first (so only the newest code is ever valid), and emails it.
 * Never throws — email failure is logged by sendEmail() and surfaced to the
 * caller via the return value, but doesn't corrupt token state.
 */
export async function issueCode(params: {
  userId: string;
  email: string;
  name: string;
  type: VerificationType;
}): Promise<{ sent: boolean; delivered: boolean }> {
  const { userId, email, name, type } = params;

  await prisma.verificationToken.updateMany({
    where: { userId, type, consumedAt: null },
    data: { consumedAt: new Date() }, // invalidate — superseded by the new code
  });

  const code = generateOtp();
  await prisma.verificationToken.create({
    data: { userId, type, codeHash: hashCode(code), expiresAt: expiryFor(type) },
  });

  const template = type === "TWO_FA" ? twoFactorCode({ name, code }) : verifyEmailCode({ name, code });
  const result = await sendEmail({ to: email, ...template, category: "verify" });
  // `skipped: true` means Resend is unconfigured or refused — the code
  // exists in the DB and could still be manually surfaced (e.g. by an admin
  // reading IntegrationLog), but the user won't receive an email.
  // Bubble that up so callers can warn the user instead of silently claiming
  // "check your inbox".
  return { sent: result.ok, delivered: result.ok && !result.skipped };
}

export type VerifyResult = "OK" | "INVALID" | "EXPIRED" | "TOO_MANY_ATTEMPTS" | "NONE_PENDING";

/**
 * Checks a submitted code against the latest unconsumed token. Wrong guesses
 * increment `attempts`; once MAX_ATTEMPTS is hit the token is invalidated
 * outright (the user must request a new code) rather than allowed to keep
 * guessing indefinitely.
 */
export async function verifyCode(userId: string, type: VerificationType, code: string): Promise<VerifyResult> {
  const token = await prisma.verificationToken.findFirst({
    where: { userId, type, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!token) return "NONE_PENDING";
  if (token.expiresAt < new Date()) return "EXPIRED";
  if (token.attempts >= MAX_ATTEMPTS) return "TOO_MANY_ATTEMPTS";

  if (!verifyCodeHash(code, token.codeHash)) {
    await prisma.verificationToken.update({ where: { id: token.id }, data: { attempts: { increment: 1 } } });
    return "INVALID";
  }

  await prisma.verificationToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });
  return "OK";
}

/** True if this user has an unconsumed, unexpired 2FA challenge outstanding —
 *  i.e. password was correct but the login is not yet fully authenticated. */
export async function hasPendingTwoFactor(userId: string): Promise<boolean> {
  const token = await prisma.verificationToken.findFirst({
    where: { userId, type: "TWO_FA", consumedAt: null, expiresAt: { gt: new Date() } },
  });
  return Boolean(token);
}
