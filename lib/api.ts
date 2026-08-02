import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/** Wraps an API handler and turns known errors into clean JSON responses. */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AuthError) {
        return fail(err.message, err.status);
      }
      if (err instanceof ZodError) {
        return fail("Validation failed", 422, { issues: err.flatten() });
      }
      // Any error carrying a numeric HTTP status (e.g. ForbiddenError, PurchaseError).
      if (err && typeof err === "object" && "status" in err && typeof (err as { status: unknown }).status === "number") {
        const e = err as { status: number; message?: string };
        return fail(e.message || "Request failed.", e.status);
      }
      console.error("[api] unhandled error:", err);
      return fail("Something went wrong. Please try again.", 500);
    }
  };
}
