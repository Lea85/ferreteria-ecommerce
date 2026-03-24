import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role))
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    const documents = await prisma.legalDocument.findMany({ orderBy: { title: "asc" } });
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Legals GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role))
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    const body = await request.json();
    const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const doc = await prisma.legalDocument.create({
      data: { slug, title: body.title, content: body.content || "", isActive: body.isActive ?? true },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002")
      return NextResponse.json({ error: "Ya existe un documento con ese slug." }, { status: 409 });
    console.error("Legals POST:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role))
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    const body = await request.json();
    const doc = await prisma.legalDocument.update({
      where: { id: body.id },
      data: {
        title: body.title ?? undefined,
        content: body.content ?? undefined,
        isActive: body.isActive ?? undefined,
      },
    });

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("Legals PUT:", error);
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

    await prisma.legalDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Legals DELETE:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
