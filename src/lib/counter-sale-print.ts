import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/constants";

type CounterSalePrintItem = {
  productName: string;
  variantName?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type CounterSalePrintOrder = {
  orderNumber: string;
  paymentMethod: string;
  subtotal: number;
  total: number;
  createdAt: string;
  items: CounterSalePrintItem[];
};

export function generateCounterSalePrintHtml(
  order: CounterSalePrintOrder,
  store: Record<string, string>,
): string {
  const storeName = store.store_name || "Ferretería";
  const legalName = store.bank_holder || storeName;
  const address =
    store.store_address || store.google_maps_address || "";
  const phone = store.store_phone || "";
  const email = store.contact_email || "";

  const paymentLabel =
    PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ||
    order.paymentMethod;

  const createdAt = new Date(order.createdAt).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formatMoney = (n: number) =>
    `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

  const itemRows = order.items
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
  <title>Comprobante ${order.orderNumber}</title>
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
    .company .legal {
      font-size: 11px;
      color: #444;
      margin-bottom: 8px;
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
    .meta div span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #555; }
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
        ${legalName !== storeName ? `<p class="legal">${legalName}</p>` : ""}
        ${address ? `<p>${address}</p>` : ""}
        ${phone ? `<p>Tel: ${phone}</p>` : ""}
        ${email ? `<p>${email}</p>` : ""}
      </div>
      <div class="doc-title">
        <h2>Compra mostrador</h2>
        <p>Comprobante de venta</p>
      </div>
    </div>

    <div class="meta">
      <div><span>N° de comprobante</span><strong>${order.orderNumber}</strong></div>
      <div><span>Fecha y hora</span><strong>${createdAt}</strong></div>
      <div><span>Medio de pago</span><strong>${paymentLabel}</strong></div>
      <div><span>Tipo de venta</span><strong>Mostrador / presencial</strong></div>
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
          <td>Subtotal</td>
          <td class="num mono">${formatMoney(order.subtotal)}</td>
        </tr>
        <tr class="grand">
          <td>TOTAL</td>
          <td class="num mono">${formatMoney(order.total)}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <p><strong>${storeName}</strong> — Documento no válido como factura</p>
      <p>Conserve este comprobante. Ante consultas, indique el número ${order.orderNumber}.</p>
    </div>
  </div>
</body>
</html>`;
}

export function printCounterSale(
  order: CounterSalePrintOrder,
  store: Record<string, string>,
) {
  const html = generateCounterSalePrintHtml(order, store);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => printWindow.print();
}
