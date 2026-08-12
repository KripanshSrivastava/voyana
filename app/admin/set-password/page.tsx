import type { Metadata } from "next";
import { SetPasswordCard } from "@/components/admin/SetPasswordCard";
import { getPublicSettings } from "@/lib/settings";
import { Plane } from "lucide-react";

export const metadata: Metadata = {
  title: "Set your password",
  robots: { index: false },
};

/**
 * Landing page for newly invited admins. When a user clicks the invite link
 * in the Supabase email, Supabase authenticates them and redirects here with
 * a valid session cookie already set. The client card below reads that
 * session, calls `supabase.auth.updateUser({ password })`, and then routes
 * the user into the admin dashboard.
 *
 * If someone lands here without a session (link expired, opened later),
 * the card tells them to request a fresh invite.
 */
export default async function SetPasswordPage() {
  const settings = await getPublicSettings();
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: "var(--mb-bg)", color: "var(--mb-ink)" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "var(--mb-accent)", color: "#fff" }}
          >
            <Plane className="h-5 w-5 -rotate-45" />
          </span>
          <span className="text-lg font-bold" style={{ color: "var(--mb-ink)" }}>{settings.brandName}</span>
        </div>
        <SetPasswordCard />
      </div>
    </div>
  );
}
