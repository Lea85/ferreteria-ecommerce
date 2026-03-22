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
import { Textarea } from "@/components/ui/textarea";
import {
  CUSTOMER_TYPE_LABELS,
  DISCOUNT_TYPE_LABELS,
  PRICE_RULE_SCOPE_LABELS,
  PRICE_RULE_TYPE_LABELS,
} from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

type RuleRow = {
  id: string;
  name: string;
  type: keyof typeof PRICE_RULE_TYPE_LABELS;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  scope: keyof typeof PRICE_RULE_SCOPE_LABELS;
  starts: string;
  ends: string;
  active: boolean;
};

const MOCK: RuleRow[] = [
  {
    id: "r1",
    name: "Descuento gremios 12%",
    type: "ROLE",
    discountType: "PERCENTAGE",
    discountValue: 12,
    scope: "ALL_PRODUCTS",
    starts: "01 ene 2026",
    ends: "Sin fin",
    active: true,
  },
  {
    id: "r2",
    name: "Mayorista volumen caños",
    type: "VOLUME",
    discountType: "PERCENTAGE",
    discountValue: 8,
    scope: "SPECIFIC_CATEGORIES",
    starts: "10 feb 2026",
    ends: "31 ago 2026",
    active: true,
  },
  {
    id: "r3",
    name: "Hot Sale herramientas",
    type: "PROMO",
    discountType: "FIXED_AMOUNT",
    discountValue: 15_000,
    scope: "SPECIFIC_BRANDS",
    starts: "15 mar 2026",
    ends: "22 mar 2026",
    active: true,
  },
  {
    id: "r4",
    name: "Promo pinturas 18%",
    type: "PROMO",
    discountType: "PERCENTAGE",
    discountValue: 18,
    scope: "SPECIFIC_CATEGORIES",
    starts: "01 mar 2026",
    ends: "31 mar 2026",
    active: false,
  },
];

export default function AdminPromocionesPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MOCK.map((r) => [r.id, r.active])),
  );
  const [page, setPage] = useState(1);

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "ROLE" as keyof typeof PRICE_RULE_TYPE_LABELS,
    scope: "ALL_PRODUCTS" as keyof typeof PRICE_RULE_SCOPE_LABELS,
    customerType: "__none__",
    minQuantity: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT",
    discountValue: "",
    priority: "0",
    isActive: true,
    startsAt: "",
    endsAt: "",
    isStackable: false,
    productIds: "",
    categoryIds: "",
    brandIds: "",
  });

  const rows = useMemo(() => {
    return MOCK.filter(
      (r) => typeFilter === "all" || r.type === typeFilter,
    ).map((r) => ({ ...r, active: activeMap[r.id] ?? r.active }));
  }, [typeFilter, activeMap]);

  const columns: DataTableColumn<RuleRow>[] = [
    { id: "name", header: "Nombre", accessor: "name", sortable: true },
    {
      id: "type",
      header: "Tipo",
      accessor: "type",
      sortable: true,
      cell: (row) => (
        <Badge variant="outline" className="font-normal">
          {PRICE_RULE_TYPE_LABELS[row.type]}
        </Badge>
      ),
    },
    {
      id: "discount",
      header: "Descuento",
      sortable: false,
      cell: (row) =>
        row.discountType === "PERCENTAGE"
          ? `${row.discountValue}%`
          : formatPrice(row.discountValue),
    },
    {
      id: "scope",
      header: "Alcance",
      accessor: "scope",
      sortable: true,
      cell: (row) => PRICE_RULE_SCOPE_LABELS[row.scope],
    },
    {
      id: "dates",
      header: "Fechas",
      sortable: false,
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.starts} — {row.ends}
        </span>
      ),
    },
    {
      id: "active",
      header: "Activa",
      accessor: "active",
      sortable: true,
      cell: (row) => (
        <Switch
          checked={row.active}
          onCheckedChange={(v) =>
            setActiveMap((m) => ({ ...m, [row.id]: v }))
          }
        />
      ),
    },
  ];

  function saveRule() {
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    toast.success("Regla guardada (simulación)", { description: form.name });
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <p className="text-sm text-muted-foreground">
          Reglas de precio (rol, volumen y promociones temporales).
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Filtrar por tipo
            </span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full border-border sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ROLE">{PRICE_RULE_TYPE_LABELS.ROLE}</SelectItem>
                <SelectItem value="VOLUME">
                  {PRICE_RULE_TYPE_LABELS.VOLUME}
                </SelectItem>
                <SelectItem value="PROMO">{PRICE_RULE_TYPE_LABELS.PROMO}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button">Nueva regla de precio</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto border-border sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nueva regla de precio</DialogTitle>
              </DialogHeader>
              <div className="grid max-h-[65vh] gap-4 overflow-y-auto py-2 pr-1">
                <div className="space-y-2">
                  <Label htmlFor="pr-name">Nombre</Label>
                  <Input
                    id="pr-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pr-desc">Descripción</Label>
                  <Textarea
                    id="pr-desc"
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    className="border-border"
                    rows={2}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          type: v as keyof typeof PRICE_RULE_TYPE_LABELS,
                        }))
                      }
                    >
                      <SelectTrigger className="border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ROLE">ROLE</SelectItem>
                        <SelectItem value="VOLUME">VOLUME</SelectItem>
                        <SelectItem value="PROMO">PROMO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Alcance (scope)</Label>
                    <Select
                      value={form.scope}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          scope: v as keyof typeof PRICE_RULE_SCOPE_LABELS,
                        }))
                      }
                    >
                      <SelectTrigger className="border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.keys(PRICE_RULE_SCOPE_LABELS) as (keyof typeof PRICE_RULE_SCOPE_LABELS)[]
                        ).map((k) => (
                          <SelectItem key={k} value={k}>
                            {PRICE_RULE_SCOPE_LABELS[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de cliente (solo ROLE)</Label>
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
                      <SelectItem value="__none__">N/A</SelectItem>
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
                <div className="space-y-2">
                  <Label htmlFor="pr-minq">Cantidad mínima (VOLUME)</Label>
                  <Input
                    id="pr-minq"
                    type="number"
                    value={form.minQuantity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minQuantity: e.target.value }))
                    }
                    className="border-border"
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
                    <Label htmlFor="pr-dval">Valor descuento</Label>
                    <Input
                      id="pr-dval"
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
                  <Label htmlFor="pr-prio">Prioridad</Label>
                  <Input
                    id="pr-prio"
                    type="number"
                    value={form.priority}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priority: e.target.value }))
                    }
                    className="border-border"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm">Activa</span>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, isActive: v }))
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pr-start">Inicio</Label>
                    <Input
                      id="pr-start"
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, startsAt: e.target.value }))
                      }
                      className="border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pr-end">Fin</Label>
                    <Input
                      id="pr-end"
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, endsAt: e.target.value }))
                      }
                      className="border-border"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm">Acumulable (stackable)</span>
                  <Switch
                    checked={form.isStackable}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, isStackable: v }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>IDs productos (coma)</Label>
                  <Input
                    value={form.productIds}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, productIds: e.target.value }))
                    }
                    className="border-border font-mono text-xs"
                    placeholder="id1, id2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IDs categorías (coma)</Label>
                  <Input
                    value={form.categoryIds}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, categoryIds: e.target.value }))
                    }
                    className="border-border font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IDs marcas (coma)</Label>
                  <Input
                    value={form.brandIds}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, brandIds: e.target.value }))
                    }
                    className="border-border font-mono text-xs"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={saveRule}>
                  Guardar regla
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Buscar regla…"
        searchKeys={["name"]}
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
