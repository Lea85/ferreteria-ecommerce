import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const campaigns = await prisma.banner.findMany({
      where: { position: "HOME_HERO" },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Campaigns GET error:", error);
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
    const campaign = await prisma.banner.create({
      data: {
        title: body.title || null,
        subtitle: body.subtitle || null,
        imageUrl: body.imageUrl,
        linkUrl: body.linkUrl || null,
        ctaText: body.ctaText || "Ver más",
        position: "HOME_HERO",
        sortOrder: body.priority ?? 0,
        isActive: body.isActive ?? true,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("Campaign POST error:", error);
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
    if (!body.id) {
      return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    }

    const campaign = await prisma.banner.update({
      where: { id: body.id },
      data: {
        title: body.title ?? undefined,
        subtitle: body.subtitle ?? undefined,
        imageUrl: body.imageUrl ?? undefined,
        linkUrl: body.linkUrl ?? undefined,
        ctaText: body.ctaText ?? undefined,
        sortOrder: body.priority ?? undefined,
        isActive: body.isActive ?? undefined,
        startsAt: body.startsAt !== undefined ? (body.startsAt ? new Date(body.startsAt) : null) : undefined,
        endsAt: body.endsAt !== undefined ? (body.endsAt ? new Date(body.endsAt) : null) : undefined,
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Campaign PUT error:", error);
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
    if (!id) {
      return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    }

    await prisma.banner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Campaign DELETE error:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
