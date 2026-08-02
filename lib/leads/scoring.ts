import type { LeadQuality } from "../constants";

export type ScoreInput = {
  phone?: string | null;
  email?: string | null;
  destinationText?: string | null;
  travelDate?: Date | string | null;
  budget?: number | null;
  travelers?: number | null;
  requirements?: string[] | null;
  message?: string | null;
  utmSource?: string | null;
};

const PHONE_RE = /^(\+?\d[\d\s-]{7,14})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Rule-based lead scoring. Returns a 0-100 score and a quality band.
 * Admin can override the band afterwards.
 */
export function scoreLead(input: ScoreInput): { score: number; quality: LeadQuality } {
  let score = 0;

  if (input.phone && PHONE_RE.test(input.phone.trim())) score += 25;
  if (input.email && EMAIL_RE.test(input.email.trim())) score += 12;
  if (input.destinationText && input.destinationText.trim().length > 1) score += 15;
  if (input.travelDate) score += 12;
  if (input.budget && input.budget > 0) score += 12;
  if (input.travelers && input.travelers > 0) score += 8;
  if (input.requirements && input.requirements.length > 0) score += 8;
  if (input.message && input.message.trim().length > 20) score += 4;
  if (input.utmSource && input.utmSource.trim().length > 0) score += 4;

  score = Math.min(100, score);

  let quality: LeadQuality;
  if (score >= 80) quality = "EXCELLENT";
  else if (score >= 60) quality = "GOOD";
  else if (score >= 40) quality = "AVERAGE";
  else quality = "POOR";

  return { score, quality };
}
