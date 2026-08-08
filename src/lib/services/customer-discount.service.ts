import { prisma } from "@/lib/db";
import {
  computeBestCategoryDiscount,
  type AppliedDiscount,
  type CategoryBenefit,
} from "@/lib/customer-category-discount";

export async function getUserCategoryBenefits(
  userId: string,
): Promise<CategoryBenefit[]> {
  const rows = await prisma.userCustomerCategory.findMany({
    where: { userId, customerCategory: { isActive: true } },
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

  return rows.map((r) => ({
    name: r.customerCategory.name,
    benefitType: r.customerCategory.benefitType,
    benefitValue: Number(r.customerCategory.benefitValue),
    minAmount:
      r.customerCategory.minAmount != null
        ? Number(r.customerCategory.minAmount)
        : null,
    minQuantity: r.customerCategory.minQuantity ?? null,
  }));
}

/**
 * Calcula el mejor descuento por categoría para un usuario, dado el subtotal
 * y la cantidad total de unidades. Devuelve null si no aplica.
 */
export async function resolveUserCategoryDiscount(
  userId: string | null | undefined,
  subtotal: number,
  totalQuantity: number,
): Promise<AppliedDiscount | null> {
  if (!userId) return null;
  const benefits = await getUserCategoryBenefits(userId);
  if (benefits.length === 0) return null;
  return computeBestCategoryDiscount(benefits, subtotal, totalQuantity);
}
