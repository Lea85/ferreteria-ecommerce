import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (
    !session?.user ||
    !["ADMIN", "SUPER_ADMIN"].includes(
      String((session.user as { role?: string }).role ?? ""),
    )
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const supplierId = searchParams.get("supplierId") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const where: Prisma.SupplierOrderWhereInput = {};
    if (status) where.status = status as Prisma.EnumSupplierOrderStatusFilter;
    if (supplierId) where.supplierId = supplierId;

    const [total, orders] = await Promise.all([
      prisma.supplierOrder.count({ where }),
      prisma.supplierOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          notes: true,
          supplierId: true,
          supplier: { select: { id: true, name: true } },
          _count: { select: { items: true } },
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        notes: o.notes,
        supplierId: o.supplierId,
        supplierName: o.supplier?.name || "Todos",
        itemCount: o._count.items,
        createdAt: o.createdAt.toISOString(),
      })),
      total,
      page,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Supplier orders GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const supplierId: string | null = body.supplierId || null;

    const variantWhere: Prisma.ProductVariantWhereInput = {
      isActive: true,
      stock: { lt: prisma.productVariant.fields.lowStockThreshold },
    };

    const lowStockVariants = await prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: { isActive: true },
      },
      select: {
        id: true,
        sku: true,
        stock: true,
        lowStockThreshold: true,
        productId: true,
        product: {
          select: {
            name: true,
            suppliers: { select: { supplierId: true } },
          },
        },
      },
    });

    let filtered = lowStockVariants.filter((v) => v.stock < v.lowStockThreshold);

    if (supplierId) {
      filtered = filtered.filter((v) =>
        v.product.suppliers.some((ps) => ps.supplierId === supplierId),
      );
    }

    if (filtered.length === 0) {
      return NextResponse.json(
        { error: "No hay productos con stock bajo el minimo" },
        { status: 400 },
      );
    }

    const year = new Date().getFullYear();
    const lastOrder = await prisma.supplierOrder.findFirst({
      where: { orderNumber: { startsWith: `PO-${year}-` } },
      orderBy: { orderNumber: "desc" },
    });

    let seq = 1;
    if (lastOrder) {
      const parts = lastOrder.orderNumber.split("-");
      seq = (parseInt(parts[2], 10) || 0) + 1;
    }

    const orderNumber = `PO-${year}-${String(seq).padStart(5, "0")}`;

    const order = await prisma.supplierOrder.create({
      data: {
        orderNumber,
        supplierId,
        status: "DRAFT",
        items: {
          create: filtered.map((v) => ({
            productId: v.productId,
            variantId: v.id,
            productName: v.product.name,
            sku: v.sku,
            requestedQty: Math.max(1, v.lowStockThreshold - v.stock),
            receivedQty: 0,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            productId: true,
            variantId: true,
            productName: true,
            sku: true,
            requestedQty: true,
            receivedQty: true,
          },
        },
      },
    });

    const itemsWithStock = order.items.map((item) => {
      const variant = filtered.find((v) => v.id === item.variantId);
      return {
        ...item,
        currentStock: variant?.stock ?? 0,
      };
    });

    return NextResponse.json(
      {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          supplierName: order.supplier?.name || "Todos",
          items: itemsWithStock,
          createdAt: order.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Supplier orders POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
