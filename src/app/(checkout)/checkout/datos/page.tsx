"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckoutOrderSummary } from "@/components/storefront/CheckoutOrderSummary";

export default function CheckoutDatosPage() {
  const [savedAddress, setSavedAddress] = useState(false);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold text-foreground">
          Datos de contacto y facturación
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Completá tus datos para coordinar el pedido.
        </p>

        <form
          className="mt-8 space-y-8"
          onSubmit={(e) => e.preventDefault()}
        >
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Datos personales
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input id="apellido" name="apellido" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" type="tel" required />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Facturación
            </h2>
            <div className="space-y-2">
              <Label htmlFor="doc">DNI / CUIT</Label>
              <Input id="doc" name="doc" required />
            </div>
            <div className="space-y-2">
              <Label>Condición fiscal</Label>
              <Select defaultValue="cf">
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cf">Consumidor final</SelectItem>
                  <SelectItem value="mo">Monotributo</SelectItem>
                  <SelectItem value="ri">Responsable inscripto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Dirección de envío
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSavedAddress((v) => !v)}
              >
                {savedAddress ? "Usar dirección nueva" : "Usar guardada"}
              </Button>
            </div>
            {savedAddress ? (
              <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
                <p className="font-medium">Av. Corrientes 1234, Piso 2 B</p>
                <p className="text-muted-foreground">CABA · CP 1043</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="calle">Calle y número</Label>
                  <Input id="calle" name="calle" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="piso">Piso / Depto</Label>
                  <Input id="piso" name="piso" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp">Código postal</Label>
                  <Input id="cp" name="cp" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="localidad">Localidad</Label>
                  <Input id="localidad" name="localidad" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provincia">Provincia</Label>
                  <Input id="provincia" name="provincia" required />
                </div>
              </div>
            )}
          </section>

          <Button
            asChild
            className="w-full bg-store-orange text-store-orange-foreground hover:bg-store-orange/90 sm:w-auto"
          >
            <Link href="/checkout/envio">Continuar</Link>
          </Button>
        </form>
      </div>
      <CheckoutOrderSummary />
    </div>
  );
}
