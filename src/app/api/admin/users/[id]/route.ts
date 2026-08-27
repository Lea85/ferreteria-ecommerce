import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { auth, isAdminRole } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !isAdminRole((session.user as { role?: string }).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        customerType: true,
        role: true,
        isApproved: true,
        taxIdType: true,
        taxId: true,
        companyName: true,
        newsletterOptIn: true,
        createdAt: true,
        updatedAt: true,
        customerCategories: {
          select: {
            customerCategory: {
              select: { id: true, name: true, isActive: true },
            },
          },
        },
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            label: true,
            street: true,
            number: true,
            floor: true,
            apartment: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            isDefault: true,
            instructions: true,
          },
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
            addresses: true,
            quotes: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        customerType: user.customerType,
        role: user.role,
        isApproved: user.isApproved,
        taxIdType: user.taxIdType,
        taxId: user.taxId,
        companyName: user.companyName,
        newsletterOptIn: user.newsletterOptIn,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        customerCategories: user.customerCategories.map((cc) => ({
          id: cc.customerCategory.id,
          name: cc.customerCategory.name,
          isActive: cc.customerCategory.isActive,
        })),
        addresses: user.addresses,
        recentOrders: user.orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          total: Number(o.total),
          createdAt: o.createdAt.toISOString(),
        })),
        recentQuotes: user.quotes.map((q) => ({
          id: q.id,
          quoteNumber: q.quoteNumber,
          status: q.status,
          total: Number(q.total),
          createdAt: q.createdAt.toISOString(),
        })),
        _count: user._count,
      },
    });
  } catch (error) {
    console.error("Admin user detail GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
