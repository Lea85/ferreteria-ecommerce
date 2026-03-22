"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    id: "1",
    title: "Hasta 25% OFF en griferías seleccionadas",
    subtitle: "Renová cocina y baño con las mejores marcas.",
    cta: "Ver ofertas",
    href: "/productos?sort=discount",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=80",
  },
  {
    id: "2",
    title: "Herramientas profesionales para gremios",
    subtitle: "Precios especiales y factura A. Consultá condiciones.",
    cta: "Soy profesional",
    href: "/registro",
    image:
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1600&q=80",
  },
  {
    id: "3",
    title: "Sanitarios y depósitos con envío a todo el país",
    subtitle: "Stock disponible y asesoramiento de instalación.",
    cta: "Comprar ahora",
    href: "/productos?category=sanitarios",
    image:
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1600&q=80",
  },
];

export function HeroBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-muted">
      <div className="relative aspect-[21/9] min-h-[220px] max-h-[420px] w-full sm:min-h-[280px] md:aspect-[24/9]">
        {SLIDES.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <Image
              src={s.image}
              alt=""
              fill
              priority={i === 0}
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/20" />
            <div className="absolute inset-0 flex flex-col justify-center px-4 py-8 sm:px-8 lg:px-16">
              <div className="mx-auto w-full max-w-7xl">
                <h1 className="max-w-xl text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
                  {s.title}
                </h1>
                <p className="mt-3 max-w-lg text-sm text-white/90 sm:text-lg">
                  {s.subtitle}
                </p>
                <Button
                  asChild
                  size="lg"
                  className="mt-6 bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
                >
                  <Link href={s.href}>{s.cta}</Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-2">
        {SLIDES.map((s, i) => (
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
        onClick={() =>
          setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length)
        }
        aria-label="Anterior"
      >
        <ChevronLeft className="size-5" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute right-2 top-1/2 hidden -translate-y-1/2 bg-background/80 sm:flex"
        onClick={() => setIndex((i) => (i + 1) % SLIDES.length)}
        aria-label="Siguiente"
      >
        <ChevronRight className="size-5" />
      </Button>
    </section>
  );
}
