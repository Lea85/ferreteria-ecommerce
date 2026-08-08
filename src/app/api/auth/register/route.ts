import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { registerRequestSchema } from "@/lib/validators/auth.validator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerRequestSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Datos inválidos.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const {
      name,
      lastName,
      email,
      password,
      phone,
      customerType,
      cuit,
      company,
      newsletterOptIn,
    } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const isPro = customerType === "TRADE";
    const cuitDigits = cuit?.replace(/\D/g, "") ?? null;

    const user = await prisma.user.create({
      data: {
        name,
        lastName,
        email: normalizedEmail,
        passwordHash,
        phone: phone?.trim() || null,
        customerType: isPro ? "TRADE" : "CONSUMER",
        role: "CUSTOMER",
        isApproved: !isPro,
        taxIdType: isPro && cuitDigits ? "CUIT" : null,
        taxId: isPro ? cuitDigits : null,
        companyName: isPro ? company?.trim() || null : null,
        newsletterOptIn,
      },
    });

    return NextResponse.json(
      {
        message: isPro
          ? "Cuenta creada. Tu cuenta profesional será revisada por nuestro equipo."
          : "Cuenta creada exitosamente.",
        userId: user.id,
        email: normalizedEmail,
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
