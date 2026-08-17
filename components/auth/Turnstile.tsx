"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/**
 * Cloudflare Turnstile widget — admin login only (see lib/auth/turnstile.ts
 * for why this isn't Supabase's own project-wide captcha setting). Renders
 * nothing if NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't configured, so local dev
 * without a Turnstile account doesn't block the login form — the server
 * side still fails closed in that case (see verifyTurnstileToken).
 */
export function Turnstile({ onVerify }: { onVerify: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(
    typeof window !== "undefined" && !!window.turnstile,
  );

  useEffect(() => {
    if (scriptReady || !siteKey) return;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => setScriptReady(true), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);
  }, [scriptReady, siteKey]);

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current || !window.turnstile) return;
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
    });
    return () => {
      window.turnstile?.remove(widgetId);
    };
    // Re-render only when the script/site key actually change — onVerify is
    // a fresh closure every render and would otherwise tear the widget down
    // on every keystroke in the form above it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady, siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} />;
}
