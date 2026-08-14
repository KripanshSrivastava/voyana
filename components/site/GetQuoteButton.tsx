"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui";
import { LeadPopupModal, type ModalPrefill } from "@/components/site/LeadPopupModal";

/**
 * Drop-in trigger for the shared enquiry modal — the single click-to-fill-in
 * replacement for every `<ButtonLink href="/request-quote">` that used to
 * send visitors to the separate wizard page.
 *
 * Two calling conventions, both supported by the same component:
 *  - Pass `variant`/`size` (matches ButtonLink's API) to get the site's
 *    standard Tailwind button styling via `buttonClass()`.
 *  - Pass a raw `className`/`style` (no `variant`) for call sites — like
 *    SiteHeader's fully inline-styled nav CTA — that already have their own
 *    exact look and just need the click behavior swapped from "navigate" to
 *    "open modal".
 */
// Mirrors the variant/size keys buttonClass() accepts in components/ui.tsx.
// Not imported directly because ui.tsx doesn't export the key types, only
// the function — duplicating the literal union here is cheaper than
// widening ui.tsx's public API just for this.
type ButtonVariant = "primary" | "brand" | "navy" | "outline" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

export function GetQuoteButton({
  variant,
  size,
  className,
  style,
  children = "Get Free Quotes",
  prefill,
  destinations,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  prefill?: ModalPrefill;
  destinations?: string[];
}) {
  const [open, setOpen] = useState(false);
  const cls = variant ? buttonClass({ variant, size, className }) : className;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cls} style={style}>
        {children}
      </button>
      <LeadPopupModal open={open} prefill={prefill} destinations={destinations} onClose={() => setOpen(false)} />
    </>
  );
}
