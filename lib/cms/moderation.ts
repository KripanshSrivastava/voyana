import "server-only";

export const MODERATION_STATUSES = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export class PublishBlockedError extends Error {
  status = 403;
  constructor() {
    super("This content must be approved by an admin before it can be published.");
  }
}

/** Only APPROVED content (admin-authored content defaults to APPROVED) may be
 *  published. Vendor submissions stuck at DRAFT/PENDING_REVIEW/REJECTED can
 *  never go live, even via a direct API call. */
export function assertPublishAllowed(moderationStatus: string, wantsPublished: boolean): void {
  if (wantsPublished && moderationStatus !== "APPROVED") {
    throw new PublishBlockedError();
  }
}
