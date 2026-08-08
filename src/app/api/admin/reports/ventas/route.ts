import { NextResponse } from "next/server";

import { auth, isFullAdmin } from "@/lib/auth";
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

    const report = await buildSalesReport(parsed);

    return NextResponse.json({
      period: report.period,
      periodLabel: report.periodLabel,
      monthStatus: report.monthStatus,
      statusMessage: report.statusMessage,
      metrics: report.metrics,
      channelBreakdown: report.channelBreakdown,
      topProducts: report.topProducts,
      leastSold: report.leastSold,
      mostStock: report.mostStock,
      leastStock: report.leastStock,
      topCategories: report.topCategories,
    });
  } catch (error) {
    console.error("Reports ventas error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
