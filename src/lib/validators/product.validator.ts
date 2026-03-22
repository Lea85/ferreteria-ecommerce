import { z } from "zod";

const decimalLike = z.union([
  z.string().regex(/^-?\d+(\.\d+)?$/),
  z.number(),
]);

export const productCreateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido.")
    .optional(),
  description: z.string().optional(),
  shortDesc: z.string().max(500).optional(),
  brandId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  metaTitle: z.string().max(70).optional(),
  metaDesc: z.string().max(160).optional(),
  categoryIds: z.array(z.string()).optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const variantCreateSchema = z.object({
  productId: z.string(),
  sku: z.string().min(1, "El SKU es obligatorio."),
  name: z.string().optional().nullable(),
  price: decimalLike,
  comparePrice: decimalLike.optional().nullable(),
  costPrice: decimalLike.optional().nullable(),
  stock: z.coerce.number().int().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  weight: decimalLike.optional().nullable(),
  barcode: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  attributeValueIds: z.array(z.string()).optional(),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  parentId: z.string().optional().nullable(),
  position: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
  metaTitle: z.string().optional().nullable(),
  metaDesc: z.string().optional().nullable(),
});

export const priceRuleCreateSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    type: z.enum(["ROLE", "VOLUME", "PROMO"]),
    scope: z.enum(["ALL_PRODUCTS", "SPECIFIC_PRODUCTS", "SPECIFIC_CATEGORIES", "SPECIFIC_BRANDS"]).default("ALL_PRODUCTS"),
    customerType: z.enum(["CONSUMER", "TRADE", "WHOLESALE"]).optional().nullable(),
    minQuantity: z.coerce.number().int().min(1).optional().nullable(),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: decimalLike,
    priority: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
    startsAt: z.coerce.date().optional().nullable(),
    endsAt: z.coerce.date().optional().nullable(),
    isStackable: z.boolean().optional(),
    productIds: z.array(z.string()).optional(),
    categoryIds: z.array(z.string()).optional(),
    brandIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      data.type !== "VOLUME" ||
      (data.minQuantity != null && data.minQuantity >= 1),
    {
      message:
        "La cantidad mínima es obligatoria para descuentos por volumen.",
      path: ["minQuantity"],
    },
  );

export const couponCreateSchema = z.object({
  code: z
    .string()
    .min(3, "El código debe tener al menos 3 caracteres.")
    .max(32)
    .transform((s) => s.trim().toUpperCase()),
  description: z.string().optional().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: decimalLike,
  minPurchase: decimalLike.optional().nullable(),
  maxUses: z.coerce.number().int().min(1).optional().nullable(),
  maxUsesPerUser: z.coerce.number().int().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
  startsAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  appliesToCustomerType: z.enum(["CONSUMER", "TRADE", "WHOLESALE"]).optional().nullable(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type VariantCreateInput = z.infer<typeof variantCreateSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type PriceRuleCreateInput = z.infer<typeof priceRuleCreateSchema>;
export type CouponCreateInput = z.infer<typeof couponCreateSchema>;
