"use client";

import { Edit, ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AdminProductsBackButton } from "@/components/admin/AdminProductsBackButton";
import { RichTextContent } from "@/components/storefront/RichTextContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsFullAdmin } from "@/hooks/use-is-admin";
import {
  appendAdminProductsNavParams,
  sanitizeAdminProductsReturnTo,
} from "@/lib/admin-products-list-url";
import {
  formatProfitMarginPercent,
  profitMarginPercent,
} from "@/lib/profit-margin";
import { cn, formatPrice } from "@/lib/utils";

type VariantAttribute = {
  name: string;
  value: string;
};

type ProductDetail = {
  name: string;
  slug: string;
  description: string;
  brandName: string;
  warehouseLocationName: string;
  warehouseRow: number | null;
  warehouseCol: number | null;
  categoryNames: string[];
  supplierNames: string[];
  isActive: boolean;
  isFeatured: boolean;
  metaTitle: string;
  metaDesc: string;
  variants: {
    id: string;
    sku: string;
    ean: string;
    price: number;
    costPrice: number | null;
    stock: number;
    lowStockThreshold: number;
    weight: number | null;
    name: string;
    attributes: VariantAttribute[];
  }[];
  images: { url: string; altText: string }[];
};

function ReadValue({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function emptyText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function ProductoDetalleContent() {
  const isFullAdmin = useIsFullAdmin();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const listReturnTo =
    sanitizeAdminProductsReturnTo(searchParams.get("returnTo")) ??
    "/admin/productos";

  const editHref = useMemo(() => {
    const detailPath = appendAdminProductsNavParams(
      `/admin/productos/detalle/${id}`,
      { returnTo: listReturnTo },
    );
    return appendAdminProductsNavParams(`/admin/productos/${id}`, {
      returnTo: listReturnTo,
      back: detailPath,
    });
  }, [id, listReturnTo]);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data.product ?? null);
      })
      .catch(() => toast.error("Error al cargar producto"))
      .finally(() => setLoading(false));
  }, [id]);

  const attributeGroups = useMemo(() => {
    const groups = new Map<string, Set<string>>();
    for (const variant of product?.variants ?? []) {
      for (const attribute of variant.attributes ?? []) {
        const values = groups.get(attribute.name) ?? new Set<string>();
        values.add(attribute.value);
        groups.set(attribute.name, values);
      }
    }
    return [...groups.entries()].map(([name, values]) => ({
      name,
      values: [...values],
    }));
  }, [product]);

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

  const showAttributes = product.variants.some(
    (variant) => (variant.attributes?.length ?? 0) > 0 || Boolean(variant.name),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <AdminProductsBackButton />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{product.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">/{product.slug}</p>
        </div>
        {isFullAdmin ? (
          <Button asChild className="gap-2">
            <Link href={editHref}>
              <Edit className="size-4" />
              Editar
            </Link>
          </Button>
        ) : null}
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Variantes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                {showAttributes ? <TableHead>Atributos</TableHead> : null}
                <TableHead>SKU</TableHead>
                <TableHead>EAN</TableHead>
                {isFullAdmin ? <TableHead>Precio de compra</TableHead> : null}
                <TableHead>Precio de publicación</TableHead>
                {isFullAdmin ? <TableHead className="text-center">Margen</TableHead> : null}
                <TableHead>Stock mínimo</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Peso (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.variants.map((variant) => {
                const attributeText =
                  variant.attributes?.map((attribute) => attribute.value).join(" · ") ||
                  variant.name;
                const margin = profitMarginPercent(variant.price, variant.costPrice);
                const marginLabel = formatProfitMarginPercent(
                  variant.price,
                  variant.costPrice,
                );
                return (
                  <TableRow key={variant.id}>
                    {showAttributes ? (
                      <TableCell className="text-xs font-medium text-muted-foreground">
                        {attributeText || "Sin atributos"}
                      </TableCell>
                    ) : null}
                    <TableCell className="font-mono text-xs font-semibold">
                      {variant.sku}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {variant.ean || "—"}
                    </TableCell>
                    {isFullAdmin ? (
                      <TableCell className="font-mono text-muted-foreground">
                        {variant.costPrice != null ? formatPrice(variant.costPrice) : "—"}
                      </TableCell>
                    ) : null}
                    <TableCell className="font-mono font-semibold">
                      {formatPrice(variant.price)}
                    </TableCell>
                    {isFullAdmin ? (
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "inline-flex h-9 min-w-[4.5rem] items-center justify-center rounded-md border border-border bg-muted/40 px-2 text-sm font-medium tabular-nums",
                            margin != null && margin < 0 && "text-destructive",
                            margin != null &&
                              margin >= 0 &&
                              "text-emerald-700 dark:text-emerald-400",
                          )}
                        >
                          {marginLabel}
                        </span>
                      </TableCell>
                    ) : null}
                    <TableCell>{variant.lowStockThreshold}</TableCell>
                    <TableCell>
                      <span
                        className={
                          variant.stock <= variant.lowStockThreshold
                            ? "font-semibold text-destructive"
                            : ""
                        }
                      >
                        {variant.stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {variant.weight != null ? variant.weight : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <ReadValue label="Nombre" className="md:col-span-2">
            {product.name}
          </ReadValue>
          <ReadValue label="Slug (URL)" className="md:col-span-2">
            <span className="font-mono">/{product.slug}</span>
          </ReadValue>
          <ReadValue label="Descripción" className="md:col-span-2">
            {product.description?.trim() ? (
              <RichTextContent content={product.description} />
            ) : (
              "—"
            )}
          </ReadValue>
          <ReadValue label="Marca">{product.brandName || "Sin marca"}</ReadValue>
          <div className="space-y-3">
            <ReadValue label="Ubicación en almacén">
              {product.warehouseLocationName || "Sin ubicación asignada"}
            </ReadValue>
            {product.warehouseLocationName ? (
              <div className="grid grid-cols-2 gap-3">
                <ReadValue label="Fila">{product.warehouseRow ?? "—"}</ReadValue>
                <ReadValue label="Columna">{product.warehouseCol ?? "—"}</ReadValue>
              </div>
            ) : null}
          </div>
          <ReadValue label="Categorías" className="md:col-span-2">
            {product.categoryNames.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {product.categoryNames.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            ) : (
              "—"
            )}
          </ReadValue>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Activo</p>
              <p className="text-xs text-muted-foreground">Visible en la tienda</p>
            </div>
            <p className="text-sm font-medium">{product.isActive ? "Sí" : "No"}</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Destacado</p>
              <p className="text-xs text-muted-foreground">Home y listados</p>
            </div>
            <p className="text-sm font-medium">{product.isFeatured ? "Sí" : "No"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Proveedores</CardTitle>
        </CardHeader>
        <CardContent>
          {product.supplierNames.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {product.supplierNames.map((name) => (
                <Badge key={name} variant="secondary">
                  {name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin proveedores</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Imágenes</CardTitle>
        </CardHeader>
        <CardContent>
          {product.images.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {product.images.map((img, idx) => (
                <div
                  key={`${img.url}-${idx}`}
                  className="relative overflow-hidden rounded-lg border border-border"
                >
                  <img
                    src={img.url}
                    alt={img.altText || `Imagen ${idx + 1}`}
                    className="aspect-square w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder-product.webp";
                    }}
                  />
                  {idx === 0 ? (
                    <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                      PRINCIPAL
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ImageIcon className="mb-2 size-8" />
              <p className="text-sm">Sin imágenes</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Sub Categorías (Atributos)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {attributeGroups.length > 0 ? (
            attributeGroups.map((group) => (
              <div key={group.name} className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {group.name}:
                </span>
                {group.values.map((value) => (
                  <Badge key={value} variant="secondary" className="text-xs">
                    {value}
                  </Badge>
                ))}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin sub categorías</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-primary">SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ReadValue label="Meta título">{emptyText(product.metaTitle)}</ReadValue>
          <ReadValue label="Meta descripción">{emptyText(product.metaDesc)}</ReadValue>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProductoDetallePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ProductoDetalleContent />
    </Suspense>
  );
}
