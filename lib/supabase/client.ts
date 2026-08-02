"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client — uses the public anon key + the user's session cookie.
 *  All access is subject to RLS. Never import the service-role client here. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
