"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FeaturedProducts } from "@/components/storefront/FeaturedProducts";
import { HeroBanner } from "@/components/storefront/HeroBanner";
import { NewsletterForm } from "@/components/storefront/NewsletterForm";
import { RentalSection } from "@/components/storefront/RentalSection";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

type HomeFeatured = { id: string; name: string; slug: string; brand: string | null; image: string; price: number; comparePrice: number | null; stock: number };
type HomeCat = { id: string; name: string; slug: string; image: string };
type HomeBrand = { id: string; name: string; logo: string };

export default function HomePage() {
  const [featured, setFeatured] = useState<HomeFeatured[]>([]);
  const [categories, setCategories] = useState<HomeCat[]>([]);
  const [brands, setBrands] = useState<HomeBrand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    toast.success("Bienvenido!", {
      duration: 10000,
      id: "home-welcome-toast",
    });
  }, []);

  useEffect(() => {
    fetch("/api/storefront/home")
      .then((r) => r.json())
      .then((d) => {
        setFeatured(d.featured || []);
        setCategories(d.categories || []);
        setBrands(d.brands || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <HeroBanner />

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {featured.length > 0 && <FeaturedProducts products={featured} />}

          {categories.length > 0 && (
            <section className="border-b border-border bg-muted/30 py-10 md:py-14">
              <div className="mx-auto max-w-7xl px-4">
                <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Compra por categoria</h2>
                <p className="mt-1 text-sm text-muted-foreground">Encontra rapido lo que necesitas para tu obra o tu hogar.</p>
                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {categories.map((c) => (
                    <Link key={c.id} href={`/productos?category=${c.slug}`} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        <Image src={c.image} alt={c.name} fill unoptimized={c.image.startsWith("http")} className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width:640px) 50vw, 25vw" />
                      </div>
                      <div className="p-3 text-center"><span className="text-sm font-semibold text-foreground group-hover:text-primary">{c.name}</span></div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          <RentalSection />

          {brands.length > 0 && (
            <section className="py-10 md:py-14">
              <div className="mx-auto max-w-7xl px-4">
                <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Marcas destacadas</h2>
                <p className="mt-1 text-sm text-muted-foreground">Trabajamos con primeras marcas del mercado.</p>
                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {brands.map((b) => (
                    <Link key={b.id} href={`/productos?marcas=${encodeURIComponent(b.name)}`} className="flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center shadow-sm transition-shadow hover:shadow-md">
                      <div className="relative mb-3 size-16 overflow-hidden rounded-full bg-muted">
                        <Image src={b.logo} alt={b.name} fill unoptimized={b.logo.startsWith("http")} className="object-cover" sizes="64px" />
                      </div>
                      <span className="text-sm font-semibold text-primary">{b.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <section className="bg-primary py-10 text-primary-foreground md:py-12">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-lg font-semibold md:text-xl">Envio gratis en compras mayores a {formatPrice(FREE_SHIPPING_THRESHOLD)}</p>
          <p className="mt-2 text-sm text-primary-foreground/80">Aplican condiciones segun zona. Consulta con nuestro equipo de ventas.</p>
          <Button asChild size="lg" className="mt-6 bg-store-orange text-store-orange-foreground hover:bg-store-orange/90">
            <Link href="/productos">Ir a la tienda</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4"><NewsletterForm /></div>
      </section>
    </>
  );
}
