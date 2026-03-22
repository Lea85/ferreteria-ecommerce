"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckoutOrderSummary } from "@/components/storefront/CheckoutOrderSummary";

function RL({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <Label htmlFor={htmlFor}>{children} <span className="text-destructive">*</span></Label>;
}

const STORAGE_KEY = "checkout_datos";

type DatosForm = {
  nombre: string; apellido: string; email: string; telefono: string;
  doc: string; condicionFiscal: string;
  factNombre: string; factApellido: string; factDoc: string; factCondicion: string;
  calle: string; piso: string; cp: string; localidad: string; provincia: string;
  sameAsBilling: boolean;
};

const EMPTY: DatosForm = {
  nombre: "", apellido: "", email: "", telefono: "",
  doc: "", condicionFiscal: "cf",
  factNombre: "", factApellido: "", factDoc: "", factCondicion: "cf",
  calle: "", piso: "", cp: "", localidad: "", provincia: "",
  sameAsBilling: true,
};

export default function CheckoutDatosPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState<DatosForm>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setForm((prev) => ({ ...prev, ...JSON.parse(stored) })); } catch {}
    } else if (session?.user) {
      const u = session.user as any;
      setForm((prev) => ({
        ...prev,
        nombre: u.name?.split(" ")[0] || "",
        apellido: u.lastName || u.name?.split(" ").slice(1).join(" ") || "",
        email: u.email || "",
        telefono: u.phone || "",
      }));
    }
    setLoaded(true);
  }, [session]);

  function update(field: keyof DatosForm, value: string | boolean) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  if (!loaded) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold text-foreground">Datos de contacto y facturacion</h1>
        <p className="mt-1 text-sm text-muted-foreground">Completa tus datos. Los campos con <span className="text-destructive">*</span> son obligatorios.</p>

        <form className="mt-8 space-y-8" onSubmit={(e) => e.preventDefault()}>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Datos de contacto</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><RL htmlFor="nombre">Nombre</RL><Input id="nombre" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} required /></div>
              <div className="space-y-2"><RL htmlFor="apellido">Apellido</RL><Input id="apellido" value={form.apellido} onChange={(e) => update("apellido", e.target.value)} required /></div>
            </div>
            <div className="space-y-2"><RL htmlFor="email">Email</RL><Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></div>
            <div className="space-y-2"><RL htmlFor="telefono">Telefono</RL><Input id="telefono" type="tel" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} required /></div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Facturacion</h2>
            <div className="flex items-start gap-3">
              <Checkbox id="sameBilling" checked={form.sameAsBilling} onCheckedChange={(v) => update("sameAsBilling", v === true)} />
              <Label htmlFor="sameBilling" className="cursor-pointer text-sm">Usar los mismos datos de contacto para facturacion</Label>
            </div>
            {!form.sameAsBilling && (
              <div className="space-y-4 rounded-lg border border-dashed border-border p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><RL htmlFor="factNombre">Nombre</RL><Input id="factNombre" value={form.factNombre} onChange={(e) => update("factNombre", e.target.value)} required /></div>
                  <div className="space-y-2"><RL htmlFor="factApellido">Apellido</RL><Input id="factApellido" value={form.factApellido} onChange={(e) => update("factApellido", e.target.value)} required /></div>
                </div>
                <div className="space-y-2"><RL htmlFor="factDoc">DNI / CUIT</RL><Input id="factDoc" value={form.factDoc} onChange={(e) => update("factDoc", e.target.value)} required /></div>
                <div className="space-y-2">
                  <Label>Condicion fiscal</Label>
                  <Select value={form.factCondicion} onValueChange={(v) => update("factCondicion", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cf">Consumidor final</SelectItem>
                      <SelectItem value="mo">Monotributo</SelectItem>
                      <SelectItem value="ri">Responsable inscripto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2"><RL htmlFor="doc">DNI / CUIT</RL><Input id="doc" value={form.doc} onChange={(e) => update("doc", e.target.value)} required /></div>
            <div className="space-y-2">
              <Label>Condicion fiscal</Label>
              <Select value={form.condicionFiscal} onValueChange={(v) => update("condicionFiscal", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cf">Consumidor final</SelectItem>
                  <SelectItem value="mo">Monotributo</SelectItem>
                  <SelectItem value="ri">Responsable inscripto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Direccion de envio</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><RL htmlFor="calle">Calle y numero</RL><Input id="calle" value={form.calle} onChange={(e) => update("calle", e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="piso">Piso / Depto</Label><Input id="piso" value={form.piso} onChange={(e) => update("piso", e.target.value)} /></div>
              <div className="space-y-2"><RL htmlFor="cp">Codigo postal</RL><Input id="cp" value={form.cp} onChange={(e) => update("cp", e.target.value)} required /></div>
              <div className="space-y-2"><RL htmlFor="localidad">Localidad</RL><Input id="localidad" value={form.localidad} onChange={(e) => update("localidad", e.target.value)} required /></div>
              <div className="space-y-2"><RL htmlFor="provincia">Provincia</RL><Input id="provincia" value={form.provincia} onChange={(e) => update("provincia", e.target.value)} required /></div>
            </div>
          </section>

          <Button asChild className="w-full bg-store-orange text-store-orange-foreground hover:bg-store-orange/90 sm:w-auto">
            <Link href="/checkout/envio">Continuar</Link>
          </Button>
        </form>
      </div>
      <CheckoutOrderSummary />
    </div>
  );
}
