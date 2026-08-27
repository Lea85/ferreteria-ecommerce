"use client";

import { ArrowLeft, Loader2, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { QuoteEditor, type QuoteEditorItem } from "@/components/admin/QuoteEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CUSTOMER_TYPE_LABELS, type CustomerType } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  EXPIRED: "Vencido",
  SOLD: "Vendido",
  CANCELLED: "Cancelado",
};

type QuoteCustomer = {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  phone?: string | null;
  taxId?: string | null;
  taxIdType?: string | null;
  companyName?: string | null;
  customerType?: CustomerType;
};

function formatTaxId(taxId: string | null | undefined): string | null {
  if (!taxId) return null;
  const digits = taxId.replace(/\D/g, "");
  if (digits.length !== 11) return taxId;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

function customerLabel(user: QuoteCustomer): string {
  return [user.name, user.lastName].filter(Boolean).join(" ");
}

export default function EditarPresupuestoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quoteMeta, setQuoteMeta] = useState<{
    quoteNumber: string;
    status: string;
    total: number;
    subtotal: number;
  } | null>(null);
  const [items, setItems] = useState<QuoteEditorItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<QuoteCustomer | null>(
    null,
  );

  const [customerSearch, setCustomerSearch] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerResults, setCustomerResults] = useState<QuoteCustomer[]>([]);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedCustomerSearch(customerSearch.trim()),
      300,
    );
    return () => clearTimeout(t);
  }, [customerSearch]);

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
          total: Number(quote.total),
          subtotal: Number(quote.subtotal),
        });
        setSelectedCustomer({
          id: quote.user.id,
          name: quote.user.name,
          lastName: quote.user.lastName,
          email: quote.user.email,
          phone: quote.user.phone,
          taxId: quote.user.taxId,
          taxIdType: quote.user.taxIdType,
          companyName: quote.user.companyName,
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

  useEffect(() => {
    if (debouncedCustomerSearch.length < 2) {
      setCustomerResults([]);
      return;
    }

    let cancelled = false;
    setSearchingCustomers(true);
    const params = new URLSearchParams({
      search: debouncedCustomerSearch,
      limit: "15",
      page: "1",
    });

    fetch(`/api/admin/users?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCustomerResults(
          Array.isArray(data.users)
            ? data.users.map(
                (u: {
                  id: string;
                  name: string;
                  lastName: string | null;
                  email: string;
                  phone: string | null;
                  taxId: string | null;
                  taxIdType: string | null;
                  companyName: string | null;
                  customerType: CustomerType;
                }) => ({
                  id: u.id,
                  name: u.name,
                  lastName: u.lastName,
                  email: u.email,
                  phone: u.phone,
                  taxId: u.taxId,
                  taxIdType: u.taxIdType,
                  companyName: u.companyName,
                  customerType: u.customerType,
                }),
              )
            : [],
        );
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Error al buscar clientes");
          setCustomerResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSearchingCustomers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedCustomerSearch]);

  async function handleSave() {
    if (items.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }
    if (!selectedCustomer?.id) {
      toast.error("Seleccioná un cliente para el presupuesto");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          userId: selectedCustomer.id,
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

  const selectedTax = formatTaxId(selectedCustomer?.taxId);

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
            Asociá un cliente y modificá los productos del presupuesto.
          </p>
        </div>
        <Badge>{STATUS_LABELS[quoteMeta.status] || quoteMeta.status}</Badge>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Cliente asociado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCustomer ? (
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserRound className="size-4" />
                </div>
                <div>
                  <p className="font-medium">{customerLabel(selectedCustomer)}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.email}
                  </p>
                  {selectedCustomer.companyName ? (
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.companyName}
                    </p>
                  ) : null}
                  {selectedTax ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      {selectedCustomer.taxIdType || "CUIT/CUIL"}: {selectedTax}
                    </p>
                  ) : null}
                </div>
              </div>
              <Badge variant="outline">Seleccionado</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no hay un cliente asociado.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="customer-search">Buscar cliente</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="customer-search"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Nombre, apellido, email o CUIT/CUIL…"
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Escribí al menos 2 caracteres. Podés buscar por nombre o por parte
              del CUIT/CUIL.
            </p>
          </div>

          {debouncedCustomerSearch.length >= 2 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
              {searchingCustomers ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Buscando…
                </div>
              ) : customerResults.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No se encontraron clientes.
                </p>
              ) : (
                customerResults.map((customer) => {
                  const tax = formatTaxId(customer.taxId);
                  const isSelected = selectedCustomer?.id === customer.id;
                  return (
                    <button
                      key={customer.id}
                      type="button"
                      className={`flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      }`}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerSearch("");
                        setCustomerResults([]);
                        toast.success(`Cliente: ${customerLabel(customer)}`);
                      }}
                    >
                      <div>
                        <p className="font-medium">{customerLabel(customer)}</p>
                        <p className="text-xs text-muted-foreground">
                          {customer.email}
                        </p>
                        {customer.companyName ? (
                          <p className="text-xs text-muted-foreground">
                            {customer.companyName}
                          </p>
                        ) : null}
                        {tax ? (
                          <p className="font-mono text-xs text-muted-foreground">
                            {customer.taxIdType || "CUIT/CUIL"}: {tax}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {customer.customerType ? (
                          <Badge variant="outline" className="text-xs">
                            {CUSTOMER_TYPE_LABELS[customer.customerType]}
                          </Badge>
                        ) : null}
                        {isSelected ? (
                          <span className="text-xs font-medium text-primary">
                            Actual
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

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
        y descuentos del cliente seleccionado.
      </p>
    </div>
  );
}
