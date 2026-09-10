import { NextResponse } from "next/server";
import { z } from "zod";

import { CustomerType, Prisma } from "@/generated/prisma";
import { auth, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

const CUSTOMER_TYPES: CustomerType[] = ["CONSUMER", "TRADE", "WHOLESALE"];

function isCustomerType(v: string): v is CustomerType {
  return CUSTOMER_TYPES.includes(v as CustomerType);
}

const createSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio."),
    lastName: z.string().trim().min(1, "El apellido es obligatorio."),
    email: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine(
        (v) => !v || z.string().email().safeParse(v).success,
        "Correo electrónico inválido.",
      ),
    phone: z.string().trim().optional().or(z.literal("")),
    customerType: z.enum(["CONSUMER", "TRADE"]).default("CONSUMER"),
    cuit: z.string().trim().optional().or(z.literal("")),
    company: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.phone && data.phone.length > 0 && data.phone.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El teléfono no es válido.",
        path: ["phone"],
      });
    }
    if (data.customerType === "TRADE") {
      const cuitDigits = (data.cuit ?? "").replace(/\D/g, "");
      if (cuitDigits.length !== 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El CUIT es obligatorio y debe tener 11 dígitos.",
          path: ["cuit"],
        });
      }
      if (!data.company || data.company.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La razón social es obligatoria para cuentas profesionales.",
          path: ["company"],
        });
      }
    }
  });

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !isAdminRole((session.user as { role?: string }).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const typeParam = searchParams.get("type")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20),
    );

    const where: Prisma.OperationalCustomerWhereInput = { isActive: true };

    if (search) {
      const digits = search.replace(/\D/g, "");
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { taxId: { contains: search, mode: "insensitive" } },
        ...(digits.length >= 2 && digits !== search
          ? [{ taxId: { contains: digits, mode: "insensitive" as const } }]
          : []),
      ];
    }

    if (typeParam && isCustomerType(typeParam)) {
      where.customerType = typeParam;
    }

    const [total, customers] = await Promise.all([
      prisma.operationalCustomer.count({ where }),
      prisma.operationalCustomer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      customers,
      total,
      page,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Operational customers GET:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !isAdminRole((session.user as { role?: string }).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }

    const { name, lastName, email, phone, customerType, cuit, company } =
      parsed.data;
    const isPro = customerType === "TRADE";
    const cuitDigits = cuit?.replace(/\D/g, "") ?? null;

    const customer = await prisma.operationalCustomer.create({
      data: {
        name,
        lastName,
        email: email?.trim() ? email.toLowerCase().trim() : null,
        phone: phone?.trim() || null,
        customerType: isPro ? "TRADE" : "CONSUMER",
        taxIdType: isPro && cuitDigits ? "CUIT" : null,
        taxId: isPro ? cuitDigits : null,
        companyName: isPro ? company?.trim() || null : null,
      },
    });

    return NextResponse.json(
      { message: "Cliente operativo creado.", customer },
      { status: 201 },
    );
  } catch (error) {
    console.error("Operational customers POST:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
