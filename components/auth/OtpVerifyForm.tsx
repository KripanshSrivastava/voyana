"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { broadcastAuthChange } from "@/lib/auth/broadcast";

export function OtpVerifyForm({
  title,
  subtitle,
  email,
  verifyUrl,
  resendUrl,
  redirectTo,
  initialCooldown = 0,
  resendLabel = "Resend code",
}: {
  title: string;
  subtitle: string;
  email?: string;
  verifyUrl: string;
  resendUrl: string;
  redirectTo: string;
  initialCooldown?: number;
  resendLabel?: string;
}) {
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function setDigit(i: number, value: string) {
    const v = value.replace(/\D/g, "").slice(-1);
    setDigits((d) => d.map((x, idx) => (idx === i ? v : x)));
    if (v && i < 5) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setDigits((d) => d.map((x, idx) => text[idx] ?? x));
    inputs.current[Math.min(text.length, 5)]?.focus();
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) { setError("Enter all 6 digits."); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(verifyUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Incorrect code.");
      setSuccess(true);
      broadcastAuthChange();
      setTimeout(() => { router.push(redirectTo); router.refresh(); }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect code.");
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      const res = await fetch(resendUrl, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Could not resend code.");
      setCooldown(json.data?.cooldown ?? 45);
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    }
  }

  async function signOutAndSwitch() {
    await fetch("/api/auth/logout", { method: "POST" });
    broadcastAuthChange();
    router.push("/agent/login");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><ShieldCheck className="h-6 w-6" /></span>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">{title}</h1>
        <p className="mt-1.5 text-sm text-navy-500">{subtitle}{email && <> to <strong className="text-navy-700">{email}</strong></>}.</p>
      </div>

      <form onSubmit={verify} aria-label="Verification code">
        <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="6-digit code">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={onPaste}
              aria-label={`Digit ${i + 1} of 6`}
              className="h-12 w-10 rounded-xl border border-navy-200 text-center text-lg font-semibold text-navy-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:h-14 sm:w-12"
            />
          ))}
        </div>

        {error && <p role="alert" className="mt-4 text-center text-sm text-rose-600">{error}</p>}
        {success && <p className="mt-4 flex items-center justify-center gap-1 text-center text-sm text-emerald-600"><Check className="h-4 w-4" /> Verified — redirecting…</p>}

        <Button type="submit" variant="brand" size="lg" className="mt-6 w-full" disabled={busy || success}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
        </Button>
      </form>

      <div className="mt-5 text-center text-sm text-navy-500">
        {cooldown > 0 ? (
          <span>Didn&apos;t receive it? Resend in {cooldown}s.</span>
        ) : (
          <button type="button" onClick={resend} className="font-semibold text-brand-700 hover:underline">{resendLabel}</button>
        )}
      </div>

      <div className="mt-3 text-center">
        <button type="button" onClick={signOutAndSwitch} className="text-xs text-navy-400 hover:text-navy-600 hover:underline">
          Wrong account? Sign out
        </button>
      </div>
    </div>
  );
}
