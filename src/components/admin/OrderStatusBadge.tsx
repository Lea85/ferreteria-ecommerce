import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-900",
  PAYMENT_PENDING: "border-orange-200 bg-orange-50 text-orange-900",
  PAYMENT_APPROVED: "border-blue-200 bg-blue-50 text-blue-900",
  PREPARING: "border-indigo-200 bg-indigo-50 text-indigo-900",
  SHIPPED: "border-purple-200 bg-purple-50 text-purple-900",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-900",
  CANCELLED: "border-red-200 bg-red-50 text-red-900",
  REFUNDED: "border-slate-200 bg-slate-100 text-slate-700",
};

export type OrderStatusBadgeProps = {
  status: string;
  className?: string;
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const label = ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status;
  const style = statusStyles[status] ?? "border-border bg-muted text-muted-foreground";

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", style, className)}
    >
      {label}
    </Badge>
  );
}
