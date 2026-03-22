"use client";

import Link from "next/link";
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

const BRANDS = [
  { id: "b1", name: "Peirano" },
  { id: "b2", name: "Ferrum" },
  { id: "b3", name: "Tramontina" },
  { id: "b4", name: "Tigre" },
];

const CATEGORIES = [
  { id: "c1", name: "Griferías" },
  { id: "c2", name: "Inodoros" },
  { id: "c3", name: "Herramientas" },
  { id: "c4", name: "Cañerías PVC" },
  { id: "c5", name: "Pinturas" },
];

export default function NuevoProductoPage() {
  async function handleSubmit(data: ProductFormValues) {
    await new Promise((r) => setTimeout(r, 400));
    toast.success("Producto guardado (simulación)", {
      description: `${data.name} · ${data.variants.length} variante(s)`,
    });
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
        brands={BRANDS}
        categories={CATEGORIES}
        onSubmit={handleSubmit}
        submitLabel="Crear producto"
      />
    </div>
  );
}
