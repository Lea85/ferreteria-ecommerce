import * as XLSX from "xlsx";

import type { PaymentMethod } from "@/lib/constants";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import type { SalesReportResult } from "@/lib/services/sales-report.service";
import { workbookToXlsxBuffer } from "@/lib/spreadsheet-download";

function paymentLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function marginLabel(margin: number | null): string {
  if (margin === null) return "—";
  return `${margin.toFixed(1)}%`;
}

function appendSheet(
  wb: XLSX.WorkBook,
  name: string,
  rows: Record<string, string | number>[],
) {
  const ws = rows.length > 0
    ? XLSX.utils.json_to_sheet(rows)
    : XLSX.utils.aoa_to_sheet([["Sin datos para el periodo seleccionado"]]);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

export function buildSalesReportWorkbook(report: SalesReportResult): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const m = report.metrics;
  const ch = report.channelBreakdown;

  const principalRows: Record<string, string | number>[] = [
    { Seccion: "Resumen", Indicador: "Ventas netas", Valor: roundMoney(m.totalRevenue) },
    { Seccion: "Resumen", Indicador: "Devoluciones", Valor: roundMoney(m.returnsRevenue) },
    { Seccion: "Resumen", Indicador: "Ganancia neta", Valor: roundMoney(m.totalProfit) },
    { Seccion: "Resumen", Indicador: "Pedidos", Valor: m.totalOrders },
    { Seccion: "Resumen", Indicador: "Ticket promedio", Valor: roundMoney(m.avgTicket) },
    { Seccion: "Mostrador", Indicador: "Facturacion", Valor: roundMoney(ch.counter.revenue) },
    { Seccion: "Mostrador", Indicador: "Pedidos", Valor: ch.counter.orders },
    { Seccion: "Mostrador", Indicador: "Ticket promedio", Valor: roundMoney(ch.counter.avgTicket) },
    { Seccion: "Sitio web", Indicador: "Facturacion", Valor: roundMoney(ch.web.revenue) },
    { Seccion: "Sitio web", Indicador: "Pedidos", Valor: ch.web.orders },
    { Seccion: "Sitio web", Indicador: "Ticket promedio", Valor: roundMoney(ch.web.avgTicket) },
    { Seccion: "MercadoLibre", Indicador: "Facturacion", Valor: roundMoney(ch.mercadolibre.revenue) },
    { Seccion: "MercadoLibre", Indicador: "Pedidos", Valor: ch.mercadolibre.orders },
    { Seccion: "MercadoLibre", Indicador: "Ticket promedio", Valor: roundMoney(ch.mercadolibre.avgTicket) },
  ];

  for (const product of report.topProducts) {
    principalRows.push({
      Seccion: "Productos mas vendidos",
      Indicador: product.name,
      Valor: `${product.units} u. · $${roundMoney(product.revenue)}`,
    });
  }

  for (const product of report.leastSold) {
    principalRows.push({
      Seccion: "Productos menos vendidos",
      Indicador: product.name,
      Valor: `${product.units} u. · $${roundMoney(product.revenue)}`,
    });
  }

  for (const category of report.topCategories) {
    principalRows.push({
      Seccion: "Categorias",
      Indicador: category.name,
      Valor: `${category.pct}% · $${roundMoney(category.revenue)}`,
    });
  }

  appendSheet(wb, "PRINCIPAL", principalRows);

  const orderRows = (orders: SalesReportResult["channelOrders"]["counter"]) =>
    orders.map((order) => ({
      "Numero de pedido": order.orderNumber,
      "Cantidad de elementos": order.itemCount,
      "Medio de pago": paymentLabel(order.paymentMethod),
      Importe: roundMoney(order.total),
    }));

  appendSheet(wb, "ventas mostrador", orderRows(report.channelOrders.counter));
  appendSheet(wb, "ventas Sitio Web", orderRows(report.channelOrders.web));
  appendSheet(wb, "ventas MELI", orderRows(report.channelOrders.mercadolibre));

  appendSheet(
    wb,
    "Mas Vendidos",
    report.allProductsSold.map((product) => ({
      SKU: product.sku,
      "Nombre del producto": product.name,
      "Unidades vendidas": product.units,
      "Total vendido": roundMoney(product.revenue),
      Ganancia: roundMoney(product.profit),
      Margen: marginLabel(product.margin),
    })),
  );

  appendSheet(
    wb,
    "Categorias",
    report.allCategories.map((category) => ({
      "Nombre de categoria": category.name,
      "Porcentaje sobre el total": `${category.pct}%`,
      "Importe sumarizado": roundMoney(category.revenue),
      Ganancia: roundMoney(category.profit),
      Margen: marginLabel(category.margin),
    })),
  );

  return wb;
}

export function salesReportToXlsxBuffer(report: SalesReportResult): Buffer {
  return workbookToXlsxBuffer(buildSalesReportWorkbook(report));
}
