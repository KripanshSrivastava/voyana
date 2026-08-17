import "server-only";
import type { SessionUser } from "./auth";
import { adminCanAccess, type AdminArea } from "./rbac-areas";

export type { AdminArea };

/**
 * Admin areas an admin sub-role may access. SUPER_ADMIN implicitly gets all.
 * An ADMIN with no adminRole set behaves as SUPER_ADMIN (backward-compatible
 * with single-admin setups). Enforced server-side, not just by hiding UI.
 * Role→area mapping lives in rbac-areas.ts so AdminShell (a client
 * component) can filter nav items with the same rule.
 */
export function canAccess(session: SessionUser, area: AdminArea): boolean {
  if (session.role !== "ADMIN") return false;
  return adminCanAccess(session.adminRole ?? null, area);
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(area: AdminArea) { super(`Your admin role cannot access "${area}".`); }
}

/** Throwable guard for admin routes needing a specific area permission. */
export function requireArea(session: SessionUser, area: AdminArea): void {
  if (!canAccess(session, area)) throw new ForbiddenError(area);
}
