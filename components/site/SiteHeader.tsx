"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Plane } from "lucide-react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/destinations", label: "Destinations" },
  { href: "/tours", label: "Tours" },
  { href: "/packages", label: "Packages" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
];

/**
 * Shared marketing nav for every /(site) page. Visually mirrors the landing's
 * mb-nav: transparent gradient over the hero on the first ~12px of scroll,
 * cream + blurred backdrop past that. Plane icon + brand mark, terracotta CTA.
 *
 * Font stack and color tokens come from :root (see app/globals.css) so the
 * landing and every /(site) page render as the same product without importing
 * separate themes.
 */
export function SiteHeader({ brandName, logoUrl }: { brandName: string; logoUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkColor = scrolled ? "var(--mb-ink)" : "var(--mb-ink)";
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition: "all 250ms",
        borderBottom: scrolled ? "1px solid var(--mb-line)" : "1px solid transparent",
        background: scrolled ? "oklch(0.975 0.007 60 / 0.94)" : "var(--mb-bg)",
        backdropFilter: scrolled ? "blur(10px)" : undefined,
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: scrolled ? "12px 48px" : "18px 48px",
          transition: "padding 250ms",
          gap: 24,
        }}
        className="mb-site-header-inner"
      >
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, color: linkColor, textDecoration: "none" }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} style={{ height: 32, width: "auto" }} />
          ) : (
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                width: 32,
                height: 32,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                background: "var(--mb-accent)",
                color: "#fff",
              }}
            >
              <Plane style={{ width: 16, height: 16, transform: "rotate(-45deg)" }} />
            </span>
          )}
          <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.2px", color: "var(--mb-ink)" }}>{brandName}</span>
        </Link>

        <nav className="mb-site-header-links">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              style={{
                fontSize: 14.5,
                color: isActive(n.href) ? "var(--mb-accent)" : linkColor,
                textDecoration: "none",
                fontWeight: isActive(n.href) ? 600 : 500,
                opacity: isActive(n.href) ? 1 : 0.85,
              }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="mb-site-header-actions">
          <Link href="/login" style={{ fontSize: 14.5, color: linkColor, textDecoration: "none", fontWeight: 500 }}>
            Login
          </Link>
          <Link
            href="/request-quote"
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
              background: "var(--mb-accent)",
              padding: "10px 18px",
              borderRadius: 5,
              textDecoration: "none",
            }}
          >
            Get Free Quotes
          </Link>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="mb-site-header-menu-btn"
          >
            {open ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer ---------------------------------------------------- */}
      {open && (
        <nav className="mb-site-header-mobile">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 15,
                color: "var(--mb-ink)",
                textDecoration: "none",
              }}
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 15,
              color: "var(--mb-accent)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Login
          </Link>
        </nav>
      )}

      <style>{`
        .mb-site-header-links {
          display: flex; align-items: center; gap: clamp(14px,2vw,32px);
          flex: 1 1 auto; justify-content: center; white-space: nowrap;
        }
        .mb-site-header-actions {
          display: flex; align-items: center; gap: 16px; flex: none;
        }
        .mb-site-header-menu-btn {
          display: none; width: 40px; height: 40px; align-items: center;
          justify-content: center; border: none; background: transparent;
          color: var(--mb-ink); cursor: pointer; border-radius: 8px;
        }
        .mb-site-header-menu-btn:hover { background: var(--mb-surface); }
        .mb-site-header-mobile {
          display: none; flex-direction: column; gap: 4px;
          padding: 12px 20px 20px; background: var(--mb-bg);
          border-top: 1px solid var(--mb-line);
        }
        @media (max-width: 900px) {
          .mb-site-header-inner { padding-left: 20px !important; padding-right: 20px !important; }
          .mb-site-header-links { display: none; }
          .mb-site-header-menu-btn { display: inline-flex; }
          .mb-site-header-actions > a:first-child { display: none; }
          .mb-site-header-mobile { display: flex; }
        }
      `}</style>
    </header>
  );
}
