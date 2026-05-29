import { Prisma } from "@/generated/prisma";
import type { Prisma as PrismaTypes } from "@/generated/prisma";
import { prisma } from "@/lib/db";

/** Escapa comodines para LIKE/ILIKE en PostgreSQL. */
export function escapeLikePattern(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Filtro Prisma (contains + insensitive) para búsqueda de productos. */
export function buildProductTextSearchFilter(
  term: string,
): PrismaTypes.ProductWhereInput {
  const q = term.trim();
  if (!q) return {};

  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { shortDesc: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { brand: { is: { name: { contains: q, mode: "insensitive" } } } },
      {
        variants: {
          some: {
            OR: [
              { sku: { contains: q, mode: "insensitive" } },
              { ean: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
      {
        categories: {
          some: {
            category: { name: { contains: q, mode: "insensitive" } },
          },
        },
      },
    ],
  };
}

/**
 * IDs de productos por texto (ILIKE en PostgreSQL, sin distinguir mayúsculas).
 */
export async function findProductIdsByTextSearch(
  term: string,
  options?: { onlyActive?: boolean },
): Promise<string[]> {
  const q = term.trim();
  if (!q) return [];

  const pattern = `%${escapeLikePattern(q)}%`;
  const onlyActive = options?.onlyActive !== false;

  const activeClause = onlyActive
    ? Prisma.sql`p."isActive" = true`
    : Prisma.sql`TRUE`;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT p.id
    FROM products p
    LEFT JOIN brands b ON b.id = p."brandId"
    LEFT JOIN product_variants v ON v."productId" = p.id
    LEFT JOIN product_categories pc ON pc."productId" = p.id
    LEFT JOIN categories c ON c.id = pc."categoryId"
    WHERE ${activeClause}
      AND (
        p.name ILIKE ${pattern}
        OR COALESCE(p."shortDesc", '') ILIKE ${pattern}
        OR COALESCE(p.description, '') ILIKE ${pattern}
        OR COALESCE(b.name, '') ILIKE ${pattern}
        OR COALESCE(v.sku, '') ILIKE ${pattern}
        OR COALESCE(v.ean, '') ILIKE ${pattern}
        OR COALESCE(v.name, '') ILIKE ${pattern}
        OR COALESCE(c.name, '') ILIKE ${pattern}
      )
  `;

  return rows.map((r) => r.id);
}
