"use client";

import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { plainTextToEditorHtml } from "@/lib/sanitize-html";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

function normalizeHtml(html: string) {
  const trimmed = html.replace(/<br\s*\/?>/gi, "").trim();
  if (!trimmed || trimmed === "<div></div>") return "";
  return html;
}

function toEditorHtml(value: string) {
  return plainTextToEditorHtml(value);
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Escribí la descripción del producto…",
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  /** null = aún no se aplicó valor al DOM del editor */
  const lastApplied = useRef<string | null>(null);

  const syncFromEditor = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = normalizeHtml(el.innerHTML);
    lastApplied.current = html;
    onChange(html);
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const html = toEditorHtml(value || "");
    if (lastApplied.current === value && el.innerHTML === html) return;

    el.innerHTML = html;
    lastApplied.current = value;
  }, [value]);

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    syncFromEditor();
  };

  const addLink = () => {
    const url = window.prompt("URL del enlace (https://…)");
    if (!url?.trim()) return;
    const href = /^https?:\/\//i.test(url) ? url.trim() : `https://${url.trim()}`;
    exec("createLink", href);
  };

  return (
    <div className={cn("overflow-hidden rounded-md border border-border", className)}>
      <div className="flex flex-wrap gap-0.5 border-b border-border bg-muted/50 p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => exec("bold")}
          aria-label="Negrita"
        >
          <Bold className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => exec("italic")}
          aria-label="Cursiva"
        >
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => exec("underline")}
          aria-label="Subrayado"
        >
          <Underline className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => exec("strikeThrough")}
          aria-label="Tachado"
        >
          <Strikethrough className="size-4" />
        </Button>
        <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => exec("insertUnorderedList")}
          aria-label="Lista con viñetas"
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => exec("insertOrderedList")}
          aria-label="Lista numerada"
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={addLink}
          aria-label="Enlace"
        >
          <Link2 className="size-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        onInput={syncFromEditor}
        onBlur={syncFromEditor}
        className={cn(
          "min-h-[140px] max-h-[320px] overflow-y-auto px-3 py-2 text-sm outline-none",
          "empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_a]:text-primary [&_a]:underline",
        )}
      />
    </div>
  );
}
