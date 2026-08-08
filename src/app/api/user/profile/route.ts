import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "@/lib/validators/auth.validator";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        lastName: true,
        email: true,
        phone: true,
        customerType: true,
        companyName: true,
        taxId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ profile: user });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Datos inválidos.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { name, lastName, phone } = parsed.data;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        lastName,
        phone: phone?.trim() || null,
      },
      select: {
        name: true,
        lastName: true,
        email: true,
        phone: true,
        customerType: true,
      },
    });

    return NextResponse.json({ profile: user });
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Datos inválidos.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "Tu cuenta usa inicio de sesión con Google. No podés cambiar la contraseña acá." },
        { status: 400 },
      );
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile password error:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
