"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input, Field, Button } from "@/components/ui";
import { broadcastAuthChange } from "@/lib/auth/broadcast";
import { PasswordStrength, passwordMeetsPolicy } from "./PasswordStrength";

type FormState = {
  name: string; email: string; phone: string; companyName: string;
  city: string; state: string; password: string; confirmPassword: string; agreed: boolean;
};

const EMPTY: FormState = { name: "", email: "", phone: "", companyName: "", city: "", state: "", password: "", confirmPassword: "", agreed: false };

export function AgentSignupForm() {
  const router = useRouter();
  const [f, setF] = useState<FormState>(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const errorId = useId();
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (f.name.trim().length < 2) errs.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = "Enter a valid business email.";
    if (f.phone.trim().length < 7) errs.phone = "Enter a valid phone number.";
    if (f.companyName.trim().length < 2) errs.companyName = "Company/agency name is required.";
    if (!passwordMeetsPolicy(f.password)) errs.password = "Password doesn't meet the requirements below.";
    if (f.confirmPassword !== f.password) errs.confirmPassword = "Passwords do not match.";
    if (!f.agreed) errs.agreed = "You must agree to the Terms & Privacy Policy to continue.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/agent-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(),
          companyName: f.companyName.trim(), city: f.city.trim(), state: f.state.trim(),
          password: f.password,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Signup failed");
      broadcastAuthChange();
      router.push(json.data?.requiresEmailVerification ? "/agent/verify-email" : "/agent/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">Become a partner agent</h1>
      <p className="mt-1.5 text-sm text-navy-500">Apply to receive and purchase qualified travel leads.</p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-4" aria-describedby={error ? errorId : undefined}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor={fid("name")} error={fieldErrors.name}>
            <Input id={fid("name")} value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" required aria-invalid={Boolean(fieldErrors.name)} />
          </Field>
          <Field label="Phone" htmlFor={fid("phone")} error={fieldErrors.phone}>
            <Input id={fid("phone")} type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" required aria-invalid={Boolean(fieldErrors.phone)} />
          </Field>
        </div>

        <Field label="Company / agency name" htmlFor={fid("company")} error={fieldErrors.companyName}>
          <Input id={fid("company")} value={f.companyName} onChange={(e) => set("companyName", e.target.value)} autoComplete="organization" required aria-invalid={Boolean(fieldErrors.companyName)} />
        </Field>

        <Field label="Business email" htmlFor={fid("email")} error={fieldErrors.email}>
          <Input id={fid("email")} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" required aria-invalid={Boolean(fieldErrors.email)} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor={fid("city")}><Input id={fid("city")} value={f.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" /></Field>
          <Field label="State" htmlFor={fid("state")}><Input id={fid("state")} value={f.state} onChange={(e) => set("state", e.target.value)} autoComplete="address-level1" /></Field>
        </div>

        <Field label="Password" htmlFor={fid("password")} error={fieldErrors.password}>
          <div className="relative">
            <Input
              id={fid("password")}
              type={showPassword ? "text" : "password"}
              value={f.password}
              onChange={(e) => set("password", e.target.value)}
              autoComplete="new-password"
              required
              aria-invalid={Boolean(fieldErrors.password)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-navy-400 hover:text-navy-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={f.password} />
        </Field>

        <Field label="Confirm password" htmlFor={fid("confirm")} error={fieldErrors.confirmPassword}>
          <div className="relative">
            <Input
              id={fid("confirm")}
              type={showConfirm ? "text" : "password"}
              value={f.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              autoComplete="new-password"
              required
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-navy-400 hover:text-navy-700"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div>
          <label className="flex items-start gap-2 text-sm text-navy-600">
            <input
              type="checkbox"
              checked={f.agreed}
              onChange={(e) => set("agreed", e.target.checked)}
              aria-invalid={Boolean(fieldErrors.agreed)}
              className="mt-0.5 h-4 w-4 rounded border-navy-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="font-medium text-brand-700 hover:underline">Terms &amp; Conditions</Link>
              {" "}and{" "}
              <Link href="/privacy-policy" target="_blank" className="font-medium text-brand-700 hover:underline">Privacy Policy</Link>
            </span>
          </label>
          {fieldErrors.agreed && <p role="alert" className="mt-1 text-xs text-rose-600">{fieldErrors.agreed}</p>}
        </div>

        {error && <p id={errorId} role="alert" className="text-sm text-rose-600">{error}</p>}

        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-navy-500">
        Already a partner? <Link href="/agent/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
