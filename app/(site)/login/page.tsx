import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Briefcase } from "lucide-react";
import { getPublicSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginChooser() {
  const settings = await getPublicSettings();
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
      <h1 className="text-center font-display text-3xl font-bold text-navy-900">Sign in to {settings.brandName}</h1>
      <p className="mt-2 text-center text-navy-500">Choose how you&apos;d like to continue.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <Link href="/agent/login" className="group rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Briefcase className="h-7 w-7" /></span>
          <h2 className="mt-4 text-lg font-semibold text-navy-900">Travel Agent</h2>
          <p className="mt-1 text-sm text-navy-500">Access leads, wallet and your marketplace.</p>
        </Link>
        <Link href="/admin/login" className="group rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-100 text-navy-700"><Shield className="h-7 w-7" /></span>
          <h2 className="mt-4 text-lg font-semibold text-navy-900">Administrator</h2>
          <p className="mt-1 text-sm text-navy-500">Manage leads, agents, revenue and content.</p>
        </Link>
      </div>
    </div>
  );
}
