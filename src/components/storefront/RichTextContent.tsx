"use client";

import { useMemo } from "react";

import { toDisplayHtml } from "@/lib/sanitize-html";
import { cn } from "@/lib/utils";

type RichTextContentProps = {
  content: string;
  className?: string;
};

export function RichTextContent({ content, className }: RichTextContentProps) {
  const html = useMemo(() => toDisplayHtml(content), [content]);

  if (!html) return null;

  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-foreground",
        "[&_p]:mb-3 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
        "[&_li]:mb-1 [&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic [&_i]:italic",
        "[&_u]:underline [&_s]:line-through [&_strike]:line-through",
        "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold",
        "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold",
        "[&_a]:text-primary [&_a]:underline",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
