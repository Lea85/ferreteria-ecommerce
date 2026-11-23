import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { id } = await params;
    const location = await prisma.warehouseLocation.findUnique({
      where: { id },
    });
    if (!location) {
      return NextResponse.json(
        { error: "Ubicación no encontrada." },
        { status: 404 },
      );
    }

    const products = await prisma.product.findMany({
      where: {
        warehouseLocationId: id,
        warehouseRow: { not: null },
        warehouseCol: { not: null },
      },
      select: {
        id: true,
        name: true,
        warehouseRow: true,
        warehouseCol: true,
        variants: {
          where: { isActive: true },
          select: { sku: true, stock: true, price: true },
          orderBy: { sku: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const cells = products
      .filter(
        (product) =>
          product.warehouseRow != null &&
          product.warehouseCol != null &&
          product.warehouseRow >= 1 &&
          product.warehouseRow <= location.maxRows &&
          product.warehouseCol >= 1 &&
          product.warehouseCol <= location.maxCols,
      )
      .map((product) => {
        const variants = product.variants;
        const stock = variants.reduce((sum, variant) => sum + variant.stock, 0);
        const prices = variants.map((variant) => Number(variant.price));
        return {
          row: product.warehouseRow,
          col: product.warehouseCol,
          productId: product.id,
          productName: product.name,
          stock,
          salePrice: prices.length > 0 ? Math.min(...prices) : null,
          priceVaries: new Set(prices).size > 1,
          variants: variants.map((variant) => ({
            sku: variant.sku,
            stock: variant.stock,
            salePrice: Number(variant.price),
          })),
        };
      });

    return NextResponse.json({
      location: {
        id: location.id,
        name: location.name,
        maxRows: location.maxRows,
        maxCols: location.maxCols,
        label: location.label,
      },
      cells,
    });
  } catch (error) {
    console.error("Warehouse detail GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
