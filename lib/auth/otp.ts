import "server-only";
import { randomInt, createHash } from "crypto";

/** Cryptographically-random 6-digit numeric code (000000–999999, zero-padded). */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** One-way hash — the plaintext code is never stored, only compared by hash. */
export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function verifyCodeHash(code: string, hash: string): boolean {
  return hashCode(code) === hash;
}
