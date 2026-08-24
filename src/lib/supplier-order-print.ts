import { resolveQuoteStoreBranding } from "@/lib/quote-branding";

export const SUPPLIER_ORDER_PRINT_STORE_KEYS =
  "store_name,store_logo_url,google_maps_address,store_address,whatsapp_number,contact_email";

export type SupplierOrderPrintItem = {
  sku: string;
  productName: string;
  requestedQty: number;
  receivedQty: number;
  currentStock: number;
  costPrice: number;
  salePrice: number;
};

export type SupplierOrderPrintData = {
  orderNumber: string;
  status: string;
  statusLabel: string;
  supplierName: string;
  notes?: string | null;
  createdAt: string;
  items: SupplierOrderPrintItem[];
};

function formatMoney(n: number) {
  return `$${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export function generateSupplierOrderPrintHtml(
  order: SupplierOrderPrintData,
  storeSettings: Record<string, string>,
): string {
  const { storeName, storeAddress, storePhone, storeEmail } =
    resolveQuoteStoreBranding(storeSettings);

  const createdAt = new Date(order.createdAt).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const totalCost = order.items.reduce(
    (sum, item) => sum + item.costPrice * item.requestedQty,
    0,
  );
  const totalUnits = order.items.reduce(
    (sum, item) => sum + item.requestedQty,
    0,
  );

  const itemRows = order.items
    .map(
      (item) => `<tr>
        <td class="mono">${item.sku || "—"}</td>
        <td>${item.productName}</td>
        <td class="num"><strong>${item.requestedQty}</strong></td>
        <td class="num mono">${formatMoney(item.costPrice)}</td>
        <td class="num mono"><strong>${formatMoney(item.costPrice * item.requestedQty)}</strong></td>
      </tr>`,
    )
    .join("");

  const notesBlock = order.notes?.trim()
    ? `<div class="notes"><strong>Notas:</strong> ${order.notes.trim()}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Pedido ${order.orderNumber}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1f2937;
      margin: 0;
      padding: 0;
      font-size: 12px;
      line-height: 1.4;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid #f97316;
    }
    .logo-section h1 { margin: 0; font-size: 24px; color: #f97316; }
    .logo-section p { margin: 4px 0 0; font-size: 11px; color: #6b7280; }
    .doc-info { text-align: right; }
    .doc-info h2 { margin: 0; font-size: 18px; color: #374151; }
    .doc-info p { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      margin-bottom: 20px;
      padding: 12px 14px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .meta p { margin: 0; font-size: 12px; }
    .meta strong { color: #111827; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 16px; }
    th {
      background: #fff7ed;
      color: #9a3412;
      text-align: left;
      padding: 8px 6px;
      font-size: 11px;
      border-bottom: 2px solid #fdba74;
      white-space: nowrap;
    }
    td {
      padding: 7px 6px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
      vertical-align: top;
    }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .num { text-align: right; }
    .totals {
      margin-left: auto;
      width: 280px;
      border-collapse: collapse;
    }
    .totals td { border: none; padding: 4px 0; font-size: 12px; }
    .totals .label { color: #6b7280; }
    .totals .value { text-align: right; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .totals .grand td { padding-top: 8px; border-top: 2px solid #f97316; font-size: 14px; }
    .notes {
      margin-top: 16px;
      padding: 10px 12px;
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      font-size: 12px;
    }
    .footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #6b7280;
    }
    .footer p { margin: 2px 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <h1>${storeName}</h1>
      ${storeAddress ? `<p>${storeAddress}</p>` : ""}
      ${storePhone ? `<p>Tel: ${storePhone}</p>` : ""}
      ${storeEmail ? `<p>${storeEmail}</p>` : ""}
    </div>
    <div class="doc-info">
      <h2>Pedido a proveedor</h2>
      <p><strong>${order.orderNumber}</strong></p>
      <p>${createdAt}</p>
    </div>
  </div>

  <div class="meta">
    <p><strong>Proveedor:</strong> ${order.supplierName || "—"}</p>
    <p><strong>Estado:</strong> ${order.statusLabel || order.status}</p>
    <p><strong>Ítems:</strong> ${order.items.length}</p>
    <p><strong>Unidades solicitadas:</strong> ${totalUnits}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Producto</th>
        <th class="num">Unidades solicitadas</th>
        <th class="num">Precio de compra</th>
        <th class="num">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || `<tr><td colspan="5" style="text-align:center;color:#6b7280">Sin ítems</td></tr>`}
    </tbody>
  </table>

  <table class="totals">
    <tr class="grand">
      <td class="label">Total estimado compra</td>
      <td class="value">${formatMoney(totalCost)}</td>
    </tr>
  </table>

  ${notesBlock}

  <div class="footer">
    <p><strong>${storeName}</strong></p>
  </div>
</body>
</html>`;
}

/**
 * Abre el pedido en una ventana de impresión. Desde ahí se puede
 * "Guardar como PDF" / "Microsoft Print to PDF".
 */
export function printSupplierOrder(
  order: SupplierOrderPrintData,
  storeSettings: Record<string, string>,
) {
  const html = generateSupplierOrderPrintHtml(order, storeSettings);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}
