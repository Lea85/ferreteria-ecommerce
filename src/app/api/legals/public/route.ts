import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const doc = await prisma.legalDocument.findUnique({ where: { slug } });
      if (!doc || !doc.isActive) return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
      return NextResponse.json({ document: { title: doc.title, content: doc.content } });
    }

    const documents = await prisma.legalDocument.findMany({
      where: { isActive: true },
      select: { slug: true, title: true },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Legals public GET:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
