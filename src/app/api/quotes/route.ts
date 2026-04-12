import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const userId = session.user.id;

    const userWithCategories = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerCategories: {
          include: { customerCategory: { select: { canGenerateQuotes: true } } },
        },
      },
    });

    const canQuote = userWithCategories?.customerCategories.some(
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

    const variantIds = items.map((i: any) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
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
      return NextResponse.json({ error: "No se encontraron productos válidos." }, { status: 400 });
    }

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
        userId,
        subtotal,
        total: subtotal,
        validUntil,
        items: {
          create: quoteItems,
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ quote }, { status: 201 });
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

      const canQuote = userWithCategories?.customerCategories.some(
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
