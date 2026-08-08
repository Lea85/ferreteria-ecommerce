import { Prisma } from "@/generated/prisma";
import type { Prisma as PrismaTypes } from "@/generated/prisma";
import { prisma } from "@/lib/db";

/** Escapa comodines para LIKE/ILIKE en PostgreSQL. */
export function escapeLikePattern(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Quita espacios, guiones y puntos para comparar códigos (SKU / EAN). */
export function normalizeProductCode(term: string): string {
  return term.replace(/[\s\-_.]/g, "").toLowerCase();
}

/**
 * Normaliza texto de búsqueda / nombre: minúsculas, sin acentos,
 * símbolos de grado como espacio, puntuación como espacio.
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[°º˚]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Divide la consulta en palabras para búsqueda por términos contenidos. */
export function tokenizeSearchQuery(term: string): string[] {
  const normalized = normalizeSearchText(term);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter((token) => token.length > 0);
}

/** Campo SQL unificado (nombre, descripciones, marca, categoría, variante). */
function buildSearchableHaystackSql(): Prisma.Sql {
  return Prisma.sql`
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(
      COALESCE(p.name, '') || ' ' || COALESCE(p."shortDesc", '') || ' ' || COALESCE(p.description, '') || ' ' ||
      COALESCE(b.name, '') || ' ' || COALESCE(c.name, '') || ' ' || COALESCE(v.name, ''),
      '[°º˚]', ' ', 'gi'),
      '[^[:alnum:][:space:]]', ' ', 'g'),
      '\\s+', ' ', 'g'))
  `;
}

/** Todas las palabras deben aparecer en el texto normalizado del producto. */
function buildTokenAndMatchSql(tokens: string[]): Prisma.Sql | null {
  if (tokens.length === 0) return null;

  const haystack = buildSearchableHaystackSql();
  const compactHaystack = Prisma.sql`REGEXP_REPLACE(${haystack}, '\\s', '', 'g')`;

  const conditions = tokens.map((token) => {
    const pattern = `%${escapeLikePattern(token)}%`;
    const compactToken = token.replace(/\s/g, "");
    if (compactToken && compactToken !== token) {
      const compactPattern = `%${escapeLikePattern(compactToken)}%`;
      return Prisma.sql`(${haystack} LIKE ${pattern} OR ${compactHaystack} LIKE ${compactPattern})`;
    }
    return Prisma.sql`${haystack} LIKE ${pattern}`;
  });

  return Prisma.sql`(${Prisma.join(conditions, " AND ")})`;
}

/** Filtro Prisma (contains + insensitive) para búsqueda de productos. */
export function buildProductTextSearchFilter(
  term: string,
): PrismaTypes.ProductWhereInput {
  const q = term.trim();
  if (!q) return {};

  const tokens = tokenizeSearchQuery(q);
  const tokenAndName =
    tokens.length > 0
      ? ({
          AND: tokens.map((token) => ({
            name: { contains: token, mode: "insensitive" as const },
          })),
        } satisfies PrismaTypes.ProductWhereInput)
      : null;

  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { shortDesc: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { brand: { is: { name: { contains: q, mode: "insensitive" } } } },
      ...(tokenAndName ? [tokenAndName] : []),
      {
        variants: {
          some: {
            OR: [
              { sku: { contains: q, mode: "insensitive" } },
              { ean: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
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

type SearchOptions = {
  onlyActive?: boolean;
  /** En catálogo público: solo variantes activas con SKU/EAN visible. */
  onlyActiveVariants?: boolean;
};

/**
 * IDs de productos por SKU, EAN, código de barras o texto (nombre, marca, etc.).
 */
export async function findProductIdsByTextSearch(
  term: string,
  options?: SearchOptions,
): Promise<string[]> {
  const q = term.trim();
  if (!q) return [];

  const onlyActive = options?.onlyActive !== false;
  const onlyActiveVariants = options?.onlyActiveVariants ?? onlyActive;

  const productFilter: PrismaTypes.ProductWhereInput | undefined = onlyActive
    ? { isActive: true }
    : undefined;

  const variantCodeConditions: PrismaTypes.ProductVariantWhereInput[] = [
    { sku: { contains: q, mode: "insensitive" } },
    { sku: { equals: q, mode: "insensitive" } },
    { ean: { contains: q, mode: "insensitive" } },
    { ean: { equals: q, mode: "insensitive" } },
    { barcode: { contains: q, mode: "insensitive" } },
    { barcode: { equals: q, mode: "insensitive" } },
  ];

  const normalizedQ = normalizeProductCode(q);
  if (normalizedQ.length >= 2 && normalizedQ !== q.toLowerCase()) {
    variantCodeConditions.push(
      { sku: { contains: normalizedQ, mode: "insensitive" } },
      { ean: { contains: normalizedQ, mode: "insensitive" } },
      { barcode: { contains: normalizedQ, mode: "insensitive" } },
    );
  }

  const variantWhere: PrismaTypes.ProductVariantWhereInput = {
    OR: variantCodeConditions,
    ...(onlyActiveVariants ? { isActive: true } : {}),
    ...(productFilter ? { product: productFilter } : {}),
  };

  const variantsByCode = await prisma.productVariant.findMany({
    where: variantWhere,
    select: { productId: true },
    distinct: ["productId"],
  });

  const pattern = `%${escapeLikePattern(q)}%`;
  const normalizedPattern =
    normalizedQ.length >= 2
      ? `%${escapeLikePattern(normalizedQ)}%`
      : null;

  const tokens = tokenizeSearchQuery(q);
  const tokenMatchSql = buildTokenAndMatchSql(tokens);
  const normalizedPhrase = tokens.join(" ");
  const normalizedPhrasePattern = normalizedPhrase
    ? `%${escapeLikePattern(normalizedPhrase)}%`
    : null;
  const haystack = buildSearchableHaystackSql();

  const activeClause = onlyActive
    ? Prisma.sql`p."isActive" = true`
    : Prisma.sql`TRUE`;

  const variantActiveClause = onlyActiveVariants
    ? Prisma.sql`AND (v.id IS NULL OR v."isActive" = true)`
    : Prisma.sql``;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT p.id
    FROM products p
    LEFT JOIN brands b ON b.id = p."brandId"
    LEFT JOIN product_variants v ON v."productId" = p.id
    LEFT JOIN product_categories pc ON pc."productId" = p.id
    LEFT JOIN categories c ON c.id = pc."categoryId"
    WHERE ${activeClause}
      ${variantActiveClause}
      AND (
        p.name ILIKE ${pattern}
        OR COALESCE(p."shortDesc", '') ILIKE ${pattern}
        OR COALESCE(p.description, '') ILIKE ${pattern}
        OR COALESCE(p.slug, '') ILIKE ${pattern}
        OR COALESCE(b.name, '') ILIKE ${pattern}
        OR COALESCE(v.sku, '') ILIKE ${pattern}
        OR LOWER(TRIM(COALESCE(v.sku, ''))) = LOWER(TRIM(${q}))
        OR COALESCE(v.ean, '') ILIKE ${pattern}
        OR LOWER(TRIM(COALESCE(v.ean, ''))) = LOWER(TRIM(${q}))
        OR COALESCE(v.barcode, '') ILIKE ${pattern}
        OR LOWER(TRIM(COALESCE(v.barcode, ''))) = LOWER(TRIM(${q}))
        OR COALESCE(v.name, '') ILIKE ${pattern}
        OR COALESCE(c.name, '') ILIKE ${pattern}
        ${
          normalizedPhrasePattern
            ? Prisma.sql`OR ${haystack} LIKE ${normalizedPhrasePattern}`
            : Prisma.empty
        }
        ${tokenMatchSql ? Prisma.sql`OR ${tokenMatchSql}` : Prisma.empty}
        ${
          normalizedPattern
            ? Prisma.sql`
        OR REGEXP_REPLACE(COALESCE(v.sku, ''), '[\\s\\-_.]', '', 'g') ILIKE ${normalizedPattern}
        OR REGEXP_REPLACE(COALESCE(v.ean, ''), '[\\s\\-_.]', '', 'g') ILIKE ${normalizedPattern}
        OR REGEXP_REPLACE(COALESCE(v.barcode, ''), '[\\s\\-_.]', '', 'g') ILIKE ${normalizedPattern}
      `
            : Prisma.empty
        }
      )
  `;

  const ids = new Set<string>([
    ...variantsByCode.map((v) => v.productId),
    ...rows.map((r) => r.id),
  ]);

  return [...ids];
}
