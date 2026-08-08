import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { CategoryBenefit } from "@/lib/customer-category-discount";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ benefits: [] as CategoryBenefit[] });
    }

    const rows = await prisma.userCustomerCategory.findMany({
      where: {
        userId: session.user.id,
        customerCategory: { isActive: true },
      },
      select: {
        customerCategory: {
          select: {
            name: true,
            benefitType: true,
            benefitValue: true,
            minAmount: true,
            minQuantity: true,
          },
        },
      },
    });

    const benefits: CategoryBenefit[] = rows.map((r) => ({
      name: r.customerCategory.name,
      benefitType: r.customerCategory.benefitType,
      benefitValue: Number(r.customerCategory.benefitValue),
      minAmount:
        r.customerCategory.minAmount != null
          ? Number(r.customerCategory.minAmount)
          : null,
      minQuantity: r.customerCategory.minQuantity ?? null,
    }));

    return NextResponse.json({ benefits });
  } catch (error) {
    console.error("User discount GET:", error);
    return NextResponse.json({ benefits: [] as CategoryBenefit[] });
  }
}
