import { resolveQuoteStoreBranding } from "@/lib/quote-branding";

export const QUOTE_PRINT_STORE_KEYS =
  "store_name,store_logo_url,google_maps_address,store_address,whatsapp_number,contact_email,quote_validity_days";

export type QuotePrintItem = {
  sku: string;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type QuotePrintData = {
  quoteNumber: string;
  createdAt: string;
  validUntil: string;
  subtotal: number;
  total: number;
  items: QuotePrintItem[];
  discountLabel?: string | null;
};

export function generateQuotePrintHtml(
  quote: QuotePrintData,
  storeSettings: Record<string, string>,
): string {
  const {
    storeName,
    storeAddress,
    storePhone,
    storeEmail,
    validityDays,
  } = resolveQuoteStoreBranding(storeSettings);

  const discountAmount = Math.max(
    0,
    Number(quote.subtotal) - Number(quote.total),
  );

  const validUntil = new Date(quote.validUntil).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const createdAt = new Date(quote.createdAt).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const itemRows = quote.items
    .map(
      (item) =>
        `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px">${item.sku}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace">$${Number(item.unitPrice).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;font-family:monospace">$${Number(item.subtotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
          </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Presupuesto ${quote.quoteNumber}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; margin: 0; padding: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #f97316; }
    .logo-section h1 { margin: 0; font-size: 28px; color: #f97316; }
    .logo-section p { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
    .quote-info { text-align: right; }
    .quote-info h2 { margin: 0; font-size: 20px; color: #374151; }
    .quote-info p { margin: 4px 0 0; font-size: 13px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f97316; color: white; padding: 10px 12px; text-align: left; font-size: 13px; font-weight: 600; }
    th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: center; }
    th:nth-child(4), th:nth-child(5) { text-align: right; }
    .totals { margin-top: 20px; text-align: right; }
    .totals table { width: 300px; margin-left: auto; }
    .totals td { padding: 6px 12px; font-size: 14px; }
    .totals .total-row td { font-size: 18px; font-weight: 700; border-top: 2px solid #f97316; padding-top: 12px; }
    .validity { margin-top: 30px; padding: 16px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; text-align: center; }
    .validity p { margin: 0; font-size: 14px; color: #9a3412; font-weight: 600; }
    .validity span { font-size: 12px; color: #c2410c; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
    .footer p { margin: 2px 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <h1>${storeName}</h1>
      ${storeAddress ? `<p>${storeAddress}</p>` : ""}
      ${storePhone ? `<p>Tel: ${storePhone}</p>` : ""}
      ${storeEmail ? `<p>Email: ${storeEmail}</p>` : ""}
    </div>
    <div class="quote-info">
      <h2>PRESUPUESTO</h2>
      <p><strong>N°:</strong> ${quote.quoteNumber}</p>
      <p><strong>Fecha:</strong> ${createdAt}</p>
      <p><strong>Válido hasta:</strong> ${validUntil}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Descripción</th>
        <th>Cant.</th>
        <th>P. Unit.</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td style="color:#6b7280">Subtotal</td>
        <td style="text-align:right;font-family:monospace">$${Number(quote.subtotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
      </tr>
      ${
        discountAmount > 0
          ? `<tr>
        <td style="color:#059669">${quote.discountLabel || "Descuento"}</td>
        <td style="text-align:right;font-family:monospace;color:#059669">-$${discountAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
      </tr>`
          : ""
      }
      <tr class="total-row">
        <td>TOTAL</td>
        <td style="text-align:right;font-family:monospace;color:#f97316">$${Number(quote.total).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
      </tr>
    </table>
  </div>

  <div class="validity">
    <p>Presupuesto válido por ${validityDays} días hábiles</p>
    <span>Vencimiento: ${validUntil}</span>
  </div>

  <div class="footer">
    <p><strong>${storeName}</strong></p>
    ${storeAddress ? `<p>${storeAddress}</p>` : ""}
    ${storePhone ? `<p>Tel: ${storePhone}</p>` : ""}
    ${storeEmail ? `<p>Email: ${storeEmail}</p>` : ""}
    <p style="margin-top:8px">Este presupuesto no constituye factura. Los precios pueden variar sin previo aviso una vez vencido el plazo de validez.</p>
  </div>
</body>
</html>`;
}

export function printQuote(
  quote: QuotePrintData,
  storeSettings: Record<string, string>,
) {
  const html = generateQuotePrintHtml(quote, storeSettings);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}
