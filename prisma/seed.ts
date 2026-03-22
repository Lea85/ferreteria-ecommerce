import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@ferresanit.com" },
    update: {},
    create: {
      email: "admin@ferresanit.com",
      name: "Admin",
      lastName: "FerreSanit",
      passwordHash: adminPassword,
      role: "ADMIN",
      customerType: "CONSUMER",
      isApproved: true,
    },
  });
  console.log(`  Admin: ${admin.email}`);

  // Consumer user
  const userPassword = await bcrypt.hash("user123", 10);
  const consumer = await prisma.user.upsert({
    where: { email: "juan@example.com" },
    update: {},
    create: {
      email: "juan@example.com",
      name: "Juan",
      lastName: "Pérez",
      passwordHash: userPassword,
      role: "CUSTOMER",
      customerType: "CONSUMER",
      taxIdType: "DNI",
      taxId: "33456789",
      isApproved: true,
    },
  });

  // Trade user
  const tradeUser = await prisma.user.upsert({
    where: { email: "carlos.plomero@example.com" },
    update: {},
    create: {
      email: "carlos.plomero@example.com",
      name: "Carlos",
      lastName: "Rodríguez",
      passwordHash: userPassword,
      role: "CUSTOMER",
      customerType: "TRADE",
      taxIdType: "CUIT",
      taxId: "20-33456789-1",
      companyName: "Instalaciones CR",
      isApproved: true,
    },
  });

  // Wholesale user
  const wholesaleUser = await prisma.user.upsert({
    where: { email: "constructora@example.com" },
    update: {},
    create: {
      email: "constructora@example.com",
      name: "María",
      lastName: "González",
      passwordHash: userPassword,
      role: "CUSTOMER",
      customerType: "WHOLESALE",
      taxIdType: "CUIT",
      taxId: "30-71234567-8",
      companyName: "Constructora González SRL",
      isApproved: true,
    },
  });

  console.log(`  Users created: ${consumer.email}, ${tradeUser.email}, ${wholesaleUser.email}`);

  // Brands
  const brands = await Promise.all([
    prisma.brand.upsert({ where: { slug: "fv" }, update: {}, create: { name: "FV", slug: "fv" } }),
    prisma.brand.upsert({ where: { slug: "ferrum" }, update: {}, create: { name: "Ferrum", slug: "ferrum" } }),
    prisma.brand.upsert({ where: { slug: "schneider" }, update: {}, create: { name: "Schneider", slug: "schneider" } }),
    prisma.brand.upsert({ where: { slug: "tigre" }, update: {}, create: { name: "Tigre", slug: "tigre" } }),
    prisma.brand.upsert({ where: { slug: "acqua-system" }, update: {}, create: { name: "Acqua System", slug: "acqua-system" } }),
    prisma.brand.upsert({ where: { slug: "tramontina" }, update: {}, create: { name: "Tramontina", slug: "tramontina" } }),
    prisma.brand.upsert({ where: { slug: "stanley" }, update: {}, create: { name: "Stanley", slug: "stanley" } }),
    prisma.brand.upsert({ where: { slug: "alba" }, update: {}, create: { name: "Alba", slug: "alba" } }),
  ]);
  console.log(`  ${brands.length} brands created`);

  // Categories
  const sanitarios = await prisma.category.upsert({
    where: { slug: "sanitarios" },
    update: {},
    create: { name: "Sanitarios y Baño", slug: "sanitarios", position: 1 },
  });
  const griferias = await prisma.category.upsert({
    where: { slug: "griferias" },
    update: {},
    create: { name: "Griferías", slug: "griferias", parentId: sanitarios.id, position: 1 },
  });
  const inodoros = await prisma.category.upsert({
    where: { slug: "inodoros" },
    update: {},
    create: { name: "Inodoros y Depósitos", slug: "inodoros", parentId: sanitarios.id, position: 2 },
  });
  const vanitorys = await prisma.category.upsert({
    where: { slug: "vanitorys" },
    update: {},
    create: { name: "Vanitorys", slug: "vanitorys", parentId: sanitarios.id, position: 3 },
  });

  const herramientas = await prisma.category.upsert({
    where: { slug: "herramientas" },
    update: {},
    create: { name: "Herramientas", slug: "herramientas", position: 2 },
  });
  const manuales = await prisma.category.upsert({
    where: { slug: "herramientas-manuales" },
    update: {},
    create: { name: "Manuales", slug: "herramientas-manuales", parentId: herramientas.id, position: 1 },
  });

  const plomeria = await prisma.category.upsert({
    where: { slug: "plomeria" },
    update: {},
    create: { name: "Plomería", slug: "plomeria", position: 3 },
  });
  const canosPvc = await prisma.category.upsert({
    where: { slug: "canos-pvc" },
    update: {},
    create: { name: "Caños PVC", slug: "canos-pvc", parentId: plomeria.id, position: 1 },
  });

  const pintureria = await prisma.category.upsert({
    where: { slug: "pintureria" },
    update: {},
    create: { name: "Pinturería", slug: "pintureria", position: 4 },
  });

  console.log("  Categories created");

  // Products
  const [fv, ferrum, schneider, tigre, acqua, tramontina, stanley, alba] = brands;

  const product1 = await prisma.product.create({
    data: {
      name: "Grifería FV Puelo Monocomando para Baño",
      slug: "griferia-fv-puelo-monocomando-bano",
      description: "Grifería monocomando para baño FV línea Puelo. Terminación cromada. Incluye flexibles de conexión. Ideal para baños modernos.",
      shortDesc: "Monocomando para baño línea Puelo, terminación cromada",
      brandId: fv.id,
      isFeatured: true,
      metaTitle: "Grifería FV Puelo Monocomando Baño | FerreSanit",
      metaDesc: "Grifería FV Puelo monocomando para baño con terminación cromada. Comprá online con envío a todo el país.",
      categories: { create: [{ categoryId: griferias.id }] },
      variants: {
        create: [
          { sku: "FV-PUELO-CR", name: "Cromo", price: 185000, comparePrice: 210000, stock: 25, weight: 1.2 },
          { sku: "FV-PUELO-NC", name: "Negro Cromo", price: 205000, stock: 12, weight: 1.2 },
        ],
      },
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1585128903994-9788298932a4?w=600", altText: "Grifería FV Puelo Cromo", position: 0, isPrimary: true },
        ],
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: "Inodoro Ferrum Bari Largo",
      slug: "inodoro-ferrum-bari-largo",
      description: "Inodoro de loza vitrificada Ferrum línea Bari, versión largo. Incluye herrajes y tapa. Salida horizontal o vertical según modelo.",
      brandId: ferrum.id,
      isFeatured: true,
      categories: { create: [{ categoryId: inodoros.id }] },
      variants: {
        create: [
          { sku: "FERR-BARI-BL", name: "Blanco", price: 245000, stock: 18, weight: 28 },
        ],
      },
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600", altText: "Inodoro Ferrum Bari", position: 0, isPrimary: true },
        ],
      },
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: "Vanitory Schneider Aqua 80cm con Mesada",
      slug: "vanitory-schneider-aqua-80cm",
      description: "Vanitory completo Schneider línea Aqua de 80cm. Incluye mesada de mármol sintético, mueble colgante con cajones y espejo con luz LED.",
      brandId: schneider.id,
      isFeatured: true,
      categories: { create: [{ categoryId: vanitorys.id }] },
      variants: {
        create: [
          { sku: "SCH-AQUA80-BL", name: "Blanco", price: 320000, comparePrice: 385000, stock: 8, weight: 22 },
          { sku: "SCH-AQUA80-NG", name: "Negro", price: 345000, stock: 5, weight: 22 },
        ],
      },
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600", altText: "Vanitory Schneider Aqua 80cm", position: 0, isPrimary: true },
        ],
      },
    },
  });

  const product4 = await prisma.product.create({
    data: {
      name: "Caño PVC Tigre 110mm x 4m",
      slug: "cano-pvc-tigre-110mm-4m",
      description: "Caño de PVC para desagüe cloacal Tigre de 110mm de diámetro x 4 metros de largo. Pared 3.2mm. Norma IRAM.",
      brandId: tigre.id,
      categories: { create: [{ categoryId: canosPvc.id }] },
      variants: {
        create: [
          { sku: "TIG-PVC110-4M", price: 12500, stock: 200, weight: 3.8 },
        ],
      },
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600", altText: "Caño PVC 110mm", position: 0, isPrimary: true },
        ],
      },
    },
  });

  const product5 = await prisma.product.create({
    data: {
      name: "Set de Destornilladores Stanley 10 piezas",
      slug: "set-destornilladores-stanley-10pz",
      description: "Set de 10 destornilladores Stanley con puntas Phillips y planas. Mango ergonómico bimaterial antideslizante. Acero al cromo vanadio.",
      brandId: stanley.id,
      isFeatured: true,
      categories: { create: [{ categoryId: manuales.id }] },
      variants: {
        create: [
          { sku: "STAN-DEST-10PZ", price: 32000, comparePrice: 38000, stock: 45, weight: 0.8 },
        ],
      },
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1530124566582-a45a7c78d554?w=600", altText: "Set Destornilladores Stanley", position: 0, isPrimary: true },
        ],
      },
    },
  });

  const product6 = await prisma.product.create({
    data: {
      name: "Pintura Látex Interior Alba Mate 20L",
      slug: "pintura-latex-alba-mate-20l",
      description: "Pintura látex interior Alba acabado mate. Rendimiento: 10-12 m²/litro por mano. Secado al tacto: 1 hora. Color blanco.",
      brandId: alba.id,
      categories: { create: [{ categoryId: pintureria.id }] },
      variants: {
        create: [
          { sku: "ALBA-LAT-20L-BL", name: "Blanco", price: 85000, stock: 30, weight: 28 },
        ],
      },
      images: {
        create: [
          { url: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600", altText: "Pintura Alba Látex 20L", position: 0, isPrimary: true },
        ],
      },
    },
  });

  console.log("  6 products created with variants");

  // Price Rules
  const tradeRule = await prisma.priceRule.create({
    data: {
      name: "Descuento Gremios 15%",
      description: "Descuento automático del 15% para clientes tipo Gremio/Instalador",
      type: "ROLE",
      scope: "ALL_PRODUCTS",
      customerType: "TRADE",
      discountType: "PERCENTAGE",
      discountValue: 15,
      priority: 10,
      isActive: true,
    },
  });

  const wholesaleRule = await prisma.priceRule.create({
    data: {
      name: "Descuento Mayorista 25%",
      description: "Descuento automático del 25% para clientes Mayoristas",
      type: "ROLE",
      scope: "ALL_PRODUCTS",
      customerType: "WHOLESALE",
      discountType: "PERCENTAGE",
      discountValue: 25,
      priority: 10,
      isActive: true,
    },
  });

  const volumeRule = await prisma.priceRule.create({
    data: {
      name: "Volumen +10 unidades Plomería",
      description: "15% de descuento en compras de 10 o más unidades en productos de Plomería",
      type: "VOLUME",
      scope: "SPECIFIC_CATEGORIES",
      minQuantity: 10,
      discountType: "PERCENTAGE",
      discountValue: 15,
      priority: 5,
      isActive: true,
      categories: { create: [{ categoryId: plomeria.id }, { categoryId: canosPvc.id }] },
    },
  });

  console.log("  3 price rules created");

  // Coupons
  const coupon = await prisma.coupon.create({
    data: {
      code: "BIENVENIDO10",
      description: "10% de descuento en tu primera compra",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minPurchase: 50000,
      maxUses: 100,
      isActive: true,
      expiresAt: new Date("2026-12-31"),
    },
  });

  const coupon2 = await prisma.coupon.create({
    data: {
      code: "OBRA2026",
      description: "5% adicional para obras",
      discountType: "PERCENTAGE",
      discountValue: 5,
      minPurchase: 500000,
      maxUses: 50,
      isActive: true,
      expiresAt: new Date("2026-12-31"),
      appliesToCustomerType: "WHOLESALE",
    },
  });

  console.log("  2 coupons created");

  // Shipping zones
  const caba = await prisma.shippingZone.create({
    data: {
      name: "CABA",
      postalCodes: {
        create: Array.from({ length: 100 }, (_, i) => ({
          postalCode: String(1000 + i),
        })),
      },
      rates: {
        create: [
          { minWeight: 0, maxWeight: 5, price: 5500, estimatedDays: "1-2 días hábiles" },
          { minWeight: 5, maxWeight: 20, price: 8500, estimatedDays: "1-2 días hábiles" },
          { minWeight: 20, maxWeight: 50, price: 15000, estimatedDays: "2-3 días hábiles" },
        ],
      },
    },
  });

  console.log("  Shipping zone CABA created");

  // Settings
  await prisma.setting.upsert({
    where: { key: "store_name" },
    update: {},
    create: { key: "store_name", value: "FerreSanit" },
  });
  await prisma.setting.upsert({
    where: { key: "store_address" },
    update: {},
    create: { key: "store_address", value: "Av. Corrientes 1234, CABA, Buenos Aires" },
  });
  await prisma.setting.upsert({
    where: { key: "store_phone" },
    update: {},
    create: { key: "store_phone", value: "+54 11 4567-8900" },
  });
  await prisma.setting.upsert({
    where: { key: "iva_rate" },
    update: {},
    create: { key: "iva_rate", value: "0.21" },
  });

  console.log("  Settings created");
  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
