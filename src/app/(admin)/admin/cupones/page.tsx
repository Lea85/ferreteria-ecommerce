"use client";

import { Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CUSTOMER_TYPE_LABELS, DISCOUNT_TYPE_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

type CouponRow = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  uses: number;
  maxUses: number | null;
  minPurchase: number | null;
  expires: string;
  active: boolean;
  customerType: keyof typeof CUSTOMER_TYPE_LABELS | null;
};

const MOCK: CouponRow[] = [
  {
    id: "cp1",
    code: "HOTSALE15",
    discountType: "PERCENTAGE",
    discountValue: 15,
    uses: 42,
    maxUses: 500,
    minPurchase: 80_000,
    expires: "31 mar 2026",
    active: true,
    customerType: null,
  },
  {
    id: "cp2",
    code: "GREMIO10",
    discountType: "PERCENTAGE",
    discountValue: 10,
    uses: 128,
    maxUses: null,
    minPurchase: 50_000,
    expires: "Sin vencimiento",
    active: true,
    customerType: "TRADE",
  },
  {
    id: "cp3",
    code: "ENVIO5000",
    discountType: "FIXED_AMOUNT",
    discountValue: 5000,
    uses: 210,
    maxUses: 1000,
    minPurchase: 120_000,
    expires: "15 abr 2026",
    active: true,
    customerType: null,
  },
  {
    id: "cp4",
    code: "MAYO20",
    discountType: "PERCENTAGE",
    discountValue: 20,
    uses: 0,
    maxUses: 100,
    minPurchase: 200_000,
    expires: "30 may 2026",
    active: false,
    customerType: "WHOLESALE",
  },
  {
    id: "cp5",
    code: "BIENVENIDO",
    discountType: "FIXED_AMOUNT",
    discountValue: 8000,
    uses: 956,
    maxUses: 2000,
    minPurchase: 40_000,
    expires: "31 dic 2026",
    active: true,
    customerType: "CONSUMER",
  },
];

export default function AdminCuponesPage() {
  const [open, setOpen] = useState(false);
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MOCK.map((c) => [c.id, c.active])),
  );
  const [page, setPage] = useState(1);

  const [form, setForm] = useState({
    code: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT",
    discountValue: "",
    minPurchase: "",
    maxUses: "",
    expiry: "",
    customerType: "__all__" as string,
  });

  const rows = useMemo(
    () => MOCK.map((c) => ({ ...c, active: activeMap[c.id] ?? c.active })),
    [activeMap],
  );

  const columns: DataTableColumn<CouponRow>[] = [
    { id: "code", header: "Código", accessor: "code", sortable: true },
    {
      id: "discount",
      header: "Descuento",
      sortable: false,
      cell: (row) =>
        row.discountType === "PERCENTAGE"
          ? `${row.discountValue}%`
          : formatPrice(row.discountValue),
    },
    { id: "uses", header: "Usos", accessor: "uses", sortable: true },
    {
      id: "maxUses",
      header: "Límite",
      sortable: false,
      cell: (row) => (row.maxUses == null ? "Ilimitado" : String(row.maxUses)),
    },
    {
      id: "minPurchase",
      header: "Compra mín.",
      sortable: true,
      accessor: "minPurchase",
      cell: (row) =>
        row.minPurchase != null ? formatPrice(row.minPurchase) : "—",
    },
    { id: "expires", header: "Vencimiento", accessor: "expires", sortable: true },
    {
      id: "active",
      header: "Estado",
      accessor: "active",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.active}
            onCheckedChange={(v) =>
              setActiveMap((m) => ({ ...m, [row.id]: v }))
            }
            aria-label={`Activo ${row.code}`}
          />
          <Badge variant={row.active ? "default" : "secondary"}>
            {row.active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      ),
    },
  ];

  function saveCoupon() {
    if (!form.code.trim()) {
      toast.error("Completá el código");
      return;
    }
    toast.success("Cupón creado (simulación)", { description: form.code });
    setOpen(false);
    setForm({
      code: "",
      discountType: "PERCENTAGE",
      discountValue: "",
      minPurchase: "",
      maxUses: "",
      expiry: "",
      customerType: "__all__",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Cupones de descuento y campañas.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button">Nuevo cupón</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto border-border sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo cupón</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="c-code">Código</Label>
                <Input
                  id="c-code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                  }
                  className="border-border font-mono uppercase"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de descuento</Label>
                  <Select
                    value={form.discountType}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        discountType: v as "PERCENTAGE" | "FIXED_AMOUNT",
                      }))
                    }
                  >
                    <SelectTrigger className="border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">
                        {DISCOUNT_TYPE_LABELS.PERCENTAGE}
                      </SelectItem>
                      <SelectItem value="FIXED_AMOUNT">
                        {DISCOUNT_TYPE_LABELS.FIXED_AMOUNT}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-val">Valor</Label>
                  <Input
                    id="c-val"
                    type="number"
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discountValue: e.target.value }))
                    }
                    className="border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-min">Compra mínima (ARS)</Label>
                <Input
                  id="c-min"
                  type="number"
                  value={form.minPurchase}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minPurchase: e.target.value }))
                  }
                  className="border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-max">Máximo de usos (vacío = ilimitado)</Label>
                <Input
                  id="c-max"
                  type="number"
                  value={form.maxUses}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxUses: e.target.value }))
                  }
                  className="border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-exp">Fecha de vencimiento</Label>
                <Input
                  id="c-exp"
                  type="date"
                  value={form.expiry}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expiry: e.target.value }))
                  }
                  className="border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Restricción por tipo de cliente</Label>
                <Select
                  value={form.customerType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, customerType: v }))
                  }
                >
                  <SelectTrigger className="border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    <SelectItem value="CONSUMER">
                      {CUSTOMER_TYPE_LABELS.CONSUMER}
                    </SelectItem>
                    <SelectItem value="TRADE">
                      {CUSTOMER_TYPE_LABELS.TRADE}
                    </SelectItem>
                    <SelectItem value="WHOLESALE">
                      {CUSTOMER_TYPE_LABELS.WHOLESALE}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={saveCoupon}>
                Guardar cupón
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Buscar código…"
        searchKeys={["code"]}
        pagination={{
          page,
          pageSize: 6,
          total: rows.length,
          onPageChange: setPage,
        }}
        renderActions={() => (
          <Button type="button" variant="ghost" size="icon" aria-label="Editar">
            <Pencil className="size-4" />
          </Button>
        )}
      />
    </div>
  );
}
