"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  ChevronDown,
  Heart,
  LogIn,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Tag,
  User,
  UserPlus,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_CATEGORIES } from "@/lib/constants";
import { useStoreConfig } from "@/contexts/store-config";
import { useCartStore } from "@/stores/cart.store";
import { cn } from "@/lib/utils";

import { CartDrawer } from "./CartDrawer";
import { SearchBar } from "./SearchBar";

export function Header() {
  const { data: session, status } = useSession();
  const { storeName, logoUrl } = useStoreConfig();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const itemCount = useCartStore((s) => s.getItemCount());
  const openCart = useCartStore((s) => s.openCart);

  const isLoggedIn = status === "authenticated" && !!session?.user;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </Button>

          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-primary"
          >
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="size-9 rounded-lg object-contain" />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
                {storeName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="hidden text-lg sm:inline">{storeName}</span>
          </Link>

          <div
            className={cn(
              "flex-1 px-0 md:px-4",
              searchOpen ? "block" : "hidden md:block",
            )}
          >
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Buscar"
            >
              <Search className="size-5" />
            </Button>

            <nav className="hidden items-center gap-1 lg:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-1 text-foreground">
                    Categorías
                    <ChevronDown className="size-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Categorías</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {NAV_CATEGORIES.map((c) => (
                    <DropdownMenuItem key={c.slug} asChild>
                      <Link href={`/productos?category=${c.slug}`}>
                        {c.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" asChild>
                <Link href="/productos?sort=discount" className="gap-2">
                  <Tag className="size-4" />
                  Ofertas
                </Link>
              </Button>
            </nav>

            {isLoggedIn && ((session.user as any)?.role === "ADMIN" || (session.user as any)?.role === "SUPER_ADMIN") ? (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="hidden gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground sm:inline-flex"
              >
                <Link href="/admin/dashboard">
                  <Settings className="size-4" />
                  Admin
                </Link>
              </Button>
            ) : null}

            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:inline-flex"
                    aria-label="Mi cuenta"
                  >
                    <User className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>
                    {session.user.name || session.user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/mi-cuenta/perfil">Perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/mi-cuenta/pedidos">Pedidos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/mi-cuenta/favoritos">Favoritos</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="mr-2 size-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden items-center gap-1 sm:flex">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login" className="gap-1.5">
                    <LogIn className="size-4" />
                    Ingresar
                  </Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="bg-store-orange text-store-orange-foreground hover:bg-store-orange/90"
                >
                  <Link href="/registro" className="gap-1.5">
                    <UserPlus className="size-4" />
                    Registrarse
                  </Link>
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative"
              onClick={openCart}
              aria-label="Carrito"
            >
              <ShoppingCart className="size-5" />
              {itemCount > 0 ? (
                <Badge className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-store-orange p-0 text-[10px] text-store-orange-foreground">
                  {itemCount > 99 ? "99+" : itemCount}
                </Badge>
              ) : null}
            </Button>
          </div>
        </div>

        {searchOpen ? (
          <div className="border-t border-border px-4 py-3 md:hidden">
            <SearchBar variant="full" />
          </div>
        ) : null}
      </header>

      <CartDrawer />

      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(100%,320px)] border-r border-border bg-background shadow-xl transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-semibold text-primary">{storeName}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Categorías
          </p>
          {NAV_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/productos?category=${c.slug}`}
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => setMobileOpen(false)}
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/productos"
            className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            onClick={() => setMobileOpen(false)}
          >
            <Package className="size-4" />
            Todos los productos
          </Link>
          <Link
            href="/productos?sort=discount"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            onClick={() => setMobileOpen(false)}
          >
            <Tag className="size-4" />
            Ofertas
          </Link>

          {isLoggedIn ? (
            <>
              {((session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "SUPER_ADMIN") && (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
                  onClick={() => setMobileOpen(false)}
                >
                  <Settings className="size-4" />
                  Panel de administración
                </Link>
              )}
              <Link
                href="/mi-cuenta/perfil"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                <User className="size-4" />
                Mi cuenta
              </Link>
              <Link
                href="/mi-cuenta/favoritos"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                <Heart className="size-4" />
                Favoritos
              </Link>
              <button
                type="button"
                className="mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-muted"
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="mt-4 rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
                onClick={() => setMobileOpen(false)}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="mt-2 rounded-md border border-primary px-3 py-2 text-center text-sm font-semibold text-primary"
                onClick={() => setMobileOpen(false)}
              >
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
