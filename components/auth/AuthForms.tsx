"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plane } from "lucide-react";
import { Button, Input, Field } from "@/components/ui";

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Plane className="h-5 w-5 -rotate-45 text-brand-300" />
          </span>
          <span className="text-2xl font-bold text-white">Voyana</span>
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function LoginForm({
  role,
  title,
  subtitle,
  redirectTo,
}: {
  role: "ADMIN" | "AGENT";
  title: string;
  subtitle?: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Login failed");
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <Shell title={title} subtitle={subtitle}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>
      {role === "AGENT" && (
        <p className="mt-5 text-center text-sm text-navy-500">
          New partner?{" "}
          <Link href="/agent/signup" className="font-semibold text-brand-700">Create an account</Link>
        </p>
      )}
    </Shell>
  );
}

export function AgentSignupForm() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", companyName: "", phone: "", city: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/agent-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Signup failed");
      router.push("/agent/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setLoading(false);
    }
  }

  return (
    <Shell title="Become a Voyana partner" subtitle="Apply to receive and purchase travel leads.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} required /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} required /></Field>
        </div>
        <Field label="Company / agency name"><Input value={f.companyName} onChange={(e) => set("companyName", e.target.value)} required /></Field>
        <Field label="City"><Input value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} required /></Field>
        <Field label="Password" hint="At least 6 characters."><Input type="password" value={f.password} onChange={(e) => set("password", e.target.value)} required /></Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-navy-500">
        Already a partner? <Link href="/agent/login" className="font-semibold text-brand-700">Sign in</Link>
      </p>
    </Shell>
  );
}
