const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",
  "STRIKE",
  "UL",
  "OL",
  "LI",
  "H2",
  "H3",
  "H4",
  "A",
]);

function sanitizeElement(el: Element) {
  if (!ALLOWED_TAGS.has(el.tagName)) {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    return;
  }

  if (el.tagName === "A") {
    const href = el.getAttribute("href") ?? "";
    for (const attr of [...el.attributes]) {
      el.removeAttribute(attr.name);
    }
    if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) {
      el.setAttribute("href", href);
      el.setAttribute("rel", "noopener noreferrer");
      el.setAttribute("target", "_blank");
    }
  } else {
    for (const attr of [...el.attributes]) {
      el.removeAttribute(attr.name);
    }
  }

  for (const child of [...el.children]) {
    sanitizeElement(child);
  }
}

/** Sanitiza HTML de descripciones para mostrar en tienda (solo etiquetas de formato básico). */
export function sanitizeHtml(html: string): string {
  if (!html.trim()) return "";

  if (typeof DOMParser === "undefined") {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const child of [...doc.body.children]) {
    sanitizeElement(child);
  }
  return doc.body.innerHTML;
}

export function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/** Convierte texto plano guardado en BD a HTML seguro para el editor. */
export function plainTextToEditorHtml(text: string): string {
  if (!text.trim()) return "";
  if (looksLikeHtml(text)) return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

export function toDisplayHtml(text: string): string {
  if (!text.trim()) return "";
  if (looksLikeHtml(text)) return sanitizeHtml(text);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}
