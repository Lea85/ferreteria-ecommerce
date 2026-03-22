import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, lastName, email, password, phone, customerType, cuit, company, newsletterOptIn } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña son obligatorios." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const isPro = customerType === "TRADE" || customerType === "WHOLESALE";

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        lastName: lastName?.trim() || null,
        email: email.toLowerCase().trim(),
        passwordHash,
        phone: phone?.trim() || null,
        customerType: isPro ? "TRADE" : "CONSUMER",
        role: "CUSTOMER",
        isApproved: !isPro,
        taxIdType: isPro && cuit ? "CUIT" : null,
        taxId: isPro ? cuit?.trim() || null : null,
        companyName: isPro ? company?.trim() || null : null,
        newsletterOptIn: newsletterOptIn === true,
      },
    });

    return NextResponse.json(
      {
        message: isPro
          ? "Cuenta creada. Tu cuenta profesional será revisada por nuestro equipo."
          : "Cuenta creada exitosamente.",
        userId: user.id,
        requiresApproval: isPro,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
