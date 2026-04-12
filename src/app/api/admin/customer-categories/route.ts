import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const categories = await prisma.customerCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Customer categories GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await request.json();
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const category = await prisma.customerCategory.create({
      data: {
        name: body.name,
        slug,
        description: body.description || null,
        benefitType: body.benefitType,
        benefitValue: Number(body.benefitValue) || 0,
        minAmount: body.minAmount ? Number(body.minAmount) : null,
        minQuantity: body.minQuantity ? Number(body.minQuantity) : null,
        isActive: body.isActive ?? true,
        canGenerateQuotes: body.canGenerateQuotes ?? false,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Customer category POST:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await request.json();
    const category = await prisma.customerCategory.update({
      where: { id: body.id },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        benefitType: body.benefitType ?? undefined,
        benefitValue: body.benefitValue !== undefined ? Number(body.benefitValue) : undefined,
        minAmount: body.minAmount !== undefined ? (body.minAmount ? Number(body.minAmount) : null) : undefined,
        minQuantity: body.minQuantity !== undefined ? (body.minQuantity ? Number(body.minQuantity) : null) : undefined,
        isActive: body.isActive ?? undefined,
        canGenerateQuotes: body.canGenerateQuotes ?? undefined,
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Customer category PUT:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    await prisma.customerCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer category DELETE:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
