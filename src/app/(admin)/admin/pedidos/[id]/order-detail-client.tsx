"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as (keyof typeof ORDER_STATUS_LABELS)[];

export function OrderDetailClient({
  currentStatus,
}: {
  currentStatus: keyof typeof ORDER_STATUS_LABELS;
}) {
  const [status, setStatus] = useState(currentStatus);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="gap-2 border-border">
          Cambiar estado
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => {
              setStatus(s);
              toast.message("Estado actualizado (simulación)", {
                description: ORDER_STATUS_LABELS[s],
              });
            }}
          >
            {ORDER_STATUS_LABELS[s]}
            {s === status ? " · actual" : ""}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
