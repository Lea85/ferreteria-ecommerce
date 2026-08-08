import { getCounterSalePrintPaymentLabel } from "@/lib/constants";
import { resolveQuoteStoreBranding } from "@/lib/quote-branding";

type ReturnPrintItem = {
  productName: string;
  variantName?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type ReturnPrintDoc = {
  returnNumber: string;
  orderNumber: string;
  refundMethod: string;
  subtotal: number;
  total: number;
  createdAt: string;
  processedByName?: string | null;
  notes?: string | null;
  items: ReturnPrintItem[];
};

export function generateReturnPrintHtml(
  doc: ReturnPrintDoc,
  store: Record<string, string>,
): string {
  const { storeName, storeAddress, storePhone, storeEmail } =
    resolveQuoteStoreBranding(store);

  const refundLabel = getCounterSalePrintPaymentLabel(doc.refundMethod);

  const createdAt = new Date(doc.createdAt).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formatMoney = (n: number) =>
    `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

  const itemRows = doc.items
    .map((item) => {
      const description = item.variantName
        ? `${item.productName} — ${item.variantName}`
        : item.productName;
      return `<tr>
        <td class="mono">${item.sku || "—"}</td>
        <td>${description}</td>
        <td class="num">${item.quantity}</td>
        <td class="num mono">${formatMoney(item.unitPrice)}</td>
        <td class="num mono"><strong>${formatMoney(item.subtotal)}</strong></td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Devolución ${doc.returnNumber}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #111;
      margin: 0;
      padding: 0;
      font-size: 12px;
      line-height: 1.45;
    }
    .wrap { max-width: 720px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #111;
      margin-bottom: 20px;
    }
    .company h1 {
      margin: 0 0 4px;
      font-size: 22px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .company p { margin: 2px 0; font-size: 11px; color: #333; }
    .doc-title { text-align: right; }
    .doc-title h2 {
      margin: 0;
      font-size: 16px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .doc-title p { margin: 4px 0 0; font-size: 11px; }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      margin-bottom: 20px;
      padding: 12px;
      border: 1px solid #ccc;
    }
    .meta div span {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #555;
    }
    .meta div strong { font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 0 0 16px; }
    th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 8px 10px;
      border-top: 1px solid #111;
      border-bottom: 1px solid #111;
      background: #f5f5f5;
    }
    td { padding: 8px 10px; border-bottom: 1px solid #ddd; vertical-align: top; }
    .num { text-align: right; }
    .mono { font-family: "Courier New", Courier, monospace; font-size: 11px; }
    .totals { margin-left: auto; width: 280px; }
    .totals table { margin: 0; }
    .totals td { border: none; padding: 4px 0; }
    .totals .grand td {
      border-top: 2px solid #111;
      padding-top: 10px;
      font-size: 16px;
      font-weight: bold;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #999;
      text-align: center;
      font-size: 10px;
      color: #555;
    }
    .footer p { margin: 3px 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="company">
        <h1>${storeName}</h1>
        ${storeAddress ? `<p>${storeAddress}</p>` : ""}
        ${storePhone ? `<p>Tel: ${storePhone}</p>` : ""}
        ${storeEmail ? `<p>${storeEmail}</p>` : ""}
      </div>
      <div class="doc-title">
        <h2>Devolución</h2>
        <p>Comprobante de reintegro</p>
      </div>
    </div>

    <div class="meta">
      <div><span>N° de devolución</span><strong>${doc.returnNumber}</strong></div>
      <div><span>Venta origen</span><strong>${doc.orderNumber}</strong></div>
      <div><span>Fecha y hora</span><strong>${createdAt}</strong></div>
      <div><span>Forma de reintegro</span><strong>${refundLabel}</strong></div>
      ${doc.processedByName ? `<div><span>Operador</span><strong>${doc.processedByName}</strong></div>` : ""}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:14%">SKU</th>
          <th>Descripción</th>
          <th style="width:8%" class="num">Cant.</th>
          <th style="width:14%" class="num">P. unit.</th>
          <th style="width:14%" class="num">Importe</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="totals">
      <table>
        <tr>
          <td>Subtotal devuelto</td>
          <td class="num mono">${formatMoney(doc.subtotal)}</td>
        </tr>
        <tr class="grand">
          <td>TOTAL REINTEGRADO</td>
          <td class="num mono">${formatMoney(doc.total)}</td>
        </tr>
      </table>
    </div>

    ${
      doc.notes
        ? `<p style="margin-top:16px;font-size:11px;color:#444;"><strong>Notas:</strong> ${doc.notes}</p>`
        : ""
    }

    <div class="footer">
      <p><strong>${storeName}</strong> — Documento no válido como factura</p>
      <p>Conserve este comprobante. Venta origen: ${doc.orderNumber} · Devolución: ${doc.returnNumber}</p>
    </div>
  </div>
</body>
</html>`;
}

export function printOrderReturn(
  doc: ReturnPrintDoc,
  store: Record<string, string>,
) {
  const html = generateReturnPrintHtml(doc, store);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}
