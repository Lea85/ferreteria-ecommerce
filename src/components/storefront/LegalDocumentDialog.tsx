"use client";

import { Download, FileText, Loader2, Printer } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LegalDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  fallbackTitle: string;
  fallbackContent?: string;
};

function downloadAsText(title: string, content: string) {
  const blob = new Blob(
    [`${title}\n${"=".repeat(title.length)}\n\n${content}`],
    { type: "text/plain;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LegalDocumentDialog({
  open,
  onOpenChange,
  slug,
  fallbackTitle,
  fallbackContent = "El documento no está disponible en este momento.",
}: LegalDocumentDialogProps) {
  const [doc, setDoc] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/legals/public?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.document) {
          setDoc({ title: data.document.title, content: data.document.content });
        } else {
          setDoc({ title: fallbackTitle, content: fallbackContent });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDoc({ title: fallbackTitle, content: "Error al cargar el documento." });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, slug, fallbackTitle, fallbackContent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            {doc?.title || fallbackTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : doc ? (
          <>
            <div className="flex-1 overflow-y-auto rounded-md border border-border bg-muted/30 p-4">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {doc.content}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => downloadAsText(doc.title, doc.content)}
                >
                  <Download className="size-4" />
                  Descargar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const w = window.open("", "_blank");
                    if (!w) return;
                    w.document.write(
                      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.title}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#222;line-height:1.6}h1{border-bottom:2px solid #333;padding-bottom:8px}pre{white-space:pre-wrap;font-family:inherit}@media print{body{margin:20px}}</style></head><body><h1>${doc.title}</h1><pre>${doc.content}</pre><script>window.print();<\/script></body></html>`,
                    );
                    w.document.close();
                  }}
                >
                  <Printer className="size-4" />
                  Imprimir
                </Button>
              </div>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
