import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ProductDetailContent } from "@/components/storefront/ProductDetailContent";
import { getMockProductBySlug } from "@/lib/mock-data";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const product = getMockProductBySlug(slug);
  if (!product) notFound();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8">Cargando producto...</div>
      }
    >
      <ProductDetailContent product={product} />
    </Suspense>
  );
}
