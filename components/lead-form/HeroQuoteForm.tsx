"use client";

import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";

export function HeroQuoteForm({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="w-full rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl shadow-navy-950/30 backdrop-blur">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand-700">
        <Sparkles className="h-4 w-4" />
        Get free quotes in minutes
      </div>
      <h2 className="font-display text-2xl font-semibold text-navy-900">Plan a trip without the back-and-forth</h2>
      <p className="mt-2 text-sm leading-relaxed text-navy-500">
        Pick a destination or start with a short six-field form. Our team will route your enquiry to travel experts.
      </p>
      <div className="mt-5 space-y-3 rounded-2xl bg-navy-50 p-4 text-sm text-navy-700">
        {["Name and destination", "Your city and trip nights", "Phone and email"].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-brand-600" />
            {item}
          </div>
        ))}
      </div>
      <Button type="button" variant="primary" size="lg" className="mt-5 w-full" onClick={onOpen}>
        Get My Travel Quote <ArrowRight className="h-5 w-5" />
      </Button>
      <p className="mt-2 text-center text-xs text-navy-400">No spam. Your details are shared only with vetted experts.</p>
    </div>
  );
}
