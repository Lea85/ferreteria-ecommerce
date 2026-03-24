import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role))
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    const tools = await prisma.rentalTool.findMany({
      orderBy: { name: "asc" },
      include: { periods: { orderBy: { days: "asc" } } },
    });

    const setting = await prisma.setting.findUnique({ where: { key: "rentals_enabled" } });

    return NextResponse.json({ tools, enabled: setting?.value === "true" });
  } catch (error) {
    console.error("Rentals GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role))
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    const body = await request.json();

    if (body.action === "toggle") {
      await prisma.setting.upsert({
        where: { key: "rentals_enabled" },
        update: { value: body.enabled ? "true" : "false" },
        create: { key: "rentals_enabled", value: body.enabled ? "true" : "false" },
      });
      return NextResponse.json({ success: true });
    }

    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const tool = await prisma.rentalTool.create({
      data: {
        name: body.name,
        slug,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        deposit: body.deposit ? Number(body.deposit) : null,
        availableQty: Number(body.availableQty) || 1,
        isActive: body.isActive ?? true,
        periods: {
          create: (body.periods || []).map((p: any) => ({
            label: p.label,
            days: Number(p.days),
            price: Number(p.price),
          })),
        },
      },
      include: { periods: true },
    });

    return NextResponse.json({ tool }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002")
      return NextResponse.json({ error: "Ya existe una herramienta con ese nombre." }, { status: 409 });
    console.error("Rentals POST:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role))
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    const body = await request.json();
    const { id, periods, ...data } = body;

    if (data.deposit !== undefined) data.deposit = data.deposit ? Number(data.deposit) : null;
    if (data.availableQty !== undefined) data.availableQty = Number(data.availableQty);

    const tool = await prisma.rentalTool.update({
      where: { id },
      data,
    });

    if (periods) {
      await prisma.rentalPeriod.deleteMany({ where: { rentalToolId: id } });
      await prisma.rentalPeriod.createMany({
        data: periods.map((p: any) => ({
          rentalToolId: id,
          label: p.label,
          days: Number(p.days),
          price: Number(p.price),
        })),
      });
    }

    const updated = await prisma.rentalTool.findUnique({
      where: { id },
      include: { periods: { orderBy: { days: "asc" } } },
    });

    return NextResponse.json({ tool: updated });
  } catch (error) {
    console.error("Rentals PUT:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role))
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido." }, { status: 400 });

    await prisma.rentalTool.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rentals DELETE:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
