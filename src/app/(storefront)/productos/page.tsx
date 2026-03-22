import { Suspense } from "react";

import { ProductosView } from "./productos-view";

export const metadata = {
  title: "Productos",
  description:
    "Explorá nuestro catálogo de productos de ferretería y sanitarios.",
};

export default function ProductosPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8">Cargando productos...</div>
      }
    >
      <ProductosView />
    </Suspense>
  );
}
