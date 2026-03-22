"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  count?: number;
  children?: CategoryTreeNode[];
};

type CategoryTreeProps = {
  categories: CategoryTreeNode[];
  activeCategorySlug?: string;
};

function Row({
  node,
  depth,
  activeCategorySlug,
  openSet,
  toggle,
}: {
  node: CategoryTreeNode;
  depth: number;
  activeCategorySlug?: string;
  openSet: Set<string>;
  toggle: (id: string) => void;
}) {
  const hasChildren = Boolean(node.children?.length);
  const isOpen = openSet.has(node.id);
  const isActive = activeCategorySlug === node.slug;

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md text-sm",
          isActive && "bg-primary/10 font-semibold text-primary",
        )}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted"
            onClick={() => toggle(node.id)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Contraer" : "Expandir"}
          >
            {isOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="inline-block w-8 shrink-0" />
        )}
        <Link
          href={`/productos?category=${node.slug}`}
          className={cn(
            "flex flex-1 items-center justify-between gap-2 py-2 pr-2 hover:text-primary",
            !isActive && "text-foreground",
          )}
        >
          <span className="truncate">{node.name}</span>
          {node.count != null ? (
            <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
              ({node.count})
            </span>
          ) : null}
        </Link>
      </div>
      {hasChildren && isOpen ? (
        <ul className="mt-0.5 space-y-0.5 border-l border-border/60 pl-1">
          {node.children!.map((ch) => (
            <Row
              key={ch.id}
              node={ch}
              depth={depth + 1}
              activeCategorySlug={activeCategorySlug}
              openSet={openSet}
              toggle={toggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CategoryTree({
  categories,
  activeCategorySlug,
}: CategoryTreeProps) {
  const [openSet, setOpenSet] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    function walk(nodes: CategoryTreeNode[]) {
      for (const n of nodes) {
        if (n.children?.some((c) => c.slug === activeCategorySlug)) {
          initial.add(n.id);
        }
        if (n.children) walk(n.children);
      }
    }
    walk(categories);
    return initial;
  });

  const toggle = (id: string) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <nav aria-label="Categorías" className="rounded-lg border border-border bg-card p-3">
      <p className="mb-3 text-sm font-semibold text-foreground">Categorías</p>
      <ul className="space-y-0.5">
        {categories.map((c) => (
          <Row
            key={c.id}
            node={c}
            depth={0}
            activeCategorySlug={activeCategorySlug}
            openSet={openSet}
            toggle={toggle}
          />
        ))}
      </ul>
    </nav>
  );
}
