import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/auth";
import { getIntegracionesSettings } from "@/lib/integraciones-settings";
import { resolveUserCategoryDiscount } from "@/lib/services/customer-discount.service";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const sessionUserId = session.user.id;

    const userWithCategories = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: {
        id: true,
        role: true,
        customerCategories: {
          include: { customerCategory: { select: { canGenerateQuotes: true } } },
        },
      },
    });

    if (!userWithCategories) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const role = userWithCategories.role;
    const isStaff = isAdminRole(role);
    const canQuote =
      isStaff ||
      userWithCategories.customerCategories.some(
        (uc) => uc.customerCategory.canGenerateQuotes,
      );

    if (!canQuote) {
      return NextResponse.json(
        { error: "No tenés permiso para generar presupuestos." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío." }, { status: 400 });
    }

    // Clientes (no admin/mostrador): el presupuesto queda siempre asignado a quien lo genera.
    // Staff puede opcionalmente indicar un cliente destino (userId / customerId).
    let assignedUserId = sessionUserId;
    if (isStaff) {
      const requestedCustomerId = String(
        body.userId ?? body.customerId ?? "",
      ).trim();
      if (requestedCustomerId) {
        const customer = await prisma.user.findUnique({
          where: { id: requestedCustomerId },
          select: { id: true },
        });
        if (!customer) {
          return NextResponse.json(
            { error: "Cliente no encontrado." },
            { status: 400 },
          );
        }
        assignedUserId = customer.id;
      }
    } else if (body.userId || body.customerId) {
      const requested = String(body.userId ?? body.customerId).trim();
      if (requested && requested !== sessionUserId) {
        return NextResponse.json(
          { error: "No podés asignar el presupuesto a otro usuario." },
          { status: 403 },
        );
      }
    }

    const validityDaysSetting = await prisma.setting.findUnique({
      where: { key: "quote_validity_days" },
    });
    const validityDays = parseInt(validityDaysSetting?.value || "7", 10) || 7;

    const validUntil = new Date();
    let added = 0;
    while (added < validityDays) {
      validUntil.setDate(validUntil.getDate() + 1);
      const day = validUntil.getDay();
      if (day !== 0 && day !== 6) added++;
    }

    const variantIds = items.map((i: { variantId?: string }) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds.filter(Boolean) as string[] } },
      include: { product: { select: { name: true } } },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    let subtotal = 0;
    const quoteItems: {
      variantId: string;
      productName: string;
      variantName: string | null;
      sku: string;
      ean: string | null;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (const item of items) {
      const variant = variantMap.get(item.variantId);
      if (!variant) continue;

      const unitPrice = Number(variant.price);
      const qty = Number(item.quantity) || 1;
      const lineTotal = unitPrice * qty;

      quoteItems.push({
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        sku: variant.sku,
        ean: variant.ean,
        quantity: qty,
        unitPrice,
        subtotal: lineTotal,
      });

      subtotal += lineTotal;
    }

    if (quoteItems.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron productos válidos." },
        { status: 400 },
      );
    }

    const totalQuantity = quoteItems.reduce((sum, i) => sum + i.quantity, 0);
    const categoryDiscount = await resolveUserCategoryDiscount(
      assignedUserId,
      subtotal,
      totalQuantity,
    );
    const discountAmount = categoryDiscount?.amount ?? 0;
    const total = Math.max(0, subtotal - discountAmount);

    const lastQuote = await prisma.quote.findFirst({
      orderBy: { createdAt: "desc" },
      select: { quoteNumber: true },
    });

    let nextNum = 1;
    if (lastQuote?.quoteNumber) {
      const match = lastQuote.quoteNumber.match(/PRES-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const quoteNumber = `PRES-${String(nextNum).padStart(6, "0")}`;

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        userId: assignedUserId,
        subtotal,
        total,
        validUntil,
        notes: categoryDiscount
          ? `${categoryDiscount.label}: -${discountAmount.toFixed(2)}`
          : null,
        items: {
          create: quoteItems,
        },
      },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const storeSettings = await getIntegracionesSettings();

    return NextResponse.json(
      {
        quote,
        discount: categoryDiscount
          ? { label: categoryDiscount.label, amount: discountAmount }
          : null,
        storeSettings,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Quote creation error:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checkPermission = searchParams.get("checkPermission");

    if (checkPermission === "true") {
      const userWithCategories = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          customerCategories: {
            include: { customerCategory: { select: { canGenerateQuotes: true } } },
          },
        },
      });

      const role =
        userWithCategories?.role ?? (session.user as { role?: string }).role;
      const canQuote =
        isAdminRole(role) ||
        userWithCategories?.customerCategories.some(
          (uc) => uc.customerCategory.canGenerateQuotes,
        );

      return NextResponse.json({ canGenerateQuotes: !!canQuote });
    }

    const quotes = await prisma.quote.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error("Quote list error:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
