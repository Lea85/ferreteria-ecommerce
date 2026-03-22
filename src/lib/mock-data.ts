/** Misma forma que `ProductCardProduct` (evita importar un client component desde datos mock). */
export type MockProductCard = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  image: string;
  price: number;
  comparePrice?: number;
  stock: number;
};

export type MockCategory = {
  id: string;
  name: string;
  slug: string;
  image: string;
};

export type MockCategoryTree = {
  id: string;
  name: string;
  slug: string;
  count?: number;
  children?: MockCategoryTree[];
};

export type MockBrand = {
  id: string;
  name: string;
  slug: string;
  logo: string;
};

export const MOCK_PRODUCTS: MockProductCard[] = [
  {
    id: "1",
    name: "Inodoro corto Ferrum Bari blanco con depósito dual",
    slug: "inodoro-corto-ferrum-bari",
    brand: "Ferrum",
    category: "sanitarios",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80",
    price: 189_900,
    comparePrice: 229_900,
    stock: 14,
  },
  {
    id: "2",
    name: "Grifería monocomando mesada Peirano Nube cromo",
    slug: "griferia-peirano-nube",
    brand: "Peirano",
    category: "griferias",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80",
    price: 67_500,
    stock: 32,
  },
  {
    id: "3",
    name: "Llave stillson 14'' profesional",
    slug: "llave-stillson-14",
    brand: "Crossmaster",
    category: "herramientas",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80",
    price: 42_800,
    comparePrice: 51_200,
    stock: 0,
  },
  {
    id: "4",
    name: "Caño termofusión 20mm x 4m (rollo)",
    slug: "cano-termofusion-20mm",
    brand: "Tigre",
    category: "plomeria",
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80",
    price: 12_400,
    stock: 120,
  },
  {
    id: "5",
    name: "Bomba periférica ½ HP elevadora",
    slug: "bomba-periferica-media-hp",
    brand: "Gamma",
    category: "electricidad",
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&q=80",
    price: 156_000,
    stock: 8,
  },
  {
    id: "6",
    name: "Kit instalación inodoro flexible y válvula",
    slug: "kit-instalacion-inodoro",
    brand: "FV",
    category: "plomeria",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    price: 18_900,
    stock: 45,
  },
  {
    id: "7",
    name: "Pileta cocina bacha simple acero inoxidable",
    slug: "pileta-cocina-inox",
    brand: "Johnson Acero",
    category: "griferias",
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&q=80",
    price: 94_500,
    comparePrice: 108_000,
    stock: 11,
  },
  {
    id: "8",
    name: "Cinta métrica 8m magnética con freno",
    slug: "cinta-metrica-8m",
    brand: "Bremen",
    category: "herramientas",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80",
    price: 9_200,
    stock: 88,
  },
  {
    id: "9",
    name: "Llave cruz para radiador 4 vías",
    slug: "llave-cruz-radiador",
    brand: "Bahco",
    category: "herramientas",
    image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600&q=80",
    price: 21_300,
    stock: 26,
  },
  {
    id: "10",
    name: "Látex interior blanco 20 L",
    slug: "latex-interior-20l",
    brand: "Plavicon",
    category: "pintureria",
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&q=80",
    price: 73_000,
    stock: 19,
  },
  {
    id: "11",
    name: "Termotanque eléctrico 80 L colgar",
    slug: "termotanque-80l",
    brand: "Señorial",
    category: "electricidad",
    image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80",
    price: 412_000,
    comparePrice: 459_000,
    stock: 4,
  },
  {
    id: "12",
    name: "Manguera reforzada ½'' 15 m con accesorios",
    slug: "manguera-reforzada-15m",
    brand: "Aquaflex",
    category: "jardin",
    image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600&q=80",
    price: 28_750,
    stock: 37,
  },
];

export const MOCK_FEATURED = MOCK_PRODUCTS.slice(0, 8);

export const MOCK_BRAND_NAMES = Array.from(
  new Set(MOCK_PRODUCTS.map((p) => p.brand)),
).sort();

export const MOCK_SEARCH_SUGGESTIONS = [
  "grifería cocina",
  "inodoro corto",
  "termofusión",
  "llave stillson",
  "manguera jardín",
  "pintura látex",
];

