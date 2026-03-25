"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  images: string[];
  productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];

  return (
    <div className="space-y-4">
      <div className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
        {main ? (
          <Image
            src={main}
            alt={productName}
            fill
            priority
            unoptimized={main.startsWith("http")}
            className="object-cover transition-transform duration-300 md:group-hover:scale-110"
            sizes="(max-width:1024px) 100vw, 50vw"
          />
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors sm:size-20",
                i === active
                  ? "border-store-orange ring-2 ring-store-orange/30"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                unoptimized={src.startsWith("http")}
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
