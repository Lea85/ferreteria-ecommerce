import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { auth, isFullAdmin } from "@/auth";

type BulkField<T> = { value: T };

type BulkUpdateBody = {
  productIds: string[];
  brandId?: BulkField<string | null>;
  categoryIds?: BulkField<string[]>;
  supplierIds?: BulkField<string[]>;
  isActive?: BulkField<boolean>;
  isFeatured?: BulkField<boolean>;
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isFullAdmin(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = (await request.json()) as BulkUpdateBody;
    const productIds = Array.isArray(body.productIds)
      ? [...new Set(body.productIds.filter((id) => typeof id === "string" && id))]
      : [];

    if (productIds.length === 0) {
      return NextResponse.json(
        { error: "Seleccioná al menos un producto." },
        { status: 400 },
      );
    }

    const hasAnyField =
      body.brandId !== undefined ||
      body.categoryIds !== undefined ||
      body.supplierIds !== undefined ||
      body.isActive !== undefined ||
      body.isFeatured !== undefined;

    if (!hasAnyField) {
      return NextResponse.json(
        { error: "Indicá al menos un atributo para modificar." },
        { status: 400 },
      );
    }

    const existing = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((p) => p.id));
    const missing = productIds.filter((id) => !existingIds.has(id));

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron productos." },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const productId of existing.map((p) => p.id)) {
        const data: Prisma.ProductUpdateInput = {};

        if (body.brandId !== undefined) {
          data.brand = body.brandId.value
            ? { connect: { id: body.brandId.value } }
            : { disconnect: true };
        }
        if (body.isActive !== undefined) {
          data.isActive = body.isActive.value;
        }
        if (body.isFeatured !== undefined) {
          data.isFeatured = body.isFeatured.value;
        }

        if (Object.keys(data).length > 0) {
          await tx.product.update({ where: { id: productId }, data });
        }

        if (body.categoryIds !== undefined) {
          await tx.productCategory.deleteMany({ where: { productId } });
          const ids = body.categoryIds.value.filter(Boolean);
          if (ids.length > 0) {
            await tx.productCategory.createMany({
              data: ids.map((categoryId) => ({ productId, categoryId })),
              skipDuplicates: true,
            });
          }
        }

        if (body.supplierIds !== undefined) {
          await tx.productSupplier.deleteMany({ where: { productId } });
          const ids = body.supplierIds.value.filter(Boolean);
          if (ids.length > 0) {
            await tx.productSupplier.createMany({
              data: ids.map((supplierId) => ({ productId, supplierId })),
              skipDuplicates: true,
            });
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      updated: existing.length,
      missing: missing.length > 0 ? missing : undefined,
    });
  } catch (error) {
    console.error("Bulk product update error:", error);
    return NextResponse.json({ error: "Error al actualizar productos" }, { status: 500 });
  }
}
