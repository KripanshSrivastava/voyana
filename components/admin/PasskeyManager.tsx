"use client";

import { useEffect, useState } from "react";
import { Loader2, KeyRound, Trash2, ShieldCheck } from "lucide-react";
import { Card, Button, Input, EmptyState } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

type Passkey = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };

/**
 * Self-service passkey management for the signed-in admin. Every call here
 * goes straight to Supabase Auth via the browser client — there's no custom
 * API route, the same way password changes and 2FA toggles work elsewhere.
 * Requires `auth.experimental.passkey: true` to be enabled on the Supabase
 * project; if it isn't, register/list calls surface Supabase's own error.
 */
export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");

  async function refresh() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.passkey.list();
    if (error) {
      toast.error(error.message || "Could not load passkeys.");
      setPasskeys([]);
    } else {
      setPasskeys(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.passkey.list()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error(error.message || "Could not load passkeys.");
          setPasskeys([]);
        } else {
          setPasskeys(data ?? []);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function register() {
    setRegistering(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      // registerPasskey() doesn't take a friendly name itself — apply the
      // one typed above as a follow-up rename so the list is legible.
      if (data?.id && name.trim()) {
        await supabase.auth.passkey.update({ passkeyId: data.id, friendlyName: name.trim() });
      }
      toast.success("Passkey registered.");
      setName("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register passkey.");
    } finally {
      setRegistering(false);
    }
  }

  async function remove(passkeyId: string) {
    if (!confirm("Remove this passkey? You'll need to register it again to use it.")) return;
    const supabase = createClient();
    const { error } = await supabase.auth.passkey.delete({ passkeyId });
    if (error) {
      toast.error(error.message || "Could not remove passkey.");
      return;
    }
    toast.success("Passkey removed.");
    await refresh();
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-brand-600" />
        <h2 className="text-base font-semibold text-navy-900">Passkeys</h2>
      </div>
      <p className="mt-1 text-sm text-navy-500">
        Sign in without a password using your device&apos;s biometrics or a security key. Optional — your password
        still works either way.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Input
          placeholder='Name this passkey (e.g. "My laptop")'
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
        />
        <Button type="button" onClick={register} disabled={registering}>
          {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Register a passkey
        </Button>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-navy-400" />
          </div>
        ) : !passkeys || passkeys.length === 0 ? (
          <EmptyState title="No passkeys yet" description="Register one above to sign in without a password." />
        ) : (
          <ul className="divide-y divide-navy-100">
            {passkeys.map((pk) => (
              <li key={pk.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-navy-900">{pk.friendly_name || "Unnamed passkey"}</p>
                  <p className="text-xs text-navy-500">
                    Added {formatDateTime(pk.created_at)}
                    {pk.last_used_at ? ` · last used ${formatDateTime(pk.last_used_at)}` : ""}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(pk.id)}>
                  <Trash2 className="h-4 w-4 text-rose-600" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
