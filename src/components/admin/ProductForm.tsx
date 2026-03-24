"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, "SKU requerido"),
  price: z.coerce.number().min(0, "Precio inválido"),
  comparePrice: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0),
  weight: z.coerce.number().min(0).optional().nullable(),
});

const productSchema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  slug: z.string().min(2, "Slug requerido"),
  description: z.string().optional(),
  brandId: z.string().optional(),
  warehouseLocationId: z.string().optional(),
  categoryIds: z.array(z.string()).min(1, "Elegí al menos una categoría"),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
  variants: z.array(variantSchema).min(1, "Agregá al menos una variante"),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export type ProductFormOption = { id: string; name: string };

export type ProductFormInitial = Partial<
  Omit<ProductFormValues, "variants" | "categoryIds">
> & {
  categoryIds?: string[];
  variants?: ProductFormValues["variants"];
};

export type ProductFormProps = {
  initialData?: ProductFormInitial;
  brands: ProductFormOption[];
  categories: ProductFormOption[];
  onSubmit: (data: ProductFormValues) => void | Promise<void>;
  submitLabel?: string;
  className?: string;
};

export function ProductForm({
  initialData,
  brands,
  categories,
  onSubmit,
  submitLabel = "Guardar producto",
  className,
}: ProductFormProps) {
  const fileInputId = useId();
  const [slugTouched, setSlugTouched] = useState(!!initialData?.slug);

  type WarehouseOption = { id: string; code: string; display: string };
  const [warehouseLocations, setWarehouseLocations] = useState<WarehouseOption[]>([]);

  useEffect(() => {
    fetch("/api/admin/warehouse/locations")
      .then((r) => r.json())
      .then((d) => { if (d.locations) setWarehouseLocations(d.locations); })
      .catch(() => {});
  }, []);

  const defaultValues = useMemo(
    (): ProductFormValues => ({
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      description: initialData?.description ?? "",
      brandId: initialData?.brandId ?? "",
      warehouseLocationId: (initialData as any)?.warehouseLocationId ?? "",
      categoryIds: initialData?.categoryIds?.length
        ? initialData.categoryIds
        : [],
      isActive: initialData?.isActive ?? true,
      isFeatured: initialData?.isFeatured ?? false,
      metaTitle: initialData?.metaTitle ?? "",
      metaDesc: initialData?.metaDesc ?? "",
      variants:
        initialData?.variants?.length ? initialData.variants : [
            {
              sku: "",
              price: 0,
              comparePrice: null,
              stock: 0,
              weight: null,
            },
          ],
    }),
    [initialData],
  );

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const nameWatch = form.watch("name");
  const slugWatch = form.watch("slug");

  const syncSlug = useCallback(() => {
    if (!slugTouched && nameWatch) {
      form.setValue("slug", slugify(nameWatch), { shouldValidate: true });
    }
  }, [form, nameWatch, slugTouched]);

  useEffect(() => {
    syncSlug();
  }, [nameWatch, syncSlug]);

  const categoryIds = form.watch("categoryIds") ?? [];

  function toggleCategory(id: string) {
    const next = categoryIds.includes(id)
      ? categoryIds.filter((c) => c !== id)
      : [...categoryIds, id];
    form.setValue("categoryIds", next, { shouldValidate: true });
  }

  return (
    <form
      className={cn("space-y-8", className)}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Información general</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...form.register("name")} className="border-border" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              {...form.register("slug")}
              className="border-border font-mono text-sm"
              onChange={(e) => {
                setSlugTouched(true);
                form.register("slug").onChange(e);
              }}
            />
            {form.formState.errors.slug && (
              <p className="text-sm text-destructive">
                {form.formState.errors.slug.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Se genera desde el nombre; podés editarlo manualmente.
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              rows={5}
              {...form.register("description")}
              className="border-border"
            />
          </div>
          <div className="space-y-2">
            <Label>Marca</Label>
            <Select
              value={form.watch("brandId") || "__none__"}
              onValueChange={(v) =>
                form.setValue("brandId", v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger className="border-border">
                <SelectValue placeholder="Seleccionar marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin marca</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              Ubicacion en almacen
            </Label>
            <Select
              value={form.watch("warehouseLocationId") || "__none__"}
              onValueChange={(v) =>
                form.setValue("warehouseLocationId", v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger className="border-border">
                <SelectValue placeholder="Sin ubicacion asignada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin ubicacion asignada</SelectItem>
                {warehouseLocations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    <span className="font-mono font-bold">{l.code}</span>
                    <span className="ml-2 text-muted-foreground">{l.display}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Categorías</Label>
            <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={categoryIds.includes(c.id)}
                    onCheckedChange={() => toggleCategory(c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
            {form.formState.errors.categoryIds && (
              <p className="text-sm text-destructive">
                {form.formState.errors.categoryIds.message as string}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Activo</p>
              <p className="text-xs text-muted-foreground">
                Visible en la tienda
              </p>
            </div>
            <Switch
              checked={form.watch("isActive")}
              onCheckedChange={(v) => form.setValue("isActive", v)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Destacado</p>
              <p className="text-xs text-muted-foreground">Home y listados</p>
            </div>
            <Switch
              checked={form.watch("isFeatured")}
              onCheckedChange={(v) => form.setValue("isFeatured", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-primary">SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="metaTitle">Meta título</Label>
            <Input id="metaTitle" {...form.register("metaTitle")} className="border-border" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="metaDesc">Meta descripción</Label>
            <Textarea
              id="metaDesc"
              rows={3}
              {...form.register("metaDesc")}
              className="border-border"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-primary">Variantes</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              append({
                sku: "",
                price: 0,
                comparePrice: null,
                stock: 0,
                weight: null,
              })
            }
          >
            <Plus className="size-4" />
            Agregar variante
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {form.formState.errors.variants?.message && (
            <p className="mb-2 text-sm text-destructive">
              {String(form.formState.errors.variants.message)}
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>SKU</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Precio comparación</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <Input
                      {...form.register(`variants.${index}.sku`)}
                      className="h-9 min-w-[120px] border-border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register(`variants.${index}.price`)}
                      className="h-9 w-28 border-border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register(`variants.${index}.comparePrice`)}
                      className="h-9 w-28 border-border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      {...form.register(`variants.${index}.stock`)}
                      className="h-9 w-24 border-border"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register(`variants.${index}.weight`)}
                      className="h-9 w-24 border-border"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                      aria-label="Eliminar variante"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Imágenes</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor={fileInputId} className="cursor-pointer">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 px-6 py-12 text-center transition-colors hover:bg-muted/40">
              <p className="text-sm font-medium text-foreground">
                Arrastrá archivos o hacé clic para seleccionar
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG o WebP (placeholder — integración pendiente)
              </p>
            </div>
          </Label>
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" className="min-w-[160px]">
          {submitLabel}
        </Button>
      </div>

      {process.env.NODE_ENV === "development" && slugWatch && (
        <p className="text-xs text-muted-foreground">Vista previa: /{slugWatch}</p>
      )}
    </form>
  );
}
