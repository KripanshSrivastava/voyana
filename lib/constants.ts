// Central place for the string "enums" (SQLite has no native enum support).

export const ROLES = ["ADMIN", "AGENT", "CUSTOMER"] as const;
export type Role = (typeof ROLES)[number];

export const AGENT_STATUSES = ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const VERIFICATION_STATUSES = ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "SUSPENDED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600 ring-slate-500/20",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 ring-amber-600/20",
  VERIFIED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-600/20",
  SUSPENDED: "bg-orange-50 text-orange-700 ring-orange-600/20",
};

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "AVAILABLE",
  "SHARED",
  "IN_PROGRESS",
  "CONVERTED",
  "LOST",
  "INVALID",
  "DUPLICATE",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_QUALITIES = ["UNREVIEWED", "POOR", "AVERAGE", "GOOD", "EXCELLENT"] as const;
export type LeadQuality = (typeof LEAD_QUALITIES)[number];

export const ASSIGNMENT_STATUSES = [
  "PURCHASED",
  "CONTACTED",
  "INTERESTED",
  "QUOTE_SENT",
  "NEGOTIATING",
  "BOOKED",
  "WON",
  "LOST",
  "NO_RESPONSE",
  "SPAM",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ASSIGNMENT_STATUS_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  PURCHASED: ["CONTACTED", "INTERESTED", "QUOTE_SENT", "NEGOTIATING", "LOST", "NO_RESPONSE", "SPAM"],
  CONTACTED: ["INTERESTED", "QUOTE_SENT", "NEGOTIATING", "BOOKED", "WON", "LOST", "NO_RESPONSE", "SPAM"],
  INTERESTED: ["QUOTE_SENT", "NEGOTIATING", "BOOKED", "WON", "LOST", "NO_RESPONSE", "SPAM"],
  QUOTE_SENT: ["NEGOTIATING", "BOOKED", "WON", "LOST", "NO_RESPONSE", "SPAM"],
  NEGOTIATING: ["BOOKED", "WON", "LOST", "NO_RESPONSE", "SPAM"],
  BOOKED: ["WON", "LOST", "SPAM"],
  WON: [],
  LOST: [],
  NO_RESPONSE: [],
  SPAM: [],
};

export const SPAM_REASONS = [
  "wrong_number",
  "fake",
  "duplicate",
  "not_interested",
  "invalid",
  "already_booked",
  "other",
] as const;

export const TRIP_TYPES = [
  "Family",
  "Honeymoon",
  "Adventure",
  "Luxury",
  "Budget",
  "Friends",
  "Solo",
  "Corporate",
  "Religious",
] as const;

export const REQUIREMENTS = ["Hotel", "Flights", "Transport", "Sightseeing", "Meals"] as const;

export const PACKAGE_KINDS = ["PACKAGE", "TOUR"] as const;
export type PackageKind = (typeof PACKAGE_KINDS)[number];

export const SUPPORT_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_VENDOR", "RESOLVED", "CLOSED"] as const;
export const SUPPORT_CATEGORIES = ["general", "billing", "leads", "technical", "other"] as const;

export const TRIP_CATEGORIES = ["DOMESTIC", "INTERNATIONAL", "INBOUND"] as const;

export const VENDOR_AD_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "PAUSED", "EXPIRED"] as const;

export const ADMIN_ROLES = ["SUPER_ADMIN", "LEAD_MANAGER", "SALES_MANAGER", "FINANCE_ADMIN", "SUPPORT_ADMIN", "MARKETING_ADMIN", "CONTENT_ADMIN"] as const;

// UI helpers -----------------------------------------------------------------

export const LEAD_STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 ring-blue-600/20",
  CONTACTED: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  QUALIFIED: "bg-violet-50 text-violet-700 ring-violet-600/20",
  AVAILABLE: "bg-teal-50 text-teal-700 ring-teal-600/20",
  SHARED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  IN_PROGRESS: "bg-orange-50 text-orange-700 ring-orange-600/20",
  CONVERTED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  LOST: "bg-rose-50 text-rose-700 ring-rose-600/20",
  INVALID: "bg-slate-100 text-slate-600 ring-slate-500/20",
  DUPLICATE: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export const QUALITY_STYLES: Record<string, string> = {
  UNREVIEWED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  POOR: "bg-rose-50 text-rose-700 ring-rose-600/20",
  AVERAGE: "bg-amber-50 text-amber-700 ring-amber-600/20",
  GOOD: "bg-teal-50 text-teal-700 ring-teal-600/20",
  EXCELLENT: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export const AGENT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  SUSPENDED: "bg-orange-50 text-orange-700 ring-orange-600/20",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-600/20",
};
