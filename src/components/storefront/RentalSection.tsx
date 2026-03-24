"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Clock, Download, Printer, Shield, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/utils";

type Period = { id: string; label: string; days: number; price: number };
type Tool = {
  id: string; name: string; slug: string; description: string | null;
  imageUrl: string | null; deposit: number | null; availableQty: number;
  periods: Period[];
};

export function RentalSection() {
  const [enabled, setEnabled] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsDialog, setTermsDialog] = useState(false);
  const [termsContent, setTermsContent] = useState("");

  useEffect(() => {
    fetch("/api/rentals/public")
      .then((r) => r.json())
      .then((d) => {
        setEnabled(d.enabled);
        setTools(d.tools || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openTool(t: Tool) {
    setSelectedTool(t);
    setSelectedPeriod(t.periods[0] || null);
    setAcceptedTerms(false);
  }

  function openTerms() {
    fetch("/api/legals/public?slug=terminos-alquiler")
      .then((r) => r.json())
      .then((d) => {
        setTermsContent(d.document?.content || "Terminos no disponibles.");
        setTermsDialog(true);
      })
      .catch(() => { setTermsContent("Error al cargar terminos."); setTermsDialog(true); });
  }

  if (loading || !enabled || tools.length === 0) return null;

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-amber-50/50 to-background py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Wrench className="size-5 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Alquiler de herramientas
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground ml-13">
            Alquila herramientas profesionales por dia, semana o el periodo que necesites.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((t) => (
              <Card key={t.id} className="group border-border shadow-sm transition-shadow hover:shadow-md cursor-pointer" onClick={() => openTool(t)}>
                <div className="relative h-44 overflow-hidden rounded-t-xl bg-muted">
                  {t.imageUrl ? (
                    <Image src={t.imageUrl} alt={t.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width:640px) 100vw, 25vw" />
                  ) : (
                    <div className="flex size-full items-center justify-center"><Wrench className="size-12 text-muted-foreground/30" /></div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">{t.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {t.periods.slice(0, 2).map((p) => (
                      <Badge key={p.id} variant="outline" className="text-xs">{p.label}: {formatPrice(p.price)}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    <span>{t.availableQty} disponible(s)</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Dialog detalle herramienta */}
      <Dialog open={!!selectedTool} onOpenChange={(open) => { if (!open) setSelectedTool(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selectedTool?.name}</DialogTitle></DialogHeader>
          {selectedTool && (
            <div className="space-y-4 pt-2">
              {selectedTool.imageUrl && (
                <div className="relative h-48 overflow-hidden rounded-xl bg-muted">
                  <Image src={selectedTool.imageUrl} alt="" fill className="object-cover" sizes="400px" />
                </div>
              )}
              {selectedTool.description && <p className="text-sm text-muted-foreground">{selectedTool.description}</p>}

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Selecciona un periodo</Label>
                <div className="space-y-2">
                  {selectedTool.periods.map((p) => (
                    <button key={p.id} type="button" onClick={() => setSelectedPeriod(p)}
                      className={`flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 text-sm transition-colors ${selectedPeriod?.id === p.id ? "border-store-orange bg-store-orange/5" : "border-border hover:border-primary/30"}`}>
                      <span className="font-medium">{p.label} ({p.days} dia{p.days > 1 ? "s" : ""})</span>
                      <span className="font-bold text-primary">{formatPrice(p.price)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedTool.deposit && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm">
                  <Shield className="size-4 text-amber-600 shrink-0" />
                  <span className="text-amber-800">Deposito de garantia: <strong>{formatPrice(selectedTool.deposit)}</strong> (reembolsable)</span>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Checkbox id="rental-terms" checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(v === true)} />
                <Label htmlFor="rental-terms" className="cursor-pointer text-sm leading-snug">
                  Acepto los{" "}
                  <button type="button" className="text-primary underline hover:no-underline" onClick={openTerms}>
                    terminos y condiciones de alquiler
                  </button>
                  . <span className="text-destructive">*</span>
                </Label>
              </div>

              <Button disabled={!acceptedTerms || !selectedPeriod} className="w-full bg-store-orange text-store-orange-foreground hover:bg-store-orange/90">
                Solicitar alquiler
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog T&C alquiler */}
      <Dialog open={termsDialog} onOpenChange={setTermsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Terminos y Condiciones de Alquiler</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto rounded-md border border-border bg-muted/30 p-4">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {termsContent}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                const blob = new Blob([`Terminos y Condiciones de Alquiler\n${"=".repeat(40)}\n\n${termsContent}`], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "terminos-condiciones-alquiler.txt"; a.click(); URL.revokeObjectURL(url);
              }}><Download className="size-4" />Descargar</Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                const w = window.open("", "_blank"); if (!w) return;
                w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>T&C Alquiler</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#222;line-height:1.6}h1{border-bottom:2px solid #333;padding-bottom:8px}pre{white-space:pre-wrap;font-family:inherit}@media print{body{margin:20px}}</style></head><body><h1>Terminos y Condiciones de Alquiler</h1><pre>${termsContent}</pre><script>window.print();<\/script></body></html>`);
                w.document.close();
              }}><Printer className="size-4" />Imprimir</Button>
            </div>
            <Button size="sm" onClick={() => { setTermsDialog(false); setAcceptedTerms(true); }}>Aceptar y cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
