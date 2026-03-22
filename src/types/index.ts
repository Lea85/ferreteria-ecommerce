import type { ItemPriceResult } from "@/lib/services/pricing.service";
import type { OrderStatus } from "@/lib/constants";

export type ProductWithDetails = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDesc: string | null;
  brandId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle: string | null;
  metaDesc: string | null;
  createdAt: Date;
  updatedAt: Date;
  brand: { id: string; name: string; slug: string; logoUrl: string | null } | null;
  categories: Array<{
    category: { id: string; name: string; slug: string };
  }>;
  variants: Array<{
    id: string;
    sku: string;
    name: string | null;
    price: number;
    comparePrice: number | null;
    stock: number;
    isActive: boolean;
    weight: number | null;
  }>;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    position: number;
    isPrimary: boolean;
  }>;
};

export type VariantWithAttributes = {
  id: string;
  productId: string;
  sku: string;
  name: string | null;
  price: number;
  comparePrice: number | null;
  costPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  weight: number | null;
  barcode: string | null;
  isActive: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
  };
  attributes: Array<{
    attributeValue: {
      id: string;
      value: string;
      attribute: {
        id: string;
        name: string;
      };
    };
  }>;
};

export type OrderWithItems = {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  customerType: string;
  shippingMethod: string;
  paymentMethod: string;
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  taxTotal: number;
  total: number;
  couponCode: string | null;
  couponDiscount: number | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    lastName: string | null;
    email: string;
    phone: string | null;
  };
  items: Array<{
    id: string;
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    unitPrice: number;
    originalPrice: number;
    discount: number;
    total: number;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    changedBy: string | null;
    createdAt: Date;
  }>;
  coupon: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
  } | null;
};

export type CartItemWithVariant = {
  id: string;
  userId: string;
  variantId: string;
  quantity: number;
  variant: {
    id: string;
    sku: string;
    name: string | null;
    price: number;
    comparePrice: number | null;
    stock: number;
    product: {
      id: string;
      name: string;
      slug: string;
    };
  };
};

export type PriceCalculationResult = ItemPriceResult;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type ProductListFilters = {
  q?: string;
  categorySlug?: string;
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  inStock?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc";
};

export type AdminOrderFilters = {
  status?: OrderStatus;
  from?: Date;
  to?: Date;
  q?: string;
};
