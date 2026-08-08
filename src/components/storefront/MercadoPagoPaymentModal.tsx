"use client";

import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MercadoPagoPaymentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicKey: string;
  preferenceId: string;
  amount: number;
  orderId: string;
  onSuccess: (orderId: string) => void;
};

export function MercadoPagoPaymentModal({
  open,
  onOpenChange,
  publicKey,
  preferenceId,
  amount,
  orderId,
  onSuccess,
}: MercadoPagoPaymentModalProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!publicKey) return;
    initMercadoPago(publicKey, { locale: "es-AR" });
    setReady(true);
  }, [publicKey]);

  useEffect(() => {
    if (!open) setReady(false);
    else if (publicKey) {
      initMercadoPago(publicKey, { locale: "es-AR" });
      setReady(true);
    }
  }, [open, publicKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagar con Mercado Pago</DialogTitle>
          <DialogDescription>
            Completa el pago de forma segura. Aceptamos tarjetas, debito y dinero en cuenta.
          </DialogDescription>
        </DialogHeader>

        {!ready || !preferenceId ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="min-h-[420px]">
            <Payment
              initialization={{
                amount,
                preferenceId,
              }}
              customization={{
                paymentMethods: {
                  creditCard: "all",
                  debitCard: "all",
                  mercadoPago: "all",
                },
              }}
              onSubmit={async ({ formData }) => {
                const res = await fetch("/api/checkout/mercadopago/process", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId, formData }),
                });
                const data = await res.json();

                if (!res.ok) {
                  toast.error(data.error || "No se pudo procesar el pago.");
                  throw new Error(data.error || "payment_failed");
                }

                if (data.status === "approved") {
                  toast.success("Pago aprobado.");
                  onSuccess(orderId);
                  return;
                }

                if (data.status === "pending" || data.status === "in_process") {
                  toast.info("Pago pendiente de confirmacion.");
                  onSuccess(orderId);
                  return;
                }

                toast.error("El pago no fue aprobado. Intenta con otro medio.");
                throw new Error("payment_rejected");
              }}
              onError={(error) => {
                console.error("Mercado Pago brick error:", error);
                toast.error("Error al cargar el formulario de pago.");
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
