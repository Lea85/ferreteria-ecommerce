"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_RECENT_SEARCHES,
  RECENT_SEARCHES_KEY,
} from "@/lib/constants";
// suggestions loaded dynamically
import { cn } from "@/lib/utils";

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  const t = term.trim();
  if (!t) return;
  const prev = loadRecent().filter((x) => x.toLowerCase() !== t.toLowerCase());
  const next = [t, ...prev].slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

type SearchBarProps = {
  className?: string;
  variant?: "header" | "full";
};

export function SearchBar({ className, variant = "header" }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isListing = pathname === "/productos";
  const [, setUrlQ] = useQueryState("q", parseAsString.withDefault(""));

  const [local, setLocal] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    if (!isListing) {
      setLocal("");
      return;
    }
  }, [isListing]);

  useEffect(() => {
    if (!isListing) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") ?? "";
    setLocal(q);
  }, [isListing, pathname]);

  useEffect(() => {
    if (!isListing) return;
    const id = window.setTimeout(() => {
      const next = local.trim();
      void setUrlQ(next || null);
    }, 300);
    return () => window.clearTimeout(id);
  }, [local, isListing, setUrlQ]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const suggestions = useMemo(() => {
    const q = local.trim().toLowerCase();
    if (!q) return recent.slice(0, 6);
    return recent
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 8);
  }, [local, recent]);

  const submit = useCallback(
    (term: string) => {
      const t = term.trim();
      if (!t) return;
      saveRecent(t);
      setRecent(loadRecent());
      setOpen(false);
      router.push(`/productos?q=${encodeURIComponent(t)}`);
    },
    [router],
  );

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <form
        className="relative flex w-full gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(local);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={local}
          onChange={(e) => {
            setLocal(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar productos, marcas y más..."
          className={cn("pl-9", variant === "header" && "md:min-w-[280px]")}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        <Button
          type="submit"
          className="shrink-0 bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
        >
          Buscar
        </Button>
      </form>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover py-1 shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setLocal(s);
                submit(s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
