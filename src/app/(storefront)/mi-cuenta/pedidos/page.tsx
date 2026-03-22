"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MOCK_ORDERS = [
  {
    id: "FER-2025-004521",
    date: "12 mar 2025",
    status: "En preparación",
    statusVariant: "secondary" as const,
    total: 94_500,
    items: ["Pileta cocina inox", "Kit instalación inodoro"],
  },
  {
    id: "FER-2025-004388",
    date: "28 feb 2025",
    status: "Despachado",
    statusVariant: "default" as const,
    total: 18_900,
    items: ["Kit instalación inodoro"],
  },
  {
    id: "FER-2025-004102",
    date: "05 feb 2025",
    status: "Entregado",
    statusVariant: "outline" as const,
    total: 412_000,
    items: ["Termotanque 80L"],
  },
];

export default function PedidosPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground">Mis pedidos</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Historial y estado de tus compras.
      </p>

      <div className="mt-6 space-y-4">
        {MOCK_ORDERS.map((order) => {
          const expanded = openId === order.id;
          return (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="text-base font-mono text-primary">
                    {order.id}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{order.date}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={order.statusVariant}>{order.status}</Badge>
                  <span className="text-lg font-bold text-foreground">
                    {formatPrice(order.total)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setOpenId(expanded ? null : order.id)
                    }
                  >
                    {expanded ? (
                      <>
                        Ocultar <ChevronUp className="ml-1 size-4" />
                      </>
                    ) : (
                      <>
                        Ver detalle <ChevronDown className="ml-1 size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <div
                className={cn(
                  "grid transition-all",
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <CardContent className="border-t border-border pt-4">
                    <p className="text-sm font-medium text-foreground">
                      Productos
                    </p>
                    <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                      {order.items.map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                    <Separator className="my-4" />
                    <p className="text-xs text-muted-foreground">
                      Seguimiento por email y WhatsApp. Ante dudas escribinos a
                      ventas@ferrosan.com.ar
                    </p>
                  </CardContent>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
