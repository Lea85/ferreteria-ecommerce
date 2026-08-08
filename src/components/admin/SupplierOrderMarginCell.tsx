import { computeMarginPercent } from "@/lib/supplier-order-pricing";

export function SupplierOrderMarginCell({
  costPrice,
  salePrice,
}: {
  costPrice: number;
  salePrice: number;
}) {
  const margin = computeMarginPercent(costPrice, salePrice);
  if (margin == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span
      className={
        margin >= 0
          ? "font-medium text-emerald-700"
          : "font-medium text-red-600"
      }
    >
      {margin.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%
    </span>
  );
}
