import * as XLSX from "xlsx";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Genera buffer .xlsx en servidor (API routes). */
export function workbookToXlsxBuffer(wb: XLSX.WorkBook): Buffer {
  return Buffer.from(
    XLSX.write(wb, { type: "buffer", bookType: "xlsx" }),
  );
}

export function rowsToXlsxBuffer(
  rows: Record<string, string | number>[],
  sheetName = "Datos",
): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return workbookToXlsxBuffer(wb);
}

/** Descarga compatible con Safari (evita fallos de WebKitBlobResource con writeFile). */
export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }, 500);
}

/** Descarga .xlsx en el navegador sin usar XLSX.writeFile. */
export function downloadWorkbookClient(
  wb: XLSX.WorkBook,
  filename: string,
): void {
  const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([data], { type: XLSX_MIME });
  downloadBlob(blob, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function parseContentDispositionFilename(
  header: string | null,
  fallback: string,
): string {
  if (!header) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return fallback;
    }
  }
  const ascii = /filename="?([^";]+)"?/i.exec(header);
  return ascii?.[1]?.trim() || fallback;
}

/** Descarga un archivo generado por la API (blob + nombre desde Content-Disposition). */
export async function downloadFileFromResponse(
  response: Response,
  fallbackFilename: string,
): Promise<void> {
  if (!response.ok) {
    let message = "Error al descargar";
    try {
      const json = await response.json();
      if (json.error) message = json.error;
    } catch {
      // respuesta no JSON
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("El archivo está vacío");
  }

  const filename = parseContentDispositionFilename(
    response.headers.get("Content-Disposition"),
    fallbackFilename,
  );
  downloadBlob(blob, filename);
}
