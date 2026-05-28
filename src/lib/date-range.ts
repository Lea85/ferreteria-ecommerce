import type { Prisma } from "@/generated/prisma";

/** Día calendario Argentina (UTC-3) → inicio del día en UTC. */
export function startOfDayArgentina(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T03:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Día calendario Argentina (UTC-3) → fin del día en UTC. */
export function endOfDayArgentina(dateStr: string): Date | null {
  const start = startOfDayArgentina(dateStr);
  if (!start) return null;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function buildCreatedAtRangeFilter(
  dateFrom?: string,
  dateTo?: string,
): Prisma.DateTimeFilter | undefined {
  const from = dateFrom?.trim();
  const to = dateTo?.trim();
  if (!from && !to) return undefined;

  const filter: Prisma.DateTimeFilter = {};
  if (from) {
    const gte = startOfDayArgentina(from);
    if (!gte) return undefined;
    filter.gte = gte;
  }
  if (to) {
    const lte = endOfDayArgentina(to);
    if (!lte) return undefined;
    filter.lte = lte;
  }
  return filter;
}
