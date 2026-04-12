"use client";

import { ArrowLeft, Edit, ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";

type ProductDetail = {
  name: string;
  slug: string;
  description: string;
  brandId: string;
  warehouseLocationId: string;
  categoryIds: string[];
  supplierIds: string[];
  isActive: boolean;
  isFeatured: boolean;
  metaTitle: string;
  metaDesc: string;
  variants: {
    id: string;
    sku: string;
    ean: string;
    price: number;
    comparePrice: number | null;
    stock: number;
    weight: number | null;
    name: string;
    attributeValueIds: string[];
  }[];
  images: { url: string; altText: string }[];
};

export default function ProductoDetallePage() {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data.product);
        setBrands(data.brands || []);
        setCategories(data.categories || []);
      })
      .catch(() => toast.error("Error al cargar producto"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Producto no encontrado.
      </div>
    );
  }

  const brandName = brands.find((b) => b.id === product.brandId)?.name || "Sin marca";
  const categoryNames = product.categoryIds
    .map((cid) => categories.find((c) => c.id === cid)?.name)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/productos">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{product.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">/{product.slug}</p>
        </div>
        <Button asChild className="gap-2">
          <Link href={`/admin/productos/${id}`}>
            <Edit className="size-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Información general</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Marca</p>
                  <p className="text-sm font-medium">{brandName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Categorías</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {categoryNames.map((name) => (
                      <Badge key={name} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              {product.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Descripción</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{product.description}</p>
                </div>
              )}
              <div className="flex gap-4">
                <Badge variant={product.isActive ? "default" : "secondary"}>
                  {product.isActive ? "Activo" : "Inactivo"}
                </Badge>
                {product.isFeatured && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                    Destacado
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Variantes</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>SKU</TableHead>
                    <TableHead>EAN</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">P. Comparación</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Peso (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variants.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs font-semibold">{v.sku}</TableCell>
                      <TableCell className="font-mono text-xs">{v.ean || "—"}</TableCell>
                      <TableCell>{v.name || "—"}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatPrice(v.price)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {v.comparePrice ? formatPrice(v.comparePrice) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={v.stock <= 5 ? "text-destructive font-semibold" : ""}>
                          {v.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {v.weight ? `${v.weight} kg` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {product.metaTitle || product.metaDesc ? (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {product.metaTitle && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Meta título</p>
                    <p className="text-sm">{product.metaTitle}</p>
                  </div>
                )}
                {product.metaDesc && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Meta descripción</p>
                    <p className="text-sm">{product.metaDesc}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Imágenes</CardTitle>
            </CardHeader>
            <CardContent>
              {product.images.length > 0 ? (
                <div className="grid gap-3 grid-cols-2">
                  {product.images.map((img, idx) => (
                    <div key={idx} className="relative overflow-hidden rounded-lg border border-border">
                      <img
                        src={img.url}
                        alt={img.altText || `Imagen ${idx + 1}`}
                        className="aspect-square w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder-product.webp";
                        }}
                      />
                      {idx === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          PRINCIPAL
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <ImageIcon className="size-8 mb-2" />
                  <p className="text-sm">Sin imágenes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
