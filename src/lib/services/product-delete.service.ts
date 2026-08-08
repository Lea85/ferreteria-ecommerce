import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";

export class ProductDeleteError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "CONFLICT" = "CONFLICT",
  ) {
    super(message);
    this.name = "ProductDeleteError";
  }
}

/**
 * Elimina un producto del catálogo preservando ventas históricas:
 * - OrderItem conserva nombre, SKU, precios y costo respaldado.
 * - Se desvinculan variantes de pedidos antes del borrado físico.
 */
export async function deleteProductById(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      variants: { select: { id: true, costPrice: true } },
    },
  });

  if (!product) {
    throw new ProductDeleteError("Producto no encontrado", "NOT_FOUND");
  }

  const variantIds = product.variants.map((v) => v.id);

  try {
    await prisma.$transaction(async (tx) => {
      for (const variant of product.variants) {
        if (variant.costPrice == null) continue;

        await tx.orderItem.updateMany({
          where: {
            variantId: variant.id,
            unitCostSnapshot: null,
          },
          data: { unitCostSnapshot: variant.costPrice },
        });

        await tx.orderReturnItem.updateMany({
          where: {
            variantId: variant.id,
            unitCostSnapshot: null,
          },
          data: { unitCostSnapshot: variant.costPrice },
        });
      }

      if (variantIds.length > 0) {
        await tx.orderItem.updateMany({
          where: { variantId: { in: variantIds } },
          data: { variantId: null },
        });

        await tx.quoteItem.deleteMany({
          where: { variantId: { in: variantIds } },
        });
      }

      await tx.favorite.deleteMany({ where: { productId } });

      await tx.product.delete({ where: { id: productId } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        throw new ProductDeleteError(
          "No se puede eliminar: el producto tiene datos vinculados que impiden el borrado.",
        );
      }
      if (error.code === "P2025") {
        throw new ProductDeleteError("Producto no encontrado", "NOT_FOUND");
      }
    }
    throw error;
  }
}
