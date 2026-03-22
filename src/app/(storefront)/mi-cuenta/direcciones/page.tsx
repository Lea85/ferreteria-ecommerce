"use client";

import { useState } from "react";
import { MapPin, Pencil, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Address = {
  id: string;
  label: string;
  street: string;
  city: string;
  cp: string;
  default: boolean;
};

const INITIAL: Address[] = [
  {
    id: "1",
    label: "Casa",
    street: "Av. Corrientes 1234, Piso 2 B",
    city: "CABA",
    cp: "1043",
    default: true,
  },
  {
    id: "2",
    label: "Obra",
    street: "Colectora Oeste km 12",
    city: "Moreno",
    cp: "1744",
    default: false,
  },
];

export default function DireccionesPage() {
  const [addresses, setAddresses] = useState<Address[]>(INITIAL);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Direcciones</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestioná tus direcciones de envío.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90">
              Nueva dirección
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar dirección</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const label = String(fd.get("label") ?? "Nueva");
                const street = String(fd.get("street") ?? "");
                const city = String(fd.get("city") ?? "");
                const cp = String(fd.get("cp") ?? "");
                setAddresses((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    label,
                    street,
                    city,
                    cp,
                    default: false,
                  },
                ]);
                setOpen(false);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="label">Nombre (ej. Casa, Obra)</Label>
                <Input id="label" name="label" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Calle y número</Label>
                <Input id="street" name="street" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Localidad</Label>
                  <Input id="city" name="city" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp">CP</Label>
                  <Input id="cp" name="cp" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ul className="mt-8 space-y-4">
        {addresses.map((a) => (
          <li key={a.id}>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {a.label}
                      {a.default ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-store-orange/15 px-2 py-0.5 text-xs font-semibold text-store-orange">
                          <Star className="size-3 fill-current" />
                          Predeterminada
                        </span>
                      ) : null}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {a.street}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.city} · CP {a.cp}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!a.default ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setAddresses((prev) =>
                          prev.map((x) => ({
                            ...x,
                            default: x.id === a.id,
                          })),
                        )
                      }
                    >
                      Predeterminada
                    </Button>
                  ) : null}
                  <Button type="button" variant="ghost" size="icon">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() =>
                      setAddresses((prev) => prev.filter((x) => x.id !== a.id))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0" />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
