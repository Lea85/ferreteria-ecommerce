import { NextResponse } from "next/server";

import type { SupplierOrderStatus } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { auth, isAdminRole } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (
    !session?.user ||
    !isAdminRole(
      String((session.user as { role?: string }).role ?? ""),
    )
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return null;
}

type SupplierOrderWithItems = {
  id: string;
  status: SupplierOrderStatus;
  items: {
    id: string;
    variantId: string | null;
    requestedQty: number;
    receivedQty: number;
  }[];
};

type ReceiptItemInput = {
  id: string;
  receivedQty: number;
  costPrice?: number;
  salePrice?: number;
};

async function applySupplierOrderReceipt(
  order: SupplierOrderWithItems,
  incomingItems: ReceiptItemInput[],
) {
  return prisma.$transaction(async (tx) => {
    for (const incoming of incomingItems) {
      const item = order.items.find((i) => i.id === incoming.id);
      if (!item) continue;

      const newReceivedQty = Math.max(0, Math.floor(incoming.receivedQty || 0));
      const delta = newReceivedQty - item.receivedQty;

      const itemUpdate: {
        receivedQty: number;
        unitCostPrice?: number;
        unitSalePrice?: number;
      } = { receivedQty: newReceivedQty };

      if (incoming.costPrice != null && Number.isFinite(incoming.costPrice)) {
        itemUpdate.unitCostPrice = Math.round(incoming.costPrice * 100) / 100;
      }
      if (incoming.salePrice != null && Number.isFinite(incoming.salePrice)) {
        itemUpdate.unitSalePrice = Math.round(incoming.salePrice * 100) / 100;
      }

      await tx.supplierOrderItem.update({
        where: { id: item.id },
        data: itemUpdate,
      });

      if (item.variantId) {
        const variantUpdate: { stock?: { increment: number }; costPrice?: number; price?: number } =
          {};

        if (delta !== 0) {
          variantUpdate.stock = { increment: delta };
        }
        if (itemUpdate.unitCostPrice != null) {
          variantUpdate.costPrice = itemUpdate.unitCostPrice;
        }
        if (itemUpdate.unitSalePrice != null) {
          variantUpdate.price = itemUpdate.unitSalePrice;
        }

        if (Object.keys(variantUpdate).length > 0) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: variantUpdate,
          });
        }
      }
    }

    const updatedItems = await tx.supplierOrderItem.findMany({
      where: { supplierOrderId: order.id },
    });

    const allReceived = updatedItems.every(
      (i) => i.receivedQty >= i.requestedQty,
    );
    const anyReceived = updatedItems.some((i) => i.receivedQty > 0);
    const newStatus: SupplierOrderStatus = allReceived
      ? "RECEIVED"
      : anyReceived
        ? "PARTIALLY_RECEIVED"
        : order.status === "DRAFT"
          ? "SENT"
          : order.status;

    await tx.supplierOrder.update({
      where: { id: order.id },
      data: { status: newStatus },
    });

    return newStatus;
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;

    const order = await prisma.supplierOrder.findUnique({
      where: { id },
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
            unitCostPrice: true,
            unitSalePrice: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const variantIds = order.items
      .map((i) => i.variantId)
      .filter((v): v is string => !!v);

    const variants =
      variantIds.length > 0
        ? await prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: { id: true, stock: true, price: true, costPrice: true },
          })
        : [];

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        notes: order.notes,
        supplierId: order.supplierId,
        supplierName: order.supplier?.name || "Todos",
        items: order.items.map((item) => {
          const variant = item.variantId
            ? variantMap.get(item.variantId)
            : undefined;
          const costPrice =
            item.unitCostPrice != null
              ? Number(item.unitCostPrice)
              : variant?.costPrice != null
                ? Number(variant.costPrice)
                : 0;
          const salePrice =
            item.unitSalePrice != null
              ? Number(item.unitSalePrice)
              : variant
                ? Number(variant.price)
                : 0;
          return {
            ...item,
            currentStock: item.variantId ? variant?.stock ?? 0 : 0,
            costPrice,
            salePrice,
          };
        }),
        createdAt: order.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Supplier order GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();

    const order = await prisma.supplierOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (body.action === "receive" && Array.isArray(body.items)) {
      const newStatus = await applySupplierOrderReceipt(order, body.items);
      return NextResponse.json({ success: true, status: newStatus });
    }

    if (body.action === "save") {
      if (order.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Solo se pueden editar pedidos en borrador." },
          { status: 400 },
        );
      }

      const items = Array.isArray(body.items) ? body.items : [];
      const removeItemIds = Array.isArray(body.removeItemIds)
        ? (body.removeItemIds as string[])
        : [];

      if (items.length === 0 && removeItemIds.length === 0) {
        return NextResponse.json(
          { error: "El pedido debe tener al menos un producto." },
          { status: 400 },
        );
      }

      try {
        await prisma.$transaction(async (tx) => {
          if (removeItemIds.length > 0) {
            await tx.supplierOrderItem.deleteMany({
              where: {
                supplierOrderId: order.id,
                id: { in: removeItemIds },
              },
            });
          }

          const remaining = await tx.supplierOrderItem.findMany({
            where: { supplierOrderId: order.id },
          });

          const remainingAfterDelete = remaining.filter(
            (i) => !removeItemIds.includes(i.id),
          );

          for (const raw of items) {
            const row = raw as Record<string, unknown>;
            const requestedQty = Math.max(
              1,
              Math.floor(Number(row.requestedQty) || 1),
            );

            const costPrice =
              row.costPrice != null && row.costPrice !== ""
                ? Math.round(Number(row.costPrice) * 100) / 100
                : undefined;
            const salePrice =
              row.salePrice != null && row.salePrice !== ""
                ? Math.round(Number(row.salePrice) * 100) / 100
                : undefined;

            if (row.id) {
              const existing = remainingAfterDelete.find((i) => i.id === row.id);
              if (!existing) continue;
              if (requestedQty < existing.receivedQty) {
                throw new Error(
                  `La cantidad solicitada de "${existing.productName}" no puede ser menor a lo ya recibido (${existing.receivedQty}).`,
                );
              }
              await tx.supplierOrderItem.update({
                where: { id: existing.id },
                data: {
                  requestedQty,
                  ...(costPrice != null && Number.isFinite(costPrice)
                    ? { unitCostPrice: costPrice }
                    : {}),
                  ...(salePrice != null && Number.isFinite(salePrice)
                    ? { unitSalePrice: salePrice }
                    : {}),
                },
              });
              continue;
            }

            const variantId = String(row.variantId ?? "");
            if (!variantId) continue;

            const duplicate = remainingAfterDelete.find(
              (i) => i.variantId === variantId,
            );
            if (duplicate) {
              throw new Error(
                `El producto "${duplicate.productName}" ya está en el pedido.`,
              );
            }

            const variant = await tx.productVariant.findUnique({
              where: { id: variantId },
              include: { product: { select: { name: true, isActive: true } } },
            });
            if (!variant || !variant.product.isActive) {
              throw new Error("Producto no encontrado o inactivo.");
            }

            await tx.supplierOrderItem.create({
              data: {
                supplierOrderId: order.id,
                productId: variant.productId,
                variantId: variant.id,
                productName: variant.product.name,
                sku: variant.sku,
                requestedQty,
                receivedQty: 0,
                unitCostPrice:
                  costPrice != null && Number.isFinite(costPrice)
                    ? costPrice
                    : variant.costPrice,
                unitSalePrice:
                  salePrice != null && Number.isFinite(salePrice)
                    ? salePrice
                    : variant.price,
              },
            });
          }

          const finalCount = await tx.supplierOrderItem.count({
            where: { supplierOrderId: order.id },
          });
          if (finalCount === 0) {
            throw new Error("El pedido debe tener al menos un producto.");
          }
        });
      } catch (saveError) {
        const message =
          saveError instanceof Error
            ? saveError.message
            : "Error al guardar el pedido.";
        return NextResponse.json({ error: message }, { status: 400 });
      }

      const updated = await prisma.supplierOrder.findUnique({
        where: { id },
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
              unitCostPrice: true,
              unitSalePrice: true,
            },
          },
        },
      });

      if (!updated) {
        return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
      }

      const variantIds = updated.items
        .map((i) => i.variantId)
        .filter((v): v is string => !!v);
      const variants =
        variantIds.length > 0
          ? await prisma.productVariant.findMany({
              where: { id: { in: variantIds } },
              select: { id: true, stock: true, price: true, costPrice: true },
            })
          : [];
      const variantMap = new Map(variants.map((v) => [v.id, v]));

      return NextResponse.json({
        success: true,
        order: {
          id: updated.id,
          orderNumber: updated.orderNumber,
          status: updated.status,
          supplierName: updated.supplier?.name || "Todos",
          items: updated.items.map((item) => {
            const variant = item.variantId
              ? variantMap.get(item.variantId)
              : undefined;
            const costPrice =
              item.unitCostPrice != null
                ? Number(item.unitCostPrice)
                : variant?.costPrice != null
                  ? Number(variant.costPrice)
                  : 0;
            const salePrice =
              item.unitSalePrice != null
                ? Number(item.unitSalePrice)
                : variant
                  ? Number(variant.price)
                  : 0;
            return {
              ...item,
              currentStock: item.variantId ? variant?.stock ?? 0 : 0,
              costPrice,
              salePrice,
            };
          }),
          createdAt: updated.createdAt.toISOString(),
        },
      });
    }

    if (
      body.status === "SENT" &&
      order.status === "DRAFT" &&
      !body.skipStockUpdate
    ) {
      const priceById = new Map<
        string,
        { costPrice?: number; salePrice?: number }
      >();
      if (Array.isArray(body.items)) {
        for (const raw of body.items) {
          const row = raw as Record<string, unknown>;
          const id = String(row.id ?? "");
          if (!id) continue;
          priceById.set(id, {
            costPrice:
              row.costPrice != null ? Number(row.costPrice) : undefined,
            salePrice:
              row.salePrice != null ? Number(row.salePrice) : undefined,
          });
        }
      }

      const receiptItems: ReceiptItemInput[] = order.items.map((item) => {
        const prices = priceById.get(item.id);
        const costPrice =
          prices?.costPrice != null && Number.isFinite(prices.costPrice)
            ? prices.costPrice
            : item.unitCostPrice != null
              ? Number(item.unitCostPrice)
              : undefined;
        const salePrice =
          prices?.salePrice != null && Number.isFinite(prices.salePrice)
            ? prices.salePrice
            : item.unitSalePrice != null
              ? Number(item.unitSalePrice)
              : undefined;

        return {
          id: item.id,
          receivedQty: item.requestedQty,
          costPrice,
          salePrice,
        };
      });

      const newStatus = await applySupplierOrderReceipt(order, receiptItems);
      return NextResponse.json({
        success: true,
        status: newStatus,
        stockUpdated: true,
        pricesUpdated: true,
      });
    }

    const data: { status?: SupplierOrderStatus; notes?: string | null } = {};
    if (body.status) data.status = body.status as SupplierOrderStatus;
    if ("notes" in body) data.notes = body.notes || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Sin datos para actualizar" }, { status: 400 });
    }

    await prisma.supplierOrder.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Supplier order PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
