import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FeaturedProducts } from "@/components/storefront/FeaturedProducts";
import { HeroBanner } from "@/components/storefront/HeroBanner";
import { NewsletterForm } from "@/components/storefront/NewsletterForm";
import { RentalSection } from "@/components/storefront/RentalSection";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import {
  MOCK_BRANDS,
  MOCK_CATEGORIES_GRID,
  MOCK_FEATURED,
} from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <FeaturedProducts products={MOCK_FEATURED} />

      <section className="border-b border-border bg-muted/30 py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Comprá por categoría
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Encontrá rápido lo que necesitás para tu obra o tu hogar.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {MOCK_CATEGORIES_GRID.map((c) => (
              <Link
                key={c.id}
                href={`/productos?category=${c.slug}`}
                className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width:640px) 50vw, 25vw"
                  />
                </div>
                <div className="p-3 text-center">
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary">
                    {c.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <RentalSection />

      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Marcas destacadas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trabajamos con primeras marcas del mercado.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {MOCK_BRANDS.map((b) => (
              <Link
                key={b.id}
                href={`/productos?marcas=${encodeURIComponent(b.name)}`}
                className="flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative mb-3 size-16 overflow-hidden rounded-full bg-muted">
                  <Image
                    src={b.logo}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <span className="text-sm font-semibold text-primary">
                  {b.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary py-10 text-primary-foreground md:py-12">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-lg font-semibold md:text-xl">
            Envío gratis en compras mayores a{" "}
            {formatPrice(FREE_SHIPPING_THRESHOLD)}
          </p>
          <p className="mt-2 text-sm text-primary-foreground/80">
            Aplican condiciones según zona. Consultá con nuestro equipo de
            ventas.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
          >
            <Link href="/productos">Ir a la tienda</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
