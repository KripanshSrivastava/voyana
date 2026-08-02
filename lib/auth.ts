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
  };
});

/** Throwable guard for API routes. Returns the session or throws an AuthError. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) {
    throw new AuthError(session ? 403 : 401);
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
