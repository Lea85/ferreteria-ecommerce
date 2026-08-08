"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AdminProductsBackButton } from "@/components/admin/AdminProductsBackButton";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { resolveAdminProductsBackHref } from "@/lib/admin-products-list-url";
import { parseProductSaveApiResponse, type ProductSubmitResult } from "@/lib/product-form-errors";

function EditarProductoContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const backHref = resolveAdminProductsBackHref(searchParams);

  const [product, setProduct] = useState<any>(null);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProduct(d.product);
        setBrands(d.brands || []);
        setCategories(d.categories || []);
      })
      .catch(() => toast.error("Error al cargar producto"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: ProductFormValues): Promise<ProductSubmitResult> {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        return parseProductSaveApiResponse(result, "Error al guardar los cambios");
      }
      toast.success("Cambios guardados correctamente", { description: data.name });
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: "Error de conexión",
        errors: ["No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo."],
        fieldErrors: {},
      };
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!product) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-bold">Producto no encontrado</h1>
        <Link href={backHref} className="mt-4 text-sm text-primary hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <AdminProductsBackButton />
        <div>
          <h1 className="text-xl font-bold text-foreground">Editar producto</h1>
          <p className="text-sm text-muted-foreground">{product.name}</p>
        </div>
      </div>

      <ProductForm
        initialData={product}
        brands={brands}
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}

export default function EditarProductoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EditarProductoContent />
    </Suspense>
  );
}
