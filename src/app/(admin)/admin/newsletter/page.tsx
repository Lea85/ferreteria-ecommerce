"use client";

import { Check, Copy, Loader2, Mail, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CUSTOMER_TYPE_LABELS } from "@/lib/constants";
import type { CustomerType } from "@/lib/constants";

type Subscriber = {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  customerType: CustomerType;
  createdAt: string;
};

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  async function loadSubscribers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/newsletter");
      const data = await res.json();
      setSubscribers(data.subscribers ?? []);
    } catch {
      toast.error("Error al cargar suscriptores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscribers();
  }, []);

  function handleCopyAll() {
    const emails = subscribers.map((s) => s.email).join(", ");
    navigator.clipboard.writeText(emails).then(() => {
      setCopied(true);
      toast.success(`${subscribers.length} emails copiados al portapapeles`);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  const columns: DataTableColumn<Subscriber>[] = [
    {
      id: "name",
      header: "Nombre",
      accessor: "name",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name} {row.lastName ?? ""}</p>
        </div>
      ),
    },
    { id: "email", header: "Email", accessor: "email", sortable: true },
    {
      id: "type",
      header: "Tipo",
      accessor: "customerType",
      sortable: true,
      cell: (row) => (
        <Badge variant="outline">
          {CUSTOMER_TYPE_LABELS[row.customerType] ?? row.customerType}
        </Badge>
      ),
    },
    {
      id: "created",
      header: "Registrado",
      accessor: "createdAt",
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString("es-AR")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Newsletter</h1>
          <p className="text-sm text-muted-foreground">
            Usuarios suscriptos al newsletter.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={loadSubscribers} disabled={loading} className="gap-2">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={handleCopyAll}
            disabled={subscribers.length === 0}
            className="gap-2"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "¡Copiados!" : "Copiar todos los emails"}
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{loading ? "—" : subscribers.length}</p>
            <p className="text-sm text-muted-foreground">suscriptores activos</p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={subscribers}
          searchPlaceholder="Buscar por nombre o email…"
          searchKeys={["name", "email"]}
          pagination={{ page: 1, pageSize: 20, total: subscribers.length }}
        />
      )}
    </div>
  );
}
