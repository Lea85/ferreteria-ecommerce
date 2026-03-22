import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (session?.user?.id) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { newsletterOptIn: true },
      });
      return NextResponse.json({ subscribed: true });
    }

    const body = await request.json();
    const email = body.email?.toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: "Email requerido." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { email },
        data: { newsletterOptIn: true },
      });
    }

    return NextResponse.json({ subscribed: true });
  } catch (error) {
    console.error("Newsletter error:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { newsletterOptIn: false },
    });

    return NextResponse.json({ subscribed: false });
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ subscribed: false });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { newsletterOptIn: true },
    });

    return NextResponse.json({ subscribed: user?.newsletterOptIn ?? false });
  } catch {
    return NextResponse.json({ subscribed: false });
  }
}
