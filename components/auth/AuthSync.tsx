"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthChange } from "@/lib/auth/broadcast";

/**
 * Mounted inside every authenticated shell (admin + agent). If ANOTHER tab of
 * this browser logs in/out/switches accounts, this tab's session cookie is
 * the same shared cookie jar — so this tab silently starts operating as the
 * new account too, while still showing whatever it last rendered. Without
 * this, a stale tab can submit a form pre-filled with the OLD account's data
 * and have it written to the NEW account's row, since the server (correctly)
 * just does what the current session says. router.refresh() re-fetches this
 * tab's server data for the current URL; combined with keying the shell by
 * the session's user id (see AdminShell/AgentShell callers), that also
 * remounts any client form state instead of leaving it stale.
 */
export function AuthSync() {
  const router = useRouter();
  useEffect(() => onAuthChange(() => router.refresh()), [router]);
  return null;
}
