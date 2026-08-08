"use client";

import { Loader2, MapPin, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  formatUserAddressLine1,
  type UserAddressDto,
} from "@/lib/user-address";

type AddressFormState = {
  label: string;
  street: string;
  number: string;
  floor: string;
  apartment: string;
  city: string;
  state: string;
  postalCode: string;
  instructions: string;
};

const EMPTY_FORM: AddressFormState = {
  label: "",
  street: "",
  number: "",
  floor: "",
  apartment: "",
  city: "",
  state: "",
  postalCode: "",
  instructions: "",
};

function addressToForm(address: UserAddressDto): AddressFormState {
  return {
    label: address.label ?? "",
    street: address.street,
    number: address.number,
    floor: address.floor ?? "",
    apartment: address.apartment ?? "",
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    instructions: address.instructions ?? "",
  };
}

function AddressFormFields({
  form,
  onChange,
  idPrefix,
}: {
  form: AddressFormState;
  onChange: (patch: Partial<AddressFormState>) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-label`}>Nombre (ej. Casa, Obra)</Label>
        <Input
          id={`${idPrefix}-label`}
          value={form.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Casa"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-street`}>Calle</Label>
          <Input
            id={`${idPrefix}-street`}
            value={form.street}
            onChange={(e) => onChange({ street: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-number`}>Número</Label>
          <Input
            id={`${idPrefix}-number`}
            value={form.number}
            onChange={(e) => onChange({ number: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-floor`}>Piso / Depto (opcional)</Label>
          <Input
            id={`${idPrefix}-floor`}
            value={form.floor}
            onChange={(e) => onChange({ floor: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-apartment`}>Unidad (opcional)</Label>
          <Input
            id={`${idPrefix}-apartment`}
            value={form.apartment}
            onChange={(e) => onChange({ apartment: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-city`}>Localidad</Label>
          <Input
            id={`${idPrefix}-city`}
            value={form.city}
            onChange={(e) => onChange({ city: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-state`}>Provincia</Label>
          <Input
            id={`${idPrefix}-state`}
            value={form.state}
            onChange={(e) => onChange({ state: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="space-y-2 sm:max-w-xs">
        <Label htmlFor={`${idPrefix}-postalCode`}>Código postal</Label>
        <Input
          id={`${idPrefix}-postalCode`}
          value={form.postalCode}
          onChange={(e) => onChange({ postalCode: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-instructions`}>
          Instrucciones de entrega (opcional)
        </Label>
        <Textarea
          id={`${idPrefix}-instructions`}
          value={form.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
          rows={2}
        />
      </div>
    </div>
  );
}

function buildPayload(form: AddressFormState) {
  return {
    label: form.label.trim() || null,
    street: form.street.trim(),
    number: form.number.trim(),
    floor: form.floor.trim() || null,
    apartment: form.apartment.trim() || null,
    city: form.city.trim(),
    state: form.state.trim(),
    postalCode: form.postalCode.trim(),
    country: "AR",
    instructions: form.instructions.trim() || null,
  };
}

export default function DireccionesPage() {
  const { status } = useSession();
  const [addresses, setAddresses] = useState<UserAddressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserAddressDto | null>(null);
  const [form, setForm] = useState<AddressFormState>(EMPTY_FORM);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/addresses");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar las direcciones");
      }
      setAddresses(data.addresses ?? []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al cargar direcciones",
      );
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      void loadAddresses();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, loadAddresses]);

  function openCreateDialog() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(address: UserAddressDto) {
    setEditing(address);
    setForm(addressToForm(address));
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload(form);
      const res = await fetch(
        editing ? `/api/user/addresses/${editing.id}` : "/api/user/addresses",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        const fieldMsg = data.fieldErrors
          ? Object.values(data.fieldErrors as Record<string, string[]>)
              .flat()
              .join(" ")
          : "";
        throw new Error(
          [data.error, fieldMsg].filter(Boolean).join(" ") ||
            "No se pudo guardar la dirección",
        );
      }

      toast.success(editing ? "Dirección actualizada" : "Dirección guardada");
      setDialogOpen(false);
      await loadAddresses();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar la dirección",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(addressId: string) {
    try {
      const res = await fetch(`/api/user/addresses/${addressId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setDefault" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar");
      }
      toast.success("Dirección predeterminada actualizada");
      await loadAddresses();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al marcar predeterminada",
      );
    }
  }

  async function handleDelete(address: UserAddressDto) {
    const label = address.label || formatUserAddressLine1(address);
    if (!window.confirm(`¿Eliminar la dirección "${label}"?`)) return;

    try {
      const res = await fetch(`/api/user/addresses/${address.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo eliminar");
      }
      toast.success("Dirección eliminada");
      await loadAddresses();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al eliminar la dirección",
      );
    }
  }

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="text-xl font-bold text-foreground">Direcciones</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Iniciá sesión para guardar y gestionar tus direcciones de envío.
        </p>
        <Button asChild className="mt-6 bg-store-orange text-store-orange-foreground hover:bg-store-orange/90">
          <Link href="/login">Iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Direcciones</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestioná tus direcciones de envío guardadas en tu cuenta.
          </p>
        </div>
        <Button
          type="button"
          className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
          onClick={openCreateDialog}
        >
          Nueva dirección
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <MapPin className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 font-medium text-foreground">
            Todavía no tenés direcciones guardadas
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Agregá una para usarla en tus próximos pedidos.
          </p>
          <Button
            type="button"
            className="mt-6 bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
            onClick={openCreateDialog}
          >
            Agregar dirección
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {addresses.map((address) => (
            <li key={address.id}>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                  <div className="flex gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MapPin className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                        {address.label || "Dirección"}
                        {address.isDefault ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-store-orange/15 px-2 py-0.5 text-xs font-semibold text-store-orange">
                            <Star className="size-3 fill-current" />
                            Predeterminada
                          </span>
                        ) : null}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatUserAddressLine1(address)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {address.city}, {address.state} · CP {address.postalCode}
                      </p>
                      {address.instructions ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {address.instructions}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!address.isDefault ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleSetDefault(address.id)}
                      >
                        Predeterminada
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Editar dirección"
                      onClick={() => openEditDialog(address)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label="Eliminar dirección"
                      onClick={() => void handleDelete(address)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar dirección" : "Agregar dirección"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(e)}>
            <AddressFormFields
              form={form}
              onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              idPrefix={editing ? "edit" : "new"}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
