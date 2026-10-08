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

function moneyClose(a: unknown, b: number | undefined): boolean {
  if (b == null || !Number.isFinite(b)) return true;
  if (a == null) return false;
  return Math.abs(Number(a) - b) < 0.005;
}

function supplierOrderItemNeedsUpdate(
  existing: {
    requestedQty: number;
    unitCostPrice: unknown;
    unitSalePrice: unknown;
  },
  row: {
    requestedQty: number;
    costPrice?: number;
    salePrice?: number;
  },
): boolean {
  if (row.requestedQty !== existing.requestedQty) return true;

  if (
    row.costPrice != null &&
    Number.isFinite(row.costPrice) &&
    !moneyClose(existing.unitCostPrice, row.costPrice)
  ) {
    return true;
  }
  if (
    row.salePrice != null &&
    Number.isFinite(row.salePrice) &&
    !moneyClose(existing.unitSalePrice, row.salePrice)
  ) {
    return true;
  }
  return false;
}

async function applySupplierOrderReceipt(
  order: SupplierOrderWithItems,
  incomingItems: ReceiptItemInput[],
) {
  return prisma.$transaction(
    async (tx) => {
      for (const incoming of incomingItems) {
        const item = order.items.find((i) => i.id === incoming.id);
        if (!item) continue;

        const newReceivedQty = Math.max(
          0,
          Math.floor(incoming.receivedQty || 0),
        );

        // En borrador el stock nunca se aplicó: no confiar en receivedQty previo
        // (si quedó marcado por un intento fallido, el delta sería 0 y no suma stock).
        const priorReceivedForStock =
          order.status === "DRAFT" ? 0 : item.receivedQty;
        const stockDelta = newReceivedQty - priorReceivedForStock;

        const unitCostPrice =
          incoming.costPrice != null && Number.isFinite(incoming.costPrice)
            ? Math.round(incoming.costPrice * 100) / 100
            : undefined;
        const unitSalePrice =
          incoming.salePrice != null && Number.isFinite(incoming.salePrice)
            ? Math.round(incoming.salePrice * 100) / 100
            : undefined;

        // 1) Stock primero, en update aparte (evita perder el increment si va
        //    mezclado con precios en el mismo UPDATE).
        if (item.variantId && stockDelta !== 0) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: stockDelta } },
          });
        }

        // 2) Precios de catálogo
        if (
          item.variantId &&
          (unitCostPrice != null || unitSalePrice != null)
        ) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              ...(unitCostPrice != null ? { costPrice: unitCostPrice } : {}),
              ...(unitSalePrice != null ? { price: unitSalePrice } : {}),
            },
          });
        }

        // 3) Ítem del pedido (recibido + precios del renglón)
        await tx.supplierOrderItem.update({
          where: { id: item.id },
          data: {
            receivedQty: newReceivedQty,
            ...(unitCostPrice != null ? { unitCostPrice } : {}),
            ...(unitSalePrice != null ? { unitSalePrice } : {}),
          },
        });
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
    },
    { timeout: 60000, maxWait: 15000 },
  );
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
        await prisma.$transaction(
          async (tx) => {
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
            const remainingById = new Map(remaining.map((i) => [i.id, i]));
            const remainingByVariantId = new Map(
              remaining
                .filter((i) => i.variantId)
                .map((i) => [i.variantId as string, i]),
            );

            type ParsedRow = {
              id?: string;
              variantId?: string;
              requestedQty: number;
              costPrice?: number;
              salePrice?: number;
            };

            const parsed: ParsedRow[] = [];
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
                parsed.push({
                  id: String(row.id),
                  requestedQty,
                  costPrice,
                  salePrice,
                });
              } else {
                const variantId = String(row.variantId ?? "");
                if (!variantId) continue;
                parsed.push({
                  variantId,
                  requestedQty,
                  costPrice,
                  salePrice,
                });
              }
            }

            const updateOps: Promise<unknown>[] = [];
            const createInputs: {
              variantId: string;
              requestedQty: number;
              costPrice?: number;
              salePrice?: number;
            }[] = [];

            for (const row of parsed) {
              if (row.id) {
                const existing = remainingById.get(row.id);
                if (!existing) continue;
                if (row.requestedQty < existing.receivedQty) {
                  throw new Error(
                    `La cantidad solicitada de "${existing.productName}" no puede ser menor a lo ya recibido (${existing.receivedQty}).`,
                  );
                }
                if (!supplierOrderItemNeedsUpdate(existing, row)) {
                  continue;
                }
                updateOps.push(
                  tx.supplierOrderItem.update({
                    where: { id: existing.id },
                    data: {
                      requestedQty: row.requestedQty,
                      ...(row.costPrice != null &&
                      Number.isFinite(row.costPrice)
                        ? { unitCostPrice: row.costPrice }
                        : {}),
                      ...(row.salePrice != null &&
                      Number.isFinite(row.salePrice)
                        ? { unitSalePrice: row.salePrice }
                        : {}),
                    },
                  }),
                );
                continue;
              }

              const variantId = row.variantId!;
              const duplicate = remainingByVariantId.get(variantId);
              if (duplicate) {
                throw new Error(
                  `El producto "${duplicate.productName}" ya está en el pedido.`,
                );
              }
              // Evitar duplicados entre filas nuevas del mismo request.
              if (createInputs.some((c) => c.variantId === variantId)) {
                throw new Error(
                  "Hay productos duplicados entre los ítems a agregar.",
                );
              }
              createInputs.push({
                variantId,
                requestedQty: row.requestedQty,
                costPrice: row.costPrice,
                salePrice: row.salePrice,
              });
            }

            if (updateOps.length > 0) {
              // Lotes chicos: evita un batch enorme que expire la transacción.
              const UPDATE_CHUNK = 25;
              for (let i = 0; i < updateOps.length; i += UPDATE_CHUNK) {
                await Promise.all(updateOps.slice(i, i + UPDATE_CHUNK));
              }
            }

            if (createInputs.length > 0) {
              const variantIds = createInputs.map((c) => c.variantId);
              const variants = await tx.productVariant.findMany({
                where: { id: { in: variantIds } },
                include: {
                  product: { select: { name: true, isActive: true } },
                },
              });
              const variantMap = new Map(variants.map((v) => [v.id, v]));

              const createData = createInputs.map((input) => {
                const variant = variantMap.get(input.variantId);
                if (!variant || !variant.product.isActive) {
                  throw new Error("Producto no encontrado o inactivo.");
                }
                return {
                  supplierOrderId: order.id,
                  productId: variant.productId,
                  variantId: variant.id,
                  productName: variant.product.name,
                  sku: variant.sku,
                  requestedQty: input.requestedQty,
                  receivedQty: 0,
                  unitCostPrice:
                    input.costPrice != null && Number.isFinite(input.costPrice)
                      ? input.costPrice
                      : variant.costPrice,
                  unitSalePrice:
                    input.salePrice != null && Number.isFinite(input.salePrice)
                      ? input.salePrice
                      : variant.price,
                };
              });

              await tx.supplierOrderItem.createMany({ data: createData });
            }

            const finalCount = await tx.supplierOrderItem.count({
              where: { supplierOrderId: order.id },
            });
            if (finalCount === 0) {
              throw new Error("El pedido debe tener al menos un producto.");
            }
          },
          { timeout: 60000, maxWait: 15000 },
        );
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
        { costPrice?: number; salePrice?: number; requestedQty?: number }
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
            requestedQty:
              row.requestedQty != null
                ? Math.max(1, Math.floor(Number(row.requestedQty) || 1))
                : undefined,
          });
        }
      }

      // Persistir cantidades del borrador (si vinieron) antes de recibir.
      for (const item of order.items) {
        const fromBody = priceById.get(item.id);
        if (
          fromBody?.requestedQty != null &&
          fromBody.requestedQty !== item.requestedQty
        ) {
          await prisma.supplierOrderItem.update({
            where: { id: item.id },
            data: { requestedQty: fromBody.requestedQty },
          });
          item.requestedQty = fromBody.requestedQty;
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
