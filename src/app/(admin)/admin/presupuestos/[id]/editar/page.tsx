"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { QuoteEditor, type QuoteEditorItem } from "@/components/admin/QuoteEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  EXPIRED: "Vencido",
  SOLD: "Vendido",
  CANCELLED: "Cancelado",
};

export default function EditarPresupuestoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quoteMeta, setQuoteMeta] = useState<{
    quoteNumber: string;
    status: string;
    customerName: string;
    total: number;
    subtotal: number;
  } | null>(null);
  const [items, setItems] = useState<QuoteEditorItem[]>([]);

  useEffect(() => {
    fetch(`/api/admin/quotes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const quote = data.quote;
        if (!quote) {
          toast.error("Presupuesto no encontrado");
          router.push("/admin/presupuestos");
          return;
        }
        if (quote.status !== "ACTIVE") {
          toast.error("Solo se pueden editar presupuestos activos");
          router.push(`/admin/presupuestos/${id}`);
          return;
        }
        setQuoteMeta({
          quoteNumber: quote.quoteNumber,
          status: quote.status,
          customerName: [quote.user.name, quote.user.lastName]
            .filter(Boolean)
            .join(" "),
          total: Number(quote.total),
          subtotal: Number(quote.subtotal),
        });
        setItems(
          quote.items.map(
            (item: {
              variantId: string;
              productName: string;
              variantName?: string | null;
              sku: string;
              quantity: number;
              unitPrice: unknown;
              variant?: { stock?: number };
            }) => ({
              variantId: item.variantId,
              productName: item.productName,
              variantName: item.variantName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
              currentStock: item.variant?.stock,
            }),
          ),
        );
      })
      .catch(() => {
        toast.error("Error al cargar presupuesto");
        router.push("/admin/presupuestos");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSave() {
    if (items.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al guardar");
        return;
      }
      toast.success("Presupuesto actualizado");
      router.push(`/admin/presupuestos/${id}`);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quoteMeta) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/presupuestos/${id}`}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            Editar presupuesto {quoteMeta.quoteNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            Cliente: {quoteMeta.customerName}
          </p>
        </div>
        <Badge>{STATUS_LABELS[quoteMeta.status] || quoteMeta.status}</Badge>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Productos del presupuesto</CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteEditor
            items={items}
            onItemsChange={setItems}
            onSave={handleSave}
            saving={saving}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Total actual guardado: {formatPrice(quoteMeta.total)} (subtotal{" "}
        {formatPrice(quoteMeta.subtotal)}). Se actualizará al guardar según ítems
        y descuentos del cliente.
      </p>
    </div>
  );
}
