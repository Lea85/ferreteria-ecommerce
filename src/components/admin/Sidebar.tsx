"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  ChevronDown,
  FileText,
  FolderTree,
  Globe,
  Image,
  LayoutDashboard,
  LineChart,
  LogOut,
  Mail,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Tag,
  Ticket,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  children?: { href: string; label: string; icon: any }[];
};

const nav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/usuarios", label: "Clientes", icon: Users },
  { href: "/admin/categorias-clientes", label: "Cat. Clientes", icon: Tag },
  { href: "/admin/almacen", label: "Almacen", icon: Warehouse },
  { href: "/admin/cupones", label: "Cupones", icon: Ticket },
  { href: "/admin/promociones", label: "Promociones", icon: Tag },
  { href: "/admin/campanas", label: "Campanias", icon: Image },
  { href: "/admin/alquileres", label: "Alquileres", icon: Wrench },
  {
    href: "/admin/proveedores",
    label: "Proveedores",
    icon: Truck,
    children: [
      { href: "/admin/proveedores", label: "Listado", icon: Truck },
      { href: "/admin/proveedores/pedidos", label: "Pedidos", icon: ShoppingCart },
    ],
  },
  {
    href: "/admin/reportes",
    label: "Reportes",
    icon: BarChart3,
    children: [
      { href: "/admin/reportes/sitio", label: "Analisis del sitio", icon: TrendingUp },
      { href: "/admin/reportes/ventas", label: "Analisis de ventas", icon: LineChart },
      { href: "/admin/reportes/clientes", label: "Analisis de clientes", icon: Users },
    ],
  },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/integraciones", label: "Integraciones", icon: Settings },
  { href: "/admin/legales", label: "Legales", icon: FileText },
];

export type AdminSidebarUser = {
  name?: string | null;
  email?: string | null;
};

export type SidebarProps = {
  user: AdminSidebarUser;
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin/reportes")) {
      return ["/admin/reportes"];
    }
    return [];
  });

  function toggleExpand(href: string) {
    setExpandedMenus((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  }

  const NavLinks = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {nav.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedMenus.includes(item.href) || pathname.startsWith(item.href + "/");
        const active = hasChildren
          ? pathname.startsWith(item.href)
          : pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));

        if (hasChildren) {
          return (
            <div key={item.href}>
              <button
                type="button"
                onClick={() => toggleExpand(item.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-[18px] shrink-0 opacity-90" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown className={cn("size-4 transition-transform", isExpanded && "rotate-180")} />
              </button>
              {isExpanded && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
                  {item.children!.map((child) => {
                    const childActive = pathname === child.href || pathname.startsWith(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                          childActive
                            ? "bg-primary text-primary-foreground shadow-sm font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <child.icon className="size-4 shrink-0 opacity-90" />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-[18px] shrink-0 opacity-90" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="fixed left-0 top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <span className="text-sm font-semibold text-primary">FerroSan Admin</span>
        <Button type="button" variant="ghost" size="icon" aria-label={open ? "Cerrar menu" : "Abrir menu"} onClick={() => setOpen((o) => !o)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {open && (
        <button type="button" aria-label="Cerrar menu" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={cn(
        "fixed bottom-0 left-0 top-0 z-40 flex w-64 flex-col border-r border-border bg-card shadow-sm transition-transform duration-200 lg:translate-x-0",
        "max-lg:top-14 max-lg:h-[calc(100vh-3.5rem)]",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}>
        <div className="hidden h-16 items-center border-b border-border px-6 lg:flex">
          <Link href="/admin/dashboard" className="text-lg font-bold text-primary">FerroSan Admin</Link>
        </div>

        {NavLinks}

        <div className="mt-auto border-t border-border p-4">
          <div className="mb-3 rounded-md bg-muted/60 px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">{user.name ?? "Administrador"}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email ?? "\u2014"}</p>
          </div>
          <Separator className="mb-3" />
          <Button type="button" variant="outline" className="w-full justify-start gap-2 border-border" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut className="size-4" />Cerrar sesion
          </Button>
        </div>
      </aside>
    </>
  );
}
