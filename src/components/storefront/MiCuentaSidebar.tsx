"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MapPin, Package, User } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/mi-cuenta/pedidos", label: "Mis Pedidos", icon: Package },
  { href: "/mi-cuenta/perfil", label: "Mi Perfil", icon: User },
  { href: "/mi-cuenta/direcciones", label: "Direcciones", icon: MapPin },
  { href: "/mi-cuenta/favoritos", label: "Favoritos", icon: Heart },
] as const;

export function MiCuentaSidebar() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Cuenta"
      className="rounded-xl border border-border bg-card p-3 shadow-sm"
    >
      <ul className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="shrink-0 md:shrink">
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
