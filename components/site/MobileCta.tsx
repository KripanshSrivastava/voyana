"use client";

import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { GetQuoteButton } from "@/components/site/GetQuoteButton";

/** Sticky bottom "Get Free Quotes" bar for mobile. Hidden on the quote form itself. */
export function MobileCta() {
  const pathname = usePathname();
  if (pathname.startsWith("/request-quote")) return null;

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white/90 p-3 backdrop-blur-md md:hidden">
      <GetQuoteButton className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sun-500 text-base font-semibold text-white shadow-lg shadow-sun-500/25">
        Get Free Quotes <ArrowRight className="h-5 w-5" />
      </GetQuoteButton>
    </div>
  );
}
