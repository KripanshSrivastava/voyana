/**
 * Pure data shared between server-side RBAC enforcement (lib/rbac.ts, which
 * is server-only) and client-side nav filtering (AdminShell) — kept in its
 * own file, with no "server-only" import, so client components can read it
 * directly instead of duplicating the role→area mapping.
 */
export type AdminArea = "leads" | "finance" | "support" | "marketing" | "content" | "vendors" | "settings" | "flags";

export const ROLE_AREAS: Record<string, AdminArea[]> = {
  SUPER_ADMIN: ["leads", "finance", "support", "marketing", "content", "vendors", "settings", "flags"],
  LEAD_MANAGER: ["leads", "vendors"],
  SALES_MANAGER: ["leads", "vendors"],
  FINANCE_ADMIN: ["finance", "vendors"],
  SUPPORT_ADMIN: ["support", "vendors"],
  MARKETING_ADMIN: ["marketing", "leads"],
  CONTENT_ADMIN: ["content"],
};

/** Same rule as lib/rbac.ts's canAccess, minus the role !== "ADMIN" check
 *  (the caller is always already inside the admin panel). */
export function adminCanAccess(adminRole: string | null, area: AdminArea): boolean {
  if (!adminRole || adminRole === "SUPER_ADMIN") return true;
  return (ROLE_AREAS[adminRole] ?? []).includes(area);
}
