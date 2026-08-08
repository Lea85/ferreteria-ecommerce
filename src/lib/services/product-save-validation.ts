import { Prisma } from "@/generated/prisma";

import {
  buildProductSaveErrorPayload,
  type ProductFieldErrors,
  type ProductSaveErrorPayload,
} from "@/lib/product-form-errors";
import { prisma } from "@/lib/db";

type VariantInput = {
  id?: string;
  sku?: string;
  ean?: string | null;
  price?: number;
};

type ProductSaveInput = {
  name?: string;
  slug?: string;
  categoryIds?: string[];
  variants?: VariantInput[];
};


async function findExistingSku(
  sku: string,
  excludeVariantId?: string,
) {
  return prisma.productVariant.findFirst({
    where: {
      AND: [
        excludeVariantId ? { id: { not: excludeVariantId } } : {},
        {
          OR: [
            { sku },
            { sku: { equals: sku, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: {
      sku: true,
      product: { select: { name: true } },
    },
  });
}

export async function validateProductForSave(
  body: ProductSaveInput,
  options?: { productId?: string },
): Promise<ProductSaveErrorPayload | null> {
  const errors: string[] = [];
  const fieldErrors: ProductFieldErrors = {};

  if (!body.name?.trim()) {
    errors.push("Nombre: el nombre es obligatorio");
    fieldErrors.name = "El nombre es obligatorio";
  }

  if (!body.slug?.trim()) {
    errors.push("Slug: el slug es obligatorio");
    fieldErrors.slug = "El slug es obligatorio";
  } else {
    const slugConflict = await prisma.product.findFirst({
      where: {
        slug: body.slug.trim(),
        ...(options?.productId ? { id: { not: options.productId } } : {}),
      },
      select: { name: true },
    });
    if (slugConflict) {
      errors.push(
        `Slug: ya existe un producto con la URL "${body.slug.trim()}" (${slugConflict.name})`,
      );
      fieldErrors.slug = `Ya existe (${slugConflict.name})`;
    }
  }

  if (!body.categoryIds || body.categoryIds.length === 0) {
    errors.push("Categorías: elegí al menos una categoría");
    fieldErrors.categoryIds = "Elegí al menos una categoría";
  }

  const variants = body.variants ?? [];
  if (variants.length === 0) {
    errors.push("Variantes: agregá al menos una variante");
    fieldErrors.variants = "Agregá al menos una variante";
  }

  const skuIndex = new Map<string, number>();
  for (let i = 0; i < variants.length; i++) {
    const sku = variants[i].sku?.trim() ?? "";
    if (!sku) {
      errors.push(`Variante ${i + 1} — SKU: el SKU es obligatorio`);
      fieldErrors[`variants.${i}.sku`] = "SKU requerido";
      continue;
    }

    const key = sku.toLowerCase();
    const duplicateIndex = skuIndex.get(key);
    if (duplicateIndex !== undefined) {
      errors.push(
        `El SKU "${sku}" está repetido en las variantes ${duplicateIndex + 1} y ${i + 1}`,
      );
      fieldErrors[`variants.${i}.sku`] = "SKU duplicado en este formulario";
      fieldErrors[`variants.${duplicateIndex}.sku`] =
        "SKU duplicado en este formulario";
    } else {
      skuIndex.set(key, i);
    }

    const existing = await findExistingSku(sku, variants[i].id);
    if (existing) {
      errors.push(
        `Variante ${i + 1} — SKU: "${sku}" ya existe en el producto "${existing.product.name}"`,
      );
      fieldErrors[`variants.${i}.sku`] =
        `Ya existe en "${existing.product.name}"`;
    }

    const price = variants[i].price;
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      errors.push(`Variante ${i + 1} — Precio: precio de publicación inválido`);
      fieldErrors[`variants.${i}.price`] = "Precio inválido";
    }
  }

  if (errors.length === 0) return null;
  return buildProductSaveErrorPayload(errors, fieldErrors);
}

export function prismaErrorToProductSavePayload(
  error: unknown,
): ProductSaveErrorPayload | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (error.code === "P2002") {
    const target = (error.meta?.target as string[] | undefined) ?? [];
    const field = target[0] ?? "";

    if (field === "sku" || target.some((t) => t.includes("sku"))) {
      return buildProductSaveErrorPayload(
        ["El SKU ingresado ya existe en otro producto"],
        { "variants.0.sku": "Este SKU ya está en uso" },
      );
    }

    if (field === "slug" || target.some((t) => t.includes("slug"))) {
      return buildProductSaveErrorPayload(
        ["Ya existe un producto con ese slug (URL)"],
        { slug: "Este slug ya está en uso" },
      );
    }

    return buildProductSaveErrorPayload([
      "Hay un valor duplicado que no se puede repetir (revisá SKU o slug)",
    ]);
  }

  if (error.code === "P2003") {
    return buildProductSaveErrorPayload([
      "Alguna referencia no es válida (marca, categoría o proveedor)",
    ]);
  }

  return null;
}
