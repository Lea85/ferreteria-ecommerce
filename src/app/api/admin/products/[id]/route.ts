import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { auth, isAdminRole, isFullAdmin, canViewProductCostPrice } from "@/lib/auth";
import {
  prismaErrorToProductSavePayload,
  validateProductForSave,
} from "@/lib/services/product-save-validation";
import {
  deleteProductById,
  ProductDeleteError,
} from "@/lib/services/product-delete.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || !isAdminRole((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const role = (session.user as { role?: string }).role;
  const showCost = canViewProductCostPrice(role);

  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: { select: { id: true, name: true } },
        categories: { select: { categoryId: true } },
        suppliers: { select: { supplierId: true } },
        variants: {
          select: {
            id: true, name: true, sku: true, ean: true, price: true, costPrice: true, comparePrice: true,
            stock: true, lowStockThreshold: true, weight: true, isActive: true,
            attributes: { select: { attributeValueId: true } },
          },
          orderBy: { price: "asc" },
        },
        images: { select: { id: true, url: true, altText: true, position: true }, orderBy: { position: "asc" } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const [brands, categories] = await Promise.all([
      prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);

    const mapped = {
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      brandId: product.brand?.id || "",
      warehouseLocationId: product.warehouseLocationId || "",
      categoryIds: product.categories.map((c) => c.categoryId),
      supplierIds: product.suppliers.map((s) => s.supplierId),
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      metaTitle: product.metaTitle || "",
      metaDesc: product.metaDesc || "",
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        ean: v.ean || "",
        price: Number(v.price),
        costPrice: showCost && v.costPrice ? Number(v.costPrice) : null,
        comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
        lowStockThreshold: v.lowStockThreshold,
        stock: v.stock,
        weight: v.weight ? Number(v.weight) : null,
        name: v.name || "",
        attributeValueIds: v.attributes.map((a) => a.attributeValueId),
      })),
      images: product.images.map((i) => ({
        url: i.url,
        altText: i.altText || "",
      })),
    };

    return NextResponse.json({ product: mapped, brands, categories });
  } catch (error) {
    console.error("Admin product detail error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || !isFullAdmin((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const isPartialUpdate = body.name === undefined && body.slug === undefined;

    if (isPartialUpdate) {
      const partialData: Record<string, any> = {};
      if (body.isActive !== undefined) partialData.isActive = body.isActive;
      if (body.isFeatured !== undefined) partialData.isFeatured = body.isFeatured;

      const updated = await prisma.product.update({ where: { id }, data: partialData });
      return NextResponse.json({ success: true, id: updated.id });
    }

    const validationError = await validateProductForSave(body, { productId: id });
    if (validationError) {
      return NextResponse.json(validationError, { status: 400 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        brandId: body.brandId || null,
        warehouseLocationId: body.warehouseLocationId || null,
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        metaTitle: body.metaTitle || null,
        metaDesc: body.metaDesc || null,
        categories: {
          deleteMany: {},
          create: (body.categoryIds || []).map((catId: string) => ({ categoryId: catId })),
        },
      },
    });

    if (body.supplierIds && Array.isArray(body.supplierIds)) {
      await prisma.productSupplier.deleteMany({ where: { productId: id } });
      if (body.supplierIds.length > 0) {
        await prisma.productSupplier.createMany({
          data: body.supplierIds.map((sid: string) => ({ productId: id, supplierId: sid })),
        });
      }
    }

    if (body.variants && Array.isArray(body.variants)) {
      const existingVariantIds = (
        await prisma.productVariant.findMany({ where: { productId: id }, select: { id: true } })
      ).map((v) => v.id);
      const incomingIds = body.variants.filter((v: any) => v.id).map((v: any) => v.id);
      const toDelete = existingVariantIds.filter((eid) => !incomingIds.includes(eid));
      if (toDelete.length > 0) {
        await prisma.variantAttributeValue.deleteMany({ where: { variantId: { in: toDelete } } });
        await prisma.productVariant.deleteMany({ where: { id: { in: toDelete } } });
      }

      for (const v of body.variants) {
        let variantId: string;
        if (v.id) {
          await prisma.productVariant.update({
            where: { id: v.id },
            data: {
              sku: v.sku,
              ean: v.ean || null,
              price: v.price,
              costPrice: v.costPrice ?? null,
              comparePrice: v.comparePrice || null,
              lowStockThreshold: v.lowStockThreshold ?? 5,
              stock: v.stock ?? 0,
              weight: v.weight || null,
              name: v.name || null,
            },
          });
          variantId = v.id;
        } else {
          const created = await prisma.productVariant.create({
            data: {
              productId: id,
              sku: v.sku,
              ean: v.ean || null,
              price: v.price,
              costPrice: v.costPrice ?? null,
              comparePrice: v.comparePrice || null,
              lowStockThreshold: v.lowStockThreshold ?? 5,
              stock: v.stock ?? 0,
              weight: v.weight || null,
              name: v.name || null,
            },
          });
          variantId = created.id;
        }

        if (Array.isArray(v.attributeValueIds)) {
          await prisma.variantAttributeValue.deleteMany({ where: { variantId } });
          if (v.attributeValueIds.length > 0) {
            await prisma.variantAttributeValue.createMany({
              data: v.attributeValueIds.map((avId: string) => ({
                variantId,
                attributeValueId: avId,
              })),
            });
          }
        }
      }
    }

    if (body.images && Array.isArray(body.images)) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      if (body.images.length > 0) {
        await prisma.productImage.createMany({
          data: body.images.map((img: { url: string; altText?: string }, idx: number) => ({
            productId: id,
            url: img.url,
            altText: img.altText || null,
            position: idx,
            isPrimary: idx === 0,
          })),
        });
      }
    }

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error) {
    console.error("Admin product update error:", error);
    const prismaPayload = prismaErrorToProductSavePayload(error);
    if (prismaPayload) {
      return NextResponse.json(prismaPayload, { status: 409 });
    }
    return NextResponse.json(
      {
        error: "Error al guardar los cambios",
        errors: ["Error inesperado al guardar. Intentá de nuevo."],
        fieldErrors: {},
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || !isFullAdmin((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await deleteProductById(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ProductDeleteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "NOT_FOUND" ? 404 : 400 },
      );
    }
    console.error("Admin product delete error:", error);
    return NextResponse.json({ error: "Error al eliminar el producto" }, { status: 500 });
  }
}
