"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Card, Button, Input } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { broadcastAuthChange } from "@/lib/auth/broadcast";

type SessionState =
  | { status: "loading" }
  | { status: "ready"; email: string }
  | { status: "missing" }
  | { status: "error"; message: string };

const MIN_PASSWORD_LENGTH = 8;

/**
 * Set-password step of the admin invite flow. The Supabase invite link sets
 * an auth session before redirecting here — this component reads that
 * session, lets the invitee pick a password, and then updates the Supabase
 * user before sending them into the dashboard.
 *
 * If no session is present (stale/reused link), the user sees a clear "ask
 * for a fresh invite" state instead of a broken form.
 */
export function SetPasswordCard() {
  const router = useRouter();
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Supabase-js parses the invite fragment (#access_token=...) on load
    // and emits INITIAL_SESSION once the client is ready. Listen for it so
    // we don't race the fragment parse — a plain getUser() sometimes wins
    // that race and reports "no session" even though one is coming.
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (cancelled) return;
      const email = s?.user?.email;
      setSession(email ? { status: "ready", email } : { status: "missing" });
    });

    // Kick off an initial check in case the client is already hydrated.
    supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setSession({ status: "error", message: error.message });
        return;
      }
      const email = data.user?.email;
      // Don't overwrite a later "ready" from onAuthStateChange with an
      // early "missing" — only set missing if we're still loading.
      setSession((prev) => {
        if (email) return { status: "ready", email };
        return prev.status === "loading" ? { status: "missing" } : prev;
      });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || session.status !== "ready") return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password set. Signing you in…");
        // Let any other open tab (e.g. an existing login page) know the
        // session changed, then land the new admin on the dashboard.
        broadcastAuthChange();
        router.replace("/admin/dashboard");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not set your password.");
      }
    });
  }

  if (session.status === "loading") {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-navy-400" />
        <p className="mt-3 text-sm text-navy-500">Verifying your invite…</p>
      </Card>
    );
  }

  if (session.status === "missing" || session.status === "error") {
    return (
      <Card className="p-8 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-amber-500" />
        <h1 className="mt-3 text-lg font-semibold text-navy-900">Invite link expired</h1>
        <p className="mt-2 text-sm text-navy-500">
          {session.status === "error"
            ? session.message
            : "This invite link is no longer valid. Ask the Main Admin to send a fresh invite."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <h1 className="text-lg font-semibold text-navy-900">Set your admin password</h1>
      <p className="mt-1 text-sm text-navy-500">
        Signed in as <span className="font-medium text-navy-800">{session.email}</span>. Choose a password to finish setup.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-navy-500">New password</span>
          <Input
            type="password"
            required
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-navy-500">Confirm password</span>
          <Input
            type="password"
            required
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={pending}
            className="mt-1"
          />
        </label>
        <Button type="submit" variant="brand" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set password and sign in"}
        </Button>
      </form>
    </Card>
  );
}
