"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function NuevoProductoPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/brands?limit=200").then((r) => r.json()),
      fetch("/api/admin/categories?limit=200").then((r) => r.json()).catch(() =>
        fetch("/api/categories").then((r) => r.json()),
      ),
    ])
      .then(([brandsData, catsData]) => {
        setBrands(
          (brandsData.brands || []).map((b: any) => ({ id: b.id, name: b.name })),
        );
        const cats = catsData.categories || catsData || [];
        setCategories(
          cats.map((c: any) => ({ id: c.id, name: c.name })),
        );
      })
      .catch(() => toast.error("Error al cargar datos"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(data: ProductFormValues) {
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Error al crear el producto");
        return;
      }

      toast.success("Producto creado correctamente", {
        description: `${data.name} · ${data.variants.length} variante(s)`,
      });
      router.push("/admin/productos");
    } catch {
      toast.error("Error de conexión al crear el producto");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/productos">Productos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Nuevo producto</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <ProductForm
        brands={brands}
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel="Crear producto"
      />
    </div>
  );
}
