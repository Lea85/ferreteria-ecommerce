"use client";

import { ChevronLeft, ChevronRight, ChevronsUpDown, Loader2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  accessor?: keyof T | ((row: T) => unknown);
  sortable?: boolean;
  cell?: (row: T) => React.ReactNode;
  className?: string;
};

export type DataTablePagination = {
  page: number;
  pageSize: number;
  /** With `fromServer`, total rows in the full result set (API). Otherwise ignored for counts. */
  total: number;
  /** With `fromServer`, optional page count from API */
  totalPages?: number;
  /** When true, `data` is already one page from the server (no client slice). */
  fromServer?: boolean;
  onPageChange?: (page: number) => void;
};

export type DataTableProps<T extends { id: string }> = {
  columns: DataTableColumn<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  /** Controlled search: disables client-side text filtering; parent loads data from API */
  externalSearch?: { value: string; onChange: (value: string) => void };
  pagination?: DataTablePagination;
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  actionsHeader?: string;
  renderActions?: (row: T) => ReactNode;
  isLoading?: boolean;
};

function getCellValue<T>(row: T, col: DataTableColumn<T>): unknown {
  if (typeof col.accessor === "function") return col.accessor(row);
  if (col.accessor !== undefined) return row[col.accessor as keyof T];
  return null;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  searchPlaceholder = "Buscar…",
  searchKeys,
  externalSearch,
  pagination,
  getRowId = (row) => row.id,
  onRowClick,
  actionsHeader = "Acciones",
  renderActions,
  isLoading = false,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const searchValue = externalSearch?.value ?? internalSearch;
  const setSearchValue = externalSearch?.onChange ?? setInternalSearch;

  const filtered = useMemo(() => {
    if (externalSearch) return data;
    const q = internalSearch.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => {
      if (searchKeys?.length) {
        return searchKeys.some((key) => {
          const v = row[key];
          return String(v ?? "")
            .toLowerCase()
            .includes(q);
        });
      }
      return JSON.stringify(row).toLowerCase().includes(q);
    });
  }, [data, internalSearch, searchKeys, externalSearch]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    const col = columns.find((c) => c.id === sortCol);
    if (!col?.sortable && col?.accessor === undefined) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = getCellValue(a, col);
      const vb = getCellValue(b, col);
      if (va === vb) return 0;
      const na = Number(va);
      const nb = Number(vb);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) {
        return sortDir === "asc" ? na - nb : nb - na;
      }
      const sa = String(va ?? "");
      const sb = String(vb ?? "");
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return copy;
  }, [filtered, sortCol, sortDir, columns]);

  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const isServerPaginated = Boolean(pagination?.fromServer);
  const displayTotal = isServerPaginated ? pagination!.total : sorted.length;
  const totalPages = isServerPaginated
    ? Math.max(
        1,
        pagination!.totalPages ??
          Math.ceil(Math.max(pagination!.total, 0) / pageSize),
      )
    : Math.max(1, Math.ceil(displayTotal / pageSize));

  const pageRows = useMemo(() => {
    if (!pagination) return sorted;
    if (isServerPaginated) return sorted;
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pagination, page, pageSize, isServerPaginated]);

  const allVisibleIds = pageRows.map(getRowId);
  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));

  function toggleSort(id: string) {
    const col = columns.find((c) => c.id === id);
    if (!col?.sortable) return;
    if (sortCol === id) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(id);
      setSortDir("asc");
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="max-w-sm border-border bg-background"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-12 pl-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Seleccionar todas las filas visibles"
                />
              </TableHead>
              {columns.map((col) => (
                <TableHead key={col.id} className={col.className}>
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.id)}
                      className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary"
                    >
                      {col.header}
                      <ChevronsUpDown className="size-3.5 opacity-50" />
                    </button>
                  ) : (
                    <span className="font-semibold">{col.header}</span>
                  )}
                </TableHead>
              ))}
              {renderActions ? (
                <TableHead className="text-right">{actionsHeader}</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1 + (renderActions ? 1 : 0)}
                  className="h-32 text-center text-muted-foreground"
                >
                  <Loader2 className="mx-auto size-8 animate-spin" />
                </TableCell>
              </TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1 + (renderActions ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  No hay resultados.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => {
                const id = getRowId(row);
                return (
                  <TableRow
                    key={id}
                    data-state={selected.has(id) ? "selected" : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                    onClick={() => onRowClick?.(row)}
                  >
                    <TableCell
                      className="pl-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selected.has(id)}
                        onCheckedChange={() => toggleRow(id)}
                        aria-label={`Seleccionar fila ${id}`}
                      />
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col.id} className={col.className}>
                        {col.cell
                          ? col.cell(row)
                          : String(getCellValue(row, col) ?? "—")}
                      </TableCell>
                    ))}
                    {renderActions ? (
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {renderActions(row)}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} · {displayTotal} registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => pagination.onPageChange?.(page - 1)}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => pagination.onPageChange?.(page + 1)}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
