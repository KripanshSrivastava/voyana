"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client — uses the public anon key + the user's session cookie.
 *  All access is subject to RLS. Never import the service-role client here. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Passkeys (auth.registerPasskey/signInWithPasskey/auth.passkey.*) are
    // still an experimental gotrue-js API — the client refuses to call them
    // at all unless this flag is explicitly passed here, even when Passkeys
    // is already enabled on the Supabase project itself.
    { auth: { experimental: { passkey: true } } },
  );
}
