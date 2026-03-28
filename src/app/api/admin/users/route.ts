import { NextResponse } from "next/server";

import { CustomerType, Prisma, UserRole } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const CUSTOMER_TYPES: CustomerType[] = ["CONSUMER", "TRADE", "WHOLESALE"];
const USER_ROLES: UserRole[] = ["CUSTOMER", "ADMIN", "SUPER_ADMIN"];

function isCustomerType(v: string): v is CustomerType {
  return CUSTOMER_TYPES.includes(v as CustomerType);
}

function isUserRole(v: string): v is UserRole {
  return USER_ROLES.includes(v as UserRole);
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const typeParam = searchParams.get("type")?.trim();
    const roleParam = searchParams.get("role")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20),
    );

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (typeParam && isCustomerType(typeParam)) {
      where.customerType = typeParam;
    }

    if (roleParam && isUserRole(roleParam)) {
      where.role = roleParam;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          phone: true,
          customerType: true,
          role: true,
          isApproved: true,
          createdAt: true,
          _count: { select: { orders: true, addresses: true } },
          customerCategories: {
            select: { customerCategoryId: true },
          },
        },
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        customerType: u.customerType,
        role: u.role,
        isApproved: u.isApproved,
        createdAt: u.createdAt,
        _count: {
          orders: u._count.orders,
          addresses: u._count.addresses,
        },
        customerCategoryIds: u.customerCategories.map((cc) => cc.customerCategoryId),
      })),
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      name,
      lastName,
      email,
      phone,
      customerType,
      isApproved,
    } = body as {
      id?: string;
      name?: string;
      lastName?: string | null;
      email?: string;
      phone?: string | null;
      customerType?: string;
      isApproved?: boolean;
    };

    if (!id) {
      return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
    }

    const data: Prisma.UserUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (lastName !== undefined) data.lastName = lastName;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (customerType !== undefined) {
      if (!isCustomerType(customerType)) {
        return NextResponse.json(
          { error: "customerType inválido" },
          { status: 400 },
        );
      }
      data.customerType = customerType;
    }
    if (isApproved !== undefined) data.isApproved = isApproved;

    const { customerCategoryIds } = body as { customerCategoryIds?: string[] };

    if (Object.keys(data).length === 0 && customerCategoryIds === undefined) {
      return NextResponse.json(
        { error: "No hay campos para actualizar" },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        customerType: true,
        role: true,
        isApproved: true,
        createdAt: true,
      },
    });

    if (customerCategoryIds !== undefined && Array.isArray(customerCategoryIds)) {
      await prisma.userCustomerCategory.deleteMany({ where: { userId: id! } });
      if (customerCategoryIds.length > 0) {
        await prisma.userCustomerCategory.createMany({
          data: customerCategoryIds.map((ccId) => ({
            userId: id!,
            customerCategoryId: ccId,
          })),
        });
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "El correo ya está en uso" },
          { status: 409 },
        );
      }
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 },
        );
      }
    }
    console.error("Admin users PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 },
        );
      }
      if (error.code === "P2003") {
        return NextResponse.json(
          {
            error:
              "No se puede eliminar el usuario: tiene pedidos u otros datos vinculados",
          },
          { status: 409 },
        );
      }
    }
    console.error("Admin users DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
