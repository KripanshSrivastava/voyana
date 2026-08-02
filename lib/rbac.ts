import "server-only";
import type { SessionUser } from "./auth";

/**
 * Admin areas an admin sub-role may access. SUPER_ADMIN implicitly gets all.
 * An ADMIN with no adminRole set behaves as SUPER_ADMIN (backward-compatible
 * with single-admin setups). Enforced server-side, not just by hiding UI.
 */
export type AdminArea = "leads" | "finance" | "support" | "marketing" | "content" | "vendors" | "settings" | "flags";

const ROLE_AREAS: Record<string, AdminArea[]> = {
  SUPER_ADMIN: ["leads", "finance", "support", "marketing", "content", "vendors", "settings", "flags"],
  LEAD_MANAGER: ["leads", "vendors"],
  SALES_MANAGER: ["leads", "vendors"],
  FINANCE_ADMIN: ["finance", "vendors"],
  SUPPORT_ADMIN: ["support", "vendors"],
  MARKETING_ADMIN: ["marketing", "leads"],
  CONTENT_ADMIN: ["content"],
};

export function canAccess(session: SessionUser, area: AdminArea): boolean {
  if (session.role !== "ADMIN") return false;
  if (!session.adminRole || session.adminRole === "SUPER_ADMIN") return true;
  return (ROLE_AREAS[session.adminRole] ?? []).includes(area);
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(area: AdminArea) { super(`Your admin role cannot access "${area}".`); }
}

/** Throwable guard for admin routes needing a specific area permission. */
export function requireArea(session: SessionUser, area: AdminArea): void {
  if (!canAccess(session, area)) throw new ForbiddenError(area);
}
