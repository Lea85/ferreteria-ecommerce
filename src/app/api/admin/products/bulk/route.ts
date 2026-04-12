import { NextResponse } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = await request.json();
    const { action, products } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "No se recibieron productos." }, { status: 400 });
    }

    const results = { created: 0, updated: 0, errors: [] as string[] };

    if (action === "import") {
      for (const p of products) {
        try {
          if (!p.name || !p.sku) {
            results.errors.push(`Fila sin nombre o SKU: ${JSON.stringify(p).slice(0, 100)}`);
            continue;
          }

          const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

          let brandId: string | null = null;
          if (p.brand) {
            const brandSlug = p.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const brand = await prisma.brand.upsert({
              where: { slug: brandSlug },
              update: {},
              create: { name: p.brand, slug: brandSlug },
            });
            brandId = brand.id;
          }

          const existing = await prisma.product.findFirst({
            where: { variants: { some: { sku: p.sku } } },
            include: { variants: true },
          });

          if (existing) {
            results.errors.push(`SKU ${p.sku} ya existe (${existing.name})`);
            continue;
          }

          await prisma.product.create({
            data: {
              name: p.name,
              slug,
              description: p.description || "",
              shortDesc: p.shortDesc || "",
              brandId,
              metaTitle: `${p.name} | FerroSan`,
              metaDesc: p.shortDesc || p.name,
              variants: {
                create: [{
                  sku: p.sku,
                  ean: p.ean ? String(p.ean) : null,
                  price: Number(p.price) || 0,
                  comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
                  stock: Number(p.stock) || 0,
                  weight: p.weight ? Number(p.weight) : null,
                }],
              },
            },
          });
          results.created++;
        } catch (err: any) {
          results.errors.push(`Error en SKU ${p.sku}: ${err.message?.slice(0, 100)}`);
        }
      }
    } else if (action === "update") {
      for (const p of products) {
        try {
          if (!p.sku) {
            results.errors.push("Fila sin SKU, no se puede actualizar");
            continue;
          }

          const variant = await prisma.productVariant.findUnique({ where: { sku: p.sku } });
          if (!variant) {
            results.errors.push(`SKU ${p.sku} no encontrado`);
            continue;
          }

          const variantData: Record<string, any> = {};
          if (p.price !== undefined && p.price !== "") variantData.price = Number(p.price);
          if (p.comparePrice !== undefined && p.comparePrice !== "") variantData.comparePrice = Number(p.comparePrice);
          if (p.stock !== undefined && p.stock !== "") variantData.stock = Number(p.stock);
          if (p.ean !== undefined && p.ean !== "") variantData.ean = String(p.ean);

          if (Object.keys(variantData).length > 0) {
            await prisma.productVariant.update({ where: { sku: p.sku }, data: variantData });
          }

          const productData: Record<string, any> = {};
          if (p.name) productData.name = p.name;
          if (p.description) productData.description = p.description;
          if (p.shortDesc) productData.shortDesc = p.shortDesc;

          if (Object.keys(productData).length > 0) {
            await prisma.product.update({ where: { id: variant.productId }, data: productData });
          }

          results.updated++;
        } catch (err: any) {
          results.errors.push(`Error en SKU ${p.sku}: ${err.message?.slice(0, 100)}`);
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Bulk products error:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
