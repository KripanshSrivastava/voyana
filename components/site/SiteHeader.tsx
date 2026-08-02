"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Plane } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/destinations", label: "Destinations" },
  { href: "/tours", label: "Tours" },
  { href: "/packages", label: "Packages" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
];

export function SiteHeader({ brandName, logoUrl }: { brandName: string; logoUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  function openQuoteModal() {
    window.dispatchEvent(new Event("voyana:open-lead-modal"));
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-navy-100 bg-white/85 shadow-sm backdrop-blur-md"
          : "border-b border-transparent bg-white/60 backdrop-blur"
      )}
    >
      <div className={cn("mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6 lg:px-8", scrolled ? "h-14" : "h-16")}>
        <Link href="/" className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} className="h-8 w-auto" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-white">
              <Plane className="h-5 w-5 -rotate-45 text-brand-300" />
            </span>
          )}
          <span className="font-display text-xl font-semibold tracking-tight text-navy-900">{brandName}</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="link-underline text-sm font-medium text-navy-600 transition-colors hover:text-navy-900">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/agent/login" className="text-sm font-medium text-navy-600 hover:text-navy-900">Agent Login</Link>
          {isHome ? (
            <button type="button" onClick={openQuoteModal} className="press inline-flex h-8 items-center justify-center gap-2 rounded-full bg-sun-500 px-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-sun-600">
              Get Free Quotes
            </button>
          ) : (
            <ButtonLink href="/request-quote" variant="primary" size="sm" className="press">Get Free Quotes</ButtonLink>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {isHome ? (
            <button type="button" onClick={openQuoteModal} className="press inline-flex h-8 items-center justify-center gap-2 rounded-full bg-sun-500 px-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-sun-600">
              Get Quotes
            </button>
          ) : (
            <ButtonLink href="/request-quote" variant="primary" size="sm" className="press">Get Quotes</ButtonLink>
          )}
          <button
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-700 hover:bg-navy-50"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={cn("grid overflow-hidden border-navy-100 bg-white transition-all duration-300 md:hidden", open ? "grid-rows-[1fr] border-t" : "grid-rows-[0fr]")}>
        <nav className="mx-auto flex min-h-0 w-full max-w-7xl flex-col px-4 py-2">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50">
              {n.label}
            </Link>
          ))}
          <Link href="/agent/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-navy-50">
            Agent Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
