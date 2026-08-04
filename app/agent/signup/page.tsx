import { redirect } from "next/navigation";
import Link from "next/link";
import { Plane } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getPublicSettings } from "@/lib/settings";
import { SignupShowcase } from "@/components/agent/signup/SignupShowcase";
import { AgentSignupForm } from "@/components/agent/signup/AgentSignupForm";

export const metadata = { title: "Become a partner agent", robots: { index: false } };

export default async function AgentSignupPage() {
  const [session, settings] = await Promise.all([getSession(), getPublicSettings()]);
  if (session?.role === "AGENT") redirect("/agent/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <SignupShowcase brandName={settings.brandName} logoUrl={settings.logoUrl} />

      <div className="flex flex-col px-4 py-8 sm:px-8 lg:overflow-y-auto lg:py-12">
        <Link href="/" className="mb-6 flex items-center gap-2 lg:hidden">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt={settings.brandName} className="h-8 w-auto" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-white">
              <Plane className="h-5 w-5 -rotate-45 text-brand-300" />
            </span>
          )}
          <span className="font-display text-lg font-semibold text-navy-900">{settings.brandName}</span>
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <AgentSignupForm />
        </div>
      </div>
    </div>
  );
}
