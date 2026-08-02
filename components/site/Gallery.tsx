"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-3xl bg-gradient-to-br from-navy-900 to-brand-700 text-white/80 sm:aspect-[21/9]">
        {title}
      </div>
    );
  }
  return (
    <div>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl sm:aspect-[21/9]">
        <Image
          key={images[active]}
          src={images[active]}
          alt={title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1200px"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="scroll-slim mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src + i}
              aria-label={`View image ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition",
                active === i ? "border-brand-500" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <Image src={src} alt="" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
