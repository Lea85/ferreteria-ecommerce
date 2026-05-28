"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clampToStock } from "@/lib/cart-quantity";
import { cn } from "@/lib/utils";

type QuantityControlsProps = {
  value: number;
  maxStock: number;
  onChange: (quantity: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function QuantityControls({
  value,
  maxStock,
  onChange,
  disabled = false,
  size = "md",
  className,
}: QuantityControlsProps) {
  const out = maxStock <= 0;
  const btnClass = size === "sm" ? "size-8" : "size-9";
  const inputClass = size === "sm" ? "h-8 w-12" : "h-9 w-14";

  function apply(next: number) {
    onChange(clampToStock(next, maxStock));
  }

  return (
    <div className={cn("inline-flex items-center rounded-md border border-border", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(btnClass, "rounded-none")}
        disabled={disabled || out || value <= 1}
        onClick={() => apply(value - 1)}
      >
        <Minus className={size === "sm" ? "size-3.5" : "size-4"} />
      </Button>
      <Input
        type="number"
        min={1}
        max={Math.max(1, maxStock)}
        value={value}
        disabled={disabled || out}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          if (Number.isNaN(parsed)) return;
          apply(parsed);
        }}
        className={cn(
          inputClass,
          "rounded-none border-0 border-x border-border text-center text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0",
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(btnClass, "rounded-none")}
        disabled={disabled || out || value >= maxStock}
        onClick={() => apply(value + 1)}
      >
        <Plus className={size === "sm" ? "size-3.5" : "size-4"} />
      </Button>
    </div>
  );
}
