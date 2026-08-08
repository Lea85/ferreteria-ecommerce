import type { Prisma } from "@/generated/prisma";

const AR_TZ = "America/Argentina/Buenos_Aires";

export type SalesReportPeriodKind =
  | "day"
  | "7d"
  | "15d"
  | "30d"
  | "ytd"
  | "month";

export type SalesReportMonthStatus = "past" | "in_progress" | "future";

export type ParsedSalesReportPeriod = {
  period: SalesReportPeriodKind;
  periodLabel: string;
  createdAtFilter: Prisma.DateTimeFilter | null;
  monthStatus?: SalesReportMonthStatus;
  statusMessage?: string;
};

export function todayIsoArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: AR_TZ }).format(
    new Date(),
  );
}

export function currentYearMonthArgentina(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "0");
  return { year, month };
}

/** Día calendario Argentina (UTC-3) → rango en UTC para Prisma. */
export function getDayRange(dateStr: string): { gte: Date; lte: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const start = new Date(`${dateStr}T03:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { gte: start, lte: end };
}

export function getMonthRange(
  year: number,
  month: number,
): { gte: Date; lte: Date } | null {
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null;
  const mm = String(month).padStart(2, "0");
  const start = new Date(`${year}-${mm}-01T03:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;

  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMm = String(nextMonth).padStart(2, "0");
  const endExclusive = new Date(`${nextYear}-${nextMm}-01T03:00:00.000Z`);
  const end = new Date(endExclusive.getTime() - 1);
  return { gte: start, lte: end };
}

export function getMonthStatus(
  year: number,
  month: number,
): SalesReportMonthStatus {
  const now = currentYearMonthArgentina();
  if (year > now.year || (year === now.year && month > now.month)) {
    return "future";
  }
  if (year === now.year && month === now.month) {
    return "in_progress";
  }
  return "past";
}

export function formatMonthLabel(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
  const label = date.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getRollingDateFrom(period: SalesReportPeriodKind): Date {
  const now = new Date();
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 86400000);
    case "15d":
      return new Date(now.getTime() - 15 * 86400000);
    case "30d":
      return new Date(now.getTime() - 30 * 86400000);
    case "ytd":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getTime() - 30 * 86400000);
  }
}

export function parseSalesReportPeriod(params: {
  period?: string | null;
  date?: string | null;
  month?: string | null;
}): ParsedSalesReportPeriod | { error: string } {
  const periodRaw = params.period === "today" ? "day" : params.period || "day";
  const validPeriods: SalesReportPeriodKind[] = [
    "day",
    "7d",
    "15d",
    "30d",
    "ytd",
    "month",
  ];

  if (!validPeriods.includes(periodRaw as SalesReportPeriodKind)) {
    return { error: "Periodo inválido" };
  }

  const period = periodRaw as SalesReportPeriodKind;

  if (period === "day") {
    const today = todayIsoArgentina();
    const dateParam = params.date?.trim() || today;
    const dayRange = getDayRange(dateParam) ?? getDayRange(today);
    if (!dayRange) {
      return { error: "Fecha inválida" };
    }
    return {
      period,
      periodLabel: dateParam,
      createdAtFilter: { gte: dayRange.gte, lte: dayRange.lte },
    };
  }

  if (period === "month") {
    const today = currentYearMonthArgentina();
    const monthParam = params.month?.trim() || "";
    const match = /^(\d{4})-(\d{2})$/.exec(monthParam);
    const year = match ? Number(match[1]) : today.year;
    const month = match ? Number(match[2]) : today.month;
    const range = getMonthRange(year, month);

    if (!range) {
      return { error: "Mes inválido" };
    }

    const monthStatus = getMonthStatus(year, month);
    const periodLabel = `${year}-${String(month).padStart(2, "0")}`;

    if (monthStatus === "future") {
      return {
        period,
        periodLabel,
        createdAtFilter: null,
        monthStatus,
        statusMessage: "Aún no hay datos para este mes.",
      };
    }

    return {
      period,
      periodLabel,
      createdAtFilter: { gte: range.gte, lte: range.lte },
      monthStatus,
      statusMessage:
        monthStatus === "in_progress"
          ? `El mes ${formatMonthLabel(year, month)} aún está en curso. Los datos mostrados corresponden hasta hoy.`
          : undefined,
    };
  }

  return {
    period,
    periodLabel: period,
    createdAtFilter: { gte: getRollingDateFrom(period) },
  };
}
