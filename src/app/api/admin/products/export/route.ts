import { NextResponse } from "next/server";

import { auth, canViewProductCostPrice, isFullAdmin } from "@/lib/auth";
import { buildAdminProductsWhere, parseAdminProductsFilterParams } from "@/lib/admin-products-filters";
import { buildBulkExportRow } from "@/lib/bulk-products-spreadsheet";
import { prisma } from "@/lib/db";
import { rowsToXlsxBuffer } from "@/lib/spreadsheet-download";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isFullAdmin((session.user as { role?: string }).role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format")?.toLowerCase();
    const wantsXlsx =
      format === "xlsx" ||
      request.headers.get("accept")?.includes(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

    const where = await buildAdminProductsWhere(
      parseAdminProductsFilterParams(searchParams),
    );

    if (where === null) {
      if (wantsXlsx) {
        return NextResponse.json(
          { error: "No hay productos para exportar con los filtros actuales." },
          { status: 404 },
        );
      }
      return NextResponse.json({ rows: [], total: 0 });
    }

    const showCost = canViewProductCostPrice(
      (session.user as { role?: string }).role,
    );

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        name: true,
        description: true,
        shortDesc: true,
        brand: { select: { name: true } },
        suppliers: {
          select: { supplier: { select: { name: true } } },
          orderBy: { supplier: { name: "asc" } },
        },
        categories: {
          select: { category: { select: { name: true } } },
          orderBy: { category: { name: "asc" } },
        },
        variants: {
          orderBy: { sku: "asc" },
          select: {
            sku: true,
            ean: true,
            price: true,
            costPrice: true,
            stock: true,
            lowStockThreshold: true,
          },
        },
      },
    });

    const rows = products.flatMap((product) =>
      product.variants.map((variant) =>
        buildBulkExportRow({
          sku: variant.sku,
          ean: variant.ean,
          name: product.name,
          costPrice:
            showCost && variant.costPrice != null
              ? Number(variant.costPrice)
              : null,
          price: Number(variant.price),
          stock: variant.stock,
          lowStockThreshold: variant.lowStockThreshold,
          brandName: product.brand?.name ?? null,
          supplierNames: product.suppliers.map((s) => s.supplier.name),
          categoryNames: product.categories.map((c) => c.category.name),
          description: product.description,
          shortDesc: product.shortDesc,
        }),
      ),
    );

    if (wantsXlsx) {
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "No hay productos para exportar con los filtros actuales." },
          { status: 404 },
        );
      }

      const buffer = rowsToXlsxBuffer(rows, "Productos");
      const date = new Date().toISOString().slice(0, 10);
      const filename = `productos_${date}.xlsx`;

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(buffer.length),
          "Cache-Control": "no-store",
          "X-Export-Row-Count": String(rows.length),
        },
      });
    }

    return NextResponse.json({ rows, total: rows.length });
  } catch (error) {
    console.error("Admin products export error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
