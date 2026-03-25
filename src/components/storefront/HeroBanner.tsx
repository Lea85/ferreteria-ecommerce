"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Slide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  ctaText: string | null;
};

const FALLBACK_SLIDES: Slide[] = [
  {
    id: "f1",
    title: "Hasta 25% OFF en griferias seleccionadas",
    subtitle: "Renova cocina y banio con las mejores marcas.",
    ctaText: "Ver ofertas",
    linkUrl: "/productos?sort=discount",
    imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=80",
  },
  {
    id: "f2",
    title: "Herramientas profesionales para gremios",
    subtitle: "Precios especiales y factura A. Consulta condiciones.",
    ctaText: "Soy profesional",
    linkUrl: "/registro",
    imageUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1600&q=80",
  },
  {
    id: "f3",
    title: "Sanitarios y depositos con envio a todo el pais",
    subtitle: "Stock disponible y asesoramiento de instalacion.",
    ctaText: "Comprar ahora",
    linkUrl: "/productos?category=sanitarios",
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1600&q=80",
  },
];

export function HeroBanner() {
  const [slides, setSlides] = useState<Slide[]>(FALLBACK_SLIDES);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch("/api/campaigns/public")
      .then((r) => r.json())
      .then((d) => {
        if (d.campaigns && d.campaigns.length > 0) {
          setSlides(d.campaigns);
          setIndex(0);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  return (
    <section className="relative w-full overflow-hidden bg-muted">
      <div className="relative aspect-[21/9] min-h-[220px] max-h-[420px] w-full sm:min-h-[280px] md:aspect-[24/9]">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <Image
              src={s.imageUrl}
              alt=""
              fill
              priority={i === 0}
              unoptimized={s.imageUrl.startsWith("http")}
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/20" />
            <div className="absolute inset-0 flex flex-col justify-center px-4 py-8 sm:px-8 lg:px-16">
              <div className="mx-auto w-full max-w-7xl">
                {s.title && (
                  <h1 className="max-w-xl text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
                    {s.title}
                  </h1>
                )}
                {s.subtitle && (
                  <p className="mt-3 max-w-lg text-sm text-white/90 sm:text-lg">
                    {s.subtitle}
                  </p>
                )}
                {s.linkUrl && s.ctaText && (
                  <Button
                    asChild
                    size="lg"
                    className="mt-6 bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
                  >
                    <Link href={s.linkUrl}>{s.ctaText}</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={cn(
                  "pointer-events-auto size-2.5 rounded-full transition-colors",
                  i === index ? "bg-store-orange" : "bg-white/50 hover:bg-white/80",
                )}
                onClick={() => setIndex(i)}
                aria-label={`Ir al slide ${i + 1}`}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 bg-background/80 sm:flex"
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            aria-label="Anterior"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 bg-background/80 sm:flex"
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            aria-label="Siguiente"
          >
            <ChevronRight className="size-5" />
          </Button>
        </>
      )}
    </section>
  );
}
