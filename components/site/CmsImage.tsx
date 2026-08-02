import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Wrapper around next/image for CMS/local images.
 * - Reserves layout via an aspect-ratio box (no CLS).
 * - Emits responsive srcset + AVIF/WebP automatically.
 * - `priority` only for the true hero; everything else lazy-loads.
 * Falls back to a branded gradient placeholder when no URL exists.
 */
export function CmsImage({
  src,
  alt,
  className,
  imgClassName,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
  placeholderLabel,
  rounded,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  placeholderLabel?: string;
  rounded?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-navy-100", rounded, className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className={cn("object-cover", imgClassName)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy-800 to-brand-700 text-sm font-medium text-white/80">
          {placeholderLabel ?? alt}
        </div>
      )}
    </div>
  );
}