export const MOCK_CATEGORIES_GRID: MockCategory[] = [
  {
    id: "c1",
    name: "Sanitarios",
    slug: "sanitarios",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80",
  },
  {
    id: "c2",
    name: "Griferías",
    slug: "griferias",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80",
  },
  {
    id: "c3",
    name: "Herramientas",
    slug: "herramientas",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80",
  },
  {
    id: "c4",
    name: "Plomería",
    slug: "plomeria",
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&q=80",
  },
  {
    id: "c5",
    name: "Electricidad",
    slug: "electricidad",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80",
  },
  {
    id: "c6",
    name: "Pinturería",
    slug: "pintureria",
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80",
  },
  {
    id: "c7",
    name: "Construcción",
    slug: "construccion",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&q=80",
  },
  {
    id: "c8",
    name: "Jardín",
    slug: "jardin",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80",
  },
];

export const MOCK_CATEGORY_TREE: MockCategoryTree[] = [
  {
    id: "t1",
    name: "Sanitarios y baño",
    slug: "sanitarios",
    count: 128,
    children: [
      { id: "t1a", name: "Inodoros", slug: "inodoros", count: 42 },
      { id: "t1b", name: "Bidets", slug: "bidets", count: 18 },
      { id: "t1c", name: "Mochilas y depósitos", slug: "mochilas", count: 31 },
    ],
  },
  {
    id: "t2",
    name: "Griferías",
    slug: "griferias",
    count: 96,
    children: [
      { id: "t2a", name: "Cocina", slug: "griferia-cocina", count: 40 },
      { id: "t2b", name: "Baño", slug: "griferia-bano", count: 56 },
    ],
  },
  {
    id: "t3",
    name: "Plomería",
    slug: "plomeria",
    count: 210,
    children: [
      { id: "t3a", name: "Caños y conexiones", slug: "canos", count: 120 },
      { id: "t3b", name: "Válvulas", slug: "valvulas", count: 45 },
    ],
  },
  {
    id: "t4",
    name: "Herramientas",
    slug: "herramientas",
    count: 340,
  },
  {
    id: "t5",
    name: "Electricidad",
    slug: "electricidad",
    count: 187,
  },
];

export const MOCK_BRANDS: MockBrand[] = [
  {
    id: "b1",
    name: "Ferrum",
    slug: "ferrum",
    logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&q=80",
  },
  {
    id: "b2",
    name: "FV",
    slug: "fv",
    logo: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&q=80",
  },
  {
    id: "b3",
    name: "Peirano",
    slug: "peirano",
    logo: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=200&q=80",
  },
  {
    id: "b4",
    name: "Tigre",
    slug: "tigre",
    logo: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&q=80",
  },
  {
    id: "b5",
    name: "Crossmaster",
    slug: "crossmaster",
    logo: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&q=80",
  },
  {
    id: "b6",
    name: "Gamma",
    slug: "gamma",
    logo: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200&q=80",
  },
];

export type MockProductDetail = MockProductCard & {
  description: string;
  specs: { label: string; value: string }[];
  rating: number;
  reviewCount: number;
  images: string[];
  variants: {
    id: string;
    sku: string;
    color?: string;
    size?: string;
    price: number;
    comparePrice?: number;
    stock: number;
  }[];
  complementary: MockProductCard[];
};

export function getMockProductBySlug(slug: string): MockProductDetail | null {
  const base = MOCK_PRODUCTS.find((p) => p.slug === slug);
  if (!base) return null;
  return {
    ...base,
    description:
      "Producto de ferretería y sanitarios con garantía oficial. Ideal para obra y hogar. Consultá disponibilidad de stock en sucursal.",
    specs: [
      { label: "Marca", value: base.brand },
      { label: "Origen", value: "Argentina / Importado" },
      { label: "Garantía", value: "12 meses" },
      { label: "SKU", value: `FS-${base.id.padStart(5, "0")}` },
    ],
    rating: 4.6,
    reviewCount: 128,
    images: [
      base.image,
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80",
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=80",
    ],
    variants: [
      {
        id: `${base.id}-v1`,
        sku: `${base.id}-BL-STD`,
        color: "Blanco",
        size: "Estándar",
        price: base.price,
        comparePrice: base.comparePrice,
        stock: base.stock,
      },
      {
        id: `${base.id}-v2`,
        sku: `${base.id}-CR-STD`,
        color: "Cromo",
        size: "Estándar",
        price: Math.round(base.price * 1.08),
        stock: Math.max(0, base.stock - 3),
      },
    ],
    complementary: MOCK_PRODUCTS.filter((p) => p.id !== base.id).slice(0, 4),
  };
}
