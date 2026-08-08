import { NextResponse } from "next/server";

import { auth, isFullAdmin } from "@/lib/auth";
import { salesReportToXlsxBuffer } from "@/lib/sales-report-excel";
import { parseSalesReportPeriod } from "@/lib/sales-report-period";
import { buildSalesReport } from "@/lib/services/sales-report.service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !isFullAdmin((session.user as { role?: string }).role)
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = parseSalesReportPeriod({
      period: searchParams.get("period"),
      date: searchParams.get("date"),
      month: searchParams.get("month"),
    });

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (parsed.monthStatus === "future") {
      return NextResponse.json(
        { error: "Aún no hay datos para este mes." },
        { status: 400 },
      );
    }

    const report = await buildSalesReport(parsed);
    const buffer = salesReportToXlsxBuffer(report);
    const filename = `reporte_ventas_${report.periodLabel.replace(/[^\w-]+/g, "_")}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Reports ventas export error:", error);
    return NextResponse.json({ error: "Error al generar el Excel" }, { status: 500 });
  }
}
