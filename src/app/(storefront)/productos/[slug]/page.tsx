"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { ProductDetailContent } from "@/components/storefront/ProductDetailContent";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/products/${slug}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => {
        if (d?.product) setProduct(d.product);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Producto no encontrado</h1>
        <p className="mt-2 text-muted-foreground">El producto que buscas no existe o fue dado de baja.</p>
      </div>
    );
  }

  return <ProductDetailContent product={product} />;
}
