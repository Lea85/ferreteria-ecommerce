"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";

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

const MOCK_PRODUCT = {
  name: "Grifería monocomando cocina Peirano Dalia",
  slug: "griferia-monocomando-cocina-peirano-dalia",
  description:
    "Monocomando mesada con cartucho cerámico 35 mm. Acabado cromo. Incluye flexible y herrajes.",
  brandId: "b1",
  categoryIds: ["c1", "c5"],
  isActive: true,
  isFeatured: true,
  metaTitle: "Grifería cocina Peirano Dalia | FerroSan",
  metaDesc: "Monocomando para cocina con garantía oficial Peirano.",
  variants: [
    {
      id: "v1",
      sku: "PEI-MC-COC-DAL",
      price: 189_900,
      comparePrice: 215_000,
      stock: 8,
      weight: 1.2,
    },
    {
      id: "v2",
      sku: "PEI-MC-COC-DAL-N",
      price: 199_500,
      comparePrice: null,
      stock: 4,
      weight: 1.25,
    },
  ],
};

export default function EditarProductoPage() {
  const params = useParams();
  const id = params?.id as string;

  async function handleSubmit(data: ProductFormValues) {
    await new Promise((r) => setTimeout(r, 400));
    toast.success("Cambios guardados (simulación)", {
      description: `ID ${id} · ${data.name}`,
    });
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/productos" className="hover:text-primary">
          Productos
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-foreground">
          Editar {MOCK_PRODUCT.name}
        </span>
      </nav>

      <ProductForm
        initialData={MOCK_PRODUCT}
        brands={BRANDS}
        categories={CATEGORIES}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
