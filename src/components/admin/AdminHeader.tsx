"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { AdminSidebarUser } from "./Sidebar";

function titleFromPath(pathname: string): string {
  if (pathname === "/admin/dashboard") return "Dashboard";
  if (pathname === "/admin/productos") return "Productos";
  if (pathname === "/admin/productos/atributos") return "Administrar Sub Categorías";
  if (pathname === "/admin/productos/nuevo") return "Nuevo producto";
  if (pathname.startsWith("/admin/productos/")) return "Editar producto";
  if (pathname === "/admin/categorias") return "Categorias";
  if (pathname === "/admin/categorias-clientes") return "Categorias de clientes";
  if (pathname === "/admin/almacen") return "Almacen";
  if (pathname === "/admin/pedidos") return "Pedidos";
  if (pathname.startsWith("/admin/pedidos/")) return "Detalle del pedido";
  if (pathname === "/admin/usuarios") return "Clientes";
  if (pathname === "/admin/cupones") return "Cupones";
  if (pathname === "/admin/promociones") return "Promociones";
  if (pathname === "/admin/campanas") return "Campanias";
  if (pathname === "/admin/reportes") return "Reportes";
  if (pathname === "/admin/reportes/sitio") return "Analisis del sitio";
  if (pathname === "/admin/reportes/ventas") return "Analisis de ventas";
  if (pathname === "/admin/reportes/clientes") return "Analisis de clientes";
  if (pathname === "/admin/newsletter") return "Newsletter";
  if (pathname === "/admin/integraciones") return "Integraciones";
  if (pathname === "/admin/alquileres") return "Alquiler de herramientas";
  if (pathname === "/admin/proveedores") return "Proveedores";
  if (pathname === "/admin/proveedores/pedidos") return "Pedidos a proveedores";
  if (pathname.startsWith("/admin/proveedores/pedidos/")) return "Detalle de pedido";
  if (pathname === "/admin/legales") return "Legales";
  return "Administracion";
}

function initials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "AD";
}

export type AdminHeaderProps = {
  user: AdminSidebarUser;
  className?: string;
};

export function AdminHeader({ user, className }: AdminHeaderProps) {
  const pathname = usePathname();
  const title = titleFromPath(pathname);

  return (
    <header
      className={cn(
        "sticky top-14 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:top-0 lg:z-10 lg:h-16 lg:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Separator orientation="vertical" className="hidden h-6 lg:block" />
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild className="gap-2 hidden sm:inline-flex">
          <Link href="/" target="_blank">
            <ExternalLink className="size-4" />
            Ver tienda
          </Link>
        </Button>
        <Button variant="outline" size="icon" asChild className="sm:hidden">
          <Link href="/" target="_blank" aria-label="Ver tienda">
            <ExternalLink className="size-4" />
          </Link>
        </Button>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-none text-foreground">
            {user.name ?? "Administrador"}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {user.email}
          </p>
        </div>
        <Avatar className="size-9 border border-border">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials(user.name, user.email)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
