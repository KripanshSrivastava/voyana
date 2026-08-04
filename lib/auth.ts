import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import { createSupabaseServer } from "./supabase/server";
import type { Role } from "./constants";

export type SessionUser = {
  uid: string;
  email: string;
  name: string;
  role: Role;
  adminRole?: string | null;
  agentId?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
};

/**
 * Resolves the current session from Supabase Auth, then loads the linked
 * app profile (User + Agent) from Postgres. Cached per-request so repeated
 * requireRole/getSession calls don't re-hit Supabase. Returns the same
 * SessionUser shape the app used under the old JWT auth.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const authUser = data.user;

  // Link by Supabase UUID; self-heal from email for pre-migration rows.
  let user = await prisma.user.findUnique({ where: { authId: authUser.id }, include: { agent: true } });
  if (!user && authUser.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: authUser.email.toLowerCase() }, include: { agent: true } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { authId: authUser.id },
        include: { agent: true },
      });
    }
  }
  if (!user) return null;

  return {
    uid: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    adminRole: user.adminRole,
    agentId: user.agent?.id,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
  };
});

/**
 * Server-side gate for AGENT sessions: the Supabase password session may be
 * fully valid while the app-level flow isn't finished yet. Checked wherever
 * an agent session is required (page guards AND API routes) so verification
 * can never be skipped by calling an API directly or manipulating client
 * state — only a consumed, matching token clears these.
 */
export type AgentAuthGate = "OK" | "NEEDS_EMAIL_VERIFICATION" | "NEEDS_TWO_FACTOR";

export async function agentAuthGate(session: SessionUser): Promise<AgentAuthGate> {
  if (session.role !== "AGENT") return "OK";
  if (!session.emailVerified) return "NEEDS_EMAIL_VERIFICATION";
  if (session.twoFactorEnabled) {
    const { hasPendingTwoFactor } = await import("./auth/verification");
    if (await hasPendingTwoFactor(session.uid)) return "NEEDS_TWO_FACTOR";
  }
  return "OK";
}

/** Throwable guard for API routes. Returns the session or throws an AuthError. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) {
    throw new AuthError(session ? 403 : 401);
  }
  if (session.role === "AGENT" && (await agentAuthGate(session)) !== "OK") {
    // Password session exists but email/2FA verification isn't complete —
    // treat exactly like "not authenticated" for every API route. This is
    // what stops verification/2FA from being bypassed by calling an API
    // directly instead of going through the portal UI.
    throw new AuthError(401);
  }
  return session;
}

/** Ends the Supabase session (clears auth cookies). */
export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
}

export class AuthError extends Error {
  status: number;
  constructor(status: number) {
    super(status === 401 ? "Unauthorized" : "Forbidden");
    this.status = status;
  }
}
