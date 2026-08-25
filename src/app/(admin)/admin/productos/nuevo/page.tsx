"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  ProductForm,
  type ProductFormInitial,
  type ProductFormValues,
} from "@/components/admin/ProductForm";
import { parseProductSaveApiResponse, type ProductSubmitResult } from "@/lib/product-form-errors";
import {
  prepareProductCloneInitialData,
  type ProductApiCloneSource,
} from "@/lib/product-clone";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function NuevoProductoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneFromId = searchParams.get("cloneFrom")?.trim() || null;

  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [cloneInitial, setCloneInitial] = useState<ProductFormInitial | null>(null);
  const [cloneSourceName, setCloneSourceName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (cloneFromId) {
          const res = await fetch(`/api/admin/products/${cloneFromId}`);
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "No se pudo cargar el producto a clonar");
          }
          if (cancelled) return;
          const product = data.product as ProductApiCloneSource;
          setBrands(
            (data.brands || []).map((b: { id: string; name: string }) => ({
              id: b.id,
              name: b.name,
            })),
          );
          setCategories(
            (data.categories || []).map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            })),
          );
          setCloneInitial(prepareProductCloneInitialData(product));
          setCloneSourceName(product.name);
          return;
        }

        const [brandsData, catsData] = await Promise.all([
          fetch("/api/admin/brands?limit=200").then((r) => r.json()),
          fetch("/api/admin/categories?limit=200")
            .then((r) => r.json())
            .catch(() => fetch("/api/categories").then((r) => r.json())),
        ]);
        if (cancelled) return;
        setBrands(
          (brandsData.brands || []).map((b: { id: string; name: string }) => ({
            id: b.id,
            name: b.name,
          })),
        );
        const cats = catsData.categories || catsData || [];
        setCategories(
          cats.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
        );
        setCloneInitial(null);
        setCloneSourceName(null);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Error al cargar datos del formulario",
          );
          if (cloneFromId) {
            router.replace("/admin/productos/nuevo");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [cloneFromId, router]);

  const formKey = useMemo(
    () => (cloneFromId ? `clone-${cloneFromId}` : "new"),
    [cloneFromId],
  );

  async function handleSubmit(data: ProductFormValues): Promise<ProductSubmitResult> {
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        return parseProductSaveApiResponse(result, "Error al crear el producto");
      }

      toast.success("Producto creado correctamente", {
        description: `${data.name} · ${data.variants.length} variante(s)`,
      });
      router.push("/admin/productos");
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: "Error de conexión al crear el producto",
        errors: ["No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo."],
        fieldErrors: {},
      };
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isClone = Boolean(cloneFromId && cloneInitial);

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
            <BreadcrumbPage>
              {isClone ? "Clonar producto" : "Nuevo producto"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {isClone && cloneSourceName ? (
        <p className="text-sm text-muted-foreground">
          Copia de <span className="font-medium text-foreground">{cloneSourceName}</span>.
          Editá nombre, slug, SKU y demás campos antes de guardar para evitar duplicados.
        </p>
      ) : null}

      <ProductForm
        key={formKey}
        initialData={cloneInitial ?? undefined}
        brands={brands}
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel={isClone ? "Crear producto clonado" : "Crear producto"}
      />
    </div>
  );
}

export default function NuevoProductoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NuevoProductoContent />
    </Suspense>
  );
}
