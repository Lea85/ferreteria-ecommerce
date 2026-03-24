"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";

export default function EditarProductoPage() {
  const params = useParams();
  const id = params?.id as string;

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

  async function handleSubmit(data: ProductFormValues) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.error("Error al guardar cambios");
      return;
    }
    toast.success("Cambios guardados correctamente", { description: data.name });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!product) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-bold">Producto no encontrado</h1>
        <Link href="/admin/productos" className="mt-4 text-sm text-primary hover:underline">Volver a productos</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/productos" className="hover:text-primary">Productos</Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">Editar {product.name}</span>
      </nav>

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
